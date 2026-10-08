import { SITE_NAME } from "@/lib/site-brand";

function githubUrl(): string | null {
  const slug = process.env.NEXT_PUBLIC_GITHUB_REPO?.trim();
  if (!slug || slug.includes(" ")) return null;
  return `https://github.com/${slug.replace(/^\/+|\/+$/g, "")}`;
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  const github = githubUrl();
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

  return (
    <footer className="mt-10 border-t border-gray-200 pt-6 dark:border-gray-700">
      <div className="space-y-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        <p>
          Analysis uses public npm, PyPI, GitHub, and security advisory data.
          Optional AI summaries are{" "}
          <strong className="font-medium text-gray-600 dark:text-gray-300">
            advisory only
          </strong>
          -not legal, security, or procurement advice. Verify before you ship.
          When AI is enabled, package names and aggregated public metrics may be sent
          to configured providers (e.g. Google Gemini or Groq).
        </p>
        <p>
          We do not require an account. Package names you search may be logged
          for rate limiting and reliability. Registry and AI APIs may impose
          their own limits.
        </p>
        {(github || contact) && (
          <nav
            aria-label="Footer"
            className="flex flex-wrap gap-x-4 gap-y-1 text-sm"
          >
            {github && (
              <a
                href={github}
                className="text-blue-600 underline underline-offset-2 dark:text-blue-400"
                target="_blank"
                rel="noopener noreferrer"
              >
                Source
              </a>
            )}
            {contact && (
              <a
                href={`mailto:${contact}`}
                className="text-blue-600 underline underline-offset-2 dark:text-blue-400"
              >
                Contact
              </a>
            )}
          </nav>
        )}
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          © {year} {SITE_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
