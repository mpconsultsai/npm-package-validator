import axios from 'axios';
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
      description: latestVersionData.description || data.description,
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
