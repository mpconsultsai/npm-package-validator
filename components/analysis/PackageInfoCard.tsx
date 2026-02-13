import { formatDaysSinceRelease } from "@/lib/utils/format";

interface PackageInfo {
  name: string;
  latestVersion?: string;
  version?: string;
  license: string;
  description?: string;
  npmUrl: string;
  daysSinceLastRelease?: number | null;
  dependents?: number;
}

interface PackageInfoCardProps {
  packageInfo: PackageInfo;
}

export function PackageInfoCard({ packageInfo }: PackageInfoCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="font-bold text-2xl mb-6 flex items-center gap-2">
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
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
        Package Info
      </h2>
      {packageInfo.description && (
        <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-600">
          {packageInfo.dependents !== undefined &&
            packageInfo.dependents >= 1000 && (
              <span className="inline-block px-3 py-1 mb-3 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                Popular
              </span>
            )}
          <p className="text-gray-700 dark:text-gray-300">
            {packageInfo.description}
          </p>
        </div>
      )}
      {packageInfo.dependents !== undefined &&
        packageInfo.dependents >= 1000 &&
        !packageInfo.description && (
          <span className="inline-block px-3 py-1 mb-6 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            Popular
          </span>
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
            {packageInfo.name}
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

        {packageInfo.daysSinceLastRelease !== null &&
          packageInfo.daysSinceLastRelease !== undefined && (
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
                {formatDaysSinceRelease(packageInfo.daysSinceLastRelease)}
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
              License
            </span>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {packageInfo.license}
          </p>
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

        <div className="md:col-span-2">
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
        </div>
      </div>
    </div>
  );
}
