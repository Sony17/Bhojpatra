import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  reconcile,
  resolveHeroBackground,
  DEFAULT_HOME_CONTENT,
  isBrokenHeroImage,
  type HomeContent,
} from "./homeContentData";

describe("homeContentData", () => {
  it("reconcile keeps new hero CTA and trust badges from defaults when absent", () => {
    const merged = reconcile({
      hero: { headlineTop: "Custom headline" },
    } as unknown as Partial<HomeContent>);
    assert.equal(merged.hero.headlineTop, "Custom headline");
    assert.equal(merged.hero.cta, DEFAULT_HOME_CONTENT.hero.cta);
    assert.equal(merged.hero.trustBadges.length, 4);
  });

  it("reconcile replaces hero trust badges when stored array is non-empty", () => {
    const merged = reconcile({
      hero: {
        trustBadges: [
          {
            id: "only-one",
            icon: "shield",
            title: "Add Your Feast",
            titleHi: "अपनी दावत जोड़ें",
            sub: "Start planning",
            subHi: "प्लान शुरू करें",
          },
        ],
      },
    } as unknown as Partial<HomeContent>);
    assert.equal(merged.hero.trustBadges.length, 1);
    assert.equal(merged.hero.trustBadges[0].title, "Add Your Feast");
  });

  it("resolveHeroBackground prefers occasion when priority is occasion", () => {
    const hero = {
      ...DEFAULT_HOME_CONTENT.hero,
      background: "/fallback.webp",
      backgroundsByOccasion: { wedding: "/wedding.webp" },
      backgroundsByLocation: { mumbai: "/mumbai.webp" },
      backgroundPriority: "occasion" as const,
    };
    assert.equal(
      resolveHeroBackground(hero, "wedding", "mumbai"),
      "/wedding.webp",
    );
  });

  it("resolveHeroBackground prefers location when priority is location", () => {
    const hero = {
      ...DEFAULT_HOME_CONTENT.hero,
      background: "/fallback.webp",
      backgroundsByOccasion: { wedding: "/wedding.webp" },
      backgroundsByLocation: { mumbai: "/mumbai.webp" },
      backgroundPriority: "location" as const,
    };
    assert.equal(
      resolveHeroBackground(hero, "wedding", "mumbai"),
      "/mumbai.webp",
    );
  });

  it("isBrokenHeroImage flags known bad Unsplash ids", () => {
    assert.equal(
      isBrokenHeroImage(
        "https://images.unsplash.com/photo-1599669300163-7e84be7172c?w=800",
      ),
      true,
    );
    assert.equal(isBrokenHeroImage("/hero-bg.webp"), false);
  });

  it("reconcile fills legacy brand-ribbon entries with dummy display fields", () => {
    const merged = reconcile({
      brandRibbon: {
        brands: [
          {
            id: "legacy",
            name: "Legacy Brand",
            nameHi: "लेगेसी",
            logo: "/logo.png",
          },
        ],
      },
    } as Partial<HomeContent>);
    const brand = merged.brandRibbon.brands[0];
    assert.equal(brand.name, "Legacy Brand");
    assert.equal(brand.logo, "/logo.png");
    assert.ok(brand.image);
    assert.ok(brand.location);
    assert.ok(brand.locationHi);
    assert.ok(brand.category);
    assert.ok(brand.categoryHi);
    assert.ok(brand.rating > 0);
    assert.ok(brand.reviewCount > 0);
    assert.ok(brand.since > 0);
  });

  it("reconcile keeps brand-ribbon cover, location and rating when stored", () => {
    const merged = reconcile({
      brandRibbon: {
        brands: [
          {
            id: "rich",
            name: "Rich Brand",
            nameHi: "रिच",
            logo: "/logo.png",
            image: "/cover.jpg",
            location: "Lucknow",
            locationHi: "लखनऊ",
            rating: 4.8,
            reviewCount: 256,
          },
        ],
      },
    } as Partial<HomeContent>);
    const brand = merged.brandRibbon.brands[0];
    assert.equal(brand.image, "/cover.jpg");
    assert.equal(brand.location, "Lucknow");
    assert.equal(brand.rating, 4.8);
    assert.equal(brand.reviewCount, 256);
    assert.ok(brand.category);
    assert.ok(brand.since > 0);
  });
});
