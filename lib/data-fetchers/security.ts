import axios, { AxiosError } from 'axios';

/**
 * Security vulnerability information
 */
export interface SecurityVulnerability {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  url: string;
  publishedAt: string;
  updatedAt: string;
  withdrawnAt?: string;
  vulnerableVersionRange?: string;
  patchedVersions?: string;
}

export interface SecuritySummary {
  hasVulnerabilities: boolean;
  totalCount: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
  vulnerabilities: SecurityVulnerability[];
}

type Severity = SecuritySummary['vulnerabilities'][number]['severity'];

interface GitHubAdvisoryPackage {
  ecosystem: string;
  name: string;
}

interface GitHubAdvisoryVuln {
  package: GitHubAdvisoryPackage;
  vulnerable_version_range?: string | null;
  first_patched_version?: string | null;
}

interface GitHubAdvisory {
  ghsa_id: string;
  summary: string;
  description: string;
  severity: string;
  html_url: string;
  published_at: string;
  updated_at: string;
  withdrawn_at?: string | null;
  vulnerabilities?: GitHubAdvisoryVuln[];
}

function emptySummary(): SecuritySummary {
  return {
    hasVulnerabilities: false,
    totalCount: 0,
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    vulnerabilities: [],
  };
}

function mapSeverity(severity: string): Severity {
  const normalised = severity.toLowerCase();
  if (normalised === 'medium') return 'moderate';
  if (
    normalised === 'low' ||
    normalised === 'moderate' ||
    normalised === 'high' ||
    normalised === 'critical'
  ) {
    return normalised;
  }
  return 'moderate';
}

function githubHeaders(includeToken: boolean) {
  const token = process.env.GITHUB_TOKEN?.trim();
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'npm-package-validator',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(includeToken && token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function nextPageUrl(linkHeader: string | undefined): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.split(',').find((part) => part.includes('rel="next"'));
  const url = match?.match(/<([^>]+)>/);
  return url?.[1] ?? null;
}

async function fetchAdvisoryPage(url: string, includeToken: boolean) {
  return axios.get<GitHubAdvisory[]>(url, {
    headers: githubHeaders(includeToken),
    validateStatus: (status) => status < 500,
  });
}

/**
 * List GitHub global advisories that affect this npm package (optionally a specific version).
 * Uses REST so version matching is done by GitHub, not a local semver parse of GHSA ranges.
 */
async function fetchAdvisories(
  packageName: string,
  version?: string
): Promise<GitHubAdvisory[]> {
  const affects = version ? `${packageName}@${version}` : packageName;
  const startUrl = 'https://api.github.com/advisories';
  const params = new URLSearchParams({
    ecosystem: 'npm',
    affects,
    per_page: '100',
  });

  let includeToken = Boolean(process.env.GITHUB_TOKEN?.trim());
  let url: string | null = `${startUrl}?${params.toString()}`;
  const advisories: GitHubAdvisory[] = [];

  while (url) {
    const response = await fetchAdvisoryPage(url, includeToken);

    if (response.status === 401 && includeToken) {
      console.warn(
        'GITHUB_TOKEN was rejected by GitHub (401). Retrying security scan unauthenticated.'
      );
      includeToken = false;
      url = `${startUrl}?${params.toString()}`;
      advisories.length = 0;
      continue;
    }

    if (response.status !== 200) {
      const message =
        (response.data as unknown as { message?: string })?.message ||
        `GitHub Advisory API returned ${response.status}`;
      throw new Error(message);
    }

    advisories.push(...(response.data || []));
    url = nextPageUrl(response.headers.link);
  }

  return advisories;
}

/**
 * Check package security using the GitHub Advisory Database.
 * Pass a version to only include advisories that affect that version.
 */
export async function checkPackageSecurity(
  packageName: string,
  version?: string
): Promise<SecuritySummary> {
  const summary = emptySummary();

  try {
    const advisories = await fetchAdvisories(packageName, version);

    for (const advisory of advisories) {
      if (advisory.withdrawn_at) continue;

      const packageVuln = advisory.vulnerabilities?.find(
        (entry) =>
          entry.package?.ecosystem?.toLowerCase() === 'npm' &&
          entry.package?.name === packageName
      );

      const severity = mapSeverity(advisory.severity);

      summary.vulnerabilities.push({
        id: advisory.ghsa_id,
        title: advisory.summary,
        description: advisory.description,
        severity,
        url: advisory.html_url || `https://github.com/advisories/${advisory.ghsa_id}`,
        publishedAt: advisory.published_at,
        updatedAt: advisory.updated_at,
        withdrawnAt: advisory.withdrawn_at ?? undefined,
        vulnerableVersionRange: packageVuln?.vulnerable_version_range ?? undefined,
        patchedVersions: packageVuln?.first_patched_version ?? undefined,
      });

      summary[severity]++;
      summary.totalCount++;
    }

    summary.hasVulnerabilities = summary.totalCount > 0;
    return summary;
  } catch (error: unknown) {
    const message =
      error instanceof AxiosError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unknown error';
    console.warn(`Security check failed for ${packageName}:`, message);
    throw new Error(`Failed to check package security: ${message}`);
  }
}

/**
 * Quick check if package has critical or high vulnerabilities
 */
export async function hasHighRiskVulnerabilities(
  packageName: string
): Promise<boolean> {
  try {
    const summary = await checkPackageSecurity(packageName);
    return summary.critical > 0 || summary.high > 0;
  } catch {
    return false;
  }
}

/**
 * Get simple vulnerability count
 */
export async function getVulnerabilityCount(
  packageName: string
): Promise<{ critical: number; high: number; moderate: number; low: number; total: number }> {
  try {
    const summary = await checkPackageSecurity(packageName);
    return {
      critical: summary.critical,
      high: summary.high,
      moderate: summary.moderate,
      low: summary.low,
      total: summary.totalCount,
    };
  } catch {
    return { critical: 0, high: 0, moderate: 0, low: 0, total: 0 };
  }
}
