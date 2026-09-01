import type { ReactNode } from "react";
import {
  SecuritySeverityBadges,
  hasHighRiskSecurityIssues,
  type SecurityCountSummary,
} from "./SecuritySeverityBadges";

export type OverviewTabId = "info" | "metrics" | "charts";

interface OverviewTabsProps {
  active: OverviewTabId;
  onChange: (tab: OverviewTabId) => void;
  security?: SecurityCountSummary | null;
}

function TabIconBox() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}

function TabIconBars() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function TabIconTrend() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 17l6-6 4 4 8-8M14 7h7v7"
      />
    </svg>
  );
}

export function OverviewTabs({ active, onChange, security }: OverviewTabsProps) {
  const tabs: { id: OverviewTabId; label: string; icon: ReactNode }[] = [
    { id: "info", label: "Package info", icon: <TabIconBox /> },
    { id: "metrics", label: "Metrics", icon: <TabIconBars /> },
    { id: "charts", label: "Charts", icon: <TabIconTrend /> },
  ];

  return (
    <div
      role="tablist"
      aria-label="Package overview"
      className="flex gap-1 p-1 bg-gray-200/80 dark:bg-gray-700/80 rounded-xl"
    >
      {tabs.map((tab) => {
        const selected = active === tab.id;
        const showSecurity = tab.id === "metrics";
        const highRisk = showSecurity && hasHighRiskSecurityIssues(security);
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              selected
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            } ${highRisk && !selected ? "ring-2 ring-red-400/70 dark:ring-red-500/60" : ""}`}
          >
            {tab.icon}
            <span className="truncate">{tab.label}</span>
            {showSecurity && (
              <SecuritySeverityBadges security={security} size="tab" />
            )}
          </button>
        );
      })}
    </div>
  );
}
