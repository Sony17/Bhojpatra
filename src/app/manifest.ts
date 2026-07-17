import type { MetadataRoute } from "next";
import { brand } from "@/lib/design-tokens";

/**
 * Web app manifest — installable PWA with brand chrome.
 * Icons: maskable + any from the existing brand mark.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bhojpatra — India's Feast Booking Platform",
    short_name: "Bhojpatra",
    description:
      "Plan your perfect celebration with verified feast specialists. Book caterers, venues and packages across India.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: brand.cream,
    theme_color: brand.red,
    categories: ["food", "lifestyle", "shopping"],
    icons: [
      {
        src: "/bhojpatra-icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/bhojpatra-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
