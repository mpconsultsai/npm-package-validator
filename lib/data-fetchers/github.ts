import axios from 'axios';
import type { GitHubRepoData, GitHubReleaseData } from '../types/package-data';

const GITHUB_API_URL = 'https://api.github.com';

/**
 * Extract GitHub repo info from various URL formats
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  if (!url) return null;

  // Handle various GitHub URL formats
  const patterns = [
    /github\.com[:/]([^/]+)\/([^/\.]+)/i,
    /github:([^/]+)\/([^/\.]+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  }

  return null;
}

/**
 * Create GitHub API headers with optional authentication
 */
function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'npm-package-validator',
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

/**
 * Fetch repository data from GitHub
 */
export async function fetchGitHubRepoData(
  owner: string,
  repo: string
): Promise<GitHubRepoData> {
  try {
    const response = await axios.get(`${GITHUB_API_URL}/repos/${owner}/${repo}`, {
      headers: getGitHubHeaders(),
    });

    const data = response.data;
    return {
      name: data.name,
      full_name: data.full_name,
      description: data.description,
      stars: data.stargazers_count,
      watchers: data.watchers_count,
      forks: data.forks_count,
      open_issues: data.open_issues_count,
      created_at: data.created_at,
      updated_at: data.updated_at,
      pushed_at: data.pushed_at,
      language: data.language,
      license: data.license,
      topics: data.topics,
      has_issues: data.has_issues,
      has_wiki: data.has_wiki,
      archived: data.archived,
      default_branch: data.default_branch,
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(`GitHub repository "${owner}/${repo}" not found`);
    }
    if (error.response?.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Please add a GITHUB_TOKEN to your .env.local file.');
    }
    throw new Error(`Failed to fetch GitHub data: ${error.message}`);
  }
}

/**
 * Fetch latest releases from GitHub
 */
export async function fetchGitHubReleases(
  owner: string,
  repo: string,
  limit: number = 5
): Promise<GitHubReleaseData[]> {
  try {
    const response = await axios.get(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/releases`,
      {
        headers: getGitHubHeaders(),
        params: { per_page: limit },
      }
    );

    return response.data.map((release: any) => ({
      tag_name: release.tag_name,
      name: release.name,
      published_at: release.published_at,
      prerelease: release.prerelease,
      draft: release.draft,
    }));
  } catch (error: any) {
    // Releases endpoint might not exist or be empty
    if (error.response?.status === 404) {
      return [];
    }
    throw new Error(`Failed to fetch GitHub releases: ${error.message}`);
  }
}

/**
 * Get GitHub data from repository URL
 */
export async function fetchGitHubDataFromUrl(repoUrl: string) {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    throw new Error('Invalid GitHub repository URL');
  }

  const [repoData, releases] = await Promise.all([
    fetchGitHubRepoData(parsed.owner, parsed.repo),
    fetchGitHubReleases(parsed.owner, parsed.repo),
  ]);

  return { repoData, releases };
}
