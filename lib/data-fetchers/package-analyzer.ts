import type { PackageAnalysisResult } from '../types/package-data';
import { fetchNpmPackageData, fetchNpmDownloadStats, fetchNpmReadme, fetchNpmPackagePopularity } from './npm-registry';
import { fetchGitHubDataFromUrl, parseGitHubUrl } from './github';
import { checkPackageSecurity } from './security';

/**
 * Analyze a package by fetching data from multiple sources
 * This is the main entry point for package analysis
 */
export async function analyzePackage(packageName: string): Promise<PackageAnalysisResult> {
  const result: PackageAnalysisResult = {
    packageName,
    errors: {},
  };

  // Fetch npm registry data (required)
  try {
    result.npm = await fetchNpmPackageData(packageName);
  } catch (error: any) {
    result.errors!.npm = error.message;
    throw new Error(`Failed to fetch package data: ${error.message}`);
  }

  // Fetch download stats
  try {
    result.downloads = await fetchNpmDownloadStats(packageName);
  } catch (error: any) {
    result.errors!.npm = `${result.errors!.npm || ''} ${error.message}`.trim();
  }

  // Fetch npm popularity (dependents, scores) - identifies well-known packages
  try {
    const popularity = await fetchNpmPackagePopularity(packageName);
    if (popularity) {
      (result as any).popularity = popularity;
    }
  } catch (error: any) {
    // Optional - don't add to errors
    console.warn(`Could not fetch popularity for ${packageName}`);
  }

  // Fetch README (for deprecation notices and maintenance status)
  try {
    result.readme = await fetchNpmReadme(packageName);
  } catch (error: any) {
    // README is optional, don't add to errors
    console.warn(`Could not fetch README for ${packageName}`);
  }

  // Fetch GitHub data (if repository URL is available)
  if (result.npm?.repository?.url) {
    const repoUrl = result.npm.repository.url;
    const githubInfo = parseGitHubUrl(repoUrl);

    if (githubInfo) {
      try {
        const githubData = await fetchGitHubDataFromUrl(repoUrl);
        result.github = githubData.repoData;
        result.releases = githubData.releases;
      } catch (error: any) {
        result.errors!.github = error.message;
      }
    }
  }

  // Fetch security vulnerabilities from GitHub Advisory Database (free, no API key required)
  // Pass the latest version to filter out already-patched vulnerabilities
  try {
    const latestVersion = result.npm?.version;
    const securityData = await checkPackageSecurity(packageName, latestVersion);
    (result as any).security = securityData;
  } catch (error: any) {
    result.errors!.security = error.message;
  }

  return result;
}

/**
 * Analyze multiple packages in parallel
 */
export async function analyzeMultiplePackages(
  packageNames: string[]
): Promise<PackageAnalysisResult[]> {
  const promises = packageNames.map((name) => 
    analyzePackage(name).catch((error) => ({
      packageName: name,
      errors: { npm: error.message },
    }))
  );

  return Promise.all(promises);
}
