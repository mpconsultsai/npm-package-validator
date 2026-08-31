import { NextRequest, NextResponse } from "next/server";
import { extractPackageName, validatePackageName } from "@/lib/validation";
import { fetchNpmPackageData, fetchNpmDownloadTrends, toWeeklyDownloads } from "@/lib/data-fetchers/npm-registry";
import {
  parseGitHubUrl,
  fetchOpenIssuesByMonth,
} from "@/lib/data-fetchers/github";

export const maxDuration = 20;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise.finally(() => {
      if (timer) clearTimeout(timer);
    }),
    new Promise<T>((resolve) => {
      timer = setTimeout(() => resolve(fallback), ms);
    }),
  ]);
}

export async function GET(request: NextRequest) {
  try {
    const packageName = extractPackageName(
      request.nextUrl.searchParams.get("package") || "",
    );
    const series = request.nextUrl.searchParams.get("series");

    if (!packageName) {
      return NextResponse.json(
        { error: "Package name is required" },
        { status: 400 },
      );
    }

    const validation = validatePackageName(packageName);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 },
      );
    }

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
        .then((npm) => {
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

    return NextResponse.json({ downloads, issues });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load charts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
