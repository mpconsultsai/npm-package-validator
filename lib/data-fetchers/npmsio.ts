import axios from 'axios';
import type { NpmsIoData } from '../types/package-data';

const NPMSIO_API_URL = 'https://api.npms.io/v2';

/**
 * Fetch package analysis from npms.io
 * This includes quality, popularity, and maintenance scores
 */
export async function fetchNpmsIoData(packageName: string): Promise<NpmsIoData> {
  try {
    const response = await axios.get(`${NPMSIO_API_URL}/package/${encodeURIComponent(packageName)}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(`Package "${packageName}" not found on npms.io`);
    }
    throw new Error(`Failed to fetch npms.io data: ${error.message}`);
  }
}

/**
 * Search for similar packages on npms.io
 */
export async function searchNpmsIo(query: string, size: number = 10) {
  try {
    const response = await axios.get(`${NPMSIO_API_URL}/search`, {
      params: {
        q: query,
        size,
      },
    });
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to search npms.io: ${error.message}`);
  }
}

/**
 * Get suggestions for package alternatives
 */
export async function fetchPackageSuggestions(packageName: string, size: number = 5) {
  try {
    const response = await axios.get(
      `${NPMSIO_API_URL}/search/suggestions`,
      {
        params: {
          q: packageName,
          size,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to fetch package suggestions: ${error.message}`);
  }
}
