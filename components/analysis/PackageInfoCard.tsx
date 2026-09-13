import { formatDaysSinceRelease } from "@/lib/utils/format";
import {
  isConfidentRuntime,
  type RuntimeConfidence,
  type RuntimeKind,
} from "@/lib/runtime-environment";
import { GitHubIcon } from "@/components/BrandIcons";
import { describeLicense } from "@/lib/license-info";

/** npm search `dependents` count — badge when widely depended-on. */
const POPULAR_MIN_DEPENDENTS = 1000;
const VERY_POPULAR_MIN_DEPENDENTS = 10_000;

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
  runtime?: {
    kind: RuntimeKind;
    label: string;
    confidence: RuntimeConfidence;
    reasons: string[];
  };
}

interface PackageInfoCardProps {
  packageInfo: PackageInfo;
}

function githubRepoUrl(repository?: string): string | null {
  if (!repository) return null;
  const match = repository.match(/github\.com[:/]([^/]+)\/([^/\s#.]+)/i);
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

function RuntimeBadge({
  runtime,
}: {
  runtime: NonNullable<PackageInfo["runtime"]>;
}) {
  if (!isConfidentRuntime(runtime)) return null;

  const styles =
    runtime.kind === "client"
      ? "bg-sky-500 text-white ring-sky-700/30 dark:bg-sky-400 dark:text-sky-950"
      : runtime.kind === "server"
        ? "bg-violet-600 text-white ring-violet-800/30 dark:bg-violet-400 dark:text-violet-950"
        : "bg-teal-600 text-white ring-teal-800/30 dark:bg-teal-400 dark:text-teal-950";

  const shortLabel =
    runtime.kind === "both"
      ? "Client & Server"
      : runtime.kind === "client"
        ? "Client"
        : "Server";

  const titleParts = [
    `Heuristic: ${runtime.label.toLowerCase()}`,
    `Confidence: ${runtime.confidence}`,
    ...runtime.reasons.map((r) => `• ${r}`),
  ];

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide shadow-sm ring-1 ${styles}`}
      title={titleParts.join("\n")}
    >
      {shortLabel}
    </span>
  );
}

export function PackageInfoCard({ packageInfo }: PackageInfoCardProps) {
  const popularBadge =
    packageInfo.dependents !== undefined ? (
      <PopularBadge dependents={packageInfo.dependents} />
    ) : null;
  const runtimeBadge = packageInfo.runtime ? (
    <RuntimeBadge runtime={packageInfo.runtime} />
  ) : null;
  const badgeRow =
    popularBadge || runtimeBadge ? (
      <div className="flex flex-wrap items-center gap-2">
        {popularBadge}
        {runtimeBadge}
      </div>
    ) : null;
  const githubUrl = githubRepoUrl(packageInfo.repository);
  const licenseInfo = describeLicense(packageInfo.license);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
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
            {packageInfo.homepage ? (
              <a
                href={packageInfo.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
              >
                {packageInfo.name}
              </a>
            ) : (
              packageInfo.name
            )}
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
            {packageInfo.latestVersion || packageInfo.version}
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
              {packageInfo.dependents.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              packages depend on this
            </p>
          </div>
        )}

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
    </div>
  );
}
