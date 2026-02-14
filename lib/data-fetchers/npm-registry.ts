import axios from 'axios';
import { sanitizeDescription } from '../sanitize';
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
      repository: latestVersionData.repository,
      homepage: latestVersionData.homepage,
      keywords: latestVersionData.keywords,
      dependencies: latestVersionData.dependencies,
      devDependencies: latestVersionData.devDependencies,
      maintainers: data.maintainers,
      time: data.time,
      distTags: data['dist-tags'],
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
export async function fetchNpmDownloadTrends(packageName: string): Promise<any> {
  try {
    const response = await axios.get(
      `${NPM_DOWNLOADS_URL}/range/last-year/${packageName}`
    );
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to fetch download trends: ${error.message}`);
  }
}

/**
 * Fetch package popularity data from npm search API (dependents, npm score)
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
      .filter((p) => p.name);
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
