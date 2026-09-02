import { AdvisoryLinks } from "./AdvisoryLinks";
import { AdvisoryDescription } from "./AdvisoryDescription";
import {
  severityBadgeClass,
  severityBorderClass,
  sortBySeverity,
} from "@/lib/utils/severity";

interface VersionVuln {
  id?: string;
  title: string;
  severity: string;
  description: string;
  url?: string;
  vulnerableVersionRange?: string;
  patchedVersions?: string;
}

interface VersionSecurityResult {
  packageName: string;
  version: string;
  security: {
    hasVulnerabilities: boolean;
    totalCount: number;
    critical: number;
    high: number;
    moderate: number;
    low: number;
    vulnerabilities: VersionVuln[];
  };
}

interface VersionCheckCardProps {
  packageName: string;
  latestVersion?: string;
  availableVersions: string[];
  versionToCheck: string;
  onVersionChange: (v: string) => void;
  onCheck: () => void;
  versionSecurityLoading: boolean;
  versionSecurityData: { error?: string; security?: VersionSecurityResult["security"] } | null;
}

export function VersionCheckCard({
  packageName,
  latestVersion,
  availableVersions,
  versionToCheck,
  onVersionChange,
  onCheck,
  versionSecurityLoading,
  versionSecurityData,
}: VersionCheckCardProps) {
  const hasSecurity = versionSecurityData?.security && !versionSecurityData?.error;
  const sortedVulns = hasSecurity
    ? sortBySeverity(versionSecurityData.security!.vulnerabilities)
    : [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
        Check security advisories for a specific version
      </p>
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[140px]">
          <label
            htmlFor="versionSelect"
            className="sr-only block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Version
          </label>
          <select
            id="versionSelect"
            value={versionToCheck}
            onChange={(e) => onVersionChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select version...</option>
            {availableVersions.map((v) => (
              <option key={v} value={v}>
                {v}
                {v === latestVersion ? " (latest)" : ""}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onCheck}
          disabled={versionSecurityLoading || !versionToCheck.trim()}
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

      {hasSecurity && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
          <h3 className="font-semibold text-lg mb-3">
            Security for {packageName}@{versionToCheck}
          </h3>
          {versionSecurityData.security!.hasVulnerabilities ? (
            <div className="space-y-2">
              <p className="text-red-600 dark:text-red-400 font-medium">
                {versionSecurityData.security!.totalCount}{" "}
                {versionSecurityData.security!.totalCount === 1
                  ? "vulnerability"
                  : "vulnerabilities"}{" "}
                found
              </p>
              <div className="flex gap-2 flex-wrap">
                {versionSecurityData.security!.critical > 0 && (
                  <span className="px-2 py-1 rounded bg-purple-500 text-white text-sm">
                    Critical: {versionSecurityData.security!.critical}
                  </span>
                )}
                {versionSecurityData.security!.high > 0 && (
                  <span className="px-2 py-1 rounded bg-red-500 text-white text-sm">
                    High: {versionSecurityData.security!.high}
                  </span>
                )}
                {versionSecurityData.security!.moderate > 0 && (
                  <span className="px-2 py-1 rounded bg-orange-500 text-white text-sm">
                    Moderate: {versionSecurityData.security!.moderate}
                  </span>
                )}
                {versionSecurityData.security!.low > 0 && (
                  <span className="px-2 py-1 rounded bg-yellow-500 text-white text-sm">
                    Low: {versionSecurityData.security!.low}
                  </span>
                )}
              </div>
              <div className="space-y-3 mt-4">
                {sortedVulns.map((vuln, idx) => (
                    <div
                      key={vuln.id ?? idx}
                      className={`bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border-l-4 ${severityBorderClass(vuln.severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold">{vuln.title}</h4>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium text-white ${severityBadgeClass(vuln.severity)}`}
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
                        version={versionToCheck}
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
