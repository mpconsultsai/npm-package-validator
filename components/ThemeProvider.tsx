"use client";

import { useThemePref } from "@/lib/use-theme-pref";

/** Keeps `html.dark` in sync with the theme preference. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useThemePref();
  return children;
}
