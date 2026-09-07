import { NextRequest, NextResponse } from "next/server";
import { analyzePackageCached } from "@/lib/analysis-cache";
import { buildAnalysisResponse } from "@/lib/analysis-response";
import { analyzePackageWithAI } from "@/lib/ai/analyzer";
import { validatePackageName, extractPackageName } from "@/lib/validation";

async function handleAnalyzeAi(packageName: string) {
  const validation = validatePackageName(packageName);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

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

  return NextResponse.json(
    buildAnalysisResponse(packageName, packageData, aiAnalysis),
    { status: 200 },
  );
}

export async function GET(request: NextRequest) {
  try {
    const packageName = extractPackageName(
      request.nextUrl.searchParams.get("package") || "",
    );

    if (!packageName) {
      return NextResponse.json(
        { error: "Package name is required. Use ?package=package-name" },
        { status: 400 },
      );
    }

    return await handleAnalyzeAi(packageName);
  } catch (error: unknown) {
    console.error("Error analyzing package:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to analyse package",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const packageName = extractPackageName(body.packageName || "");

    if (!packageName) {
      return NextResponse.json(
        { error: "Package name is required" },
        { status: 400 },
      );
    }

    return await handleAnalyzeAi(packageName);
  } catch (error: unknown) {
    console.error("Error analyzing package:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to analyse package",
      },
      { status: 500 },
    );
  }
}
