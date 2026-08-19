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

export function mergeApi(api: ApiShape | null): SiteData {
  if (!api) return FALLBACK;
  const sc = api.siteconfig as { siteConfig?: Partial<typeof staticSiteConfig>; socialLinks?: typeof staticSocialLinks } | undefined;
  return {
    siteConfig: sc?.siteConfig ? { ...staticSiteConfig, ...sc.siteConfig } : staticSiteConfig,
    socialLinks: Array.isArray(sc?.socialLinks) && sc.socialLinks.length ? sc.socialLinks : staticSocialLinks,
    navLinks: staticNavLinks,
    stats: Array.isArray(api.stats) && (api.stats as unknown[]).length ? (api.stats as typeof staticStats) : staticStats,
    activityLevels: Array.isArray(api.activities) && (api.activities as unknown[]).length ? (api.activities as typeof staticActivityLevels) : staticActivityLevels,
    upcomingEvents: Array.isArray(api.events) && (api.events as unknown[]).length ? (api.events as typeof staticUpcomingEvents) : staticUpcomingEvents,
    services: Array.isArray(api.services) && (api.services as unknown[]).length ? (api.services as typeof staticServices) : staticServices,
    coordinators: Array.isArray(api.coordinators) && (api.coordinators as unknown[]).length ? (api.coordinators as typeof staticCoordinators) : staticCoordinators,
    galleryCategories: Array.isArray(api.gallery) && (api.gallery as unknown[]).length ? (api.gallery as typeof staticGalleryCategories) : staticGalleryCategories,
    homeGalleryImages: Array.isArray(api.homegallery) && (api.homegallery as unknown[]).length ? (api.homegallery as typeof staticHomeGalleryImages) : staticHomeGalleryImages,
    aboutSections: Array.isArray(api.about) && (api.about as unknown[]).length ? (api.about as typeof staticAboutSections) : staticAboutSections,
    members: Array.isArray(api.members) ? api.members : [],
    balvikas: Array.isArray(api.balvikas) ? api.balvikas : [],
  };
}

export function toApiShape(data: SiteData): ApiShape {
  return {
    siteconfig: { siteConfig: data.siteConfig, socialLinks: data.socialLinks },
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
