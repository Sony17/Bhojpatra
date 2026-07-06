"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  vendorListings,
  indianStates,
  mealTypeOptions,
  type VendorListing,
} from "@/lib/data";
import {
  useVendorRatings,
  statFor,
  type VendorRatingSummary,
} from "@/lib/vendorRatings";
import { useLang } from "@/lib/i18n";
import ThemedSelect from "@/components/ThemedSelect";

const ALL = "all";

type DietFilter = "all" | "Veg" | "Non-Veg";
type TierFilter = "all" | "Silver" | "Gold" | "Platinum";
type PriceRange = "all" | "budget" | "premium" | "luxury";
type SortKey = "relevance" | "rating" | "price-asc" | "price-desc";

const DIET_OPTIONS: DietFilter[] = ["all", "Veg", "Non-Veg"];

const TIER_OPTIONS: TierFilter[] = ["all", "Silver", "Gold", "Platinum"];

/** Cost bands for the price filter. `priceFrom` is the per-plate starting rate. */
const PRICE_RANGES: { value: PriceRange; min: number; max: number }[] = [
  { value: "all", min: 0, max: Infinity },
  { value: "budget", min: 0, max: 999 },
  { value: "premium", min: 1000, max: 1250 },
  { value: "luxury", min: 1251, max: Infinity },
];

const matchesPrice = (vendor: VendorListing, range: PriceRange): boolean => {
  const band = PRICE_RANGES.find((r) => r.value === range);
  if (!band) return true;
  return vendor.priceFrom >= band.min && vendor.priceFrom <= band.max;
};

/** A "Veg & Non-Veg" vendor satisfies both the Veg and Non-Veg filters. */
const matchesDiet = (vendor: VendorListing, filter: DietFilter): boolean => {
  if (filter === ALL) return true;
  return vendor.diet === filter || vendor.diet === "Veg & Non-Veg";
};

type Tier = VendorListing["tiers"][number];

/** Brand-aligned tier badge styling. */
const tierBadgeClass = (tier: Tier): string => {
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
  const { t } = useLang();

  // Display-only translations for small fixed vocabularies. Underlying values
  // stay English (used for filtering/keys); only the label shown is localized.
  const tierLabel = (tier: TierFilter): string => {
    switch (tier) {
      case "Silver":
        return t("Silver", "सिल्वर");
      case "Gold":
        return t("Gold", "गोल्ड");
      case "Platinum":
        return t("Platinum", "प्लैटिनम");
      default:
        return t("All", "सभी");
    }
  };

  const dietLabel = (value: DietFilter): string => {
    switch (value) {
      case "Veg":
        return t("Veg", "वेज");
      case "Non-Veg":
        return t("Non-Veg", "नॉन-वेज");
      default:
        return t("All", "सभी");
    }
  };

  // Diet value as stored on a vendor (includes the combined option).
  const vendorDietLabel = (value: VendorListing["diet"]): string => {
    switch (value) {
      case "Veg":
        return t("Veg", "वेज");
      case "Non-Veg":
        return t("Non-Veg", "नॉन-वेज");
      case "Veg & Non-Veg":
        return t("Veg & Non-Veg", "वेज और नॉन-वेज");
      default:
        return value;
    }
  };

  const priceLabel = (value: PriceRange): string => {
    switch (value) {
      case "budget":
        return t("Under ₹1,000", "₹1,000 से कम");
      case "premium":
        return t("₹1,000 – ₹1,250", "₹1,000 – ₹1,250");
      case "luxury":
        return t("₹1,250+", "₹1,250+");
      default:
        return t("Any Price", "कोई भी कीमत");
    }
  };

  const mealLabel = (value: string): string => {
    switch (value) {
      case "Breakfast":
        return t("Breakfast", "नाश्ता");
      case "Lunch":
        return t("Lunch", "दोपहर का भोजन");
      case "Dinner":
        return t("Dinner", "रात्रि भोज");
      case "Starters":
        return t("Starters", "स्टार्टर");
      case "Main Course":
        return t("Main Course", "मुख्य व्यंजन");
      case "Desserts":
        return t("Desserts", "मिठाई");
      case "Live Counters":
        return t("Live Counters", "लाइव काउंटर");
      default:
        return value;
    }
  };

  const [query, setQuery] = useState<string>("");
  const [city, setCity] = useState<string>(ALL);
  const [state, setState] = useState<string>(ALL);
  const [cuisine, setCuisine] = useState<string>(ALL);
  const [diet, setDiet] = useState<DietFilter>(ALL);
  const [tier, setTier] = useState<TierFilter>(ALL);
  const [price, setPrice] = useState<PriceRange>(ALL);
  const [meals, setMeals] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("relevance");

  // Real customer ratings, matched to these listings by name (best-effort).
  const ratings = useVendorRatings();

  const toggleMeal = (meal: string) =>
    setMeals((prev) =>
      prev.includes(meal) ? prev.filter((m) => m !== meal) : [...prev, meal],
    );

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

      const matchesMeals =
        meals.length === 0 || meals.some((m) => v.mealTypes.includes(m));

      return (
        matchesQuery &&
        (city === ALL || v.city === city) &&
        (state === ALL || v.state === state) &&
        (cuisine === ALL || v.cuisines.includes(cuisine)) &&
        matchesDiet(v, diet) &&
        (tier === ALL || v.tiers.includes(tier)) &&
        matchesPrice(v, price) &&
        matchesMeals
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
      case "rating":
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      default:
        // Relevance: verified & higher-tier first, then rating, then reviews.
        // A multi-tier vendor is ranked by its highest band.
        sorted.sort((a, b) => {
          const tierRank = { Platinum: 3, Gold: 2, Silver: 1 } as const;
          const topTier = (v: VendorListing) =>
            Math.max(...v.tiers.map((t) => tierRank[t]));
          const score = (v: VendorListing) =>
            (v.verified ? 1000 : 0) +
            topTier(v) * 100 +
            v.rating * 10 +
            v.reviews / 1000;
          return score(b) - score(a);
        });
        break;
    }
    return sorted;
  }, [query, city, state, cuisine, diet, tier, price, meals, sort]);

  const hasActiveFilters =
    query !== "" ||
    city !== ALL ||
    state !== ALL ||
    cuisine !== ALL ||
    diet !== ALL ||
    tier !== ALL ||
    price !== ALL ||
    meals.length > 0;

  const resetFilters = () => {
    setQuery("");
    setCity(ALL);
    setState(ALL);
    setCuisine(ALL);
    setDiet(ALL);
    setTier(ALL);
    setPrice(ALL);
    setMeals([]);
    setSort("relevance");
  };

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:py-16">
      <div className="max-w-2xl">
        <p className="eyebrow text-sm font-medium text-gold">
          {t("Vendor Catalog", "वेंडर कैटलॉग")}
        </p>
        <h1 className="mt-2 text-3xl text-ink sm:text-4xl">
          {t("Compare Verified", "वेरिफाइड कैटरर्स की")}
          <br />
          {t("Caterers", "तुलना करें")}
        </h1>
        <p className="font-script mt-3 text-xl text-ink-soft">
          {t(
            "Search by cuisine or name, filter by city, diet & tier — then compare the best.",
            "व्यंजन या नाम से खोजें, शहर, डाइट और टियर से फ़िल्टर करें — फिर सर्वश्रेष्ठ की तुलना करें।",
          )}
        </p>
      </div>

      {/* Filter bar */}
      <div className="mt-8 rounded-2xl border border-cream-3 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
        {/* Search — prominent, Swiggy/Zomato-style with icon, sort & clear */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="group relative flex-1">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft transition-colors group-focus-within:text-maroon"
            >
              <SearchIcon />
            </span>
            <input
              id="vendor-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t("Search caterers", "कैटरर खोजें")}
              placeholder={t(
                "Search caterers, cuisines, dishes…",
                "कैटरर, व्यंजन, डिश खोजें…",
              )}
              className="w-full rounded-full border border-cream-3 bg-cream-2/40 py-3.5 pl-12 pr-11 text-base text-ink shadow-sm outline-none transition-colors placeholder:text-ink-soft/70 focus:border-maroon focus:bg-white [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query !== "" && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={t("Clear search", "खोज साफ़ करें")}
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-2 hover:text-maroon"
              >
                <span aria-hidden="true" className="text-lg leading-none">×</span>
              </button>
            )}
          </div>

          {/* Sort */}
          <ThemedSelect
            id="vendor-sort"
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
            ariaLabel={t("Sort by", "क्रम")}
            className="shrink-0"
            buttonClassName="rounded-full border border-cream-3 bg-cream-2/40 py-3.5 pl-5 pr-5 text-sm font-medium transition-colors"
            options={[
              { value: "relevance", label: t("Sort: Relevance", "क्रम: प्रासंगिकता") },
              { value: "rating", label: t("Sort: Rating", "क्रम: रेटिंग") },
              {
                value: "price-asc",
                label: t("Sort: Price (low → high)", "क्रम: कीमत (कम → अधिक)"),
              },
              {
                value: "price-desc",
                label: t("Sort: Price (high → low)", "क्रम: कीमत (अधिक → कम)"),
              },
            ]}
          />
        </div>

        {/* Compact dropdown row — City, State, Cuisine, Tier, Price */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <FilterSelect
            id="vendor-city"
            label={t("City", "शहर")}
            value={city}
            onChange={setCity}
            options={[
              { value: ALL, label: t("All Cities", "सभी शहर") },
              ...cityOptions.map((c) => ({ value: c, label: c })),
            ]}
          />
          <FilterSelect
            id="vendor-state"
            label={t("State", "राज्य")}
            value={state}
            onChange={setState}
            options={[
              { value: ALL, label: t("All States", "सभी राज्य") },
              ...indianStates.map((s) => ({ value: s, label: s })),
            ]}
          />
          <FilterSelect
            id="vendor-cuisine"
            label={t("Cuisine", "व्यंजन")}
            value={cuisine}
            onChange={setCuisine}
            options={[
              { value: ALL, label: t("All Cuisines", "सभी व्यंजन") },
              ...cuisineOptions.map((c) => ({ value: c, label: c })),
            ]}
          />
          <FilterSelect
            id="vendor-tier"
            label={t("Tier", "टियर")}
            value={tier}
            onChange={(v) => setTier(v as TierFilter)}
            options={TIER_OPTIONS.map((tv) => ({
              value: tv,
              label: tv === ALL ? t("All Tiers", "सभी टियर") : tierLabel(tv),
            }))}
          />
          <FilterSelect
            id="vendor-price"
            label={t("Price / plate", "कीमत / प्लेट")}
            value={price}
            onChange={(v) => setPrice(v as PriceRange)}
            options={PRICE_RANGES.map((r) => ({
              value: r.value,
              label: priceLabel(r.value),
            }))}
          />
        </div>

        {/* Quick filters — Diet (segmented) + Serves (multi-select chips) */}
        <div className="mt-5 flex flex-col gap-4 border-t border-cream-3 pt-5 lg:flex-row lg:items-start lg:gap-8">
          <div className="shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {t("Diet", "डाइट")}
            </p>
            <div className="mt-3 inline-flex rounded-full border border-cream-3 bg-cream-2/40 p-1">
              {DIET_OPTIONS.map((dietValue) => (
                <button
                  key={dietValue}
                  type="button"
                  onClick={() => setDiet(dietValue)}
                  aria-pressed={diet === dietValue}
                  className={
                    "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
                    (diet === dietValue
                      ? "bg-maroon text-cream"
                      : "text-ink-soft hover:text-ink")
                  }
                >
                  {dietLabel(dietValue)}
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {t("Serves", "परोसता है")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {mealTypeOptions.map((meal) => (
                <Chip
                  key={meal}
                  label={mealLabel(meal)}
                  active={meals.includes(meal)}
                  onClick={() => toggleMeal(meal)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results summary */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {t("Showing", "दिखा रहे हैं")}{" "}
          <span className="font-semibold text-ink">{results.length}</span>{" "}
          {results.length === 1
            ? t("verified caterer", "वेरिफाइड कैटरर")
            : t("verified caterers", "वेरिफाइड कैटरर्स")}
          {city !== ALL && (
            <>
              {" "}
              {t("in", "में")}{" "}
              <span className="font-medium text-maroon">{city}</span>
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
            {t("Clear all", "सभी हटाएं")}
          </button>
        )}
      </div>

      {/* Vendor grid */}
      {results.length > 0 ? (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {results.map((vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              stats={statFor(ratings, vendor)}
            />
          ))}
        </ul>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-cream-3 bg-white/60 p-6 text-center sm:p-12">
          <p className="font-display text-lg text-ink">
            {t("No vendors found", "कोई वेंडर नहीं मिला")}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {t(
              "Try a different search or relax your filters.",
              "अलग खोज आज़माएं या अपने फ़िल्टर हटाएं।",
            )}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 inline-flex items-center rounded-full border border-maroon px-5 py-2 text-sm font-medium text-maroon transition-shadow hover:shadow-md"
            >
              {t("Clear all", "सभी हटाएं")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wide text-ink-soft"
      >
        {label}
      </label>
      <ThemedSelect
        id={id}
        value={value}
        onChange={onChange}
        ariaLabel={label}
        buttonClassName="w-full rounded-lg border border-cream-3 bg-cream-2/40 px-3.5 py-2.5 text-sm font-medium transition-colors"
        options={options}
      />
    </div>
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

function VendorCard({
  vendor,
  stats,
}: {
  vendor: VendorListing;
  stats?: VendorRatingSummary;
}) {
  const { t } = useLang();

  const tierBadgeLabel = (tier: Tier): string => {
    switch (tier) {
      case "Silver":
        return t("Silver", "सिल्वर");
      case "Gold":
        return t("Gold", "गोल्ड");
      case "Platinum":
        return t("Platinum", "प्लैटिनम");
      default:
        return tier;
    }
  };

  const dietBadgeLabel = (value: VendorListing["diet"]): string => {
    switch (value) {
      case "Veg":
        return t("Veg", "वेज");
      case "Non-Veg":
        return t("Non-Veg", "नॉन-वेज");
      case "Veg & Non-Veg":
        return t("Veg & Non-Veg", "वेज और नॉन-वेज");
      default:
        return value;
    }
  };

  const mealBadgeLabel = (value: string): string => {
    switch (value) {
      case "Breakfast":
        return t("Breakfast", "नाश्ता");
      case "Lunch":
        return t("Lunch", "दोपहर का भोजन");
      case "Dinner":
        return t("Dinner", "रात्रि भोज");
      case "Starters":
        return t("Starters", "स्टार्टर");
      case "Main Course":
        return t("Main Course", "मुख्य व्यंजन");
      case "Desserts":
        return t("Desserts", "मिठाई");
      case "Live Counters":
        return t("Live Counters", "लाइव काउंटर");
      default:
        return value;
    }
  };

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
        <span className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {vendor.tiers.map((tier) => (
            <span
              key={tier}
              className={
                "rounded-full px-3 py-1 text-xs font-semibold shadow-sm " +
                tierBadgeClass(tier)
              }
            >
              {tierBadgeLabel(tier)}
            </span>
          ))}
        </span>
        {vendor.verified && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-maroon shadow-sm backdrop-blur-sm">
            <span aria-hidden="true">✓</span> {t("Verified", "वेरिफाइड")}
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

        {stats && (
          <p className="mt-1.5 text-sm font-semibold text-maroon">
            <span aria-hidden="true">★</span> {stats.rating} ·{" "}
            {t(
              `${stats.count} verified ${stats.count === 1 ? "review" : "reviews"}`,
              `${stats.count} सत्यापित समीक्षाएँ`,
            )}
          </p>
        )}

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
            {dietBadgeLabel(vendor.diet)}
          </span>
        </div>

        <p className="mt-2.5 flex items-start gap-1.5 text-xs text-ink-soft">
          <span className="font-semibold text-ink">{t("Serves", "परोसता है")}:</span>
          <span>{vendor.mealTypes.map(mealBadgeLabel).join(" · ")}</span>
        </p>

        <div className="mt-4 flex items-end justify-between border-t border-cream-3 pt-4">
          <div>
            <p className="text-xs text-ink-soft">{t("From", "से")}</p>
            <p className="font-display text-lg font-semibold text-maroon">
              ₹{vendor.priceFrom.toLocaleString("en-IN")}{" "}
              <span className="text-sm font-normal text-ink-soft">
                / {t("plate", "प्लेट")}
              </span>
            </p>
          </div>
          <Link
            href="/book"
            className="inline-flex items-center rounded-full border border-maroon px-4 py-2 text-sm font-medium text-maroon transition-shadow group-hover:shadow-md"
          >
            {t("View & Compare", "देखें और तुलना करें")}
          </Link>
        </div>
      </div>
    </li>
  );
}
