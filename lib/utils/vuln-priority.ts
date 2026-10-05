const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  moderate: 2,
  medium: 2,
  low: 3,
};

export type ThreatRankedVuln = {
  severity: string;
  knownExploited?: boolean;
  epssScore?: number | null;
};

/**
 * Order: CISA KEV → severity → EPSS probability (desc).
 */
export function sortByThreatPriority<T extends ThreatRankedVuln>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aKev = a.knownExploited ? 1 : 0;
    const bKev = b.knownExploited ? 1 : 0;
    if (aKev !== bKev) return bKev - aKev;

    const aRank = SEVERITY_RANK[a.severity.toLowerCase()] ?? 9;
    const bRank = SEVERITY_RANK[b.severity.toLowerCase()] ?? 9;
    if (aRank !== bRank) return aRank - bRank;

    const aEpss = a.epssScore ?? -1;
    const bEpss = b.epssScore ?? -1;
    if (aEpss !== bEpss) return bEpss - aEpss;

    return 0;
  });
}

export function formatEpssPercent(score: number | null | undefined): string | null {
  if (score == null || !Number.isFinite(score)) return null;
  const pct = score * 100;
  if (pct >= 10) return `${pct.toFixed(1)}%`;
  if (pct >= 1) return `${pct.toFixed(2)}%`;
  if (pct >= 0.01) return `${pct.toFixed(3)}%`;
  return "<0.01%";
}
