import { NextRequest, NextResponse } from "next/server";
import {
  fetchNpmPackageCards,
  fetchNpmPackageData,
  fetchSimilarPackages,
} from "@/lib/data-fetchers/npm-registry";
import { extractPackageName, normalizeNpmPackageName, validatePackageName } from "@/lib/validation";

const FIRST_PAGE_SIZE = 6;
const MORE_PAGE_SIZE = 5;
const RELATED_POOL = 30;

type RelatedCursor = { offset: number };

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

function encodeCursor(offset: number): string {
  const payload: RelatedCursor = { offset };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(raw: string | null): number | null {
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as RelatedCursor;
    if (
      typeof parsed?.offset !== "number" ||
      !Number.isFinite(parsed.offset) ||
      parsed.offset < 0
    ) {
      return null;
    }
    return Math.floor(parsed.offset);
  } catch {
    return null;
  }
}

/**
 * GET /api/similar-packages?package=react
 * GET /api/similar-packages?package=react&keywords=react,ui&competitors=vue,svelte
 * GET /api/similar-packages?package=react&cursor=<opaque>
 *
 * First page: AI-named packages first, then ranked related (up to 6).
 * Later pages: next 5 from the ranked related list (cursor = related offset).
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
    const cursorParam = request.nextUrl.searchParams.get("cursor");
    const relatedOffset = decodeCursor(cursorParam);

    if (relatedOffset === null) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }

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
      const { data: npmData } = await fetchNpmPackageData(packageName);
      keywordList = npmData.keywords ?? null;
    }

    const isFirstPage = !cursorParam;
    const [competitorCards, related] = await Promise.all([
      isFirstPage && competitorNames.length
        ? fetchNpmPackageCards(competitorNames)
        : Promise.resolve([]),
      fetchSimilarPackages(packageName, keywordList, RELATED_POOL),
    ]);

    const competitorSet = new Set(
      competitorCards.map((pkg) => pkg.name.toLowerCase()),
    );
    const relatedOnly = related.filter(
      (pkg) => !competitorSet.has(pkg.name.toLowerCase()),
    );

    if (isFirstPage) {
      const competitors = competitorCards.map((pkg) => ({
        name: pkg.name,
        description: pkg.description,
        version: pkg.version,
      }));
      const page = [...competitors, ...relatedOnly].slice(0, FIRST_PAGE_SIZE);
      const relatedShown = page.filter(
        (pkg) => !competitorSet.has(pkg.name.toLowerCase()),
      ).length;
      const nextCursor =
        relatedShown < relatedOnly.length ? encodeCursor(relatedShown) : null;

      return NextResponse.json(
        { packages: page, nextCursor },
        { status: 200 },
      );
    }

    const page = relatedOnly.slice(
      relatedOffset,
      relatedOffset + MORE_PAGE_SIZE,
    );
    const nextOffset = relatedOffset + page.length;
    const nextCursor =
      page.length > 0 && nextOffset < relatedOnly.length
        ? encodeCursor(nextOffset)
        : null;

    return NextResponse.json(
      { packages: page, nextCursor },
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
