"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { vendorListings, indianStates, type VendorListing } from "@/lib/data";

const ALL = "all";

type DietFilter = "all" | "Veg" | "Non-Veg";
type TierFilter = "all" | "Silver" | "Gold" | "Platinum";
type SortKey = "rating" | "price-asc" | "price-desc";

const DIET_OPTIONS: { value: DietFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Veg", label: "Veg" },
  { value: "Non-Veg", label: "Non-Veg" },
];

const TIER_OPTIONS: TierFilter[] = ["all", "Silver", "Gold", "Platinum"];

/** A "Veg & Non-Veg" vendor satisfies both the Veg and Non-Veg filters. */
const matchesDiet = (vendor: VendorListing, filter: DietFilter): boolean => {
  if (filter === ALL) return true;
  return vendor.diet === filter || vendor.diet === "Veg & Non-Veg";
};

/** Brand-aligned tier badge styling. */
const tierBadgeClass = (tier: VendorListing["tier"]): string => {
  switch (tier) {
    case "Platinum":
      return "bg-maroon text-cream";
    case "Gold":
      return "bg-cream-3 text-ink";
    default:
      return "bg-cream-2 text-ink";
  }
};

export default function VendorCatalog() {
  const [query, setQuery] = useState<string>("");
  const [city, setCity] = useState<string>(ALL);
  const [state, setState] = useState<string>(ALL);
  const [cuisine, setCuisine] = useState<string>(ALL);
  const [diet, setDiet] = useState<DietFilter>(ALL);
  const [tier, setTier] = useState<TierFilter>(ALL);
  const [sort, setSort] = useState<SortKey>("rating");

  // Distinct cities, in first-seen order.
  const cityOptions = useMemo(
    () => Array.from(new Set(vendorListings.map((v) => v.city))),
    [],
  );

  // Distinct cuisines, sorted alphabetically.
  const cuisineOptions = useMemo(
    () =>
      Array.from(new Set(vendorListings.flatMap((v) => v.cuisines))).sort(),
    [],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = vendorListings.filter((v) => {
      const matchesQuery =
        q === "" ||
        v.name.toLowerCase().includes(q) ||
        v.cuisines.some((c) => c.toLowerCase().includes(q));

      return (
        matchesQuery &&
        (city === ALL || v.city === city) &&
        (state === ALL || v.state === state) &&
        (cuisine === ALL || v.cuisines.includes(cuisine)) &&
        matchesDiet(v, diet) &&
        (tier === ALL || v.tier === tier)
      );
    });

    const sorted = [...filtered];
    switch (sort) {
      case "price-asc":
        sorted.sort((a, b) => a.priceFrom - b.priceFrom);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.priceFrom - a.priceFrom);
        break;
      default:
        sorted.sort((a, b) => b.rating - a.rating);
        break;
    }
    return sorted;
  }, [query, city, state, cuisine, diet, tier, sort]);

  const hasActiveFilters =
    query !== "" ||
    city !== ALL ||
    state !== ALL ||
    cuisine !== ALL ||
    diet !== ALL ||
    tier !== ALL;

  const resetFilters = () => {
    setQuery("");
    setCity(ALL);
    setState(ALL);
    setCuisine(ALL);
    setDiet(ALL);
    setTier(ALL);
    setSort("rating");
  };

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:py-16">
      <div className="max-w-2xl">
        <p className="eyebrow text-sm font-medium text-gold">Vendor Catalog</p>
        <h1 className="mt-2 text-3xl text-ink sm:text-4xl">
          Compare Verified Caterers
        </h1>
        <p className="font-script mt-3 text-xl text-ink-soft">
          Search by cuisine or name, filter by city, diet & tier — then compare
          the best.
        </p>
      </div>

      {/* Filter bar */}
      <div className="mt-8 rounded-2xl border border-cream-3 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
        {/* Search */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="vendor-search"
            className="text-xs font-semibold uppercase tracking-wide text-ink-soft"
          >
            Search
          </label>
          <input
            id="vendor-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try “Awadhi”, “Mughlai”, “South Indian”…"
            className="rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/70 focus:border-maroon focus:bg-white"
          />
        </div>

        {/* City chips */}
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            City
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <Chip
              label="All Cities"
              active={city === ALL}
              onClick={() => setCity(ALL)}
            />
            {cityOptions.map((c) => (
              <Chip
                key={c}
                label={c}
                active={city === c}
                onClick={() => setCity(c)}
              />
            ))}
          </div>
        </div>

        {/* Tier chips */}
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Tier
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {TIER_OPTIONS.map((t) => (
              <Chip
                key={t}
                label={t === ALL ? "All Tiers" : t}
                active={tier === t}
                onClick={() => setTier(t)}
              />
            ))}
          </div>
        </div>

        {/* Diet segmented toggle */}
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Preference
          </p>
          <div className="mt-3 inline-flex rounded-full border border-cream-3 bg-cream-2/40 p-1">
            {DIET_OPTIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDiet(d.value)}
                aria-pressed={diet === d.value}
                className={
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
                  (diet === d.value
                    ? "bg-maroon text-cream"
                    : "text-ink-soft hover:text-ink")
                }
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown row: State, Cuisine, Sort */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="vendor-state"
              className="text-xs font-semibold uppercase tracking-wide text-ink-soft"
            >
              State
            </label>
            <select
              id="vendor-state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm font-medium text-ink outline-none transition-colors focus:border-maroon focus:bg-white"
            >
              <option value={ALL}>All States</option>
              {indianStates.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="vendor-cuisine"
              className="text-xs font-semibold uppercase tracking-wide text-ink-soft"
            >
              Cuisine
            </label>
            <select
              id="vendor-cuisine"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              className="rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm font-medium text-ink outline-none transition-colors focus:border-maroon focus:bg-white"
            >
              <option value={ALL}>All Cuisines</option>
              {cuisineOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="vendor-sort"
              className="text-xs font-semibold uppercase tracking-wide text-ink-soft"
            >
              Sort by
            </label>
            <select
              id="vendor-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm font-medium text-ink outline-none transition-colors focus:border-maroon focus:bg-white"
            >
              <option value="rating">Rating (high → low)</option>
              <option value="price-asc">Price (low → high)</option>
              <option value="price-desc">Price (high → low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results summary */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          Showing{" "}
          <span className="font-semibold text-ink">{results.length}</span>{" "}
          verified {results.length === 1 ? "caterer" : "caterers"}
          {city !== ALL && (
            <>
              {" "}in <span className="font-medium text-maroon">{city}</span>
            </>
          )}
          {cuisine !== ALL && (
            <>
              {" "}— <span className="font-medium text-maroon">{cuisine}</span>
            </>
          )}
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-sm font-medium text-maroon underline-offset-4 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Vendor grid */}
      {results.length > 0 ? (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {results.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </ul>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-cream-3 bg-white/60 p-6 text-center sm:p-12">
          <p className="font-display text-lg text-ink">No caterers found</p>
          <p className="mt-1 text-sm text-ink-soft">
            Try a different search or relax your filters.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 inline-flex items-center rounded-full border border-maroon px-5 py-2 text-sm font-medium text-maroon transition-shadow hover:shadow-md"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function Chip({
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
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors sm:px-5 sm:py-2 " +
        (active
          ? "bg-maroon text-cream"
          : "bg-cream-2 text-ink-soft hover:bg-cream-3")
      }
    >
      {label}
    </button>
  );
}

function VendorCard({ vendor }: { vendor: VendorListing }) {
  return (
    <li className="group flex flex-col overflow-hidden rounded-2xl border border-cream-3 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-2">
        <Image
          src={vendor.image}
          alt={vendor.name}
          fill
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span
          className={
            "absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold shadow-sm " +
            tierBadgeClass(vendor.tier)
          }
        >
          {vendor.tier}
        </span>
        {vendor.verified && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-maroon shadow-sm backdrop-blur-sm">
            <span aria-hidden="true">✓</span> Verified
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-ink">
            {vendor.name}
          </h3>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cream-2 px-2.5 py-1 text-xs font-medium text-ink">
            <span aria-hidden="true" className="text-gold">
              ⭐
            </span>
            {vendor.rating}
            <span className="text-ink-soft">({vendor.reviews})</span>
          </span>
        </div>

        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-soft">
          <span aria-hidden="true">📍</span>
          {vendor.city}, {vendor.state}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {vendor.cuisines.map((c) => (
            <span
              key={c}
              className="rounded-full bg-cream-2 px-2.5 py-1 text-xs font-medium text-ink-soft"
            >
              {c}
            </span>
          ))}
          <span className="rounded-full bg-surface-beige px-2.5 py-1 text-xs font-medium text-ink-soft">
            {vendor.diet}
          </span>
        </div>

        <div className="mt-4 flex items-end justify-between border-t border-cream-3 pt-4">
          <div>
            <p className="text-xs text-ink-soft">Starts at</p>
            <p className="font-display text-lg font-semibold text-maroon">
              ₹{vendor.priceFrom.toLocaleString("en-IN")}{" "}
              <span className="text-sm font-normal text-ink-soft">/ plate</span>
            </p>
          </div>
          <Link
            href="/book"
            className="inline-flex items-center rounded-full border border-maroon px-4 py-2 text-sm font-medium text-maroon transition-shadow group-hover:shadow-md"
          >
            View &amp; Compare
          </Link>
        </div>
      </div>
    </li>
  );
}
