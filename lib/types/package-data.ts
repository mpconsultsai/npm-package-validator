// Type definitions for package data from various sources

export interface NpmPackageData {
  name: string;
  version: string;
  description: string;
  author?: string | { name: string; email?: string };
  license?: string;
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

export interface NpmsIoScore {
  final: number;
  detail: {
    quality: number;
    popularity: number;
    maintenance: number;
  };
}

export interface NpmsIoData {
  analyzedAt: string;
  collected: {
    metadata: {
      name: string;
      version: string;
      description: string;
      keywords?: string[];
      date: string;
      publisher?: {
        username: string;
        email: string;
      };
      maintainers?: Array<{ username: string; email: string }>;
      repository?: {
        type: string;
        url: string;
      };
      links?: {
        npm?: string;
        homepage?: string;
        repository?: string;
        bugs?: string;
      };
      license?: string;
      releases?: Array<{ from: string; to: string; count: number }>;
      hasTestScript?: boolean;
      hasSelectiveFiles?: boolean;
      readme?: string;
    };
    npm?: {
      downloads?: Array<{ from: string; to: string; count: number }>;
      dependentsCount?: number;
      starsCount?: number;
    };
    github?: {
      homepage?: string;
      starsCount?: number;
      forksCount?: number;
      subscribersCount?: number;
      issues?: {
        count: number;
        openCount: number;
        distribution: Record<string, number>;
        isDisabled: boolean;
      };
      contributors?: Array<{ username: string; commitsCount: number }>;
      commits?: Array<{ from: string; to: string; count: number }>;
      statuses?: Array<{ context: string; state: string }>;
    };
    source?: {
      files?: {
        readmeSize?: number;
        testsSize?: number;
        hasChangelog?: boolean;
      };
      linters?: string[];
      outdatedDependencies?: Record<string, any>;
    };
  };
  evaluation: {
    quality: {
      carefulness: number;
      tests: number;
      health: number;
      branding: number;
    };
    popularity: {
      communityInterest: number;
      downloadsCount: number;
      downloadsAcceleration: number;
      dependentsCount: number;
    };
    maintenance: {
      releasesFrequency: number;
      commitsFrequency: number;
      openIssues: number;
      issuesDistribution: number;
    };
  };
  score: NpmsIoScore;
}

export interface SnykVulnerability {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  url: string;
  description?: string;
  identifiers?: {
    CVE?: string[];
    CWE?: string[];
  };
  semver?: {
    vulnerable: string[];
  };
  patches?: any[];
  publicationTime?: string;
  modificationTime?: string;
}

export interface SnykTestResult {
  ok: boolean;
  issues: {
    vulnerabilities: SnykVulnerability[];
  };
  dependencyCount: number;
  packageManager: string;
}

export interface PackageAnalysisResult {
  packageName: string;
  npm?: NpmPackageData;
  downloads?: NpmDownloadStats;
  github?: GitHubRepoData;
  releases?: GitHubReleaseData[];
  npmsio?: NpmsIoData;
  snyk?: SnykTestResult;
  errors?: {
    npm?: string;
    github?: string;
    npmsio?: string;
    snyk?: string;
  };
}
