"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactNumber } from "@/lib/utils/format";

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

function ChartSkeleton() {
  return (
    <div>
      <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-3" />
      <div className="h-52 w-full rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
    </div>
  );
}

export function MetricsChartsCard({ packageName }: { packageName: string }) {
  const [data, setData] = useState<ChartsPayload>({
    downloads: [],
    issues: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [loadingDownloads, setLoadingDownloads] = useState(true);
  const [loadingIssues, setLoadingIssues] = useState(true);

  useEffect(() => {
    if (!packageName) return;
    const controller = new AbortController();

    const load = async (
      series: "downloads" | "issues",
      apply: (payload: ChartsPayload) => void,
      done: () => void,
    ) => {
      try {
        const res = await fetch(
          `/api/package-charts?package=${encodeURIComponent(packageName)}&series=${series}`,
          { signal: controller.signal },
        );
        const payload = await res.json();
        if (controller.signal.aborted) return;
        if (payload.error) {
          setError(payload.error);
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
        setData((current) => ({ ...current, downloads: payload.downloads || [] })),
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
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
