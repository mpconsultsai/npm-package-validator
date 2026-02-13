interface Vulnerability {
  title: string;
  severity: string;
  description: string;
  id: string;
  vulnerableVersionRange?: string;
  patchedVersions?: string;
  url?: string;
}

interface SecurityVulnerabilitiesCardProps {
  vulnerabilities: Vulnerability[];
  securityFilter: string | null;
  onClose: () => void;
}

export function SecurityVulnerabilitiesCard({
  vulnerabilities,
  securityFilter,
  onClose,
}: SecurityVulnerabilitiesCardProps) {
  const filtered = securityFilter
    ? vulnerabilities.filter((v) => v.severity === securityFilter)
    : vulnerabilities;

  return (
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
          onClick={onClose}
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
        {filtered.map((vuln, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-red-500"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg">{vuln.title}</h3>
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
                  <strong>Vulnerable:</strong> {vuln.vulnerableVersionRange}
                </span>
              )}
              {vuln.patchedVersions && vuln.patchedVersions !== "none" && (
                <span className="text-green-500 dark:text-green-400 font-semibold">
                  <strong>Fixed in:</strong> {vuln.patchedVersions}
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
  );
}
