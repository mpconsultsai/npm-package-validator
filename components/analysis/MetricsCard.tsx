interface SecuritySummary {
  critical?: number;
  high?: number;
  moderate?: number;
  low?: number;
}

interface MetricsCardProps {
  metrics: {
    downloads: number;
    stars: number;
    openIssues: number;
    qualityScore: number;
    securityIssues: number;
    aiScore?: number;
  };
  security?: SecuritySummary | null;
  securityFilter: string | null;
  onSecurityFilterChange: (filter: string | null) => void;
  packageName?: string;
}

export function MetricsCard({
  metrics,
  security,
  securityFilter,
  onSecurityFilterChange,
  packageName,
}: MetricsCardProps) {
  return (
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
            {metrics.downloads.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            GitHub Stars
          </p>
          <p className="text-2xl font-bold">
            {metrics.stars.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Open Issues
          </p>
          <p className="text-2xl font-bold">
            {metrics.openIssues.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Quality Score
          </p>
          <p className="text-2xl font-bold">
            {metrics.qualityScore}/100
          </p>
        </div>
        {metrics.aiScore !== undefined && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI Score
            </p>
            <p className="text-2xl font-bold text-purple-600">
              {metrics.aiScore}/100
            </p>
          </div>
        )}
        <div className="col-span-2 md:col-span-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Security Issues
          </p>
          {metrics.securityIssues === 0 ? (
            <p className="text-2xl font-bold text-green-500">None</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {security?.critical && security.critical > 0 && (
                <button
                  onClick={() => onSecurityFilterChange("critical")}
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
                    {security.critical}
                  </span>
                </button>
              )}
              {security?.high && security.high > 0 && (
                <button
                  onClick={() => onSecurityFilterChange("high")}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                    securityFilter === "high"
                      ? "bg-red-500 ring-2 ring-red-400"
                      : "bg-red-400 hover:bg-red-500"
                  }`}
                >
                  <span className="text-xs font-medium text-white">High</span>
                  <span className="text-lg font-bold text-white">
                    {security.high}
                  </span>
                </button>
              )}
              {security?.moderate && security.moderate > 0 && (
                <button
                  onClick={() => onSecurityFilterChange("moderate")}
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
                    {security.moderate}
                  </span>
                </button>
              )}
              {security?.low && security.low > 0 && (
                <button
                  onClick={() => onSecurityFilterChange("low")}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                    securityFilter === "low"
                      ? "bg-yellow-500 ring-2 ring-yellow-400"
                      : "bg-yellow-400 hover:bg-yellow-500"
                  }`}
                >
                  <span className="text-xs font-medium text-white">Low</span>
                  <span className="text-lg font-bold text-white">
                    {security.low}
                  </span>
                </button>
              )}
            </div>
          )}
          {packageName && (
            <a
              href={`https://snyk.io/advisor/npm-package/${packageName}`}
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
  );
}
