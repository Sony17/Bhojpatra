"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  bookingTimeSlots,
  cities,
  formatClockTime,
  indianStates,
  mealPeriodForTime,
  mealTypeOptions,
  type VendorListing,
} from "@/lib/data";
import {
  useVendorRatings,
  statFor,
  type VendorRatingSummary,
} from "@/lib/vendorRatings";
import { useCompare } from "@/lib/compare";
import { useAllVendors } from "@/lib/useAllVendors";
import { useLang } from "@/lib/i18n";
import { useLocations } from "@/lib/locations";
import {
  LOCATION_CHANGED_EVENT,
  readStoredLocation,
  resolveLocationDisplayName,
  type StoredLocation,
} from "@/lib/detectedLocation";
import ThemedSelect from "@/components/ThemedSelect";
import CompareTray from "@/components/vendors/CompareTray";
import BainaBoxSpecial from "@/components/BainaBoxSpecial";
import {
  AppSearchBar,
  Button,
  Card,
  CategoryChip,
  CategoryChips,
  Drawer,
  EmptyState,
  PullToRefresh,
} from "@/components/ui";

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
  const locations = useLocations();

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

  // Seed every filter from URL params so other pages can deep-link a pre-filtered
  // catalog — the home page's Baina Box CTA (`/vendors?q=Baina+Box`) and the
  // service-category cards (`/vendors?meal=Live+Counters`, `?cuisine=Sweets`, …).
  // Unrecognised values fall back to the default so a stray param can't wedge a
  // filter into an invalid state.
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<string>(() => searchParams.get("q") ?? "");
  const [city, setCity] = useState<string>(() => searchParams.get("city") ?? ALL);
  const [state, setState] = useState<string>(() => searchParams.get("state") ?? ALL);
  const [cuisine, setCuisine] = useState<string>(
    () => searchParams.get("cuisine") ?? ALL,
  );
  const [diet, setDiet] = useState<DietFilter>(() => {
    const d = searchParams.get("diet");
    return DIET_OPTIONS.includes(d as DietFilter) ? (d as DietFilter) : ALL;
  });
  const [tier, setTier] = useState<TierFilter>(() => {
    const tv = searchParams.get("tier");
    return TIER_OPTIONS.includes(tv as TierFilter) ? (tv as TierFilter) : ALL;
  });
  const [price, setPrice] = useState<PriceRange>(() => {
    const p = searchParams.get("price");
    if (PRICE_RANGES.some((r) => r.value === p)) return p as PriceRange;
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("bhoj_vendor_price");
      if (PRICE_RANGES.some((r) => r.value === stored)) return stored as PriceRange;
    }
    return ALL;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (price !== ALL) {
        sessionStorage.setItem("bhoj_vendor_price", price);
      } else {
        sessionStorage.removeItem("bhoj_vendor_price");
      }
    }
  }, [price]);
  const [meals, setMeals] = useState<string[]>(() => {
    const m = searchParams.get("meal");
    return m && mealTypeOptions.includes(m) ? [m] : [];
  });
  // Exact serving time (24-hour `HH:MM`, from `bookingTimeSlots`). When set, the
  // catalog maps it to a meal period via `mealPeriodForTime` and keeps only the
  // caterers that serve that meal — the same "time → meal" lens the booking
  // wizard's serving-time picker uses. Empty = no serving-time filter.
  const [servingTime, setServingTime] = useState<string>(() => {
    const tm = searchParams.get("time");
    return tm && Object.values(bookingTimeSlots).flat().includes(tm) ? tm : "";
  });
  const [sort, setSort] = useState<SortKey>(() => {
    const s = searchParams.get("sort");
    if (
      s === "price-asc" ||
      s === "price-desc" ||
      s === "rating" ||
      s === "relevance"
    ) {
      return s as SortKey;
    }
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("bhoj_vendor_sort");
      if (
        stored === "price-asc" ||
        stored === "price-desc" ||
        stored === "rating" ||
        stored === "relevance"
      ) {
        return stored as SortKey;
      }
    }
    return "relevance";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("bhoj_vendor_sort", sort);
    }
  }, [sort]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Real customer ratings, matched to these listings by name (best-effort).
  const ratings = useVendorRatings();

  // When caterers are ticked for comparison, a sticky tray covers the page
  // bottom — pad the section so the last row of cards clears it.
  const { count: compareCount } = useCompare();

  // Curated static listings + live dashboard-published vendors.
  const [refreshToken, setRefreshToken] = useState(0);
  const allVendors = useAllVendors(refreshToken);
  const onPullRefresh = useCallback(async () => {
    setRefreshToken((n) => n + 1);
    await new Promise((r) => setTimeout(r, 350));
  }, []);

  const toggleMeal = (meal: string) =>
    setMeals((prev) =>
      prev.includes(meal) ? prev.filter((m) => m !== meal) : [...prev, meal],
    );

  // Baina Boxes are curated sweet gift boxes, not full caterers — so a Baina
  // search (home page CTA → /vendors?q=Baina+Box, or typing "baina") focuses the
  // catalog: only location & price filters are relevant. Cuisine, tier, diet and
  // meal-type ("Serves") filters are hidden and neutralised below.
  const isBainaSearch = query.trim().toLowerCase().includes("baina");

  // Distinct cities, in first-seen order.
  const cityOptions = useMemo(
    () => Array.from(new Set(allVendors.map((v) => v.city))),
    [allVendors],
  );

  useEffect(() => {
    if (searchParams.get("city")) return;

    function applyStored(stored: StoredLocation | null) {
      if (!stored?.cityId) return;
      const name = resolveLocationDisplayName(
        stored.cityId,
        locations,
        stored.customCity,
      );
      if (!name || !cityOptions.includes(name)) return;
      setCity(name);
    }

    applyStored(readStoredLocation());

    function onChanged(e: Event) {
      applyStored((e as CustomEvent<StoredLocation>).detail);
    }
    window.addEventListener(LOCATION_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(LOCATION_CHANGED_EVENT, onChanged);
  }, [cityOptions, locations, searchParams]);

  // Distinct cuisines, sorted alphabetically.
  const cuisineOptions = useMemo(
    () =>
      Array.from(new Set(allVendors.flatMap((v) => v.cuisines))).sort(),
    [allVendors],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = allVendors.filter((v) => {
      const matchesQuery =
        q === "" ||
        v.name.toLowerCase().includes(q) ||
        v.cuisines.some((c) => c.toLowerCase().includes(q));

      const matchesMeals =
        isBainaSearch ||
        meals.length === 0 ||
        meals.some((m) => v.mealTypes.includes(m));

      // A picked serving time narrows to caterers serving the meal it lands in
      // (e.g. 8:30 PM → Dinner). Neutral for Baina searches (gift boxes aren't
      // time-served) and when no time is chosen.
      const matchesServingTime =
        isBainaSearch ||
        servingTime === "" ||
        v.mealTypes.includes(mealPeriodForTime(servingTime));

      return (
        matchesQuery &&
        (city === ALL || v.city === city) &&
        (state === ALL || v.state === state) &&
        (isBainaSearch || cuisine === ALL || v.cuisines.includes(cuisine)) &&
        (isBainaSearch || matchesDiet(v, diet)) &&
        (isBainaSearch || tier === ALL || v.tiers.includes(tier)) &&
        matchesPrice(v, price) &&
        matchesMeals &&
        matchesServingTime
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
  }, [
    allVendors,
    query,
    isBainaSearch,
    city,
    state,
    cuisine,
    diet,
    tier,
    price,
    meals,
    servingTime,
    sort,
  ]);

  const hasActiveFilters =
    query !== "" ||
    city !== ALL ||
    state !== ALL ||
    cuisine !== ALL ||
    diet !== ALL ||
    tier !== ALL ||
    price !== ALL ||
    meals.length > 0 ||
    servingTime !== "";

  /** Count of sheet filters (excludes search) — drives the Filters chip badge. */
  const activeFilterCount = [
    city !== ALL,
    state !== ALL,
    cuisine !== ALL,
    diet !== ALL,
    tier !== ALL,
    price !== ALL,
    meals.length > 0,
    servingTime !== "",
  ].filter(Boolean).length;

  const resetFilters = () => {
    setQuery("");
    setCity(ALL);
    setState(ALL);
    setCuisine(ALL);
    setDiet(ALL);
    setTier(ALL);
    setPrice(ALL);
    setMeals([]);
    setServingTime("");
    setSort("relevance");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("bhoj_vendor_sort");
      sessionStorage.removeItem("bhoj_vendor_price");
    }
  };

  const chipClass = (active: boolean) =>
    "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors " +
    (active
      ? "border-maroon bg-cream text-ink"
      : "border-maroon/15 bg-white text-ink/70");

  const selectChipClass = (active: boolean) =>
    chipClass(active) + " !w-auto gap-1 pr-2";

  return (
    <PullToRefresh onRefresh={onPullRefresh}>
    <section
      className={
        "relative bg-transparent px-4 pb-12 pt-2 sm:px-5 sm:pb-16 sm:pt-4 " +
        (compareCount > 0 ? "pb-32 sm:pb-36" : "")
      }
    >
      <div className="mx-auto max-w-7xl">
      {/* Bhojpatra's signature Baina Box promotion — pinned above the catalogue. */}
      <div className="mb-6 mt-2">
        <BainaBoxSpecial variant="search" />
      </div>

      <div className="max-w-xl px-1">
        <p className="eyebrow text-[11px] font-semibold text-maroon">
          {isBainaSearch
            ? t("Baina Boxes", "बैना बॉक्स")
            : t("Near you", "आपके पास")}
        </p>
        {isBainaSearch ? (
          <>
            <h1 className="mt-2 text-app-title text-ink">
              {t("Gift Boxes of Sweetness & Love", "मिठास और प्यार के गिफ्ट बॉक्स")}
            </h1>
            <p className="mt-2 text-body text-ink/55">
              {t(
                "Filter by city & price, then order.",
                "शहर और कीमत से फ़िल्टर करें, फिर ऑर्डर करें।",
              )}
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-app-title text-ink">
              {t("Choose your favourite Brand", "अपना पसंदीदा ब्रांड चुनें")}
            </h1>
            <p className="mt-2 text-body text-ink/55">
              {t(
                "Search, filter, book — verified caterers near you.",
                "खोजें, फ़िल्टर करें, बुक करें — आपके पास वेरिफाइड कैटरर।",
              )}
            </p>
          </>
        )}
      </div>

      {/* Sticky app chrome — search + chip row */}
      <div className="app-sticky-chrome -mx-4 mt-4 px-4 py-3 sm:-mx-5 sm:px-5">
        <div className="mx-auto max-w-7xl">
          <AppSearchBar
            id="vendor-search"
            value={query}
            onChange={setQuery}
            aria-label={t("Search brands", "ब्रांड खोजें")}
            placeholder={t(
              "Search brands, stalls or cuisines",
              "ब्रांड, स्टॉल या व्यंजन खोजें",
            )}
          />

          <CategoryChips
            className="mt-3"
            label={t("Filters", "फ़िल्टर")}
          >
            <CategoryChip
              selected={activeFilterCount > 0}
              onClick={() => setFiltersOpen(true)}
              count={activeFilterCount > 0 ? activeFilterCount : undefined}
              leftIcon={<FilterGlyph />}
            >
              {t("Filters", "फ़िल्टर")}
            </CategoryChip>

            <CategoryChip
              id="vendor-sort-chip"
              selected={sort === "price-asc" || sort === "price-desc"}
              onClick={() => {
                setSort((prev) =>
                  prev === "price-asc" ? "price-desc" : "price-asc",
                );
              }}
            >
              {sort === "price-asc"
                ? t("Price: Low to High ↑", "कीमत: कम से ज्यादा ↑")
                : sort === "price-desc"
                  ? t("Price: High to Low ↓", "कीमत: ज्यादा से कम ↓")
                  : t("Sort by Price", "कीमत अनुसार")}
            </CategoryChip>

            <ThemedSelect
              id="vendor-city-chip"
              value={city}
              onChange={setCity}
              ariaLabel={t("City", "शहर")}
              className="w-auto max-w-[9rem] shrink-0"
              buttonClassName={selectChipClass(city !== ALL)}
              options={[
                { value: ALL, label: t("City", "शहर") },
                ...cityOptions.map((c) => ({ value: c, label: c })),
              ]}
            />

            <CategoryChip
              id="vendor-price-chip"
              selected={price !== ALL}
              onClick={() => {
                const ranges: PriceRange[] = ["all", "budget", "premium", "luxury"];
                const nextIdx = (ranges.indexOf(price) + 1) % ranges.length;
                setPrice(ranges[nextIdx]);
              }}
            >
              {price === ALL ? t("Price", "कीमत") : priceLabel(price)}
            </CategoryChip>

            {!isBainaSearch &&
              DIET_OPTIONS.filter((d) => d !== ALL).map((dietValue) => (
                <CategoryChip
                  key={dietValue}
                  selected={diet === dietValue}
                  onClick={() =>
                    setDiet((prev) => (prev === dietValue ? ALL : dietValue))
                  }
                >
                  {dietLabel(dietValue)}
                </CategoryChip>
              ))}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="shrink-0 px-2 text-[12px] font-semibold text-maroon"
              >
                {t("Clear", "हटाएँ")}
              </button>
            )}
          </CategoryChips>

          {/* Desktop-only expanded dropdowns */}
          <div
            className={
              "mt-3 hidden gap-2 lg:grid " +
              (isBainaSearch ? "lg:grid-cols-3" : "lg:grid-cols-5")
            }
          >
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
            {!isBainaSearch && (
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
            )}
            {!isBainaSearch && (
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
            )}
            <FilterSelect
              id="vendor-price"
              label={
                isBainaSearch
                  ? t("Price / box", "कीमत / बॉक्स")
                  : t("Price / plate", "कीमत / प्लेट")
              }
              value={price}
              onChange={(v) => setPrice(v as PriceRange)}
              options={PRICE_RANGES.map((r) => ({
                value: r.value,
                label: priceLabel(r.value),
              }))}
            />
          </div>
        </div>
      </div>

      {/* Mobile filter sheet */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t("Filters", "फ़िल्टर")}
      >
        <div className="space-y-5">
          <FilterSelect
            id="sheet-city"
            label={t("City", "शहर")}
            value={city}
            onChange={setCity}
            options={[
              { value: ALL, label: t("All Cities", "सभी शहर") },
              ...cityOptions.map((c) => ({ value: c, label: c })),
            ]}
          />
          <FilterSelect
            id="sheet-state"
            label={t("State", "राज्य")}
            value={state}
            onChange={setState}
            options={[
              { value: ALL, label: t("All States", "सभी राज्य") },
              ...indianStates.map((s) => ({ value: s, label: s })),
            ]}
          />
          {!isBainaSearch && (
            <FilterSelect
              id="sheet-cuisine"
              label={t("Cuisine", "व्यंजन")}
              value={cuisine}
              onChange={setCuisine}
              options={[
                { value: ALL, label: t("All Cuisines", "सभी व्यंजन") },
                ...cuisineOptions.map((c) => ({ value: c, label: c })),
              ]}
            />
          )}
          {!isBainaSearch && (
            <FilterSelect
              id="sheet-tier"
              label={t("Tier", "टियर")}
              value={tier}
              onChange={(v) => setTier(v as TierFilter)}
              options={TIER_OPTIONS.map((tv) => ({
                value: tv,
                label: tv === ALL ? t("All Tiers", "सभी टियर") : tierLabel(tv),
              }))}
            />
          )}
          <FilterSelect
            id="sheet-price"
            label={
              isBainaSearch
                ? t("Price / box", "कीमत / बॉक्स")
                : t("Price / plate", "कीमत / प्लेट")
            }
            value={price}
            onChange={(v) => setPrice(v as PriceRange)}
            options={PRICE_RANGES.map((r) => ({
              value: r.value,
              label: priceLabel(r.value),
            }))}
          />

          {!isBainaSearch && (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                  {t("Diet", "डाइट")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DIET_OPTIONS.map((dietValue) => (
                    <button
                      key={dietValue}
                      type="button"
                      onClick={() => setDiet(dietValue)}
                      aria-pressed={diet === dietValue}
                      className={chipClass(diet === dietValue)}
                    >
                      {dietLabel(dietValue)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                  {t("Serves", "परोसता है")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {mealTypeOptions.map((meal) => (
                    <button
                      key={meal}
                      type="button"
                      onClick={() => toggleMeal(meal)}
                      aria-pressed={meals.includes(meal)}
                      className={chipClass(meals.includes(meal))}
                    >
                      {mealLabel(meal)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                  {t("Serving time", "परोसने का समय")}
                </p>
                <div className="mt-2">
                  <ThemedSelect
                    value={servingTime}
                    onChange={setServingTime}
                    ariaLabel={t("Serving time", "परोसने का समय")}
                    buttonClassName="w-full rounded-control border border-cream-3 bg-cream-2/40 px-3.5 py-2.5 text-sm font-medium transition-colors"
                    options={[
                      { value: "", label: t("Any time", "कोई भी समय") },
                      ...Object.values(bookingTimeSlots)
                        .flat()
                        .map((hhmm) => ({
                          value: hhmm,
                          label: formatClockTime(hhmm),
                        })),
                    ]}
                  />
                  {servingTime && (
                    <p className="mt-1.5 text-[12px] text-ink/55">
                      {t("Showing", "दिखा रहे हैं")}{" "}
                      <span className="font-medium text-maroon">
                        {mealLabel(mealPeriodForTime(servingTime))}
                      </span>{" "}
                      {t("caterers", "कैटरर")}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="sticky bottom-0 -mx-5 flex gap-2 border-t border-maroon/10 bg-white px-5 py-3">
            <Button variant="secondary" fullWidth onClick={resetFilters}>
              {t("Clear all", "सभी हटाएं")}
            </Button>
            <Button fullWidth onClick={() => setFiltersOpen(false)}>
              {t("Show", "दिखाएँ")} {results.length}
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Results summary */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[13px] text-ink/55">
          <span className="font-semibold text-ink">{results.length}</span>{" "}
          {results.length === 1
            ? t("caterer", "कैटरर")
            : t("caterers", "कैटरर")}
          {city !== ALL && (
            <>
              {" "}
              {t("in", "में")}{" "}
              <span className="font-medium text-maroon">{city}</span>
            </>
          )}
          {cuisine !== ALL && (
            <>
              {" "}
              — <span className="font-medium text-maroon">{cuisine}</span>
            </>
          )}
        </p>
      </div>

      {/* Vendor grid — denser app spacing */}
      {results.length > 0 ? (
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {results.map((vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              stats={statFor(ratings, vendor)}
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          className="mt-4"
          title={t("No vendors found", "कोई वेंडर नहीं मिला")}
          message={t(
            "Try a different search or relax your filters.",
            "अलग खोज आज़माएं या अपने फ़िल्टर हटाएं।",
          )}
          action={
            hasActiveFilters ? (
              <Button variant="secondary" size="sm" onClick={resetFilters}>
                {t("Clear all", "सभी हटाएं")}
              </Button>
            ) : undefined
          }
        />
      )}

      <CompareTray />
      </div>
    </section>
    </PullToRefresh>
  );
}

function FilterGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6h16M7 12h10M10 18h4" />
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
        buttonClassName="w-full rounded-control border border-cream-3 bg-cream-2/40 px-3.5 py-2.5 text-sm font-medium transition-colors"
        options={options}
      />
    </div>
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
  const { has, toggle, isFull } = useCompare();
  const inCompare = has(vendor.id);
  const compareDisabled = !inCompare && isFull;
  const cityId = cities.find((c) => c.name === vendor.city)?.id;
  // "Book" from a brand card starts a Single Stall with this vendor pre-selected
  // (still changeable in the wizard). Live vendors resolve by id; a curated seed
  // id absent from the booking menu simply falls back to the tier picker.
  const bookHref = `/book?package=custom&vendor=${encodeURIComponent(
    vendor.id,
  )}${cityId ? `&city=${cityId}` : ""}&step=menu`;

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
    <Card
      as="li"
      interactive
      padding="none"
      className="group relative flex flex-col overflow-hidden"
    >
      {/* Image — Zomato-style media plane with rating chip on the photo */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream">
        <Image
          src={vendor.image}
          alt={vendor.name}
          fill
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 via-black/15 to-transparent"
        />

        {vendor.verified && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-maroon shadow-sm backdrop-blur-sm">
            <span aria-hidden="true">✓</span>
            {t("Verified", "वेरिफाइड")}
          </span>
        )}

        <button
          type="button"
          onClick={() => toggle(vendor.id)}
          disabled={compareDisabled}
          aria-pressed={inCompare}
          aria-label={
            inCompare
              ? t("Remove from compare", "तुलना से हटाएँ")
              : t("Add to compare", "तुलना में जोड़ें")
          }
          title={
            compareDisabled
              ? t("Compare list is full", "तुलना सूची भर गई है")
              : undefined
          }
          className={
            "absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
            (inCompare
              ? "bg-maroon text-cream"
              : "bg-white/95 text-ink hover:text-maroon")
          }
        >
          <span aria-hidden="true" className="text-sm font-bold leading-none">
            {inCompare ? "✓" : "+"}
          </span>
        </button>

        {/* Rating on image — Swiggy/Zomato signature chip */}
        <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5">
          {vendor.reviews > 0 || stats ? (
            <Link
              href={`/vendors/${vendor.id}#reviews`}
              className="relative z-10 inline-flex items-center gap-0.5 rounded bg-maroon px-1.5 py-0.5 text-[11px] font-bold text-cream shadow-sm"
              aria-label={t(
                `Rated ${stats?.rating ?? vendor.rating}`,
                `रेटिंग ${stats?.rating ?? vendor.rating}`,
              )}
            >
              {(stats?.rating ?? vendor.rating).toFixed(1)}
              <span aria-hidden="true">★</span>
            </Link>
          ) : vendor.googleRating ? (
            <span className="inline-flex items-center gap-0.5 rounded bg-white/95 px-1.5 py-0.5 text-[11px] font-bold text-ink shadow-sm">
              {vendor.googleRating}
              <span aria-hidden="true" className="text-maroon">
                ★
              </span>
            </span>
          ) : (
            <span className="rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-maroon shadow-sm">
              {t("New", "नया")}
            </span>
          )}
          {vendor.tiers[0] && (
            <span
              className={
                "rounded px-1.5 py-0.5 text-[10px] font-semibold shadow-sm " +
                tierBadgeClass(vendor.tiers[0])
              }
            >
              {tierBadgeLabel(vendor.tiers[0])}
            </span>
          )}
        </div>
      </div>

      {/* Dense info block — app card body */}
      <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3">
        <div className="flex items-start gap-2">
          {/* Diet mark — brand-only semantic square */}
          <span
            aria-label={dietBadgeLabel(vendor.diet)}
            title={dietBadgeLabel(vendor.diet)}
            className={
              "mt-1 h-3.5 w-3.5 shrink-0 rounded-[2px] border-2 " +
              (vendor.diet === "Non-Veg"
                ? "border-maroon bg-maroon"
                : vendor.diet === "Veg"
                  ? "border-maroon bg-cream"
                  : "border-maroon bg-white")
            }
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-sans text-[15px] font-bold leading-snug tracking-tight text-ink">
              {vendor.name}
            </h3>
            <p className="mt-0.5 truncate text-[12px] leading-snug text-ink/55">
              {vendor.cuisines.slice(0, 3).join(" · ")}
              {vendor.cuisines.length > 3 ? "…" : ""}
            </p>
            <p className="mt-0.5 truncate text-[12px] leading-snug text-ink/45">
              {vendor.city}
              <span aria-hidden className="mx-1 text-ink/25">
                ·
              </span>
              {vendor.mealTypes.slice(0, 2).map(mealBadgeLabel).join(", ")}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-maroon/8 pt-2.5">
          <p className="min-w-0 font-sans text-[13px] font-semibold text-ink">
            <span className="text-maroon">
              ₹{vendor.priceFrom.toLocaleString("en-IN")}
            </span>
            <span className="font-normal text-ink/45">
              {" "}
              {t("/ plate", "/ प्लेट")}
            </span>
          </p>
          <div className="relative z-10 flex shrink-0 items-center gap-1.5">
            <Button
              href={`/vendors/${vendor.id}`}
              variant="ghost"
              size="sm"
              className="min-h-8 px-2.5 text-[11px]"
            >
              {t("View", "देखें")}
            </Button>
            <Button
              href={bookHref}
              variant="primary"
              size="sm"
              className="min-h-8 px-3.5 text-[11px] shadow-brand"
            >
              {t("Book", "बुक")}
            </Button>
          </div>
        </div>
      </div>

      <Link
        href={`/vendors/${vendor.id}`}
        aria-label={t(`View ${vendor.name}`, `${vendor.name} देखें`)}
        className="absolute inset-0 z-0 rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon"
        tabIndex={-1}
      >
        <span className="sr-only">
          {t(`View ${vendor.name}`, `${vendor.name} देखें`)}
        </span>
      </Link>
    </Card>
  );
}
