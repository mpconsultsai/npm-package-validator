"use client";

import { useSyncExternalStore, useCallback } from "react";
import {
  getWatchlistSnapshot,
  getWatchlistServerSnapshot,
  subscribeWatchlist,
  isWatched,
  toggleWatchlist,
  updateWatchlistSummary,
  removeFromWatchlist,
  type WatchlistSummary,
} from "@/lib/watchlist-store";

export function useWatchlist() {
  return useSyncExternalStore(
    subscribeWatchlist,
    getWatchlistSnapshot,
    getWatchlistServerSnapshot,
  );
}

export function useIsWatched(packageName: string): boolean {
  const entries = useWatchlist();
  const key = packageName.toLowerCase();
  return entries.some((entry) => entry.name.toLowerCase() === key);
}

export function useWatchlistActions() {
  const toggle = useCallback(
    (packageName: string, summary?: WatchlistSummary) =>
      toggleWatchlist(packageName, summary),
    [],
  );
  const remove = useCallback((packageName: string) => {
    removeFromWatchlist(packageName);
  }, []);
  const updateSummary = useCallback(
    (packageName: string, summary: WatchlistSummary) => {
      if (!isWatched(packageName)) return;
      updateWatchlistSummary(packageName, summary);
    },
    [],
  );

  return { toggle, remove, updateSummary };
}
