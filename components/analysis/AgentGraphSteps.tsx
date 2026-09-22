"use client";

import { useMemo } from "react";

type StationId =
  | "collect"
  | "peers"
  | "securityDelta"
  | "migration"
  | "synthesize";

type StationDef = {
  id: StationId;
  label: string;
  hint: string;
  color: string;
};

const STATIONS: StationDef[] = [
  {
    id: "collect",
    label: "Collect",
    hint: "Gather advice, notes, and security in parallel",
    color: "#64748b",
  },
  {
    id: "peers",
    label: "Peers",
    hint: "Peer dependency changes to align",
    color: "#8b5cf6",
  },
  {
    id: "securityDelta",
    label: "Security",
    hint: "Advisory count change between versions",
    color: "#f59e0b",
  },
  {
    id: "migration",
    label: "Migration",
    hint: "Migration / changelog links found",
    color: "#10b981",
  },
  {
    id: "synthesize",
    label: "Synthesize",
    hint: "One LLM call to write the brief",
    color: "#2563eb",
  },
];

const ENRICH_MATCH: Array<{ id: StationId; re: RegExp }> = [
  { id: "peers", re: /^enrich_peers(?!:skip)/ },
  { id: "securityDelta", re: /^enrich_security_delta(?!:skip)/ },
  { id: "migration", re: /^enrich_migration(?!:skip)/ },
];

function buildVisitedPath(toolCalls: string[]): StationId[] {
  const path: StationId[] = ["collect"];
  for (const call of toolCalls) {
    for (const { id, re } of ENRICH_MATCH) {
      if (re.test(call) && !path.includes(id)) path.push(id);
    }
  }
  path.push("synthesize");
  return path;
}

function stationDetail(toolCalls: string[], id: StationId): string | null {
  if (id === "collect") {
    const n = toolCalls.filter((c) => c.startsWith("get_")).length;
    return n > 0 ? `${n} tools` : null;
  }
  const prefix =
    id === "peers"
      ? "enrich_peers:"
      : id === "securityDelta"
        ? "enrich_security_delta:"
        : id === "migration"
          ? "enrich_migration:"
          : null;
  if (!prefix) return id === "synthesize" ? "LLM" : null;
  const hit = toolCalls.find(
    (c) => c.startsWith(prefix) && !c.endsWith(":skip"),
  );
  if (!hit) return null;
  return hit.slice(prefix.length);
}

/** Pipeline of graph stations — clearer than a Sankey for this linear decision path. */
export function AgentGraphSteps({ toolCalls }: { toolCalls: string[] }) {
  const { pathIds } = useMemo(() => {
    const pathIds = buildVisitedPath(toolCalls);
    return { pathIds };
  }, [toolCalls]);

  if (toolCalls.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/40 p-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Graph path
      </p>

      <ol className="flex flex-wrap items-stretch gap-y-2">
        {STATIONS.map((station, index) => {
          const taken = pathIds.includes(station.id);
          const detail = stationDetail(toolCalls, station.id);
          const isLast = index === STATIONS.length - 1;

          return (
            <li key={station.id} className="flex items-center min-w-0">
              <div
                title={station.hint}
                className={`flex min-w-[5.5rem] max-w-[7.5rem] flex-col rounded-lg border px-2.5 py-2 ${
                  taken
                    ? "border-transparent text-white shadow-sm"
                    : "border-dashed border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/40 text-gray-400 dark:text-gray-500"
                }`}
                style={taken ? { backgroundColor: station.color } : undefined}
              >
                <span className="text-[11px] font-semibold leading-tight">
                  {station.label}
                </span>
                <span
                  className={`mt-0.5 text-[10px] leading-tight ${taken ? "text-white/85" : "opacity-80"}`}
                >
                  {taken ? detail ?? "ran" : "skipped"}
                </span>
              </div>
              {!isLast && (
                <span
                  className={`mx-1.5 shrink-0 text-sm ${
                    taken && pathIds.includes(STATIONS[index + 1].id)
                      ? "text-gray-500 dark:text-gray-400"
                      : "text-gray-300 dark:text-gray-600"
                  }`}
                  aria-hidden="true"
                >
                  →
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
