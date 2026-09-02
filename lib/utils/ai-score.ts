/** Shared colour bands for AI / overall quality scores (0–100). */

export function aiScoreTextClass(score: number): string {
  if (score < 20) return "text-red-600 dark:text-red-400";
  if (score < 50) return "text-orange-600 dark:text-orange-400";
  if (score < 70) return "text-amber-600 dark:text-amber-400";
  if (score < 90) return "text-blue-600 dark:text-blue-400";
  return "text-emerald-600 dark:text-emerald-400";
}

export function aiScoreBarClass(score: number): string {
  if (score < 20) return "bg-red-500";
  if (score < 50) return "bg-orange-500";
  if (score < 70) return "bg-amber-500";
  if (score < 90) return "bg-blue-500";
  return "bg-emerald-500";
}

export function isHighQualityAiScore(score: number): boolean {
  return score >= 90;
}

/** Recommendation pill colours aligned with the AI score palette. */
export function recommendationBadgeClass(recommendation: string): string {
  const value = recommendation.toLowerCase().trim();
  if (value === "recommended") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
  }
  if (value === "use-with-caution") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  }
  // do-not-use, not-recommended, and anything else negative
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
}
