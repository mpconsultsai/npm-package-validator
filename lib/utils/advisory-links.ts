/**
 * Snyk package vulnerability page.
 * Scoped names must be a single encoded segment: `@angular/core` → `%40angular%2Fcore`.
 * Do not encode only `@` and leave `/` — that 404s.
 */
export function snykPackageUrl(packageName: string, version?: string): string {
  const pkg = encodeURIComponent(packageName);
  const base = `https://security.snyk.io/package/npm/${pkg}`;
  return version ? `${base}/${encodeURIComponent(version)}` : base;
}

