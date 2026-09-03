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
  const packageData = await analyzePackageCached(packageName);

  let aiAnalysis = null;
  try {
    aiAnalysis = await analyzePackageWithAI(packageData);
  } catch (error: unknown) {
    console.error("AI analysis failed:", error);
    packageData.errors = {
      ...packageData.errors,
      ai: error instanceof Error ? error.message : "AI analysis failed",
    };
  }

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
