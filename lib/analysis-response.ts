import { formatDaysSinceRelease } from "@/lib/utils/format";
import type { PackageAnalysisResult } from "@/lib/types/package-data";
import type { AIPackageAnalysis } from "@/lib/ai/analyzer";

export function getDaysSinceLastRelease(
  packageData: PackageAnalysisResult,
): number | null {
  if (!packageData.npm?.time || !packageData.npm?.version) return null;
  const lastPublished = packageData.npm.time[packageData.npm.version];
  if (!lastPublished) return null;
  return Math.floor(
    (Date.now() - new Date(lastPublished).getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function calculateQualityScore(
  packageData: PackageAnalysisResult,
): number {
  let score = 0;
  let factors = 0;

  const starsScore =
    packageData.github?.stars !== undefined
      ? packageData.github.stars >= 5000
        ? 25
        : packageData.github.stars >= 1000
          ? 22
          : packageData.github.stars >= 500
            ? 18
            : packageData.github.stars >= 100
              ? 14
              : packageData.github.stars >= 10
                ? 10
                : 5
      : 0;
  const dependentsScore = packageData.popularity?.dependents
    ? packageData.popularity.dependents >= 10000
      ? 25
      : packageData.popularity.dependents >= 1000
        ? 22
        : packageData.popularity.dependents >= 100
          ? 18
          : packageData.popularity.dependents >= 10
            ? 14
            : 5
    : 0;
  if (starsScore > 0 || dependentsScore > 0) {
    score += Math.max(starsScore, dependentsScore);
    factors++;
  }

  if (packageData.downloads?.downloads) {
    const downloads = packageData.downloads.downloads;
    if (downloads >= 10000000) score += 25;
    else if (downloads >= 1000000) score += 20;
    else if (downloads >= 100000) score += 15;
    else if (downloads >= 10000) score += 10;
    else score += 5;
    factors++;
  }

  if (packageData.npm?.time && packageData.npm.version) {
    const lastPublished = packageData.npm.time[packageData.npm.version];
    if (lastPublished) {
      const daysSince = Math.floor(
        (Date.now() - new Date(lastPublished).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysSince < 90) score += 25;
      else if (daysSince < 180) score += 20;
      else if (daysSince < 365) score += 15;
      else if (daysSince < 730) score += 10;
      else score += 5;
      factors++;
    }
  }

  if (packageData.security) {
    const issues = packageData.security.totalCount || 0;
    if (issues === 0) score += 20;
    else if (issues <= 2) score += 15;
    else if (issues <= 5) score += 10;
    else score += 5;
    factors++;
  }

  return factors > 0 ? Math.round((score / (factors * 25)) * 100) : 0;
}

export function buildAnalysisResponse(
  packageName: string,
  packageData: PackageAnalysisResult,
  aiAnalysis: AIPackageAnalysis | null = null,
) {
  const daysSinceLastRelease = getDaysSinceLastRelease(packageData);

  return {
    ...packageData,
    ai: aiAnalysis,
    packageInfo: {
      name: packageName,
      latestVersion: packageData.npm?.version || "Unknown",
      license: packageData.npm?.license || "Unknown",
      npmUrl: `https://www.npmjs.com/package/${packageName}`,
      description: packageData.npm?.description || "",
      homepage: packageData.npm?.homepage,
      repository: packageData.npm?.repository?.url,
      daysSinceLastRelease,
      lastReleaseLabel:
        daysSinceLastRelease !== null
          ? formatDaysSinceRelease(daysSinceLastRelease)
          : null,
      dependents: packageData.popularity?.dependents,
    },
    metrics: {
      downloads: packageData.downloads?.downloads || 0,
      stars: packageData.github?.stars || 0,
      openIssues: packageData.github?.open_issues || 0,
      qualityScore: calculateQualityScore(packageData),
      ...(packageData.bundleSize
        ? {
            bundleSize: packageData.bundleSize.size,
            bundleGzip: packageData.bundleSize.gzip,
          }
        : {}),
    },
  };
}
