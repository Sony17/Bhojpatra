"use client";

import { useLang } from "@/lib/i18n";
import { useHomeContent } from "@/lib/homeContent";

/**
 * Promo offer banner (art only) — sits directly below the hero.
 * Owns the #offers anchor; the lead-capture strip lives lower in the funnel.
 *
 * Two independent artworks: `image` drives phones (portrait/square, unchanged)
 * while `imageDesktop` drives large screens with a wide, edge-to-edge banner.
 * Each renders at its own aspect ratio (w-full, h-auto) so the panel wraps it
 * tightly — no fixed banner box, no cream letterbox bars on the sides. When no
 * dedicated desktop banner is set, desktop falls back to the mobile art at half
 * width (the original layout).
 */
export default function PromoBanner() {
  const { lang } = useLang();
  const { promo } = useHomeContent();

  const mobileImage = promo.image;
  const hasDesktopBanner = Boolean(promo.imageDesktop);
  const desktopImage = promo.imageDesktop || promo.image;

  if (!mobileImage && !desktopImage) return null;

  const heading = lang === "hi" ? promo.headingHi : promo.heading;

  return (
    <section id="offers" aria-label="Promotional offers" className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        {/* Mobile art — unchanged (visible below lg). */}
        {mobileImage && (
          /* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded art of unknown dimensions; intrinsic sizing avoids letterboxing */
          <img
            src={mobileImage}
            alt={heading}
            className="mx-auto block h-auto w-full rounded-card shadow-pop ring-1 ring-maroon/10 lg:hidden"
            fetchPriority="high"
            decoding="async"
          />
        )}
        {/* Desktop banner — wide (full column) when a dedicated banner is set,
            otherwise the original half-width fallback. */}
        {desktopImage && (
          /* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded art of unknown dimensions; intrinsic sizing avoids letterboxing */
          <img
            src={desktopImage}
            alt={heading}
            className={`mx-auto hidden h-auto w-full rounded-card shadow-pop ring-1 ring-maroon/10 lg:block ${
              hasDesktopBanner ? "" : "lg:w-1/2"
            }`}
            fetchPriority="high"
            decoding="async"
          />
        )}
      </div>
    </section>
  );
}
