"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";

/** Where the CTA always points — the Baina Box marketplace, which lists every
 *  sweet house and opens each one's boxes. (It used to point at
 *  `/vendors?q=Baina+Box`; that is where this banner is rendered, so the CTA
 *  linked to the page the visitor was already on and read as a dead button.) */
const BAINA_HREF = "/baina-box";

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
  // The banner also heads the Baina Box marketplace itself. Sending a visitor
  // to the page they are already on is a dead click, so the strip stays there
  // purely as the signature promo and drops its CTA.
  const pathname = usePathname();
  const showCta = pathname !== BAINA_HREF;

  if (!special.enabled) return null;

  const heading = lang === "hi" ? special.headingHi : special.heading;
  const body = lang === "hi" ? special.bodyHi : special.body;
  const cta = lang === "hi" ? special.ctaHi : special.cta;
  const isSearch = variant === "search";

  if (isSearch) {
    // Short 50/50 promo strip, ~20% of the viewport tall on every device:
    // the poster fills the left half (cover-cropped to the strip height),
    // the right half carries only the signature heading and the CTA — or, on
    // the marketplace the CTA leads to, the signature line in its place.
    return (
      <section
        className="overflow-hidden rounded-card border border-cream-3 bg-cream/40 shadow-card ring-1 ring-cream"
        aria-label={heading}
      >
        <div className="grid h-[20vh] max-h-[180px] min-h-[130px] grid-cols-[4fr_5fr] sm:grid-cols-2">
          <div className="relative h-full w-full overflow-hidden bg-cream-2">
            {special.image ? (
              <Image
                src={special.image}
                alt={heading}
                fill
                sizes="50vw"
                className="object-cover"
                unoptimized={isUnoptimized(special.image)}
              />
            ) : null}
          </div>
          <div className="flex min-w-0 flex-col items-start justify-center gap-3 p-4 sm:p-6">
            <h3 className="font-display text-base leading-tight text-ink sm:text-xl">
              {heading}
            </h3>
            {/* max-w-full + wrap: the admin-editable CTA label must never
                spill out of this narrow column on phones. */}
            {showCta ? (
              <Button
                href={BAINA_HREF}
                variant="secondary"
                size="sm"
                className="btn-sheen max-w-full !whitespace-normal text-center"
              >
                {cta}
              </Button>
            ) : (
              <p className="line-clamp-3 font-script text-sm text-ink-soft sm:text-base">
                {body}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Dashboard card — the full signature block with eyebrow, body copy and CTA.
  const copy = (
    <div className="flex min-w-0 flex-col justify-center p-6 sm:p-9">
      {/* Signature line — a thin maroon rule + refined label, in place of a
          loud badge. */}
      <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-maroon">
        <span aria-hidden="true" className="h-px w-7 bg-maroon" />
        {t("Specially by Bhojpatra", "भोजपत्र की खास पेशकश")}
      </p>
      <h3 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-[2rem]">
        {heading}
      </h3>
      <p className="mt-3 max-w-md font-script text-xl text-ink-soft">{body}</p>
      {showCta && (
        <div>
          <Button href={BAINA_HREF} variant="secondary" className="btn-sheen mt-6">
            {cta}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <section
      className="overflow-hidden rounded-card border border-cream-3 bg-cream/40 shadow-card ring-1 ring-cream"
      aria-label={heading}
    >
      <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* Image — the dashboard card lets the poster fill whatever height the
            copy column sets. */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-2 sm:aspect-auto">
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

        {copy}
      </div>
    </section>
  );
}
