import { SITE_NAME } from "@/lib/site-brand";

export function SiteFooter() {
  const year = new Date().getFullYear();
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

  return (
    <footer className="mt-10 border-t border-gray-200 pt-6 dark:border-gray-700">
      <div className="space-y-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        <p>
          Analysis uses public npm, PyPI, NuGet, GitHub, and security advisory data.
          Optional AI summaries are{" "}
          <strong className="font-medium text-gray-600 dark:text-gray-300">advisory only</strong>{". They are not legal, security, or procurement advice. Verify before you ship. When AI is on, the package name and the public figures in the review are sent to Google Gemini. If Gemini is unavailable, that same request is sent to Groq."}
        </p>
        <p>
          We do not require an account. Package names you search may be logged
          for rate limiting and reliability. Registry and AI APIs may impose
          their own limits.
        </p>
        {contact && (
          <nav aria-label="Footer" className="text-sm">
            <a
              href={`mailto:${contact}`}
              className="text-blue-600 underline underline-offset-2 dark:text-blue-400"
            >
              Contact
            </a>
          </nav>
        )}
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          © {year} {SITE_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
