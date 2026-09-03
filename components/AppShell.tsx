"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PackageSearchForm } from "@/components/PackageSearchForm";
import { smoothNavigate } from "@/lib/smooth-navigate";

const SearchLoadingContext = createContext<Dispatch<
  SetStateAction<boolean>
> | null>(null);

export function useShellSearchLoading(loading: boolean) {
  const setLoading = useContext(SearchLoadingContext);
  useEffect(() => {
    if (!setLoading) return;
    setLoading(loading);
    return () => setLoading(false);
  }, [loading, setLoading]);
}

function packageNameFromPath(pathname: string): string {
  if (!pathname.startsWith("/package/")) return "";
  try {
    return decodeURIComponent(
      pathname.slice("/package/".length).split("/")[0] ?? "",
    );
  } catch {
    return "";
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const pathPackage = packageNameFromPath(pathname);
  const isHome = pathname === "/";
  const [query, setQuery] = useState(pathPackage);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    setQuery(pathPackage);
  }, [pathPackage]);

  return (
    <SearchLoadingContext.Provider value={setSearchLoading}>
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-3 sm:px-4 pt-6 pb-3 sm:py-16">
          <div className="max-w-4xl mx-auto">
            <div className="site-chrome-header">
              <PageHeader showHomeLink={!isHome} />
            </div>
            <div className="site-chrome-search relative z-30">
              <PackageSearchForm
                value={query}
                onChange={setQuery}
                onSearch={(name) =>
                  smoothNavigate(() =>
                    router.push("/package/" + encodeURIComponent(name)),
                  )
                }
                loading={searchLoading}
              />
            </div>
            <div key={pathname} className="route-panel relative z-0">
              {children}
            </div>
          </div>
        </div>
      </main>
    </SearchLoadingContext.Provider>
  );
}
