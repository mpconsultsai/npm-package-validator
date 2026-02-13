export function formatDaysSinceRelease(days: number): string {
  if (days >= 365) {
    const years = Math.floor(days / 365);
    const remainingDays = days % 365;
    if (remainingDays === 0) {
      return years === 1 ? "1yr" : `${years}yrs`;
    }
    return years === 1
      ? `1yr ${remainingDays} ${remainingDays === 1 ? "day" : "days"}`
      : `${years}yrs ${remainingDays} ${remainingDays === 1 ? "day" : "days"}`;
  }
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}
