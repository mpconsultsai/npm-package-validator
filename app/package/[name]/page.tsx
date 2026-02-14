"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import semver from "semver";
import { extractPackageName } from "@/lib/validation";
import { PageHeader } from "@/components/PageHeader";
import { PackageSearchForm } from "@/components/PackageSearchForm";
import { InfoCards } from "@/components/InfoCards";
import {
  PackageInfoCard,
  MetricsCard,
  SecurityVulnerabilitiesCard,
  VersionCheckCard,
  AIAnalysisCard,
  SimilarPackagesCard,
} from "@/components/analysis";

export default function PackagePage() {
  const params = useParams();
  const router = useRouter();
  const nameFromPath = params.name
    ? decodeURIComponent(String(params.name))
    : "";

  const [packageName, setPackageName] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [securityFilter, setSecurityFilter] = useState<string | null>(null);
  const [versionToCheck, setVersionToCheck] = useState("");
  const [versionSecurityData, setVersionSecurityData] = useState<any>(null);
  const [versionSecurityLoading, setVersionSecurityLoading] = useState(false);

  useEffect(() => {
    if (!nameFromPath) return;
    setPackageName(nameFromPath);
    setLoading(true);
    setError(null);
    setAnalysisData(null);
    setSecurityFilter(null);
    setVersionSecurityData(null);
    setVersionToCheck("");

    async function run() {
      try {
        const res = await fetch(
          `/api/analyze-ai?package=${encodeURIComponent(nameFromPath)}`,
        );
        const data = await res.json();
        if (res.ok) setAnalysisData(data);
        else setError(data.error || "Failed to analyse package");
      } catch (err: any) {
        setError(
          err.message || "An error occurred while analysing the package",
        );
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [nameFromPath]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = extractPackageName(packageName);
    if (!name) return;
    router.push("/package/" + encodeURIComponent(name));
  };

  const handleVersionSecurityCheck = async () => {
    if (!analysisData?.packageInfo?.name || !versionToCheck.trim()) return;
    setVersionSecurityLoading(true);
    setVersionSecurityData(null);
    try {
      const response = await fetch(
        `/api/security-check?package=${encodeURIComponent(analysisData.packageInfo.name)}&version=${encodeURIComponent(versionToCheck.trim())}`,
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to check security");
      setVersionSecurityData(data);
    } catch (err: any) {
      setVersionSecurityData({ error: err.message });
    } finally {
      setVersionSecurityLoading(false);
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
              {analysisData.packageInfo && (
                <PackageInfoCard packageInfo={analysisData.packageInfo} />
              )}

              {analysisData.metrics && (
                <MetricsCard
                  metrics={analysisData.metrics}
                  security={analysisData.security}
                  securityFilter={securityFilter}
                  onSecurityFilterChange={setSecurityFilter}
                  packageName={analysisData.packageInfo?.name}
                />
              )}

              {analysisData.security?.vulnerabilities?.length > 0 &&
                securityFilter && (
                  <SecurityVulnerabilitiesCard
                    vulnerabilities={analysisData.security.vulnerabilities}
                    securityFilter={securityFilter}
                    onClose={() => setSecurityFilter(null)}
                  />
                )}

              {analysisData.packageInfo &&
                availableVersions.length > 0 && (
                  <VersionCheckCard
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

              {analysisData.ai && (
                <AIAnalysisCard ai={analysisData.ai} />
              )}

              <SimilarPackagesCard
                packageName={analysisData.packageInfo?.name ?? nameFromPath}
                keywords={analysisData.npm?.keywords}
              />
            </div>
          )}

          {!analysisData && !loading && <InfoCards />}
        </div>
      </div>
    </main>
  );
}
