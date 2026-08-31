"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  bookingTimeSlots,
  cateringCategoryIds,
  cities,
  formatClockTime,
  listingCateringCategories,
  listingOfferings,
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
import { getBainaBoxVendorByVendorId } from "@/lib/bainaBoxData";
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

/** The individual filter controls the catalog offers beyond the always-on
 *  city / state / search. */
type FilterKey = "cuisine" | "tier" | "diet" | "price" | "meals" | "time";

const ALL_FILTERS: ReadonlySet<FilterKey> = new Set([
  "cuisine",
  "tier",
  "diet",
  "price",
  "meals",
  "time",
]);

/**
 * Which filters make sense per catering-category lens. Plain browsing and Full
 * Catering expose everything; the specialist lenses trim to what customers
 * actually decide by — a Baina Box hunt needs only city & box price, an
 * Essential Service search only location. Ids not listed here (a category
 * added later) fall back to the full set rather than hiding controls.
 */
const FILTERS_BY_CATEGORY: Record<string, ReadonlySet<FilterKey>> = {
  "full-catering": ALL_FILTERS,
  "single-stall": new Set(["cuisine", "diet", "price", "meals"]),
  "live-stall": new Set(["cuisine", "diet", "price"]),
  "hi-tea": new Set(["diet", "price"]),
  "baina-box": new Set(["price"]),
  essential: new Set([]),
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

/**
 * The browse lens — one chip row spanning every way Bhojpatra sells: the
 * catering categories, the marketplace tier bands and the add-on counters.
 * Exactly one is ever active, and every card in the grid then wears that tag
 * alone. A caterer who also runs a Single Stall and a Baina Box reads as
 * whichever the guest asked for, never all three at once.
 */
type LensId =
  | ""
  | "full-catering"
  | "single-stall"
  | "live-stall"
  | "baina-box"
  | "essential"
  | "addons"
  | Tier;

const TIER_LENS_IDS: readonly string[] = ["Silver", "Gold", "Platinum"];

const isTierLens = (id: LensId): id is Tier => TIER_LENS_IDS.includes(id);

interface Lens {
  id: Exclude<LensId, "">;
  /** Customer-facing wording, which can differ from the vendor-facing category
   *  name — a vendor declares "Full Catering", a guest browses "Caterers". */
  label: string;
  labelHi: string;
  icon?: string;
  match: (v: VendorListing) => boolean;
}

/** Live vendors match a category on their declared set, curated seeds on the
 *  derived one. */
const inCategory =
  (id: string) =>
  (v: VendorListing): boolean =>
    listingCateringCategories(v).includes(id);

const LENSES: Lens[] = [
  { id: "full-catering", label: "Caterers", labelHi: "कैटरर", icon: "🍲", match: inCategory("full-catering") },
  { id: "single-stall", label: "Single Stall", labelHi: "सिंगल स्टॉल", icon: "🍢", match: inCategory("single-stall") },
  { id: "live-stall", label: "Live Stall", labelHi: "लाइव स्टॉल", icon: "🍳", match: inCategory("live-stall") },
  { id: "baina-box", label: "Baina Box", labelHi: "बैना बॉक्स", icon: "🎁", match: inCategory("baina-box") },
  { id: "Silver", label: "Silver", labelHi: "सिल्वर", match: (v) => v.tiers.includes("Silver") },
  { id: "Gold", label: "Gold", labelHi: "गोल्ड", match: (v) => v.tiers.includes("Gold") },
  { id: "Platinum", label: "Platinum", labelHi: "प्लैटिनम", match: (v) => v.tiers.includes("Platinum") },
  { id: "addons", label: "Add-ons", labelHi: "ऐड-ऑन", icon: "➕", match: (v) => listingOfferings(v).length > 0 },
  { id: "essential", label: "Service Package", labelHi: "सर्विस पैकेज", icon: "🍽️", match: inCategory("essential") },
];

const LENS_BY_ID = new Map<string, Lens>(LENSES.map((l) => [l.id, l]));

export default function VendorCatalog() {
  const { t, lang } = useLang();
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
      case "Hi-tea":
        return t("Hi-tea", "हाई-टी");
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
  // The catering-category lens (full-catering / single-stall / live-stall /
  // baina-box / essential …) — written out as chips right under the header so
  // visitors see the offering types before they ever open a filter.
  const [category, setCategory] = useState<string>(() => {
    const c = searchParams.get("category") ?? "";
    return cateringCategoryIds.includes(c) ? c : "";
  });
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
  // The "Add-ons" lens — caterers who run at least one of the counters/services
  // the wizard's Extras step sells (pan, chaat, live woks, staff, decor…).
  const [addOnsOnly, setAddOnsOnly] = useState<boolean>(
    () => searchParams.get("addons") === "1",
  );
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
  // Picking the Baina Box lens behaves exactly like a Baina search — the promo
  // hero, the boxed heading and the slimmed-down filter set. Search text only
  // *implies* the lens while nothing else is picked, so choosing Caterers or
  // Platinum with "baina" still in the box does what the chip says.
  const bainaMode =
    category === "baina-box" ||
    (isBainaSearch && category === "" && !addOnsOnly && tier === ALL);

  /** The one active lens, read back off the filter states the chips write.
   *  A category chip wins; a bare "baina" search implies the Baina lens;
   *  otherwise it's the tier band or the add-ons pick. */
  const lens: LensId = category
    ? (category as LensId)
    : bainaMode
      ? "baina-box"
      : addOnsOnly
        ? "addons"
        : tier !== ALL
          ? tier
          : "";

  /** The lens row is single-select: picking one clears whatever else was set,
   *  so the grid can only ever be showing — and tagging — one thing at a time. */
  const selectLens = (next: LensId) => {
    const asTier = isTierLens(next);
    setCategory(asTier || next === "addons" ? "" : next);
    setTier(asTier ? next : ALL);
    setAddOnsOnly(next === "addons");
  };

  // The filter controls that make sense for the current lens; anything hidden
  // is also neutralised in the result filter so a stale value can't silently
  // constrain the grid.
  const visibleFilters: ReadonlySet<FilterKey> = useMemo(
    () =>
      bainaMode
        ? FILTERS_BY_CATEGORY["baina-box"]
        : category
          ? (FILTERS_BY_CATEGORY[category] ?? ALL_FILTERS)
          : ALL_FILTERS,
    [bainaMode, category],
  );
  const showFilter = (f: FilterKey) => visibleFilters.has(f);

  // Distinct cities, in first-seen order.
  const cityOptions = useMemo(
    () => Array.from(new Set(allVendors.map((v) => v.city))),
    [allVendors],
  );

  // Distinct states that actually have vendors, alphabetical. Derived rather
  // than listing all of `indianStates` — vendors can register from anywhere,
  // but a filter offering 30-odd states that match nothing is just noise.
  const stateOptions = useMemo(
    () =>
      Array.from(new Set(allVendors.map((v) => v.state).filter(Boolean))).sort(),
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

      // The catering-category lens: live vendors match on their declared set,
      // curated seeds on the derived one. Baina search text implies the
      // baina-box lens even with no chip picked.
      const matchesCategory =
        bainaMode
          ? listingCateringCategories(v).includes("baina-box") ||
            v.name.toLowerCase().includes("baina") ||
            v.cuisines.some((c) => c.toLowerCase().includes("baina"))
          : category === "" ||
            listingCateringCategories(v).includes(category);

      // The Add-ons lens: caterers running at least one platform counter or
      // service. Live vendors declare theirs, curated seeds derive them.
      const matchesAddOns = !addOnsOnly || listingOfferings(v).length > 0;

      const matchesMeals =
        !visibleFilters.has("meals") ||
        meals.length === 0 ||
        meals.some((m) => v.mealTypes.includes(m));

      // A picked serving time narrows to caterers serving the meal it lands in
      // (e.g. 8:30 PM → Dinner). Neutral for Baina searches (gift boxes aren't
      // time-served) and when no time is chosen.
      const matchesServingTime =
        !visibleFilters.has("time") ||
        servingTime === "" ||
        v.mealTypes.includes(mealPeriodForTime(servingTime));

      return (
        matchesQuery &&
        matchesCategory &&
        matchesAddOns &&
        (city === ALL || v.city === city) &&
        (state === ALL || v.state === state) &&
        (!visibleFilters.has("cuisine") || cuisine === ALL || v.cuisines.includes(cuisine)) &&
        (!visibleFilters.has("diet") || matchesDiet(v, diet)) &&
        (!visibleFilters.has("tier") || tier === ALL || v.tiers.includes(tier)) &&
        (!visibleFilters.has("price") || matchesPrice(v, price)) &&
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
    bainaMode,
    category,
    addOnsOnly,
    visibleFilters,
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

  /** How many caterers each lens would surface, counted against the always-on
   *  search + location narrowing so the numbers track what the guest has
   *  already scoped to. A lens nobody serves yet simply shows no count. */
  const lensCounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const inScope = allVendors.filter(
      (v) =>
        (q === "" ||
          v.name.toLowerCase().includes(q) ||
          v.cuisines.some((c) => c.toLowerCase().includes(q))) &&
        (city === ALL || v.city === city) &&
        (state === ALL || v.state === state),
    );
    const counts: Record<string, number> = {};
    for (const l of LENSES) counts[l.id] = inScope.filter(l.match).length;
    return counts;
  }, [allVendors, query, city, state]);

  const hasActiveFilters =
    query !== "" ||
    category !== "" ||
    addOnsOnly ||
    city !== ALL ||
    state !== ALL ||
    cuisine !== ALL ||
    diet !== ALL ||
    tier !== ALL ||
    price !== ALL ||
    meals.length > 0 ||
    servingTime !== "";

  /** Count of sheet filters (excludes search) — drives the Filters chip badge.
   *  Only counts controls the current category lens shows; hidden filters are
   *  neutralised, so they'd inflate the badge without affecting results. */
  const activeFilterCount = [
    city !== ALL,
    state !== ALL,
    showFilter("cuisine") && cuisine !== ALL,
    showFilter("diet") && diet !== ALL,
    showFilter("tier") && tier !== ALL,
    showFilter("price") && price !== ALL,
    showFilter("meals") && meals.length > 0,
    showFilter("time") && servingTime !== "",
  ].filter(Boolean).length;

  const resetFilters = () => {
    setQuery("");
    setCategory("");
    setAddOnsOnly(false);
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
      {/* Bhojpatra's signature Baina Box promotion — pinned to the top of the
          catalogue so every visitor lands on it before the brand grid,
          whether they're browsing brands or filtering Baina Boxes. */}
      <div className="mb-6 mt-2">
        <BainaBoxSpecial variant="search" />
      </div>

      <div className="max-w-xl px-1">
        <p className="eyebrow text-[11px] font-semibold text-maroon">
          {bainaMode
            ? t("Baina Boxes", "बैना बॉक्स")
            : t("Near you", "आपके पास")}
        </p>
        {bainaMode ? (
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

      {/* Every way Bhojpatra sells, written out up front — categories, tier
          bands and add-ons in one row. Pick one to focus the grid, trim the
          filters to what that offering needs, and pin every card to that tag. */}
      <CategoryChips className="mt-4 px-1" label={t("Browse by", "इसके अनुसार देखें")}>
        <CategoryChip selected={lens === ""} onClick={() => selectLens("")}>
          {t("All", "सभी")}
        </CategoryChip>
        {LENSES.map((l) => (
          <CategoryChip
            key={l.id}
            selected={lens === l.id}
            count={lensCounts[l.id]}
            onClick={() => selectLens(lens === l.id ? "" : l.id)}
            leftIcon={
              l.icon ? <span aria-hidden="true">{l.icon}</span> : undefined
            }
          >
            {lang === "hi" ? l.labelHi : l.label}
          </CategoryChip>
        ))}
      </CategoryChips>

      {/* Sticky app chrome — search + chip row */}
      <div className="app-sticky-chrome -mx-4 mt-4 px-4 py-3 sm:-mx-5 sm:px-5">
        <div className="mx-auto max-w-7xl">
          <div className="lg:flex lg:items-center lg:gap-3">
            <AppSearchBar
              id="vendor-search"
              value={query}
              onChange={setQuery}
              aria-label={t("Search brands", "ब्रांड खोजें")}
              placeholder={t(
                "Search brands, stalls or cuisines",
                "ब्रांड, स्टॉल या व्यंजन खोजें",
              )}
              className="lg:w-96 lg:shrink-0"
            />

            <CategoryChips
              className="mt-3 lg:mt-0 lg:min-w-0 lg:flex-1"
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

              {showFilter("price") && (
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
              )}

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

              {showFilter("price") && (
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
              )}

              {showFilter("diet") &&
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
          </div>

          {/* Desktop-only expanded dropdowns — only the controls the current
              category lens keeps (city & state always; the rest per lens). */}
          <div
            className={
              "mt-3 hidden gap-2 lg:grid " +
              ({
                2: "lg:grid-cols-2",
                3: "lg:grid-cols-3",
                4: "lg:grid-cols-4",
                5: "lg:grid-cols-5",
              }[
                2 +
                  (showFilter("cuisine") ? 1 : 0) +
                  (showFilter("tier") ? 1 : 0) +
                  (showFilter("price") ? 1 : 0)
              ] ?? "lg:grid-cols-5")
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
                ...stateOptions.map((s) => ({ value: s, label: s })),
              ]}
            />
            {showFilter("cuisine") && (
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
            {showFilter("tier") && (
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
            {showFilter("price") && (
              <FilterSelect
                id="vendor-price"
                label={
                  bainaMode
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
            )}
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
              ...stateOptions.map((s) => ({ value: s, label: s })),
            ]}
          />
          {showFilter("cuisine") && (
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
          {showFilter("tier") && (
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
          {showFilter("price") && (
            <FilterSelect
              id="sheet-price"
              label={
                bainaMode
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
          )}

          {showFilter("diet") && (
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
          )}
          {showFilter("meals") && (
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
          )}
          {showFilter("time") && (
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
              // Whether the card sends the visitor into the Baina Box flow —
              // the lens, not the search text, so the "Baina Box" chip routes
              // exactly like typing "baina" does.
              bainaMode={bainaMode}
              // Browsing a lens pins every card to it: a Gold search never
              // shows a Silver tag, and a Single Stall search never shows a
              // Baina Box one — even on a caterer who is genuinely all three.
              lens={lens}
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
  bainaMode,
  lens,
}: {
  vendor: VendorListing;
  stats?: VendorRatingSummary;
  /** Browsing the Baina Box lens (chip or "baina" search) — a brand with a
   *  Baina Box storefront then links there instead of to its caterer page. */
  bainaMode?: boolean;
  /** The lens being browsed. The card then advertises that one thing — the
   *  other categories and tier bands a vendor serves are irrelevant to this
   *  search and would only muddy the result. */
  lens: LensId;
}) {
  const { t } = useLang();
  const { has, toggle, isFull } = useCompare();
  const inCompare = has(vendor.id);
  const compareDisabled = !inCompare && isFull;
  const cityId = cities.find((c) => c.name === vendor.city)?.id;

  const bainaVendorData = bainaMode
    ? getBainaBoxVendorByVendorId(vendor.id)
    : undefined;
  const vendorHref = bainaVendorData
    ? `/baina-box/${bainaVendorData.slug}`
    : `/vendors/${vendor.id}`;

  // "Book" from a brand card starts the appropriate booking flow:
  // - Baina Box vendors stay in Baina order panel (/baina-box/<slug>#baina-order or /vendors/<id>#baina-order)
  // - Live Counter specialists go to dedicated Live Stall flow (/book/live-stall?vendor=<id>)
  // - Single Stall / caterers go to Single Stall wizard (/book/stall?vendor=<id>)
  const isLiveStall = lens === "live-stall" || inCategory("live-stall")(vendor) || inCategory("live-counters")(vendor);
  const bookHref = bainaVendorData
    ? `/baina-box/${bainaVendorData.slug}#baina-order`
    : bainaMode
      ? `/vendors/${vendor.id}#baina-order`
      : isLiveStall
        ? `/book/live-stall?vendor=${encodeURIComponent(vendor.id)}${
            cityId ? `&city=${cityId}` : ""
          }`
        : `/book/stall?vendor=${encodeURIComponent(vendor.id)}${
            cityId ? `&city=${cityId}` : ""
          }`;

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

  // Exactly one tag rides on the photo, and the lens decides which. A tier lens
  // pins it to the searched band (a Gold search never shows Silver, even on a
  // caterer who serves both); a category or add-ons lens names that offering
  // instead. Browsing with no lens falls back to the caterer's leading band.
  const lensDef = lens ? LENS_BY_ID.get(lens) : undefined;
  const shownTier = isTierLens(lens)
    ? vendor.tiers.includes(lens)
      ? lens
      : undefined
    : lens
      ? undefined
      : vendor.tiers[0];
  const badge = shownTier
    ? { label: tierBadgeLabel(shownTier), className: tierBadgeClass(shownTier) }
    : lensDef
      ? {
          label: t(lensDef.label, lensDef.labelHi),
          className: "bg-white/95 text-maroon",
        }
      : undefined;

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
      case "Hi-tea":
        return t("Hi-tea", "हाई-टी");
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
              href={
                bainaVendorData ? vendorHref : `/vendors/${vendor.id}#reviews`
              }
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
          {badge && (
            <span
              className={
                "rounded px-1.5 py-0.5 text-[10px] font-semibold shadow-sm " +
                badge.className
              }
            >
              {badge.label}
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

        {/* Signature dishes — the vendor's four "famous for" tags. */}
        {vendor.featured && vendor.featured.length > 0 && (
          <ul
            className="mt-2 flex flex-wrap gap-1"
            aria-label={t("Signature dishes", "सिग्नेचर डिश")}
          >
            {vendor.featured.map((dish) => (
              <li
                key={dish}
                className="max-w-full truncate rounded-full border border-maroon/15 bg-cream px-2 py-0.5 text-[10px] font-semibold text-maroon"
              >
                {dish}
              </li>
            ))}
          </ul>
        )}

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
              href={vendorHref}
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
        href={vendorHref}
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
