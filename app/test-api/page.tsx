'use client';

import { useState } from 'react';

export default function TestApiPage() {
  const [healthData, setHealthData] = useState<any>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [packageName, setPackageName] = useState('react');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testHealth = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealthData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testAnalyze = async () => {
    setLoading(true);
    setError('');
    setAnalysisData(null);
    try {
      const res = await fetch(`/api/analyze?package=${packageName}`);
      const data = await res.json();
      setAnalysisData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">API Testing Dashboard</h1>

        {/* Health Check */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Health Check</h2>
          <button
            onClick={testHealth}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test /api/health'}
          </button>
          {healthData && (
            <pre className="mt-4 bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-auto">
              {JSON.stringify(healthData, null, 2)}
            </pre>
          )}
        </div>

        {/* Package Analysis */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Package Analysis</h2>
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="Package name"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
            />
            <button
              onClick={testAnalyze}
              disabled={loading || !packageName}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Analyze Package'}
            </button>
          </div>
          {error && (
            <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded mb-4">
              {error}
            </div>
          )}
          {analysisData && (
            <div>
              <h3 className="font-semibold mb-2">Results:</h3>
              <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(analysisData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
