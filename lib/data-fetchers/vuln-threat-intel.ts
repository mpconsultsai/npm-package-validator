import type { SecurityVulnerability } from "@/lib/data-fetchers/security";

const EPSS_URL = "https://api.first.org/data/v1/epss";
const KEV_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const OSV_VULN_URL = "https://api.osv.dev/v1/vulns";

const KEV_CACHE_MS = 6 * 60 * 60 * 1000;
const OSV_CACHE_MS = 24 * 60 * 60 * 1000;

type EpssRow = {
  cve: string;
  epss: string;
  percentile: string;
};

let kevCache: { expires: number; cves: Set<string> } | null = null;
const osvCveCache = new Map<string, { expires: number; cve: string | null }>();

const CVE_RE = /CVE-\d{4}-\d+/gi;

export function extractCveIds(text: string): string[] {
  const matches = text.match(CVE_RE);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.toUpperCase()))];
}

async function loadKevCves(): Promise<Set<string>> {
  const now = Date.now();
  if (kevCache && kevCache.expires > now) {
    return kevCache.cves;
  }

  try {
    const response = await fetch(KEV_URL, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error(`KEV feed ${response.status}`);
    const payload = (await response.json()) as {
      vulnerabilities?: { cveID?: string }[];
    };
    const cves = new Set<string>();
    for (const entry of payload.vulnerabilities ?? []) {
      const id = entry.cveID?.trim().toUpperCase();
      if (id) cves.add(id);
    }
    kevCache = { expires: now + KEV_CACHE_MS, cves };
    return cves;
  } catch (error) {
    console.warn("CISA KEV feed unavailable:", error);
    return kevCache?.cves ?? new Set();
  }
}

async function resolveCveFromOsv(ghsaId: string): Promise<string | null> {
  const key = ghsaId.toUpperCase();
  const cached = osvCveCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.cve;
  }

  try {
    const response = await fetch(`${OSV_VULN_URL}/${encodeURIComponent(key)}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      osvCveCache.set(key, { expires: Date.now() + OSV_CACHE_MS, cve: null });
      return null;
    }
    const payload = (await response.json()) as {
      aliases?: string[];
      id?: string;
    };
    const aliases = payload.aliases ?? [];
    const cve =
      aliases.find((a) => /^CVE-\d{4}-\d+$/i.test(a))?.toUpperCase() ??
      (payload.id && /^CVE-\d{4}-\d+$/i.test(payload.id)
        ? payload.id.toUpperCase()
        : null);
    osvCveCache.set(key, { expires: Date.now() + OSV_CACHE_MS, cve });
    return cve;
  } catch {
    osvCveCache.set(key, { expires: Date.now() + OSV_CACHE_MS, cve: null });
    return null;
  }
}

async function fetchEpssScores(
  cveIds: string[],
): Promise<Map<string, { score: number; percentile: number }>> {
  const unique = [...new Set(cveIds.map((c) => c.toUpperCase()))].filter(Boolean);
  const out = new Map<string, { score: number; percentile: number }>();
  if (unique.length === 0) return out;

  const chunkSize = 50;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const params = new URLSearchParams({ cve: chunk.join(",") });
    try {
      const response = await fetch(`${EPSS_URL}?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) continue;
      const payload = (await response.json()) as { data?: EpssRow[] };
      for (const row of payload.data ?? []) {
        const cve = row.cve?.toUpperCase();
        if (!cve) continue;
        const score = Number.parseFloat(row.epss);
        const percentile = Number.parseFloat(row.percentile);
        if (!Number.isFinite(score)) continue;
        out.set(cve, {
          score,
          percentile: Number.isFinite(percentile) ? percentile : 0,
        });
      }
    } catch (error) {
      console.warn("EPSS lookup failed:", error);
    }
  }

  return out;
}

function osvUrlForVuln(vuln: SecurityVulnerability): string {
  const id =
    vuln.id.startsWith("GHSA-") ? vuln.id : vuln.cveId || vuln.id;
  return `https://osv.dev/vulnerability/${encodeURIComponent(id)}`;
}

/**
 * Attach CVE (GitHub → OSV fallback), CISA KEV flag, and EPSS scores.
 */
export async function enrichSecurityThreatIntel(
  vulnerabilities: SecurityVulnerability[],
): Promise<SecurityVulnerability[]> {
  if (vulnerabilities.length === 0) return vulnerabilities;

  const kev = await loadKevCves();

  const withCve = await Promise.all(
    vulnerabilities.map(async (vuln) => {
      let cveId: string | null =
        vuln.cveId?.toUpperCase() ??
        extractCveIds(`${vuln.id} ${vuln.title} ${vuln.description}`)[0] ??
        null;

      if (!cveId && vuln.id.startsWith("GHSA-")) {
        cveId = await resolveCveFromOsv(vuln.id);
      }

      return {
        ...vuln,
        cveId: cveId ?? undefined,
        osvUrl: osvUrlForVuln({ ...vuln, cveId: cveId ?? undefined }),
      };
    }),
  );

  const epss = await fetchEpssScores(
    withCve.map((v) => v.cveId).filter(Boolean) as string[],
  );

  return withCve.map((vuln) => {
    const cveId = vuln.cveId?.toUpperCase();
    const epssRow = cveId ? epss.get(cveId) : undefined;
    return {
      ...vuln,
      knownExploited: cveId ? kev.has(cveId) : false,
      epssScore: epssRow?.score,
      epssPercentile: epssRow?.percentile,
    };
  });
}
