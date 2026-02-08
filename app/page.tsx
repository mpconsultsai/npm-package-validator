"use client";

import { useState } from "react";
import semver from "semver";

export default function Home() {
  const [packageName, setPackageName] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [securityFilter, setSecurityFilter] = useState<string | null>(null); // 'critical', 'high', 'moderate', 'low', or null for all
  const [versionToCheck, setVersionToCheck] = useState("");
  const [versionSecurityData, setVersionSecurityData] = useState<any>(null);
  const [versionSecurityLoading, setVersionSecurityLoading] = useState(false);

  const formatDaysSinceRelease = (days: number): string => {
    if (days >= 365) {
      const years = Math.floor(days / 365);
      const remainingDays = days % 365;
      if (remainingDays === 0) {
        return years === 1 ? "1yr" : `${years}yrs`;
      }
      return years === 1
        ? `1yr ${remainingDays} ${remainingDays === 1 ? "day" : "days"}`
        : `${years}yrs ${remainingDays} ${remainingDays === 1 ? "day" : "days"}`;
    }
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageName.trim()) return;

    setLoading(true);
    setError(null);
    setAnalysisData(null);
    setSecurityFilter(null);
    setVersionSecurityData(null);
    setVersionToCheck("");

    try {
      const response = await fetch(
        `/api/analyze-ai?package=${encodeURIComponent(packageName)}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyse package");
      }

      setAnalysisData(data);
    } catch (err: any) {
      setError(err.message || "An error occurred while analysing the package");
    } finally {
      setLoading(false);
    }
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
        .filter((v) => semver.valid(v) && !semver.prerelease(v)) // full releases only, exclude alpha/beta/rc
        .sort((a, b) => semver.compare(b, a)) // newest first
        .slice(0, 20)
    : [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              NPM Package Validator
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Analyse npm packages for security, quality, and reliability with
              AI-powered insights
            </p>
          </div>

          {/* Search Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="packageName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Package Name
                </label>
                <input
                  type="text"
                  id="packageName"
                  name="packageName"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="e.g., react, lodash, @graphql-inspector/core"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !packageName.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? "Analysing..." : "Analyse Package"}
              </button>
            </form>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Analysis Results */}
          {analysisData && (
            <div className="space-y-6 mb-8">
              {/* Package Info */}
              {analysisData.packageInfo && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h2 className="font-bold text-2xl mb-6 flex items-center gap-2">
                    <svg
                      className="w-7 h-7 text-blue-600 dark:text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                    Package Info
                  </h2>
                  {analysisData.packageInfo.description && (
                    <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-600">
                      {analysisData.packageInfo.dependents !== undefined &&
                        analysisData.packageInfo.dependents >= 1000 && (
                          <span className="inline-block px-3 py-1 mb-3 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                            Popular
                          </span>
                        )}
                      <p className="text-gray-700 dark:text-gray-300">
                        {analysisData.packageInfo.description}
                      </p>
                    </div>
                  )}
                  {analysisData.packageInfo.dependents !== undefined &&
                    analysisData.packageInfo.dependents >= 1000 &&
                    !analysisData.packageInfo.description && (
                      <span className="inline-block px-3 py-1 mb-6 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                        Popular
                      </span>
                    )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg
                          className="w-5 h-5 text-blue-600 dark:text-blue-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Name
                        </span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {analysisData.packageInfo.name}
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg
                          className="w-5 h-5 text-green-600 dark:text-green-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                          />
                        </svg>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Latest Version
                        </span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {analysisData.packageInfo.latestVersion ||
                          analysisData.packageInfo.version}
                      </p>
                    </div>

                    {analysisData.packageInfo.daysSinceLastRelease !== null &&
                      analysisData.packageInfo.daysSinceLastRelease !==
                        undefined && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <svg
                              className="w-5 h-5 text-purple-600 dark:text-purple-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              Last Release
                            </span>
                          </div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            {formatDaysSinceRelease(
                              analysisData.packageInfo.daysSinceLastRelease,
                            )}
                          </p>
                        </div>
                      )}

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg
                          className="w-5 h-5 text-orange-600 dark:text-orange-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          License
                        </span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {analysisData.packageInfo.license}
                      </p>
                    </div>

                    {analysisData.packageInfo.dependents !== undefined && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg
                            className="w-5 h-5 text-teal-600 dark:text-teal-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Dependents
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {analysisData.packageInfo.dependents.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          packages depend on this
                        </p>
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <a
                        href={analysisData.packageInfo.npmUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                        View on npm
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Metrics */}
              {analysisData.metrics && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h2 className="font-bold text-2xl mb-4 flex items-center gap-2">
                    <svg
                      className="w-7 h-7 text-green-600 dark:text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    Metrics
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Downloads (month)
                      </p>
                      <p className="text-2xl font-bold">
                        {analysisData.metrics.downloads.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        GitHub Stars
                      </p>
                      <p className="text-2xl font-bold">
                        {analysisData.metrics.stars.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Open Issues
                      </p>
                      <p className="text-2xl font-bold">
                        {analysisData.metrics.openIssues.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Quality Score
                      </p>
                      <p className="text-2xl font-bold">
                        {analysisData.metrics.qualityScore}/100
                      </p>
                    </div>
                    {analysisData.metrics.aiScore !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          AI Score
                        </p>
                        <p className="text-2xl font-bold text-purple-600">
                          {analysisData.metrics.aiScore}/100
                        </p>
                      </div>
                    )}
                    <div className="col-span-2 md:col-span-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Security Issues
                      </p>
                      {analysisData.metrics.securityIssues === 0 ? (
                        <p className="text-2xl font-bold text-green-500">
                          None
                        </p>
                      ) : (
                        <div className="flex gap-2 flex-wrap">
                          {analysisData.security?.critical > 0 && (
                            <button
                              onClick={() => setSecurityFilter("critical")}
                              className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                                securityFilter === "critical"
                                  ? "bg-purple-500 ring-2 ring-purple-400"
                                  : "bg-purple-400 hover:bg-purple-500"
                              }`}
                            >
                              <span className="text-xs font-medium text-white">
                                Critical
                              </span>
                              <span className="text-lg font-bold text-white">
                                {analysisData.security.critical}
                              </span>
                            </button>
                          )}
                          {analysisData.security?.high > 0 && (
                            <button
                              onClick={() => setSecurityFilter("high")}
                              className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                                securityFilter === "high"
                                  ? "bg-red-500 ring-2 ring-red-400"
                                  : "bg-red-400 hover:bg-red-500"
                              }`}
                            >
                              <span className="text-xs font-medium text-white">
                                High
                              </span>
                              <span className="text-lg font-bold text-white">
                                {analysisData.security.high}
                              </span>
                            </button>
                          )}
                          {analysisData.security?.moderate > 0 && (
                            <button
                              onClick={() => setSecurityFilter("moderate")}
                              className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                                securityFilter === "moderate"
                                  ? "bg-orange-500 ring-2 ring-orange-400"
                                  : "bg-orange-400 hover:bg-orange-500"
                              }`}
                            >
                              <span className="text-xs font-medium text-white">
                                Moderate
                              </span>
                              <span className="text-lg font-bold text-white">
                                {analysisData.security.moderate}
                              </span>
                            </button>
                          )}
                          {analysisData.security?.low > 0 && (
                            <button
                              onClick={() => setSecurityFilter("low")}
                              className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                                securityFilter === "low"
                                  ? "bg-yellow-500 ring-2 ring-yellow-400"
                                  : "bg-yellow-400 hover:bg-yellow-500"
                              }`}
                            >
                              <span className="text-xs font-medium text-white">
                                Low
                              </span>
                              <span className="text-lg font-bold text-white">
                                {analysisData.security.low}
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                      {analysisData.packageInfo && (
                        <a
                          href={`https://snyk.io/advisor/npm-package/${analysisData.packageInfo.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                          View Snyk Advisor
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Security Vulnerabilities Details */}
              {analysisData.security &&
                analysisData.security.vulnerabilities &&
                analysisData.security.vulnerabilities.length > 0 &&
                securityFilter && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow-lg p-6 border-2 border-red-200 dark:border-red-800 relative">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-bold text-2xl flex items-center gap-2 text-red-800 dark:text-red-200">
                        <svg
                          className="w-7 h-7"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        Security Vulnerabilities
                      </h2>
                      <button
                        onClick={() => setSecurityFilter(null)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 transition-colors"
                        aria-label="Close vulnerabilities"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-4">
                      {analysisData.security.vulnerabilities
                        .filter(
                          (vuln: any) =>
                            !securityFilter || vuln.severity === securityFilter,
                        )
                        .map((vuln: any, idx: number) => (
                          <div
                            key={idx}
                            className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-red-500"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold text-lg">
                                {vuln.title}
                              </h3>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${
                                  vuln.severity === "critical"
                                    ? "bg-purple-500"
                                    : vuln.severity === "high"
                                      ? "bg-red-500"
                                      : vuln.severity === "moderate"
                                        ? "bg-orange-500"
                                        : "bg-yellow-500"
                                }`}
                              >
                                {vuln.severity.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
                              {vuln.description}
                            </p>
                            <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <span>
                                <strong>ID:</strong> {vuln.id}
                              </span>
                              {vuln.vulnerableVersionRange && (
                                <span>
                                  <strong>Vulnerable:</strong>{" "}
                                  {vuln.vulnerableVersionRange}
                                </span>
                              )}
                              {vuln.patchedVersions &&
                                vuln.patchedVersions !== "none" && (
                                  <span className="text-green-500 dark:text-green-400 font-semibold">
                                    <strong>Fixed in:</strong>{" "}
                                    {vuln.patchedVersions}
                                  </span>
                                )}
                            </div>
                            {vuln.url && (
                              <a
                                href={vuln.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm underline"
                              >
                                View Advisory →
                              </a>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

              {/* Check security for specific version */}
              {analysisData?.packageInfo && availableVersions.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h2 className="font-bold text-2xl mb-4 flex items-center gap-2">
                    <svg
                      className="w-7 h-7 text-blue-600 dark:text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    Version check
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        Check security advisories for a
                        </p>
                      <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[140px]">
                      <label
                        htmlFor="versionSelect"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Version
                      </label>
                      <select
                        id="versionSelect"
                        value={versionToCheck}
                        onChange={(e) => setVersionToCheck(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Select version...</option>
                        {availableVersions.map((v) => (
                          <option key={v} value={v}>
                            {v}
                            {v === analysisData.packageInfo?.latestVersion
                              ? " (latest)"
                              : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleVersionSecurityCheck}
                      disabled={
                        versionSecurityLoading || !versionToCheck.trim()
                      }
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                    >
                      {versionSecurityLoading ? "Checking..." : "Check"}
                    </button>
                  </div>

                  {versionSecurityData?.error && (
                    <p className="mt-4 text-red-600 dark:text-red-400">
                      {versionSecurityData.error}
                    </p>
                  )}

                  {versionSecurityData?.security &&
                    !versionSecurityData.error && (
                      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                        <h3 className="font-semibold text-lg mb-3">
                          Security for {versionSecurityData.packageName}@
                          {versionSecurityData.version}
                        </h3>
                        {versionSecurityData.security.hasVulnerabilities ? (
                          <div className="space-y-2">
                            <p className="text-red-600 dark:text-red-400 font-medium">
                              {versionSecurityData.security.totalCount}{" "}
                              vulnerability
                              {versionSecurityData.security.totalCount !== 1
                                ? "ies"
                                : ""}{" "}
                              found
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {versionSecurityData.security.critical > 0 && (
                                <span className="px-2 py-1 rounded bg-purple-500 text-white text-sm">
                                  Critical:{" "}
                                  {versionSecurityData.security.critical}
                                </span>
                              )}
                              {versionSecurityData.security.high > 0 && (
                                <span className="px-2 py-1 rounded bg-red-500 text-white text-sm">
                                  High: {versionSecurityData.security.high}
                                </span>
                              )}
                              {versionSecurityData.security.moderate > 0 && (
                                <span className="px-2 py-1 rounded bg-orange-500 text-white text-sm">
                                  Moderate:{" "}
                                  {versionSecurityData.security.moderate}
                                </span>
                              )}
                              {versionSecurityData.security.low > 0 && (
                                <span className="px-2 py-1 rounded bg-yellow-500 text-white text-sm">
                                  Low: {versionSecurityData.security.low}
                                </span>
                              )}
                            </div>
                            <div className="space-y-3 mt-4">
                              {versionSecurityData.security.vulnerabilities.map(
                                (vuln: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border-l-4 border-red-500"
                                  >
                                    <div className="flex items-start justify-between">
                                      <h4 className="font-semibold">
                                        {vuln.title}
                                      </h4>
                                      <span
                                        className={`px-2 py-0.5 rounded text-xs font-medium text-white ${
                                          vuln.severity === "critical"
                                            ? "bg-purple-500"
                                            : vuln.severity === "high"
                                              ? "bg-red-500"
                                              : vuln.severity === "moderate"
                                                ? "bg-orange-500"
                                                : "bg-yellow-500"
                                        }`}
                                      >
                                        {vuln.severity}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {vuln.description}
                                    </p>
                                    {vuln.url && (
                                      <a
                                        href={vuln.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
                                      >
                                        View advisory →
                                      </a>
                                    )}
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-green-600 dark:text-green-400 font-medium">
                            No known vulnerabilities for this version.
                          </p>
                        )}
                      </div>
                    )}
                </div>
              )}

              {/* AI Analysis */}
              {analysisData.ai && (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg shadow-lg p-6">
                  <h2 className="font-bold text-2xl mb-4 flex items-center gap-2">
                    <svg
                      className="w-7 h-7 text-purple-600 dark:text-purple-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    AI Analysis
                    {analysisData.ai.model && (
                      <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                        via {analysisData.ai.model}
                      </span>
                    )}
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Summary</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        {analysisData.ai.summary}
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg mb-2">
                        Recommendation
                      </h3>
                      <span
                        className={`inline-block px-4 py-2 rounded-full font-semibold ${
                          analysisData.ai.recommendation === "recommended"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : analysisData.ai.recommendation ===
                                "use-with-caution"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {analysisData.ai.recommendation
                          .toUpperCase()
                          .replace(/-/g, " ")}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg mb-2">
                        Overall Score
                      </h3>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500"
                            style={{
                              width: `${analysisData.ai.overallScore}%`,
                            }}
                          />
                        </div>
                        <span className="font-bold text-xl">
                          {analysisData.ai.overallScore}/100
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Security
                        </p>
                        <p className="font-semibold capitalize">
                          {analysisData.ai.securityRating}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Quality
                        </p>
                        <p className="font-semibold capitalize">
                          {analysisData.ai.qualityRating}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Maintenance
                        </p>
                        <p className="font-semibold capitalize">
                          {analysisData.ai.maintenanceRating}
                        </p>
                      </div>
                    </div>

                    {analysisData.ai.strengths &&
                      analysisData.ai.strengths.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                            <svg
                              className="w-5 h-5 text-green-600 dark:text-green-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Strengths
                          </h3>
                          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                            {analysisData.ai.strengths.map(
                              (strength: string, idx: number) => (
                                <li key={idx}>{strength}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}

                    {analysisData.ai.concerns &&
                      analysisData.ai.concerns.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                            <svg
                              className="w-5 h-5 text-yellow-600 dark:text-yellow-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
                            </svg>
                            Concerns
                          </h3>
                          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                            {analysisData.ai.concerns.map(
                              (concern: string, idx: number) => (
                                <li key={idx}>{concern}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}

                    {analysisData.ai.reasoning && (
                      <div>
                        <h3 className="font-semibold text-lg mb-2">
                          Reasoning
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300">
                          {analysisData.ai.reasoning}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info Section - Only show when no results */}
          {!analysisData && !loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-blue-600 dark:text-blue-400 mb-3">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  Security Analysis
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Check for vulnerabilities and security advisories
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-green-600 dark:text-green-400 mb-3">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">Quality Metrics</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Evaluate maintenance, popularity, and code quality
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-purple-600 dark:text-purple-400 mb-3">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">AI-Powered</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Get intelligent recommendations using Agentic AI
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
