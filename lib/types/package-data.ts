// Type definitions for package data from various sources

import type { SecuritySummary } from '../data-fetchers/security';
import type { BundleSizeInfo } from '../data-fetchers/bundlephobia';

export interface NpmPackageData {
  name: string;
  version: string;
  description: string;
  author?: string | { name: string; email?: string };
  license?: string;
  /** Present when the latest version is marked deprecated on npm */
  deprecated?: string | null;
  repository?: {
    type: string;
    url: string;
  };
  homepage?: string;
  keywords?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  maintainers?: Array<{ name: string; email: string }>;
  time?: {
    created: string;
    modified: string;
    [version: string]: string;
  };
  distTags?: {
    latest: string;
    [tag: string]: string;
  };
}

export interface NpmDownloadStats {
  downloads: number;
  start: string;
  end: string;
  package: string;
}

export interface GitHubRepoData {
  name: string;
  full_name: string;
  description: string;
  stars: number;
  watchers: number;
  forks: number;
  open_issues: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  language: string;
  license?: {
    name: string;
    spdx_id: string;
  };
  topics?: string[];
  has_issues: boolean;
  has_wiki: boolean;
  archived: boolean;
  default_branch: string;
}

export interface GitHubReleaseData {
  tag_name: string;
  name: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
}

export interface NpmPackagePopularity {
  dependents: number;
  popularityScore: number;
  qualityScore: number;
  maintenanceScore: number;
}

export interface PackageAnalysisResult {
  packageName: string;
  npm?: NpmPackageData;
  downloads?: NpmDownloadStats;
  github?: GitHubRepoData;
  releases?: GitHubReleaseData[];
  security?: SecuritySummary;
  popularity?: NpmPackagePopularity;
  bundleSize?: BundleSizeInfo | null;
  readme?: string | null;
  errors?: {
    npm?: string;
    github?: string;
    security?: string;
    ai?: string;
    bundleSize?: string;
  };
}
