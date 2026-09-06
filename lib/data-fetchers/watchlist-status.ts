import axios from "axios";
import { checkPackageSecurity } from "./security";

const NPM_REGISTRY_URL = "https://registry.npmjs.org";

export interface WatchlistPackageStatus {
  name: string;
  version: string;
  vulnerabilityCount: number;
  deprecated: boolean;
}

async function fetchLatestMeta(
  packageName: string,
): Promise<{ version: string; deprecated: boolean } | null> {
  try {
    const response = await axios.get(
      `${NPM_REGISTRY_URL}/${encodeURIComponent(packageName)}/latest`,
      {
        timeout: 5000,
        validateStatus: (status) => status === 200 || status === 404,
      },
    );
    if (response.status === 404) return null;
    return {
      version: typeof response.data?.version === "string" ? response.data.version : "",
      deprecated: Boolean(response.data?.deprecated),
    };
  } catch {
    return null;
  }
}

export async function fetchWatchlistPackageStatus(
  packageName: string,
): Promise<WatchlistPackageStatus | null> {
  const meta = await fetchLatestMeta(packageName);
  if (!meta?.version) return null;

  let vulnerabilityCount = 0;
  try {
    const security = await checkPackageSecurity(packageName, meta.version);
    vulnerabilityCount = security.totalCount;
  } catch {
    // Keep version/deprecation even if advisories fail
  }

  return {
    name: packageName,
    version: meta.version,
    vulnerabilityCount,
    deprecated: meta.deprecated,
  };
}

/** Run async work with a concurrency cap. */
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function run() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  }

  const runners = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => run(),
  );
  await Promise.all(runners);
  return results;
}
