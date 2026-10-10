export type DistributionSizeInfo = {
  bytes: number;
  packagetype: string;
  filename?: string;
};

type ReleaseFile = {
  packagetype?: string;
  size?: number;
  filename?: string;
  yanked?: boolean;
};

/**
 * Prefer a universal wheel for the latest version; fall back to any wheel, then sdist.
 */
export function pickPypiDistributionSize(
  releases: Record<string, ReleaseFile[] | undefined> | undefined,
  version: string,
): DistributionSizeInfo | null {
  if (!releases || !version || version === "Unknown") return null;

  const files = releases[version]?.filter(
    (file) =>
      !file.yanked &&
      typeof file.size === "number" &&
      Number.isFinite(file.size) &&
      file.size > 0,
  );
  if (!files?.length) return null;

  const wheels = files.filter((f) => f.packagetype === "bdist_wheel");
  const universal = wheels.find((f) =>
    (f.filename ?? "").includes("py3-none-any"),
  );
  const wheel = universal ?? wheels[0];
  if (wheel?.size != null) {
    return {
      bytes: wheel.size,
      packagetype: wheel.packagetype ?? "bdist_wheel",
      filename: wheel.filename,
    };
  }

  const sdist = files.find((f) => f.packagetype === "sdist");
  if (sdist?.size != null) {
    return {
      bytes: sdist.size,
      packagetype: sdist.packagetype ?? "sdist",
      filename: sdist.filename,
    };
  }

  const first = files[0];
  if (first.size == null) return null;
  return {
    bytes: first.size,
    packagetype: first.packagetype ?? "unknown",
    filename: first.filename,
  };
}

/** Caption under the install-file metric (two short lines for layout). */
export function distributionSizeCaption(info: DistributionSizeInfo): {
  context: string;
  fileLabel: string;
  title?: string;
} {
  if (info.packagetype === "bdist_wheel") {
    return {
      context: "Latest release",
      fileLabel: info.filename ?? ".whl install file",
      title: info.filename
        ? `PyPI wheel: ${info.filename}`
        : "Pre-built PyPI wheel (.whl)",
    };
  }
  if (info.packagetype === "sdist") {
    return {
      context: "Latest release",
      fileLabel: info.filename ?? "Source archive (.tar.gz)",
      title: info.filename
        ? `Source distribution: ${info.filename}`
        : "Source tarball from PyPI",
    };
  }
  if (info.packagetype === "nupkg") {
    return {
      context: "Latest release",
      fileLabel: info.filename ?? "NuGet package (.nupkg)",
      title: info.filename
        ? `NuGet package: ${info.filename}`
        : "NuGet package (.nupkg)",
    };
  }
  return {
    context: "Latest release",
    fileLabel: info.filename ?? "PyPI distribution file",
    title: info.filename,
  };
}
