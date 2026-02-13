import Link from "next/link";

interface PageHeaderProps {
  showHomeLink?: boolean;
}

export function PageHeader({ showHomeLink = false }: PageHeaderProps) {
  return (
    <div className="text-center mb-12">
      {showHomeLink && (
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4"
        >
          ← Home
        </Link>
      )}
      <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
        NPM Package Validator
      </h1>
      <p className="text-xl text-gray-600 dark:text-gray-300">
        Analyse npm packages for security, quality, and reliability with
        AI-powered insights
      </p>
    </div>
  );
}
