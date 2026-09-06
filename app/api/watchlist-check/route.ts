import { NextRequest, NextResponse } from "next/server";
import {
  fetchWatchlistPackageStatus,
  mapPool,
} from "@/lib/data-fetchers/watchlist-status";
import { extractPackageName, validatePackageName } from "@/lib/validation";

const MAX_PACKAGES = 50;
const CONCURRENCY = 4;

/**
 * POST /api/watchlist-check
 * Body: { packages: string[] }
 * Lightweight latest-version + vulnerability count for watchlist refresh.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      packages?: unknown;
    };
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
      return NextResponse.json({ packages: [] }, { status: 200 });
    }

    const results = await mapPool(names, CONCURRENCY, async (name) => {
      try {
        return await fetchWatchlistPackageStatus(name);
      } catch {
        return null;
      }
    });

    return NextResponse.json(
      {
        packages: results.filter(Boolean),
        checkedAt: Date.now(),
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Watchlist check failed";
    console.error("Watchlist check error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
