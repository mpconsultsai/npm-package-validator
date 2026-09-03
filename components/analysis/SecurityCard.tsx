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
  selectedVersion: string;
  onVersionChange: (v: string) => void;
  securityLoading: boolean;
  securityData: { error?: string; security?: SecurityResult } | null;
}

export function SecurityCard({
  packageName,
  latestVersion,
  availableVersions,
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
        Security advisories for the selected package version.
      </p>
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[140px]">
          <label
            htmlFor="securityVersionSelect"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Version
          </label>
          <select
            id="securityVersionSelect"
            value={selectedVersion}
            onChange={(e) => onVersionChange(e.target.value)}
            disabled={versions.length === 0 || securityLoading}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white disabled:opacity-60"
          >
            {versions.map((v) => (
              <option key={v} value={v}>
                {v}
                {v === latestVersion ? " (latest)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {securityLoading && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400" role="status">
          Checking security for {packageName}@{selectedVersion || "…"}…
        </p>
      )}

      {securityData?.error && !securityLoading && (
        <p className="mt-4 text-red-600 dark:text-red-400">{securityData.error}</p>
      )}

      {hasSecurity && !securityLoading && (
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
              <div className="flex gap-2 flex-wrap">
                {securityData!.security!.critical > 0 && (
                  <span className="px-2 py-1 rounded bg-purple-500 text-white text-sm">
                    Critical: {securityData!.security!.critical}
                  </span>
                )}
                {securityData!.security!.high > 0 && (
                  <span className="px-2 py-1 rounded bg-red-500 text-white text-sm">
                    High: {securityData!.security!.high}
                  </span>
                )}
                {securityData!.security!.moderate > 0 && (
                  <span className="px-2 py-1 rounded bg-orange-500 text-white text-sm">
                    Moderate: {securityData!.security!.moderate}
                  </span>
                )}
                {securityData!.security!.low > 0 && (
                  <span className="px-2 py-1 rounded bg-yellow-500 text-white text-sm">
                    Low: {securityData!.security!.low}
                  </span>
                )}
              </div>
              <div className="space-y-3 mt-4">
                {sortedVulns.map((vuln, idx) => (
                  <div
                    key={vuln.id ?? idx}
                    className={`bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border-l-4 ${severityBorderClass(vuln.severity)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-semibold">{vuln.title}</h4>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium text-white ${severityBadgeClass(vuln.severity)}`}
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
