"use client";

import Link from "next/link";
import { useWatchlist, useWatchlistActions } from "@/lib/use-watchlist";
import {
  getWatchlistAlerts,
  type WatchlistEntry,
} from "@/lib/watchlist-store";

function formatCheckedAt(ts?: number): string {
  if (!ts) return "Not checked yet";
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Checked just now";
  if (mins < 60) return `Checked ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `Checked ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Checked ${days}d ago`;
}

function statusLine(entry: WatchlistEntry): string {
  const parts: string[] = [];
  const version = entry.fresh?.version ?? entry.summary?.version;
  const vulns =
    entry.fresh?.vulnerabilityCount ?? entry.summary?.vulnerabilityCount;
  const deprecated = entry.fresh?.deprecated ?? entry.summary?.deprecated;

  if (version) parts.push(`v${version}`);
  if (typeof vulns === "number") {
    parts.push(vulns === 0 ? "No known vulns" : `${vulns} vuln${vulns === 1 ? "" : "s"}`);
  }
  if (deprecated) parts.push("Deprecated");
  if (typeof entry.summary?.qualityScore === "number") {
    parts.push(`Quality ${entry.summary.qualityScore}/100`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Open to analyse";
}

function TrashIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function AlertBadges({ entry }: { entry: WatchlistEntry }) {
  const alerts = getWatchlistAlerts(entry);
  const chips: { label: string; className: string }[] = [];
  if (alerts.newVersion && entry.fresh?.version) {
    chips.push({
      label: `New v${entry.fresh.version}`,
      className:
        "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
    });
  }
  if (alerts.newVulns) {
    const n = entry.fresh?.vulnerabilityCount ?? 0;
    chips.push({
      label: `${n} vuln${n === 1 ? "" : "s"}`,
      className:
        "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
    });
  }
  if (alerts.newlyDeprecated) {
    chips.push({
      label: "Deprecated",
      className:
        "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100",
    });
  }

  if (chips.length === 0) return null;

  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${chip.className}`}
        >
          {chip.label}
        </span>
      ))}
    </span>
  );
}

export function WatchlistSection({
  embedded = false,
  checking = false,
}: {
  /** Compact list for the search-card Watchlist panel */
  embedded?: boolean;
  checking?: boolean;
}) {
  const entries = useWatchlist();
  const { remove } = useWatchlistActions();

  if (entries.length === 0) {
    if (!embedded) return null;
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 px-0.5 py-1">
        No packages watched yet. Use Watch on a package page to save it here.
      </p>
    );
  }

  const list = (
    <ul
      className={
        embedded
          ? "divide-y divide-gray-100 dark:divide-gray-700"
          : "bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-100 dark:divide-gray-700"
      }
    >
      {checking && (
        <li className="px-0.5 py-2 text-xs text-gray-500 dark:text-gray-400">
          Checking for updates…
        </li>
      )}
      {entries.map((entry) => (
        <li
          key={entry.name}
          className={`flex items-center gap-3 py-3 ${
            embedded ? "px-0.5 first:pt-1 last:pb-1" : "px-3 sm:px-4"
          }`}
        >
          <Link
            href={`/package/${encodeURIComponent(entry.name)}`}
            className="min-w-0 flex-1 hover:opacity-90"
          >
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {entry.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {statusLine(entry)}
              <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>
              {formatCheckedAt(entry.lastCheckedAt)}
            </p>
            <AlertBadges entry={entry} />
          </Link>
          <button
            type="button"
            onClick={() => remove(entry.name)}
            title={`Remove ${entry.name} from watchlist`}
            aria-label={`Remove ${entry.name} from watchlist`}
            className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-700/80 dark:hover:text-red-400"
          >
            <TrashIcon />
          </button>
        </li>
      ))}
    </ul>
  );

  if (embedded) return list;

  return (
    <section className="mb-4 sm:mb-8" aria-labelledby="watchlist-heading">
      <div className="mb-3">
        <h2
          id="watchlist-heading"
          className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white"
        >
          My watchlist
        </h2>
      </div>
      {list}
    </section>
  );
}

export function WatchToggle({
  packageName,
  summary,
  disabled = false,
}: {
  packageName: string;
  summary?: import("@/lib/watchlist-store").WatchlistSummary;
  disabled?: boolean;
}) {
  const watched = useWatchlist().some(
    (entry) => entry.name.toLowerCase() === packageName.toLowerCase(),
  );
  const { toggle } = useWatchlistActions();

  if (!packageName) return null;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => toggle(packageName, summary)}
      aria-pressed={watched}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
    >
      <svg
        className={`h-4 w-4 transition-colors ${
          watched
            ? "fill-amber-400 text-amber-400"
            : "fill-none text-gray-500 dark:text-gray-400"
        }`}
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
      {watched ? "Watching" : "Watch"}
    </button>
  );
}
