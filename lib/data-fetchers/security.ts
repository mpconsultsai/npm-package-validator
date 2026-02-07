import axios from 'axios';

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

/**
 * Check package security using GitHub Advisory Database (free, no auth required)
 * This is a reliable alternative to Snyk
 */
export async function checkPackageSecurity(
  packageName: string,
  latestVersion?: string
): Promise<SecuritySummary> {
  const summary: SecuritySummary = {
    hasVulnerabilities: false,
    totalCount: 0,
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    vulnerabilities: [],
  };

  try {
    // GitHub Advisory Database GraphQL API (public, no auth needed for queries)
    const query = `
      query($packageName: String!) {
        securityVulnerabilities(first: 100, ecosystem: NPM, package: $packageName) {
          nodes {
            advisory {
              id: ghsaId
              summary
              description
              severity
              publishedAt
              updatedAt
              withdrawnAt
              references {
                url
              }
            }
            vulnerableVersionRange
            firstPatchedVersion {
              identifier
            }
          }
        }
      }
    `;

    const response = await axios.post(
      'https://api.github.com/graphql',
      {
        query,
        variables: { packageName },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'npm-package-validator',
          ...(process.env.GITHUB_TOKEN && {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          }),
        },
      }
    );

    const vulnerabilities = response.data?.data?.securityVulnerabilities?.nodes || [];

    for (const vuln of vulnerabilities) {
      const advisory = vuln.advisory;
      
      // Skip withdrawn advisories
      if (advisory.withdrawnAt) continue;

      // Skip if vulnerability is already patched in latest version
      if (latestVersion && vuln.firstPatchedVersion?.identifier) {
        const patchedVersion = vuln.firstPatchedVersion.identifier;
        if (isVersionGreaterOrEqual(latestVersion, patchedVersion)) {
          console.log(`Skipping ${advisory.id} - already fixed in ${latestVersion} (patched in ${patchedVersion})`);
          continue;
        }
      }

      const severity = advisory.severity.toLowerCase() as 'low' | 'moderate' | 'high' | 'critical';
      
      summary.vulnerabilities.push({
        id: advisory.id,
        title: advisory.summary,
        description: advisory.description,
        severity,
        url: advisory.references[0]?.url || `https://github.com/advisories/${advisory.id}`,
        publishedAt: advisory.publishedAt,
        updatedAt: advisory.updatedAt,
        vulnerableVersionRange: vuln.vulnerableVersionRange,
        patchedVersions: vuln.firstPatchedVersion?.identifier,
      });

      // Count by severity
      summary[severity]++;
      summary.totalCount++;
    }

    summary.hasVulnerabilities = summary.totalCount > 0;

    return summary;
  } catch (error: any) {
    console.warn(`Security check failed for ${packageName}:`, error.message);
    return summary;
  }
}

/**
 * Compare two semantic versions (simple comparison)
 * Returns true if version1 >= version2
 */
function isVersionGreaterOrEqual(version1: string, version2: string): boolean {
  try {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1 = v1Parts[i] || 0;
      const v2 = v2Parts[i] || 0;
      
      if (v1 > v2) return true;
      if (v1 < v2) return false;
    }
    
    return true; // versions are equal
  } catch (error) {
    return false;
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
  } catch (error) {
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
  } catch (error) {
    return { critical: 0, high: 0, moderate: 0, low: 0, total: 0 };
  }
}
