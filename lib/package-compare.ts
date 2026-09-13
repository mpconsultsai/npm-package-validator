import { isConfidentRuntime } from "@/lib/runtime-environment";

export type CompareColumnStatus = "ready" | "loading" | "error";

export interface CompareColumn {
  name: string;
  status: CompareColumnStatus;
  version?: string;
  qualityScore?: number;
  vulnerabilityCount?: number;
  downloads?: number;
  bundleGzip?: number;
  lastRelease?: string | null;
  runtime?: string;
  license?: string;
  error?: string;
}

type AnalysisLike = {
  packageInfo?: {
    name?: string;
    latestVersion?: string;
    license?: string;
    lastReleaseLabel?: string | null;
    runtime?: {
      label?: string;
      kind?: "client" | "server" | "both" | "unclear";
      confidence?: "high" | "medium" | "low";
    };
  };
  metrics?: {
    qualityScore?: number;
    downloads?: number;
    bundleGzip?: number;
  };
  security?: { totalCount?: number };
};

export const snapshotFromAnalysis = (
  data: AnalysisLike | null | undefined,
  fallbackName = "",
): CompareColumn => {
  const name = data?.packageInfo?.name || fallbackName;
  const version = data?.packageInfo?.latestVersion;
  return {
    name,
    status: "ready",
    version: version && version !== "Unknown" ? version : undefined,
    qualityScore: data?.metrics?.qualityScore,
    vulnerabilityCount: data?.security?.totalCount,
    downloads: data?.metrics?.downloads,
    bundleGzip: data?.metrics?.bundleGzip,
    lastRelease: data?.packageInfo?.lastReleaseLabel ?? null,
    runtime: isConfidentRuntime(data?.packageInfo?.runtime)
      ? data?.packageInfo?.runtime?.label
      : undefined,
    license:
      data?.packageInfo?.license && data.packageInfo.license !== "Unknown"
        ? data.packageInfo.license
        : undefined,
  };
};
