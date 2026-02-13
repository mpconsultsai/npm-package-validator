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
  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg shadow-lg p-6">
      <h2 className="font-bold text-2xl mb-4 flex items-center gap-2">
        <svg
          className="w-7 h-7 text-purple-600 dark:text-purple-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        AI Analysis
        {ai.model && (
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
            via {ai.model}
          </span>
        )}
      </h2>

      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-2">Summary</h3>
          <p className="text-gray-700 dark:text-gray-300">{ai.summary}</p>
        </div>

        <div>
          <h3 className="font-semibold text-lg mb-2">Recommendation</h3>
          <span
            className={`inline-block px-4 py-2 rounded-full font-semibold ${
              ai.recommendation === "recommended"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : ai.recommendation === "use-with-caution"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            }`}
          >
            {ai.recommendation.toUpperCase().replace(/-/g, " ")}
          </span>
        </div>

        <div>
          <h3 className="font-semibold text-lg mb-2">Overall Score</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${ai.overallScore}%` }}
              />
            </div>
            <span className="font-bold text-xl">{ai.overallScore}/100</span>
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
