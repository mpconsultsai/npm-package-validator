import { jsonOk, withHandler } from "@/lib/api/http";
import { searchNpmPackages } from "@/lib/data-fetchers/npm-registry";

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;

type CacheEntry = {
  packages: Awaited<ReturnType<typeof searchNpmPackages>>;
  expiresAt: number;
};
const searchCache = new Map<string, CacheEntry>();

const getCached = (key: string): CacheEntry["packages"] | null => {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  return entry.packages;
};

const setCached = (key: string, packages: CacheEntry["packages"]) => {
  if (searchCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = searchCache.keys().next().value;
    if (oldest) searchCache.delete(oldest);
  }
  searchCache.set(key, { packages, expiresAt: Date.now() + CACHE_TTL_MS });
};

/** GET /api/v1/packages/search?q=&limit= */
export const GET = withHandler(
  async (request) => {
    const q = (request.nextUrl.searchParams.get("q") || "").trim();
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = Math.min(
      Math.max(parseInt(limitParam || "8", 10) || 8, 1),
      20,
    );

    if (q.length < 2) {
      return jsonOk({ packages: [] });
    }

    const cacheKey = `v2:${q.toLowerCase()}:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return jsonOk({ packages: cached });
    }

    const packages = await searchNpmPackages(q, limit);
    setCached(cacheKey, packages);
    return jsonOk({ packages });
  },
  { logLabel: "packages/search", fallbackMessage: "Failed to search packages" },
);
