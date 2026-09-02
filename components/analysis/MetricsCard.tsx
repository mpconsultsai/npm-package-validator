import { snykPackageUrl } from "@/lib/utils/advisory-links";
import { formatBytes } from "@/lib/utils/format";
import {
  aiScoreTextClass,
  isHighQualityAiScore,
} from "@/lib/utils/ai-score";
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
    bundleSize?: number;
    bundleGzip?: number;
  };
  security?: SecuritySummary | null;
  securityFilter: string | null;
  onSecurityFilterChange: (filter: string | null) => void;
  packageName?: string;
}

const SEVERITY_LEVELS = [
  {
    key: "critical" as const,
    label: "Critical",
    activeClass: "bg-purple-500 ring-2 ring-purple-400",
    inactiveClass: "bg-purple-400 hover:bg-purple-500",
  },
  {
    key: "high" as const,
    label: "High",
    activeClass: "bg-red-500 ring-2 ring-red-400",
    inactiveClass: "bg-red-400 hover:bg-red-500",
  },
  {
    key: "moderate" as const,
    label: "Moderate",
    activeClass: "bg-orange-500 ring-2 ring-orange-400",
    inactiveClass: "bg-orange-400 hover:bg-orange-500",
  },
  {
    key: "low" as const,
    label: "Low",
    activeClass: "bg-yellow-500 ring-2 ring-yellow-400",
    inactiveClass: "bg-yellow-400 hover:bg-yellow-500",
  },
];

function severityCount(
  security: SecuritySummary | null | undefined,
  key: (typeof SEVERITY_LEVELS)[number]["key"],
): number {
  const value = security?.[key];
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

export function MetricsCard({
  metrics,
  security,
  securityFilter,
  onSecurityFilterChange,
  packageName,
}: MetricsCardProps) {
  const visibleSeverities = SEVERITY_LEVELS.map((level) => ({
    ...level,
    count: severityCount(security, level.key),
  })).filter((level) => level.count > 0);

  const hasBundleSize =
    metrics.bundleSize !== undefined && metrics.bundleGzip !== undefined;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
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
          <p className="text-2xl font-bold">{metrics.qualityScore}/100</p>
        </div>
        {metrics.aiScore !== undefined && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">AI Score</p>
            <p
              className={`text-2xl font-bold inline-flex items-center gap-1 ${aiScoreTextClass(metrics.aiScore)}`}
            >
              {metrics.aiScore}/100
              {isHighQualityAiScore(metrics.aiScore) && (
                <span
                  className="text-amber-400 dark:text-amber-300"
                  title="High-quality package"
                  aria-label="High-quality package"
                >
                  ★
                </span>
              )}
            </p>
          </div>
        )}
        {hasBundleSize && (
          <>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Bundle (min)
              </p>
              <p className="text-2xl font-bold">
                {formatBytes(metrics.bundleSize!)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Bundle (gzip)
              </p>
              <p className="text-2xl font-bold">
                {formatBytes(metrics.bundleGzip!)}
              </p>
            </div>
          </>
        )}
        {visibleSeverities.length > 0 && (
          <div className="col-span-2 md:col-span-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Security Issues
            </p>
            <div className="flex gap-2 flex-wrap">
              {visibleSeverities.map((level) => (
                <button
                  key={level.key}
                  type="button"
                  onClick={() => onSecurityFilterChange(level.key)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                    securityFilter === level.key
                      ? level.activeClass
                      : level.inactiveClass
                  }`}
                >
                  <span className="text-xs font-medium text-white">
                    {level.label}
                  </span>
                  <span className="text-lg font-bold text-white">
                    {level.count}
                  </span>
                </button>
              ))}
            </div>
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
        )}
      </div>
    </div>
  );
}
