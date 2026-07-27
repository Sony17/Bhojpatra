/**
 * Deep-links from the home rails (categories / occasions) into the catalog and
 * booking flows. Single source of truth so the home sections and their "View
 * all" listing pages resolve identical hrefs.
 */

// Maps a service category to a pre-filtered vendor-catalog deep-link. Every
// card lands on a filtered catalog (never the unfiltered "all vendors" list) —
// "Caterers" lenses to full-service catering, the specialist cards to their
// cuisine / meal-type / catering-category slice.
const CATEGORY_HREF: Record<string, string> = {
  caterers: "/vendors?category=full-catering",
  "live-counters": "/vendors?meal=Live+Counters",
  sweets: "/vendors?cuisine=Sweets",
  chaat: "/vendors?cuisine=Chaat",
  beverages: "/vendors?cuisine=Beverages",
  decor: "/vendors?cuisine=Decor",
};

/** Vendor-catalog link for a service category (falls back to a name search). */
export function serviceCategoryHref(id: string, name: string): string {
  return CATEGORY_HREF[id] ?? `/vendors?q=${encodeURIComponent(name)}`;
}

/** Booking-wizard link pre-selecting an occasion. */
export function occasionHref(id: string): string {
  return `/book?occasion=${id}`;
}
