"use client";

import { useCallback, useEffect, useState } from "react";
import type { PackageEcosystem } from "@/lib/package-routes";
import {
  getEcosystemPreference,
  setEcosystemPreference,
} from "@/lib/ecosystem-pref";

export function useEcosystemPref() {
  const [ecosystem, setEcosystemState] = useState<PackageEcosystem>("npm");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEcosystemState(getEcosystemPreference());
    setReady(true);
  }, []);

  const setEcosystem = useCallback((next: PackageEcosystem) => {
    setEcosystemState(next);
    setEcosystemPreference(next);
  }, []);

  return { ecosystem, setEcosystem, ready };
}
