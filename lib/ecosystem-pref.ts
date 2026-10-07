import type { PackageEcosystem } from "@/lib/package-routes";

const STORAGE_KEY = "package-ecosystem-pref";

export function getEcosystemPreference(): PackageEcosystem {
  if (typeof window === "undefined") return "npm";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "pypi" ? "pypi" : "npm";
  } catch {
    return "npm";
  }
}

export function setEcosystemPreference(ecosystem: PackageEcosystem): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, ecosystem);
  } catch {
    // ignore
  }
}
