import type { PackageAnalysisResult } from "../types/package-data";
import {
  fetchNpmPackageData,
  fetchNpmDownloadStats,
  fetchNpmReadme,
  fetchNpmPackagePopularity,
} from "./npm-registry";
import { fetchGitHubDataFromUrl, parseGitHubUrl } from "./github";
import { checkPackageSecurity } from "./security";
import { fetchBundleSize } from "./bundlephobia";

/**
 * Analyze a package by fetching data from multiple sources
 * This is the main entry point for package analysis
 */
export async function analyzePackage(
  packageName: string,
): Promise<PackageAnalysisResult> {
  const result: PackageAnalysisResult = {
    packageName,
    errors: {},
  };

  // Fetch npm registry data (required)
  try {
    result.npm = await fetchNpmPackageData(packageName);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown npm registry error";
    result.errors!.npm = message;
    throw new Error(`Failed to fetch package data: ${message}`);
  }

  const version = result.npm.version;
  const repoUrl = result.npm.repository?.url;
  const canFetchGitHub = Boolean(repoUrl && parseGitHubUrl(repoUrl));

  // Independent sources in parallel after we have npm metadata
  await Promise.all([
    (async () => {
      try {
        result.downloads = await fetchNpmDownloadStats(packageName);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Download stats failed";
        result.errors!.npm = `${result.errors!.npm || ""} ${message}`.trim();
      }
    })(),
    (async () => {
      try {
        const popularity = await fetchNpmPackagePopularity(packageName);
        if (popularity) {
          result.popularity = popularity;
        }
      } catch {
        console.warn(`Could not fetch popularity for ${packageName}`);
      }
    })(),
    (async () => {
      try {
        result.readme = await fetchNpmReadme(packageName);
      } catch {
        console.warn(`Could not fetch README for ${packageName}`);
      }
    })(),
    (async () => {
      if (!canFetchGitHub || !repoUrl) return;
      try {
        const githubData = await fetchGitHubDataFromUrl(repoUrl);
        result.github = githubData.repoData;
        result.releases = githubData.releases;
      } catch (error: unknown) {
        result.errors!.github =
          error instanceof Error ? error.message : "GitHub fetch failed";
      }
    })(),
    (async () => {
      try {
        result.security = await checkPackageSecurity(packageName, version);
      } catch (error: unknown) {
        result.errors!.security =
          error instanceof Error ? error.message : "Security check failed";
      }
    })(),
    (async () => {
      try {
        result.bundleSize = await fetchBundleSize(packageName, version);
      } catch (error: unknown) {
        result.errors!.bundleSize =
          error instanceof Error ? error.message : "Bundle size fetch failed";
        result.bundleSize = null;
      }
    })(),
  ]);

  return result;
}

/**
 * Analyze multiple packages in parallel
 */
export async function analyzeMultiplePackages(
  packageNames: string[],
): Promise<PackageAnalysisResult[]> {
  const promises = packageNames.map((name) =>
    analyzePackage(name).catch((error: unknown) => ({
      packageName: name,
      errors: {
        npm: error instanceof Error ? error.message : "Analysis failed",
      },
    })),
  );

  return Promise.all(promises);
}
