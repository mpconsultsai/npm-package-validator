import axios from 'axios';
import type { SnykTestResult } from '../types/package-data';

const SNYK_API_URL = 'https://snyk.io/api/v1';

/**
 * Test package for vulnerabilities using Snyk API
 * Requires SNYK_TOKEN environment variable
 */
export async function testPackageWithSnyk(
  packageName: string,
  version: string
): Promise<SnykTestResult> {
  const token = process.env.SNYK_TOKEN;

  if (!token) {
    throw new Error('SNYK_TOKEN environment variable is not set. Skipping Snyk vulnerability check.');
  }

  try {
    const response = await axios.post(
      `${SNYK_API_URL}/test/npm/${packageName}/${version}`,
      {},
      {
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Invalid Snyk API token');
    }
    if (error.response?.status === 404) {
      throw new Error(`Package "${packageName}@${version}" not found on Snyk`);
    }
    throw new Error(`Failed to test package with Snyk: ${error.message}`);
  }
}

/**
 * Get vulnerability count summary (without full details)
 * Falls back gracefully if Snyk token is not available
 */
export async function getVulnerabilityCount(
  packageName: string,
  version: string
): Promise<{ low: number; medium: number; high: number; critical: number } | null> {
  try {
    const result = await testPackageWithSnyk(packageName, version);
    const counts = { low: 0, medium: 0, high: 0, critical: 0 };

    result.issues.vulnerabilities.forEach((vuln) => {
      counts[vuln.severity]++;
    });

    return counts;
  } catch (error: any) {
    // Return null if Snyk is not configured or fails
    console.warn(`Snyk check failed: ${error.message}`);
    return null;
  }
}
