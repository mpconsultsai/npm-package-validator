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
