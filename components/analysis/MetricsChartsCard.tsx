"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactNumber, formatPublishDate } from "@/lib/utils/format";
import { fetchJson } from "@/lib/fetch-client";
import {
  buildReleaseCadence,
  buildReleaseTypeMix,
  type ReleaseTypeMixResult,
} from "@/lib/release-cadence";

interface ChartPoint {
  date: string;
  value: number;
}

interface ChartsPayload {
  downloads: ChartPoint[];
  issues: ChartPoint[];
}

function formatTickDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function formatTooltipDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

function MetricLineChart({
  title,
  color,
  points,
  empty,
  seriesName = "Current",
  compareName,
  compareColor = "#8b5cf6",
  comparePoints,
}: {
  title: string;
  color: string;
  points: ChartPoint[];
  empty: string;
  seriesName?: string;
  compareName?: string | null;
  compareColor?: string;
  comparePoints?: ChartPoint[];
}) {
  const showCompare = Boolean(
    compareName && comparePoints && comparePoints.length > 0,
  );

  const data = useMemo(() => {
    const primaryMap = new Map(points.map((p) => [p.date, p.value]));
    const compareMap = new Map(
      (comparePoints ?? []).map((p) => [p.date, p.value]),
    );
    const dates = new Set<string>([
      ...primaryMap.keys(),
      ...(showCompare ? compareMap.keys() : []),
    ]);

    return [...dates]
      .sort((a, b) => a.localeCompare(b))
      .map((date) => ({
        date,
        value: primaryMap.get(date) ?? null,
        compare: showCompare ? (compareMap.get(date) ?? null) : null,
      }));
  }, [points, comparePoints, showCompare]);

  return (
    <div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
        {title}
      </p>
      {points.length < 2 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-8">
          {empty}
        </p>
      ) : (
        <>
          {showCompare && (
            <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
              <li className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-0.5 w-3 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                {seriesName}
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-0.5 w-3 rounded-full"
                  style={{ backgroundColor: compareColor }}
                  aria-hidden="true"
                />
                {compareName}
              </li>
            </ul>
          )}
          <div className="h-52 w-full overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                key={`downloads-${compareName ?? "solo"}`}
                data={data}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#6b7280"
                  opacity={0.25}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={28}
                  tickFormatter={formatTickDate}
                />
                <YAxis
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v: number) => formatCompactNumber(v)}
                />
                <Tooltip
                  formatter={(value, name) => [
                    typeof value === "number"
                      ? value.toLocaleString()
                      : String(value ?? ""),
                    name === "compare" ? compareName || "Compare" : seriesName,
                  ]}
                  labelFormatter={(label) =>
                    typeof label === "string"
                      ? new Date(`${label}T00:00:00`).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )
                      : ""
                  }
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: 8,
                    color: "#f3f4f6",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="value"
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                  isAnimationActive={false}
                />
                {showCompare && (
                  <Line
                    type="monotone"
                    dataKey="compare"
                    name="compare"
                    stroke={compareColor}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

/** Histogram of publishes per month — right chart for release cadence. */
function ReleaseCadenceChart({ points }: { points: ChartPoint[] }) {
  const data = points.map((p) => ({
    ...p,
    label: formatTickDate(p.date),
  }));
  const total = points.reduce((sum, p) => sum + p.value, 0);

  return (
    <div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
        Release cadence
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        npm publishes per month
        {total > 0 ? ` · ${total.toLocaleString()} in view` : ""}
      </p>
      {data.length < 1 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-8">
          No release history available.
        </p>
      ) : (
        <div className="h-52 w-full overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#6b7280" opacity={0.25} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip
                formatter={(value) => [
                  typeof value === "number"
                    ? `${value} release${value === 1 ? "" : "s"}`
                    : String(value ?? ""),
                  "Published",
                ]}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.date
                    ? formatTooltipDate(payload[0].payload.date)
                    : ""
                }
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  color: "#f3f4f6",
                }}
              />
              <Bar
                dataKey="value"
                fill="#8b5cf6"
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/**
 * Overall major/minor/patch share — clearer for adoption decisions than
 * monthly stacked bars.
 */
function ReleaseTypeMixChart({ mix }: { mix: ReleaseTypeMixResult }) {
  const { totals, recentMajors } = mix;
  if (totals.all < 1) {
    return (
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          Release type mix
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
          No stable release history available.
        </p>
      </div>
    );
  }

  const pct = (n: number) => Math.round((n / totals.all) * 100);
  const segments = [
    {
      key: "major" as const,
      label: "Major",
      count: totals.major,
      swatch: "bg-blue-900",
    },
    {
      key: "minor" as const,
      label: "Minor",
      count: totals.minor,
      swatch: "bg-blue-500",
    },
    {
      key: "patch" as const,
      label: "Patch",
      count: totals.patch,
      swatch: "bg-emerald-500",
    },
  ].filter((s) => s.count > 0);

  return (
    <div className="relative isolate">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        Release type mix
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Share of stable semver bumps in the last ~3 years · higher major share
        can mean more breaking upgrades
      </p>

      <div
        className="flex h-3.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
        role="img"
        aria-label={segments
          .map((s) => `${s.label}: ${pct(s.count)}%`)
          .join(", ")}
      >
        {segments.map((seg, index) => (
          <div
            key={seg.key}
            className={`h-full ${seg.swatch} ${
              index === 0 || index === segments.length - 1 ? "min-w-2" : ""
            }`}
            style={{ flex: `${seg.count} 1 0%` }}
            title={`${seg.label}: ${seg.count} (${pct(seg.count)}%)`}
          />
        ))}
      </div>

      <div className="mt-2 flex h-4 flex-wrap items-center gap-x-4 gap-y-1 text-xs leading-4 text-gray-600 dark:text-gray-400">
        {segments.map((seg) => (
          <span
            key={seg.key}
            className="inline-flex h-4 items-center gap-1.5"
          >
            <span
              className={`inline-block size-2.5 shrink-0 rounded-full ${seg.swatch}`}
              aria-hidden="true"
            />
            <span className="leading-4">
              {seg.label}{" "}
              <span className="tabular-nums text-gray-500 dark:text-gray-400">
                {pct(seg.count)}% · {seg.count}
              </span>
            </span>
          </span>
        ))}
      </div>

      {recentMajors.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Recent major releases
          </p>
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {recentMajors.map((m) => (
              <li
                key={`${m.version}-${m.date}`}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
              >
                <span className="font-mono text-sm font-semibold">v{m.version}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatPublishDate(m.date) ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div>
      <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-3" />
      <div className="h-52 w-full rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
    </div>
  );
}

function DownloadsChartSkeleton() {
  return (
    <div>
      <div className="mb-3 h-10 w-full md:w-1/2 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-3" />
      <div className="h-52 w-full rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
    </div>
  );
}

export function MetricsChartsCard({
  packageName,
  versionTimes,
  keywords,
  competitors,
}: {
  packageName: string;
  versionTimes?: Record<string, string>;
  keywords?: string[] | null;
  competitors?: string[] | null;
}) {
  const keywordsKey = (keywords ?? []).join(",");
  const competitorsKey = (competitors ?? []).join(",");
  const [data, setData] = useState<ChartsPayload>({
    downloads: [],
    issues: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [loadingDownloads, setLoadingDownloads] = useState(true);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [loadingRelated, setLoadingRelated] = useState(true);
  const [relatedNames, setRelatedNames] = useState<string[]>([]);
  const [compareWith, setCompareWith] = useState("");
  const [compareDownloads, setCompareDownloads] = useState<ChartPoint[]>([]);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const compareRequestId = useRef(0);
  const compareCacheRef = useRef<Record<string, ChartPoint[]>>({});

  const releasePoints = useMemo(
    () => buildReleaseCadence(versionTimes, 36),
    [versionTimes],
  );
  const releaseTypeMix = useMemo(
    () => buildReleaseTypeMix(versionTimes, 36),
    [versionTimes],
  );

  useEffect(() => {
    if (!packageName) return;
    const controller = new AbortController();

    const load = async (
      series: "downloads" | "issues",
      apply: (payload: ChartsPayload) => void,
      done: () => void,
    ) => {
      try {
        const { ok, data: payload } = await fetchJson<
          ChartsPayload & { error?: string }
        >(
          `/api/package-charts?package=${encodeURIComponent(packageName)}&series=${series}`,
          {
            signal: controller.signal,
            timeoutMs: 60_000,
            retries: 3,
          },
        );
        if (controller.signal.aborted) return;
        if (!ok || payload.error) {
          setError(payload.error || "Failed to load charts");
          return;
        }
        apply(payload);
      } catch {
        if (controller.signal.aborted) return;
        setError("Failed to load charts");
      } finally {
        if (!controller.signal.aborted) done();
      }
    };

    setLoadingDownloads(true);
    setLoadingIssues(true);
    setLoadingRelated(true);
    setError(null);
    setData({ downloads: [], issues: [] });
    setRelatedNames([]);
    setCompareWith("");
    setCompareDownloads([]);
    compareCacheRef.current = {};
    compareRequestId.current += 1;

    void load(
      "downloads",
      (payload) =>
        setData((current) => ({
          ...current,
          downloads: payload.downloads || [],
        })),
      () => setLoadingDownloads(false),
    );
    void load(
      "issues",
      (payload) =>
        setData((current) => ({ ...current, issues: payload.issues || [] })),
      () => setLoadingIssues(false),
    );

    return () => {
      controller.abort();
    };
  }, [packageName]);

  useEffect(() => {
    if (!packageName) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ package: packageName });
    if (keywordsKey) params.set("keywords", keywordsKey);
    if (competitorsKey) params.set("competitors", competitorsKey);

    void fetchJson<{ packages?: { name: string }[] }>(
      `/api/similar-packages?${params}`,
      { signal: controller.signal, timeoutMs: 45_000, retries: 2 },
    )
      .then(({ ok, data: payload }) => {
        if (controller.signal.aborted) return;
        const names = ok
          ? (payload.packages ?? [])
              .map((pkg) => pkg.name)
              .filter(
                (name) =>
                  name.toLowerCase() !== packageName.toLowerCase(),
              )
          : [];
        setRelatedNames(names);
      })
      .catch(() => {
        if (!controller.signal.aborted) setRelatedNames([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingRelated(false);
      });

    return () => controller.abort();
  }, [packageName, keywordsKey, competitorsKey]);

  const downloadsReady = !loadingDownloads && !loadingRelated;

  useEffect(() => {
    if (!compareWith) {
      setCompareDownloads([]);
      setLoadingCompare(false);
      return;
    }

    const cacheKey = compareWith.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(compareCacheRef.current, cacheKey)) {
      setCompareDownloads(compareCacheRef.current[cacheKey]);
      setLoadingCompare(false);
      return;
    }

    const controller = new AbortController();
    const requestId = ++compareRequestId.current;
    setLoadingCompare(true);

    void fetchJson<ChartsPayload & { error?: string }>(
      `/api/package-charts?package=${encodeURIComponent(compareWith)}&series=downloads`,
      {
        signal: controller.signal,
        timeoutMs: 60_000,
        retries: 1,
      },
    )
      .then(({ ok, data: payload }) => {
        if (controller.signal.aborted || requestId !== compareRequestId.current) {
          return;
        }
        const points = ok ? payload.downloads || [] : [];
        // Only cache successful series so a failed attempt can be retried.
        if (ok && points.length > 0) {
          compareCacheRef.current[cacheKey] = points;
        }
        setCompareDownloads(points);
      })
      .catch(() => {
        if (controller.signal.aborted || requestId !== compareRequestId.current) {
          return;
        }
        setCompareDownloads([]);
      })
      .finally(() => {
        if (
          !controller.signal.aborted &&
          requestId === compareRequestId.current
        ) {
          setLoadingCompare(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [compareWith]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
      )}
      <div className="space-y-8">
        {!downloadsReady ? (
          <DownloadsChartSkeleton />
        ) : (
          <div>
            {relatedNames.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <label htmlFor="downloadsCompareSelect" className="sr-only">
                  Compare
                </label>
                <select
                  id="downloadsCompareSelect"
                  value={compareWith}
                  onChange={(e) => setCompareWith(e.target.value)}
                  className="w-full md:w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="">Select package to compare</option>
                  {relatedNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                {loadingCompare && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Loading…
                  </span>
                )}
              </div>
            )}
            <MetricLineChart
              title="Downloads (weekly)"
              color="#3b82f6"
              points={data.downloads}
              seriesName={packageName}
              compareName={
                compareWith && !loadingCompare ? compareWith : null
              }
              comparePoints={
                compareWith && !loadingCompare ? compareDownloads : undefined
              }
              empty="No download history available."
            />
          </div>
        )}
        <ReleaseCadenceChart points={releasePoints} />
        <ReleaseTypeMixChart mix={releaseTypeMix} />
        {loadingIssues ? (
          <ChartSkeleton />
        ) : (
          <MetricLineChart
            title="Open issues"
            color="#f97316"
            points={data.issues}
            empty="No GitHub issue history for this package."
          />
        )}
      </div>
    </div>
  );
}
