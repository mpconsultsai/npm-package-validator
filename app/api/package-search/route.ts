import { NextRequest, NextResponse } from 'next/server';
import { searchNpmPackages } from '@/lib/data-fetchers/npm-registry';

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;

type CacheEntry = { packages: Awaited<ReturnType<typeof searchNpmPackages>>; expiresAt: number };
const searchCache = new Map<string, CacheEntry>();

function getCached(key: string): CacheEntry['packages'] | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  return entry.packages;
}

function setCached(key: string, packages: CacheEntry['packages']) {
  if (searchCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = searchCache.keys().next().value;
    if (oldest) searchCache.delete(oldest);
  }
  searchCache.set(key, { packages, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * GET /api/package-search?q=react&limit=8
 * Returns npm packages matching the query for search typeahead.
 */
export async function GET(request: NextRequest) {
  try {
    const q = (request.nextUrl.searchParams.get('q') || '').trim();
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '8', 10) || 8, 1), 20);

    if (q.length < 2) {
      return NextResponse.json({ packages: [] }, { status: 200 });
    }

    const cacheKey = `v2:${q.toLowerCase()}:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ packages: cached }, { status: 200 });
    }

    const packages = await searchNpmPackages(q, limit);
    setCached(cacheKey, packages);

    return NextResponse.json({ packages }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to search packages';
    console.error('Package search error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
