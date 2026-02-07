'use client';

import { useState } from 'react';

export default function Home() {
  const [packageName, setPackageName] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [securityFilter, setSecurityFilter] = useState<string | null>(null); // 'critical', 'high', 'moderate', 'low', or null for all

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageName.trim()) return;

    setLoading(true);
    setError(null);
    setAnalysisData(null);

    try {
      const response = await fetch(`/api/analyze-ai?package=${encodeURIComponent(packageName)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyse package');
      }

      setAnalysisData(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while analysing the package');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              NPM Package Validator
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Analyse npm packages for security, quality, and reliability with AI-powered insights
            </p>
          </div>

          {/* Search Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="packageName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Package Name
                </label>
                <input
                  type="text"
                  id="packageName"
                  name="packageName"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="e.g., react, lodash, express"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !packageName.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? 'Analysing...' : 'Analyse Package'}
              </button>
            </form>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Analysis Results */}
          {analysisData && (
            <div className="space-y-6 mb-8">
              {/* Package Info */}
              {analysisData.packageInfo && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h2 className="font-bold text-2xl mb-4 flex items-center gap-2">
                    <span>📦</span> Package Info
                  </h2>
                  <div className="space-y-2">
                    <p><strong>Name:</strong> {analysisData.packageInfo.name}</p>
                    <p><strong>Latest Version:</strong> {analysisData.packageInfo.latestVersion || analysisData.packageInfo.version}</p>
                    {analysisData.packageInfo.daysSinceLastRelease !== null && analysisData.packageInfo.daysSinceLastRelease !== undefined && (
                      <p><strong>Days Since Last Release:</strong> {analysisData.packageInfo.daysSinceLastRelease} days ago</p>
                    )}
                    <p><strong>License:</strong> {analysisData.packageInfo.license}</p>
                    <p>
                      <strong>URL:</strong>{' '}
                      <a
                        href={analysisData.packageInfo.npmUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {analysisData.packageInfo.npmUrl}
                      </a>
                    </p>
                  </div>
                </div>
              )}

              {/* Metrics */}
              {analysisData.metrics && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h2 className="font-bold text-2xl mb-4 flex items-center gap-2">
                    <span>📊</span> Metrics
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Downloads (month)</p>
                      <p className="text-2xl font-bold">{analysisData.metrics.downloads.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">GitHub Stars</p>
                      <p className="text-2xl font-bold">{analysisData.metrics.stars.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Quality Score</p>
                      <p className="text-2xl font-bold">{analysisData.metrics.qualityScore}/100</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Security Issues</p>
                      {analysisData.metrics.securityIssues === 0 ? (
                        <p className="text-2xl font-bold text-green-500">None</p>
                      ) : (
                        <div className="flex gap-2 flex-wrap">
                          {analysisData.security?.critical > 0 && (
                            <button
                              onClick={() => setSecurityFilter(securityFilter === 'critical' ? null : 'critical')}
                              className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                                securityFilter === 'critical'
                                  ? 'bg-purple-500 ring-2 ring-purple-400'
                                  : 'bg-purple-400 hover:bg-purple-500'
                              }`}
                            >
                              <span className="text-xs font-medium text-white">Critical</span>
                              <span className="text-lg font-bold text-white">{analysisData.security.critical}</span>
                            </button>
                          )}
                          {analysisData.security?.high > 0 && (
                            <button
                              onClick={() => setSecurityFilter(securityFilter === 'high' ? null : 'high')}
                              className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                                securityFilter === 'high'
                                  ? 'bg-red-500 ring-2 ring-red-400'
                                  : 'bg-red-400 hover:bg-red-500'
                              }`}
                            >
                              <span className="text-xs font-medium text-white">High</span>
                              <span className="text-lg font-bold text-white">{analysisData.security.high}</span>
                            </button>
                          )}
                          {analysisData.security?.moderate > 0 && (
                            <button
                              onClick={() => setSecurityFilter(securityFilter === 'moderate' ? null : 'moderate')}
                              className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                                securityFilter === 'moderate'
                                  ? 'bg-orange-500 ring-2 ring-orange-400'
                                  : 'bg-orange-400 hover:bg-orange-500'
                              }`}
                            >
                              <span className="text-xs font-medium text-white">Moderate</span>
                              <span className="text-lg font-bold text-white">{analysisData.security.moderate}</span>
                            </button>
                          )}
                          {analysisData.security?.low > 0 && (
                            <button
                              onClick={() => setSecurityFilter(securityFilter === 'low' ? null : 'low')}
                              className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                                securityFilter === 'low'
                                  ? 'bg-yellow-500 ring-2 ring-yellow-400'
                                  : 'bg-yellow-400 hover:bg-yellow-500'
                              }`}
                            >
                              <span className="text-xs font-medium text-white">Low</span>
                              <span className="text-lg font-bold text-white">{analysisData.security.low}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {analysisData.metrics.aiScore !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">AI Score</p>
                        <p className="text-2xl font-bold text-purple-600">{analysisData.metrics.aiScore}/100</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Security Vulnerabilities Details */}
              {analysisData.security && analysisData.security.vulnerabilities && analysisData.security.vulnerabilities.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow-lg p-6 border-2 border-red-200 dark:border-red-800">
                  <h2 className="font-bold text-2xl mb-4 flex items-center gap-2 text-red-800 dark:text-red-200">
                    <span>🔒</span> Security Vulnerabilities 
                    {securityFilter && (
                      <span className="text-base font-normal">
                        (showing {securityFilter} - click badge again to show all)
                      </span>
                    )}
                  </h2>
                  <div className="space-y-4">
                    {analysisData.security.vulnerabilities
                      .filter((vuln: any) => !securityFilter || vuln.severity === securityFilter)
                      .map((vuln: any, idx: number) => (
                      <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-red-500">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg">{vuln.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${
                            vuln.severity === 'critical' ? 'bg-purple-500' :
                            vuln.severity === 'high' ? 'bg-red-500' :
                            vuln.severity === 'moderate' ? 'bg-orange-500' :
                            'bg-yellow-500'
                          }`}>
                            {vuln.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">{vuln.description}</p>
                        <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <span><strong>ID:</strong> {vuln.id}</span>
                          {vuln.vulnerableVersionRange && (
                            <span><strong>Vulnerable:</strong> {vuln.vulnerableVersionRange}</span>
                          )}
                          {vuln.patchedVersions && vuln.patchedVersions !== 'none' && (
                            <span className="text-green-500 dark:text-green-400 font-semibold"><strong>Fixed in:</strong> {vuln.patchedVersions}</span>
                          )}
                        </div>
                        {vuln.url && (
                          <a
                            href={vuln.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm underline"
                          >
                            View Advisory →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Analysis */}
              {analysisData.ai && (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg shadow-lg p-6">
                  <h2 className="font-bold text-2xl mb-4 flex items-center gap-2">
                    <span>🤖</span> AI Analysis
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Summary</h3>
                      <p className="text-gray-700 dark:text-gray-300">{analysisData.ai.summary}</p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg mb-2">Recommendation</h3>
                      <span className={`inline-block px-4 py-2 rounded-full font-semibold ${
                        analysisData.ai.recommendation === 'recommended' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : analysisData.ai.recommendation === 'use-with-caution'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {analysisData.ai.recommendation.toUpperCase().replace(/-/g, ' ')}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg mb-2">Overall Score</h3>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500"
                            style={{ width: `${analysisData.ai.overallScore}%` }}
                          />
                        </div>
                        <span className="font-bold text-xl">{analysisData.ai.overallScore}/100</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Security</p>
                        <p className="font-semibold capitalize">{analysisData.ai.securityRating}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Quality</p>
                        <p className="font-semibold capitalize">{analysisData.ai.qualityRating}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Maintenance</p>
                        <p className="font-semibold capitalize">{analysisData.ai.maintenanceRating}</p>
                      </div>
                    </div>

                    {analysisData.ai.strengths && analysisData.ai.strengths.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-lg mb-2">✅ Strengths</h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                          {analysisData.ai.strengths.map((strength: string, idx: number) => (
                            <li key={idx}>{strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysisData.ai.concerns && analysisData.ai.concerns.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-lg mb-2">⚠️ Concerns</h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                          {analysisData.ai.concerns.map((concern: string, idx: number) => (
                            <li key={idx}>{concern}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysisData.ai.reasoning && (
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Reasoning</h3>
                        <p className="text-gray-700 dark:text-gray-300">{analysisData.ai.reasoning}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info Section - Only show when no results */}
          {!analysisData && !loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-blue-600 dark:text-blue-400 mb-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">Security Analysis</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Check for vulnerabilities and security advisories
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-green-600 dark:text-green-400 mb-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">Quality Metrics</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Evaluate maintenance, popularity, and code quality
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-purple-600 dark:text-purple-400 mb-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">AI-Powered</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Get intelligent recommendations using Gemini AI
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
