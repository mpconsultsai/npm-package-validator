export type NpmDependentPackage = {
  name: string;
  description: string;
  version: string;
  downloads: number | null;
};

export type NpmDependentsPage = {
  packages: NpmDependentPackage[];
  page: number;
  perPage: number;
  hasMore: boolean;
};

const ECOSYSTEMS_BASE =
  "https://packages.ecosyste.ms/api/v1/registries/npmjs.org/packages";

const DEFAULT_PER_PAGE = 25;
const MAX_PER_PAGE = 50;

function parseLinkHasNext(linkHeader: string | null): boolean {
  if (!linkHeader) return false;
  return /rel="next"/i.test(linkHeader);
}

/**
 * Packages that declare a dependency on `packageName`, ranked by downloads.
 * Source: ecosyste.ms (npm registry has no public dependents list API).
 */
export async function fetchNpmDependentPackages(
  packageName: string,
  options: { page?: number; perPage?: number } = {},
): Promise<NpmDependentsPage> {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const perPage = Math.min(
    MAX_PER_PAGE,
    Math.max(1, Math.floor(options.perPage ?? DEFAULT_PER_PAGE)),
  );

  const url = new URL(
    `${ECOSYSTEMS_BASE}/${encodeURIComponent(packageName)}/dependent_packages`,
  );
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("sort", "downloads");
  url.searchParams.set("order", "desc");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 86_400 },
  });

  if (response.status === 404) {
    return { packages: [], page, perPage, hasMore: false };
  }

  if (!response.ok) {
    throw new Error(
      `Failed to load dependents (${response.status}). Please try again.`,
    );
  }

  const raw = (await response.json()) as unknown;
  if (!Array.isArray(raw)) {
    throw new Error("Unexpected dependents response");
  }

  const packages: NpmDependentPackage[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const status = typeof row.status === "string" ? row.status.toLowerCase() : "";
    // Match npm's dependents count more closely — skip unpublished/removed packages.
    if (status === "removed" || status === "unpublished") continue;

    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());

    const description =
      typeof row.description === "string" ? row.description.trim() : "";
    const version =
      typeof row.latest_release_number === "string"
        ? row.latest_release_number
        : "";
    const downloads =
      typeof row.downloads === "number" && Number.isFinite(row.downloads)
        ? row.downloads
        : null;

    packages.push({ name, description, version, downloads });
  }

  // Keep downloads order even after filtering removed packages.
  packages.sort((a, b) => {
    const da = a.downloads ?? -1;
    const db = b.downloads ?? -1;
    if (db !== da) return db - da;
    return a.name.localeCompare(b.name);
  });

  const hasMore =
    parseLinkHasNext(response.headers.get("link")) || raw.length >= perPage;

  return {
    packages,
    page,
    perPage,
    hasMore,
  };
}
