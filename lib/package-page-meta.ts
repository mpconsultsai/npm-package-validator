import type { Metadata } from "next";
import type { PackageEcosystem } from "@/lib/package-routes";
import { SITE_NAME } from "@/lib/site-brand";

export function decodePackageParam(rawName: string): string {
  try {
    return decodeURIComponent(rawName);
  } catch {
    return rawName;
  }
}

export function packagePageMetadata(
  ecosystem: PackageEcosystem,
  rawName: string,
): Metadata {
  const packageName = decodePackageParam(rawName);
  const registry = ecosystem === "pypi" ? "PyPI" : "npm";
  const title = `${packageName} ${registry} package review`;
  const description =
    ecosystem === "pypi"
      ? `Review the PyPI project ${packageName} before you install it. Security advisories, maintenance, dependencies, distribution size, and an optional AI summary.`
      : `Review the npm package ${packageName} before you install it. Security advisories, maintenance, dependencies, downloads, and an optional AI summary.`;
  const path = `/${ecosystem}/${encodeURIComponent(packageName)}`;
  const socialTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: socialTitle,
      description,
      url: path,
      images: [{ url: "/opengraph-image", alt: socialTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: ["/twitter-image"],
    },
  };
}
