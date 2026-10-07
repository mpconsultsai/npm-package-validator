import axios from "axios";
import { errorMessage } from "@/lib/utils/error-message";
import type { NpmDownloadDay } from "./npm-registry";

const PYPISTATS_API = "https://pypistats.org/api";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const STALE_CACHE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;

type CacheEntry = {
  downloads: NpmDownloadDay[];
  fetchedAt: number;
};

const downloadCache = new Map<string, CacheEntry>();

type PypistatsRecentRow = {
  date?: string;
  downloads?: number;
};

function cacheKey(packageName: string): string {
  return packageName.trim().toLowerCase();
}

function getCached(
  packageName: string,
  maxAgeMs: number,
): NpmDownloadDay[] | null {
  const entry = downloadCache.get(cacheKey(packageName));
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > maxAgeMs) {
    downloadCache.delete(cacheKey(packageName));
    return null;
  }
  return entry.downloads;
}

function setCached(packageName: string, downloads: NpmDownloadDay[]) {
  const key = cacheKey(packageName);
  if (downloadCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = downloadCache.keys().next().value;
    if (oldest) downloadCache.delete(oldest);
  }
  downloadCache.set(key, { downloads, fetchedAt: Date.now() });
}

function parseRecentRows(data: unknown): NpmDownloadDay[] {
  const rows: PypistatsRecentRow[] = Array.isArray(
    (data as { data?: unknown })?.data,
  )
    ? ((data as { data: PypistatsRecentRow[] }).data ?? [])
    : [];

  return rows
    .filter(
      (row): row is { date: string; downloads: number } =>
        typeof row.date === "string" && typeof row.downloads === "number",
    )
    .map((row) => ({ day: row.date, downloads: row.downloads }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * Daily download counts from pypistats (typically ~30 days for period=day).
 * Mirrors npm daily shape for shared weekly chart aggregation.
 */
export async function fetchPypiDownloadTrends(
  packageName: string,
): Promise<{ downloads: NpmDownloadDay[] }> {
  const cached = getCached(packageName, CACHE_TTL_MS);
  if (cached) {
    return { downloads: cached };
  }

  try {
    const response = await axios.get(
      `${PYPISTATS_API}/packages/${encodeURIComponent(packageName)}/recent`,
      {
        params: { period: "day", mirrors: false },
        timeout: 15_000,
        headers: {
          "User-Agent": "pkglens/1.0 (+https://github.com)",
        },
        validateStatus: (status) =>
          status === 200 || status === 404 || status === 429,
      },
    );

    if (response.status === 404) {
      return { downloads: [] };
    }

    if (response.status === 429) {
      const stale = getCached(packageName, STALE_CACHE_MS);
      if (stale) {
        return { downloads: stale };
      }
      throw new Error(
        "PyPI download stats are temporarily rate-limited (pypistats.org). Try again in a few minutes.",
      );
    }

    const downloads = parseRecentRows(response.data);
    if (downloads.length > 0) {
      setCached(packageName, downloads);
    }
    return { downloads };
  } catch (error: unknown) {
    const stale = getCached(packageName, STALE_CACHE_MS);
    if (stale) {
      return { downloads: stale };
    }
    throw new Error(
      `Failed to fetch PyPI download trends: ${errorMessage(error)}`,
    );
  }
}
