"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/AppLogo";
import { smoothNavigate } from "@/lib/smooth-navigate";

interface PageHeaderProps {
  /** When true (package results), title navigates home with a smooth transition. */
  showHomeLink?: boolean;
}

export function PageHeader({ showHomeLink = false }: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="text-center mb-4 sm:mb-12">
      <h1 className="flex items-center justify-center text-2xl sm:text-4xl md:text-5xl font-bold mb-1.5 sm:mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity"
          aria-label={showHomeLink ? "Back to home" : "NPM Package Validator home"}
          onClick={(e) => {
            if (!showHomeLink) return;
            e.preventDefault();
            smoothNavigate(() => router.push("/"));
          }}
        >
          <AppLogo className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 shrink-0" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            NPM Package Validator
          </span>
        </Link>
      </h1>
      <p className="text-sm sm:text-xl text-gray-600 dark:text-gray-300 px-1">
        Analyse npm packages for security, quality, and reliability with
        AI-powered insights
      </p>
    </div>
  );
}
