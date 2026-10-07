export type PackageEcosystem = "npm" | "pypi";

export function packagePagePath(
  ecosystem: PackageEcosystem,
  name: string,
): string {
  const trimmed = name.trim();
  return `/${ecosystem}/${encodeURIComponent(trimmed)}`;
}

export function parsePackageRoute(pathname: string): {
  ecosystem: PackageEcosystem;
  name: string;
} | null {
  for (const ecosystem of ["npm", "pypi"] as const) {
    const prefix = `/${ecosystem}/`;
    if (!pathname.startsWith(prefix)) continue;
    const segment = pathname.slice(prefix.length).split("/")[0] ?? "";
    if (!segment) return null;
    try {
      return { ecosystem, name: decodeURIComponent(segment) };
    } catch {
      return { ecosystem, name: segment };
    }
  }
  if (pathname.startsWith("/package/")) {
    const segment = pathname.slice("/package/".length).split("/")[0] ?? "";
    if (!segment) return null;
    try {
      return { ecosystem: "npm", name: decodeURIComponent(segment) };
    } catch {
      return { ecosystem: "npm", name: segment };
    }
  }
  return null;
}

export function watchlistEntryKey(
  ecosystem: PackageEcosystem,
  name: string,
): string {
  return `${ecosystem}:${name.toLowerCase()}`;
}
