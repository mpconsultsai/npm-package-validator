"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { extractPackageName } from "@/lib/validation";

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

function SearchIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
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

export function PackageSearchForm({
  value,
  onChange,
  onSearch,
  loading = false,
  disabled = false,
}: PackageSearchFormProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const allowDropdownRef = useRef(false);

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

  const runSearch = useCallback(
    (name: string) => {
      const trimmed = extractPackageName(name);
      if (!trimmed) return;
      dismissDropdown();
      inputRef.current?.blur();
      onChange(trimmed);
      onSearch(trimmed);
    },
    [onChange, onSearch, dismissDropdown],
  );

  const handleClear = useCallback(() => {
    allowDropdownRef.current = true;
    dismissDropdown();
    onChange("");
    inputRef.current?.focus();
  }, [onChange, dismissDropdown]);

  useEffect(() => {
    if (loading || !allowDropdownRef.current) return;

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
  }, [value, dismissDropdown, loading]);

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

  const showResultsPanel =
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-2 sm:p-8 mb-4 sm:mb-8">
      <form onSubmit={handleSubmit}>
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
                onChange(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search npm packages, e.g. react, lodash, @types/node"
              className={`w-full text-base py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-60 pl-10 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden ${
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
          {!loading && isSearching && value.trim().length >= MIN_QUERY_LENGTH && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
        {loading && (
          <div
            role="status"
            aria-live="polite"
            className="mt-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3"
          >
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Analysing package…
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              If the server was recently restarted, this may take a moment while
              it comes back online.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
