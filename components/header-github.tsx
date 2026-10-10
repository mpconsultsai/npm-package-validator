"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { githubWebUrl } from "@/lib/utils/github-repository";

const HeaderGithubContext = createContext<{
  url: string | null;
  setUrl: (url: string | null) => void;
} | null>(null);

export function HeaderGithubProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const value = useMemo(() => ({ url, setUrl }), [url]);
  return (
    <HeaderGithubContext.Provider value={value}>
      {children}
    </HeaderGithubContext.Provider>
  );
}

export function useHeaderGithubUrl(): string | null {
  return useContext(HeaderGithubContext)?.url ?? null;
}

/** Show this package’s GitHub repo beside the site title while the page is open. */
export function usePackageGithubLink(repository?: string | null) {
  const setUrl = useContext(HeaderGithubContext)?.setUrl;
  const url = githubWebUrl(repository);
  useEffect(() => {
    if (!setUrl) return;
    setUrl(url);
    return () => setUrl(null);
  }, [setUrl, url]);
}
