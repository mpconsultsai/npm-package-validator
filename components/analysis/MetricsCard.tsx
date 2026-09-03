import { formatBytes } from "@/lib/utils/format";

interface MetricsCardProps {
  metrics: {
    downloads: number;
    stars: number;
    openIssues: number;
    qualityScore: number;
    bundleSize?: number;
    bundleGzip?: number;
  };
}

export function MetricsCard({ metrics }: MetricsCardProps) {
  const hasBundleSize =
    metrics.bundleSize !== undefined && metrics.bundleGzip !== undefined;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-6 sm:gap-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Downloads (month)
          </p>
          <p className="text-2xl font-bold break-words">
            {metrics.downloads.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            GitHub Stars
          </p>
          <p className="text-2xl font-bold break-words">
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
      </div>
    </div>
  );
}
