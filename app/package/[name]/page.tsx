"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import semver from "semver";
import { fetchJson, friendlyFetchError } from "@/lib/fetch-client";
import { apiPaths } from "@/lib/api/paths";
import { useShellSearchLoading } from "@/components/AppShell";
import { InfoCards } from "@/components/InfoCards";
import { WatchToggle } from "@/components/Watchlist";
import { useWatchlistActions } from "@/lib/use-watchlist";
import { useAiAnalysisEnabled, useAiAnalysisPrefReady } from "@/lib/use-ai-analysis-pref";
import { getAiAnalysisEnabled } from "@/lib/ai-analysis-pref";
import type { WatchlistSummary } from "@/lib/watchlist-store";
import {
  PackageInfoCard,
  MetricsChartsCard,
  DependenciesCard,
  SecurityCard,
  AIAnalysisCard,
  SimilarPackagesCard,
  OverviewTabs,
  InsightTabs,
  PackageNameHeader,
  type OverviewTabId,
  type InsightTabId,
} from "@/components/analysis";
import { snapshotFromAnalysis } from "@/lib/package-compare";

function summaryFromAnalysis(data: any): WatchlistSummary {
  return {
    version:
      data?.packageInfo?.latestVersion &&
      data.packageInfo.latestVersion !== "Unknown"
        ? data.packageInfo.latestVersion
        : undefined,
    qualityScore: data?.metrics?.qualityScore,
    vulnerabilityCount: data?.security?.totalCount,
    deprecated: Boolean(data?.npm?.deprecated),
    recommendation: data?.ai?.recommendation,
  };
}

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
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6"
      role="status"
    >
      <span className="sr-only">Generating AI analysis</span>
      <div className="space-y-3 animate-pulse" aria-hidden="true">
        <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-11/12 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-4/5 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
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
  const aiEnabled = useAiAnalysisEnabled();
  const aiPrefReady = useAiAnalysisPrefReady();
  const [loading, setLoading] = useState(Boolean(nameFromPath));
  const [aiLoading, setAiLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [versionToCheck, setVersionToCheck] = useState("");
  const [versionSecurityData, setVersionSecurityData] = useState<any>(null);
  const [versionSecurityLoading, setVersionSecurityLoading] = useState(false);
  const [overviewTab, setOverviewTab] = useState<OverviewTabId>("info");
  const [insightTab, setInsightTab] = useState<InsightTabId>("ai");
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
        `${apiPaths.analysis.ai}?package=${encodeURIComponent(name)}`,
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
      const ai = data.ai;
      const softFail =
        !ai ||
        (typeof ai.summary === "string" &&
          ai.summary.startsWith("Unable to generate AI analysis"));
      if (softFail) {
        setAiError("Failed to generate AI analysis");
        setAnalysisData((prev: any) => {
          if (!prev) return { ...data, ai: undefined };
          return {
            ...prev,
            ...data,
            ai: undefined,
            metrics: {
              ...prev.metrics,
              ...data.metrics,
            },
            errors: {
              ...prev.errors,
              ...data.errors,
              ai: "Failed to generate AI analysis",
            },
          };
        });
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
    async (name: string, withAi: boolean) => {
      analysisAbort.current?.abort();
      aiAbort.current?.abort();
      const controller = new AbortController();
      analysisAbort.current = controller;
      const aiController = new AbortController();
      aiAbort.current = aiController;

      setLoading(true);
      setAiLoading(withAi);
      setError(null);
      setAiError(null);
      setAnalysisData(null);
      setOverviewTab("info");
      setInsightTab(withAi ? "ai" : "security");
      setChartsOpened(false);
      setRelatedOpened(false);
      resetSecurityCheck();

      // Start AI in parallel with metrics so the LLM is not blocked on analyze.
      if (withAi) {
        void loadAiAnalysis(name, aiController.signal);
      } else {
        setAiLoading(false);
      }

      try {
        const { ok, data } = await fetchJson<any>(
          `${apiPaths.analysis.metrics}?package=${encodeURIComponent(name)}`,
          {
            signal: controller.signal,
            timeoutMs: 60_000,
            retries: 4,
            retryDelayMs: 2000,
          },
        );
        if (controller.signal.aborted) return;
        if (!ok) {
          aiController.abort();
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

        // Preserve AI if it finished first (race with parallel analyze-ai).
        setAnalysisData((prev: any) => {
          if (prev?.ai && !data.ai) {
            return {
              ...data,
              ai: prev.ai,
              errors: {
                ...data.errors,
                ...prev.errors,
              },
            };
          }
          return data;
        });
        setLoading(false);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        aiController.abort();
        setError(friendlyFetchError(err));
        setAiLoading(false);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [loadAiAnalysis],
  );

  const handleOverviewTabChange = (tab: OverviewTabId) => {
    if (tab === "charts") setChartsOpened(true);
    setOverviewTab(tab);
  };

  const handleInsightTabChange = (tab: InsightTabId) => {
    if (tab === "related") setRelatedOpened(true);
    setInsightTab(tab);
  };

  useEffect(() => {
    return () => {
      versionCheckAbort.current?.abort();
      analysisAbort.current?.abort();
      aiAbort.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!aiPrefReady || !nameFromPath) return;
    loadAnalysis(nameFromPath, getAiAnalysisEnabled());
    return () => {
      analysisAbort.current?.abort();
      aiAbort.current?.abort();
    };
  }, [aiPrefReady, nameFromPath, loadAnalysis]);

  useEffect(() => {
    if (!aiPrefReady) return;

    if (!aiEnabled) {
      aiAbort.current?.abort();
      setAiLoading(false);
      setAiError(null);
      setInsightTab((tab) => (tab === "ai" ? "security" : tab));
      return;
    }

    if (
      !nameFromPath ||
      loading ||
      !analysisData ||
      analysisData.ai ||
      aiLoading ||
      aiError
    ) {
      return;
    }

    const controller = new AbortController();
    aiAbort.current = controller;
    void loadAiAnalysis(nameFromPath, controller.signal);
    // Do not abort in cleanup when deps like aiLoading change — that was
    // cancelling the request and leaving aiLoading stuck true.
  }, [
    aiPrefReady,
    aiEnabled,
    nameFromPath,
    analysisData,
    loading,
    aiLoading,
    aiError,
    loadAiAnalysis,
  ]);

  useEffect(() => {
    const name = analysisData?.packageInfo?.name;
    if (!name) return;
    const controller = new AbortController();
    fetch(
      `${apiPaths.packages.charts}?package=${encodeURIComponent(name)}&series=issues`,
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
          `${apiPaths.packages.security}?package=${encodeURIComponent(pkgName)}&version=${encodeURIComponent(version)}`,
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
    if (insightTab !== "security") return;
    const pkgName = analysisData?.packageInfo?.name;
    const version = versionToCheck.trim();
    if (!pkgName || !version) return;

    const time = analysisData?.npm?.time as Record<string, string> | undefined;
    const published =
      Boolean(time?.[version]) &&
      !["created", "modified", "unpublished"].includes(version);
    if (time && !published) {
      setVersionSecurityData({ error: "Version not found" });
      setVersionSecurityLoading(false);
      return;
    }

    const latest = analysisData.packageInfo?.latestVersion;
    const canReuse =
      version === latest && analysisData.security
        ? analysisData.security
        : undefined;

    void loadVersionSecurity(pkgName, version, canReuse);
  }, [
    insightTab,
    versionToCheck,
    analysisData?.packageInfo?.name,
    analysisData?.packageInfo?.latestVersion,
    analysisData?.security,
    analysisData?.npm?.time,
    loadVersionSecurity,
  ]);

  const availableVersions = analysisData?.npm?.time
    ? Object.keys(analysisData.npm.time)
        .filter((k) => !["created", "modified", "unpublished"].includes(k))
        .filter((v) => semver.valid(v) && !semver.prerelease(v))
        .sort((a, b) => semver.compare(b, a))
        .slice(0, 10)
    : [];

  // Ensure latest is in the selector list even if filtered out
  const securityVersions = (() => {
    const latest = analysisData?.packageInfo?.latestVersion;
    if (!latest || latest === "Unknown") return availableVersions;
    if (availableVersions.includes(latest)) return availableVersions;
    return [latest, ...availableVersions];
  })();

  const apisPending =
    !aiPrefReady || loading || (aiEnabled && aiLoading);
  const showResults = apisPending || Boolean(analysisData);
  useShellSearchLoading(apisPending);
  const { updateSummary } = useWatchlistActions();

  const packageDisplayName =
    analysisData?.packageInfo?.name ?? nameFromPath;
  const watchSummary = analysisData
    ? summaryFromAnalysis(analysisData)
    : undefined;

  useEffect(() => {
    if (!packageDisplayName || !analysisData || apisPending) return;
    updateSummary(packageDisplayName, summaryFromAnalysis(analysisData));
  }, [packageDisplayName, analysisData, apisPending, updateSummary]);

  return (
    <>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4 mb-4 sm:mb-8">
              <p className="text-red-800 dark:text-red-200">{error}</p>
              {nameFromPath && (
                <button
                  type="button"
                  onClick={() => loadAnalysis(nameFromPath, aiEnabled)}
                  className="mt-3 text-sm font-medium text-red-800 dark:text-red-200 underline hover:no-underline"
                >
                  Try again
                </button>
              )}
            </div>
          )}

          {showResults && (
            <div className="space-y-4 sm:space-y-6 mb-4 sm:mb-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <PackageNameHeader
                  packageName={
                    analysisData?.packageInfo?.name ?? packageDisplayName
                  }
                  homepage={analysisData?.packageInfo?.homepage}
                />
                <div className="hidden sm:block shrink-0">
                  <WatchToggle
                    packageName={packageDisplayName}
                    summary={watchSummary}
                    disabled={!packageDisplayName}
                  />
                </div>
              </div>

              <OverviewTabs
                active={overviewTab}
                onChange={handleOverviewTabChange}
              />

              {overviewTab === "info" &&
                (loading || !analysisData?.packageInfo ? (
                  <PanelSkeleton label="Loading package info" />
                ) : (
                  <PackageInfoCard
                    packageInfo={analysisData.packageInfo}
                    metrics={analysisData.metrics}
                    metricsLoading={loading || !analysisData.metrics}
                    versionTimes={analysisData.npm?.time}
                    latestSecurity={analysisData.security}
                  />
                ))}

              {chartsOpened && analysisData?.packageInfo && !loading && (
                <div hidden={overviewTab !== "charts"}>
                  <MetricsChartsCard
                    packageName={analysisData.packageInfo.name}
                    versionTimes={analysisData.npm?.time}
                    keywords={analysisData.npm?.keywords}
                    competitors={
                      aiEnabled ? analysisData.ai?.competitors : undefined
                    }
                  />
                </div>
              )}

              {overviewTab === "dependencies" &&
                (loading || !analysisData?.packageInfo ? (
                  <PanelSkeleton label="Loading dependencies" />
                ) : (
                  <DependenciesCard
                    packageName={analysisData.packageInfo.name}
                  />
                ))}

              <div
                className="border-t border-gray-200 dark:border-gray-700"
                role="separator"
                aria-hidden="true"
              />

              <InsightTabs
                active={insightTab}
                onChange={handleInsightTabChange}
                aiModel={analysisData?.ai?.model}
                security={analysisData?.security}
                showAi={aiPrefReady && aiEnabled}
              />

              {aiPrefReady && aiEnabled && insightTab === "ai" && (
                <div className="space-y-4 sm:space-y-6">
                  {apisPending ? (
                    <AIAnalysisSkeleton />
                  ) : analysisData?.ai ? (
                    <AIAnalysisCard ai={analysisData.ai} />
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
                      <p className="text-gray-600 dark:text-gray-400">
                        AI analysis could not be completed. Please try again.
                      </p>
                      {nameFromPath && (
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
                          Try again
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {insightTab === "security" &&
                (loading || !analysisData?.packageInfo ? (
                  <PanelSkeleton label="Loading security" />
                ) : (
                  <SecurityCard
                    packageName={analysisData.packageInfo.name}
                    latestVersion={analysisData.packageInfo.latestVersion}
                    availableVersions={securityVersions}
                    versionTimes={analysisData.npm?.time}
                    selectedVersion={versionToCheck}
                    onVersionChange={(v) => {
                      checkedVersionRef.current = null;
                      setVersionToCheck(v);
                    }}
                    securityLoading={versionSecurityLoading}
                    securityData={versionSecurityData}
                  />
                ))}

              {relatedOpened &&
                insightTab === "related" &&
                aiEnabled &&
                aiLoading && <PanelSkeleton label="Loading related packages" />}

              {relatedOpened &&
                insightTab === "related" &&
                !loading &&
                !(aiEnabled && aiLoading) && (
                  <SimilarPackagesCard
                    packageName={analysisData.packageInfo?.name ?? nameFromPath}
                    keywords={analysisData.npm?.keywords}
                    competitors={
                      aiEnabled ? analysisData.ai?.competitors : undefined
                    }
                    current={snapshotFromAnalysis(
                      analysisData,
                      analysisData.packageInfo?.name ?? nameFromPath,
                    )}
                  />
                )}
            </div>
          )}

          {!showResults && <InfoCards />}
    </>
  );
}
