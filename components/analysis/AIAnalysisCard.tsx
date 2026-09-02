"use client";

import {
  aiScoreBarClass,
  aiScoreTextClass,
  isHighQualityAiScore,
  recommendationBadgeClass,
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

export function AIAnalysisCard({ ai }: AIAnalysisCardProps) {
  const score = ai.overallScore;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg shadow-lg p-4 sm:p-6">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-2">Summary</h3>
          <p className="text-gray-700 dark:text-gray-300">{ai.summary}</p>
        </div>

        <div>
          <h3 className="font-semibold text-lg mb-2">Recommendation</h3>
          <span
            className={`inline-block px-4 py-2 rounded-full font-semibold ${recommendationBadgeClass(ai.recommendation)}`}
          >
            {ai.recommendation === "do-not-use" ||
            ai.recommendation === "not-recommended"
              ? "DO NOT USE"
              : ai.recommendation.toUpperCase().replace(/-/g, " ")}
          </span>
        </div>

        <div>
          <h3 className="font-semibold text-lg mb-2">Overall score</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div
                className={`${aiScoreBarClass(score)} h-4 rounded-full transition-all duration-500`}
                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
              />
            </div>
            <span
              className={`font-bold text-xl inline-flex items-center gap-1 ${aiScoreTextClass(score)}`}
            >
              {score}/100
              {isHighQualityAiScore(score) && (
                <span
                  className="text-amber-400 dark:text-amber-300"
                  title="High-quality package"
                  aria-label="High-quality package"
                >
                  ★
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Security</p>
            <p className="font-semibold capitalize">{ai.securityRating}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Quality</p>
            <p className="font-semibold capitalize">{ai.qualityRating}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Maintenance
            </p>
            <p className="font-semibold capitalize">{ai.maintenanceRating}</p>
          </div>
        </div>

        {ai.strengths && ai.strengths.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Strengths
            </h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
              {ai.strengths.map((strength, idx) => (
                <li key={idx}>{strength}</li>
              ))}
            </ul>
          </div>
        )}

        {ai.concerns && ai.concerns.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-yellow-600 dark:text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Concerns
            </h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
              {ai.concerns.map((concern, idx) => (
                <li key={idx}>{concern}</li>
              ))}
            </ul>
          </div>
        )}

        {ai.reasoning && (
          <div>
            <h3 className="font-semibold text-lg mb-2">Reasoning</h3>
            <p className="text-gray-700 dark:text-gray-300">{ai.reasoning}</p>
          </div>
        )}
      </div>
    </div>
  );
}
