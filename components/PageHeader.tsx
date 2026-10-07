"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/AppLogo";
import { SITE_NAME, SITE_STRAPLINE } from "@/lib/site-brand";
import { smoothNavigate } from "@/lib/smooth-navigate";

interface PageHeaderProps {
  /** When true (package results), title navigates home with a smooth transition. */
  showHomeLink?: boolean;
}

export function PageHeader({ showHomeLink = false }: PageHeaderProps) {
  const router = useRouter();

  return (
    <header className="mb-4 sm:mb-6 overflow-visible pb-0.5">
      <h1 className="font-bold overflow-visible">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 hover:opacity-90 transition-opacity text-3xl sm:text-4xl"
          aria-label={showHomeLink ? "Back to home" : `${SITE_NAME} home`}
          onClick={(e) => {
            if (!showHomeLink) return;
            e.preventDefault();
            smoothNavigate(() => router.push("/"));
          }}
        >
          <AppLogo className="block w-8 h-8 sm:w-10 sm:h-10 shrink-0" />
          <span className="inline-block font-[family-name:var(--font-wordmark)] font-semibold tracking-tight text-gray-900 dark:text-gray-50 leading-none">
            {SITE_NAME}
          </span>
        </Link>
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400 sm:text-[0.9375rem]">
        {SITE_STRAPLINE}
      </p>
    </header>
  );
}
