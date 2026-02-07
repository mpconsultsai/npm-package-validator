import axios from 'axios';

const NPM_REGISTRY_URL = 'https://registry.npmjs.org';

/**
 * Vulnerability information from npm audit
 */
export interface NpmVulnerability {
  id: number;
  title: string;
  severity: 'info' | 'low' | 'moderate' | 'high' | 'critical';
  url: string;
  vulnerable_versions: string;
  patched_versions?: string;
  recommendation?: string;
  cwe?: string[];
  cvss?: {
    score: number;
    vectorString: string;
  };
}

export interface NpmAuditResult {
  vulnerabilities: {
    [packageName: string]: {
      name: string;
      severity: 'info' | 'low' | 'moderate' | 'high' | 'critical';
      via: Array<NpmVulnerability | string>;
      effects: string[];
      range: string;
      nodes: string[];
      fixAvailable: boolean | { name: string; version: string; isSemVerMajor: boolean };
    };
  };
  metadata: {
    vulnerabilities: {
      info: number;
      low: number;
      moderate: number;
      high: number;
      critical: number;
      total: number;
    };
    dependencies: {
      prod: number;
      dev: number;
      optional: number;
      peer: number;
      total: number;
    };
  };
}

/**
 * Quick audit using npm's quick audit endpoint
 * This checks a single package without installing it
 */
export async function quickAuditPackage(
  packageName: string,
  version?: string
): Promise<NpmAuditResult | null> {
  try {
    // Fetch package metadata to get dependencies
    const pkgResponse = await axios.get(`${NPM_REGISTRY_URL}/${packageName}`);
    const latestVersion = version || pkgResponse.data['dist-tags']?.latest;
    const versionData = pkgResponse.data.versions?.[latestVersion];

    if (!versionData) {
      throw new Error(`Version ${latestVersion} not found`);
    }

    const dependencies = {
      ...versionData.dependencies,
      ...versionData.peerDependencies,
    };

    // Create a minimal package-lock structure for audit
    const packageLock = {
      name: packageName,
      version: latestVersion,
      lockfileVersion: 2,
      requires: true,
      packages: {
        '': {
          name: packageName,
          version: latestVersion,
          dependencies: dependencies || {},
        },
      },
      dependencies: {},
    };

    // Call npm audit API
    const auditResponse = await axios.post(
      'https://registry.npmjs.org/-/npm/v1/security/audits/quick',
      packageLock,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return auditResponse.data;
  } catch (error: any) {
    console.warn(`npm audit failed for ${packageName}:`, error.message);
    return null;
  }
}

/**
 * Get vulnerability count summary
 */
export async function getVulnerabilityCount(
  packageName: string,
  version?: string
): Promise<{ info: number; low: number; moderate: number; high: number; critical: number; total: number } | null> {
  try {
    const result = await quickAuditPackage(packageName, version);
    if (!result) return null;

    return result.metadata.vulnerabilities;
  } catch (error: any) {
    console.warn(`Failed to get vulnerability count: ${error.message}`);
    return null;
  }
}

/**
 * Check if package has any critical or high vulnerabilities
 */
export async function hasHighSeverityVulnerabilities(
  packageName: string,
  version?: string
): Promise<boolean> {
  try {
    const counts = await getVulnerabilityCount(packageName, version);
    if (!counts) return false;

    return (counts.critical > 0 || counts.high > 0);
  } catch (error) {
    return false;
  }
}

/**
 * Get simplified vulnerability summary
 */
export async function getVulnerabilitySummary(
  packageName: string,
  version?: string
): Promise<{
  hasCritical: boolean;
  hasHigh: boolean;
  totalVulnerabilities: number;
  counts: { info: number; low: number; moderate: number; high: number; critical: number };
} | null> {
  try {
    const counts = await getVulnerabilityCount(packageName, version);
    if (!counts) return null;

    return {
      hasCritical: counts.critical > 0,
      hasHigh: counts.high > 0,
      totalVulnerabilities: counts.total,
      counts: {
        info: counts.info,
        low: counts.low,
        moderate: counts.moderate,
        high: counts.high,
        critical: counts.critical,
      },
    };
  } catch (error) {
    return null;
  }
}
