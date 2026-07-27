"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { VENUE_TYPES } from "@/lib/venues";

/**
 * Homepage entry point for the Venues catalogue. Kept visually distinct from the
 * caterer/service rails so customers immediately understand this is about
 * booking an event *space* (a banquet hall, lawn or resort) — not food — and
 * doubles as a quiet "list your venue" prompt for venue owners.
 */
export default function FindVenues() {
  const { t } = useLang();

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="relative overflow-hidden rounded-hero border border-maroon/10 bg-surface-beige-2 p-7 sm:p-10">
        <p className="eyebrow text-[0.7rem] font-semibold text-maroon">
          <span aria-hidden>🏛 </span>
          {t("Venues · Event spaces", "वेन्यू · आयोजन स्थल")}
        </p>
        <h2 className="font-display mt-3 max-w-xl text-[1.6rem] leading-tight text-ink sm:text-3xl">
          {t("Book your event venue too", "अपना आयोजन वेन्यू भी बुक करें")}
        </h2>
        <p className="mt-3 max-w-lg text-sm text-ink-soft sm:text-base">
          {t(
            "Reserve a banquet hall, lawn or resort right alongside your feast — verified venues, transparent pricing, one booking.",
            "अपने भोज के साथ ही बैंक्वेट हॉल, लॉन या रिज़ॉर्ट बुक करें — सत्यापित वेन्यू, पारदर्शी कीमत, एक ही बुकिंग।",
          )}
        </p>

        <ul className="mt-5 flex flex-wrap gap-2">
          {VENUE_TYPES.map((vt) => (
            <li
              key={vt}
              className="rounded-full border border-maroon/15 bg-white px-3 py-1 text-xs font-medium text-ink-soft"
            >
              {vt}
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button href="/venues" size="lg" className="w-full sm:w-auto">
            {t("Browse venues", "वेन्यू ब्राउज़ करें")}
          </Button>
          <Link
            href="/signup?type=partner&role=venue"
            className="focus-ring inline-flex min-h-12 w-full items-center justify-center rounded-control border border-maroon/25 px-6 text-sm font-semibold text-maroon transition hover:bg-maroon/5 sm:w-auto"
          >
            {t("Own a venue? List it", "वेन्यू के मालिक हैं? लिस्ट करें")}
          </Link>
        </div>
      </div>
    </section>
  );
}
