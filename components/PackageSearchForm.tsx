"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { extractPackageName } from "@/lib/validation";
import { smoothNavigate } from "@/lib/smooth-navigate";
import { useAiAnalysisPref } from "@/lib/use-ai-analysis-pref";
import { WatchlistSection } from "@/components/Watchlist";
import { PasteListPanel } from "@/components/PasteList";
import { useWatchlist } from "@/lib/use-watchlist";
import { useWatchlistRefresh } from "@/lib/use-watchlist-refresh";
import { summarizeWatchlistAlerts } from "@/lib/watchlist-store";

export interface PackageSearchSuggestion {
  name: string;
  description: string;
  version: string;
}

interface PackageSearchFormProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (packageName: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

type UtilityPanel = "watchlist" | "paste" | "settings" | null;

function SearchIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function ClearIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function CogIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function StarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  );
}

function ClipboardIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
}

export function PackageSearchForm({
  value,
  onChange,
  onSearch,
  loading = false,
  disabled = false,
}: PackageSearchFormProps) {
  const listboxId = useId();
  const router = useRouter();
  const pathname = usePathname();
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const watchlistPanelRef = useRef<HTMLDivElement>(null);
  const pastePanelRef = useRef<HTMLDivElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const allowDropdownRef = useRef(false);
  const lastUtilityTriggerRef = useRef<HTMLButtonElement | null>(null);

  const [utilityPanel, setUtilityPanel] = useState<UtilityPanel>(null);
  const [suggestions, setSuggestions] = useState<PackageSearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const dismissDropdown = useCallback(() => {
    allowDropdownRef.current = false;
    abortRef.current?.abort();
    setIsOpen(false);
    setHighlightIndex(-1);
    setSuggestions([]);
    setSearchCompleted(false);
    setIsSearching(false);
  }, []);

  const closeUtilityPanel = useCallback((restoreFocus = false) => {
    setUtilityPanel(null);
    if (restoreFocus) {
      queueMicrotask(() => lastUtilityTriggerRef.current?.focus());
    }
  }, []);

  const toggleUtilityPanel = useCallback(
    (
      panel: Exclude<UtilityPanel, null>,
      trigger: HTMLButtonElement | null,
    ) => {
      lastUtilityTriggerRef.current = trigger;
      setUtilityPanel((current) => (current === panel ? null : panel));
      dismissDropdown();
    },
    [dismissDropdown],
  );

  const runSearch = useCallback(
    (name: string) => {
      const trimmed = extractPackageName(name);
      if (!trimmed) return;
      dismissDropdown();
      closeUtilityPanel();
      inputRef.current?.blur();
      onChange(trimmed);
      onSearch(trimmed);
    },
    [onChange, onSearch, dismissDropdown, closeUtilityPanel],
  );

  const handleClear = useCallback(() => {
    allowDropdownRef.current = true;
    dismissDropdown();
    onChange("");
    if (pathname !== "/") {
      smoothNavigate(() => router.push("/"));
      return;
    }
    inputRef.current?.focus();
  }, [onChange, dismissDropdown, pathname, router]);

  useEffect(() => {
    if (loading || !allowDropdownRef.current || utilityPanel) return;

    const query = value.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      dismissDropdown();
      return;
    }

    setSearchCompleted(false);

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/package-search?q=${encodeURIComponent(query)}&limit=8`,
          { signal: controller.signal },
        );
        const data = await res.json();
        if (controller.signal.aborted || !allowDropdownRef.current) return;

        const packages: PackageSearchSuggestion[] = data.packages ?? [];
        setSuggestions(packages);
        setIsOpen(true);
        setHighlightIndex(packages.length > 0 ? 0 : -1);
        setSearchCompleted(true);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        if (!allowDropdownRef.current) return;
        setSuggestions([]);
        setIsOpen(true);
        setSearchCompleted(true);
        setHighlightIndex(-1);
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [value, dismissDropdown, loading, utilityPanel]);

  useEffect(() => {
    if (loading) dismissDropdown();
  }, [loading, dismissDropdown]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        dismissDropdown();
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [dismissDropdown]);

  useEffect(() => {
    if (!utilityPanel) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeUtilityPanel(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [utilityPanel, closeUtilityPanel]);

  useEffect(() => {
    if (utilityPanel === "watchlist") {
      watchlistPanelRef.current?.focus();
    } else if (utilityPanel === "paste") {
      pastePanelRef.current?.focus();
    } else if (utilityPanel === "settings") {
      settingsPanelRef.current?.focus();
    }
  }, [utilityPanel]);

  const showResultsPanel =
    !utilityPanel &&
    !loading &&
    isOpen &&
    value.trim().length >= MIN_QUERY_LENGTH &&
    !isSearching;
  const showNoMatches =
    !loading && showResultsPanel && searchCompleted && suggestions.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOpen && highlightIndex >= 0 && suggestions[highlightIndex]) {
      runSearch(suggestions[highlightIndex].name);
      return;
    }
    runSearch(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" && utilityPanel) {
      e.preventDefault();
      closeUtilityPanel(true);
      return;
    }

    const showDropdown =
      isOpen && value.trim().length >= MIN_QUERY_LENGTH && !isSearching;

    if (e.key === "Escape") {
      if (showDropdown || showNoMatches) {
        e.preventDefault();
        dismissDropdown();
        return;
      }
      if (value) {
        e.preventDefault();
        handleClear();
        return;
      }
    }

    if (!showDropdown || suggestions.length === 0) {
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => (i + 1) % suggestions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) =>
          i <= 0 ? suggestions.length - 1 : i - 1,
        );
        break;
      case "Enter":
        if (highlightIndex >= 0 && suggestions[highlightIndex]) {
          e.preventDefault();
          runSearch(suggestions[highlightIndex].name);
        }
        break;
      case "Tab":
        dismissDropdown();
        break;
    }
  };

  const activeDescendantId =
    highlightIndex >= 0 ? `${listboxId}-option-${highlightIndex}` : undefined;

  const showClear = value.length > 0 && !disabled && !loading;
  const isHome = pathname === "/";
  const { enabled: aiEnabled, setEnabled: setAiEnabled, ready: aiPrefReady } =
    useAiAnalysisPref();
  const watchlist = useWatchlist();
  const watchCount = watchlist.length;
  const alertSummary = summarizeWatchlistAlerts(watchlist);
  const { checking: watchlistChecking } = useWatchlistRefresh(isHome);

  useEffect(() => {
    if (!isHome) closeUtilityPanel();
  }, [isHome, closeUtilityPanel]);

  const utilityButtonClass = (active: boolean) =>
    `relative inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
      active
        ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
        : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/80 dark:hover:text-gray-100"
    }`;

  return (
    <div
      ref={cardRef}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-2 sm:p-8 mb-4 sm:mb-8"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <form onSubmit={handleSubmit} className="min-w-0 flex-1">
          <div ref={containerRef} className="relative">
            <label htmlFor="packageName" className="sr-only">
              Package name
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                <SearchIcon />
              </span>
              <input
                ref={inputRef}
                type="search"
                id="packageName"
                name="packageName"
                value={value}
                onChange={(e) => {
                  allowDropdownRef.current = true;
                  closeUtilityPanel();
                  onChange(e.target.value);
                }}
                onFocus={() => {
                  if (utilityPanel) closeUtilityPanel();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search npm packages, e.g. react, lodash, @types/node"
                className={`w-full text-base py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-inset focus:ring-blue-500/30 dark:focus:border-blue-400 dark:bg-gray-700 dark:text-white disabled:opacity-60 pl-10 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden ${
                  showClear ? "pr-10" : "pr-4"
                }`}
                disabled={disabled || loading}
                role="combobox"
                aria-expanded={showResultsPanel || showNoMatches}
                aria-controls={listboxId}
                aria-activedescendant={activeDescendantId}
                aria-autocomplete="list"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
                inputMode="search"
              />
              {showClear && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors"
                  aria-label="Clear search"
                >
                  <ClearIcon />
                </button>
              )}
            </div>
            {!loading &&
              !utilityPanel &&
              isSearching &&
              value.trim().length >= MIN_QUERY_LENGTH && (
                <p className="mt-2.5 text-xs text-gray-500 dark:text-gray-400">
                  Searching npm…
                </p>
              )}
            {showNoMatches && (
              <div
                id={listboxId}
                role="listbox"
                className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg px-4 py-3"
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No matches found
                </p>
              </div>
            )}
            {showResultsPanel && suggestions.length > 0 && (
              <ul
                id={listboxId}
                role="listbox"
                className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg"
              >
                {suggestions.map((pkg, index) => {
                  const selected = index === highlightIndex;
                  return (
                    <li
                      key={pkg.name}
                      id={`${listboxId}-option-${index}`}
                      role="option"
                      aria-selected={selected}
                    >
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setHighlightIndex(index)}
                        onClick={() => runSearch(pkg.name)}
                        className={`w-full px-4 py-3 text-left transition-colors ${
                          selected
                            ? "bg-blue-50 dark:bg-blue-900/30"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        }`}
                      >
                        <span className="block font-medium text-gray-900 dark:text-white truncate">
                          {pkg.name}
                          <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                            v{pkg.version}
                          </span>
                        </span>
                        <span className="block text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">
                          {pkg.description}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </form>

        {isHome && (
          <div
            role="toolbar"
            aria-label="Search utilities"
            className="flex shrink-0 items-center gap-0.5 sm:gap-1"
          >
            <button
              type="button"
              title={
                utilityPanel === "watchlist"
                  ? "Hide watchlist"
                  : "Show watchlist"
              }
              aria-label={
                utilityPanel === "watchlist"
                  ? watchCount > 0
                    ? alertSummary.total > 0
                      ? `Hide watchlist (${watchCount} packages, ${alertSummary.total} with updates)`
                      : `Hide watchlist (${watchCount} packages)`
                    : "Hide watchlist"
                  : watchCount > 0
                    ? alertSummary.total > 0
                      ? `Show watchlist (${watchCount} packages, ${alertSummary.total} with updates)`
                      : `Show watchlist (${watchCount} packages)`
                    : "Show watchlist"
              }
              aria-expanded={utilityPanel === "watchlist"}
              aria-controls="shell-panel-watchlist"
              aria-haspopup="true"
              onClick={(e) =>
                toggleUtilityPanel("watchlist", e.currentTarget)
              }
              className={utilityButtonClass(utilityPanel === "watchlist")}
            >
              <StarIcon
                className={`w-4 h-4 ${
                  utilityPanel === "watchlist"
                    ? "fill-amber-400 text-amber-400"
                    : ""
                }`}
              />
              {alertSummary.total > 0 && (
                <span
                  className={`absolute -right-0.5 -top-0.5 min-w-4 rounded-full px-1 text-[10px] font-semibold leading-4 text-white tabular-nums ${
                    alertSummary.tone === "vulns"
                      ? "bg-red-600"
                      : alertSummary.tone === "version"
                        ? "bg-emerald-600"
                        : "bg-orange-500"
                  }`}
                  aria-hidden="true"
                >
                  {alertSummary.total > 99 ? "99+" : alertSummary.total}
                </span>
              )}
            </button>
            <button
              type="button"
              title={
                utilityPanel === "paste"
                  ? "Close Analyse package.json"
                  : "Analyse package.json"
              }
              aria-label={
                utilityPanel === "paste"
                  ? "Close Analyse package.json"
                  : "Analyse package.json"
              }
              aria-expanded={utilityPanel === "paste"}
              aria-controls="shell-panel-paste"
              aria-haspopup="true"
              onClick={(e) => toggleUtilityPanel("paste", e.currentTarget)}
              className={utilityButtonClass(utilityPanel === "paste")}
            >
              <ClipboardIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              title={
                utilityPanel === "settings" ? "Hide settings" : "Show settings"
              }
              aria-label={
                utilityPanel === "settings" ? "Hide settings" : "Show settings"
              }
              aria-expanded={utilityPanel === "settings"}
              aria-controls="shell-panel-settings"
              aria-haspopup="true"
              onClick={(e) =>
                toggleUtilityPanel("settings", e.currentTarget)
              }
              className={utilityButtonClass(utilityPanel === "settings")}
            >
              <CogIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {isHome && (
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {utilityPanel === "watchlist"
            ? watchCount > 0
              ? `Watchlist opened, ${watchCount} packages`
              : "Watchlist opened, no packages yet"
            : utilityPanel === "paste"
              ? "Analyse package.json opened"
              : utilityPanel === "settings"
                ? "Settings opened"
                : ""}
        </div>
      )}

      {isHome && utilityPanel === "watchlist" && (
        <div
          id="shell-panel-watchlist"
          ref={watchlistPanelRef}
          role="region"
          aria-labelledby="shell-watchlist-heading"
          tabIndex={-1}
          className="mt-3 sm:mt-4 border-t border-gray-100 dark:border-gray-700 pt-3 sm:pt-4 max-h-80 overflow-y-auto outline-none"
        >
          <h2 id="shell-watchlist-heading" className="sr-only">
            Watchlist
          </h2>
          <WatchlistSection embedded checking={watchlistChecking} />
        </div>
      )}

      {isHome && utilityPanel === "paste" && (
        <div
          id="shell-panel-paste"
          ref={pastePanelRef}
          role="region"
          aria-labelledby="shell-paste-heading"
          tabIndex={-1}
          className="mt-3 sm:mt-4 border-t border-gray-100 dark:border-gray-700 pt-3 sm:pt-4 max-h-[32rem] overflow-y-auto outline-none"
        >
          <h2 id="shell-paste-heading" className="sr-only">
            Analyse package.json
          </h2>
          <PasteListPanel />
        </div>
      )}

      {isHome && utilityPanel === "settings" && (
        <div
          id="shell-panel-settings"
          ref={settingsPanelRef}
          role="region"
          aria-labelledby="shell-settings-heading"
          tabIndex={-1}
          className="mt-3 sm:mt-4 border-t border-gray-100 dark:border-gray-700 pt-3 sm:pt-4 space-y-4 outline-none"
        >
          <h2 id="shell-settings-heading" className="sr-only">
            Settings
          </h2>
          <div className="flex items-center justify-between gap-4">
            <p
              id="ai-analysis-toggle-label"
              className="text-sm font-medium text-gray-900 dark:text-white"
            >
              Include AI analysis?
            </p>
            {aiPrefReady ? (
              <button
                type="button"
                role="switch"
                aria-checked={aiEnabled}
                aria-labelledby="ai-analysis-toggle-label"
                onClick={() => setAiEnabled(!aiEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800 ${
                  aiEnabled
                    ? "bg-blue-600"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    aiEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                  aria-hidden="true"
                />
              </button>
            ) : (
              <span
                className="inline-block h-6 w-11 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700"
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
