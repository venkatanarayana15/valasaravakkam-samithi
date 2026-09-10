import { describe, it, expect } from "vitest";
import {
  siteConfig,
  navLinks,
  socialLinks,
  galleryCategories,
  coordinators,
  asset,
  ASSET_BASE,
} from "@/lib/data";

describe("siteConfig", () => {
  it("has complete public contact details", () => {
    expect(siteConfig.name).toBeTruthy();
    expect(siteConfig.email).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
    expect(siteConfig.phone.replace(/\D/g, "")).toMatch(/^\d{10,12}$/);
    expect(siteConfig.address).toBeTruthy();
  });

  it("uses https for every external URL", () => {
    const urls = [siteConfig.whatsapp, siteConfig.youtube, siteConfig.mapsEmbed];
    for (const u of urls) expect(u.startsWith("https://")).toBe(true);
  });
});

describe("navLinks", () => {
  it("targets sections that exist as ids on the home page markup contract", () => {
    // Every hash link must map to a real section id — Broken section anchors
    // silently kill the BottomNav/SiteHeader active-state highlighting.
    for (const l of navLinks) expect(l.href).toMatch(/^\/#[\w-]+$/);
    const ids = navLinks.map((l) => l.href.replace(/^\/#/, ""));
    expect(ids).toContain("hero");
    expect(ids).toContain("contact");
  });

  it("uses icons that the header/footer icon maps understand", () => {
    const known = ["bi-house", "bi-file-earmark-text", "bi-images", "bi-hdd-stack", "bi-person", "bi-envelope"];
    for (const l of navLinks) expect(known).toContain(l.icon);
  });
});

describe("socialLinks", () => {
  it("never ships javascript: or data: hrefs", () => {
    for (const l of socialLinks) {
      expect(l.href.startsWith("javascript:")).toBe(false);
      expect(l.href.startsWith("data:")).toBe(false);
    }
  });
});

describe("galleryCategories", () => {
  it("every referenced image is a local path that starts with /assets", () => {
    for (const cat of galleryCategories) {
      expect(cat.slug).toMatch(/^[a-z0-9-]+$/);
      for (const img of cat.images) {
        expect(img.src.startsWith(`${ASSET_BASE}/assets/`)).toBe(true);
        expect(img.title).toBeTruthy();
      }
    }
  });

  it("slugs are unique (route params + sitemap depend on them)", () => {
    const slugs = galleryCategories.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("coordinators", () => {
  it("every coordinator has name, role and image", () => {
    for (const c of coordinators) {
      expect(c.name.trim()).toBeTruthy();
      expect(c.role.trim()).toBeTruthy();
      expect(c.image.startsWith(`${ASSET_BASE}/assets/`)).toBe(true);
    }
  });
});

describe("asset()", () => {
  it("encodes unsafe characters in paths (spaces in filenames)", () => {
    const url = asset("/assets/img/gallery/balvikas/summer camp.jpg");
    expect(url).not.toContain(" ");
    expect(url).toContain("summer%20camp.jpg");
  });
});
