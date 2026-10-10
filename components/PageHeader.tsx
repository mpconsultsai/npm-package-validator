"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/AppLogo";
import { GitHubIcon } from "@/components/BrandIcons";
import { useHeaderGithubUrl } from "@/components/header-github";
import { SITE_NAME, SITE_STRAPLINE } from "@/lib/site-brand";
import { smoothNavigate } from "@/lib/smooth-navigate";

interface PageHeaderProps {
  /** When true (package results), title navigates home with a smooth transition. */
  showHomeLink?: boolean;
}

export function PageHeader({ showHomeLink = false }: PageHeaderProps) {
  const router = useRouter();
  const githubUrl = useHeaderGithubUrl();

  return (
    <header className="mb-4 sm:mb-6 overflow-visible pb-0.5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="min-w-0 font-bold overflow-visible">
          <Link
            href="/"
            className="inline-flex items-center gap-3 hover:opacity-90 transition-opacity text-[2.125rem] sm:text-5xl md:text-[3.25rem]"
            aria-label={showHomeLink ? "Back to home" : `${SITE_NAME} home`}
            onClick={(e) => {
              if (!showHomeLink) return;
              e.preventDefault();
              smoothNavigate(() => router.push("/"));
            }}
          >
            <AppLogo className="block w-11 h-11 sm:w-[3.25rem] sm:h-[3.25rem] shrink-0" />
            <span className="inline-block font-[family-name:var(--font-wordmark)] font-semibold tracking-tight text-gray-900 dark:text-gray-50 leading-none">
              {SITE_NAME}
            </span>
          </Link>
        </h1>
        {githubUrl && (
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on GitHub"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-950 dark:text-gray-200 dark:hover:text-white"
          >
            <GitHubIcon className="h-5 w-5 shrink-0" />
            GitHub
          </a>
        )}
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400 sm:text-[0.9375rem]">
        {SITE_STRAPLINE}
      </p>
    </header>
  );
}
