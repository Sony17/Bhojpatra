"use client";

import Link from "next/link";
import Image from "next/image";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";

/** Where the CTA always points — the curated Baina Box catalogue. */
const BAINA_HREF = "/vendors?q=Baina+Box";

/**
 * "Baina Box, specially by Bhojpatra" — an elegant signature block for
 * Bhojpatra's own curated Baina Box offering. The copy, image and CTA label
 * live in the shared home content (`bainaBoxSpecial`) and are edited via
 * Admin → Content Control → Home Page → Baina Box by Bhojpatra. The same
 * content renders in two places:
 *
 * - `dashboard` — a full signature card shown to signed-in vendors.
 * - `search`    — a slimmer banner atop a Baina Box catalogue search.
 *
 * Renders nothing when the admin has switched it off.
 */
export default function BainaBoxSpecial({
  variant = "dashboard",
}: {
  variant?: "dashboard" | "search";
}) {
  const { lang, t } = useLang();
  const { bainaBoxSpecial: special } = useHomeContent();

  if (!special.enabled) return null;

  const heading = lang === "hi" ? special.headingHi : special.heading;
  const body = lang === "hi" ? special.bodyHi : special.body;
  const cta = lang === "hi" ? special.ctaHi : special.cta;
  const isSearch = variant === "search";

  return (
    <section
      className="overflow-hidden rounded-3xl border border-cream-3 bg-cream/40 shadow-sm ring-1 ring-cream"
      aria-label={heading}
    >
      <div
        className={
          "grid " +
          (isSearch
            ? "sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]"
            : "sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]")
        }
      >
        {/* Image — a banner strip on mobile, filling the card height from sm up. */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-2 sm:aspect-auto">
          {special.image ? (
            <Image
              src={special.image}
              alt={heading}
              fill
              sizes="(min-width: 640px) 440px, 100vw"
              className="object-cover"
              unoptimized={isUnoptimized(special.image)}
            />
          ) : null}
        </div>

        {/* Copy */}
        <div
          className={
            "flex flex-col justify-center " +
            (isSearch ? "p-5 sm:p-7" : "p-6 sm:p-9")
          }
        >
          {/* Signature line — a thin maroon rule + refined label, in place of a
              loud badge. */}
          <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-maroon">
            <span aria-hidden="true" className="h-px w-7 bg-maroon" />
            {t("Specially by Bhojpatra", "भोजपत्र की खास पेशकश")}
          </p>
          <h3
            className={
              "font-display leading-tight text-ink " +
              (isSearch ? "mt-3 text-2xl" : "mt-3 text-3xl sm:text-[2rem]")
            }
          >
            {heading}
          </h3>
          <p
            className={
              "font-script text-ink-soft " +
              (isSearch ? "mt-2 max-w-md text-lg" : "mt-3 max-w-md text-xl")
            }
          >
            {body}
          </p>
          <div>
            <Link
              href={BAINA_HREF}
              className="btn-sheen mt-6 inline-flex items-center justify-center rounded-full border border-maroon px-7 py-2.5 text-sm font-semibold text-maroon transition-all duration-300 hover:-translate-y-0.5 hover:bg-maroon hover:text-cream hover:shadow-lg active:scale-95"
            >
              {cta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
