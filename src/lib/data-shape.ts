import {
  siteConfig as staticSiteConfig,
  socialLinks as staticSocialLinks,
  navLinks as staticNavLinks,
  stats as staticStats,
  activityLevels as staticActivityLevels,
  upcomingEvents as staticUpcomingEvents,
  services as staticServices,
  coordinators as staticCoordinators,
  galleryCategories as staticGalleryCategories,
  homeGalleryImages as staticHomeGalleryImages,
  aboutSections as staticAboutSections,
} from "./data";

export const THEMES = ['theme-1', 'theme-2', 'theme-3', 'theme-4', 'theme-5'] as const;
export type Theme = (typeof THEMES)[number];

export function asTheme(value: unknown): Theme {
  return (typeof value === 'string' && (THEMES as readonly string[]).includes(value) ? value : 'theme-1') as Theme;
}

// Apply the tenant's preset to <html>. Unlisted values fall back to theme-1;
// the attribute drives the [data-theme-preset] rules in globals.css.
export function applyThemePreset(theme: unknown): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.themePreset = asTheme(theme);
}

// Empty tenant shell: rendered when the slug lookup fails (unknown or
// suspended). All sections hide themselves on empty collections, so only
// an explicit notice is shown — never another samithi's content.
export function emptyTenant(slug: string, err: 'unknown' | 'suspended'): SiteData {
  return {
    ...FALLBACK,
    slug,
    tenantError: err,
    upcomingEvents: [],
    services: [],
    stats: [],
    activityLevels: [],
    coordinators: [],
    galleryCategories: [],
    homeGalleryImages: [],
    aboutSections: [],
  };
}

export type SiteData = {
  /** Tenant slug this payload belongs to (default site: 'valasaravakkam'). */
  slug: string;
  /** Set when the tenant lookup failed instead of rendering data. */
  tenantError: null | 'unknown' | 'suspended';
  theme: Theme;
  siteConfig: typeof staticSiteConfig;
  socialLinks: typeof staticSocialLinks;
  navLinks: typeof staticNavLinks;
  stats: typeof staticStats;
  activityLevels: typeof staticActivityLevels;
  upcomingEvents: typeof staticUpcomingEvents;
  services: typeof staticServices;
  coordinators: typeof staticCoordinators;
  galleryCategories: typeof staticGalleryCategories;
  homeGalleryImages: typeof staticHomeGalleryImages;
  aboutSections: typeof staticAboutSections;
  // Managed in the CMS; token-gated server-side and not rendered publicly.
  members: unknown[];
  balvikas: unknown[];
};

export const FALLBACK: SiteData = {
  slug: 'valasaravakkam',
  tenantError: null,
  theme: 'theme-1',
  siteConfig: staticSiteConfig,
  socialLinks: staticSocialLinks,
  navLinks: staticNavLinks,
  stats: staticStats,
  activityLevels: staticActivityLevels,
  upcomingEvents: staticUpcomingEvents,
  services: staticServices,
  coordinators: staticCoordinators,
  galleryCategories: staticGalleryCategories,
  homeGalleryImages: staticHomeGalleryImages,
  aboutSections: staticAboutSections,
  members: [],
  balvikas: [],
};

type ApiShape = Record<string, unknown>;

/**
 * Presence-based pick: if the key EXISTS in the API payload we trust it even
 * when it is an empty array (admin deliberately cleared the collection).
 * Only when a key is entirely ABSENT do we fall back to static content —
 * which happens when the admin/Catalyst backend is unreachable.
 */
function pick<T>(api: ApiShape, key: string, fallback: T): T {
  return Object.prototype.hasOwnProperty.call(api, key) && Array.isArray(api[key])
    ? (api[key] as T)
    : fallback;
}

export function mergeApi(api: ApiShape | null): SiteData {
  if (!api) return FALLBACK;
  const sc = api.siteconfig as
    | {
        siteConfig?: Partial<typeof staticSiteConfig>;
        socialLinks?: typeof staticSocialLinks;
        navLinks?: typeof staticNavLinks;
      }
    | undefined;
  const samithi = api.samithi as { slug?: unknown; theme?: unknown } | undefined;
  return {
    slug: typeof samithi?.slug === 'string' && samithi.slug ? samithi.slug : 'valasaravakkam',
    tenantError: null,
    theme: asTheme(samithi?.theme),
    siteConfig: sc?.siteConfig ? { ...staticSiteConfig, ...sc.siteConfig } : staticSiteConfig,
    socialLinks: Array.isArray(sc?.socialLinks) ? sc.socialLinks : staticSocialLinks,
    navLinks: Array.isArray(sc?.navLinks) ? sc.navLinks : staticNavLinks,
    stats: pick(api, "stats", staticStats),
    activityLevels: pick(api, "activities", staticActivityLevels),
    upcomingEvents: pick(api, "events", staticUpcomingEvents),
    services: pick(api, "services", staticServices),
    coordinators: pick(api, "coordinators", staticCoordinators),
    galleryCategories: pick(api, "gallery", staticGalleryCategories),
    homeGalleryImages: pick(api, "homegallery", staticHomeGalleryImages),
    aboutSections: pick(api, "about", staticAboutSections),
    members: pick(api, "members", [] as unknown[]),
    balvikas: pick(api, "balvikas", [] as unknown[]),
  };
}
