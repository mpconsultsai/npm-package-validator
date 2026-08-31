import { snykPackageUrl } from "@/lib/utils/advisory-links";
import { SnykIcon } from "@/components/BrandIcons";

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
              href={snykPackageUrl(packageName)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              <SnykIcon className="w-5 h-5 shrink-0" />
              View on Snyk
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
