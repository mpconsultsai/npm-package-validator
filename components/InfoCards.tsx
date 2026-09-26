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

function CardIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="w-6 h-6 sm:w-8 sm:h-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {children}
    </svg>
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
        <CardIcon>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </CardIcon>
      </InfoCard>

      <InfoCard
        title="Quality Metrics"
        description="Evaluate maintenance, popularity, bundle size, and code quality"
        iconClassName="text-green-600 dark:text-green-400"
      >
        <CardIcon>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </CardIcon>
      </InfoCard>

      <InfoCard
        title="AI-Powered"
        description="Get intelligent recommendations using Agentic AI"
        iconClassName="text-purple-600 dark:text-purple-400"
      >
        <CardIcon>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 2v4"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M22 4h-4"
          />
          <circle cx="4" cy="20" r="2" strokeWidth={2} />
        </CardIcon>
      </InfoCard>

      <InfoCard
        title="Dependencies"
        description="Map direct and peer deps as a graph or list"
        iconClassName="text-orange-600 dark:text-orange-400"
      >
        <CardIcon>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 8a3 3 0 100-6 3 3 0 000 6zm10 0a3 3 0 100-6 3 3 0 000 6zM7 22a3 3 0 100-6 3 3 0 000 6zm10-3a3 3 0 100-6 3 3 0 000 6zM9.5 7.5l5 2M9.5 16.5l5-2M7 10v4m10-5v3"
          />
        </CardIcon>
      </InfoCard>

      <InfoCard
        title="Visualisations"
        description="Track downloads, open issues, and trends over time"
        iconClassName="text-sky-600 dark:text-sky-400"
      >
        <CardIcon>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 17l6-6 4 4 8-8M14 7h7v7"
          />
        </CardIcon>
      </InfoCard>

      <InfoCard
        title="Related packages"
        description="Discover similar packages and compare side by side"
        iconClassName="text-teal-600 dark:text-teal-400"
      >
        <CardIcon>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </CardIcon>
      </InfoCard>
    </div>
  );
}
