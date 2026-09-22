import { analyzePackageCached } from "@/lib/analysis-cache";
import { buildAnalysisResponse } from "@/lib/analysis-response";
import { analyzePackageWithAI } from "@/lib/ai/analyzer";
import { jsonOk, withHandler } from "@/lib/api/http";
import {
  readJsonBody,
  requirePackageFromQuery,
  requirePackageName,
} from "@/lib/api/params";

const analyzeAi = async (packageName: string) => {
  console.log(`Analyzing package with AI: ${packageName}`);
  const t0 = Date.now();
  const packageData = await analyzePackageCached(packageName);
  const dataMs = Date.now() - t0;

  let aiAnalysis = null;
  let llmMs = 0;
  try {
    const t1 = Date.now();
    aiAnalysis = await analyzePackageWithAI(packageData);
    llmMs = Date.now() - t1;
  } catch (error: unknown) {
    console.error("AI analysis failed:", error);
    packageData.errors = {
      ...packageData.errors,
      ai: error instanceof Error ? error.message : "AI analysis failed",
    };
  }

  const totalMs = Date.now() - t0;
  console.log(
    `AI timing ${packageName}: dataMs=${dataMs} llmMs=${llmMs} provider=${aiAnalysis?.model ?? "none"} totalMs=${totalMs}`,
  );

  return jsonOk(buildAnalysisResponse(packageName, packageData, aiAnalysis));
};

/** GET /api/v1/analysis/ai?package= */
export const GET = withHandler(
  async (request) => {
    const packageName = requirePackageFromQuery(request);
    return analyzeAi(packageName);
  },
  {
    logLabel: "analysis/ai",
    fallbackMessage: "Failed to analyse package",
  },
);

/** POST /api/v1/analysis/ai { packageName } */
export const POST = withHandler(
  async (request) => {
    const body = await readJsonBody(request);
    const packageName = requirePackageName(
      typeof body.packageName === "string" ? body.packageName : "",
    );
    return analyzeAi(packageName);
  },
  {
    logLabel: "analysis/ai",
    fallbackMessage: "Failed to analyse package",
  },
);
