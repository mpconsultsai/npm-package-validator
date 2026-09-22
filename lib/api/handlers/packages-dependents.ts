import { AppError } from "@/lib/api/errors";
import { jsonOk, withHandler } from "@/lib/api/http";
import { requirePackageFromQuery } from "@/lib/api/params";
import { fetchNpmDependentPackages } from "@/lib/data-fetchers/npm-dependents";

/** GET /api/v1/packages/dependents?package=&page= */
export const GET = withHandler(
  async (request) => {
    const packageName = requirePackageFromQuery(request);
    const pageParam = Number(request.nextUrl.searchParams.get("page") || "1");
    const page = Number.isFinite(pageParam) ? pageParam : 1;

    try {
      const result = await fetchNpmDependentPackages(packageName, { page });
      return jsonOk({
        name: packageName,
        ...result,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load dependents";
      console.warn("packages/dependents failed:", message);
      throw new AppError(message, 502);
    }
  },
  {
    logLabel: "packages/dependents",
    fallbackMessage: "Failed to load dependents",
  },
);
