import { NextRequest, NextResponse } from "next/server";
import { fetchNpmDependentPackages } from "@/lib/data-fetchers/npm-dependents";
import { extractPackageName, validatePackageName } from "@/lib/validation";

export const maxDuration = 60;

/**
 * GET /api/package-dependents?package=chalk&page=1
 * Lists packages that depend on the given package (via ecosyste.ms).
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

    const pageParam = Number(request.nextUrl.searchParams.get("page") || "1");
    const page = Number.isFinite(pageParam) ? pageParam : 1;

    const result = await fetchNpmDependentPackages(packageName, { page });

    return NextResponse.json({
      name: packageName,
      ...result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load dependents";
    console.warn("package-dependents failed:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
