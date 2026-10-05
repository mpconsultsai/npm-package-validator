import { AppError } from "@/lib/api/errors";
import { jsonOk, withHandler } from "@/lib/api/http";
import {
  fetchOpenSSFScorecard,
  resolveGithubProjectId,
} from "@/lib/data-fetchers/openssf-scorecard";
import { fetchNpmPackageData } from "@/lib/data-fetchers/npm-registry";

/** GET /api/v1/packages/scorecard?package=&repository= */
export const GET = withHandler(
  async (request) => {
    const packageName = request.nextUrl.searchParams.get("package")?.trim();
    const repositoryParam = request.nextUrl.searchParams.get("repository")?.trim();

    if (!packageName && !repositoryParam) {
      throw new AppError("package or repository query parameter is required", 400);
    }

    let projectId = repositoryParam
      ? resolveGithubProjectId(repositoryParam)
      : null;

    if (!projectId && packageName) {
      try {
        const { data } = await fetchNpmPackageData(packageName);
        projectId = resolveGithubProjectId(data.repository?.url);
      } catch {
        throw new AppError("Could not resolve package repository", 404);
      }
    }

    if (!projectId) {
      throw new AppError(
        "No GitHub repository linked to this package",
        404,
      );
    }

    try {
      const scorecard = await fetchOpenSSFScorecard(projectId);
      return jsonOk(scorecard);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load scorecard";
      throw new AppError(message, 502);
    }
  },
  {
    logLabel: "packages/scorecard",
    fallbackMessage: "Failed to load OpenSSF Scorecard",
  },
);
