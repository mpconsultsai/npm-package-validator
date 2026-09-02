import type { ReactNode } from "react";

function InfoCard({
  title,
  description,
  iconClassName,
  children,
}: {
  title: string;
  description: string;
  iconClassName: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
      <div className="flex items-center gap-2.5 mb-1.5 sm:mb-3 sm:block">
        <div className={`shrink-0 ${iconClassName} sm:mb-3`}>{children}</div>
        <h3 className="font-semibold text-base sm:text-lg leading-tight sm:mb-2">
          {title}
        </h3>
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-sm">{description}</p>
    </div>
  );
}

export function InfoCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
      <InfoCard
        title="Security Analysis"
        description="Check for vulnerabilities and security advisories"
        iconClassName="text-blue-600 dark:text-blue-400"
      >
        <svg
          className="w-6 h-6 sm:w-8 sm:h-8"
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
      </InfoCard>

      <InfoCard
        title="Quality Metrics"
        description="Evaluate maintenance, popularity, and code quality"
        iconClassName="text-green-600 dark:text-green-400"
      >
        <svg
          className="w-6 h-6 sm:w-8 sm:h-8"
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
      </InfoCard>

      <InfoCard
        title="AI-Powered"
        description="Get intelligent recommendations using Agentic AI"
        iconClassName="text-purple-600 dark:text-purple-400"
      >
        <svg
          className="w-6 h-6 sm:w-8 sm:h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </InfoCard>
    </div>
  );
}
