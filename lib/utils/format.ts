export function formatCompactNumber(n: number): string {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatDaysSinceRelease(days: number): string {
  const totalDays = Math.max(0, Math.floor(Number(days)));
  if (!Number.isFinite(totalDays)) return "Unknown";

  if (totalDays >= 365) {
    const years = Math.floor(totalDays / 365);
    return years === 1 ? "Over 1 year" : `Over ${years} years`;
  }
  return `${totalDays} ${totalDays === 1 ? "day" : "days"} ago`;
}

/** Human-readable byte size (decimal units, matching Bundlephobia-style labels). */
export function formatBytes(bytes: number): string {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return "—";
  if (value < 1000) return `${Math.round(value)} B`;
  if (value < 1_000_000) {
    const kb = value / 1000;
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} kB`;
  }
  const mb = value / 1_000_000;
  return `${mb < 10 ? mb.toFixed(2) : mb.toFixed(1)} MB`;
}
