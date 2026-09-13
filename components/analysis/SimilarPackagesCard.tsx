"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { fetchJson } from "@/lib/fetch-client";
import {
  snapshotFromAnalysis,
  type CompareColumn,
} from "@/lib/package-compare";
import { PackageCompareTable } from "./PackageCompareTable";

const COMPARE_CAP = 2;

/** Solid trophy — AI-named competitor. */
const CompetitorIcon = () => (
  <span
    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white dark:bg-indigo-500"
    title="Named as a competitor"
  >
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6.75 3A1.75 1.75 0 005 4.75V7a5 5 0 003.75 4.843V13.5H7.5a.75.75 0 000 1.5h5a.75.75 0 000-1.5h-1.25v-1.657A5 5 0 0015 7V4.75A1.75 1.75 0 0013.25 3h-6.5zM6.5 4.75c0-.138.112-.25.25-.25h6.5c.138 0 .25.112.25.25V7a3.5 3.5 0 11-7 0V4.75zM3.4 5.15a.75.75 0 00-1.3.75C2.55 7.2 3.7 8.4 5.2 8.85A6.4 6.4 0 014.5 7V5.7c-.4.15-.8.45-1.1.85zM16.6 5.15a.75.75 0 011.3.75c-.45 1.3-1.6 2.5-3.1 2.95A6.4 6.4 0 0015.5 7V5.7c.4.15.8.45 1.1.85zM6 16.75A.75.75 0 016.75 16h6.5a.75.75 0 010 1.5h-6.5A.75.75 0 016 16.75z" />
    </svg>
    <span className="sr-only">Competitor</span>
  </span>
);

interface SimilarPackage {
  name: string;
  description: string;
  version: string;
  competitor?: boolean;
}

interface SimilarPackagesCardProps {
  packageName: string;
  /** Pass when available from analysis to avoid extra API work */
  keywords?: string[] | null;
  /** AI-named alternative packages */
  competitors?: string[] | null;
  current?: CompareColumn | null;
}

function RelatedPackagesSkeleton() {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6"
      role="status"
    >
      <span className="sr-only">Loading related packages</span>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        aria-hidden="true"
      >
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="mt-2 h-3 w-14 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="mt-3 h-3 w-full rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="mt-2 h-3 w-5/6 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SimilarPackagesCard({
  packageName,
  keywords,
  competitors,
  current,
}: SimilarPackagesCardProps) {
  const keywordsKey = (keywords ?? []).join(",");
  const competitorsKey = (competitors ?? []).join(",");
  const [packages, setPackages] = useState<SimilarPackage[]>([]);
  const [loading, setLoading] = useState(Boolean(packageName));
  const [selected, setSelected] = useState<string[]>([]);
  const [fetched, setFetched] = useState<Record<string, CompareColumn>>({});
  const fetchedRef = useRef(fetched);
  fetchedRef.current = fetched;
  const compareAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSelected([]);
    setFetched({});
    compareAbortRef.current?.abort();
    compareAbortRef.current = new AbortController();
    return () => {
      compareAbortRef.current?.abort();
    };
  }, [packageName]);

  useEffect(() => {
    if (!packageName) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ package: packageName });
    if (keywordsKey) params.set("keywords", keywordsKey);
    if (competitorsKey) params.set("competitors", competitorsKey);

    setLoading(true);
    const load = async () => {
      try {
        const { ok, data } = await fetchJson<{ packages?: SimilarPackage[] }>(
          `/api/similar-packages?${params}`,
          { signal: controller.signal, timeoutMs: 45_000, retries: 3 },
        );
        if (controller.signal.aborted) return;
        setPackages(ok ? (data.packages ?? []) : []);
      } catch {
        if (controller.signal.aborted) return;
        setPackages([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();

    return () => {
      controller.abort();
    };
  }, [packageName, keywordsKey, competitorsKey]);

  const selectedKey = selected.join("\0");

  useEffect(() => {
    const names = selectedKey ? selectedKey.split("\0") : [];
    const missing = names.filter((name) => {
      const column = fetchedRef.current[name];
      return !column || column.status === "error";
    });
    if (missing.length === 0) return;

    const signal = compareAbortRef.current?.signal;
    setFetched((prev) =>
      missing.reduce(
        (acc, name) => ({
          ...acc,
          [name]: { name, status: "loading" as const },
        }),
        prev,
      ),
    );

    const loadOne = async (name: string) => {
      try {
        const { ok, data } = await fetchJson(
          `/api/analyze?package=${encodeURIComponent(name)}`,
          {
            signal,
            timeoutMs: 60_000,
            retries: 2,
            retryDelayMs: 1500,
          },
        );
        if (signal?.aborted) return;
        if (!ok) {
          setFetched((prev) => ({
            ...prev,
            [name]: {
              name,
              status: "error",
              error: "Analysis failed",
            },
          }));
          return;
        }
        setFetched((prev) => ({
          ...prev,
          [name]: snapshotFromAnalysis(data, name),
        }));
      } catch {
        if (signal?.aborted) return;
        setFetched((prev) => ({
          ...prev,
          [name]: { name, status: "error", error: "Analysis failed" },
        }));
      }
    };

    void Promise.all(missing.slice(0, COMPARE_CAP).map(loadOne));
  }, [selectedKey]);

  const toggle = (name: string) => {
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((item) => item !== name);
      if (prev.length >= COMPARE_CAP) return prev;
      return [...prev, name];
    });
  };

  const compareColumns = useMemo(() => {
    if (!current || selected.length === 0) return [];
    const others = selected.map(
      (name) => fetched[name] ?? { name, status: "loading" as const },
    );
    return [current, ...others];
  }, [current, selected, fetched]);

  const atCap = selected.length >= COMPARE_CAP;

  if (loading) {
    return <RelatedPackagesSkeleton />;
  }

  if (packages.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No related packages found.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        {atCap && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Compare up to 2 packages
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => {
            const checked = selected.includes(pkg.name);
            const disabled = atCap && !checked;
            const compareId = `compare-${pkg.name.replace(/[^A-Za-z0-9_-]/g, "-")}`;
            return (
              <div
                key={pkg.name}
                className="rounded-lg border border-gray-200 dark:border-gray-600 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2">
                    <Link
                      href={`/package/${encodeURIComponent(pkg.name)}`}
                      className="font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2 truncate"
                    >
                      {pkg.name}
                    </Link>
                    {pkg.competitor && <CompetitorIcon />}
                  </div>
                  <label
                    htmlFor={compareId}
                    className={`inline-flex shrink-0 items-center gap-1.5 text-xs ${
                      disabled
                        ? "cursor-not-allowed text-gray-400 dark:text-gray-500"
                        : "cursor-pointer text-gray-600 dark:text-gray-300"
                    }`}
                    title={
                      disabled
                        ? "Compare up to 2 packages"
                        : `Compare ${pkg.name}`
                    }
                  >
                    <input
                      id={compareId}
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(pkg.name)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                    />
                    Compare
                  </label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-1">
                  v{pkg.version}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {pkg.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {compareColumns.length > 1 && (
        <PackageCompareTable
          columns={compareColumns}
          onClear={() => setSelected([])}
        />
      )}
    </div>
  );
}
