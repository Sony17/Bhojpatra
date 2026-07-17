"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cities } from "@/lib/data";
import {
  staticBookableVenues,
  mergeVenues,
  fetchRegisteredVenues,
  type BookableVenue,
} from "@/lib/venues";
import { useLang, type Lang, type Translate } from "@/lib/i18n";
import {
  LOCATION_CHANGED_EVENT,
  readStoredLocation,
  type StoredLocation,
} from "@/lib/detectedLocation";
import { useVendorRatings, statFor } from "@/lib/vendorRatings";
import {
  Select,
  CategoryChip,
  CategoryChips,
  EmptyState,
  Button,
  ListingCard,
  ListingBadge,
  PullToRefresh,
  AppSearchBar,
} from "@/components/ui";

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

const cityName = (id: string) =>
  cities.find((c) => c.id === id)?.name ?? id;

export default function VenueExplorer() {
  const { lang, t } = useLang();
  const [city, setCity] = useState<string>(ALL);
  const [location, setLocation] = useState<string>(ALL);
  const [query, setQuery] = useState("");

  const ratings = useVendorRatings();

  const [venues, setVenues] = useState<BookableVenue[]>(staticBookableVenues);
  const loadVenues = useCallback(async () => {
    const registered = await fetchRegisteredVenues();
    if (registered.length) setVenues(mergeVenues(registered));
  }, []);

  useEffect(() => {
    void loadVenues();
  }, [loadVenues]);

  const cityOptions = useMemo(
    () => cities.filter((c) => venues.some((v) => v.city === c.id)),
    [venues],
  );

  useEffect(() => {
    function applyStored(stored: ReturnType<typeof readStoredLocation>) {
      if (!stored?.cityId || stored.cityId === "other") return;
      if (!cityOptions.some((c) => c.id === stored.cityId)) return;
      setCity(stored.cityId);
      setLocation(ALL);
    }

    applyStored(readStoredLocation());

    function onChanged(e: Event) {
      applyStored((e as CustomEvent<StoredLocation>).detail);
    }
    window.addEventListener(LOCATION_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(LOCATION_CHANGED_EVENT, onChanged);
  }, [cityOptions]);

  const locationOptions = useMemo(() => {
    const scoped = city === ALL ? venues : venues.filter((v) => v.city === city);
    return Array.from(new Set(scoped.map((v) => v.location))).sort();
  }, [city, venues]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return venues.filter((v) => {
      if (city !== ALL && v.city !== city) return false;
      if (location !== ALL && v.location !== location) return false;
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        v.location.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q) ||
        cityName(v.city).toLowerCase().includes(q)
      );
    });
  }, [city, location, venues, query]);

  const onCityChange = (next: string) => {
    setCity(next);
    setLocation(ALL);
  };

  return (
    <PullToRefresh onRefresh={loadVenues}>
      <section className="app-bottom-safe px-4 pb-8 pt-2 sm:px-5 sm:pb-12 sm:pt-4">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-xl px-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon">
              {t("Near you", "आपके पास")}
            </p>
            <h1 className="mt-2 text-app-title text-ink">
              {t("Find a venue", "वेन्यू खोजें")}
            </h1>
            <p className="mt-2 text-body text-ink/55">
              {t(
                "Banquet halls, lawns & resorts — filter by city.",
                "बैंक्वेट हॉल, लॉन और रिज़ॉर्ट — शहर से फ़िल्टर करें।",
              )}
            </p>
          </div>

          <div className="app-sticky-chrome -mx-4 mt-5 px-4 py-3 sm:-mx-5 sm:px-5">
            <AppSearchBar
              value={query}
              onChange={setQuery}
              aria-label={t("Search venues", "वेन्यू खोजें")}
              placeholder={t("Search venues, areas…", "वेन्यू, इलाके खोजें…")}
              className="mb-3"
            />
            <div className="mx-auto flex max-w-7xl flex-col gap-2.5 sm:flex-row">
              <div className="min-w-0 flex-1">
                <label htmlFor="venue-city" className="sr-only">
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
              <div className="min-w-0 flex-1">
                <label htmlFor="venue-location" className="sr-only">
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
            <CategoryChips className="mx-auto mt-3 max-w-7xl" label={t("Cities", "शहर")}>
              <CategoryChip
                selected={city === ALL}
                onClick={() => onCityChange(ALL)}
              >
                {t("All", "सभी")}
              </CategoryChip>
              {cityOptions.map((c) => (
                <CategoryChip
                  key={c.id}
                  selected={city === c.id}
                  onClick={() => onCityChange(c.id)}
                >
                  {c.name}
                </CategoryChip>
              ))}
            </CategoryChips>
          </div>

          <p className="mt-4 px-1 text-[13px] text-ink/55">
            <span className="font-semibold text-ink">{results.length}</span>{" "}
            {results.length === 1 ? t("venue", "वेन्यू") : t("venues", "वेन्यू")}
            {city !== ALL && (
              <>
                {" "}
                {t("in", "में")}{" "}
                <span className="font-medium text-maroon">{cityName(city)}</span>
              </>
            )}
          </p>

          {results.length > 0 ? (
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {results.map((venue, i) => (
                <li key={venue.id}>
                  <VenueListing
                    venue={venue}
                    rating={statFor(ratings, venue)?.rating ?? venue.rating}
                    lang={lang}
                    t={t}
                    priority={i < 2}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              className="mt-4"
              title={t("No venues found", "कोई वेन्यू नहीं मिला")}
              message={t(
                "Try a different city, location, or search.",
                "कोई दूसरा शहर, स्थान या खोज आज़माएँ।",
              )}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onCityChange(ALL);
                    setLocation(ALL);
                    setQuery("");
                  }}
                >
                  {t("Clear filters", "फ़िल्टर हटाएँ")}
                </Button>
              }
            />
          )}
        </div>
      </section>
    </PullToRefresh>
  );
}

function VenueListing({
  venue,
  rating,
  lang,
  t,
  priority,
}: {
  venue: BookableVenue;
  rating: number;
  lang: Lang;
  t: Translate;
  priority?: boolean;
}) {
  const typeLabel =
    lang === "hi" ? (VENUE_TYPE_HI[venue.type] ?? venue.type) : venue.type;
  const capacityLabel =
    lang === "hi" ? venue.capacity.replace(/Guests/g, "मेहमान") : venue.capacity;

  return (
    <ListingCard
      href={`/venues/${venue.id}`}
      image={venue.image}
      imageAlt={venue.name}
      title={venue.name}
      subtitle={`${venue.location} · ${cityName(venue.city)}`}
      meta={
        <p className="text-caption text-ink/45">{capacityLabel}</p>
      }
      price={venue.priceFrom}
      priority={priority}
      badges={
        <>
          <ListingBadge tone="soft">{typeLabel}</ListingBadge>
          <ListingBadge tone="solid">
            {rating}
            <span aria-hidden> ★</span>
          </ListingBadge>
        </>
      }
    />
  );
}
