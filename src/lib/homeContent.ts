"use client";

import { useSyncExternalStore } from "react";
import {
  categories,
  packages,
  galleryItems,
  testimonials,
} from "@/lib/data";

/**
 * Editable content + imagery for the public **home page**.
 *
 * Mirrors the `sitePages` store: there is no backend in this prototype, so
 * admin edits are persisted to `localStorage` under a single versioned key.
 * Every home-page section reads from this store via `useHomeContent()`, and
 * Admin → Content Control → Home Page writes to it via `saveHomeContent()`, so
 * anything an admin saves is reflected on the live site immediately (and across
 * tabs). Defaults are derived from `src/lib/data.ts` so the seed content always
 * matches the original hardcoded page.
 */

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface HomeCategory {
  id: string;
  name: string;
  nameHi: string;
  image: string;
}

export interface HomePackage {
  id: string;
  name: string;
  nameHi: string;
  price: string;
}

export interface HomeGalleryItem {
  id: string;
  title: string;
  titleHi: string;
  caption: string;
  captionHi: string;
  image: string;
}

export interface HomeTestimonial {
  id: string;
  name: string;
  role: string;
  roleHi: string;
  quote: string;
  quoteHi: string;
  rating: number;
}

export interface HomeContent {
  hero: {
    headlineTop: string;
    headlineTopHi: string;
    headlineBottom: string;
    headlineBottomHi: string;
    lede: string;
    ledeHi: string;
    /** Static backdrop used by the default (Original / Minimal) hero look. */
    background: string;
  };
  services: {
    heading: string;
    headingHi: string;
    subtitle: string;
    subtitleHi: string;
    cta: string;
    ctaHi: string;
    categories: HomeCategory[];
  };
  packages: {
    heading: string;
    headingHi: string;
    subtitle: string;
    subtitleHi: string;
    tiers: HomePackage[];
  };
  gallery: {
    eyebrow: string;
    eyebrowHi: string;
    heading: string;
    headingHi: string;
    headingEm: string;
    headingEmHi: string;
    subtitle: string;
    subtitleHi: string;
    cta: string;
    ctaHi: string;
    items: HomeGalleryItem[];
  };
  testimonials: {
    eyebrow: string;
    eyebrowHi: string;
    heading: string;
    headingHi: string;
    subtitle: string;
    subtitleHi: string;
    items: HomeTestimonial[];
  };
  promo: {
    heading: string;
    headingHi: string;
    subtitle: string;
    subtitleHi: string;
  };
  booking: {
    heading: string;
    headingHi: string;
    subtitle: string;
    subtitleHi: string;
  };
}

/* ── Defaults (seed content, derived from data.ts) ────────────────────────── */

export const DEFAULT_HOME_CONTENT: HomeContent = {
  hero: {
    headlineTop: "Book Verified Caterers, Food Stalls & Famous Vendors.",
    headlineTopHi: "वेरिफाइड कैटरर, फूड स्टॉल और मशहूर वेंडर बुक करें।",
    headlineBottom: "One Bhojpatra Experience.",
    headlineBottomHi: "एक भोजपत्र अनुभव।",
    lede: "Compare curated menus, customize your feast and book trusted celebration partners in minutes.",
    ledeHi:
      "क्यूरेटेड मेन्यू की तुलना करें, अपनी दावत कस्टमाइज़ करें और मिनटों में भरोसेमंद सेलिब्रेशन पार्टनर बुक करें।",
    background: "/hero-bg.webp",
  },
  services: {
    heading: "Services",
    headingHi: "सेवाएं",
    subtitle: "Handpicked specialists across every flavour of your celebration.",
    subtitleHi: "आपके उत्सव के हर स्वाद के लिए चुनिंदा स्पेशलिस्ट।",
    cta: "View All Categories",
    ctaHi: "सभी कैटेगरी देखें",
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      nameHi: c.nameHi,
      image: c.image,
    })),
  },
  packages: {
    heading: "Select Your Package",
    headingHi: "अपना पैकेज चुनें",
    subtitle: "Choose a package as per your preference.",
    subtitleHi: "अपनी पसंद के अनुसार एक पैकेज चुनें।",
    tiers: packages.map((p) => ({
      id: p.id,
      name: p.name,
      nameHi: p.nameHi,
      price: p.price,
    })),
  },
  gallery: {
    eyebrow: "Real Events",
    eyebrowHi: "असली इवेंट",
    heading: "Feasts we've",
    headingHi: "जो भोज हमने",
    headingEm: "brought to life",
    headingEmHi: "साकार किए",
    subtitle:
      "A glimpse from real weddings, corporate galas and house parties — plated, served and celebrated by our specialists.",
    subtitleHi:
      "असली शादियों, कॉर्पोरेट गाला और हाउस पार्टियों की एक झलक — हमारे स्पेशलिस्ट द्वारा परोसी और मनाई गई।",
    cta: "Plan your feast",
    ctaHi: "अपना भोज प्लान करें",
    items: galleryItems.map((g, i) => ({
      id: `g-${i + 1}`,
      title: g.title,
      titleHi: g.titleHi,
      caption: g.caption,
      captionHi: g.captionHi,
      image: g.image,
    })),
  },
  testimonials: {
    eyebrow: "Loved by Hosts",
    eyebrowHi: "मेज़बानों की पसंद",
    heading: "What Our Customers Say",
    headingHi: "हमारे ग्राहक क्या कहते हैं",
    subtitle:
      "From weddings to corporate galas — thousands of celebrations served and remembered.",
    subtitleHi:
      "शादियों से लेकर कॉर्पोरेट गाला तक — हज़ारों उत्सव परोसे और याद रखे गए।",
    items: testimonials.map((t) => ({
      id: t.id,
      name: t.name,
      role: t.role,
      roleHi: t.roleHi,
      quote: t.quote,
      quoteHi: t.quoteHi,
      rating: t.rating,
    })),
  },
  promo: {
    heading: "Get Promotional Offers First",
    headingHi: "प्रोमोशनल ऑफर सबसे पहले पाएं",
    subtitle:
      "Seasonal discounts, early-bird deals & festive menu offers — straight to you.",
    subtitleHi:
      "सीज़नल छूट, अर्ली-बर्ड डील और त्योहारी मेन्यू ऑफर — सीधे आपके पास।",
  },
  booking: {
    heading: "Book Your Celebration",
    headingHi: "अपना उत्सव बुक करें",
    subtitle: "Fill in the details to confirm your booking.",
    subtitleHi: "अपनी बुकिंग पक्की करने के लिए विवरण भरें।",
  },
};

/* ── Store (localStorage + cross-tab/component sync) ──────────────────────── */

const STORAGE_KEY = "bhojpatra.home-content.v3";
const EVENT = "bhojpatra:home-content";

/** Per-section shallow merge so newly-added fields keep a default value, while
 *  a saved array (categories, items…) replaces the default wholesale. */
function reconcile(stored: Partial<HomeContent> | null): HomeContent {
  if (!stored) return DEFAULT_HOME_CONTENT;
  const d = DEFAULT_HOME_CONTENT;
  return {
    hero: { ...d.hero, ...stored.hero },
    services: {
      ...d.services,
      ...stored.services,
      categories: stored.services?.categories?.length
        ? stored.services.categories
        : d.services.categories,
    },
    packages: {
      ...d.packages,
      ...stored.packages,
      tiers: stored.packages?.tiers?.length
        ? stored.packages.tiers
        : d.packages.tiers,
    },
    gallery: {
      ...d.gallery,
      ...stored.gallery,
      items: stored.gallery?.items?.length
        ? stored.gallery.items
        : d.gallery.items,
    },
    testimonials: {
      ...d.testimonials,
      ...stored.testimonials,
      items: stored.testimonials?.items?.length
        ? stored.testimonials.items
        : d.testimonials.items,
    },
    promo: { ...d.promo, ...stored.promo },
    booking: { ...d.booking, ...stored.booking },
  };
}

function read(): HomeContent {
  if (typeof window === "undefined") return DEFAULT_HOME_CONTENT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return reconcile(raw ? (JSON.parse(raw) as Partial<HomeContent>) : null);
  } catch {
    return DEFAULT_HOME_CONTENT;
  }
}

/** Cached snapshot so useSyncExternalStore gets a stable reference. */
let snapshot: HomeContent = DEFAULT_HOME_CONTENT;
let hydrated = false;

function getSnapshot(): HomeContent {
  if (!hydrated) {
    snapshot = read();
    hydrated = true;
  }
  return snapshot;
}

function getServerSnapshot(): HomeContent {
  return DEFAULT_HOME_CONTENT;
}

function subscribe(callback: () => void): () => void {
  const onChange = () => {
    snapshot = read();
    callback();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Persist the next content and notify all subscribers (this tab + others). */
export function saveHomeContent(next: HomeContent): void {
  if (typeof window === "undefined") return;
  snapshot = next;
  hydrated = true;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

/** Reset the home page back to the seed content. */
export function resetHomeContent(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  snapshot = DEFAULT_HOME_CONTENT;
  hydrated = true;
  window.dispatchEvent(new Event(EVENT));
}

/** Read the live home content. Re-renders when an admin saves changes. */
export function useHomeContent(): HomeContent {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* ── Image helper ─────────────────────────────────────────────────────────── */

/**
 * Whether a `next/image` `src` must bypass the optimizer. Local public assets
 * (`/…`) and the allow-listed Unsplash host are optimized as usual; admin-set
 * images (data: URLs from an upload, or a pasted third-party URL) are rendered
 * unoptimized so they don't hit the remote-pattern allow-list.
 */
export function isUnoptimized(src: string): boolean {
  if (!src) return false;
  if (src.startsWith("/")) return false;
  if (src.includes("images.unsplash.com")) return false;
  return true;
}
