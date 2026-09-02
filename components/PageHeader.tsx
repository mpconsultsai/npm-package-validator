import Link from "next/link";
import { AppLogo } from "@/components/AppLogo";

interface PageHeaderProps {
  /** When true (package results), title links home and tagline is hidden. */
  showHomeLink?: boolean;
}

export function PageHeader({ showHomeLink = false }: PageHeaderProps) {
  const title = (
    <>
      <AppLogo className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 shrink-0" />
      <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
        NPM Package Validator
      </span>
    </>
  );

  return (
    <div className="text-center mb-4 sm:mb-12">
      <h1 className="flex items-center justify-center gap-2 sm:gap-3 text-2xl sm:text-4xl md:text-5xl font-bold mb-1.5 sm:mb-4">
        {showHomeLink ? (
          <Link
            href="/"
            className="inline-flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity"
            aria-label="Back to home"
          >
            {title}
          </Link>
        ) : (
          title
        )}
      </h1>
      {!showHomeLink && (
        <p className="text-sm sm:text-xl text-gray-600 dark:text-gray-300 px-1">
          Analyse npm packages for security, quality, and reliability with
          AI-powered insights
        </p>
      )}
    </div>
  );
}
