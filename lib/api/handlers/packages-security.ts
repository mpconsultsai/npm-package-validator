import { checkPackageSecurity } from "@/lib/data-fetchers/security";
import { jsonOk, withHandler } from "@/lib/api/http";
import {
  readJsonBody,
  requirePackageFromQuery,
  requirePackageName,
  requireVersion,
} from "@/lib/api/params";

const securityCheck = async (packageName: string, version: string) => {
  const security = await checkPackageSecurity(packageName, version);
  return jsonOk({ packageName, version, security });
};

/** GET /api/v1/packages/security?package=&version= */
export const GET = withHandler(
  async (request) => {
    const packageName = requirePackageFromQuery(request);
    const version = requireVersion(
      request.nextUrl.searchParams.get("version"),
      "Version is required. Use ?version=1.0.0",
    );
    return securityCheck(packageName, version);
  },
  {
    logLabel: "packages/security",
    fallbackMessage: "Failed to check package security",
  },
);

/** POST /api/v1/packages/security { packageName, version } */
export const POST = withHandler(
  async (request) => {
    const body = await readJsonBody(request);
    const packageName = requirePackageName(
      typeof body.packageName === "string" ? body.packageName : "",
      "packageName is required",
    );
    const version = requireVersion(
      typeof body.version === "string" || typeof body.version === "number"
        ? String(body.version)
        : "",
      "version is required",
    );
    return securityCheck(packageName, version);
  },
  {
    logLabel: "packages/security",
    fallbackMessage: "Failed to check package security",
  },
);
