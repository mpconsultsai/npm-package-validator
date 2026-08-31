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

function RelatedPackagesSkeleton() {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading related packages</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="mt-2 h-3 w-14 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="mt-3 h-3 w-full rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="mt-2 h-3 w-5/6 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SimilarPackagesCard({ packageName, keywords }: SimilarPackagesCardProps) {
  const keywordsKey = (keywords ?? []).join(",");
  const [packages, setPackages] = useState<SimilarPackage[]>([]);
  const [loading, setLoading] = useState(Boolean(packageName));

  useEffect(() => {
    if (!packageName) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ package: packageName });
    if (keywordsKey) params.set("keywords", keywordsKey);

    fetch(`/api/similar-packages?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (controller.signal.aborted) return;
        setPackages(data.packages ?? []);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setPackages([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [packageName, keywordsKey]);

  if (loading) {
    return <RelatedPackagesSkeleton />;
  }

  if (packages.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No related packages found.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
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
