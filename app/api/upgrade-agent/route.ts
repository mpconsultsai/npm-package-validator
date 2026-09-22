import { NextRequest, NextResponse } from "next/server";
import { runUpgradeAgent } from "@/lib/ai/upgrade-agent";
import { parsePackageManagerPreference } from "@/lib/package-manager-pref";
import { extractPackageName, validatePackageName } from "@/lib/validation";

export const maxDuration = 60;

/**
 * POST /api/upgrade-agent
 * Body: { packageName, from, to, packageManager? }
 * Experimental LangGraph upgrade brief.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const packageName = extractPackageName(body.packageName || body.package || "");
    const from = String(body.from || "").trim();
    const to = String(body.to || "").trim();
    const packageManager = parsePackageManagerPreference(body.packageManager);

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

    if (!process.env.GROQ_API_KEY?.trim()) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured" },
        { status: 503 },
      );
    }
    if (!process.env.GROQ_UPGRADE_AGENT_MODEL?.trim()) {
      return NextResponse.json(
        { error: "GROQ_UPGRADE_AGENT_MODEL is not configured" },
        { status: 503 },
      );
    }

    const result = await runUpgradeAgent({
      packageName,
      from,
      to,
      packageManager,
    });
    return NextResponse.json({
      packageName,
      from,
      to,
      packageManager,
      ...result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Upgrade agent failed";
    console.error("upgrade-agent failed:", message);
    const status =
      /GROQ_API_KEY|GROQ_UPGRADE_AGENT_MODEL|GROQ_MODEL/i.test(message)
        ? 503
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
