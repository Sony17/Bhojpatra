"use client";

import Image from "next/image";
import { Button } from "@/components/ui";
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
      className="overflow-hidden rounded-card border border-cream-3 bg-cream/40 shadow-card ring-1 ring-cream"
      aria-label={heading}
    >
      <div
        className={
          "grid " +
          (isSearch
            ? "sm:grid-cols-2"
            : "sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]")
        }
      >
        {/* Image — always 4:3 in the search banner so the creative is never
            cropped (the card grows to fit it); the dashboard card instead
            fills whatever height the copy column sets. */}
        <div
          className={
            "relative aspect-[4/3] w-full overflow-hidden bg-cream-2" +
            (isSearch ? "" : " sm:aspect-auto")
          }
        >
          {special.image ? (
            <Image
              src={special.image}
              alt={heading}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
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
            <Button
              href={BAINA_HREF}
              variant="secondary"
              className="btn-sheen mt-6"
            >
              {cta}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
