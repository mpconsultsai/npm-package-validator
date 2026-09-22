export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/** Unset → show equivalent commands for common managers. */
export type PackageManagerPreference = PackageManager | "auto";

const STORAGE_KEY = "npv-package-manager";

type Listener = () => void;

const listeners = new Set<Listener>();
let hydrated = false;
let preference: PackageManagerPreference = "auto";

const emit = () => {
  listeners.forEach((listener) => listener());
};

const isPackageManager = (value: string | null): value is PackageManager =>
  value === "npm" || value === "pnpm" || value === "yarn" || value === "bun";

const isPreference = (
  value: string | null,
): value is PackageManagerPreference =>
  value === "auto" || isPackageManager(value);

const read = (): PackageManagerPreference => {
  if (typeof window === "undefined") return "auto";
  if (!hydrated) {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    preference = isPreference(raw) ? raw : "auto";
    hydrated = true;
  }
  return preference;
};

export const subscribePackageManagerPref = (
  listener: Listener,
): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getPackageManagerPreference = (): PackageManagerPreference =>
  read();

export const getPackageManagerPreferenceServerSnapshot =
  (): PackageManagerPreference => "auto";

export const setPackageManagerPreference = (
  value: PackageManagerPreference,
): void => {
  if (hydrated && preference === value) return;
  preference = value;
  hydrated = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore quota / private mode
  }
  emit();
};

export function installCommand(
  pm: PackageManager,
  packageName: string,
  version: string,
): string {
  const spec = `${packageName}@${version}`;
  switch (pm) {
    case "pnpm":
      return `pnpm add ${spec}`;
    case "yarn":
      return `yarn add ${spec}`;
    case "bun":
      return `bun add ${spec}`;
    default:
      return `npm install ${spec}`;
  }
}

export function formatInstallStep(
  pref: PackageManagerPreference,
  packageName: string,
  version: string,
): string {
  if (pref === "auto") {
    return (
      `Install the target version with the project package manager ` +
      `(\`${installCommand("npm", packageName, version)}\`, ` +
      `\`${installCommand("pnpm", packageName, version)}\`, or ` +
      `\`${installCommand("yarn", packageName, version)}\`)`
    );
  }
  return `Install the target version: \`${installCommand(pref, packageName, version)}\``;
}

/** Parse optional packageManager from API body; default auto. */
export function parsePackageManagerPreference(
  value: unknown,
): PackageManagerPreference {
  if (typeof value !== "string") return "auto";
  const trimmed = value.trim().toLowerCase();
  return isPreference(trimmed) ? trimmed : "auto";
}
