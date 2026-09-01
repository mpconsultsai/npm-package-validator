import type { ReactNode } from "react";
import {
  SecuritySeverityBadges,
  hasHighRiskSecurityIssues,
  type SecurityCountSummary,
} from "./SecuritySeverityBadges";

export type AnalysisTabId = "ai" | "version" | "related";

interface AnalysisTabsProps {
  active: AnalysisTabId;
  onChange: (tab: AnalysisTabId) => void;
  versionAvailable: boolean;
  aiModel?: string;
  security?: SecurityCountSummary | null;
}

function TabIconSpark() {
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
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

function TabIconShield() {
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
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function TabIconPackages() {
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
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      />
    </svg>
  );
}

export function AnalysisTabs({
  active,
  onChange,
  versionAvailable,
  aiModel,
  security,
}: AnalysisTabsProps) {
  const tabs: {
    id: AnalysisTabId;
    label: string;
    icon: ReactNode;
    detail?: string;
    disabled?: boolean;
  }[] = [
    {
      id: "ai",
      label: "AI analysis",
      icon: <TabIconSpark />,
      detail: aiModel,
    },
    {
      id: "version",
      label: "Version check",
      icon: <TabIconShield />,
      disabled: !versionAvailable,
    },
    { id: "related", label: "Related packages", icon: <TabIconPackages /> },
  ];

  return (
    <div
      role="tablist"
      aria-label="Package analysis sections"
      className="flex gap-1 p-1 bg-gray-200/80 dark:bg-gray-700/80 rounded-xl"
    >
      {tabs.map((tab) => {
        const selected = active === tab.id;
        const showSecurity = tab.id === "ai";
        const highRisk = showSecurity && hasHighRiskSecurityIssues(security);
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={`flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              selected
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            } disabled:opacity-40 disabled:cursor-not-allowed ${
              highRisk && !selected ? "ring-2 ring-red-400/70 dark:ring-red-500/60" : ""
            }`}
          >
            {tab.icon}
            <span className="min-w-0 truncate">
              {tab.label}
              {tab.detail && (
                <span className="font-normal text-xs opacity-70 ml-1.5 hidden lg:inline">
                  {tab.detail}
                </span>
              )}
            </span>
            {showSecurity && (
              <SecuritySeverityBadges security={security} size="tab" />
            )}
          </button>
        );
      })}
    </div>
  );
}
