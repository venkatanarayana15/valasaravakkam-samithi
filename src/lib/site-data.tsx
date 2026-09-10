"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { mergeApi, applyThemePreset, emptyTenant, FALLBACK, type SiteData } from "./data-shape";
import { tenantSiteUrl, DEFAULT_SLUG } from "./tenants";

const SiteDataContext = createContext<SiteData>(FALLBACK);

let sharedCache: Record<string, unknown> | null | undefined;
let sharedCacheSlug = DEFAULT_SLUG;

type ProviderProps = {
  children: ReactNode;
  /** Tenant slug. Omit for the default (single-site / dev) behavior. */
  slug?: string;
};

export function SiteDataProvider({ children, slug = DEFAULT_SLUG }: ProviderProps) {
  const [data, setData] = useState<SiteData>(() => {
    // Non-default tenants start EMPTY (notice shell) so first paint can
    // never flash another samithi's content before the fetch resolves.
    // The default site keeps the instant static first paint as before.
    const initial =
      slug === DEFAULT_SLUG
        ? mergeApi(sharedCache !== undefined && sharedCacheSlug === slug ? sharedCache : null)
        : emptyTenant(slug, 'unknown');
    // Force the requested tenant's identity even on fallback content.
    initial.slug = slug;
    applyThemePreset(initial.theme);
    return initial;
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Unknown slugs never render fallback content: show the notice shell.
      try {
        const res = await fetch(tenantSiteUrl(slug), { cache: "no-store" });
        if (!res.ok) {
          if (cancelled) return;
          const err = res.status === 403 ? 'suspended' as const : 'unknown' as const;
          const empty = emptyTenant(slug, err);
          applyThemePreset(empty.theme);
          setData(empty);
          return;
        }
        const json = (await res.json()) as Record<string, unknown>;
        if (cancelled) return;
        if (slug === DEFAULT_SLUG) sharedCache = json;
        sharedCacheSlug = slug;
        const live = mergeApi(json);
        live.slug = slug; // URL slug is authority, never the payload.
        applyThemePreset(live.theme);
        setData(live);
      } catch {
        if (cancelled) return;
        // Backend unreachable: default tenant falls back to static content;
        // unknown tenants keep the notice shell (never another samithi's data).
        if (slug !== DEFAULT_SLUG) {
          const empty = emptyTenant(slug, 'unknown');
          applyThemePreset(empty.theme);
          setData(empty);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return <SiteDataContext.Provider value={data}>{children}</SiteDataContext.Provider>;
}

export function useSiteData(): SiteData {
  return useContext(SiteDataContext);
}
