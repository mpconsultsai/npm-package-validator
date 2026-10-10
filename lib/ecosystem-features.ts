import type { PackageEcosystem } from "@/lib/package-routes";

export type EcosystemFeatures = {
  /** Overview Charts tab (releases, issues; downloads when downloadCharts is true). */
  chartsTab: boolean;
  downloadCharts: boolean;
  downloadMetrics: boolean;
  transitiveDepsTree: boolean;
  upgradeAdvisor: boolean;
  relatedPackages: boolean;
  pasteList: boolean;
  npmPackageManagerSettings: boolean;
  /** When download metrics are shown, NuGet's figure is a lifetime total. */
  downloadsAreTotal: boolean;
};

export function featuresForEcosystem(
  ecosystem: PackageEcosystem,
): EcosystemFeatures {
  if (ecosystem === "nuget") {
    return {
      chartsTab: true,
      downloadCharts: false,
      downloadMetrics: true,
      transitiveDepsTree: false,
      upgradeAdvisor: false,
      relatedPackages: false,
      pasteList: true,
      npmPackageManagerSettings: false,
      downloadsAreTotal: true,
    };
  }
  if (ecosystem !== "npm") {
    return {
      chartsTab: true,
      downloadCharts: false,
      downloadMetrics: false,
      transitiveDepsTree: false,
      upgradeAdvisor: false,
      relatedPackages: false,
      pasteList: true,
      npmPackageManagerSettings: false,
      downloadsAreTotal: false,
    };
  }
  return {
    chartsTab: true,
    downloadCharts: true,
    downloadMetrics: true,
    transitiveDepsTree: true,
    upgradeAdvisor: true,
    relatedPackages: true,
    pasteList: true,
    npmPackageManagerSettings: true,
    downloadsAreTotal: false,
  };
}
