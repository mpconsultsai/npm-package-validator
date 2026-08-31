import { snykPackageUrl } from "@/lib/utils/advisory-links";
import { GitHubIcon, SnykIcon } from "@/components/BrandIcons";

interface AdvisoryLinksProps {
  githubUrl?: string;
  packageName?: string;
  version?: string;
}

export function AdvisoryLinks({
  githubUrl,
  packageName,
  version,
}: AdvisoryLinksProps) {
  const snykHref = packageName
    ? snykPackageUrl(packageName, version)
    : null;

  if (!githubUrl && !snykHref) return null;

  const linkClass =
    "inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline";

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
      {githubUrl && (
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          <GitHubIcon className="w-4 h-4 shrink-0" />
          GitHub advisory
        </a>
      )}
      {snykHref && (
        <a
          href={snykHref}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          <SnykIcon className="w-5 h-5 shrink-0" />
          Snyk
        </a>
      )}
    </div>
  );
}
