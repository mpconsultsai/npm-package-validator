import { AppError } from "@/lib/api/errors";
import { jsonOk, withHandler } from "@/lib/api/http";
import { requirePackageFromQuery, requireVersion } from "@/lib/api/params";
import { fetchTransitiveDependencyGraph } from "@/lib/data-fetchers/deps-dev";
import { fetchNpmPackageData } from "@/lib/data-fetchers/npm-registry";

/** GET /api/v1/packages/dependencies/graph?package=&version= */
export const GET = withHandler(
  async (request) => {
    const packageName = requirePackageFromQuery(request);
    const versionParam = request.nextUrl.searchParams.get("version")?.trim();

    let version = versionParam;
    if (!version) {
      try {
        const { data } = await fetchNpmPackageData(packageName);
        version = data.version;
      } catch {
        throw new AppError("Could not resolve package version", 404);
      }
    } else {
      requireVersion(version);
    }

    if (!version) {
      throw new AppError("Version is required", 400);
    }

    try {
      const graph = await fetchTransitiveDependencyGraph(packageName, version);
      return jsonOk(graph);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load dependency graph";
      throw new AppError(message, 502);
    }
  },
  {
    logLabel: "packages/dependencies/graph",
    fallbackMessage: "Failed to load transitive dependency graph",
  },
);
