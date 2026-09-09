"use client";

import { useEffect, useMemo, useState } from "react";
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
import { formatCompactNumber } from "@/lib/utils/format";
import { fetchJson } from "@/lib/fetch-client";
import { buildReleaseCadence } from "@/lib/release-cadence";

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
}: {
  title: string;
  color: string;
  points: ChartPoint[];
  empty: string;
}) {
  const data = points.map((p) => ({
    ...p,
    label: formatTickDate(p.date),
  }));

  return (
    <div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
        {title}
      </p>
      {data.length < 2 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-8">
          {empty}
        </p>
      ) : (
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(v: number) => formatCompactNumber(v)}
              />
              <Tooltip
                formatter={(value) => [
                  typeof value === "number"
                    ? value.toLocaleString()
                    : String(value ?? ""),
                  title,
                ]}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.date
                    ? new Date(
                        `${payload[0].payload.date}T00:00:00`,
                      ).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
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
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
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
        <div className="h-52 w-full">
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

function ChartSkeleton() {
  return (
    <div>
      <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-3" />
      <div className="h-52 w-full rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
    </div>
  );
}

export function MetricsChartsCard({
  packageName,
  versionTimes,
}: {
  packageName: string;
  versionTimes?: Record<string, string>;
}) {
  const [data, setData] = useState<ChartsPayload>({
    downloads: [],
    issues: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [loadingDownloads, setLoadingDownloads] = useState(true);
  const [loadingIssues, setLoadingIssues] = useState(true);

  const releasePoints = useMemo(
    () => buildReleaseCadence(versionTimes, 36),
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
    setError(null);
    setData({ downloads: [], issues: [] });

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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
      )}
      <div className="space-y-8">
        {loadingDownloads ? (
          <ChartSkeleton />
        ) : (
          <MetricLineChart
            title="Downloads (weekly)"
            color="#3b82f6"
            points={data.downloads}
            empty="No download history available."
          />
        )}
        <ReleaseCadenceChart points={releasePoints} />
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
