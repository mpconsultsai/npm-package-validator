import { jsonOk, withHandler } from "@/lib/api/http";
import { readJsonBody } from "@/lib/api/params";
import {
  fetchWatchlistPackageStatus,
  mapPool,
} from "@/lib/data-fetchers/watchlist-status";
import { extractPackageName, validatePackageName } from "@/lib/validation";

const MAX_PACKAGES = 50;
const CONCURRENCY = 4;

/** POST /api/v1/watchlist/check { packages: string[] } */
export const POST = withHandler(
  async (request) => {
    const body = await readJsonBody(request);
    const raw: unknown[] = Array.isArray(body.packages) ? body.packages : [];
    const names = [
      ...new Set(
        raw
          .map((entry) =>
            typeof entry === "string" ? extractPackageName(entry) : "",
          )
          .filter((name): name is string => name.length > 0),
      ),
    ]
      .filter((name) => validatePackageName(name).valid)
      .slice(0, MAX_PACKAGES);

    if (names.length === 0) {
      return jsonOk({ packages: [] });
    }

    const results = await mapPool(names, CONCURRENCY, async (name) => {
      try {
        return await fetchWatchlistPackageStatus(name);
      } catch {
        return null;
      }
    });

    return jsonOk({
      packages: results.filter(Boolean),
      checkedAt: Date.now(),
    });
  },
  {
    logLabel: "watchlist/check",
    fallbackMessage: "Watchlist check failed",
  },
);
