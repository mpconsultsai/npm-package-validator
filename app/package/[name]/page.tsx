"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import semver from "semver";
import { fetchJson, friendlyFetchError } from "@/lib/fetch-client";
import { useShellSearchLoading } from "@/components/AppShell";
import { InfoCards } from "@/components/InfoCards";
import {
  PackageInfoCard,
  MetricsCard,
  MetricsChartsCard,
  SecurityCard,
  AIAnalysisCard,
  SimilarPackagesCard,
  AnalysisTabs,
  DetailsTabs,
  type AnalysisTabId,
  type DetailsTabId,
} from "@/components/analysis";

export default function PackagePage() {
  const params = useParams();
  const nameFromPath = params.name
    ? decodeURIComponent(String(params.name))
    : "";

  return (
    <PackagePageContent key={nameFromPath} nameFromPath={nameFromPath} />
  );
}

function AIAnalysisSkeleton() {
  return (
    <div
      className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg shadow-lg p-4 sm:p-6"
      role="status"
    >
      <span className="sr-only">Generating AI analysis</span>
      <div className="space-y-4 animate-pulse" aria-hidden="true">
        <div>
          <div className="h-5 w-24 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
          <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-700 mt-2" />
          <div className="h-4 w-4/6 rounded bg-gray-200 dark:bg-gray-700 mt-2" />
        </div>
        <div>
          <div className="h-5 w-36 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
          <div className="h-9 w-32 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
        <div>
          <div className="h-5 w-28 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
          <div className="h-4 w-full rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6"
      role="status"
    >
      <span className="sr-only">Loading package metrics</span>
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-6 sm:gap-4 animate-pulse"
        aria-hidden="true"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
            <div className="h-8 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelSkeleton({ label }: { label: string }) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6"
      role="status"
    >
      <span className="sr-only">{label}</span>
      <div className="space-y-3 animate-pulse" aria-hidden="true">
        <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

function PackagePageContent({ nameFromPath }: { nameFromPath: string }) {
  const [loading, setLoading] = useState(Boolean(nameFromPath));
  const [aiLoading, setAiLoading] = useState(Boolean(nameFromPath));
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [versionToCheck, setVersionToCheck] = useState("");
  const [versionSecurityData, setVersionSecurityData] = useState<any>(null);
  const [versionSecurityLoading, setVersionSecurityLoading] = useState(false);
  const [analysisTab, setAnalysisTab] = useState<AnalysisTabId>("ai");
  const [detailsTab, setDetailsTab] = useState<DetailsTabId>("metrics");
  const [chartsOpened, setChartsOpened] = useState(false);
  const [relatedOpened, setRelatedOpened] = useState(false);
  const versionCheckRequestId = useRef(0);
  const versionCheckAbort = useRef<AbortController | null>(null);
  const analysisAbort = useRef<AbortController | null>(null);
  const aiAbort = useRef<AbortController | null>(null);
  const checkedVersionRef = useRef<string | null>(null);

  const resetSecurityCheck = () => {
    versionCheckRequestId.current += 1;
    versionCheckAbort.current?.abort();
    setVersionToCheck("");
    setVersionSecurityData(null);
    setVersionSecurityLoading(false);
    checkedVersionRef.current = null;
  };

  const loadAiAnalysis = useCallback(async (name: string, signal: AbortSignal) => {
    setAiLoading(true);
    setAiError(null);
    try {
      const { ok, data } = await fetchJson<any>(
        `/api/analyze-ai?package=${encodeURIComponent(name)}`,
        {
          signal,
          timeoutMs: 120_000,
          retries: 3,
          retryDelayMs: 2000,
        },
      );
      if (signal.aborted) return;
      if (!ok) {
        setAiError(data.error || "Failed to generate AI analysis");
        return;
      }
      setAnalysisData((prev: any) => {
        if (!prev) return data;
        return {
          ...prev,
          ...data,
          ai: data.ai,
          metrics: {
            ...prev.metrics,
            ...data.metrics,
          },
          errors: {
            ...prev.errors,
            ...data.errors,
          },
        };
      });
    } catch (err: unknown) {
      if (signal.aborted) return;
      setAiError(friendlyFetchError(err));
    } finally {
      if (!signal.aborted) setAiLoading(false);
    }
  }, []);

  const loadAnalysis = useCallback(
    async (name: string) => {
      analysisAbort.current?.abort();
      aiAbort.current?.abort();
      const controller = new AbortController();
      analysisAbort.current = controller;
      const aiController = new AbortController();
      aiAbort.current = aiController;

      setLoading(true);
      setAiLoading(true);
      setError(null);
      setAiError(null);
      setAnalysisData(null);
      setAnalysisTab("ai");
      setDetailsTab("metrics");
      setChartsOpened(false);
      setRelatedOpened(false);
      resetSecurityCheck();

      try {
        const { ok, data } = await fetchJson<any>(
          `/api/analyze?package=${encodeURIComponent(name)}`,
          {
            signal: controller.signal,
            timeoutMs: 60_000,
            retries: 4,
            retryDelayMs: 2000,
          },
        );
        if (controller.signal.aborted) return;
        if (!ok) {
          setError(data.error || "Failed to analyse package");
          setAiLoading(false);
          return;
        }

        const latest = data.packageInfo?.latestVersion;
        if (latest && latest !== "Unknown") {
          setVersionToCheck(latest);
          if (data.security) {
            setVersionSecurityData({ security: data.security });
            checkedVersionRef.current = `${name}@${latest}`;
          }
        }

        setAnalysisData(data);
        setLoading(false);

        // Metrics are ready — fetch AI in the background
        void loadAiAnalysis(name, aiController.signal);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        setError(friendlyFetchError(err));
        setAiLoading(false);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [loadAiAnalysis],
  );

  const handleAnalysisTabChange = (tab: AnalysisTabId) => {
    setAnalysisTab(tab);
  };

  const handleDetailsTabChange = (tab: DetailsTabId) => {
    if (tab === "charts") setChartsOpened(true);
    if (tab === "related") setRelatedOpened(true);
    setDetailsTab(tab);
  };

  useEffect(() => {
    return () => {
      versionCheckAbort.current?.abort();
      analysisAbort.current?.abort();
      aiAbort.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!nameFromPath) return;
    loadAnalysis(nameFromPath);
    return () => {
      analysisAbort.current?.abort();
      aiAbort.current?.abort();
    };
  }, [nameFromPath, loadAnalysis]);

  useEffect(() => {
    const name = analysisData?.packageInfo?.name;
    if (!name) return;
    const controller = new AbortController();
    fetch(
      `/api/package-charts?package=${encodeURIComponent(name)}&series=issues`,
      { signal: controller.signal },
    ).catch(() => {});
    return () => controller.abort();
  }, [analysisData?.packageInfo?.name]);

  const loadVersionSecurity = useCallback(
    async (pkgName: string, version: string, reuseLatestSecurity?: any) => {
      const cacheKey = `${pkgName}@${version}`;
      if (checkedVersionRef.current === cacheKey) {
        return;
      }

      const latest = analysisData?.packageInfo?.latestVersion;
      if (latest && version === latest && reuseLatestSecurity) {
        setVersionSecurityData({ security: reuseLatestSecurity });
        checkedVersionRef.current = cacheKey;
        setVersionSecurityLoading(false);
        return;
      }

      const requestId = ++versionCheckRequestId.current;
      versionCheckAbort.current?.abort();
      const controller = new AbortController();
      versionCheckAbort.current = controller;
      setVersionSecurityLoading(true);
      setVersionSecurityData(null);
      try {
        const { ok, data } = await fetchJson<any>(
          `/api/security-check?package=${encodeURIComponent(pkgName)}&version=${encodeURIComponent(version)}`,
          {
            signal: controller.signal,
            timeoutMs: 45_000,
            retries: 3,
          },
        );
        if (requestId !== versionCheckRequestId.current) return;
        if (!ok) throw new Error(data.error || "Failed to check security");
        setVersionSecurityData(data);
        checkedVersionRef.current = cacheKey;
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        if (requestId !== versionCheckRequestId.current) return;
        setVersionSecurityData({ error: friendlyFetchError(err) });
        checkedVersionRef.current = null;
      } finally {
        if (requestId === versionCheckRequestId.current) {
          setVersionSecurityLoading(false);
        }
      }
    },
    [analysisData?.packageInfo?.latestVersion],
  );

  useEffect(() => {
    if (analysisTab !== "security") return;
    const pkgName = analysisData?.packageInfo?.name;
    const version = versionToCheck.trim();
    if (!pkgName || !version) return;

    const latest = analysisData.packageInfo?.latestVersion;
    const canReuse =
      version === latest && analysisData.security
        ? analysisData.security
        : undefined;

    void loadVersionSecurity(pkgName, version, canReuse);
  }, [
    analysisTab,
    versionToCheck,
    analysisData?.packageInfo?.name,
    analysisData?.packageInfo?.latestVersion,
    analysisData?.security,
    loadVersionSecurity,
  ]);

  const availableVersions = analysisData?.npm?.time
    ? Object.keys(analysisData.npm.time)
        .filter((k) => !["created", "modified", "unpublished"].includes(k))
        .filter((v) => semver.valid(v) && !semver.prerelease(v))
        .sort((a, b) => semver.compare(b, a))
        .slice(0, 20)
    : [];

  // Ensure latest is in the selector list even if filtered out
  const securityVersions = (() => {
    const latest = analysisData?.packageInfo?.latestVersion;
    if (!latest || latest === "Unknown") return availableVersions;
    if (availableVersions.includes(latest)) return availableVersions;
    return [latest, ...availableVersions];
  })();

  const apisPending = loading || aiLoading;
  const showResults = apisPending || Boolean(analysisData);
  useShellSearchLoading(apisPending);

  return (
    <>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4 mb-4 sm:mb-8">
              <p className="text-red-800 dark:text-red-200">{error}</p>
              {nameFromPath && (
                <button
                  type="button"
                  onClick={() => loadAnalysis(nameFromPath)}
                  className="mt-3 text-sm font-medium text-red-800 dark:text-red-200 underline hover:no-underline"
                >
                  Try again
                </button>
              )}
            </div>
          )}

          {showResults && (
            <div className="space-y-4 sm:space-y-6 mb-4 sm:mb-8">
              <AnalysisTabs
                active={analysisTab}
                onChange={handleAnalysisTabChange}
                aiModel={analysisData?.ai?.model}
                security={analysisData?.security}
              />

              {analysisTab === "ai" && (
                <div className="space-y-4 sm:space-y-6">
                  {apisPending ? (
                    <AIAnalysisSkeleton />
                  ) : analysisData?.ai ? (
                    <AIAnalysisCard ai={analysisData.ai} />
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
                      <p className="text-gray-600 dark:text-gray-400">
                        {aiError ||
                          analysisData?.errors?.ai ||
                          "AI analysis is not available for this package."}
                      </p>
                      {aiError && nameFromPath && (
                        <button
                          type="button"
                          onClick={() => {
                            aiAbort.current?.abort();
                            const controller = new AbortController();
                            aiAbort.current = controller;
                            void loadAiAnalysis(nameFromPath, controller.signal);
                          }}
                          className="mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 underline hover:no-underline"
                        >
                          Retry AI analysis
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {analysisTab === "info" &&
                (apisPending || !analysisData?.packageInfo ? (
                  <PanelSkeleton label="Loading package info" />
                ) : (
                  <PackageInfoCard packageInfo={analysisData.packageInfo} />
                ))}

              {analysisTab === "security" &&
                (apisPending || !analysisData?.packageInfo ? (
                  <PanelSkeleton label="Loading security" />
                ) : (
                  <SecurityCard
                    packageName={analysisData.packageInfo.name}
                    latestVersion={analysisData.packageInfo.latestVersion}
                    availableVersions={securityVersions}
                    selectedVersion={versionToCheck}
                    onVersionChange={(v) => {
                      checkedVersionRef.current = null;
                      setVersionToCheck(v);
                    }}
                    securityLoading={versionSecurityLoading}
                    securityData={versionSecurityData}
                  />
                ))}

              <DetailsTabs
                active={detailsTab}
                onChange={handleDetailsTabChange}
              />

              {detailsTab === "metrics" &&
                (apisPending || !analysisData?.metrics ? (
                  <MetricsSkeleton />
                ) : (
                  <MetricsCard metrics={analysisData.metrics} />
                ))}

              {chartsOpened && analysisData?.packageInfo && !apisPending && (
                <div hidden={detailsTab !== "charts"}>
                  <MetricsChartsCard
                    packageName={analysisData.packageInfo.name}
                  />
                </div>
              )}

              {relatedOpened && !apisPending && (
                <div hidden={detailsTab !== "related"}>
                  <SimilarPackagesCard
                    packageName={analysisData.packageInfo?.name ?? nameFromPath}
                    keywords={analysisData.npm?.keywords}
                    competitors={analysisData.ai?.competitors}
                  />
                </div>
              )}
            </div>
          )}

          {!showResults && <InfoCards />}
    </>
  );
}
