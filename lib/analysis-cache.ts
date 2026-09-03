import { analyzePackage } from "@/lib/data-fetchers/package-analyzer";
import type { PackageAnalysisResult } from "@/lib/types/package-data";

const TTL_MS = 2 * 60 * 1000;

type CacheEntry = {
  data: PackageAnalysisResult;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

/**
 * Short-lived in-memory cache so progressive /api/analyze → /api/analyze-ai
 * does not re-hit npm/GitHub/Bundlephobia for the same package.
 */
export async function analyzePackageCached(
  packageName: string,
): Promise<PackageAnalysisResult> {
  const key = packageName.toLowerCase();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.data;
  }

  const data = await analyzePackage(packageName);
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
  return data;
}
