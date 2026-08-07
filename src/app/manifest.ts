import type { MetadataRoute } from "next";
import { brand } from "@/lib/design-tokens";

/**
 * Web app manifest — installable PWA with brand chrome.
 *
 * This is what Chrome/Edge read for the "Install app" option: the name, the
 * tile artwork and the splash colors all come from here. Icons are the brand
 * mark in cream on a red tile (`/icons`, generated from `bhojpatra-icon.png`):
 *  - `any`      → rounded tile, shown as-is in the install dialog and on desktop
 *  - `maskable` → full-bleed square with the mark inside the 80% safe zone, so
 *                 Android's circle/squircle masks never clip it
 * Both sizes are real bitmaps at the declared dimensions — a 192 declared on a
 * smaller file is what makes the install dialog look soft.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Bhojpatra — India's Feast Booking Platform",
    short_name: "Bhojpatra",
    description:
      "Plan your perfect celebration with verified feast specialists. Book caterers, venues and packages across India.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: brand.red,
    theme_color: brand.red,
    dir: "ltr",
    lang: "en-IN",
    categories: ["food", "lifestyle", "shopping"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Book a feast", short_name: "Book", url: "/book" },
      { name: "Browse brands", short_name: "Brands", url: "/vendors" },
      { name: "Venues", short_name: "Venues", url: "/venues" },
    ],
  };
}
