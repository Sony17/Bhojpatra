"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { cities, venues, type Venue } from "@/lib/data";

const ALL = "all";

/** Only show city chips that actually have venues listed. */
const cityName = (id: string) =>
  cities.find((c) => c.id === id)?.name ?? id;

export default function VenueExplorer() {
  const [city, setCity] = useState<string>(ALL);
  const [location, setLocation] = useState<string>(ALL);

  // Cities that have at least one venue, in the order defined in `cities`.
  const cityOptions = useMemo(
    () => cities.filter((c) => venues.some((v) => v.city === c.id)),
    [],
  );

  // Localities available for the chosen city (or across all cities).
  const locationOptions = useMemo(() => {
    const scoped = city === ALL ? venues : venues.filter((v) => v.city === city);
    return Array.from(new Set(scoped.map((v) => v.location))).sort();
  }, [city]);

  const results = useMemo(
    () =>
      venues.filter(
        (v) =>
          (city === ALL || v.city === city) &&
          (location === ALL || v.location === location),
      ),
    [city, location],
  );

  // Changing city invalidates a previously-picked locality.
  const onCityChange = (next: string) => {
    setCity(next);
    setLocation(ALL);
  };

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:py-16">
      <div className="max-w-2xl">
        <p className="eyebrow text-sm font-medium text-gold">Venues</p>
        <h1 className="mt-2 text-3xl text-ink sm:text-4xl">
          Find the Perfect Venue
        </h1>
        <p className="font-script mt-3 text-xl text-ink-soft">
          Browse banquet halls, lawns & resorts — filtered by your city and
          locality.
        </p>
      </div>

      {/* Filter bar */}
      <div className="mt-8 rounded-2xl border border-cream-3 bg-white p-5 shadow-sm sm:p-6">
        {/* City chips */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            City
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <CityChip
              label="All Cities"
              active={city === ALL}
              onClick={() => onCityChange(ALL)}
            />
            {cityOptions.map((c) => (
              <CityChip
                key={c.id}
                label={c.name}
                active={city === c.id}
                onClick={() => onCityChange(c.id)}
              />
            ))}
          </div>
        </div>

        {/* Location dropdown */}
        <div className="mt-5 flex flex-col gap-2 sm:max-w-xs">
          <label
            htmlFor="venue-location"
            className="text-xs font-semibold uppercase tracking-wide text-ink-soft"
          >
            Location
          </label>
          <select
            id="venue-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm font-medium text-ink outline-none transition-colors focus:border-maroon focus:bg-white"
          >
            <option value={ALL}>All Locations</option>
            {locationOptions.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results summary */}
      <p className="mt-8 text-sm text-ink-soft">
        Showing <span className="font-semibold text-ink">{results.length}</span>{" "}
        {results.length === 1 ? "venue" : "venues"}
        {city !== ALL && (
          <>
            {" "}
            in <span className="font-medium text-maroon">{cityName(city)}</span>
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
        <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </ul>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-cream-3 bg-white/60 p-12 text-center">
          <p className="font-display text-lg text-ink">No venues found</p>
          <p className="mt-1 text-sm text-ink-soft">
            Try a different city or location.
          </p>
        </div>
      )}
    </section>
  );
}

function CityChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "rounded-full px-5 py-2 text-sm font-medium transition-colors " +
        (active
          ? "bg-maroon text-cream"
          : "bg-cream-2 text-ink-soft hover:bg-cream-3")
      }
    >
      {label}
    </button>
  );
}

function VenueCard({ venue }: { venue: Venue }) {
  return (
    <li className="group flex flex-col overflow-hidden rounded-2xl border border-cream-3 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-2">
        <Image
          src={venue.image}
          alt={venue.name}
          fill
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-maroon shadow-sm backdrop-blur-sm">
          {venue.type}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-ink">
            {venue.name}
          </h3>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cream-2 px-2.5 py-1 text-xs font-medium text-ink">
            <span aria-hidden="true" className="text-gold">
              ⭐
            </span>
            {venue.rating}
          </span>
        </div>

        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-soft">
          <span aria-hidden="true">📍</span>
          {venue.location}, {cityName(venue.city)}
        </p>

        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
          <span aria-hidden="true">👥</span>
          {venue.capacity}
        </p>

        <div className="mt-4 flex items-end justify-between border-t border-cream-3 pt-4">
          <div>
            <p className="text-xs text-ink-soft">Starts at</p>
            <p className="font-display text-lg font-semibold text-maroon">
              {venue.priceFrom}
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-maroon px-4 py-2 text-sm font-medium text-maroon transition-shadow group-hover:shadow-md">
            View Venue
          </span>
        </div>
      </div>
    </li>
  );
}
