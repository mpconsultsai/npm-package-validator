import { AppError } from "@/lib/api/errors";
import { jsonOk, withHandler } from "@/lib/api/http";
import { requirePackageFromQuery } from "@/lib/api/params";
import {
  fetchNpmPackageCards,
  fetchNpmPackageData,
  fetchSimilarPackages,
} from "@/lib/data-fetchers/npm-registry";
import {
  normalizeNpmPackageName,
  validatePackageName,
} from "@/lib/validation";

const FIRST_PAGE_SIZE = 6;
const MORE_PAGE_SIZE = 5;
const RELATED_POOL = 30;

type RelatedCursor = { offset: number };

const parseNameList = (param: string | null): string[] => {
  if (!param) return [];
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of param.split(",")) {
    const name = normalizeNpmPackageName(raw);
    if (
      !name ||
      seen.has(name.toLowerCase()) ||
      !validatePackageName(name).valid
    ) {
      continue;
    }
    seen.add(name.toLowerCase());
    names.push(name);
  }
  return names;
};

const encodeCursor = (offset: number): string => {
  const payload: RelatedCursor = { offset };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
};

const decodeCursor = (raw: string | null): number | null => {
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
};

/** GET /api/v1/packages/similar?package=&keywords=&competitors=&cursor= */
export const GET = withHandler(
  async (request) => {
    const packageName = requirePackageFromQuery(request);
    const keywordsParam = request.nextUrl.searchParams.get("keywords");
    const keywords = keywordsParam
      ? keywordsParam
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
      : null;
    const competitorNames = parseNameList(
      request.nextUrl.searchParams.get("competitors"),
    ).filter((name) => name.toLowerCase() !== packageName.toLowerCase());
    const cursorParam = request.nextUrl.searchParams.get("cursor");
    const relatedOffset = decodeCursor(cursorParam);

    if (relatedOffset === null) {
      throw new AppError("Invalid cursor", 400);
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

      return jsonOk({ packages: page, nextCursor });
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

    return jsonOk({ packages: page, nextCursor });
  },
  {
    logLabel: "packages/similar",
    fallbackMessage: "Failed to fetch similar packages",
  },
);
