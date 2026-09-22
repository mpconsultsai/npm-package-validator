import { jsonOk, withHandler } from "@/lib/api/http";
import { requirePackageFromQuery } from "@/lib/api/params";
import {
  fetchNpmDownloadTrends,
  fetchNpmPackageData,
  toWeeklyDownloads,
} from "@/lib/data-fetchers/npm-registry";
import {
  fetchOpenIssuesByMonth,
  parseGitHubUrl,
} from "@/lib/data-fetchers/github";

const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise.finally(() => {
      if (timer) clearTimeout(timer);
    }),
    new Promise<T>((resolve) => {
      timer = setTimeout(() => resolve(fallback), ms);
    }),
  ]);
};

/** GET /api/v1/packages/charts?package=&series= */
export const GET = withHandler(
  async (request) => {
    const packageName = requirePackageFromQuery(request);
    const series = request.nextUrl.searchParams.get("series");

    const wantDownloads = series !== "issues";
    const wantIssues = series !== "downloads";

    const downloadsPromise = wantDownloads
      ? fetchNpmDownloadTrends(packageName)
          .then((data) => toWeeklyDownloads(data.downloads || []))
          .catch(() => [])
      : Promise.resolve([]);

    let issuesPromise: Promise<{ date: string; value: number }[]> =
      Promise.resolve([]);

    if (wantIssues) {
      issuesPromise = fetchNpmPackageData(packageName)
        .then(({ data: npm }) => {
          const githubInfo = npm.repository?.url
            ? parseGitHubUrl(npm.repository.url)
            : null;
          if (!githubInfo) return [];
          return withTimeout(
            fetchOpenIssuesByMonth(githubInfo.owner, githubInfo.repo).catch(
              () => [],
            ),
            8000,
            [],
          );
        })
        .catch(() => []);
    }

    const [downloads, issues] = await Promise.all([
      downloadsPromise,
      issuesPromise,
    ]);

    return jsonOk({ downloads, issues });
  },
  { logLabel: "packages/charts", fallbackMessage: "Failed to load charts" },
);
