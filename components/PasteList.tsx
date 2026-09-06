"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import semver from "semver";
import { fetchJson } from "@/lib/fetch-client";
import {
  parseDependencyList,
  PASTE_LIST_MAX_PACKAGES,
} from "@/lib/parse-dependency-list";
import { describeDependencySpec } from "@/lib/describe-dependency-spec";
import { useWatchlistActions } from "@/lib/use-watchlist";
import type { WatchlistSummary } from "@/lib/watchlist-store";

type RowStatus = "pending" | "loading" | "done" | "error";

interface AnalysisRow {
  name: string;
  requested?: string;
  status: RowStatus;
  version?: string;
  updateAvailable?: boolean;
  vulnerabilityCount?: number;
  qualityScore?: number;
  deprecated?: boolean;
  error?: string;
}

const CONCURRENCY = 3;

function summaryFromRow(row: AnalysisRow): WatchlistSummary {
  return {
    version: row.version,
    vulnerabilityCount: row.vulnerabilityCount,
    qualityScore: row.qualityScore,
    deprecated: row.deprecated,
  };
}

/** True when npm latest is newer than the pasted constraint / locked version. */
export function isUpdateAvailable(
  requested: string | undefined,
  latest: string | undefined,
): boolean {
  if (!requested || !latest) return false;
  const spec = requested.trim();
  if (!spec || spec === "*" || spec === "latest") return false;
  if (/^(workspace|file|link|portal|git|http|https|ssh|github|gist|bitbucket|gitlab):/i.test(spec)) {
    return false;
  }

  const latestClean = semver.clean(latest) ?? (semver.valid(latest) ? latest : null);
  if (!latestClean) return false;

  const exact = semver.clean(spec) ?? (semver.valid(spec) ? spec : null);
  if (exact) return semver.gt(latestClean, exact);

  try {
    const min = semver.minVersion(spec);
    if (min) return semver.gt(latestClean, min.version);
  } catch {
    // ignore invalid ranges
  }
  return false;
}

function SpecifiedCell({ requested }: { requested?: string }) {
  if (!requested) return "—";
  const desc = describeDependencySpec(requested);
  return (
    <span className="block">
      <span className="font-mono text-xs">{requested}</span>
      {desc && (
        <span className="mt-0.5 block text-[11px] leading-snug text-gray-500 dark:text-gray-400">
          {desc.detail}
        </span>
      )}
    </span>
  );
}

export function PasteListPanel() {
  const headingId = useId();
  const textareaId = useId();
  const { add } = useWatchlistActions();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<AnalysisRow[]>([]);
  const [meta, setMeta] = useState<{
    invalidCount: number;
    truncated: boolean;
    source: string;
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      cancelledRef.current = true;
    };
  }, []);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    abortRef.current?.abort();
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setText("");
    setRows([]);
    setMeta(null);
    setDoneCount(0);
  }, [stop]);

  const analyseList = useCallback(async () => {
    const parsed = parseDependencyList(text);
    setMeta({
      invalidCount: parsed.invalidCount,
      truncated: parsed.truncated,
      source: parsed.source,
    });

    if (parsed.entries.length === 0) {
      setRows([]);
      setDoneCount(0);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    cancelledRef.current = false;
    setRunning(true);
    setDoneCount(0);

    const initial: AnalysisRow[] = parsed.entries.map((entry) => ({
      name: entry.name,
      requested: entry.requested,
      status: "pending",
    }));
    setRows(initial);

    let cursor = 0;
    let completed = 0;

    const workers = Array.from(
      { length: Math.min(CONCURRENCY, initial.length) },
      async () => {
        while (!cancelledRef.current) {
          const index = cursor++;
          if (index >= initial.length) return;
          const entry = initial[index];

          setRows((prev) =>
            prev.map((row, i) =>
              i === index ? { ...row, status: "loading" } : row,
            ),
          );

          try {
            const { ok, data } = await fetchJson<any>(
              `/api/analyze?package=${encodeURIComponent(entry.name)}`,
              {
                signal: controller.signal,
                timeoutMs: 60_000,
                retries: 2,
                retryDelayMs: 1500,
              },
            );

            if (cancelledRef.current || controller.signal.aborted) return;

            if (!ok) {
              setRows((prev) =>
                prev.map((row, i) =>
                  i === index
                    ? {
                        ...row,
                        status: "error",
                        error: data?.error || "Analysis failed",
                      }
                    : row,
                ),
              );
            } else {
              const latest = data?.packageInfo?.latestVersion as
                | string
                | undefined;
              setRows((prev) =>
                prev.map((row, i) =>
                  i === index
                    ? {
                        ...row,
                        status: "done",
                        version: latest,
                        updateAvailable: isUpdateAvailable(
                          entry.requested,
                          latest,
                        ),
                        vulnerabilityCount: data?.security?.totalCount,
                        qualityScore: data?.metrics?.qualityScore,
                        deprecated: Boolean(data?.npm?.deprecated),
                      }
                    : row,
                ),
              );
            }
          } catch (err: unknown) {
            if (controller.signal.aborted || cancelledRef.current) return;
            setRows((prev) =>
              prev.map((row, i) =>
                i === index
                  ? {
                      ...row,
                      status: "error",
                      error:
                        err instanceof Error ? err.message : "Request failed",
                    }
                  : row,
              ),
            );
          }

          completed += 1;
          setDoneCount(completed);
        }
      },
    );

    await Promise.all(workers);
    if (!cancelledRef.current) setRunning(false);
  }, [text]);

  const flagged = rows.filter(
    (row) =>
      row.status === "done" &&
      (Boolean(row.deprecated) ||
        (row.vulnerabilityCount ?? 0) > 0 ||
        Boolean(row.updateAvailable)),
  );
  const doneRows = rows.filter((row) => row.status === "done");
  const updateCount = rows.filter((row) => row.updateAvailable).length;

  const addRowsToWatchlist = (targets: AnalysisRow[]) => {
    for (const row of targets) {
      add(row.name, summaryFromRow(row));
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-gray-900 dark:text-white"
        >
          Analyse package.json
        </label>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          package.json, package-lock.json, yarn.lock, or a list of package names
          (max {PASTE_LIST_MAX_PACKAGES}).
        </p>
        <textarea
          id={textareaId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          spellCheck={false}
          placeholder={`{\n  "dependencies": {\n    "react": "^19.0.0",\n    "lodash": "^4.17.21"\n  }\n}`}
          className="mt-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white px-3 py-2 font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-inset focus:ring-blue-500/30 dark:focus:border-blue-400"
          disabled={running}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void analyseList()}
          disabled={running || !text.trim()}
          className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {running ? "Analysing…" : "Analyse list"}
        </button>
        {running && (
          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        )}
        {(text.trim() || rows.length > 0 || meta) && !running && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Reset
          </button>
        )}
        {doneRows.length > 0 && !running && (
          <>
            <button
              type="button"
              onClick={() => addRowsToWatchlist(doneRows)}
              className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Add all to watchlist
            </button>
            {flagged.length > 0 && (
              <button
                type="button"
                onClick={() => addRowsToWatchlist(flagged)}
                className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Add flagged ({flagged.length})
              </button>
            )}
          </>
        )}
      </div>

      {meta && rows.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No valid package names found
          {meta.invalidCount > 0 ? ` (${meta.invalidCount} invalid skipped)` : ""}.
        </p>
      )}

      {rows.length > 0 && (
        <div>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3
              id={headingId}
              className="text-sm font-medium text-gray-900 dark:text-white"
            >
              Results
            </h3>
            <p
              className="text-xs text-gray-500 dark:text-gray-400"
              aria-live="polite"
            >
              {running
                ? `Analysed ${doneCount} of ${rows.length}`
                : `${doneRows.length} of ${rows.length} complete`}
              {!running && updateCount > 0
                ? ` · ${updateCount} update${updateCount === 1 ? "" : "s"} available`
                : ""}
              {meta?.truncated ? ` · capped at ${PASTE_LIST_MAX_PACKAGES}` : ""}
              {meta && meta.invalidCount > 0
                ? ` · ${meta.invalidCount} invalid skipped`
                : ""}
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table
              className="min-w-full text-left text-sm"
              aria-labelledby={headingId}
            >
              <thead className="bg-gray-50 dark:bg-gray-900/40 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Package</th>
                  <th className="px-3 py-2 font-semibold">Specified</th>
                  <th className="px-3 py-2 font-semibold">Latest</th>
                  <th className="px-3 py-2 font-semibold">Vulns</th>
                  <th className="px-3 py-2 font-semibold">Quality</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((row) => (
                  <tr key={row.name} className="bg-white dark:bg-gray-800">
                    <td className="px-3 py-2">
                      <Link
                        href={`/package/${encodeURIComponent(row.name)}`}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {row.name}
                      </Link>
                      {row.deprecated && (
                        <span className="ml-2 inline-flex rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-orange-900 dark:bg-orange-900/40 dark:text-orange-100">
                          Deprecated
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      <SpecifiedCell requested={row.requested} />
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      {row.version && row.version !== "Unknown" ? (
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          <span className="tabular-nums">v{row.version}</span>
                          {row.updateAvailable && (
                            <span className="inline-flex rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
                              Update
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {typeof row.vulnerabilityCount === "number" ? (
                        <span
                          className={
                            row.vulnerabilityCount > 0
                              ? "font-medium text-red-700 dark:text-red-300"
                              : "text-gray-700 dark:text-gray-300"
                          }
                        >
                          {row.vulnerabilityCount}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300 tabular-nums">
                      {typeof row.qualityScore === "number"
                        ? `${row.qualityScore}/100`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                      {row.status === "pending" && "Queued"}
                      {row.status === "loading" && "Analysing…"}
                      {row.status === "done" && "Done"}
                      {row.status === "error" && (
                        <span className="text-red-600 dark:text-red-400">
                          {row.error || "Error"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
