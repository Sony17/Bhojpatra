"use client";

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import Image from "next/image";
import { photoNeedsUnoptimized, stallCoverPhoto } from "@/lib/photoLinks";
import { isUnoptimized } from "@/lib/homeContentData";
import type { StallTileImages } from "@/lib/stallTileImages";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useHideMobileFooter } from "@/lib/mobileChrome";
import {
  bookingTimeSlots,
  cateringCategoryIds,
  cities,
  formatClockTime,
  listingCateringCategories,
  listingOfferings,
  mealPeriodForTime,
  mealTypeOptions,
  type DietType,
  type VendorListing,
} from "@/lib/data";
import {
  useVendorRatings,
  storefrontStat,
  type VendorRatingSummary,
} from "@/lib/vendorRatings";
import { useCompare } from "@/lib/compare";
import { useAllVendorsStatus } from "@/lib/useAllVendors";
import { ctaLabel, listingCta, type StallDishesBrief } from "@/lib/vendorStorefront";
import { stallTypeById, stallTypes, toStallTypeId } from "@/lib/stallTypes";
import { useLang } from "@/lib/i18n";
import {
  useDayAvailability,
  useStallAvailabilityGate,
} from "@/components/booking/VendorAvailability";
import type { Unavailable } from "@/lib/vendorAvailability";
import { formatEventDate } from "@/lib/bookingPricing";
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
  DietMark,
  Drawer,
  EmptyState,
  PullToRefresh,
  SkeletonList,
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

/** Single Stall bands — a stall plate runs ₹50–₹300, so the feast bands above
 *  would put every stall in "Under ₹1,000". Same ids, stall-sized ranges. */
const STALL_PRICE_RANGES: { value: PriceRange; min: number; max: number }[] = [
  { value: "all", min: 0, max: Infinity },
  { value: "budget", min: 0, max: 99 },
  { value: "premium", min: 100, max: 200 },
  { value: "luxury", min: 201, max: Infinity },
];

/** The per-plate price a card shows: a bookable stall's own rate, else the
 *  listing's indicative price. Price filters and sorts both go by it. */
const shownPrice = (v: VendorListing) => v.stall?.fromPerPlate ?? v.priceFrom;

const matchesPrice = (
  vendor: VendorListing,
  range: PriceRange,
  bands: typeof PRICE_RANGES,
): boolean => {
  const band = bands.find((r) => r.value === range);
  if (!band) return true;
  const p = shownPrice(vendor);
  return p >= band.min && p <= band.max;
};

/** Guest counts offered by the Single Stall "Guests" filter. */
const GUEST_OPTIONS = [25, 50, 100, 200, 500];
/** "Short notice" = the stall can be booked within a day. */
const SHORT_NOTICE_HOURS = 24;
/** "Top rated" floor. */
const MIN_TOP_RATING = 4;

/** The individual filter controls the catalog offers beyond the always-on
 *  city / state / search. */
type FilterKey =
  | "cuisine"
  | "tier"
  | "diet"
  | "price"
  | "meals"
  | "time"
  | "rating"
  | "guests"
  | "notice";

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
  // The stall type and city are already picked, so cuisine / meal-slot
  // filters only repeat them; a stall is chosen by price, rating, whether it
  // fits the guest count and how soon it can be booked.
  "single-stall": new Set(["diet", "price", "rating", "guests", "notice"]),
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
  { id: "addons", label: "Extras", labelHi: "एक्स्ट्रा", icon: "➕", match: (v) => listingOfferings(v).length > 0 },
  { id: "essential", label: "Service Package", labelHi: "सर्विस पैकेज", icon: "🍽️", match: inCategory("essential") },
];

const LENS_BY_ID = new Map<string, Lens>(LENSES.map((l) => [l.id, l]));

export default function VendorCatalog({
  tileImages = {},
}: {
  /** Admin-set stall-tile photos, keyed by stall type id. */
  tileImages?: StallTileImages;
} = {}) {
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
    if (category === "single-stall")
      switch (value) {
        case "budget":
          return t("Under ₹100", "₹100 से कम");
        case "premium":
          return t("₹100 – ₹200", "₹100 – ₹200");
        case "luxury":
          return t("₹200+", "₹200+");
      }
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
  // Listings carry the city's display name ("Lucknow"); links from the booking
  // flows carry its id ("lucknow"). Accept either, so a hand-off never lands on
  // an empty "0 caterers in lucknow".
  const [city, setCity] = useState<string>(() => {
    const raw = searchParams.get("city")?.trim();
    if (!raw) return ALL;
    const known = cities.find(
      (c) => c.id === raw.toLowerCase() || c.name.toLowerCase() === raw.toLowerCase(),
    );
    return known ? known.name : raw;
  });
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
  // One specific counter, handed over by the stall-type grid at /book/stall
  // ("show me the chaat stalls"). Narrower than the Add-ons lens, which only
  // asks whether a caterer runs any counter at all. Clearable like any chip.
  const [counter, setCounter] = useState<string>(() =>
    toStallTypeId(searchParams.get("counter") ?? ""),
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
  // Single Stall refinements: rated 4★+, fits a guest count (stall's minimum
  // order ≤ guests; 0 = any) and bookable within a day.
  const [topRated, setTopRated] = useState<boolean>(
    () => searchParams.get("rating") === String(MIN_TOP_RATING),
  );
  const [guests, setGuests] = useState<number>(() => {
    const g = Number(searchParams.get("guests"));
    return Number.isFinite(g) && g > 0 ? g : 0;
  });
  const [shortNotice, setShortNotice] = useState<boolean>(
    () => searchParams.get("notice") === "1",
  );
  // Stalls whose vendor takes same-day orders (Vendor Portal → Calendar).
  const [sameDayOnly, setSameDayOnly] = useState<boolean>(
    () => searchParams.get("notice") === "0",
  );
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
  // Arriving from the Single Stall picker (/book/stall → a stall-type tile),
  // the guest has already chosen the category, stall type and city. Fold the
  // category row, search and filter chips into one summary line; its funnel
  // opens the Filters sheet straight away and "Change" goes back to the
  // picker. Decided once from the landing URL.
  const [fromStallPicker] = useState<boolean>(
    () =>
      searchParams.get("category") === "single-stall" &&
      toStallTypeId(searchParams.get("counter") ?? "") !== "",
  );
  const router = useRouter();
  // "Change" swaps the stall type in place, from a sheet of the types that
  // have stalls in this city; the URL follows so a reload / share keeps it.
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);
  const pickStallType = (id: string) => {
    setCounter(id);
    setTypeSheetOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("counter", id);
    router.replace(`/vendors?${params.toString()}`, { scroll: false });
    window.scrollTo({ top: 0 });
  };

  // Real customer ratings, matched to these listings by name (best-effort).
  const ratings = useVendorRatings();

  // When caterers are ticked for comparison, a sticky tray covers the page
  // bottom — pad the section so the last row of cards clears it.
  const { count: compareCount } = useCompare();

  // Curated static listings + live dashboard-published vendors.
  const [refreshToken, setRefreshToken] = useState(0);
  const { vendors: allVendors, loaded: vendorsLoaded } =
    useAllVendorsStatus(refreshToken);
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
  const stallMode = category === "single-stall" && !bainaMode;
  // The Single Stall view is part of the stall flow — no phone footer.
  useHideMobileFooter(stallMode);
  // Landed from the stall picker and still on that stall type: category,
  // stall type and city are settled, so search, the lens row and the city /
  // state pickers step aside and "Clear" only clears the refinements.
  const stallView = fromStallPicker && stallMode && counter !== "";
  // Stall types with at least one bookable stall in the current city, for the
  // "Change" sheet — the same match the grid applies for a counter.
  const stallTypeOptions = useMemo(() => {
    if (!fromStallPicker) return [];
    const stalls = allVendors.filter(
      (v) =>
        listingCateringCategories(v).includes("single-stall") &&
        (city === ALL || v.city === city),
    );
    return stallTypes
      .map((s) => ({
        type: s,
        count: stalls.filter((v) =>
          (v.stall?.stallTypes ?? listingOfferings(v).map(toStallTypeId)).includes(s.id),
        ).length,
      }))
      .filter((o) => o.count > 0);
  }, [fromStallPicker, allVendors, city]);
  const priceRanges = stallMode ? STALL_PRICE_RANGES : PRICE_RANGES;

  /** Diets of the stall a listing would sell under the current lens — the
   *  picked stall type's dishes, else every stall type's. Empty when the
   *  listing has no bookable stall menu to judge by. */
  const stallDiets = useCallback(
    (v: VendorListing): DietType[] => {
      const byType = v.stall?.dietsByType;
      if (!byType) return [];
      return counter ? (byType[counter] ?? []) : [...new Set(Object.values(byType).flat())];
    },
    [counter],
  );
  /** The dishes a listing's stall card shows under the current lens — the
   *  picked stall type's, else every stall type's. */
  const stallMenu = useCallback(
    (v: VendorListing): StallDishesBrief | undefined => {
      const byType = v.stall?.dishesByType;
      if (!byType) return undefined;
      if (counter) return byType[counter];
      const all = Object.values(byType);
      return all.length
        ? { dishes: all.flatMap((m) => m.dishes), total: all.reduce((n, m) => n + m.total, 0) }
        : undefined;
    },
    [counter],
  );
  // Veg / Non-veg stays in the filters on every stall type — guests look
  // for it first, even where every stall on offer is veg.
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

  /** The rating a card's chip shows, picked exactly like `VendorCard` does:
   *  Bhojpatra reviews when there are any, else the Google rating; 0 for a
   *  "New" / "Sample" card with neither. */
  const ratingOf = useCallback(
    (v: VendorListing) => {
      const stats = storefrontStat(ratings, v);
      if (stats || (v.reviews > 0 && !v.sample)) return stats?.rating ?? v.rating;
      return v.googleRating ?? 0;
    },
    [ratings],
  );

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

  // The header's location picker drives the city. A `?city=` link wins on
  // landing, but a later change in the header still applies — the stall view
  // has no city control of its own.
  useEffect(() => {
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

    if (!searchParams.get("city")) applyStored(readStoredLocation());

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

      // The stall-type lens: this exact counter. A bookable stall must have a
      // menu for it (a "Pan Counter" ticked as an add-on, with no pan menu,
      // would book into an empty stall); anyone else by declared offering.
      const matchesCounter =
        counter === "" ||
        (v.stall?.stallTypes ?? listingOfferings(v).map(toStallTypeId)).includes(counter);

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

      // In a stall lens the veg / non-veg choice judges the stall's own dishes;
      // a listing with no stall menu falls back to the caterer's diet.
      const dietOk = () => {
        if (!visibleFilters.has("diet") || diet === ALL) return true;
        const diets = stallMode ? stallDiets(v) : [];
        if (diets.length === 0) return matchesDiet(v, diet);
        return diets.includes(diet === "Veg" ? "veg" : "non-veg");
      };

      return (
        matchesQuery &&
        matchesCategory &&
        matchesAddOns &&
        matchesCounter &&
        (city === ALL || v.city === city) &&
        (state === ALL || v.state === state) &&
        (!visibleFilters.has("cuisine") || cuisine === ALL || v.cuisines.includes(cuisine)) &&
        dietOk() &&
        (!visibleFilters.has("tier") || tier === ALL || v.tiers.includes(tier)) &&
        (!visibleFilters.has("price") || matchesPrice(v, price, priceRanges)) &&
        (!visibleFilters.has("rating") || !topRated || ratingOf(v) >= MIN_TOP_RATING) &&
        (!visibleFilters.has("guests") ||
          guests === 0 ||
          (v.stall?.minGuests ?? 0) <= guests) &&
        (!visibleFilters.has("notice") ||
          !shortNotice ||
          (v.stall?.leadHours ?? 0) <= SHORT_NOTICE_HOURS) &&
        (!visibleFilters.has("notice") || !sameDayOnly || v.stall?.leadHours === 0) &&
        matchesMeals &&
        matchesServingTime
      );
    });

    const sorted = [...filtered];
    switch (sort) {
      case "price-asc":
        sorted.sort((a, b) => shownPrice(a) - shownPrice(b));
        break;
      case "price-desc":
        sorted.sort((a, b) => shownPrice(b) - shownPrice(a));
        break;
      case "rating":
        sorted.sort((a, b) => ratingOf(b) - ratingOf(a));
        break;
      default:
        // Relevance: verified & higher-tier first, then rating, then reviews.
        // A multi-tier vendor is ranked by its highest band.
        sorted.sort((a, b) => {
          const tierRank = { Platinum: 3, Gold: 2, Silver: 1 } as const;
          const topTier = (v: VendorListing) =>
            Math.max(...v.tiers.map((t) => tierRank[t]));
          const score = (v: VendorListing) =>
            (v.verified && !v.sample ? 1000 : 0) +
            topTier(v) * 100 +
            v.rating * 10 +
            v.reviews / 1000;
          return score(b) - score(a);
        });
        break;
    }
    // Real, approved vendors always lead; curated sample listings follow
    // (stable sort keeps the chosen order within each group).
    sorted.sort((a, b) => Number(Boolean(a.sample)) - Number(Boolean(b.sample)));
    return sorted;
  }, [
    allVendors,
    query,
    bainaMode,
    category,
    addOnsOnly,
    counter,
    visibleFilters,
    city,
    state,
    cuisine,
    diet,
    tier,
    price,
    priceRanges,
    stallMode,
    stallDiets,
    ratingOf,
    topRated,
    guests,
    shortNotice,
    sameDayOnly,
    meals,
    servingTime,
    sort,
  ]);

  // The guest's event date against each stall's calendar — a fully booked
  // or switched-off vendor says so on their card.
  const dayAvailability = useDayAvailability(
    results.flatMap((v) => (v.stall ? [v.stall.stallId] : [])),
  );

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

  const hasActiveFilters = stallView
    ? stallRefinementsActive()
    : query !== "" ||
    category !== "" ||
    addOnsOnly ||
    counter !== "" ||
    city !== ALL ||
    state !== ALL ||
    cuisine !== ALL ||
    diet !== ALL ||
    tier !== ALL ||
    price !== ALL ||
    meals.length > 0 ||
    servingTime !== "" ||
    topRated ||
    guests > 0 ||
    shortNotice ||
    sameDayOnly;

  /** Count of sheet filters (excludes search) — drives the Filters chip badge.
   *  Only counts controls the current category lens shows; hidden filters are
   *  neutralised, so they'd inflate the badge without affecting results. */
  const activeFilterCount = [
    !stallMode && city !== ALL,
    !stallMode && state !== ALL,
    showFilter("cuisine") && cuisine !== ALL,
    showFilter("diet") && diet !== ALL,
    showFilter("tier") && tier !== ALL,
    showFilter("price") && price !== ALL,
    showFilter("meals") && meals.length > 0,
    showFilter("time") && servingTime !== "",
    showFilter("rating") && topRated,
    showFilter("guests") && guests > 0,
    showFilter("notice") && shortNotice,
    showFilter("notice") && sameDayOnly,
  ].filter(Boolean).length;

  /** Whether anything the stall view's Clear would undo is set. */
  function stallRefinementsActive() {
    return (
      sort !== "relevance" ||
      diet !== ALL ||
      price !== ALL ||
      topRated ||
      guests > 0 ||
      shortNotice ||
      sameDayOnly
    );
  }

  const resetFilters = () => {
    // The stall view keeps what the picker settled (category, stall type,
    // city) and clears only the refinements on top of it.
    if (!stallView) {
      setQuery("");
      setCategory("");
      setAddOnsOnly(false);
      setCounter("");
      setCity(ALL);
      setState(ALL);
    }
    setCuisine(ALL);
    setDiet(ALL);
    setTier(ALL);
    setPrice(ALL);
    setMeals([]);
    setServingTime("");
    setTopRated(false);
    setGuests(0);
    setShortNotice(false);
    setSameDayOnly(false);
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
      {/* From the stall picker the guest already knows what they want — on
          phones the promo and the generic heading give way to the results. */}
      <div className={"mb-6 mt-2 " + (fromStallPicker ? "hidden sm:block" : "")}>
        <BainaBoxSpecial variant="search" />
      </div>

      <div className={"max-w-xl px-1 " + (fromStallPicker ? "hidden sm:block" : "")}>
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
              {t("Choose your favourite caterer", "अपना पसंदीदा कैटरर चुनें")}
            </h1>
            <p className="mt-2 text-body text-ink/55">
              {t(
                "Search, compare and book trusted caterers near you.",
                "अपने आस-पास के भरोसेमंद कैटरर खोजें, तुलना करें और बुक करें।",
              )}
            </p>
          </>
        )}
      </div>

      {/* Every way Bhojpatra sells, written out up front — categories, tier
          bands and add-ons in one row. Pick one to focus the grid, trim the
          filters to what that offering needs, and pin every card to that tag. */}
      {fromStallPicker && counter !== "" ? (
        <div className="app-sticky-chrome -mx-4 mt-3 px-4 py-2 sm:-mx-5 sm:px-5">
          <div className="mx-auto flex max-w-7xl items-center gap-3 rounded-2xl border border-cream bg-white px-3 py-2 shadow-soft">
            <span
              className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-cream-2 text-base"
              aria-hidden="true"
            >
              {/* The tile's own photo when the admin set one, else its icon. */}
              {tileImages[counter] ? (
                <Image
                  src={tileImages[counter]}
                  alt=""
                  fill
                  sizes="36px"
                  unoptimized={isUnoptimized(tileImages[counter])}
                  className="object-cover"
                />
              ) : (
                stallTypeById(counter)?.icon
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="eyebrow block whitespace-nowrap text-[9px] font-bold text-maroon sm:text-[10px]">
                {t("Single Stall", "सिंगल स्टॉल")}
              </span>
              <span className="block text-[12px] font-semibold leading-tight text-ink sm:text-[13px]">
                {[
                  (lang === "hi"
                    ? stallTypeById(counter)?.nameHi
                    : stallTypeById(counter)?.name) ?? counter,
                  city !== ALL ? city : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-haspopup="dialog"
              aria-label={t("Filters", "फ़िल्टर")}
              className={
                "relative grid h-8 w-8 shrink-0 place-items-center rounded-full border text-maroon transition hover:bg-cream-2 active:scale-95 " +
                (activeFilterCount > 0 || sort !== "relevance"
                  ? "border-maroon bg-cream"
                  : "border-cream")
              }
            >
              <FilterGlyph />
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-maroon px-1 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTypeSheetOpen(true)}
              aria-haspopup="dialog"
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-maroon px-2.5 py-1.5 text-xs font-semibold text-maroon transition hover:bg-cream-2 active:scale-95 sm:px-3"
            >
              {t("Change", "बदलें")}
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
      <>
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
              aria-label={t("Search caterers", "कैटरर खोजें")}
              placeholder={t(
                "Search caterers, stalls or cuisines",
                "कैटरर, स्टॉल या व्यंजन खोजें",
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

              {/* The stall type carried over from /book/stall — clearable, so a
                  guest can widen back out to every stall without going back. */}
              {counter !== "" && (
                <CategoryChip
                  id="vendor-counter-chip"
                  selected
                  onClick={() => setCounter("")}
                  leftIcon={
                    <span aria-hidden="true">{stallTypeById(counter)?.icon}</span>
                  }
                >
                  {(lang === "hi"
                    ? stallTypeById(counter)?.nameHi
                    : stallTypeById(counter)?.name) ?? counter}{" "}
                  ✕
                </CategoryChip>
              )}

              {stallMode ? (
                <ThemedSelect
                  id="vendor-sort-select"
                  value={sort}
                  onChange={(v) => setSort(v as SortKey)}
                  ariaLabel={t("Sort", "क्रम")}
                  className="w-auto max-w-[11rem] shrink-0"
                  buttonClassName={selectChipClass(sort !== "relevance")}
                  options={[
                    { value: "relevance", label: t("Sort: Recommended", "क्रम: सुझाए गए") },
                    { value: "price-asc", label: t("Price: Low to High", "कीमत: कम से ज्यादा") },
                    { value: "price-desc", label: t("Price: High to Low", "कीमत: ज्यादा से कम") },
                    { value: "rating", label: t("Top rated", "सबसे अच्छी रेटिंग") },
                  ]}
                />
              ) : showFilter("price") && (
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

              {!stallMode && (
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
              )}

              {/* Stall price bands live in the Filters sheet — beside the Sort
                  select a second price chip only confused. */}
              {showFilter("price") && !stallMode && (
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
                1: "lg:grid-cols-4",
                2: "lg:grid-cols-2",
                3: "lg:grid-cols-3",
                4: "lg:grid-cols-4",
                5: "lg:grid-cols-5",
              }[
                (stallMode ? 0 : 2) +
                  (showFilter("cuisine") ? 1 : 0) +
                  (showFilter("tier") ? 1 : 0) +
                  (showFilter("price") ? 1 : 0)
              ] ?? "lg:grid-cols-5")
            }
          >
            {!stallMode && (
            <>
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
            </>
            )}
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
                label={t("Package", "पैकेज")}
                value={tier}
                onChange={(v) => setTier(v as TierFilter)}
                options={TIER_OPTIONS.map((tv) => ({
                  value: tv,
                  label: tv === ALL ? t("All packages", "सभी पैकेज") : tierLabel(tv),
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
                options={priceRanges.map((r) => ({
                  value: r.value,
                  label: priceLabel(r.value),
                }))}
              />
            )}
          </div>
        </div>
      </div>

      </>
      )}

      {/* Mobile filter sheet */}
      {/* Stall-type switcher — opened by "Change" in the stall view. */}
      <Drawer
        open={typeSheetOpen}
        onClose={() => setTypeSheetOpen(false)}
        title={t("Change stall type", "स्टॉल का प्रकार बदलें")}
      >
        <ul className="grid grid-cols-3 gap-2.5">
          {stallTypeOptions.map(({ type, count }) => {
            const on = type.id === counter;
            const img = tileImages[type.id];
            return (
              <li key={type.id}>
                <button
                  type="button"
                  onClick={() => pickStallType(type.id)}
                  aria-pressed={on}
                  className={
                    "w-full overflow-hidden rounded-xl border bg-white text-left transition active:scale-[0.98] " +
                    (on ? "border-maroon ring-1 ring-maroon" : "border-cream hover:border-maroon")
                  }
                >
                  <span className="relative block aspect-[4/3] w-full bg-cream-2">
                    {img ? (
                      <Image
                        src={img}
                        alt=""
                        fill
                        sizes="33vw"
                        unoptimized={isUnoptimized(img)}
                        className="object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-3xl" aria-hidden="true">
                        {type.icon}
                      </span>
                    )}
                  </span>
                  <span className="block px-2 py-1.5">
                    <span
                      className={
                        "block truncate text-[12px] font-semibold leading-tight " +
                        (on ? "text-maroon" : "text-ink")
                      }
                    >
                      {lang === "hi" ? type.nameHi : type.name}
                    </span>
                    <span className="block text-[10.5px] text-ink/55">
                      {t(
                        `${count} ${count === 1 ? "caterer" : "caterers"}`,
                        `${count} कैटरर`,
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => {
            setTypeSheetOpen(false);
            // Always a fresh trip to the categories page — a history step
            // could land on an earlier catalog view instead.
            router.push(`/book/stall?pick=1&counter=${encodeURIComponent(counter)}`);
          }}
          className="mt-4 w-full text-center text-[13px] font-semibold text-maroon underline underline-offset-2"
        >
          {t("See all stall types", "सभी स्टॉल प्रकार देखें")}
        </button>
      </Drawer>

      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t("Filters", "फ़िल्टर")}
      >
        <div className="space-y-5">
          {/* The stall view has no chip row — its sort lives in the sheet. */}
          {stallView && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                {t("Sort by", "क्रम")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["relevance", t("Recommended", "सुझाए गए")],
                    ["price-asc", t("Price: Low to High", "कीमत: कम से ज्यादा")],
                    ["price-desc", t("Price: High to Low", "कीमत: ज्यादा से कम")],
                    ["rating", t("Top rated", "सबसे अच्छी रेटिंग")],
                  ] as [SortKey, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSort(value)}
                    aria-pressed={sort === value}
                    className={chipClass(sort === value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!stallMode && (
          <>
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
          </>
          )}
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
              label={t("Package", "पैकेज")}
              value={tier}
              onChange={(v) => setTier(v as TierFilter)}
              options={TIER_OPTIONS.map((tv) => ({
                value: tv,
                label: tv === ALL ? t("All packages", "सभी पैकेज") : tierLabel(tv),
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
              options={priceRanges.map((r) => ({
                value: r.value,
                label: priceLabel(r.value),
              }))}
            />
          )}

          {showFilter("diet") && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                {t("Veg or non-veg", "वेज या नॉन-वेज")}
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
          {showFilter("rating") && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                {t("Rating", "रेटिंग")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTopRated((v) => !v)}
                  aria-pressed={topRated}
                  className={chipClass(topRated)}
                >
                  {t(`${MIN_TOP_RATING}★ & above`, `${MIN_TOP_RATING}★ और ऊपर`)}
                </button>
              </div>
            </div>
          )}
          {showFilter("guests") && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                {t("Guests", "मेहमान")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {GUEST_OPTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGuests((prev) => (prev === g ? 0 : g))}
                    aria-pressed={guests === g}
                    className={chipClass(guests === g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[12px] text-ink/55">
                {t(
                  "Hides stalls whose minimum order is above this.",
                  "जिन स्टॉल का न्यूनतम ऑर्डर इससे ज़्यादा है, वे छिप जाएँगे।",
                )}
              </p>
            </div>
          )}
          {showFilter("notice") && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                {t("Booking notice", "बुकिंग सूचना")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShortNotice((v) => !v)}
                  aria-pressed={shortNotice}
                  className={chipClass(shortNotice)}
                >
                  {t("Can serve within 24 hrs", "24 घंटे में सेवा")}
                </button>
                <button
                  type="button"
                  onClick={() => setSameDayOnly((v) => !v)}
                  aria-pressed={sameDayOnly}
                  className={chipClass(sameDayOnly)}
                >
                  {t("Same-day orders", "उसी दिन ऑर्डर")}
                </button>
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

      {/* Results summary — hidden until the roster is in, so it never reads
          "0 caterers" while still loading. */}
      <div
        className={
          "mt-3 flex flex-wrap items-center justify-between gap-2 px-1" +
          (vendorsLoaded ? "" : " invisible")
        }
      >
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

      {/* Vendor grid — denser app spacing. Normally seeded from the server
          (VendorsSeed); if it ever has to wait, show skeletons — never a
          premature "No caterers found". */}
      {!vendorsLoaded ? (
        <div className="mt-3">
          <SkeletonList count={4} />
        </div>
      ) : results.length > 0 ? (
        <ul
          className={
            "grid " +
            (stallMode
              ? "mt-3 grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
              : "sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 " +
                (fromStallPicker ? "mt-2 grid-cols-2 gap-2 sm:mt-3" : "mt-3 grid-cols-1 gap-3"))
          }
        >
          {results.map((vendor) => (
            <VendorCard
              dayDate={dayAvailability.date}
              dayStatus={
                vendor.stall ? dayAvailability.unavailable[vendor.stall.stallId] : undefined
              }
              key={vendor.id}
              vendor={vendor}
              stats={storefrontStat(ratings, vendor)}
              // Whether the card sends the visitor into the Baina Box flow —
              // the lens, not the search text, so the "Baina Box" chip routes
              // exactly like typing "baina" does.
              bainaMode={bainaMode}
              // Browsing a lens pins every card to it: a Gold search never
              // shows a Silver tag, and a Single Stall search never shows a
              // Baina Box one — even on a caterer who is genuinely all three.
              lens={lens}
              // Carried into the wizard so backing out of a stall returns to
              // the stall type the guest was browsing, not a blank grid.
              counter={counter}
              stallDiets={stallMode ? stallDiets(vendor) : undefined}
              stallMenu={stallMode ? stallMenu(vendor) : undefined}
              leadDiet={diet === "Non-Veg" ? "non-veg" : diet === "Veg" ? "veg" : undefined}
              tileImages={tileImages}
              compact={fromStallPicker}
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          className="mt-4"
          title={t("No caterers found", "कोई कैटरर नहीं मिला")}
          message={t(
            "Try a different search, or clear a filter or two.",
            "कोई और खोज आज़माएँ, या एक-दो फ़िल्टर हटा दें।",
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

function InfoGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 11v6M12 7.5v.01" />
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
  counter = "",
  stallDiets,
  stallMenu,
  leadDiet,
  tileImages,
  compact = false,
  dayDate = "",
  dayStatus,
}: {
  /** The guest's event date, when they've given one. */
  dayDate?: string;
  /** Why the stall can't take `dayDate` (fully booked, day off, a meal
   *  taken) — absent when it can. */
  dayStatus?: Unavailable;
  /** Phones: a half-width card for the two-column stall-picker grid — short
   *  photo, name + cuisine + price, one Book button (the card itself opens
   *  the caterer). Tablet / desktop render the full card. */
  compact?: boolean;
  vendor: VendorListing;
  stats?: VendorRatingSummary;
  /** The stall type the catalog is filtered to, passed on to the wizard. */
  counter?: string;
  /** In a stall lens, the diets of the stall's own dishes — the card's diet
   *  tag follows these over the caterer's overall diet (a mixed caterer's
   *  chaat stall is still pure veg). */
  stallDiets?: DietType[];
  /** In a stall lens, the stall's dishes — the card then renders as the
   *  photo-led stall card with a veg / non-veg dish strip. */
  stallMenu?: StallDishesBrief;
  /** The diet the guest filtered to; its dishes lead the strip. */
  leadDiet?: DietType;
  /** Admin stall-type photos — a stall card's fallback image. */
  tileImages?: StallTileImages;
  /** Browsing the Baina Box lens (chip or "baina" search) — "Order" then
   *  lands on the vendor's Baina Box panel instead of the stall wizard. */
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

  const vendorHref = `/vendors/${vendor.id}`;

  // "Book" from a brand card starts a Single Stall order with this vendor
  // pre-selected (still changeable in that wizard). Live vendors resolve by id;
  // a curated seed id absent from the booking menu falls back to the stall picker.
  // The vendor's city is NOT passed along: the guest's event city is theirs to
  // set (the wizard keeps the one they chose, and only falls back to the
  // vendor's when it has none), and a `?city=` that only knew the static city
  // list used to drop live vendors from newer cities out of the roster.
  // Boxes are ordered per box, not per plate, so a Baina Box brand goes to its
  // own order panel instead — the flow that actually sells what the lens shows.
  // A vendor's boxes are ordered from the panel on their profile (the anchor
  // is simply absent, landing them on the profile, if they declared the
  // category but published no boxes).
  //
  // The CTA is gated on what the vendor can actually be booked for: a Single
  // Stall only when the booking roster has their stall (curated samples are
  // bridged to it by brand name, like the wizard does), and the price beside
  // it is that stall's own per-plate rate — the number the wizard charges, not
  // the card's indicative feast price. The vendor's city now rides along: the
  // wizard keeps a `?vendor=` pick in its roster whatever the event city.
  // Everything else routes to the flow that sells it, or an enquiry.
  const cta = listingCta(vendor, {
    counter,
    bainaHref: bainaMode ? `/vendors/${vendor.id}#baina-order` : undefined,
  });
  const bookHref = cta.href;
  // Picking a stall checks the vendor's calendar against the date already in
  // the guest's brief — a taken day opens "check availability" instead.
  const gate = useStallAvailabilityGate();
  const onBook =
    cta.kind === "stall"
      ? (e: MouseEvent<HTMLElement>) =>
          gate.onSelect(e, { vendorId: vendor.id, vendorName: vendor.name, href: bookHref })
      : undefined;
  const ctaText = ctaLabel(cta.kind, t);
  // Same-day stalls are tagged, and a stall that can't take the guest's date
  // says so before they tap in.
  const when = dayDate ? formatEventDate(dayDate) : "";
  const dayNote =
    cta.kind !== "stall" || !dayStatus || !when
      ? null
      : dayStatus === "day"
        ? t(`Already booked · ${when}`, `पहले से बुक · ${when}`)
        : dayStatus === "blocked"
          ? t(`Not available · ${when}`, `उपलब्ध नहीं · ${when}`)
          : t(`Some meals booked on ${when}`, `${when} को कुछ भोजन बुक`);
  const sameDay = cta.kind === "stall" && vendor.stall?.leadHours === 0;
  // Can't take the guest's date at all — the card fades to grey (the status
  // pill keeps its colour) and drops the same-day highlight.
  const dayClosed = Boolean(dayNote) && dayStatus !== "slot";
  const cardState = dayClosed
    ? " opacity-75 [&_img]:grayscale"
    : sameDay
      ? " same-day-ring"
      : "";
  const stallStatus =
    dayNote || sameDay ? (
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {sameDay && (
          <span className="rounded-full bg-cream px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
            {t("Same-day orders", "उसी दिन ऑर्डर")}
          </span>
        )}
        {dayNote && (
          <span
            className={
              "rounded-full px-1.5 py-0.5 text-[10px] font-bold " +
              // Booked (red) vs the vendor not taking orders (black) vs only
              // some meals gone (red outline) — three different situations.
              (dayStatus === "day"
                ? "bg-maroon text-white"
                : dayStatus === "blocked"
                  ? "bg-ink text-cream"
                  : "border border-maroon/40 text-maroon")
            }
          >
            {dayNote}
          </span>
        )}
      </div>
    ) : null;
  // The price that sits next to the CTA — always the thing the CTA sells.
  const ctaPrice =
    cta.kind === "stall"
      ? (cta.price ?? (vendor.stall === undefined ? vendor.priceFrom : null))
      : cta.kind === "enquire" || cta.kind === "service"
        ? null
        : vendor.priceFrom;
  const ctaUnit =
    cta.kind === "baina" ? t("/ box", "/ बॉक्स") : t("/ plate", "/ प्लेट");
  const isSample = Boolean(vendor.sample);

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

  const shownDiet: VendorListing["diet"] =
    stallDiets && stallDiets.length > 0
      ? stallDiets.includes("non-veg")
        ? stallDiets.includes("veg")
          ? "Veg & Non-Veg"
          : "Non-Veg"
        : "Veg"
      : vendor.diet;

  const dietBadgeLabel = (value: VendorListing["diet"]): string => {
    switch (value) {
      case "Veg":
        return t("Pure Veg", "शुद्ध वेज");
      case "Non-Veg":
        return t("Non-Veg", "नॉन-वेज");
      case "Veg & Non-Veg":
        return t("Veg + Non-Veg", "वेज + नॉन-वेज");
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

  // Stall lens: a square, food-app card (Swiggy / Zomato). Rating and the
  // veg / non-veg marks (the guest's filtered diet first) ride the top of the
  // photo, price and compare its foot; under it sits just the brand name —
  // the dishes themselves live on the booking menu.
  if (stallMenu && stallMenu.dishes.length > 0) {
    const servedDiets = (["veg", "non-veg"] as const).filter((diet) =>
      stallMenu.dishes.some((d) => d.diet === diet),
    );
    if (leadDiet === "non-veg") servedDiets.reverse();
    // The brand's own cover only. Never a dish photo (the card would repeat
    // the menu's first dish) or a stall-type tile (it would repeat the tile
    // the guest just tapped). No cover → the stall placeholder.
    const photo = stallCoverPhoto(vendor.image, tileImages);
    const rating =
      stats || (vendor.reviews > 0 && !isSample)
        ? (stats?.rating ?? vendor.rating).toFixed(1)
        : vendor.googleRating
          ? String(vendor.googleRating)
          : null;

    return (
      <li
        className={
          "group relative min-w-0 rounded-2xl border border-maroon/15 bg-white p-1.5 shadow-[0_4px_14px_-8px_rgba(0,0,0,0.25)] transition-shadow hover:shadow-[0_10px_24px_-10px_rgba(0,0,0,0.35)] sm:p-2" +
          cardState
        }
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-cream">
          <Image
            src={photo}
            unoptimized={photoNeedsUnoptimized(photo) || isUnoptimized(photo)}
            alt={vendor.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
          {/* Shade at the top for the rating / diet chips, at the foot for
              the price. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/45 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/35 to-transparent"
          />
          <div className="absolute inset-x-2 top-2 z-10 flex items-start justify-between gap-1.5">
            {rating ? (
              <Link
                href={`/vendors/${vendor.id}#reviews`}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-1.5 py-0.5 text-[11.5px] font-bold leading-none text-ink shadow-sm"
                aria-label={t(`Rated ${rating}`, `रेटिंग ${rating}`)}
              >
                <span
                  aria-hidden="true"
                  className="grid h-3.5 w-3.5 place-items-center rounded-full bg-maroon text-[8px] text-white"
                >
                  ★
                </span>
                {rating}
              </Link>
            ) : (
              <span className="shrink-0 rounded-full bg-white px-1.5 py-1 text-[9.5px] font-bold uppercase leading-none tracking-wide text-maroon shadow-sm">
                {isSample ? t("Sample", "नमूना") : t("New", "नया")}
              </span>
            )}
            {servedDiets.length > 0 && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-1 py-1 shadow-sm">
                {servedDiets.map((diet) => (
                  <DietMark
                    key={diet}
                    diet={diet}
                    className="h-3.5 w-3.5"
                    label={diet === "veg" ? t("Veg", "वेज") : t("Non-veg", "नॉन-वेज")}
                  />
                ))}
              </span>
            )}
          </div>
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
              "absolute bottom-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full shadow-sm ring-1 ring-white/40 backdrop-blur-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
              (inCompare ? "bg-maroon text-cream" : "bg-black/35 text-white hover:bg-white hover:text-maroon")
            }
          >
            <span aria-hidden="true" className="text-sm font-bold leading-none">
              {inCompare ? "✓" : "+"}
            </span>
          </button>
          <p className="absolute bottom-2 left-2.5 right-11 font-sans font-extrabold uppercase whitespace-nowrap leading-none tracking-tight text-white sm:bottom-2.5 sm:left-3">
            {ctaPrice != null ? (
              <>
                {cta.kind === "stall" && (
                  <span className="mb-1 block text-[10px] font-bold tracking-[0.12em] text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.85)]">
                    {t("Stall from", "स्टॉल")}
                  </span>
                )}
                <span className="text-[15px] min-[375px]:text-[17px] sm:text-[19px]">
                  ₹{ctaPrice.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] font-bold"> {ctaUnit}</span>
              </>
            ) : (
              <span className="text-[11px]">{t("On enquiry", "पूछताछ पर")}</span>
            )}
          </p>
        </div>

        {/* Just the brand name — everything else rides the photo. */}
        {/* The name wraps rather than truncates — on a 2-up phone grid the
            whole brand must read, not "Banarasi…". */}
        <div className="mt-2 flex items-start gap-1.5 px-1 pb-1">
          <h3 className="min-w-0 flex-1 break-words font-sans text-[13px] font-bold leading-[1.25] tracking-tight text-ink sm:text-[15.5px]">
            {vendor.name}
            {vendor.verified && !isSample && (
              <span
                aria-label={t("Verified", "वेरिफाइड")}
                title={t("Verified", "वेरिफाइड")}
                className="ml-1 inline-grid h-3.5 w-3.5 -translate-y-px place-items-center rounded-full bg-maroon align-middle text-[8px] text-white"
              >
                ✓
              </span>
            )}
          </h3>
          {/* The card itself books; the caterer's full profile sits behind
              this info button instead. */}
          <Link
            href={vendorHref}
            aria-label={t(`About ${vendor.name}`, `${vendor.name} के बारे में`)}
            title={t("Vendor info", "वेंडर जानकारी")}
            className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-maroon/30 bg-white text-maroon transition-colors hover:bg-maroon hover:text-cream"
          >
            <InfoGlyph />
          </Link>
        </div>
        {stallStatus && <div className="px-1 pb-1">{stallStatus}</div>}

        <Link
          href={bookHref}
          onClick={onBook}
          aria-label={`${ctaText} ${vendor.name}`}
          className="absolute inset-0 z-0 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon"
          tabIndex={-1}
        >
          <span className="sr-only">{`${ctaText} ${vendor.name}`}</span>
        </Link>
        {gate.sheet}
      </li>
    );
  }

  return (
    <Card
      as="li"
      interactive
      padding="none"
      className={
        "group relative overflow-hidden " +
        cardState.trim() + " " +
        // Compact phones: a fixed-height card split 70% photo / 30% text, the
        // Swiggy/Zomato shape — price, rating and Book ride on the photo.
        // The column is pinned to the card width: an implicit `auto` column
        // sizes to the nowrap cuisine line and pushed Book off the card.
        (compact
          ? "grid h-[13.5rem] grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)_4.25rem] rounded-[1.25rem] border-cream shadow-soft sm:flex sm:h-auto sm:flex-col sm:rounded-hero sm:border-maroon/6 sm:shadow-card"
          : "flex flex-col")
      }
    >
      {/* Image — Zomato-style media plane with rating chip on the photo */}
      <div
        className={
          "relative w-full overflow-hidden bg-cream sm:aspect-[16/10] " +
          (compact ? "min-h-0" : "aspect-[16/10]")
        }
      >
        <Image
          src={vendor.image} unoptimized={photoNeedsUnoptimized(vendor.image)}
          alt={vendor.name}
          fill
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
        <div
          aria-hidden
          className={
            "pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent sm:h-1/2 sm:from-black/55 sm:via-black/15 " +
            // Compact: near-solid under the price so text baked into a photo
            // (logos, banners) can't bleed through it.
            (compact
              ? "h-3/4 from-black/95 from-15% via-black/70 via-45% sm:from-0% sm:via-50%"
              : "h-1/2 from-black/55 via-black/15")
          }
        />

        {vendor.verified && !isSample && (
          <span
            className={
              (compact ? "hidden sm:inline-flex " : "inline-flex ") +
              "absolute left-2.5 top-2.5 items-center gap-1 rounded bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-maroon shadow-sm backdrop-blur-sm"
            }
          >
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
            "absolute z-10 flex items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:right-2.5 sm:top-2.5 sm:h-8 sm:w-8 " +
            (compact ? "right-2 top-2 h-7 w-7 ring-1 ring-white/40 " : "right-2.5 top-2.5 h-8 w-8 ") +
            (inCompare
              ? "bg-maroon text-cream"
              : compact
                ? "bg-black/35 text-white hover:text-cream sm:bg-white/95 sm:text-ink sm:ring-0"
                : "bg-white/95 text-ink hover:text-maroon")
          }
        >
          <span aria-hidden="true" className="text-sm font-bold leading-none">
            {inCompare ? "✓" : "+"}
          </span>
        </button>

        {/* Rating on image — Swiggy/Zomato signature chip */}
        <div
          className={
            "absolute z-10 flex items-center gap-1.5 sm:bottom-2.5 sm:left-2.5 sm:top-auto " +
            (compact ? "left-2 top-2" : "bottom-2.5 left-2.5")
          }
        >
          {stats || (vendor.reviews > 0 && !isSample) ? (
            <Link
              href={`/vendors/${vendor.id}#reviews`}
              className={
                "relative z-10 inline-flex items-center gap-0.5 font-bold shadow-sm " +
                (compact
                  ? "rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-white ring-1 ring-white/30 backdrop-blur-md sm:rounded sm:bg-maroon sm:px-1.5 sm:text-cream sm:ring-0"
                  : "rounded bg-maroon px-1.5 py-0.5 text-[11px] text-cream")
              }
              aria-label={t(
                `Rated ${stats?.rating ?? vendor.rating}`,
                `रेटिंग ${stats?.rating ?? vendor.rating}`,
              )}
            >
              {(stats?.rating ?? vendor.rating).toFixed(1)}
              <span aria-hidden="true" className={compact ? "text-cream" : ""}>★</span>
            </Link>
          ) : vendor.googleRating ? (
            <span
              className={
                "inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-bold shadow-sm " +
                (compact
                  ? "rounded-full bg-black/40 px-2 text-white ring-1 ring-white/30 backdrop-blur-md sm:rounded sm:bg-white/95 sm:px-1.5 sm:text-ink sm:ring-0"
                  : "rounded bg-white/95 text-ink")
              }
            >
              {vendor.googleRating}
              <span aria-hidden="true" className={compact ? "text-cream sm:text-maroon" : "text-maroon"}>
                ★
              </span>
            </span>
          ) : (
            <span className="rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-maroon shadow-sm">
              {isSample ? t("Sample", "नमूना") : t("New", "नया")}
            </span>
          )}
          {badge && (
            <span
              className={
                (compact ? "hidden sm:inline " : "") +
                "rounded px-1.5 py-0.5 text-[10px] font-semibold shadow-sm " +
                badge.className
              }
            >
              {badge.label}
            </span>
          )}
        </div>

        {/* Compact phones: the price on the photo's gradient, Swiggy-style, so
            the text strip below can give the brand name room to breathe. No
            Book button — tapping the card itself books. */}
        {compact && (
          <div className="absolute inset-x-2.5 bottom-2 z-10 sm:hidden">
            <p className="min-w-0 truncate font-sans font-bold leading-none text-white text-shadow-sm text-shadow-black/60">
              {ctaPrice != null ? (
                <>
                  {cta.kind === "stall" && (
                    <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-cream">
                      {t("Stall from", "स्टॉल")}
                    </span>
                  )}
                  <span className="text-[17px]">₹{ctaPrice.toLocaleString("en-IN")}</span>
                  <span className="text-[10px] font-semibold text-white"> {ctaUnit}</span>
                </>
              ) : (
                <span className="text-[11px] font-semibold">
                  {t("On enquiry", "पूछताछ पर")}
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Dense info block — app card body */}
      <div
        className={
          "flex flex-1 flex-col sm:justify-start sm:px-3.5 sm:pb-3.5 sm:pt-3 " +
          (compact ? "min-h-0 justify-center px-2.5 pb-2.5 pt-2" : "px-3.5 pb-3.5 pt-3")
        }
      >
        <div className={"flex items-start sm:gap-2 " + (compact ? "gap-1.5" : "gap-2")}>
          <div className="min-w-0 flex-1">
            <h3
              className={
                "font-sans font-bold tracking-tight text-ink sm:truncate sm:text-[15px] sm:leading-snug " +
                (compact
                  ? "break-words text-[13px] leading-[1.25]"
                  : "truncate text-[15px] leading-snug")
              }
            >
              {vendor.name}
              {compact && vendor.verified && !isSample && (
                <span
                  aria-label={t("Verified", "वेरिफाइड")}
                  title={t("Verified", "वेरिफाइड")}
                  className="ml-1 inline-grid h-3.5 w-3.5 translate-y-[1px] place-items-center rounded-full bg-maroon align-baseline text-[8px] text-white sm:hidden"
                >
                  ✓
                </span>
              )}
            </h3>
            <p
              className={
                "flex min-w-0 items-center gap-1.5 text-ink/55 sm:mt-0.5 sm:text-[12px] sm:leading-snug " +
                (compact ? "mt-0.5 text-[11px] leading-tight" : "mt-0.5 text-[12px] leading-snug")
              }
            >
              {/* Diet tag — spelled out, since a brand-colored square
                  can't borrow the familiar green/red veg marks. */}
              <span
                className={
                  "shrink-0 rounded-full border px-1.5 py-px text-[9.5px] font-bold uppercase leading-tight tracking-wide " +
                  (shownDiet === "Non-Veg"
                    ? "border-maroon bg-maroon text-white"
                    : shownDiet === "Veg"
                      ? "border-maroon/20 bg-cream text-maroon"
                      : "border-ink/20 bg-white text-ink")
                }
              >
                {dietBadgeLabel(shownDiet)}
              </span>
              <span className="min-w-0 leading-snug">
                {vendor.cuisines.slice(0, 3).join(" · ")}
                {vendor.cuisines.length > 3 ? "…" : ""}
              </span>
            </p>
            {stallStatus}
            <p
              className={
                "mt-0.5 truncate text-[12px] leading-snug text-ink/45 " +
                (compact ? "hidden sm:block" : "")
              }
            >
              {vendor.city}
              <span aria-hidden className="mx-1 text-ink/25">
                ·
              </span>
              {vendor.mealTypes.slice(0, 2).map(mealBadgeLabel).join(", ")}
            </p>
          </div>
          {/* The card itself books; the caterer's full profile sits behind
              this info button instead. */}
          <Link
            href={vendorHref}
            aria-label={t(`About ${vendor.name}`, `${vendor.name} के बारे में`)}
            title={t("Vendor info", "वेंडर जानकारी")}
            className={
              "relative z-10 flex shrink-0 items-center justify-center rounded-full text-maroon transition-colors hover:bg-maroon hover:text-cream sm:h-7 sm:w-7 sm:border sm:border-maroon/30 sm:bg-white " +
              (compact ? "h-6 w-6 bg-cream/50" : "h-7 w-7 border border-maroon/30 bg-white")
            }
          >
            <InfoGlyph />
          </Link>
        </div>

        {/* Signature dishes — the vendor's four "famous for" tags. */}
        {vendor.featured && vendor.featured.length > 0 && (
          <ul
            className={"mt-2 flex-wrap gap-1 " + (compact ? "hidden sm:flex" : "flex")}
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

        <div
          className={
            "items-center justify-between gap-2 border-t border-maroon/8 sm:mt-3 sm:flex sm:pt-2.5 " +
            (compact ? "hidden" : "mt-3 flex pt-2.5")
          }
        >
          <p
            className={
              "min-w-0 truncate font-sans font-semibold text-ink sm:text-[13px] " +
              (compact ? "text-[12px]" : "text-[13px]")
            }
          >
            {ctaPrice != null ? (
              <>
                {cta.kind === "stall" && (
                  <span className="font-normal text-ink/45">
                    {t("Stall from ", "स्टॉल ")}
                  </span>
                )}
                <span className="text-maroon">
                  ₹{ctaPrice.toLocaleString("en-IN")}
                </span>
                <span className="font-normal text-ink/45"> {ctaUnit}</span>
              </>
            ) : (
              <span className="font-normal text-ink/45">
                {t("Price on enquiry", "कीमत पूछताछ पर")}
              </span>
            )}
          </p>
          {/* The stall-picker grid books from the card tap alone. */}
          {!compact && (
          <div className="relative z-10 flex shrink-0 items-center gap-1.5">
            <Button
              href={bookHref}
              onClick={onBook}
              variant="primary"
              size="sm"
              className={
                "min-h-8 px-3.5 text-[11px] shadow-brand " +
                (compact ? "max-sm:min-h-7 max-sm:px-3 max-sm:py-1" : "")
              }
            >
              {ctaText}
            </Button>
          </div>
          )}
        </div>
        {isSample && (
          <p
            className={
              "mt-1.5 text-[10px] font-medium uppercase tracking-wide text-ink/45 " +
              (compact ? "hidden sm:block" : "")
            }
          >
            {t("Sample listing", "नमूना लिस्टिंग")}
          </p>
        )}
      </div>

      {/* Tapping the card starts the booking — the same place its Book
          button goes. Vendor details live behind the info button. */}
      <Link
        href={bookHref}
        onClick={onBook}
        aria-label={`${ctaText} ${vendor.name}`}
        className="absolute inset-0 z-0 rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon"
        tabIndex={-1}
      >
        <span className="sr-only">{`${ctaText} ${vendor.name}`}</span>
      </Link>
      {gate.sheet}
    </Card>
  );
}
