"use client";

import { useState, useCallback } from "react";
import { formatDaysSinceRelease } from "@/lib/utils/format";
import { GitHubIcon } from "@/components/BrandIcons";
import { describeLicense } from "@/lib/license-info";
import { MetricsCard } from "./MetricsCard";
import { UpgradeAdvisorPanel } from "./UpgradeAdvisorPanel";
import { DependentsModal } from "./DependentsModal";
import { CopyButton } from "@/components/CopyButton";

/** npm search `dependents` count — badge when widely depended-on. */
const POPULAR_MIN_DEPENDENTS = 1000;
const VERY_POPULAR_MIN_DEPENDENTS = 10_000;
const MAX_KEYWORD_BADGES = 10;

interface PackageInfo {
  name: string;
  latestVersion?: string;
  version?: string;
  license: string;
  description?: string;
  npmUrl: string;
  homepage?: string;
  repository?: string;
  daysSinceLastRelease?: number | null;
  lastReleaseLabel?: string | null;
  dependents?: number;
  keywords?: string[];
  engines?: Record<string, string> | null;
}

interface PackageInfoCardProps {
  packageInfo: PackageInfo;
  metrics?: {
    downloads: number;
    stars: number;
    openIssues: number;
    qualityScore: number;
    releaseCount?: number;
    bundleSize?: number;
    bundleGzip?: number;
  } | null;
  metricsLoading?: boolean;
  versionTimes?: Record<string, string> | null;
  latestSecurity?: {
    totalCount?: number;
    critical?: number;
    high?: number;
    moderate?: number;
    low?: number;
  } | null;
}

function githubRepoUrl(repository?: string): string | null {
  if (!repository) return null;
  const match = repository.match(/github\.com[:/]([^/]+)\/([^/\s#?]+)/i);
  if (!match) return null;
  const repo = match[2].replace(/\.git$/i, "");
  return `https://github.com/${match[1]}/${repo}`;
}

function formatDependents(count: number): string {
  if (count >= 1_000_000) {
    const m = count / 1_000_000;
    return `${m >= 10 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (count >= 1000) {
    const k = count / 1000;
    return `${k >= 10 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return String(count);
}

function PopularBadge({ dependents }: { dependents: number }) {
  if (dependents < POPULAR_MIN_DEPENDENTS) return null;

  const very = dependents >= VERY_POPULAR_MIN_DEPENDENTS;
  const label = very ? "Very popular" : "Popular";

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-amber-400 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-950 shadow-sm ring-1 ring-amber-600/30 dark:bg-amber-300 dark:text-amber-950 dark:ring-amber-200/40"
      title={`${dependents.toLocaleString()} packages on npm depend on this (${formatDependents(dependents)})`}
    >
      <svg
        className="h-3 w-3 shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      {label}
    </span>
  );
}

function KeywordBadges({
  keywords,
  packageName,
}: {
  keywords?: string[];
  packageName: string;
}) {
  if (!keywords?.length) return null;

  const nameLower = packageName.toLowerCase();
  const baseName = nameLower.includes("/")
    ? nameLower.slice(nameLower.lastIndexOf("/") + 1)
    : nameLower;

  const labels = [
    ...new Set(
      keywords
        .map((k) => k.trim())
        .filter(Boolean)
        .filter((k) => {
          const key = k.toLowerCase();
          return key !== nameLower && key !== baseName;
        }),
    ),
  ].slice(0, MAX_KEYWORD_BADGES);
  if (labels.length === 0) return null;

  return (
    <>
      {labels.map((label) => (
        <span
          key={label}
          className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 ring-1 ring-gray-200 dark:bg-gray-700/70 dark:text-gray-200 dark:ring-gray-600"
        >
          {label}
        </span>
      ))}
    </>
  );
}

export function PackageInfoCard({
  packageInfo,
  metrics,
  metricsLoading = false,
  versionTimes,
  latestSecurity,
}: PackageInfoCardProps) {
  const [section, setSection] = useState<"info" | "metrics" | "upgrade">(
    "info",
  );
  const [dependentsOpen, setDependentsOpen] = useState(false);
  const closeDependents = useCallback(() => setDependentsOpen(false), []);
  const popularBadge =
    packageInfo.dependents !== undefined ? (
      <PopularBadge dependents={packageInfo.dependents} />
    ) : null;
  const keywordBadges = (
    <KeywordBadges
      keywords={packageInfo.keywords}
      packageName={packageInfo.name}
    />
  );
  const hasKeywordBadges = Boolean(
    packageInfo.keywords?.some((k) => {
      const key = k.trim().toLowerCase();
      if (!key) return false;
      const nameLower = packageInfo.name.toLowerCase();
      const baseName = nameLower.includes("/")
        ? nameLower.slice(nameLower.lastIndexOf("/") + 1)
        : nameLower;
      return key !== nameLower && key !== baseName;
    }),
  );
  const badgeRow =
    popularBadge || hasKeywordBadges ? (
      <div className="flex flex-wrap items-center gap-2">
        {popularBadge}
        {keywordBadges}
      </div>
    ) : null;
  const githubUrl = githubRepoUrl(packageInfo.repository);
  const licenseInfo = describeLicense(packageInfo.license);
  const nodeEngine = packageInfo.engines?.node?.trim() || null;
  const npmEngine = packageInfo.engines?.npm?.trim() || null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
      <div
        role="radiogroup"
        aria-label="Package details"
        className="flex gap-5 mb-4 border-b border-gray-200 dark:border-gray-600"
      >
        {(
          [
            { id: "info" as const, label: "Info" },
            { id: "metrics" as const, label: "Metrics" },
            { id: "upgrade" as const, label: "Upgrade" },
          ] as const
        ).map((option) => {
          const selected = section === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setSection(option.id)}
              className={`-mb-px pb-2 text-sm font-medium border-b-2 transition-colors ${
                selected
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {section === "metrics" ? (
        metricsLoading || !metrics ? (
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-6 sm:gap-4 animate-pulse"
            role="status"
          >
            <span className="sr-only">Loading package metrics</span>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
                <div className="h-8 w-16 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        ) : (
          <MetricsCard metrics={metrics} embedded />
        )
      ) : section === "upgrade" ? (
        <UpgradeAdvisorPanel
          packageName={packageInfo.name}
          latestVersion={packageInfo.latestVersion || packageInfo.version}
          versionTimes={versionTimes}
          latestSecurity={latestSecurity}
        />
      ) : (
        <>
          {packageInfo.description && (
            <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-600">
              <p className="text-base font-semibold leading-relaxed text-gray-800 dark:text-gray-100 sm:text-lg">
                {packageInfo.description}
              </p>
              {badgeRow && <div className="mt-3">{badgeRow}</div>}
            </div>
          )}
          {!packageInfo.description && badgeRow && (
            <div className="mb-6">{badgeRow}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <p className="text-lg font-semibold text-gray-900 dark:text-white inline-flex items-center gap-1.5">
                <span>{packageInfo.latestVersion || packageInfo.version}</span>
                {(packageInfo.latestVersion || packageInfo.version) && (
                  <CopyButton
                    value={
                      packageInfo.latestVersion || packageInfo.version || ""
                    }
                    label="Copy version"
                  />
                )}
              </p>
            </div>

            {(packageInfo.lastReleaseLabel ||
              (packageInfo.daysSinceLastRelease !== null &&
                packageInfo.daysSinceLastRelease !== undefined)) && (
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
                  {packageInfo.lastReleaseLabel ??
                    formatDaysSinceRelease(packageInfo.daysSinceLastRelease!)}
                </p>
              </div>
            )}

            {nodeEngine && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Supported Node version(s)
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
                  {nodeEngine}
                </p>
              </div>
            )}

            {npmEngine && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-5 h-5 text-red-600 dark:text-red-400"
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
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Supported npm version(s)
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
                  {npmEngine}
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
                  Licence
                </span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {licenseInfo?.href ? (
                  <a
                    href={licenseInfo.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
                  >
                    {packageInfo.license}
                  </a>
                ) : (
                  packageInfo.license
                )}
              </p>
              {licenseInfo?.summary && (
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  {licenseInfo.summary}
                </p>
              )}
            </div>

            {packageInfo.dependents !== undefined && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
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
                  {packageInfo.dependents > 0 && (
                    <button
                      type="button"
                      onClick={() => setDependentsOpen(true)}
                      className="rounded-md px-1.5 py-0.5 text-xs font-medium text-teal-700 hover:bg-teal-100 hover:text-teal-900 dark:text-teal-300 dark:hover:bg-teal-900/40 dark:hover:text-teal-100"
                      title="View dependents"
                      aria-label="View dependents"
                    >
                      View
                    </button>
                  )}
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {packageInfo.dependents.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  packages depend on this
                </p>
              </div>
            )}

            <DependentsModal
              packageName={packageInfo.name}
              dependentCount={packageInfo.dependents}
              open={dependentsOpen}
              onClose={closeDependents}
            />

            <div className="md:col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <a
                href={packageInfo.npmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
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
              {githubUrl && (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                >
                  <GitHubIcon className="w-4 h-4 shrink-0" />
                  View on GitHub
                </a>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
