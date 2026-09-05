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

export type SiteData = {
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
  members: unknown[];
  balvikas: unknown[];
};

export const FALLBACK: SiteData = {
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
  return {
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

export function toApiShape(data: SiteData): ApiShape {
  return {
    siteconfig: { siteConfig: data.siteConfig, socialLinks: data.socialLinks, navLinks: data.navLinks },
    stats: data.stats,
    activities: data.activityLevels,
    events: data.upcomingEvents,
    services: data.services,
    coordinators: data.coordinators,
    gallery: data.galleryCategories,
    homegallery: data.homeGalleryImages,
    about: data.aboutSections,
    members: data.members,
    balvikas: data.balvikas,
  };
}
