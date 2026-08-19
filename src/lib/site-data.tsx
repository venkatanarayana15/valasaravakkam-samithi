"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { mergeApi, FALLBACK, type SiteData } from "./data-shape";

const SiteDataContext = createContext<SiteData>(FALLBACK);

let sharedCache: Record<string, unknown> | null | undefined;

export function SiteDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SiteData>(() => mergeApi(sharedCache ?? null));

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (sharedCache !== undefined) {
        if (sharedCache !== null) setData(mergeApi(sharedCache));
        return;
      }
      try {
        const res = await fetch("/api/site", { cache: "no-store" });
        if (!res.ok) throw new Error("api unavailable");
        const json = (await res.json()) as Record<string, unknown>;
        if (cancelled) return;
        sharedCache = json;
        setData(mergeApi(json));
      } catch {
        if (cancelled) return;
        sharedCache = null;
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return <SiteDataContext.Provider value={data}>{children}</SiteDataContext.Provider>;
}

export function useSiteData(): SiteData {
  return useContext(SiteDataContext);
}
