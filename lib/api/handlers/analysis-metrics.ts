import { analyzePackageCached } from "@/lib/analysis-cache";
import { buildAnalysisResponse } from "@/lib/analysis-response";
import { jsonOk, withHandler } from "@/lib/api/http";
import {
  readJsonBody,
  requirePackageFromQuery,
  requirePackageName,
} from "@/lib/api/params";

const analyze = async (packageName: string) => {
  console.log(`Analyzing package (metrics): ${packageName}`);
  const packageData = await analyzePackageCached(packageName);
  return jsonOk(buildAnalysisResponse(packageName, packageData, null));
};

/** GET /api/v1/analysis/metrics?package= */
export const GET = withHandler(async (request) => {
  const packageName = requirePackageFromQuery(request);
  return analyze(packageName);
}, { logLabel: "analysis/metrics", fallbackMessage: "Failed to analyse package" });

/** POST /api/v1/analysis/metrics { packageName } */
export const POST = withHandler(async (request) => {
  const body = await readJsonBody(request);
  const packageName = requirePackageName(
    typeof body.packageName === "string" ? body.packageName : "",
  );
  return analyze(packageName);
}, { logLabel: "analysis/metrics", fallbackMessage: "Failed to analyse package" });
