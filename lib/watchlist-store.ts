"use client";

export interface WatchlistSummary {
  version?: string;
  qualityScore?: number;
  vulnerabilityCount?: number;
  deprecated?: boolean;
  recommendation?: string;
}

/** Latest polled registry/security snapshot (may differ from last reviewed summary). */
export type WatchlistFresh = Pick<
  WatchlistSummary,
  "version" | "vulnerabilityCount" | "deprecated"
>;

export interface WatchlistAlerts {
  newVersion: boolean;
  newVulns: boolean;
  newlyDeprecated: boolean;
}

export interface WatchlistEntry {
  name: string;
  pinnedAt: number;
  /** When we last polled npm/security for this package */
  lastCheckedAt?: number;
  /** Snapshot from last package-page analyse (user review baseline) */
  summary?: WatchlistSummary;
  /** Latest poll result */
  fresh?: WatchlistFresh;
}

/** Poll at most once per day — typical npm releases are weeks/months apart. */
export const WATCHLIST_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

const STORAGE_KEY = "npv-watchlist-v1";
const MAX_ENTRIES = 50;

type Listener = () => void;

const listeners = new Set<Listener>();

/** Cached snapshot for useSyncExternalStore — must be referentially stable until data changes. */
let snapshot: WatchlistEntry[] = [];
let hydrated = false;

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeWatchlist(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function sortEntries(entries: WatchlistEntry[]): WatchlistEntry[] {
  return [...entries].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

function readRaw(): WatchlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is WatchlistEntry =>
          Boolean(
            entry &&
              typeof entry === "object" &&
              typeof (entry as WatchlistEntry).name === "string" &&
              typeof (entry as WatchlistEntry).pinnedAt === "number",
          ),
      )
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function writeRaw(entries: WatchlistEntry[]) {
  if (typeof window === "undefined") return;
  const next = sortEntries(entries.slice(0, MAX_ENTRIES));
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota or private mode — ignore
  }
  snapshot = next;
  hydrated = true;
  emit();
}

function ensureHydrated(): WatchlistEntry[] {
  if (!hydrated) {
    snapshot = sortEntries(readRaw());
    hydrated = true;
  }
  return snapshot;
}

export function getWatchlistSnapshot(): WatchlistEntry[] {
  return ensureHydrated();
}

export function getWatchlistServerSnapshot(): WatchlistEntry[] {
  return EMPTY_SNAPSHOT;
}

const EMPTY_SNAPSHOT: WatchlistEntry[] = [];

export function listWatchlist(): WatchlistEntry[] {
  return ensureHydrated();
}

export function isWatched(packageName: string): boolean {
  const key = packageName.toLowerCase();
  return ensureHydrated().some((entry) => entry.name.toLowerCase() === key);
}

export function getWatchlistAlerts(entry: WatchlistEntry): WatchlistAlerts {
  const baseline = entry.summary;
  const fresh = entry.fresh;
  if (!baseline || !fresh) {
    return { newVersion: false, newVulns: false, newlyDeprecated: false };
  }

  const baseVulns = baseline.vulnerabilityCount ?? 0;
  const freshVulns = fresh.vulnerabilityCount ?? 0;

  return {
    newVersion: Boolean(
      baseline.version &&
        fresh.version &&
        baseline.version !== fresh.version,
    ),
    newVulns: freshVulns > baseVulns,
    newlyDeprecated: Boolean(fresh.deprecated && !baseline.deprecated),
  };
}

export function watchlistEntryHasAlerts(entry: WatchlistEntry): boolean {
  const alerts = getWatchlistAlerts(entry);
  return alerts.newVersion || alerts.newVulns || alerts.newlyDeprecated;
}

export function countWatchlistAlerts(entries: WatchlistEntry[] = listWatchlist()): number {
  return entries.filter(watchlistEntryHasAlerts).length;
}

/** Counts packages with each change type — for the watchlist icon badge. */
export function summarizeWatchlistAlerts(
  entries: WatchlistEntry[] = listWatchlist(),
): {
  total: number;
  newVulns: number;
  newVersion: number;
  newlyDeprecated: number;
  /** Prefer security (red) over version (green) over deprecated (orange). */
  tone: "none" | "vulns" | "version" | "deprecated";
} {
  let newVulns = 0;
  let newVersion = 0;
  let newlyDeprecated = 0;

  for (const entry of entries) {
    const alerts = getWatchlistAlerts(entry);
    if (alerts.newVulns) newVulns += 1;
    if (alerts.newVersion) newVersion += 1;
    if (alerts.newlyDeprecated) newlyDeprecated += 1;
  }

  const total = entries.filter(watchlistEntryHasAlerts).length;
  const tone =
    newVulns > 0
      ? "vulns"
      : newVersion > 0
        ? "version"
        : newlyDeprecated > 0
          ? "deprecated"
          : "none";

  return { total, newVulns, newVersion, newlyDeprecated, tone };
}

export function getWatchlistEntriesNeedingCheck(
  now = Date.now(),
): WatchlistEntry[] {
  return ensureHydrated().filter((entry) => {
    if (!entry.lastCheckedAt) return true;
    return now - entry.lastCheckedAt >= WATCHLIST_CHECK_INTERVAL_MS;
  });
}

export function addToWatchlist(
  packageName: string,
  summary?: WatchlistSummary,
): WatchlistEntry[] {
  const name = packageName.trim();
  if (!name) return listWatchlist();

  const key = name.toLowerCase();
  const now = Date.now();
  const current = ensureHydrated().filter(
    (entry) => entry.name.toLowerCase() !== key,
  );
  writeRaw([
    {
      name,
      pinnedAt: now,
      lastCheckedAt: summary ? now : undefined,
      summary,
      fresh: summary
        ? {
            version: summary.version,
            vulnerabilityCount: summary.vulnerabilityCount,
            deprecated: summary.deprecated,
          }
        : undefined,
    },
    ...current,
  ]);
  return listWatchlist();
}

export function removeFromWatchlist(packageName: string): WatchlistEntry[] {
  const key = packageName.toLowerCase();
  writeRaw(ensureHydrated().filter((entry) => entry.name.toLowerCase() !== key));
  return listWatchlist();
}

export function toggleWatchlist(
  packageName: string,
  summary?: WatchlistSummary,
): boolean {
  if (isWatched(packageName)) {
    removeFromWatchlist(packageName);
    return false;
  }
  addToWatchlist(packageName, summary);
  return true;
}

export function updateWatchlistSummary(
  packageName: string,
  summary: WatchlistSummary,
): void {
  const key = packageName.toLowerCase();
  const now = Date.now();
  const current = ensureHydrated();
  const existing = current.find((entry) => entry.name.toLowerCase() === key);
  if (!existing) return;

  const nextFresh: WatchlistFresh = {
    version: summary.version,
    vulnerabilityCount: summary.vulnerabilityCount,
    deprecated: summary.deprecated,
  };

  if (
    summariesEqual(existing.summary, summary) &&
    freshEqual(existing.fresh, nextFresh)
  ) {
    return;
  }

  writeRaw(
    current.map((entry) =>
      entry.name.toLowerCase() === key
        ? {
            ...entry,
            lastCheckedAt: now,
            summary,
            fresh: nextFresh,
          }
        : entry,
    ),
  );
}

/** Apply polled status without treating it as a user review. */
export function applyWatchlistFreshStatuses(
  updates: WatchlistFresh & { name: string }[],
  checkedAt = Date.now(),
): void {
  if (updates.length === 0) return;
  const byName = new Map(
    updates.map((u) => [u.name.toLowerCase(), u] as const),
  );
  const current = ensureHydrated();
  let changed = false;

  const next = current.map((entry) => {
    const update = byName.get(entry.name.toLowerCase());
    if (!update) return entry;

    const fresh: WatchlistFresh = {
      version: update.version,
      vulnerabilityCount: update.vulnerabilityCount,
      deprecated: update.deprecated,
    };

    // First successful poll with no baseline — adopt as reviewed snapshot
    const summary =
      entry.summary ??
      ({
        version: fresh.version,
        vulnerabilityCount: fresh.vulnerabilityCount,
        deprecated: fresh.deprecated,
      } satisfies WatchlistSummary);

    if (
      entry.lastCheckedAt === checkedAt &&
      freshEqual(entry.fresh, fresh) &&
      summariesEqual(entry.summary, summary)
    ) {
      return entry;
    }

    changed = true;
    return {
      ...entry,
      lastCheckedAt: checkedAt,
      summary: entry.summary ?? summary,
      fresh,
    };
  });

  if (changed) writeRaw(next);
}

function summariesEqual(
  a: WatchlistSummary | undefined,
  b: WatchlistSummary | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.version === b.version &&
    a.qualityScore === b.qualityScore &&
    a.vulnerabilityCount === b.vulnerabilityCount &&
    a.deprecated === b.deprecated &&
    a.recommendation === b.recommendation
  );
}

function freshEqual(
  a: WatchlistFresh | undefined,
  b: WatchlistFresh | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.version === b.version &&
    a.vulnerabilityCount === b.vulnerabilityCount &&
    a.deprecated === b.deprecated
  );
}

export function clearWatchlist(): void {
  writeRaw([]);
}
