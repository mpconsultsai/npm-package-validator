import { NextRequest, NextResponse } from "next/server";
import { fetchNpmPackageData } from "@/lib/data-fetchers/npm-registry";
import { listPackageDependencies } from "@/lib/package-deps";
import { extractPackageName, validatePackageName } from "@/lib/validation";

/**
 * GET /api/package-deps?package=react
 * Direct runtime + peer dependencies for the latest published version.
 */
export async function GET(request: NextRequest) {
  try {
    const packageName = extractPackageName(
      request.nextUrl.searchParams.get("package") || "",
    );

    if (!packageName) {
      return NextResponse.json(
        { error: "Package name is required" },
        { status: 400 },
      );
    }

    const validation = validatePackageName(packageName);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { data } = await fetchNpmPackageData(packageName);
    const dependencies = listPackageDependencies(
      data.dependencies,
      data.peerDependencies,
    );

    return NextResponse.json({
      name: data.name || packageName,
      version: data.version,
      dependencies,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load dependencies";
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
