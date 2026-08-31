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

export interface ChartPoint {
  date: string;
  value: number;
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function utcYesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

class GitHubSearchRateLimitError extends Error {
  constructor() {
    super("GITHUB_SEARCH_RATE_LIMIT");
    this.name = "GitHubSearchRateLimitError";
  }
}

async function searchIssueCount(q: string): Promise<number | null> {
  try {
    const response = await axios.get(`${GITHUB_API_URL}/search/issues`, {
      headers: getGitHubHeaders(),
      params: { q, per_page: 1 },
      timeout: 8000,
    });
    const count = response.data?.total_count;
    return typeof count === "number" ? count : 0;
  } catch (error: unknown) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status === 403 || status === 429) {
      throw new GitHubSearchRateLimitError();
    }
    return null;
  }
}

const openIssueCache = new Map<string, { expires: number; points: ChartPoint[] }>();
const openIssueInflight = new Map<string, Promise<ChartPoint[]>>();
const OPEN_ISSUE_CACHE_MS = 30 * 60 * 1000;
const OPEN_ISSUE_CACHE_MAX = 50;
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

function pruneOpenIssueCache() {
  const now = Date.now();
  for (const [key, entry] of openIssueCache) {
    if (entry.expires <= now) openIssueCache.delete(key);
  }
  while (openIssueCache.size > OPEN_ISSUE_CACHE_MAX) {
    const oldest = openIssueCache.keys().next().value;
    if (!oldest) break;
    openIssueCache.delete(oldest);
  }
}

function isSafeGitHubName(value: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(value);
}

function issueSnapshotDates(): string[] {
  const today = utcToday();
  const yesterday = utcYesterday();
  const now = new Date();
  const asOfDates: string[] = [];

  for (let i = 11; i >= 0; i--) {
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0));
    const endIso = end.toISOString().slice(0, 10);
    asOfDates.push(endIso < today ? endIso : yesterday);
  }

  return [...new Set(asOfDates)].sort((a, b) => a.localeCompare(b));
}

async function fetchOpenIssueCountsGraphQL(
  owner: string,
  repo: string,
  dates: string[]
): Promise<ChartPoint[] | null> {
  const fields = dates.flatMap((date, i) => [
    `c${i}: search(query: ${JSON.stringify(`repo:${owner}/${repo} is:issue created:<=${date}`)}, type: ISSUE, first: 1) { issueCount }`,
    `x${i}: search(query: ${JSON.stringify(`repo:${owner}/${repo} is:issue is:closed closed:<=${date}`)}, type: ISSUE, first: 1) { issueCount }`,
  ]);

  try {
    const response = await axios.post(
      GITHUB_GRAPHQL_URL,
      { query: `query { ${fields.join("\n")} }` },
      {
        headers: {
          ...getGitHubHeaders(),
          Accept: "application/json",
        },
        timeout: 15000,
      },
    );

    if (response.data?.errors?.length) {
      return null;
    }

    const data = response.data?.data;
    if (!data) return null;

    return dates.map((date, i) => {
      const created = data[`c${i}`]?.issueCount;
      const closed = data[`x${i}`]?.issueCount;
      return {
        date,
        value: Math.max(0, (created ?? 0) - (closed ?? 0)),
      };
    });
  } catch {
    return null;
  }
}

async function fetchOpenIssuesUncached(
  owner: string,
  repo: string
): Promise<ChartPoint[]> {
  const dates = issueSnapshotDates();
  const fromGraphql = await fetchOpenIssueCountsGraphQL(owner, repo, dates);
  if (fromGraphql?.length) return fromGraphql;

  const points: ChartPoint[] = [];
  try {
    for (const asOf of [...dates].reverse()) {
      const [created, closed] = await Promise.all([
        searchIssueCount(`repo:${owner}/${repo} is:issue created:<=${asOf}`),
        searchIssueCount(
          `repo:${owner}/${repo} is:issue is:closed closed:<=${asOf}`,
        ),
      ]);
      if (created === null || closed === null) continue;
      points.push({ date: asOf, value: Math.max(0, created - closed) });
    }
  } catch (error) {
    if (!(error instanceof GitHubSearchRateLimitError)) {
      throw error;
    }
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Open issue count at the end of each of the last 12 months.
 * Current month is as-of yesterday (today's counts are incomplete).
 */
export async function fetchOpenIssuesByMonth(
  owner: string,
  repo: string
): Promise<ChartPoint[]> {
  if (!isSafeGitHubName(owner) || !isSafeGitHubName(repo)) return [];

  const cacheKey = `v3:${owner}/${repo}`.toLowerCase();
  pruneOpenIssueCache();
  const cached = openIssueCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.points;
  }

  const inflight = openIssueInflight.get(cacheKey);
  if (inflight) return inflight;

  const pending = fetchOpenIssuesUncached(owner, repo)
    .then((points) => {
      if (points.length) {
        pruneOpenIssueCache();
        openIssueCache.set(cacheKey, {
          expires: Date.now() + OPEN_ISSUE_CACHE_MS,
          points,
        });
      }
      return points;
    })
    .finally(() => {
      openIssueInflight.delete(cacheKey);
    });

  openIssueInflight.set(cacheKey, pending);
  return pending;
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
