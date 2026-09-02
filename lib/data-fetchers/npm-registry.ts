import axios from 'axios';
import { sanitizeDescription } from '../sanitize';
import { extractPackageName, validatePackageName } from '../validation';
import type { NpmPackageData, NpmDownloadStats } from '../types/package-data';

const NPM_REGISTRY_URL = 'https://registry.npmjs.org';
const NPM_DOWNLOADS_URL = 'https://api.npmjs.org/downloads';

/**
 * Fetch package metadata from npm registry
 */
export async function fetchNpmPackageData(packageName: string): Promise<NpmPackageData> {
  try {
    const response = await axios.get(`${NPM_REGISTRY_URL}/${packageName}`);
    const data = response.data;
    
    const latestVersion = data['dist-tags']?.latest || Object.keys(data.versions || {}).pop();
    const latestVersionData = data.versions?.[latestVersion] || {};

    return {
      name: data.name,
      version: latestVersion,
      description: sanitizeDescription(latestVersionData.description || data.description),
      author: latestVersionData.author,
      license: latestVersionData.license,
      deprecated:
        typeof latestVersionData.deprecated === "string"
          ? latestVersionData.deprecated
          : latestVersionData.deprecated
            ? "This package has been deprecated"
            : null,
      repository: latestVersionData.repository,
      homepage: latestVersionData.homepage,
      keywords: latestVersionData.keywords,
      dependencies: latestVersionData.dependencies,
      devDependencies: latestVersionData.devDependencies,
      maintainers: data.maintainers,
      time: data.time,
      distTags: data["dist-tags"],
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(`Package "${packageName}" not found on npm registry`);
    }
    throw new Error(`Failed to fetch npm data: ${error.message}`);
  }
}

/**
 * Fetch download statistics for the last 30 days
 */
export async function fetchNpmDownloadStats(packageName: string): Promise<NpmDownloadStats> {
  try {
    const response = await axios.get(
      `${NPM_DOWNLOADS_URL}/point/last-month/${packageName}`
    );
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to fetch download stats: ${error.message}`);
  }
}

/**
 * Fetch weekly download statistics for the last year (for trends)
 */
export interface NpmDownloadDay {
  day: string;
  downloads: number;
}

export async function fetchNpmDownloadTrends(packageName: string): Promise<{
  downloads: NpmDownloadDay[];
}> {
  try {
    const response = await axios.get(
      `${NPM_DOWNLOADS_URL}/range/last-year/${encodeURIComponent(packageName)}`
    );
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to fetch download trends: ${error.message}`);
  }
}

export function toWeeklyDownloads(days: NpmDownloadDay[]): ChartPointLike[] {
  const today = new Date().toISOString().slice(0, 10);
  const complete = days.filter((d) => d.day < today);
  const weeks: ChartPointLike[] = [];
  for (let i = 0; i + 7 <= complete.length; i += 7) {
    const slice = complete.slice(i, i + 7);
    weeks.push({
      date: slice[0].day,
      value: slice.reduce((sum, d) => sum + (d.downloads || 0), 0),
    });
  }
  return weeks;
}

interface ChartPointLike {
  date: string;
  value: number;
}

export interface NpmSearchResult {
  name: string;
  description: string;
  version: string;
  score?: number;
}

/** Well-known packages probed for prefix completion when npm search omits them. */
const WELL_KNOWN_PACKAGES = [
  'angular',
  'react',
  'react-dom',
  'vue',
  'lodash',
  'express',
  'next',
  'typescript',
  'axios',
  'webpack',
  'eslint',
  'rxjs',
  'jquery',
  'prettier',
  'vite',
  'tailwindcss',
  'commander',
  'chalk',
  'mongoose',
  'nodemon',
  '@angular/core',
  '@types/node',
  '@types/react',
];

async function fetchRegistryLatestPackage(
  name: string,
): Promise<NpmSearchResult | null> {
  try {
    const response = await axios.get(
      `${NPM_REGISTRY_URL}/${encodeURIComponent(name)}/latest`,
      {
        timeout: 4000,
        validateStatus: (status) => status === 200 || status === 404,
      },
    );
    if (response.status === 404) return null;

    const data = response.data;
    return {
      name: data.name || name,
      description: sanitizeDescription(data.description) || 'No description',
      version: data.version || '',
      score: 1_000_000,
    };
  } catch {
    return null;
  }
}

async function fetchExactPackageMatch(query: string): Promise<NpmSearchResult | null> {
  const candidate = extractPackageName(query);
  if (!validatePackageName(candidate).valid) return null;
  const pkg = await fetchRegistryLatestPackage(candidate);
  if (!pkg) return null;
  return { ...pkg, score: 10_000_000 };
}

async function fetchWellKnownPrefixMatches(query: string): Promise<NpmSearchResult[]> {
  const q = query.toLowerCase().trim();
  if (q.length < 2 || q.startsWith('@')) return [];

  const candidates = WELL_KNOWN_PACKAGES.filter((name) => {
    const lower = name.toLowerCase();
    return lower.startsWith(q) && lower !== q;
  }).slice(0, 6);

  if (candidates.length === 0) return [];

  const results = await Promise.all(
    candidates.map((name) => fetchRegistryLatestPackage(name)),
  );
  return results.filter((r): r is NpmSearchResult => r !== null);
}

function pinExactNameFirst(
  results: NpmSearchResult[],
  query: string,
): NpmSearchResult[] {
  const q = query.toLowerCase().trim();
  const exactIndex = results.findIndex((r) => r.name.toLowerCase() === q);
  if (exactIndex <= 0) return results;
  const exact = results[exactIndex];
  return [
    exact,
    ...results.filter((_, index) => index !== exactIndex),
  ];
}

/**
 * Sort search results: exact match → unscoped prefix → scoped → contains → npm score.
 */
export function sortNpmSearchResults(
  query: string,
  results: NpmSearchResult[],
): NpmSearchResult[] {
  const q = query.toLowerCase().trim();
  const queryIsScoped = q.startsWith('@');
  const qSegment = q.includes('/') ? q.split('/').pop()! : q;

  function rank(name: string): number {
    const lower = name.toLowerCase();
    const nameIsScoped = lower.startsWith('@');

    if (lower === q) return 0;

    if (!nameIsScoped && lower.startsWith(q)) return 1;

    if (queryIsScoped) {
      if (lower.startsWith(q)) return 1;
      const segment = lower.split('/')[1] ?? '';
      if (segment.startsWith(qSegment)) return 2;
    }

    // Unscoped query: rank @angular/* below unscoped "angular" and angular-*
    if (!queryIsScoped && nameIsScoped) {
      const [scope, segment] = lower.split('/');
      if (scope === `@${q}` && segment === q) return 2;
      if (segment === q) return 3;
      if (scope === `@${q}`) return 10;
      if (scope.includes(q)) return 11;
      return 12;
    }

    if (nameIsScoped) {
      const segment = lower.split('/')[1] ?? '';
      if (segment.startsWith(qSegment)) return 4;
    }

    if (lower.includes(q)) return 5;
    return 6;
  }

  return [...results].sort((a, b) => {
    const rankDiff = rank(a.name) - rank(b.name);
    if (rankDiff !== 0) return rankDiff;
    const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
    if (Number.isFinite(scoreDiff) && scoreDiff !== 0) return scoreDiff;
    return a.name.length - b.name.length;
  });
}

/**
 * Search npm registry for packages matching a query (for typeahead).
 */
export async function searchNpmPackages(
  query: string,
  limit: number = 8,
): Promise<NpmSearchResult[]> {
  const text = query.trim();
  if (text.length < 2) return [];

  try {
    const [searchResponse, exactMatch, prefixMatches] = await Promise.all([
      axios.get(`${NPM_REGISTRY_URL}/-/v1/search`, {
        params: { text, size: Math.max(limit * 3, 30) },
      }),
      fetchExactPackageMatch(text),
      fetchWellKnownPrefixMatches(text),
    ]);
    const objects = searchResponse.data?.objects || [];
    const seen = new Set<string>();
    const results: NpmSearchResult[] = [];

    for (const match of [exactMatch, ...prefixMatches]) {
      if (!match) continue;
      const key = match.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(match);
    }

    for (const entry of objects) {
      const mapped = {
        name: entry.package?.name ?? '',
        description:
          sanitizeDescription(entry.package?.description) || 'No description',
        version: entry.package?.version ?? '',
        score: entry.score?.final ?? 0,
      };
      if (!mapped.name || seen.has(mapped.name.toLowerCase())) continue;
      seen.add(mapped.name.toLowerCase());
      results.push(mapped);
    }

    return pinExactNameFirst(
      sortNpmSearchResults(text, results),
      text,
    ).slice(0, limit);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Search failed';
    console.warn('npm package search failed:', message);
    return [];
  }
}

/**
 * Used to identify well-known packages like react, lodash
 */
export async function fetchNpmPackagePopularity(packageName: string): Promise<{
  dependents: number;
  popularityScore: number;
  qualityScore: number;
  maintenanceScore: number;
} | null> {
  try {
    // Search by exact package name - first result should match
    const response = await axios.get(
      `${NPM_REGISTRY_URL}/-/v1/search`,
      { params: { text: packageName, size: 1 } }
    );
    const objects = response.data?.objects || [];
    const match = objects[0];

    if (!match || match.package?.name?.toLowerCase() !== packageName.toLowerCase()) {
      return null;
    }

    return {
      dependents: parseInt(match.dependents || '0', 10) || 0,
      popularityScore: match.score?.detail?.popularity ?? 0,
      qualityScore: match.score?.detail?.quality ?? 0,
      maintenanceScore: match.score?.detail?.maintenance ?? 0,
    };
  } catch (error: any) {
    console.warn(`Could not fetch npm popularity for ${packageName}:`, error.message);
    return null;
  }
}

/**
 * Fetch similar/recommended packages by searching npm with the package's keywords or name.
 * Returns packages in the same "category" (e.g. other react-related or testing libs).
 */
export async function fetchSimilarPackages(
  packageName: string,
  keywords?: string[] | null,
  limit: number = 6
): Promise<Array<{ name: string; description: string; version: string }>> {
  try {
    const searchTerm =
      keywords?.length && keywords[0]
        ? keywords.slice(0, 2).join(' ')
        : packageName;
    const response = await axios.get(
      `${NPM_REGISTRY_URL}/-/v1/search`,
      { params: { text: searchTerm, size: limit + 10 } }
    );
    const objects = response.data?.objects || [];
    const currentLower = packageName.toLowerCase();
    const similar = objects
      .filter((p: any) => p.package?.name?.toLowerCase() !== currentLower)
      .slice(0, limit)
      .map((p: any) => ({
        name: p.package?.name ?? '',
        description: sanitizeDescription(p.package?.description) || 'No description',
        version: p.package?.version ?? '',
      }))
      .filter((p: any) => p.name);
    return similar;
  } catch (error: any) {
    console.warn('Could not fetch similar packages:', error.message);
    return [];
  }
}

/**
 * Fetch package README content (first 3000 characters for AI analysis)
 */
export async function fetchNpmReadme(packageName: string): Promise<string | null> {
  try {
    const response = await axios.get(`${NPM_REGISTRY_URL}/${packageName}`);
    const readme = response.data.readme;
    
    if (!readme) {
      return null;
    }
    
    // Return first 3000 characters to keep AI prompt reasonable
    // Focus on the top section where deprecation notices usually appear
    return readme.substring(0, 3000);
  } catch (error: any) {
    console.error(`Failed to fetch README for ${packageName}:`, error.message);
    return null;
  }
}
