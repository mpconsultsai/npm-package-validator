"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import semver from "semver";
import { extractPackageName } from "@/lib/validation";
import { PageHeader } from "@/components/PageHeader";
import { PackageSearchForm } from "@/components/PackageSearchForm";
import { InfoCards } from "@/components/InfoCards";
import {
  PackageInfoCard,
  MetricsCard,
  MetricsChartsCard,
  SecurityVulnerabilitiesCard,
  VersionCheckCard,
  AIAnalysisCard,
  SimilarPackagesCard,
  AnalysisTabs,
  OverviewTabs,
  type AnalysisTabId,
  type OverviewTabId,
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

function PackagePageContent({ nameFromPath }: { nameFromPath: string }) {
  const router = useRouter();
  const [packageName, setPackageName] = useState(nameFromPath);
  const [loading, setLoading] = useState(Boolean(nameFromPath));
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [securityFilter, setSecurityFilter] = useState<string | null>(null);
  const [versionToCheck, setVersionToCheck] = useState("");
  const [versionSecurityData, setVersionSecurityData] = useState<any>(null);
  const [versionSecurityLoading, setVersionSecurityLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AnalysisTabId>("ai");
  const [overviewTab, setOverviewTab] = useState<OverviewTabId>("info");
  const [chartsOpened, setChartsOpened] = useState(false);
  const [relatedOpened, setRelatedOpened] = useState(false);
  const [versionPanelKey, setVersionPanelKey] = useState(0);
  const versionCheckRequestId = useRef(0);
  const versionCheckAbort = useRef<AbortController | null>(null);

  const resetVersionCheck = () => {
    versionCheckRequestId.current += 1;
    versionCheckAbort.current?.abort();
    setVersionToCheck("");
    setVersionSecurityData(null);
    setVersionSecurityLoading(false);
    setVersionPanelKey((key) => key + 1);
  };

  const handleTabChange = (tab: AnalysisTabId) => {
    if (tab === "related") setRelatedOpened(true);
    resetVersionCheck();
    setActiveTab(tab);
  };

  useEffect(() => {
    return () => {
      versionCheckAbort.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!nameFromPath) return;

    const controller = new AbortController();

    async function run() {
      try {
        const res = await fetch(
          `/api/analyze-ai?package=${encodeURIComponent(nameFromPath)}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        if (controller.signal.aborted) return;
        if (res.ok) setAnalysisData(data);
        else setError(data.error || "Failed to analyse package");
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error
            ? err.message
            : "An error occurred while analysing the package";
        setError(message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    run();
    return () => {
      controller.abort();
    };
  }, [nameFromPath]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = extractPackageName(packageName);
    if (!name) return;
    router.push("/package/" + encodeURIComponent(name));
  };

  const handleVersionSecurityCheck = async () => {
    if (!analysisData?.packageInfo?.name || !versionToCheck.trim()) return;
    const requestId = ++versionCheckRequestId.current;
    versionCheckAbort.current?.abort();
    const controller = new AbortController();
    versionCheckAbort.current = controller;
    setVersionSecurityLoading(true);
    setVersionSecurityData(null);
    try {
      const response = await fetch(
        `/api/security-check?package=${encodeURIComponent(analysisData.packageInfo.name)}&version=${encodeURIComponent(versionToCheck.trim())}`,
        { signal: controller.signal },
      );
      const data = await response.json();
      if (requestId !== versionCheckRequestId.current) return;
      if (!response.ok)
        throw new Error(data.error || "Failed to check security");
      setVersionSecurityData(data);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      if (requestId !== versionCheckRequestId.current) return;
      const message =
        err instanceof Error ? err.message : "Failed to check security";
      setVersionSecurityData({ error: message });
    } finally {
      if (requestId === versionCheckRequestId.current) {
        setVersionSecurityLoading(false);
      }
    }
  };

  const availableVersions = analysisData?.npm?.time
    ? Object.keys(analysisData.npm.time)
        .filter((k) => !["created", "modified", "unpublished"].includes(k))
        .filter((v) => semver.valid(v) && !semver.prerelease(v))
        .sort((a, b) => semver.compare(b, a))
        .slice(0, 20)
    : [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <PageHeader showHomeLink />
          <PackageSearchForm
            value={packageName}
            onChange={setPackageName}
            onSubmit={handleSubmit}
            loading={loading}
          />

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {analysisData && (
            <div className="space-y-6 mb-8">
              <OverviewTabs
                active={overviewTab}
                onChange={(tab) => {
                  if (tab === "charts") setChartsOpened(true);
                  setOverviewTab(tab);
                }}
              />

              {overviewTab === "info" && analysisData.packageInfo && (
                <PackageInfoCard packageInfo={analysisData.packageInfo} />
              )}

              {overviewTab === "metrics" && analysisData.metrics && (
                <MetricsCard
                  metrics={analysisData.metrics}
                  security={analysisData.security}
                  securityFilter={securityFilter}
                  onSecurityFilterChange={(filter) => {
                    setSecurityFilter(filter);
                    if (filter) setActiveTab("ai");
                  }}
                  packageName={analysisData.packageInfo?.name}
                />
              )}

              {chartsOpened && analysisData.packageInfo && (
                <div hidden={overviewTab !== "charts"}>
                  <MetricsChartsCard
                    packageName={analysisData.packageInfo.name}
                  />
                </div>
              )}

              <AnalysisTabs
                active={activeTab}
                onChange={handleTabChange}
                versionAvailable={availableVersions.length > 0}
                aiModel={analysisData.ai?.model}
              />

              {activeTab === "ai" && (
                <div className="space-y-6">
                  {analysisData.security?.vulnerabilities?.length > 0 &&
                    securityFilter && (
                      <SecurityVulnerabilitiesCard
                        vulnerabilities={analysisData.security.vulnerabilities}
                        securityFilter={securityFilter}
                        onClose={() => setSecurityFilter(null)}
                        packageName={analysisData.packageInfo?.name}
                        version={analysisData.packageInfo?.latestVersion}
                      />
                    )}

                  {analysisData.ai ? (
                    <AIAnalysisCard ai={analysisData.ai} />
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                      <p className="text-gray-600 dark:text-gray-400">
                        AI analysis is not available for this package.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "version" &&
                analysisData.packageInfo &&
                availableVersions.length > 0 && (
                  <VersionCheckCard
                    key={versionPanelKey}
                    packageName={analysisData.packageInfo.name}
                    latestVersion={analysisData.packageInfo.latestVersion}
                    availableVersions={availableVersions}
                    versionToCheck={versionToCheck}
                    onVersionChange={setVersionToCheck}
                    onCheck={handleVersionSecurityCheck}
                    versionSecurityLoading={versionSecurityLoading}
                    versionSecurityData={versionSecurityData}
                  />
                )}

              {relatedOpened && (
                <div hidden={activeTab !== "related"}>
                  <SimilarPackagesCard
                    packageName={analysisData.packageInfo?.name ?? nameFromPath}
                    keywords={analysisData.npm?.keywords}
                  />
                </div>
              )}
            </div>
          )}

          {!analysisData && !loading && <InfoCards />}
        </div>
      </div>
    </main>
  );
}
