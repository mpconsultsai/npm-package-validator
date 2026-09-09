/**
 * Build a monthly release-count series from the npm packument `time` map.
 * Empty months are filled so gaps in cadence are visible.
 */

const META_KEYS = new Set(["created", "modified", "unpublished"]);

export interface ReleaseCadencePoint {
  /** First day of month, YYYY-MM-DD */
  date: string;
  value: number;
}

function monthKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
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

  // Cap to recent window ending at last release month
  const windowStart = addMonths(end, -(maxMonths - 1));
  if (start < windowStart) start = windowStart;

  const points: ReleaseCadencePoint[] = [];
  for (let cur = start; cur <= end; cur = addMonths(cur, 1)) {
    const key = monthKey(cur);
    points.push({ date: key, value: counts.get(key) || 0 });
  }

  return points;
}
