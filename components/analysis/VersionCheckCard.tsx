interface VersionVuln {
  title: string;
  severity: string;
  description: string;
  url?: string;
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

  return (
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
        Check security advisories for a specific version
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
                {versionSecurityData.security!.totalCount} vulnerability
                {versionSecurityData.security!.totalCount !== 1 ? "ies" : ""}{" "}
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
                {versionSecurityData.security!.vulnerabilities.map(
                  (vuln: VersionVuln, idx: number) => (
                    <div
                      key={idx}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border-l-4 border-red-500"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold">{vuln.title}</h4>
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
  );
}
