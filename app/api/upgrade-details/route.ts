import { NextRequest, NextResponse } from "next/server";
import { extractPackageName, validatePackageName } from "@/lib/validation";
import { loadUpgradeDetails } from "@/lib/upgrade-details";

/**
 * GET /api/upgrade-details?package=next&from=14.0.0&to=15.1.0
 * Breaking-change notes from GitHub releases / CHANGELOG + peerDependency diff.
 */
export async function GET(request: NextRequest) {
  try {
    const packageName = extractPackageName(
      request.nextUrl.searchParams.get("package") || "",
    );
    const from = (request.nextUrl.searchParams.get("from") || "").trim();
    const to = (request.nextUrl.searchParams.get("to") || "").trim();

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
    if (!from || !to) {
      return NextResponse.json(
        { error: "Both from and to versions are required" },
        { status: 400 },
      );
    }

    const details = await loadUpgradeDetails(packageName, from, to);
    return NextResponse.json(details);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load upgrade details";
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
