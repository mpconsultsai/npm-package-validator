import { AppError } from "@/lib/api/errors";
import { jsonOk, withHandler } from "@/lib/api/http";
import { requirePackageFromQueryWithEcosystem } from "@/lib/api/params";
import { fetchNpmPackageData } from "@/lib/data-fetchers/npm-registry";
import { fetchPypiPackageData } from "@/lib/data-fetchers/pypi-registry";
import { listPackageDependencies } from "@/lib/package-deps";

/** GET /api/v1/packages/dependencies?package=&ecosystem= */
export const GET = withHandler(
  async (request) => {
    const { packageName, ecosystem } =
      requirePackageFromQueryWithEcosystem(request);
    try {
      if (ecosystem === "pypi") {
        const { data, pypiInstall } = await fetchPypiPackageData(packageName);
        return jsonOk({
          name: data.name || packageName,
          version: data.version,
          dependencies: pypiInstall.core,
          pypi: {
            requiresPython: pypiInstall.requiresPython,
            providesExtra: pypiInstall.providesExtra,
            core: pypiInstall.core,
            conditional: pypiInstall.conditional,
            extras: pypiInstall.extras,
          },
        });
      }

      const { data } = await fetchNpmPackageData(packageName);
      const dependencies = listPackageDependencies(
        data.dependencies,
        data.peerDependencies,
      );
      return jsonOk({
        name: data.name || packageName,
        version: data.version,
        dependencies,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load dependencies";
      throw new AppError(message, /not found/i.test(message) ? 404 : 500);
    }
  },
  {
    logLabel: "packages/dependencies",
    fallbackMessage: "Failed to load dependencies",
  },
);
