"use client";

import { useEffect, useState } from "react";
import { AdvisoryLinks } from "./AdvisoryLinks";
import { AdvisoryDescription } from "./AdvisoryDescription";
import {
  severityBadgeClass,
  severityBorderClass,
  sortBySeverity,
} from "@/lib/utils/severity";
import { formatPublishDate } from "@/lib/utils/format";

interface VersionVuln {
  id?: string;
  title: string;
  severity: string;
  description: string;
  url?: string;
  vulnerableVersionRange?: string;
  patchedVersions?: string;
}

interface SecurityResult {
  hasVulnerabilities: boolean;
  totalCount: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
  vulnerabilities: VersionVuln[];
}

interface SecurityCardProps {
  packageName: string;
  latestVersion?: string;
  availableVersions: string[];
  /** npm packument `time` map — version → ISO publish date */
  versionTimes?: Record<string, string>;
  selectedVersion: string;
  onVersionChange: (v: string) => void;
  securityLoading: boolean;
  securityData: { error?: string; security?: SecurityResult } | null;
}

const TIME_META = new Set(["created", "modified", "unpublished"]);

const isPublishedVersion = (
  version: string,
  versionTimes?: Record<string, string>,
): boolean => {
  if (!versionTimes) return false;
  return Boolean(versionTimes[version]) && !TIME_META.has(version);
};

const SEVERITY_SEGMENTS = [
  { key: "critical" as const, label: "Critical", className: "bg-purple-500" },
  { key: "high" as const, label: "High", className: "bg-red-500" },
  { key: "moderate" as const, label: "Moderate", className: "bg-orange-500" },
  { key: "low" as const, label: "Low", className: "bg-yellow-400" },
];

function SeverityMix({ security }: { security: SecurityResult }) {
  const total = security.totalCount;
  if (total <= 0) return null;

  const segments = SEVERITY_SEGMENTS.map((seg) => ({
    ...seg,
    count: security[seg.key],
  })).filter((seg) => seg.count > 0);

  return (
    <div className="mt-3">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Severity mix
      </p>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
        role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.count}`).join(", ")}
      >
        {segments.map((seg) => (
          <div
            key={seg.key}
            className={`${seg.className} min-w-[2px]`}
            style={{ width: `${(seg.count / total) * 100}%` }}
            title={`${seg.label}: ${seg.count}`}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
        {segments.map((seg) => (
          <li key={seg.key} className="inline-flex items-center gap-1.5">
            <span
              className={`inline-block h-2 w-2 rounded-sm ${seg.className}`}
              aria-hidden="true"
            />
            {seg.label} {seg.count}
            <span className="text-gray-400 dark:text-gray-500">
              ({Math.round((seg.count / total) * 100)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SecurityCard({
  packageName,
  latestVersion,
  availableVersions,
  versionTimes,
  selectedVersion,
  onVersionChange,
  securityLoading,
  securityData,
}: SecurityCardProps) {
  const hasSecurity = Boolean(securityData?.security && !securityData?.error);
  const sortedVulns = hasSecurity
    ? sortBySeverity(securityData!.security!.vulnerabilities)
    : [];

  const versions =
    availableVersions.length > 0
      ? availableVersions
      : latestVersion
        ? [latestVersion]
        : [];
  const versionsKey = versions.join("\0");

  const [mode, setMode] = useState<"listed" | "custom">("listed");
  const [listedVersion, setListedVersion] = useState(
    () =>
      (selectedVersion && versions.includes(selectedVersion)
        ? selectedVersion
        : versions[0]) || "",
  );
  const [customVersion, setCustomVersion] = useState("");
  const [customNotFound, setCustomNotFound] = useState(false);
  const [checkedCustom, setCheckedCustom] = useState<string | null>(null);

  const defaultListed =
    (latestVersion && versions.includes(latestVersion)
      ? latestVersion
      : versions[0]) || "";

  useEffect(() => {
    if (versions.length === 0) return;
    setListedVersion((prev) => (versions.includes(prev) ? prev : versions[0]));
  }, [versionsKey, versions]);

  const applyListedVersion = (version: string) => {
    setListedVersion(version);
    setCustomNotFound(false);
    onVersionChange(version);
  };

  const applyCustomVersion = () => {
    const version = customVersion.trim();
    if (!version) return;
    if (versionTimes && !isPublishedVersion(version, versionTimes)) {
      setCustomNotFound(true);
      return;
    }
    setCustomNotFound(false);
    setCheckedCustom(version);
    onVersionChange(version);
  };

  const chooseMode = (next: "listed" | "custom") => {
    if (next === mode) return;
    setMode(next);
    setCustomVersion("");
    setCustomNotFound(false);
    setCheckedCustom(null);
    if (next === "listed") {
      if (defaultListed) applyListedVersion(defaultListed);
      return;
    }
    if (defaultListed) setListedVersion(defaultListed);
  };

  const showSecurity =
    mode === "listed" ||
    Boolean(checkedCustom && checkedCustom === customVersion.trim());

  const selectedPublished = formatPublishDate(
    selectedVersion ? versionTimes?.[selectedVersion] : null,
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
        Security advisories for the selected package version.
      </p>
      <div
        role="radiogroup"
        aria-label="Version source"
        className="flex gap-5 mb-3 border-b border-gray-200 dark:border-gray-600"
      >
        {(
          [
            { id: "listed" as const, label: "Last 10 versions" },
            { id: "custom" as const, label: "Older versions" },
          ] as const
        ).map((option) => {
          const selected = mode === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => chooseMode(option.id)}
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

      {mode === "listed" ? (
        <div>
          <label
            htmlFor="securityVersionSelect"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Version
          </label>
          <select
            id="securityVersionSelect"
            value={listedVersion}
            onChange={(e) => applyListedVersion(e.target.value)}
            disabled={versions.length === 0 || securityLoading}
            className="w-full md:w-1/4 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white disabled:opacity-60"
          >
            {versions.map((v) => (
              <option key={v} value={v}>
                {v}
                {v === latestVersion ? " (latest)" : ""}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label
            htmlFor="securityVersionCustom"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Version
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="securityVersionCustom"
              type="text"
              value={customVersion}
              onChange={(e) => {
                setCustomVersion(e.target.value);
                if (customNotFound) setCustomNotFound(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyCustomVersion();
                }
              }}
              placeholder="Enter version"
              spellCheck={false}
              autoComplete="off"
              disabled={showSecurity && securityLoading}
              className="w-full md:w-1/4 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white disabled:opacity-60"
            />
            <button
              type="button"
              onClick={applyCustomVersion}
              disabled={(showSecurity && securityLoading) || !customVersion.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Check
            </button>
          </div>
          {customNotFound && (
            <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
              Version not found
            </p>
          )}
        </div>
      )}

      {mode === "listed" && selectedPublished && (
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          Released {selectedPublished}
        </p>
      )}

      {showSecurity && securityLoading && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400" role="status">
          Checking security for {packageName}@{selectedVersion || "…"}…
        </p>
      )}

      {showSecurity && securityData?.error && !securityLoading && (
        <p className="mt-4 text-red-600 dark:text-red-400">{securityData.error}</p>
      )}

      {showSecurity && hasSecurity && !securityLoading && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
          <h3 className="font-semibold text-lg mb-3">
            Security for {packageName}@{selectedVersion}
          </h3>
          {securityData!.security!.hasVulnerabilities ? (
            <div className="space-y-2">
              <p className="text-red-600 dark:text-red-400 font-medium">
                {securityData!.security!.totalCount}{" "}
                {securityData!.security!.totalCount === 1
                  ? "vulnerability"
                  : "vulnerabilities"}{" "}
                found
              </p>
              <SeverityMix security={securityData!.security!} />
              <div className="space-y-3 mt-4">
                {sortedVulns.map((vuln, idx) => (
                  <div
                    key={vuln.id ?? idx}
                    className={`bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border-l-4 ${severityBorderClass(vuln.severity)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-semibold">{vuln.title}</h4>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${severityBadgeClass(vuln.severity)}`}
                      >
                        {vuln.severity}
                      </span>
                    </div>
                    <AdvisoryDescription markdown={vuln.description} />
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {vuln.id && (
                        <span>
                          <strong>ID:</strong> {vuln.id}
                        </span>
                      )}
                      {vuln.vulnerableVersionRange && (
                        <span>
                          <strong>Vulnerable:</strong>{" "}
                          {vuln.vulnerableVersionRange}
                        </span>
                      )}
                      {vuln.patchedVersions &&
                        vuln.patchedVersions !== "none" && (
                          <span className="text-green-600 dark:text-green-400">
                            <strong>Fixed in:</strong> {vuln.patchedVersions}
                          </span>
                        )}
                    </div>
                    <AdvisoryLinks
                      githubUrl={vuln.url}
                      packageName={packageName}
                      version={selectedVersion}
                    />
                  </div>
                ))}
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
  );
}
