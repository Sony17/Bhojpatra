"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cities } from "@/lib/data";
import {
  staticBookableVenues,
  mergeVenues,
  fetchRegisteredVenues,
  type BookableVenue,
} from "@/lib/venues";
import { useLang, type Lang, type Translate } from "@/lib/i18n";
import { useVendorRatings, statFor } from "@/lib/vendorRatings";
import { StarIcon } from "@/components/reviews/reviewDisplay";
import { Card, Container, Select } from "@/components/ui";

const ALL = "all";

/** Hindi translations for the fixed venue-type vocabulary, keyed by English value. */
const VENUE_TYPE_HI: Record<string, string> = {
  "Banquet Hall": "बैंक्वेट हॉल",
  "Open Lawn": "खुला लॉन",
  "Convention Center": "कन्वेंशन सेंटर",
  "Hotel Ballroom": "होटल बॉलरूम",
  Resort: "रिज़ॉर्ट",
  "Heritage Venue": "हेरिटेज वेन्यू",
};

/** Only show city chips that actually have venues listed. */
const cityName = (id: string) =>
  cities.find((c) => c.id === id)?.name ?? id;

export default function VenueExplorer() {
  const { lang, t } = useLang();
  const [city, setCity] = useState<string>(ALL);
  const [location, setLocation] = useState<string>(ALL);

  // Real, customer-submitted ratings layered over each venue's seed number.
  const ratings = useVendorRatings();

  // Start with the static seed catalogue (available without a round-trip), then
  // fold in owner-registered venues once they load so a freshly-published venue
  // shows up here right away.
  const [venues, setVenues] = useState<BookableVenue[]>(staticBookableVenues);
  useEffect(() => {
    let active = true;
    fetchRegisteredVenues().then((registered) => {
      if (active && registered.length) setVenues(mergeVenues(registered));
    });
    return () => {
      active = false;
    };
  }, []);

  // Cities that have at least one venue, in the order defined in `cities`.
  const cityOptions = useMemo(
    () => cities.filter((c) => venues.some((v) => v.city === c.id)),
    [venues],
  );

  // Localities available for the chosen city (or across all cities).
  const locationOptions = useMemo(() => {
    const scoped = city === ALL ? venues : venues.filter((v) => v.city === city);
    return Array.from(new Set(scoped.map((v) => v.location))).sort();
  }, [city, venues]);

  const results = useMemo(
    () =>
      venues.filter(
        (v) =>
          (city === ALL || v.city === city) &&
          (location === ALL || v.location === location),
      ),
    [city, location, venues],
  );

  // Changing city invalidates a previously-picked locality.
  const onCityChange = (next: string) => {
    setCity(next);
    setLocation(ALL);
  };

  return (
    <Container size="lg" className="py-12 sm:py-16">
      <div className="max-w-2xl">
        <p className="eyebrow text-sm font-medium text-gold">
          {t("Venues", "वेन्यू")}
        </p>
        <h1 className="mt-2 text-3xl text-ink sm:text-4xl">
          {t("Find the Perfect Venue", "एकदम सही वेन्यू खोजें")}
        </h1>
        <p className="font-script mt-3 text-xl text-ink-soft">
          {t(
            "Browse banquet halls, lawns & resorts — filtered by your city and locality.",
            "बैंक्वेट हॉल, लॉन और रिज़ॉर्ट देखें — अपने शहर और इलाके के अनुसार फ़िल्टर करें।",
          )}
        </p>
      </div>

      {/* Filter bar */}
      <Card padding="none" className="mt-8 p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
          {/* City dropdown */}
          <div className="flex w-full flex-col gap-2 sm:max-w-xs">
            <label
              htmlFor="venue-city"
              className="text-xs font-semibold uppercase tracking-wide text-ink-soft"
            >
              {t("City", "शहर")}
            </label>
            <Select
              id="venue-city"
              value={city}
              onChange={onCityChange}
              ariaLabel={t("City", "शहर")}
              options={[
                { value: ALL, label: t("All Cities", "सभी शहर") },
                ...cityOptions.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>

          {/* Location dropdown */}
          <div className="flex w-full flex-col gap-2 sm:max-w-xs">
            <label
              htmlFor="venue-location"
              className="text-xs font-semibold uppercase tracking-wide text-ink-soft"
            >
              {t("Location", "स्थान")}
            </label>
            <Select
              id="venue-location"
              value={location}
              onChange={setLocation}
              ariaLabel={t("Location", "स्थान")}
              options={[
                { value: ALL, label: t("All Locations", "सभी स्थान") },
                ...locationOptions.map((loc) => ({ value: loc, label: loc })),
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Results summary */}
      <p className="mt-8 text-sm text-ink-soft">
        {t("Showing", "दिखा रहे हैं")}{" "}
        <span className="font-semibold text-ink">{results.length}</span>{" "}
        {results.length === 1 ? t("venue", "वेन्यू") : t("venues", "वेन्यू")}
        {city !== ALL && (
          <>
            {" "}
            {t("in", "में")}{" "}
            <span className="font-medium text-maroon">{cityName(city)}</span>
          </>
        )}
        {location !== ALL && (
          <>
            {" "}— <span className="font-medium text-maroon">{location}</span>
          </>
        )}
      </p>

      {/* Venue grid */}
      {results.length > 0 ? (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {results.map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              rating={statFor(ratings, venue)?.rating ?? venue.rating}
              lang={lang}
              t={t}
            />
          ))}
        </ul>
      ) : (
        <div className="mt-6 rounded-card border border-dashed border-cream-3 bg-white/60 p-6 text-center sm:p-12">
          <p className="font-display text-lg text-ink">
            {t("No venues found", "कोई वेन्यू नहीं मिला")}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {t(
              "Try a different city or location.",
              "कोई दूसरा शहर या स्थान आज़माएँ।",
            )}
          </p>
        </div>
      )}
    </Container>
  );
}

function VenueCard({
  venue,
  rating,
  lang,
  t,
}: {
  venue: BookableVenue;
  /** Real aggregated rating when available, else the venue's seed rating. */
  rating: number;
  lang: Lang;
  t: Translate;
}) {
  // Translate the fixed venue-type vocabulary for display; underlying value stays English.
  const typeLabel =
    lang === "hi" ? (VENUE_TYPE_HI[venue.type] ?? venue.type) : venue.type;
  // Capacity strings embed the word "Guests" (e.g. "300–600 Guests"); translate the label token only.
  const capacityLabel =
    lang === "hi" ? venue.capacity.replace(/Guests/g, "मेहमान") : venue.capacity;
  return (
    <li className="group flex">
      <Link
        href={`/venues/${venue.id}`}
        className="flex flex-1 flex-col overflow-hidden rounded-card border border-cream-3 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-pop"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-2">
          <Image
            src={venue.image}
            alt={venue.name}
            fill
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-maroon shadow-sm backdrop-blur-sm">
            {typeLabel}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-ink">
              {venue.name}
            </h3>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cream-2 px-2.5 py-1 text-xs font-medium text-ink">
              <StarIcon className="h-3.5 w-3.5 text-maroon" />
              {rating}
            </span>
          </div>

          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-soft">
            <span aria-hidden="true">📍</span>
            {venue.location}, {cityName(venue.city)}
          </p>

          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <span aria-hidden="true">👥</span>
            {capacityLabel}
          </p>

          <div className="mt-4 flex items-end justify-between border-t border-cream-3 pt-4">
            <div>
              <p className="text-xs text-ink-soft">{t("Starts at", "से शुरू")}</p>
              <p className="font-display text-lg font-semibold text-maroon">
                {venue.priceFrom}
              </p>
            </div>
            <span className="inline-flex items-center rounded-full border border-maroon px-4 py-2 text-sm font-medium text-maroon transition-shadow group-hover:shadow-pop">
              {t("View & Book", "देखें और बुक करें")}
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}
