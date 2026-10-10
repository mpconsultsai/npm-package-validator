"use client";

import {
  aiScoreBarClass,
  aiScoreTextClass,
  isHighQualityAiScore,
  ratingTextClass,
  recommendationBadgeClass,
  recommendationLabel,
} from "@/lib/utils/ai-score";

interface AIAnalysis {
  summary: string;
  recommendation: string;
  overallScore: number;
  securityRating: string;
  qualityRating: string;
  maintenanceRating: string;
  strengths?: string[];
  concerns?: string[];
  reasoning?: string;
  model?: string;
}

interface AIAnalysisCardProps {
  ai: AIAnalysis;
}

const RATINGS = [
  { key: "securityRating" as const, label: "Security" },
  { key: "qualityRating" as const, label: "Quality" },
  { key: "maintenanceRating" as const, label: "Maintenance" },
];

export function AIAnalysisCard({ ai }: AIAnalysisCardProps) {
  const score = Math.min(100, Math.max(0, ai.overallScore));
  const label = recommendationLabel(ai.recommendation);
  const strengths = (ai.strengths ?? []).map((item) => item.trim()).filter(Boolean);
  const concerns = (ai.concerns ?? [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !isPlaceholderNote(item));
  const reasoning = ai.reasoning?.trim() ?? "";
  const summary = ai.summary?.trim() ?? "";

  return (
    <div className="space-y-4">
      {(summary || reasoning) && (
        <div
          className={`grid items-stretch overflow-hidden rounded-lg bg-gray-200 shadow-lg dark:bg-gray-700 ${
            summary && reasoning
              ? "grid-cols-1 gap-px md:grid-cols-2"
              : "grid-cols-1"
          }`}
        >
          {summary && (
            <p className="bg-white p-4 text-sm leading-relaxed text-gray-700 dark:bg-gray-800 dark:text-gray-300 sm:p-6">
              {summary}
            </p>
          )}
          {reasoning && (
            <div className="bg-violet-50/40 p-4 ring-1 ring-inset ring-violet-200/70 dark:bg-gray-800 dark:ring-violet-400/15 sm:p-6">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-violet-700/70 dark:text-violet-300/70">
                <AiSparkIcon />
                AI
              </p>
              <p className="text-sm font-medium leading-relaxed text-gray-800 dark:text-gray-100">
                {reasoning}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800 sm:p-6">
        <div className="flex flex-nowrap items-center justify-between gap-3">
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-sm font-semibold ${recommendationBadgeClass(ai.recommendation)}`}
          >
            {label}
          </span>
          <p className="inline-flex min-w-0 items-baseline gap-1">
            <span className="sr-only">Overall score</span>
            <span
              className={`text-xl font-bold tabular-nums leading-none max-[480px]:text-base ${aiScoreTextClass(score)}`}
            >
              {score}
            </span>
            <span
              className={`text-xl font-bold tabular-nums leading-none max-[480px]:text-base ${aiScoreTextClass(score)}`}
            >
              /100
            </span>
            {isHighQualityAiScore(score) && (
              <span
                className="text-base text-amber-400 dark:text-amber-300 max-[480px]:text-sm"
                title="High-quality package"
                aria-label="High-quality package"
              >
                ★
              </span>
            )}
          </p>
        </div>

        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
          role="meter"
          aria-label="Overall score"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`${aiScoreBarClass(score)} h-full rounded-full transition-[width] duration-500`}
            style={{ width: `${score}%` }}
          />
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          {RATINGS.map((item) => {
            const value = ai[item.key];
            return (
              <div
                key={item.key}
                className="rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-900/40"
              >
                <dt className="text-xs text-gray-500 dark:text-gray-400">
                  {item.label}
                </dt>
                <dd
                  className={`mt-0.5 text-sm font-semibold capitalize ${ratingTextClass(value)}`}
                >
                  {value}
                </dd>
              </div>
            );
          })}
        </dl>

        <div className="mt-5 grid grid-cols-1 divide-y divide-gray-200 dark:divide-gray-700 md:grid-cols-2 md:divide-x md:divide-y-0">
          <PointList
            title="Strengths"
            tone="green"
            items={strengths}
            empty="None noted."
            className="pb-5 md:pb-0 md:pr-5"
          />
          <PointList
            title="Concerns"
            tone="amber"
            items={concerns}
            empty="None noted."
            className="pt-5 md:pt-0 md:pl-5"
          />
        </div>
      </div>
    </div>
  );
}

function AiSparkIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
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

function PointList({
  title,
  tone,
  items,
  empty,
  className,
}: {
  title: string;
  tone: "green" | "amber";
  items: string[];
  empty: string;
  className: string;
}) {
  const iconClass =
    tone === "green"
      ? "text-green-600 dark:text-green-400"
      : "text-yellow-600 dark:text-yellow-400";
  const dotClass = tone === "green" ? "bg-green-500" : "bg-amber-500";

  return (
    <section className={`min-w-0 ${className}`}>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        {tone === "green" ? (
          <svg
            className={`h-4 w-4 ${iconClass}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : (
          <svg
            className={`h-4 w-4 ${iconClass}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )}
        {title}
      </h3>
      {items.length > 0 ? (
        <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
          {items.map((item, index) => (
            <li key={`${index}-${item}`} className="flex gap-2">
              <span
                className={`mt-2 h-1 w-1 shrink-0 rounded-full ${dotClass}`}
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">{empty}</p>
      )}
    </section>
  );
}

function isPlaceholderNote(value: string): boolean {
  return /^(none|n\/a|no concerns?|nothing notable)\.?$/i.test(value);
}
