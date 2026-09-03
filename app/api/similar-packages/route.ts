import { NextRequest, NextResponse } from "next/server";
import {
  fetchNpmPackageCards,
  fetchNpmPackageData,
  fetchSimilarPackages,
} from "@/lib/data-fetchers/npm-registry";
import { extractPackageName, normalizeNpmPackageName, validatePackageName } from "@/lib/validation";

const RELATED_LIMIT = 6;

function parseNameList(param: string | null): string[] {
  if (!param) return [];
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of param.split(",")) {
    const name = normalizeNpmPackageName(raw);
    if (!name || seen.has(name.toLowerCase()) || !validatePackageName(name).valid) {
      continue;
    }
    seen.add(name.toLowerCase());
    names.push(name);
  }
  return names;
}

/**
 * GET /api/similar-packages?package=react
 * GET /api/similar-packages?package=react&keywords=react,ui&competitors=vue,svelte
 * AI-named competitors first, then npm related matches.
 */
export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get("package") || "";
    const packageName = extractPackageName(raw);
    const keywordsParam = request.nextUrl.searchParams.get("keywords");
    const keywords = keywordsParam
      ? keywordsParam.split(",").map((k) => k.trim()).filter(Boolean)
      : null;
    const competitorNames = parseNameList(
      request.nextUrl.searchParams.get("competitors"),
    ).filter((name) => name.toLowerCase() !== packageName.toLowerCase());

    if (!packageName) {
      return NextResponse.json(
        { error: "Package name is required" },
        { status: 400 },
      );
    }

    const validation = validatePackageName(packageName);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 },
      );
    }

    let keywordList = keywords;
    if (!keywordList?.length) {
      const npmData = await fetchNpmPackageData(packageName);
      keywordList = npmData.keywords ?? null;
    }

    const [competitorCards, related] = await Promise.all([
      competitorNames.length
        ? fetchNpmPackageCards(competitorNames)
        : Promise.resolve([]),
      fetchSimilarPackages(packageName, keywordList, RELATED_LIMIT),
    ]);

    const competitors = competitorCards.map((pkg) => ({
      name: pkg.name,
      description: pkg.description,
      version: pkg.version,
      competitor: true as const,
    }));

    const seen = new Set(competitors.map((pkg) => pkg.name.toLowerCase()));
    const rest = related
      .filter((pkg) => !seen.has(pkg.name.toLowerCase()))
      .map((pkg) => ({ ...pkg, competitor: false as const }));

    return NextResponse.json(
      { packages: [...competitors, ...rest].slice(0, RELATED_LIMIT) },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Similar packages error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch similar packages" },
      { status: 500 },
    );
  }
}
