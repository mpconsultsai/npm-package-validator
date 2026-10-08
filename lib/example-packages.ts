import type { PackageEcosystem } from "@/lib/package-routes";

export const EXAMPLE_PACKAGES: Record<PackageEcosystem, readonly string[]> = {
  npm: ["react", "lodash", "@types/node"],
  pypi: ["requests", "django", "langgraph"],
};
