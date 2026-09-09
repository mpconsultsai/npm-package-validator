/**
 * Build release history series from the npm packument `time` map.
 */

import semver from "semver";

const META_KEYS = new Set(["created", "modified", "unpublished"]);

export interface ReleaseCadencePoint {
  /** First day of month, YYYY-MM-DD */
  date: string;
  value: number;
}

export interface ReleaseTypeMixPoint {
  date: string;
  major: number;
  minor: number;
  patch: number;
}

export interface ReleaseTypeMixResult {
  points: ReleaseTypeMixPoint[];
  totals: { major: number; minor: number; patch: number; all: number };
  /** Most recent major bumps in the window (newest first) */
  recentMajors: { version: string; date: string }[];
}

function monthKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

type BumpKind = "major" | "minor" | "patch";

function classifyBump(previous: string | null, next: string): BumpKind | null {
  const cleaned = semver.valid(next);
  if (!cleaned || semver.prerelease(cleaned)) return null;

  if (!previous) {
    const parsed = semver.parse(cleaned);
    if (!parsed) return null;
    if (parsed.minor === 0 && parsed.patch === 0) return "major";
    if (parsed.patch === 0) return "minor";
    return "patch";
  }

  const diff = semver.diff(previous, cleaned);
  if (!diff) return null;
  if (diff === "major" || diff === "premajor") return "major";
  if (diff === "minor" || diff === "preminor") return "minor";
  return "patch";
}

/**
 * @param time npm `time` object (version → ISO date)
 * @param maxMonths cap the window to the most recent N months (default 36)
 */
export function buildReleaseCadence(
  time?: Record<string, string> | null,
  maxMonths = 36,
): ReleaseCadencePoint[] {
  if (!time) return [];

  const counts = new Map<string, number>();
  let earliest: Date | null = null;
  let latest: Date | null = null;

  for (const [key, iso] of Object.entries(time)) {
    if (META_KEYS.has(key)) continue;
    const published = new Date(iso);
    if (Number.isNaN(published.getTime())) continue;
    const mk = monthKey(published);
    counts.set(mk, (counts.get(mk) || 0) + 1);
    if (!earliest || published < earliest) earliest = published;
    if (!latest || published > latest) latest = published;
  }

  if (!earliest || !latest || counts.size === 0) return [];

  let start = new Date(
    Date.UTC(earliest.getUTCFullYear(), earliest.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth(), 1),
  );

  const windowStart = addMonths(end, -(maxMonths - 1));
  if (start < windowStart) start = windowStart;

  const points: ReleaseCadencePoint[] = [];
  for (let cur = start; cur <= end; cur = addMonths(cur, 1)) {
    const key = monthKey(cur);
    points.push({ date: key, value: counts.get(key) || 0 });
  }

  return points;
}

/**
 * Monthly stacked major / minor / patch bumps (stable releases only).
 * Helps judge API churn when choosing a package.
 */
export function buildReleaseTypeMix(
  time?: Record<string, string> | null,
  maxMonths = 36,
): ReleaseTypeMixResult {
  const empty: ReleaseTypeMixResult = {
    points: [],
    totals: { major: 0, minor: 0, patch: 0, all: 0 },
    recentMajors: [],
  };
  if (!time) return empty;

  const events: { version: string; at: Date }[] = [];
  for (const [key, iso] of Object.entries(time)) {
    if (META_KEYS.has(key)) continue;
    if (!semver.valid(key) || semver.prerelease(key)) continue;
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) continue;
    events.push({ version: key, at });
  }

  if (events.length === 0) return empty;

  // Classify along semver lineage (not publish time). Packages that maintain
  // multiple major lines (e.g. msw 1.x + 2.x) otherwise look like constant majors.
  events.sort((a, b) => semver.compare(a.version, b.version));

  const latestPublish = events.reduce(
    (max, e) => (e.at > max ? e.at : max),
    events[0].at,
  );
  const endMonth = new Date(
    Date.UTC(latestPublish.getUTCFullYear(), latestPublish.getUTCMonth(), 1),
  );
  const windowStart = addMonths(endMonth, -(maxMonths - 1));

  const monthBuckets = new Map<
    string,
    { major: number; minor: number; patch: number }
  >();
  const totals = { major: 0, minor: 0, patch: 0, all: 0 };
  const majorsInWindow: { version: string; date: string }[] = [];

  let previous: string | null = null;
  for (const event of events) {
    const kind = classifyBump(previous, event.version);
    previous = event.version;
    if (!kind) continue;

    const monthStart = new Date(
      Date.UTC(event.at.getUTCFullYear(), event.at.getUTCMonth(), 1),
    );
    if (monthStart < windowStart) continue;

    const key = monthKey(event.at);
    const bucket = monthBuckets.get(key) ?? { major: 0, minor: 0, patch: 0 };
    bucket[kind] += 1;
    monthBuckets.set(key, bucket);
    totals[kind] += 1;
    totals.all += 1;
    if (kind === "major") {
      majorsInWindow.push({
        version: event.version,
        date: event.at.toISOString(),
      });
    }
  }

  if (totals.all === 0) return empty;

  let start = windowStart;
  const firstInView = [...monthBuckets.keys()].sort()[0];
  if (firstInView) {
    const [y, m] = firstInView.split("-").map(Number);
    const firstMonth = new Date(Date.UTC(y, m - 1, 1));
    if (firstMonth > start) start = firstMonth;
  }

  const points: ReleaseTypeMixPoint[] = [];
  for (let cur = start; cur <= endMonth; cur = addMonths(cur, 1)) {
    const key = monthKey(cur);
    const bucket = monthBuckets.get(key) ?? { major: 0, minor: 0, patch: 0 };
    points.push({ date: key, ...bucket });
  }

  return {
    points,
    totals,
    recentMajors: majorsInWindow
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      )
      .slice(0, 5),
  };
}
