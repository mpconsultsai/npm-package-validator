/** deps.dev / OpenSSF project id, e.g. `github.com/lodash/lodash`. */
export function githubProjectIdFromUrl(repository: string): string | null {
  const trimmed = repository.trim();
  if (!trimmed) return null;

  const patterns: RegExp[] = [
    /github\.com[/:]([^/\s#?]+)\/([^/\s#?]+)/i,
    /^github:([^/\s#?]+)\/([^/\s#?]+)$/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (!match) continue;
    const owner = match[1].replace(/\.git$/i, "");
    const repo = match[2].replace(/\.git$/i, "");
    if (!owner || !repo) continue;
    return `github.com/${owner}/${repo}`;
  }

  return null;
}

export function encodeDepsDevProjectId(projectId: string): string {
  return encodeURIComponent(projectId);
}
