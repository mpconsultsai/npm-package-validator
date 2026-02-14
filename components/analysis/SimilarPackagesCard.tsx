"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SimilarPackage {
  name: string;
  description: string;
  version: string;
}

interface SimilarPackagesCardProps {
  packageName: string;
  /** Pass when available from analysis to avoid extra API work */
  keywords?: string[] | null;
}

export function SimilarPackagesCard({ packageName, keywords }: SimilarPackagesCardProps) {
  const [packages, setPackages] = useState<SimilarPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!packageName) return;
    setLoading(true);
    const params = new URLSearchParams({ package: packageName });
    if (keywords?.length) params.set('keywords', keywords.join(','));
    fetch(`/api/similar-packages?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.packages) setPackages(data.packages);
        else setPackages([]);
      })
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  }, [packageName, keywords?.join(',')]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="font-bold text-2xl mb-4 flex items-center gap-2">
          <svg
            className="w-7 h-7 text-indigo-600 dark:text-indigo-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012 2M6.5 9a2.5 2.5 0 115 0M6.5 9a2.5 2.5 0 105 0"
            />
          </svg>
          You might also like
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Loading similar packages…
        </p>
      </div>
    );
  }

  if (packages.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="font-bold text-2xl mb-4 flex items-center gap-2">
        <svg
          className="w-7 h-7 text-indigo-600 dark:text-indigo-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012 2M6.5 9a2.5 2.5 0 115 0M6.5 9a2.5 2.5 0 105 0"
          />
        </svg>
        You might also like
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((pkg) => (
          <Link
            key={pkg.name}
            href={`/package/${encodeURIComponent(pkg.name)}`}
            className="block p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <p className="font-semibold text-gray-900 dark:text-white truncate">
              {pkg.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              v{pkg.version}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
              {pkg.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
