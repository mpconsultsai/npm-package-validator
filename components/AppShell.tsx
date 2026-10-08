"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { InfoCards } from "@/components/InfoCards";
import { PageHeader } from "@/components/PageHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PackageSearchForm } from "@/components/PackageSearchForm";
import { smoothNavigate } from "@/lib/smooth-navigate";
import {
  packagePagePath,
  parsePackageRoute,
  type PackageEcosystem,
} from "@/lib/package-routes";
import {
  getEcosystemPreference,
  setEcosystemPreference,
} from "@/lib/ecosystem-pref";

const SearchLoadingContext = createContext<Dispatch<
  SetStateAction<boolean>
> | null>(null);

export function useShellSearchLoading(loading: boolean) {
  const setLoading = useContext(SearchLoadingContext);
  useLayoutEffect(() => {
    if (!setLoading) return;
    setLoading(loading);
    return () => setLoading(false);
  }, [loading, setLoading]);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const route = parsePackageRoute(pathname);
  const pathPackage = route?.name ?? "";
  const pathEcosystem: PackageEcosystem = route?.ecosystem ?? "npm";
  const isHome = pathname === "/";
  const [query, setQuery] = useState(pathPackage);
  const [searchLoading, setSearchLoading] = useState(false);
  const [toolbarEcosystem, setToolbarEcosystem] =
    useState<PackageEcosystem>(pathEcosystem);

  useEffect(() => {
    setQuery(pathPackage);
    if (route?.ecosystem) {
      setEcosystemPreference(route.ecosystem);
      setToolbarEcosystem(route.ecosystem);
    } else if (pathname === "/") {
      setToolbarEcosystem(getEcosystemPreference());
    }
  }, [pathPackage, route?.ecosystem, pathname]);

  const routeEcosystem = route?.ecosystem;
  const hideRoutePanel = Boolean(
    routeEcosystem && routeEcosystem !== toolbarEcosystem,
  );
  const showPackageDivider = !isHome && !hideRoutePanel;

  useLayoutEffect(() => {
    if (route?.name && !hideRoutePanel) {
      setSearchLoading(true);
    }
  }, [pathname, route?.name, hideRoutePanel]);

  const handleEcosystemChange = (next: PackageEcosystem) => {
    setToolbarEcosystem(next);
    setSearchLoading(false);
  };

  return (
    <SearchLoadingContext.Provider value={setSearchLoading}>
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-3 sm:px-4 pt-4 pb-3 sm:pt-8 sm:pb-10">
          <div className="max-w-4xl mx-auto">
            <div className="site-chrome-header">
              <PageHeader showHomeLink={!isHome} />
            </div>
            <div className="site-chrome-search relative z-30">
              <PackageSearchForm
                value={query}
                onChange={setQuery}
                initialEcosystem={pathEcosystem}
                onEcosystemChange={handleEcosystemChange}
                onSearch={(name, ecosystem) => {
                  setSearchLoading(true);
                  smoothNavigate(() =>
                    router.push(packagePagePath(ecosystem, name)),
                  );
                }}
                loading={searchLoading}
              />
            </div>
            {showPackageDivider && (
              <div
                className="mt-4 mb-2 sm:mt-6 sm:mb-3 border-t border-gray-200 dark:border-gray-700"
                role="separator"
                aria-hidden="true"
              />
            )}
            <div
              key={isHome ? pathname : `${pathname}:${toolbarEcosystem}`}
              className="route-panel relative z-0"
            >
              {hideRoutePanel && route ? <InfoCards /> : children}
            </div>
            <SiteFooter />
          </div>
        </div>
      </main>
    </SearchLoadingContext.Provider>
  );
}
