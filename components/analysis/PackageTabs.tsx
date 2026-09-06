import type { ReactNode } from "react";
import {
  SecuritySeverityBadges,
  type SecurityCountSummary,
} from "./SecuritySeverityBadges";

export type AnalysisTabId = "ai" | "info" | "security";
export type DetailsTabId = "metrics" | "charts" | "related";

type TabDef<T extends string> = {
  id: T;
  label: string;
  shortLabel: string;
  icon: ReactNode;
  detail?: string;
};

function TabIconSparkles() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 2v4" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 4h-4" />
      <circle cx="4" cy="20" r="2" strokeWidth={2} />
    </svg>
  );
}

function TabIconBox() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function TabIconShield() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function TabIconBars() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function TabIconTrend() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17l6-6 4 4 8-8M14 7h7v7" />
    </svg>
  );
}

function TabIconPackages() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function TabRow<T extends string>({
  label,
  tabs,
  active,
  onChange,
  security,
}: {
  label: string;
  tabs: TabDef<T>[];
  active: T;
  onChange: (tab: T) => void;
  security?: SecurityCountSummary | null;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 p-1 bg-gray-200/80 dark:bg-gray-700/80 rounded-xl"
    >
      {tabs.map((tab) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={tab.label}
            onClick={() => onChange(tab.id)}
            className={`flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
              selected
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {tab.icon}
            <span className="truncate sm:hidden">{tab.shortLabel}</span>
            <span className="min-w-0 truncate hidden sm:inline">
              {tab.label}
              {tab.detail && (
                <span className="font-normal text-xs opacity-70 ml-1.5 hidden lg:inline">
                  {tab.detail}
                </span>
              )}
            </span>
            {tab.id === "security" && (
              <SecuritySeverityBadges security={security} size="tab" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Top row: AI analysis, Info, Security */
export function AnalysisTabs({
  active,
  onChange,
  aiModel,
  security,
  showAi = true,
}: {
  active: AnalysisTabId;
  onChange: (tab: AnalysisTabId) => void;
  aiModel?: string;
  security?: SecurityCountSummary | null;
  showAi?: boolean;
}) {
  const tabs: TabDef<AnalysisTabId>[] = [
    ...(showAi
      ? [
          {
            id: "ai" as const,
            label: "AI analysis",
            shortLabel: "AI",
            icon: <TabIconSparkles />,
            detail: aiModel,
          },
        ]
      : []),
    { id: "info", label: "Package info", shortLabel: "Info", icon: <TabIconBox /> },
    {
      id: "security",
      label: "Security",
      shortLabel: "Security",
      icon: <TabIconShield />,
    },
  ];

  return (
    <TabRow
      label="Package analysis"
      tabs={tabs}
      active={active}
      onChange={onChange}
      security={security}
    />
  );
}

/** Bottom row: Metrics, Charts, Related */
export function DetailsTabs({
  active,
  onChange,
}: {
  active: DetailsTabId;
  onChange: (tab: DetailsTabId) => void;
}) {
  const tabs: TabDef<DetailsTabId>[] = [
    { id: "metrics", label: "Metrics", shortLabel: "Metrics", icon: <TabIconBars /> },
    { id: "charts", label: "Charts", shortLabel: "Charts", icon: <TabIconTrend /> },
    {
      id: "related",
      label: "Related packages",
      shortLabel: "Related",
      icon: <TabIconPackages />,
    },
  ];

  return (
    <TabRow
      label="Metrics and related"
      tabs={tabs}
      active={active}
      onChange={onChange}
    />
  );
}
