"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useLang } from "@/lib/i18n";
import { useHomeContent } from "@/lib/homeContent";
import {
  useSessionStatus,
  partnerMemberships,
  type PartnerRole,
} from "@/lib/session";
import { isSelfReferral, isPhoneSelfReferral } from "@/lib/referral";
import { isValidEmail } from "@/lib/validate";
import {
  DEFAULT_REFERRAL_RATES,
  customerPercentFor,
  type ReferralRates,
} from "@/lib/referralRates";
import LoginGate from "@/components/auth/LoginGate";
import PackageScrollCard from "@/components/packages/PackageScrollCard";
import {
  useVendorRatings,
  statFor,
  type VendorRatings,
} from "@/lib/vendorRatings";
import { fetchVenueById } from "@/lib/venues";
import { downloadInvoice, encodeInvoice, type InvoiceData } from "@/lib/invoice";
import {
  ORDER_PAYMENT_LABELS,
  type OrderPaymentMethod,
} from "@/lib/orderPayment";
import {
  emiOptionsForEvent,
  buildEmiPlan,
  formatEmiPlanText,
  type EmiPlan,
} from "@/lib/emi";
import {
  cities,
  packages,
  addOns,
  coupons,
  menuCategories,
  servingTimeLabel,
  packageCategories,
  packageCategoryItems,
  isLiveStallCategory,
  packageBasePerPlate,
  packageLeadDays,
  DEFAULT_VENDOR_LEAD_DAYS,
  vendorLeadDays,
  vendorListings,
  dummyDishPhoto,
  type PackageTier,
  type MenuCategory,
  type CategoryItem,
  type CategoryVendor,
  type Coupon,
  type VendorListing,
  type BookingStatus,
} from "@/lib/data";
import { type VendorTier } from "@/lib/admin/types";
import { dishOnTier, ownCourseQuota, tierRate } from "@/lib/tiers";
import { slugifyName } from "@/lib/bookings";
import { seedStallDraftBrief } from "@/lib/stallDraft";
import { useLocations, OTHER_LOCATION_ID } from "@/lib/locations";
import {
  readStoredLocation,
  markManualLocation,
  LOCATION_CHANGED_EVENT,
  type StoredLocation,
} from "@/lib/detectedLocation";
import {
  useOccasions,
  occasionLeadFor,
  OTHER_OCCASION_ID,
  type OccasionOption,
} from "@/lib/occasions";
import { useServices } from "@/lib/services";
import ServicePackages from "@/components/sections/ServicePackages";
import { Button } from "@/components/ui";
import { inr, money, perPlateCost } from "@/lib/money";
import StepDone from "@/components/booking/shared/StepDone";
import SectionHead from "@/components/booking/shared/SectionHead";
import EventBar from "@/components/booking/shared/EventBar";
import StepExtras from "@/components/booking/shared/StepExtras";
import CheckoutPanel from "@/components/booking/shared/CheckoutPanel";
import {
  WizardHero,
  ProgressRail,
} from "@/components/booking/shared/WizardChrome";
import {
  MIN_GUESTS,
  MAX_GUESTS,
  GST_RATE,
  ADVANCE_RATE,
  daysUntil,
  formatEventDate,
  isoAfterDays,
} from "@/lib/bookingPricing";

/* ─── Constants ──────────────────────────────────────────────────────── */
// Package (1) · Menu (2) · Live Stall (3) · Add-ons + details (4) · Essentials /
// service package (5) · Confirm (6). The live-station courses live in their own
// step so a guest builds their plated menu first, then picks live counters.
const TOTAL_STEPS = 6;

// Large functions (1000+ guests) may split a single segment across vendors.
const MULTI_VENDOR_MIN = 1000;

// Which catalogue vendors a guest may assign to an add-on / counter depends on
// the package they picked — each tier surfaces its own roster from the existing
// vendor catalogue (`vendorListings`). A package id not listed here (Custom,
// short-notice) opens the full catalogue.
const PACKAGE_VENDOR_TIERS: Record<string, VendorListing["tiers"]> = {
  silver: ["Silver"],
  gold: ["Gold"],
  platinum: ["Platinum"],
};

/** A caterer as the band being browsed sees them: only the dishes they serve on
 *  that band, priced at that band's rate. Every downstream read — the dish
 *  picker, the quota counter, pricing, the invoice, the WhatsApp summary — runs
 *  off `activeCategories`, so narrowing once here is what keeps a Platinum-only
 *  delicacy out of a Silver order rather than each of them remembering to ask.
 *  Off a band (Single Stall) it's a no-op: every dish, the flat rate. */
function onBand(v: CategoryVendor, tier: VendorTier | null): CategoryVendor {
  if (!tier) return v;
  const items = v.items.filter((it) => dishOnTier(it, tier));
  const perPlate = tierRate(v, tier);
  return items.length === v.items.length && perPlate === v.perPlate
    ? v
    : { ...v, items, perPlate };
}

type Lang = "en" | "hi";
type City = (typeof cities)[number];

/** category id → chosen vendor ids. Most tiers hold a single id; Platinum
 *  (luxury) lets guests pick multiple vendors per segment. */
type VendorMap = Record<string, string[]>;
/** category id → chosen item ids. Item ids are vendor-scoped (`${vendorId}-${i}`),
 *  so a category's picks may span several selected vendors. */
type ItemMap = Record<string, string[]>;

// The wizard's selections live only in React state, so a browser/system "back"
// (or a reload) that unmounts /book would otherwise wipe a half-built menu.
// Snapshot the guest's picks to sessionStorage and rehydrate on mount so
// returning to the wizard resumes exactly where they left off. Scoped to the
// tab session — a fresh visit (new tab / after a confirmed booking) starts clean.
const DRAFT_KEY = "bhojpatra:booking:draft:v1";

type BookingDraft = {
  step: number;
  packageId: string;
  activeCat: number;
  liveCat: number;
  categoryVendor: VendorMap;
  categoryItems: ItemMap;
  skippedCats: string[];
  occasionId: string;
  customOccasion: string;
  guests: number;
  eventDate: string;
  mealTime: string;
  eventTime: string;
  foodPreference: string;
  venue: string;
  venueFee: number;
  selectedAddOns: string[];
  addOnVendor: Record<string, string[]>;
  serviceId: string;
};

function readBookingDraft(): Partial<BookingDraft> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<BookingDraft>) : null;
  } catch {
    return null; // storage disabled / corrupt JSON — fall back to a fresh start
  }
}

function writeBookingDraft(draft: BookingDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage full / disabled — persistence is best-effort */
  }
}

function clearBookingDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** A `?vendor=` id we can't resolve to a brand, made readable for the
 *  "brand not found" notice ("awadhi-royal" → "Awadhi Royal"). Falls back to
 *  the raw value when it isn't slug-shaped. */
function prettifyVendorId(id: string): string {
  const words = id
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return words.length ? words.join(" ") : id;
}

/** A package is offered when no date is set yet, or the chosen date is at least
 *  the package's lead time away. Custom (lead 0) is always available. */
function packageAvailable(packageId: string, eventDate: string): boolean {
  const days = daysUntil(eventDate);
  if (days === null) return true;
  return days >= (packageLeadDays[packageId] ?? 0);
}

/* ─── Component ──────────────────────────────────────────────────────── */
export default function BookingWizard() {
  // Language is driven by the shared, site-wide context (Header toggle).
  const { lang, t } = useLang();

  // Booking + payment are only allowed for a signed-in guest. Tri-state:
  // `undefined` while the client session loads, `null` signed out, object
  // signed in — the Confirm step (payment + place order) gates on this.
  const sessionStatus = useSessionStatus();

  // Flipped once the persisted draft (if any) has been read back into state, so
  // the save effect below doesn't clobber a stored draft with initial defaults
  // before rehydration runs. See the restore/save effects further down.
  const hydrated = useRef(false);

  const [step, setStep] = useState<number>(1);

  // Step 1 — Package
  const [packageId, setPackageId] = useState<string>(
    packages.find((p) => p.popular)?.id ?? packages[0].id,
  );
  // Whether that package id reflects a real decision (card tap, ?package= link,
  // restored draft) or is still just the "popular" tier we seeded above. Pricing
  // reads `packageId` either way — this only gates what we're willing to *show*
  // as a price on Step 1, so a first-time guest is never quoted for a tier they
  // never picked. See the sticky bar below.
  const [packageChosen, setPackageChosen] = useState<boolean>(false);

  // A vendor deep-linked from a brand page (/book?package=custom&vendor=ID) —
  // held until the live menu loads, then pre-selected across the courses it
  // serves (see the resolve effect below). The guest can still switch vendors.
  const [pendingVendorId, setPendingVendorId] = useState<string>("");

  // Step 2 — Menu (per-category vendor + items). `activeCat` walks the plated
  // courses; `liveCat` walks the Live Stall step's live-station courses (Step 3).
  const [activeCat, setActiveCat] = useState<number>(0);
  const [liveCat, setLiveCat] = useState<number>(0);

  // Scroll to top on step transitions (Next/Back, review step edits, etc.).
  // Category tabs inside a step update content in place without scroll jumps.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [step]);

  const [categoryVendor, setCategoryVendor] = useState<VendorMap>({});
  const [categoryItems, setCategoryItems] = useState<ItemMap>({});
  // Single Stall (custom) plan only — the stalls a guest chose to skip. A
  // skipped stall bills nothing, never counts as "built", and no longer blocks
  // Continue ("pay only for what you select"). Inert on the fixed tiers, where
  // every course is mandatory.
  const [skippedCats, setSkippedCats] = useState<string[]>([]);

  // Step 3 — Event details (occasion, date, city, venue, guests, extras).
  // Occasion / date / city / venue are usually pre-chosen in the Hero booking
  // bar and carried over via the URL; here they remain fully editable.
  const [occasionId, setOccasionId] = useState<string>("");
  // Free-text occasion typed when the customer picks "Other".
  const [customOccasion, setCustomOccasion] = useState<string>("");
  const [guests, setGuests] = useState<number>(100);
  const [eventDate, setEventDate] = useState<string>("");
  // Serving time — the meal period (Breakfast/Lunch/Dinner) plus an exact clock
  // slot within it (e.g. Lunch · 1:30 PM). Both optional; when set they travel
  // onto the order (`mealTime` / `eventTime`), the invoice's "Serving time" line
  // and the admin/My-Bookings views via `servingTimeLabel`. `eventTime` is a
  // 24-hour `HH:MM` string from `bookingTimeSlots`, scoped to the chosen meal.
  const [mealTime, setMealTime] = useState<string>("");
  const [eventTime, setEventTime] = useState<string>("");
  // Food (diet) preference — Pure Veg / Non-veg / Both. Optional; travels onto the
  // order, invoice ("Food preference") and admin / My-Bookings alongside the meal.
  const [foodPreference, setFoodPreference] = useState<string>("");
  const [cityId, setCityId] = useState<string>("");
  // Free-text location typed when the customer picks "Other" (their city/state
  // isn't in the admin-managed list).
  const [customCity, setCustomCity] = useState<string>("");
  const [venue, setVenue] = useState<string>("");
  // When a venue is selected from the catalogue (/book?venue=ID), we resolve it
  // to its name (above) plus a numeric booking fee that's folded into the feast
  // total, invoice and receipt. A free-text venue (Hero bar) carries no fee.
  const [venueFee, setVenueFee] = useState<number>(0);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  // add-on id → chosen vendor (catalogue) ids. Single-vendor tiers hold one id;
  // multi-vendor tiers (Platinum always, big Gold) may split a counter across
  // several vendors — same "as per package" rule as the plated menu. The roster
  // a guest picks from is narrowed to the package's tier (PACKAGE_VENDOR_TIERS).
  const [addOnVendor, setAddOnVendor] = useState<Record<string, string[]>>({});

  // Feast-wide service package (Step 4) — a mandatory single-select. The live
  // list is admin-managed (`useServices`, falling back to the seed); the chosen
  // tier's price folds into the order total.
  const services = useServices();
  const [serviceId, setServiceId] = useState<string>("");

  // Referral attribution — a partner's code arrives via /book?ref=CODE or is
  // typed on the Confirm step. We resolve it to the referrer's name so the
  // booking can be tagged and surfaced on the partner's dashboard. Declared
  // here (above the prefill/resolve effects below) so those effects can read it.
  const [referralCode, setReferralCode] = useState<string>("");
  const [referrerName, setReferrerName] = useState<string>("");
  const [referrerType, setReferrerType] = useState<string>("");
  // The resolved partner's registered phone — kept so we can spot a booker who's
  // referring themselves from a second account (their phone matches the code's
  // owner). The server re-checks this authoritatively; here it's for feedback.
  const [referrerPhone, setReferrerPhone] = useState<string>("");

  // Admin-set referral rates. A recognised Individual / Event Planner code gives
  // the customer the configured discount off their pre-tax bill (0 until an
  // admin sets one, so behaviour is unchanged by default).
  const [referralRates, setReferralRates] = useState<ReferralRates>(
    DEFAULT_REFERRAL_RATES,
  );
  useEffect(() => {
    let active = true;
    fetch("/api/admin/referral-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ReferralRates | null) => {
        if (active && d) setReferralRates(d);
      })
      .catch(() => {
        /* offline — no referral discount, everything else still works */
      });
    return () => {
      active = false;
    };
  }, []);

  // The signed-in account's own referral codes — an Individual Referrer or Event
  // Planner must not credit their own booking, so a code that belongs to this
  // same account is treated as "no referral" (see the resolve effect + confirm).
  const ownMemberships = useMemo(
    () => partnerMemberships(sessionStatus ?? null),
    [sessionStatus],
  );

  // Admin-managed occasions + serviceable locations (both fall back to their
  // seed lists). resolveOccasion / resolveCity turn the selected id — or the
  // free-text "Other" value — into a {name,nameHi} used across the invoice /
  // receipt / summary.
  const occasionList = useOccasions();
  const resolveOccasion = (id: string): OccasionOption | undefined => {
    if (!id) return undefined;
    if (id === OTHER_OCCASION_ID) {
      const name = customOccasion.trim();
      return name ? { id, name, nameHi: name } : undefined;
    }
    return occasionList.find((o) => o.id === id);
  };
  const locations = useLocations();
  const resolveCity = (id: string): City | undefined => {
    if (!id) return undefined;
    if (id === OTHER_LOCATION_ID) {
      const name = customCity.trim();
      return name ? { id, name, nameHi: name } : undefined;
    }
    return locations.find((c) => c.id === id) ?? cities.find((c) => c.id === id);
  };

  // Rehydrate a persisted draft (see DRAFT_KEY) BEFORE the URL / location
  // effects below run: a fresh deep-link's query params (occasion / date /
  // package / step…) still override a stale draft, while a plain return to
  // /book — via browser back, reload, or a bounce through login — resumes the
  // half-built menu instead of starting over. City is intentionally left out;
  // the location store already persists it (the two effects just below), so
  // restoring it here would fight that sync.
  useEffect(() => {
    const d = readBookingDraft();
    if (d) {
      if (typeof d.step === "number") setStep(d.step);
      if (d.packageId) {
        setPackageId(d.packageId);
        setPackageChosen(true);
      }
      if (typeof d.activeCat === "number") setActiveCat(d.activeCat);
      if (typeof d.liveCat === "number") setLiveCat(d.liveCat);
      if (d.categoryVendor) setCategoryVendor(d.categoryVendor);
      if (d.categoryItems) setCategoryItems(d.categoryItems);
      if (d.skippedCats) setSkippedCats(d.skippedCats);
      if (d.occasionId) setOccasionId(d.occasionId);
      if (d.customOccasion) setCustomOccasion(d.customOccasion);
      if (typeof d.guests === "number") setGuests(d.guests);
      if (d.eventDate) setEventDate(d.eventDate);
      if (d.mealTime) setMealTime(d.mealTime);
      if (d.eventTime) setEventTime(d.eventTime);
      if (d.foodPreference) setFoodPreference(d.foodPreference);
      if (d.venue) setVenue(d.venue);
      if (typeof d.venueFee === "number") setVenueFee(d.venueFee);
      if (d.selectedAddOns) setSelectedAddOns(d.selectedAddOns);
      if (d.addOnVendor) {
        // Migrate legacy drafts (one vendor id per counter) to the new
        // multi-vendor shape (an array of vendor ids per counter).
        const raw = d.addOnVendor as Record<string, string | string[]>;
        setAddOnVendor(
          Object.fromEntries(
            Object.entries(raw).map(([k, v]) => [
              k,
              Array.isArray(v) ? v : [v],
            ]),
          ),
        );
      }
      if (d.serviceId) setServiceId(d.serviceId);
    }
    hydrated.current = true;
  }, []);

  // Prefill occasion / date / city / venue from the Hero booking bar's query
  // params (e.g. /book?occasion=wedding&date=2026-07-19&city=lucknow). Read in
  // an effect so the server and first client render match — and so we don't
  // depend on a Suspense boundary for useSearchParams.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const occ = sp.get("occasion");
    const date = sp.get("date");
    const city = sp.get("city");
    const venueParam = sp.get("venue");
    const pkg = sp.get("package");
    const stepParam = sp.get("step");
    const guestsParam = sp.get("guests");

    // Single Stall has its own wizard at /book/stall — this one only sells the
    // fixed Silver/Gold/Platinum feasts. Links minted before the split (a brand
    // page's "book this stall", the old ?package=custom cards, the Mehndi
    // occasion card) still land here, so forward them with their context intact
    // rather than dead-ending on a package chooser that no longer offers it.
    const vendorParam = sp.get("vendor")?.trim();
    if (vendorParam || pkg === "custom" || occ === "mehndi") {
      const fwd = new URLSearchParams(sp);
      fwd.delete("package");
      fwd.delete("step");
      const qs = fwd.toString();
      window.location.replace(`/book/stall${qs ? `?${qs}` : ""}`);
      return;
    }
    // Occasion may be a seed id, an admin-added id (resolved once the list
    // loads), or the "Other" sentinel carrying a typed name in `occName`.
    const occName = sp.get("occName")?.trim();
    if (occ === OTHER_OCCASION_ID || occName) {
      setOccasionId(OTHER_OCCASION_ID);
      if (occName) setCustomOccasion(occName);
    } else if (occ) {
      setOccasionId(occ);
    }
    if (date) setEventDate(date);
    // City may be a seed id, an admin-added id (resolved once the list loads),
    // or the "Other" sentinel carrying a typed name in `loc`.
    const loc = sp.get("loc")?.trim();
    if (city === OTHER_LOCATION_ID || loc) {
      setCityId(OTHER_LOCATION_ID);
      if (loc) setCustomCity(loc);
    } else if (city) {
      setCityId(city);
    }
    if (venueParam) setVenue(venueParam);
    const g = Number(guestsParam);
    if (g >= MIN_GUESTS && g <= MAX_GUESTS) setGuests(Math.round(g));
    // A package chosen on the home page's "Select Your Package" section arrives
    // here pre-selected; `step=menu` then drops the guest straight onto vendor
    // selection (Step 2) so they flow into the booking instead of re-picking.
    // But a deep-linked tier is only honoured when it actually clears its lead
    // time for the passed date — otherwise (e.g. Platinum, which needs 30 days,
    // for an event a fortnight out) we'd strand the guest on a too-soon tier's menu
    // while Step 1 shows that same tier disabled. When it's too soon we skip both
    // the preselect and the menu jump, keeping the guest on Step 1 where the tier
    // renders disabled with the date it unlocks.
    // The date the wizard actually ends up holding is the URL's `date` when
    // present, else the one the rehydrate effect above restored from the saved
    // draft (e.g. home → hero sets wedding 30 days out → back home → "Book
    // Platinum", whose link carries no date). That restored state isn't visible
    // to this closure, so re-read the draft directly.
    const pkgRequested = pkg !== null && packages.some((p) => p.id === pkg);
    const effectiveDate = date ?? readBookingDraft()?.eventDate ?? null;
    const pkgTooSoon =
      pkgRequested &&
      effectiveDate !== null &&
      !packageAvailable(pkg!, effectiveDate);
    if (pkgRequested && !pkgTooSoon) {
      setPackageId(pkg!);
      setPackageChosen(true);
    }
    if (stepParam === "menu" && !pkgTooSoon) setStep(2);
    // A partner's share link (/book?ref=CODE) pre-fills the referral code.
    const ref = sp.get("ref");
    if (ref) setReferralCode(ref.trim().toUpperCase());
  }, []);

  // Persist the draft on every selection change (once the initial rehydrate has
  // run, so we never overwrite a stored draft with the mount-time defaults).
  // Best-effort — see writeBookingDraft. Cleared once the booking is confirmed.
  useEffect(() => {
    if (!hydrated.current) return;
    writeBookingDraft({
      step,
      packageId,
      activeCat,
      liveCat,
      categoryVendor,
      categoryItems,
      skippedCats,
      occasionId,
      customOccasion,
      guests,
      eventDate,
      mealTime,
      eventTime,
      foodPreference,
      venue,
      venueFee,
      selectedAddOns,
      addOnVendor,
      serviceId,
    });
  }, [
    step,
    packageId,
    activeCat,
    liveCat,
    categoryVendor,
    categoryItems,
    skippedCats,
    occasionId,
    customOccasion,
    guests,
    eventDate,
    mealTime,
    eventTime,
    foodPreference,
    venue,
    venueFee,
    selectedAddOns,
    addOnVendor,
    serviceId,
  ]);

  // When the Hero didn't pass a city, reuse the Google-detected / persisted city.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("city") || sp.get("loc")) return;
    const stored = readStoredLocation();
    if (!stored?.cityId) return;
    setCityId(stored.cityId);
    if (stored.customCity) setCustomCity(stored.customCity);
  }, []);

  // Resolve a venue passed by id (/book?venue=ID from the venue catalogue) to
  // its name + booking fee, so the feast order folds the venue in. An unknown
  // or free-text venue keeps the raw value with no fee.
  useEffect(() => {
    const venueParam = new URLSearchParams(window.location.search).get("venue");
    if (!venueParam) return;
    let active = true;
    fetchVenueById(venueParam).then((v) => {
      if (!active || !v) return;
      setVenue(v.name);
      setVenueFee(v.price);
      setCityId((c) => c || v.city);
    });
    return () => {
      active = false;
    };
  }, []);

  // Keep the header's location bar and the booking's City/Location in
  // lockstep — they read/write one shared location store. Booking → header:
  // whenever the guest changes the city here (or it's carried in from the URL /
  // a venue), persist it so the header mirrors it. The store compare guards
  // against re-emitting an already-synced value, which would loop with the
  // listener below.
  useEffect(() => {
    if (!cityId) return;
    const custom =
      cityId === OTHER_LOCATION_ID ? customCity.trim() : undefined;
    if (cityId === OTHER_LOCATION_ID && !custom) return; // incomplete "Other"
    const stored = readStoredLocation();
    if (stored?.cityId === cityId && (stored.customCity ?? "") === (custom ?? ""))
      return; // already in sync — don't re-emit
    markManualLocation(cityId, custom);
  }, [cityId, customCity]);

  // Header → booking: when the location changes anywhere else (the header city
  // picker, its "use my location", or another tab), mirror it into the booking.
  // Uses the raw setters (no persist) so it never bounces back through the
  // effect above.
  useEffect(() => {
    function onChanged(e: Event) {
      const d = (e as CustomEvent<StoredLocation>).detail;
      if (!d?.cityId) return;
      setCityId(d.cityId);
      setCustomCity(d.cityId === OTHER_LOCATION_ID ? (d.customCity ?? "") : "");
    }
    window.addEventListener(LOCATION_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(LOCATION_CHANGED_EVENT, onChanged);
  }, []);

  // Resolve the referral code to the partner's name so the booking can show
  // "Referred by …" and be attributed on their dashboard. An unknown code is
  // still kept (and tagged) — the team reconciles it on follow-up.
  useEffect(() => {
    const code = referralCode.trim();
    // No code, or the booker's own code (self-referral) → no attribution.
    if (!code || isSelfReferral(code, ownMemberships)) {
      setReferrerName("");
      setReferrerType("");
      setReferrerPhone("");
      return;
    }
    let active = true;
    fetch(`/api/partners?code=${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        const p = data?.partner;
        setReferrerName(p?.name ?? "");
        setReferrerType(p?.type ?? "");
        // Kept only to compare against the booker's phone (second-account
        // self-referral); never rendered.
        setReferrerPhone(p?.phone ?? "");
      })
      .catch(() => {
        /* offline — keep the raw code, no resolved name */
      });
    return () => {
      active = false;
    };
  }, [referralCode, ownMemberships]);

  // The chosen date must clear the selected package's lead time. We deliberately
  // do NOT auto-switch the package here: silently downgrading (e.g. Platinum →
  // Gold) stripped Platinum's multi-vendor menu out from under the guest without
  // explanation. Instead we keep their pick and surface a lead-time notice +
  // block "Next" (see `dateMeetsLead` / `nextBlockers`) so they choose a later
  // date or a lower tier on purpose. Step 1 shows too-soon tiers locked (dimmed,
  // with their unlock date) rather than hiding them — see `StepPackage`.

  // Step 4 — Confirm (coupon + optional 10% advance / full payment)
  const [couponInput, setCouponInput] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string>("");
  const [confirming, setConfirming] = useState<boolean>(false);
  const [confirmError, setConfirmError] = useState<string>("");
  const [confirmed, setConfirmed] = useState<boolean>(false);
  // Amount the guest has settled up front via UPI/QR — the 10% advance, the
  // full total, or 0 if they book without paying.
  const [paidAmount, setPaidAmount] = useState<number>(0);
  // Transaction / reference ID of that online payment, so it travels onto the
  // saved order (admin console) and the customer's booking (My Bookings).
  const [paymentRef, setPaymentRef] = useState<string>("");
  // Who to reach out to — captured on the Confirm step so COD / "connect"
  // orders are actionable for our team in the admin console.
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  // Contact email — captured alongside name/phone so a booking's customer
  // details carry a written address (the team can email the invoice / follow
  // up). Prefilled from the signed-in account below, but fully editable.
  const [customerEmail, setCustomerEmail] = useState<string>("");

  // Prefill name/email from the signed-in account once the session loads (only
  // when the field is still blank, so we never clobber what the guest typed).
  useEffect(() => {
    if (!sessionStatus) return;
    if (sessionStatus.name) setCustomerName((n) => n || sessionStatus.name!);
    if (sessionStatus.email) setCustomerEmail((e) => e || sessionStatus.email!);
  }, [sessionStatus]);

  // The account carries no phone number, so a returning customer's mobile comes
  // from their last booking instead — asking a second time for a number we
  // already have on file is exactly the friction this avoids. Best-effort: if
  // the fetch fails (or this is a first booking) the field is simply asked for.
  const [lastBookingPhone, setLastBookingPhone] = useState<string>("");
  useEffect(() => {
    if (!sessionStatus) return;
    let active = true;
    fetch("/api/bookings/mine")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { orders?: { phone?: string }[] } | null) => {
        if (!active) return;
        // `mine` comes back newest-first — take the most recent number on file.
        const phone = (data?.orders ?? []).find((o) => o.phone?.trim())?.phone;
        if (!phone) return;
        setLastBookingPhone(phone.trim());
        setCustomerPhone((p) => p || phone.trim());
      })
      .catch(() => {
        /* offline / signed out mid-flight — the guest can still type it */
      });
    return () => {
      active = false;
    };
  }, [sessionStatus]);

  // What we already hold on file for this guest — the account's name/email and
  // the phone from their last booking. The Confirm step reads these back as a
  // "booking as …" line and only asks for what's genuinely missing; a value the
  // guest edits away from stops matching and reverts to a plain field.
  const knownContact = useMemo(
    () => ({
      name: sessionStatus?.name ?? "",
      email: sessionStatus?.email ?? "",
      phone: lastBookingPhone,
    }),
    [sessionStatus, lastBookingPhone],
  );

  // A booking can't credit its own booker. Two ways that happens, both dropped:
  //  • same account — the applied code is one of this signed-in account's codes;
  //  • second account — the code's owner (an Individual Referrer / Event Planner)
  //    has the same phone as the one entered here. The server re-checks both
  //    authoritatively; this drives the "you can't refer yourself" notice.
  const selfReferral =
    isSelfReferral(referralCode, ownMemberships) ||
    isPhoneSelfReferral(customerPhone, {
      type: referrerType as PartnerRole,
      phone: referrerPhone,
    });
  // How the guest wants to pay: UPI / QR settle online now; COD and Connect are
  // arranged later. Defaults to UPI (pay-now).
  const [payMethod, setPayMethod] = useState<OrderPaymentMethod>("UPI");
  // After the 10% advance, how many EMIs the guest wants to split the balance
  // into. `1` = settle the balance in one go (no EMI); 3 / 6 unlock with lead
  // time. A count the chosen date no longer supports simply reads back as "no
  // EMI" everywhere it's consumed (see the inclusion guards), so no reset needed.
  const [emiCount, setEmiCount] = useState<number>(1);

  // Real customer ratings per vendor, shown on the vendor cards (best-effort).
  const vendorRatings = useVendorRatings();

  // Best-effort lead capture: the moment the guest types a valid mobile on the
  // Confirm step we record it as a "booking-intent" lead, so an abandoned
  // booking still leaves a contactable lead for follow-up. Fire-and-forget,
  // de-duped by phone in the API, and once per number here.
  const capturedPhones = useRef<Set<string>>(new Set());
  useEffect(() => {
    const phone = customerPhone.replace(/[\s-]/g, "");
    if (!/^[6-9]\d{9}$/.test(phone)) return;
    // A number prefilled from this customer's last booking isn't a new lead —
    // they're already a customer, and the field filled itself. Only a number
    // the guest actually put in here is worth capturing.
    if (phone === lastBookingPhone.replace(/[\s-]/g, "")) return;
    if (capturedPhones.current.has(phone)) return;
    capturedPhones.current.add(phone);
    void fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, source: "booking-intent" }),
    }).catch(() => {
      /* offline — the full order still persists on confirm */
    });
  }, [customerPhone, lastBookingPhone]);

  /* ─── Menu helpers ─────────────────────────────────────────────────── */
  // Short-notice dates can't be sourced for the regular tiers (Silver/Gold/
  // Platinum each need lead time) — only the no-lead Custom plan survives. We
  // then run a single-stall flow: one vendor per course, plus add-ons.
  const shortNotice =
    eventDate !== "" &&
    packages
      .filter((p) => p.id !== "custom")
      .every((p) => !packageAvailable(p.id, eventDate));

  // When a segment may be split across several vendors:
  //  • Platinum (luxury) — always.
  //  • Gold ("city best") — for large functions of 1000+ guests.
  // Short-notice (single-stall) dates always force a single vendor per course.
  const multiVendor =
    !shortNotice &&
    (packageId === "platinum" ||
      (packageId === "gold" && guests >= MULTI_VENDOR_MIN));

  // Live counters and add-on counters follow a stricter, Platinum-only rule:
  // Single Stall / Silver / Gold (even big-Gold) keep a single vendor per
  // counter. Only Platinum may split a live station or an add-on across
  // vendors. Gold's "multiple vendors for 1,000+ guests" spread stays on the
  // plated menu, where `multiVendor` above still applies.
  const counterMultiVendor = multiVendor && packageId === "platinum";

  // Per-course multi-vendor: plated courses use the general rule; live-stall
  // courses fall back to the Platinum-only counter rule. Keeps the shared menu
  // helpers (allowance / completeness / vendor picks) in step with each step's
  // picker, so a live counter never expects more than one vendor off Platinum.
  const multiVendorFor = (catId: string): boolean =>
    isLiveStallCategory(catId) ? counterMultiVendor : multiVendor;

  // Vendors & dishes per course come from the vendor store (`/api/menu`):
  // the curated seed specialists plus every live vendor menu published from
  // the vendor dashboard. The static fixture renders instantly as a fallback
  // until (or in case) the fetch answers.
  const [liveMenuCategories, setLiveMenuCategories] =
    useState<MenuCategory[]>(menuCategories);
  // Whether that fetch has settled (either way). The fixture above means the
  // roster is never empty, so "this brand isn't in the roster" is only a real
  // answer once the live data has had its turn — a brand published from a
  // vendor dashboard exists only in the API payload, not the fixture.
  const [menuSettled, setMenuSettled] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/menu")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { categories?: MenuCategory[] } | null) => {
        if (live && d?.categories?.length) setLiveMenuCategories(d.categories);
      })
      .catch(() => {})
      .finally(() => {
        if (live) setMenuSettled(true);
      });
    return () => {
      live = false;
    };
  }, []);

  // A `/book?vendor=ID` hand-off whose brand we could not resolve. Holds the
  // brand's display name (or the raw id) so the Menu step can say which one
  // went missing instead of dropping the guest on an unexplained empty picker.
  const [missingBrand, setMissingBrand] = useState<string>("");

  // Resolve a brand-page vendor hand-off (/book?vendor=ID) once the live menu
  // arrives: pre-select that vendor in every course it publishes, so the Menu
  // step opens on that vendor's roster. A catalog id with no booking-menu
  // record under it (a curated
  // caterer listing) is bridged to its wizard counterpart by name-slug — the
  // same name bridge reviews use — tolerating the listing's trailing
  // "Caterers" ("Awadhi Royal Caterers" ↔ "Awadhi Royal"), so the brand the
  // guest picked still lands pre-selected instead of silently vanishing.
  // Truly unknown ids fall through — the guest just picks a tier as usual. A
  // resumed draft's picks win, so returning to a half-built order isn't
  // clobbered.
  useEffect(() => {
    if (!pendingVendorId) return;
    const nameKey = (name: string) =>
      slugifyName(name).replace(/-caterers$/, "");
    let targetId = pendingVendorId;
    const menuHasId = liveMenuCategories.some((c) =>
      c.vendors.some((v) => v.id === pendingVendorId),
    );
    if (!menuHasId) {
      const listing = vendorListings.find((l) => l.id === pendingVendorId);
      const hit = listing
        ? liveMenuCategories
            .flatMap((c) => c.vendors)
            .find((v) => nameKey(v.name) === nameKey(listing.name))
        : undefined;
      if (hit) targetId = hit.id;
    }
    const preset: VendorMap = {};
    const hitCats: string[] = [];
    for (const cat of liveMenuCategories) {
      const v = cat.vendors.find((x) => x.id === targetId);
      if (!v) continue;
      preset[cat.id] = [targetId];
      hitCats.push(cat.id);
    }
    if (Object.keys(preset).length === 0) {
      // No course carries this brand. While the live roster is still in flight
      // that only means "not loaded yet", so keep waiting. Once it has settled
      // the id is genuinely unknown (a delisted brand, a stale share link, a
      // hand-typed ?vendor=) — say so and leave the guest on the vendor picker
      // with nothing pre-selected, rather than an empty step they can't explain.
      if (!menuSettled) return;
      const listing = vendorListings.find((l) => l.id === pendingVendorId);
      setMissingBrand(listing?.name ?? prettifyVendorId(pendingVendorId));
      setPendingVendorId("");
      setActiveCat(0);
      setStep(2);
      return;
    }
    setMissingBrand("");
    setCategoryVendor((m) => ({ ...preset, ...m }));
    // Land the guest on the step/tab that actually holds this vendor's course.
    // The hand-off opens the plated Menu step (2) by default, but a beverage /
    // chaat brand may publish only on a live-station course, which lives on the
    // Live Stall step (3). Without this jump the pre-selected stall sits on a
    // step the guest never sees — reading as "my vendor vanished". A vendor that
    // spans both keeps the default plated landing. Indexing follows the custom
    // course order (each step's tab list mirrors it); liveCat self-clamps.
    const courses = packageCategories.custom ?? [];
    const plated = courses.filter((id) => !isLiveStallCategory(id));
    const live = courses.filter((id) => isLiveStallCategory(id));
    const platedHit = hitCats.find((id) => plated.includes(id));
    const liveHit = hitCats.find((id) => live.includes(id));
    if (platedHit) {
      setActiveCat(Math.max(0, plated.indexOf(platedHit)));
      setStep(2);
    } else if (liveHit) {
      setLiveCat(Math.max(0, live.indexOf(liveHit)));
      setStep(3);
    }
    setPendingVendorId("");
  }, [liveMenuCategories, pendingVendorId, menuSettled]);

  // The tier "lens" that decides which vendors each course surfaces. Fixed tiers
  // use their own band (Silver shows Silver-mapped vendors, etc.) via the
  // existing PACKAGE_VENDOR_TIERS map. `null` — Single Stall, or any package
  // with no band — means "no tier gate": the guest browses every stall their
  // city offers, whatever band it's mapped to. Platinum is handled as the
  // premium reach inside the filter below.
  const effectiveTier: VendorTier | null =
    PACKAGE_VENDOR_TIERS[packageId]?.[0] ?? null;

  // The course tabs the guest sees on this step are driven by the selected
  // package — each tier opens a different set of segments (Silver is a short
  // fixed menu; Gold adds Chaat / Chinese / South Indian; Platinum curates
  // premium segments). This keeps /book in sync with what the package card on
  // the home page advertises. Order follows `packageCategories`.
  const activeCategories = useMemo<MenuCategory[]>(() => {
    const ids =
      packageCategories[packageId] ?? liveMenuCategories.map((c) => c.id);
    // Live caterers serve their own city — once the guest has picked one (via
    // the hero booking bar or Step 3), other-city live vendors are hidden.
    // Curated seed vendors are city-agnostic and always shown.
    const cityName = cities.find((c) => c.id === cityId)?.name.toLowerCase();
    return ids
      .map((id) => liveMenuCategories.find((c) => c.id === id))
      .filter((c): c is MenuCategory => Boolean(c))
      .map((c) => ({
        ...c,
        // Each caterer is narrowed to the band being browsed BEFORE the gates,
        // so "does this stall serve anything here?" is asked of the dishes the
        // guest would actually get, not of the vendor's whole published menu.
        vendors: c.vendors
          .map((v) => onBand(v, effectiveTier))
          .filter((v) => {
          // Tier gate: Platinum surfaces every band; Silver/Gold only vendors
          // mapped to that tier (a vendor's course↔tier mapping). Vendors with
          // no tier data — the static fallback before /api/menu answers — are
          // never hidden, so behaviour is unchanged until tiers load.
          const tierOk =
            !effectiveTier ||
            effectiveTier === "Platinum" ||
            !v.tiers ||
            v.tiers.includes(effectiveTier);
          // City gate: Platinum reaches every city (its premium draw, so the
          // excitement stays intact); Silver/Gold keep the existing rule — live
          // vendors must match the event city, curated seeds show everywhere.
          const cityOk =
            effectiveTier === "Platinum" ||
            !v.live ||
            !cityName ||
            v.city?.toLowerCase() === cityName;
          // Course gate: a caterer who set their own per-band quota for this
          // course and put 0 on it doesn't serve it — they drop out of this
          // roster rather than appear with nothing to pick. Off a band (Single
          // Stall) that means 0 on every quota they published. A caterer who
          // kept every dish in this course off the band lands in the same
          // place: nothing to serve, so nothing to show.
          const courseOk =
            ownCourseQuota(v.tierItems, effectiveTier) !== 0 &&
            v.items.length > 0;
          return tierOk && cityOk && courseOk;
        }),
      }));
  }, [packageId, effectiveTier, liveMenuCategories, cityId]);

  // The package's segments split across two wizard steps: plated courses build
  // in "Menu" (Step 2), live-station courses in "Live Stall" (Step 3). Both are
  // derived from the same `activeCategories`, so pricing / order building (which
  // still read the whole list) are untouched — only the UI is split.
  const menuStepCategories = useMemo(
    () => activeCategories.filter((c) => !isLiveStallCategory(c.id)),
    [activeCategories],
  );
  const liveStallCategories = useMemo(
    () => activeCategories.filter((c) => isLiveStallCategory(c.id)),
    [activeCategories],
  );
  // Whether the chosen package includes any live stalls at all (Silver doesn't).
  const hasLiveStalls = liveStallCategories.length > 0;

  // Switching to a package with fewer segments can leave either active tab index
  // past the end of the new list — pull each back into range.
  useEffect(() => {
    if (activeCat > menuStepCategories.length - 1) setActiveCat(0);
  }, [menuStepCategories, activeCat]);
  useEffect(() => {
    if (liveCat > liveStallCategories.length - 1) setLiveCat(0);
  }, [liveStallCategories, liveCat]);

  // The Single Stall (custom) plan — one stall per course, build-your-own
  // order. It's the only plan that reads a stall's fixed/varied menu style and
  // the only one where a course can be skipped outright.
  const singleStall = packageId === "custom";

  // A fixed stall serves its whole published spread: every dish is in, the
  // guest customises nothing, and it bills at the stall's own per-plate rate.
  // Caterers set this per course from their dashboard; anything unset (curated
  // seeds, the static fallback fixture) is fixed, the platform default. Only
  // Single Stall reads it — the feast bands always run on the dish quota.
  const isFixedStall = (v: CategoryVendor): boolean =>
    singleStall && v.menuType !== "varied";

  // The base per-course dish quota from the package config — the number of
  // dishes allowed from ONE vendor for this course (e.g. one welcome drink).
  const platformAllowanceFor = (catId: string): number =>
    packageCategoryItems[packageId]?.[catId] ?? 1;

  // A caterer can publish their own per-band quota for a course from their
  // dashboard ("Silver gets 2 starters, Platinum gets 6"). Theirs wins for
  // their own stall; the platform number stays the fallback for curated seeds
  // and for anyone who never set one. A `0` never reaches here — those vendors
  // are filtered out of the course roster above.
  const baseAllowanceFor = (catId: string, vendorId?: string): number => {
    const platform = platformAllowanceFor(catId);
    if (!vendorId) return platform;
    const vendor = activeCategories
      .find((c) => c.id === catId)
      ?.vendors.find((v) => v.id === vendorId);
    // A fixed stall has no quota to fill — its whole spread is served, so the
    // "allowance" is the dish list itself. Keeps the course reading complete
    // the moment it's picked, and the counter honest (6/6, not 6/1).
    if (vendor && isFixedStall(vendor)) return vendor.items.length;
    const own = ownCourseQuota(vendor?.tierItems, effectiveTier);
    const asked = own && own > 0 ? own : platform;
    // Never ask for more dishes than this stall actually has on this band —
    // whether the number came from the caterer or from our own package config.
    // Unclamped, the guest sits at "4 of 6 picked" with nothing left to tap and
    // the course can never complete, which can block the whole order.
    return vendor ? Math.min(asked, vendor.items.length) : asked;
  };

  // Whether a step's courses let the guest pick more than one dish anywhere in
  // the package — step-wide (not the active course) because the first course
  // (e.g. Welcome) may allow only one dish on tiers that open a wide spread
  // elsewhere. Uses the base (per-vendor) quota so multi-vendor scaling doesn't
  // skew it. Feeds the step subtitle, which states the package's capability in
  // the same line rather than stacking a second note under the head.
  const multiDishIn = (cats: MenuCategory[]): boolean =>
    cats.some((c) => baseAllowanceFor(c.id) > 1);

  // Selections are filtered at read time against the vendors currently shown
  // (same derive-don't-reconcile approach as the add-on vendor fallback):
  // switching the event city can hide a live vendor after the guest picked
  // them, and a stale pick must not count towards "menu complete" or price.
  const vendorsFor = (catId: string): string[] => {
    const visible = activeCategories.find((c) => c.id === catId)?.vendors;
    const chosen = categoryVendor[catId] ?? [];
    return visible
      ? chosen.filter((id) => visible.some((v) => v.id === id))
      : chosen;
  };
  const itemsFor = (catId: string): string[] => {
    const chosen = vendorsFor(catId);
    const stored = (categoryItems[catId] ?? []).filter((id) =>
      chosen.some((vid) => id.startsWith(`${vid}-`)),
    );
    // A fixed stall's dishes are all in, always — derived here rather than
    // written into state when it's picked, so switching plan (Gold → Single
    // Stall), swapping vendor or resuming a saved draft can never leave a fixed
    // stall half-selected. Everything downstream (completion, price, invoice,
    // the review card) reads this one list.
    const fixed = (activeCategories.find((c) => c.id === catId)?.vendors ?? [])
      .filter((v) => chosen.includes(v.id) && isFixedStall(v));
    if (fixed.length === 0) return stored;
    return [
      ...fixed.flatMap((v) => v.items.map((it) => it.id)),
      ...stored.filter((id) => !fixed.some((v) => id.startsWith(`${v.id}-`))),
    ];
  };

  // The vendor an item id belongs to. Ids are `${vendorId}-${i}`, but a vendor
  // id may itself contain hyphens, so match against the chosen vendors rather
  // than splitting on "-".
  const vendorOfItem = (catId: string, itemId: string): string | undefined =>
    vendorsFor(catId).find((vid) => itemId.startsWith(`${vid}-`));

  // Items chosen from a single vendor within a course.
  const vendorPicks = (catId: string, vendorId: string): string[] =>
    itemsFor(catId).filter((id) => id.startsWith(`${vendorId}-`));

  // Effective course allowance. Multi-vendor tiers (Platinum always, big Gold
  // functions) give EACH chosen vendor its own quota — e.g. one welcome drink
  // from every vendor — so the course total scales with the vendors picked.
  // Single-vendor tiers keep the flat quota. Drives the "N/N PICKED" counter.
  const allowanceFor = (catId: string): number => {
    const chosen = vendorsFor(catId);
    if (!multiVendorFor(catId)) {
      // One stall: its own quota is the course total (platform base until the
      // guest has actually picked a caterer).
      return baseAllowanceFor(catId, chosen[0]);
    }
    // Several stalls: each contributes its own quota, so the course total is
    // their sum rather than one number times the head-count.
    if (chosen.length === 0) return baseAllowanceFor(catId);
    return chosen.reduce((sum, vid) => sum + baseAllowanceFor(catId, vid), 0);
  };

  const categoryComplete = (cat: MenuCategory): boolean => {
    const chosen = vendorsFor(cat.id);
    if (chosen.length === 0) return false;
    // Multi-vendor: every chosen vendor must contribute its own full quota.
    if (multiVendorFor(cat.id))
      return chosen.every(
        (vid) =>
          vendorPicks(cat.id, vid).length >= baseAllowanceFor(cat.id, vid),
      );
    return itemsFor(cat.id).length >= baseAllowanceFor(cat.id, chosen[0]);
  };

  // The Single Stall (custom) plan lets a guest skip courses they don't want.
  // Skipping is meaningless on the fixed tiers (every course is included), so
  // it's gated to `singleStall` even if a stale skip id lingers from an earlier
  // pick.
  const isSkipped = (catId: string): boolean =>
    singleStall && skippedCats.includes(catId);
  // A stall stops blocking "Continue" once it's either fully built or skipped.
  const categoryResolved = (cat: MenuCategory): boolean =>
    categoryComplete(cat) || isSkipped(cat.id);

  // Check if a category has any selection made by the user (vendor, item, or skipped).
  const hasCategorySelection = (cat: MenuCategory): boolean => {
    const chosenVendors = vendorsFor(cat.id);
    const chosenItems = itemsFor(cat.id);
    const skipped = isSkipped(cat.id);
    return chosenVendors.length > 0 || chosenItems.length > 0 || skipped;
  };

  // Check if a list of categories has at least one selection made.
  const hasStepAnySelection = (cats: MenuCategory[]): boolean => {
    return cats.some(hasCategorySelection);
  };

  // Check if all categories in a list are fully resolved.
  const isStepFullyComplete = (cats: MenuCategory[]): boolean => {
    return cats.every(categoryResolved);
  };

  // Check if a step has partial selection (some selections made, but not fully complete).
  const isStepPartial = (cats: MenuCategory[]): boolean => {
    return hasStepAnySelection(cats) && !isStepFullyComplete(cats);
  };

  // Calculate missing selection summaries per category for partial steps
  const getMissingCategorySummaries = (
    cats: MenuCategory[],
  ): { id: string; name: string; missingCount: number }[] => {
    const result: { id: string; name: string; missingCount: number }[] = [];

    for (const cat of cats) {
      if (isSkipped(cat.id) || categoryComplete(cat)) {
        continue;
      }

      const catName = lang === "hi" ? cat.nameHi || cat.name : cat.name;
      const chosenVendors = vendorsFor(cat.id);
      const requiredItems = allowanceFor(cat.id);
      const selectedItems = itemsFor(cat.id).length;

      let missing = 0;
      if (chosenVendors.length === 0) {
        missing = requiredItems;
      } else {
        missing = Math.max(0, requiredItems - selectedItems);
      }

      if (missing > 0) {
        result.push({
          id: cat.id,
          name: catName,
          missingCount: missing,
        });
      }
    }

    return result;
  };

  // Every dish actually picked across the plated + live courses, vendor-filtered
  // so a stale pick from a now-hidden vendor never counts (mirrors `itemsFor`).
  const pickedItemCount = activeCategories.reduce(
    (n, c) => n + itemsFor(c.id).length,
    0,
  );
  // Courses fully built (vendor + whole dish quota) — the bar the fixed packages
  // hold to, since those tiers ship a set menu the guest is meant to complete.
  const builtCount = activeCategories.filter(categoryComplete).length;
  // An order must carry something billable, enforced on the details/extras step.
  // Fixed packages need at least one *complete* course (or an extra). Single
  // Stall is build-your-own, so there any single picked dish — or a
  // skip-every-stall add-ons-only order — is enough.
  const orderHasItems =
    selectedAddOns.length > 0 ||
    (singleStall ? pickedItemCount > 0 : builtCount > 0);
  // "Step done" = every stall on that step resolved (built or skipped). Skipping
  // is allowed on Custom — the guest just moves on. On the fixed tiers nothing is
  // skippable, so these reduce to "every course complete". `menuComplete` gates
  // the Menu step (2); `liveComplete` gates the Live Stall step (3) and is
  // trivially true when the package has no live stalls (Silver).
  const menuComplete = menuStepCategories.every(categoryResolved);
  const liveComplete = liveStallCategories.every(categoryResolved);
  // Single Stall guest who skipped every plated course on the Menu step — none
  // built, all resolved-by-skip. Drives the step-2 reassurance banner (they'll
  // still pick live counters / add-ons on the next steps). Scoped to the plated
  // courses now that live stalls live on their own step.
  const menuFullySkipped =
    singleStall &&
    menuComplete &&
    menuStepCategories.every((c) => !categoryComplete(c));

  // Skip a stall (Single Stall plan): drop any picks so it bills nothing and
  // never counts as "built", then mark it skipped so it stops blocking Continue.
  const skipCat = (catId: string) => {
    setCategoryVendor((m) => ({ ...m, [catId]: [] }));
    setCategoryItems((m) => ({ ...m, [catId]: [] }));
    setSkippedCats((s) => (s.includes(catId) ? s : [...s, catId]));
  };
  const unskipCat = (catId: string) =>
    setSkippedCats((s) => s.filter((id) => id !== catId));

  const pickVendor = (catId: string, vendorId: string) => {
    // Picking a vendor for a skipped stall means the guest changed their mind —
    // fold it back into the order.
    if (skippedCats.includes(catId)) unskipCat(catId);
    const current = vendorsFor(catId);
    if (!multiVendorFor(catId)) {
      // Single-vendor tiers: switching vendor replaces the choice and its items.
      setCategoryVendor((m) => ({ ...m, [catId]: [vendorId] }));
      setCategoryItems((m) => ({ ...m, [catId]: [] }));
      return;
    }
    // Platinum: toggle the vendor in/out of the per-segment selection.
    if (current.includes(vendorId)) {
      setCategoryVendor((m) => ({
        ...m,
        [catId]: current.filter((id) => id !== vendorId),
      }));
      // Drop any items that belonged to the de-selected vendor.
      setCategoryItems((m) => ({
        ...m,
        [catId]: itemsFor(catId).filter((id) => !id.startsWith(`${vendorId}-`)),
      }));
    } else {
      setCategoryVendor((m) => ({ ...m, [catId]: [...current, vendorId] }));
    }
  };

  const toggleItem = (catId: string, itemId: string) => {
    // Fixed stalls aren't customisable — the UI renders their dishes as a
    // read-only spread, and this backstops any other path into the toggle.
    const owner = vendorOfItem(catId, itemId);
    const ownerVendor = activeCategories
      .find((c) => c.id === catId)
      ?.vendors.find((v) => v.id === owner);
    if (ownerVendor && isFixedStall(ownerVendor)) return;
    const cur = itemsFor(catId);
    if (cur.includes(itemId)) {
      setCategoryItems((m) => ({ ...m, [catId]: cur.filter((x) => x !== itemId) }));
      return;
    }
    // The cap is the owning caterer's own quota, so two stalls on one course
    // can open different numbers of dishes.
    const vid = vendorOfItem(catId, itemId);
    const base = baseAllowanceFor(catId, vid);
    if (multiVendorFor(catId)) {
      // Per-vendor cap — each vendor may fill its own quota independently.
      if (vid && vendorPicks(catId, vid).length >= base) return;
    } else if (cur.length >= base) {
      return; // at the package cap
    }
    setCategoryItems((m) => ({ ...m, [catId]: [...cur, itemId] }));
  };

  // Remove one vendor's picks from a course, straight from the review step's
  // "Your Menu" card — drops the vendor and every item scoped to it (item ids
  // are `${vendorId}-…`), leaving any other vendors on the course untouched.
  const removeVendor = (catId: string, vendorId: string) => {
    setCategoryVendor((m) => ({
      ...m,
      [catId]: (m[catId] ?? []).filter((id) => id !== vendorId),
    }));
    setCategoryItems((m) => ({
      ...m,
      [catId]: (m[catId] ?? []).filter((id) => !id.startsWith(`${vendorId}-`)),
    }));
  };

  // Jump from the review step back to the exact course a guest wants to change.
  // Plated courses live on the Menu step (2), live stations on the Live Stall
  // step (3) — route to the right step and focus that course's tab.
  const editCourse = (catId: string) => {
    if (isLiveStallCategory(catId)) {
      const i = liveStallCategories.findIndex((c) => c.id === catId);
      if (i >= 0) setLiveCat(i);
      setStep(3);
    } else {
      const i = menuStepCategories.findIndex((c) => c.id === catId);
      if (i >= 0) setActiveCat(i);
      setStep(2);
    }
  };

  /* ─── Derived pricing ──────────────────────────────────────────────── */
  const selectedPackage: PackageTier | undefined = packages.find(
    (p) => p.id === packageId,
  );
  const basePerPlate = packageBasePerPlate[packageId] ?? 0;

  // Guest bounds are per-package (Silver 50–300, Gold 150–10k, Platinum 50–50k);
  // Custom and any tier without explicit limits fall back to the global range.
  const paxMin = selectedPackage?.minPax ?? MIN_GUESTS;
  const paxMax = selectedPackage?.maxPax ?? MAX_GUESTS;

  // Switching package can leave the headcount outside the new tier's range —
  // pull it back in so the order stays bookable (e.g. Gold→Silver caps 500→300).
  // Gated on `packageChosen`: until the guest actually picks a tier, `packageId`
  // is only the seeded "popular" default (Gold, minPax 150), and clamping to it
  // would silently rewrite a headcount the guest *did* choose — a Hero search
  // for 100 guests landed on /book showing 150, quoting a bigger order than was
  // asked for. An unchosen tier must not overrule an explicit guest count.
  useEffect(() => {
    if (!packageChosen) return;
    setGuests((g) => Math.max(paxMin, Math.min(paxMax, g)));
  }, [paxMin, paxMax, packageChosen]);

  const categoryAddTotal = useMemo<number>(
    () =>
      activeCategories.reduce((sum, cat) => {
        const chosen = categoryVendor[cat.id] ?? [];
        // Each selected premium vendor adds its per-plate uplift.
        return (
          sum +
          cat.vendors
            .filter((v) => chosen.includes(v.id))
            .reduce((s, v) => s + v.perPlate, 0)
        );
      }, 0),
    [categoryVendor, activeCategories],
  );

  // Single Stall bills by the stall's menu style: a fixed stall is one set
  // spread at its own per-plate rate, a varied stall bills per selected
  // delicacy — each dish's own price, or the course per-plate when the vendor
  // left it blank ("pay only for what you select"). The fixed feast tiers keep
  // the flat per-vendor uplift above.
  const singleStallMenuTotal = useMemo<number>(() => {
    if (!singleStall) return 0;
    return activeCategories.reduce((sum, cat) => {
      const chosen = categoryVendor[cat.id] ?? [];
      const picks = categoryItems[cat.id] ?? [];
      return (
        sum +
        cat.vendors
          .filter((v) => chosen.includes(v.id))
          .reduce(
            (s, v) =>
              s +
              (v.menuType !== "varied"
                ? v.perPlate
                : v.items
                    .filter((it) => picks.includes(it.id))
                    .reduce((acc, it) => acc + (it.price ?? v.perPlate), 0)),
            0,
          )
      );
    }, 0);
  }, [singleStall, categoryVendor, categoryItems, activeCategories]);

  // The menu's per-plate contribution: per-dish for Single Stall, per-vendor for
  // the fixed tiers. Everything downstream (subtotal, invoice, summary) reads it.
  const menuAddTotal = singleStall ? singleStallMenuTotal : categoryAddTotal;

  const perPlate = basePerPlate + menuAddTotal;
  const subtotal = perPlate * guests;

  const addOnsTotal = useMemo<number>(
    () =>
      addOns
        .filter((a) => selectedAddOns.includes(a.id))
        .reduce((sum, a) => sum + (a.perPlate ? a.price * guests : a.price), 0),
    [selectedAddOns, guests],
  );

  // The chosen service package and the amount it adds to the feast: its
  // per-guest floor × headcount (a flat fee when the tier isn't per-guest). A
  // ₹0 tier (e.g. Essential) adds nothing. Taxed like the venue fee, but not
  // coupon-discounted.
  const selectedService = services.find((s) => s.id === serviceId);
  const serviceTotal = selectedService
    ? selectedService.perPlate
      ? selectedService.priceMin * guests
      : selectedService.priceMin
    : 0;

  // Vendors a guest may assign to an add-on — the existing catalogue narrowed to
  // the tier(s) the chosen package unlocks (Custom / short-notice: everyone).
  const eligibleAddOnVendors = useMemo<VendorListing[]>(() => {
    const tiers = PACKAGE_VENDOR_TIERS[packageId];
    return tiers
      ? vendorListings.filter((v) => v.tiers.some((t) => tiers.includes(t)))
      : vendorListings;
  }, [packageId]);

  // The vendor(s) effectively assigned to an add-on. We honour the guest's
  // explicit picks that are still valid for the current package tier; when none
  // survive we fall back to the first eligible vendor (so a selected counter is
  // never vendorless). Single-vendor tiers always yield one id; multi-vendor
  // tiers (Platinum always, big Gold) may yield several. Deriving this at read
  // time (rather than reconciling stored state in an effect) keeps it correct
  // when the package — and therefore the eligible roster — changes.
  const addOnVendorIds = (addOnId: string): string[] => {
    const chosen = (addOnVendor[addOnId] ?? []).filter((id) =>
      eligibleAddOnVendors.some((v) => v.id === id),
    );
    // Off Platinum a counter holds a single vendor — trim any extra a prior
    // Platinum (or big-Gold) selection left behind when the package changed.
    const capped = counterMultiVendor ? chosen : chosen.slice(0, 1);
    if (capped.length) return capped;
    const first = eligibleAddOnVendors[0]?.id;
    return first ? [first] : [];
  };

  const addOnVendorNames = (addOnId: string): string[] =>
    addOnVendorIds(addOnId)
      .map((id) => eligibleAddOnVendors.find((v) => v.id === id)?.name)
      .filter((n): n is string => Boolean(n));

  // Assign / unassign a vendor to a counter. Single-vendor packages replace the
  // pick; only Platinum toggles it in/out — but always keeps at least one
  // vendor on a selected counter.
  const toggleAddOnVendor = (addOnId: string, vendorId: string) => {
    if (!counterMultiVendor) {
      setAddOnVendor((m) => ({ ...m, [addOnId]: [vendorId] }));
      return;
    }
    const current = addOnVendorIds(addOnId);
    const next = current.includes(vendorId)
      ? current.filter((id) => id !== vendorId)
      : [...current, vendorId];
    setAddOnVendor((m) => ({ ...m, [addOnId]: next.length ? next : current }));
  };

  // Toggle an add-on; clearing one also drops any explicit vendor pick for it.
  const toggleAddOn = (id: string) => {
    if (selectedAddOns.includes(id)) {
      setSelectedAddOns(selectedAddOns.filter((x) => x !== id));
      setAddOnVendor((m) => {
        if (!(id in m)) return m;
        const next = { ...m };
        delete next[id];
        return next;
      });
    } else {
      setSelectedAddOns([...selectedAddOns, id]);
    }
  };

  /* ─── Advance-booking lead time ────────────────────────────────────── */
  // Silver/Gold/Platinum carry a fixed package lead (7/21/30 days). The Custom
  // single-stall plan has NO fixed lead — its notice is "as per vendor
  // specification": the longest lead among the stalls the guest actually picked
  // (each vendor's `leadDays`, default 2; same-day stalls set 0). So a Custom
  // order can go same-day when every chosen vendor allows it, but needs 2 days'
  // notice the moment one standard 2-day stall is in the mix.
  const customLeadDays = ((): number => {
    let lead = 0;
    let picked = false;
    // Course (single-stall) vendors chosen per segment.
    for (const cat of menuCategories) {
      for (const vid of categoryVendor[cat.id] ?? []) {
        const v = cat.vendors.find((x) => x.id === vid);
        if (v) {
          picked = true;
          lead = Math.max(lead, vendorLeadDays(v));
        }
      }
    }
    // Catalogue vendors assigned to selected add-ons / live counters — a counter
    // may now be split across several vendors, so honour the longest lead.
    for (const addOnId of selectedAddOns) {
      for (const vId of addOnVendorIds(addOnId)) {
        const v = eligibleAddOnVendors.find((x) => x.id === vId);
        if (v) {
          picked = true;
          lead = Math.max(lead, vendorLeadDays(v));
        }
      }
    }
    // Nothing chosen yet → the baseline notice, so an empty Custom order still
    // can't be locked in for tomorrow.
    return picked ? lead : DEFAULT_VENDOR_LEAD_DAYS;
  })();

  // The occasion carries its own minimum notice (a wedding needs far more lead
  // than a birthday) — admin-editable per occasion, resolved from the live list.
  const occasionLead = occasionLeadFor(occasionId, occasionList);
  // The package's own notice: the fixed tier lead, or the vendor-derived lead
  // for Custom.
  const packageLead =
    packageId === "custom" ? customLeadDays : (packageLeadDays[packageId] ?? 0);
  // Effective advance notice the chosen date must clear — the stricter of the
  // package and the occasion. Occasion mapping only ever *raises* the floor, so
  // "Wedding" can no longer be locked in for tomorrow on a short-lead package.
  const effectiveLeadDays = Math.max(packageLead, occasionLead);

  // Does the chosen date clear that notice? Empty date is treated as fine (the
  // guest hasn't committed one yet). When it falls short we warn and block
  // "Next" rather than silently swapping the package.
  const daysToEvent = daysUntil(eventDate);
  const dateMeetsLead = daysToEvent === null || daysToEvent >= effectiveLeadDays;
  const earliestDate = isoAfterDays(effectiveLeadDays);
  // The date picker's floor is just "today" (no past dates) — NOT the lead-time
  // earliest (the EventBar's DatePicker uses `minDaysAhead={0}`). A lead-based
  // floor greys out every near date, which reads as "I can't select a date"
  // (esp. Gold/Platinum's 21/30-day leads). Instead we let the guest pick freely
  // and lean on the soft path: `leadWarning` explains the shortfall inline and
  // `dateMeetsLead` blocks "Next" on the details step. Keep them in sync — don't
  // re-tighten the picker floor to earliestDate.
  // When the occasion is the binding constraint, name it — otherwise the guest
  // is told "this package needs 30 days" when it's really the wedding.
  const leadOccasion = occasionLead > packageLead ? resolveOccasion(occasionId) : undefined;
  const leadWarning =
    eventDate === "" || dateMeetsLead
      ? ""
      : leadOccasion
        ? t(
            `A ${leadOccasion.name} needs ${effectiveLeadDays} days' notice. Pick a date on or after ${formatEventDate(earliestDate)}.`,
            `${leadOccasion.nameHi} के लिए ${effectiveLeadDays} दिन का अग्रिम समय चाहिए। ${formatEventDate(earliestDate)} या उसके बाद की तारीख़ चुनें।`,
          )
        : packageId === "custom"
          ? t(
              `Your single-stall order needs ${effectiveLeadDays} ${effectiveLeadDays === 1 ? "day" : "days"}' notice for the vendors you picked. Choose a date on or after ${formatEventDate(earliestDate)}, or swap in same-day vendors.`,
              `आपके चुने वेंडरों के लिए ${effectiveLeadDays} दिन का अग्रिम समय चाहिए। ${formatEventDate(earliestDate)} या उसके बाद की तारीख़ चुनें, या सेम-डे वेंडर चुनें।`,
            )
          : t(
              `${selectedPackage?.name ?? "This package"} needs ${effectiveLeadDays} days' notice. Pick a date on or after ${formatEventDate(earliestDate)}, or choose a package with a shorter lead time.`,
              `${selectedPackage?.name ?? "इस पैकेज"} के लिए ${effectiveLeadDays} दिन का अग्रिम समय चाहिए। ${formatEventDate(earliestDate)} या उसके बाद की तारीख़ चुनें, या कम अग्रिम समय वाला पैकेज चुनें।`,
            );

  const preDiscount = subtotal + addOnsTotal;
  const couponDiscount = appliedCoupon
    ? Math.min((preDiscount * appliedCoupon.percent) / 100, appliedCoupon.cap)
    : 0;
  // A recognised Individual / Event Planner referral code gives the customer the
  // admin-set discount off the pre-tax catering bill. It's dropped for an
  // unknown code (no resolved referrer), a Venue Owner code, or a self-referral
  // — the same cases where the booking isn't credited. Stacks with a coupon but
  // never takes off more than what's left of the catering base.
  const referralCustomerPercent =
    !selfReferral && referralCode.trim() && referrerName
      ? customerPercentFor(referralRates, referrerType)
      : 0;
  const referralDiscount = Math.max(
    0,
    Math.min(
      Math.round((preDiscount * referralCustomerPercent) / 100),
      preDiscount - couponDiscount,
    ),
  );
  const discount = couponDiscount + referralDiscount;
  // The venue booking fee and the feast-wide service package are taxed
  // alongside the catering but aren't subject to the catering coupon.
  const taxable = preDiscount - discount + venueFee + serviceTotal;
  const gst = taxable * GST_RATE;
  const grandTotal = taxable + gst;

  // Deterministic booking id derived from state (no random / time).
  const totalItems = Object.values(categoryItems).reduce(
    (n, arr) => n + arr.length,
    0,
  );
  const bookingId = `BHJ-${(
    ((guests * 7 + Math.round(grandTotal) + totalItems * 13) % 90000) +
    10000
  ).toString()}`;

  /* ─── Validation per step ──────────────────────────────────────────── */
  const stepValid = (s: number): boolean => {
    switch (s) {
      case 1:
        // A seeded "popular" tier is not a decision — require a real pick so a
        // guest never advances (and gets quoted) on a package they never chose.
        // The `nextBlockers` copy below spells this out.
        return packageId !== "" && packageChosen;
      case 2:
        // Menu step — can proceed if at least one selection has been made (or no categories)
        return menuStepCategories.length === 0 || hasStepAnySelection(menuStepCategories);
      case 3:
        // Live Stall step — can proceed if no live stalls, or at least one selection has been made
        return !hasLiveStalls || liveStallCategories.length === 0 || hasStepAnySelection(liveStallCategories);
      case 4:
        return (
          occasionId !== "" &&
          guests >= paxMin &&
          guests <= paxMax &&
          eventDate !== "" &&
          dateMeetsLead &&
          // An add-ons-only order (menu fully skipped) must pick at least one
          // extra here, so a booking is never entirely empty.
          orderHasItems
        );
      case 5:
        // A service package is mandatory — but never dead-end the guest if the
        // admin has somehow cleared the list.
        return services.length === 0 || serviceId !== "";
      default:
        return true;
    }
  };
  const canNext = stepValid(step);

  // When "Next" is disabled, spell out exactly what's still required on this
  // step so the guest isn't staring at a dead button with no clue what to do.
  const nextBlockers = ((): string[] => {
    if (canNext) return [];
    if (step === 1) {
      return [t("Choose a package", "एक पैकेज चुनें")];
    }
    if (step === 4) {
      const out: string[] = [];
      if (!orderHasItems)
        out.push(
          t(
            "Your menu is empty — add at least one live counter or extra below.",
            "आपका मेन्यू खाली है — नीचे कम से कम एक लाइव काउंटर या एक्स्ट्रा जोड़ें।",
          ),
        );
      if (occasionId === "") out.push(t("Select an occasion", "अवसर चुनें"));
      if (eventDate === "") out.push(t("Pick an event date", "इवेंट की तारीख़ चुनें"));
      else if (!dateMeetsLead && leadWarning) out.push(leadWarning);
      if (guests < paxMin || guests > paxMax) {
        out.push(
          t(
            `Set guests between ${inr.format(paxMin)} and ${inr.format(paxMax)}`,
            `मेहमानों की संख्या ${inr.format(paxMin)} से ${inr.format(paxMax)} के बीच रखें`,
          ),
        );
      }
      return out;
    }
    if (step === 5) {
      return serviceId === ""
        ? [t("Choose a service package", "एक सर्विस पैकेज चुनें")]
        : [];
    }
    return [];
  })();

  /* ─── Handlers ─────────────────────────────────────────────────────── */

  const applyCouponCode = (raw: string) => {
    const code = raw.trim().toUpperCase();
    const found = coupons.find((c) => c.code.toUpperCase() === code);
    if (found) {
      setAppliedCoupon(found);
      setCouponInput(found.code);
      setCouponError("");
    } else {
      setAppliedCoupon(null);
      setCouponError(t("Invalid coupon code.", "अमान्य कूपन कोड।"));
    }
  };

  const applyCoupon = () => applyCouponCode(couponInput);

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  // A plain-text receipt for THIS order — used both for the download action and
  // for the saved booking that appears on the My Bookings page.
  // The EMI plan to record on the order: the balance left after the advance,
  // split into the chosen number of instalments. Only meaningful once the guest
  // has paid an advance (not the full bill) and picked a real multi-EMI count —
  // it's track-only, so this is purely a schedule our team collects against.
  const buildEmiPlanForOrder = (
    paid: number = paidAmount,
  ): EmiPlan | undefined => {
    const total = Math.round(grandTotal);
    const balance = total - paid;
    if (emiCount <= 1 || paid <= 0 || balance <= 0) return undefined;
    if (!emiOptionsForEvent(eventDate).includes(emiCount)) return undefined;
    return buildEmiPlan(balance, emiCount, eventDate);
  };

  const buildReceipt = (): string => {
    const occ = resolveOccasion(occasionId);
    const cityObj = resolveCity(cityId);
    const pkg = packages.find((p) => p.id === packageId);
    const menuLines = activeCategories
      .map((cat) => {
        const chosen = categoryVendor[cat.id] ?? [];
        return cat.vendors
          .filter((v) => chosen.includes(v.id))
          .map((v) => {
            const picks = v.items
              .filter((it) => itemsFor(cat.id).includes(it.id))
              .map((it) => it.name);
            return picks.length
              ? `  • ${cat.name} — ${v.name}: ${picks.join(", ")}`
              : "";
          })
          .filter(Boolean)
          .join("\n");
      })
      .filter(Boolean)
      .join("\n");
    const addOnLines = addOns
      .filter((a) => selectedAddOns.includes(a.id))
      .map((a) => {
        const vendor = addOnVendorNames(a.id).join(", ");
        return vendor ? `  • ${a.name} — ${vendor}` : `  • ${a.name}`;
      })
      .join("\n");

    const lines = [
      "BHOJPATRA — BOOKING RECEIPT",
      `Booking ID: ${bookingId}`,
      "",
      `Occasion: ${occ ? occ.name : "-"}`,
      `Package:  ${pkg ? pkg.name : "-"}`,
      `Date:     ${eventDate || "-"}`,
      `Serving:  ${servingTimeLabel(mealTime, eventTime) || "-"}`,
      `Food:     ${foodPreference || "-"}`,
      `City:     ${cityObj ? cityObj.name : "-"}`,
      `Venue:    ${venue || "-"}`,
      `Guests:   ${guests}`,
      "",
      "Menu:",
      menuLines || "  -",
      "",
    ];
    if (addOnLines) lines.push("Add-ons:", addOnLines, "");
    lines.push(
      `Subtotal:    ${money(subtotal)}`,
      `Add-ons:     ${money(addOnsTotal)}`,
    );
    if (selectedService)
      lines.push(`Service:     ${selectedService.name} (${money(serviceTotal)})`);
    if (venueFee > 0) lines.push(`Venue Fee:   ${money(venueFee)}`);
    if (discount > 0) lines.push(`Discount:    - ${money(discount)}`);
    lines.push(`GST (18%):   ${money(gst)}`);
    if (guests > 0)
      lines.push(
        `Per Plate:   ≈ ${money(perPlateCost(grandTotal, guests))} × ${guests} guests`,
      );
    lines.push(`Grand Total: ${money(grandTotal)}`);
    const emiPlan = buildEmiPlanForOrder();
    if (emiPlan) {
      lines.push(
        "",
        `Advance Paid: ${money(paidAmount)}`,
        "Payment Plan (EMI):",
        formatEmiPlanText(emiPlan),
      );
    }
    return lines.join("\n");
  };

  // Itemised invoice data for THIS order — drives the PDF invoice download and
  // is stored on the booking so it can be re-downloaded from My Bookings.
  const buildInvoice = (paid: number = paidAmount): InvoiceData => {
    const occ = resolveOccasion(occasionId);
    const cityObj = resolveCity(cityId);
    const pkg = packages.find((p) => p.id === packageId);

    const menu: InvoiceData["menu"] = activeCategories
      .map((cat) => {
        const chosen = categoryVendor[cat.id] ?? [];
        const items = cat.vendors
          .filter((v) => chosen.includes(v.id))
          .map((v) => {
            const picks = v.items
              .filter((it) => itemsFor(cat.id).includes(it.id))
              .map((it) => it.name);
            return picks.length ? `${v.name}: ${picks.join(", ")}` : "";
          })
          .filter(Boolean)
          .join(" · ");
        return items ? { heading: cat.name, items } : null;
      })
      .filter((g): g is InvoiceData["menu"][number] => g !== null);

    const lines: InvoiceData["lines"] = [
      {
        label: `${pkg?.name ?? "Package"} base (${money(basePerPlate)}/plate × ${guests})`,
        amount: basePerPlate * guests,
      },
    ];
    if (menuAddTotal > 0) {
      lines.push({
        label: singleStall
          ? `Single Stall menu (${money(menuAddTotal)}/plate × ${guests})`
          : `Premium vendor add-ons (${money(menuAddTotal)}/plate × ${guests})`,
        amount: menuAddTotal * guests,
      });
    }
    addOns
      .filter((a) => selectedAddOns.includes(a.id))
      .forEach((a) => {
        const vendor = addOnVendorNames(a.id).join(", ");
        const name = vendor ? `${a.name} — ${vendor}` : a.name;
        lines.push({
          label: a.perPlate
            ? `${name} (${money(a.price)}/plate × ${guests})`
            : name,
          amount: a.perPlate ? a.price * guests : a.price,
        });
      });

    if (selectedService) {
      lines.push({
        label: selectedService.perPlate
          ? `Service — ${selectedService.name} (${money(selectedService.priceMin)}/guest × ${guests})`
          : `Service — ${selectedService.name}`,
        amount: serviceTotal,
      });
    }

    if (venueFee > 0) {
      lines.push({
        label: `${venue || "Venue"} — venue booking fee`,
        amount: venueFee,
      });
    }

    return {
      id: bookingId,
      dateLabel: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      // Bill To — the customer's contact so the invoice names who it's for.
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      occasion: occ?.name ?? "Feast",
      eventDate: eventDate ? formatEventDate(eventDate) : "-",
      // Meal period + clock time (e.g. "Dinner · 7:30 PM"); omitted when unset so
      // the invoice's "Serving time" line only shows for orders that carry one.
      servingTime: servingTimeLabel(mealTime, eventTime) || undefined,
      foodPreference: foodPreference || undefined,
      city: cityObj?.name ?? "-",
      venue: venue || "-",
      guests,
      packageName: pkg?.name ?? "-",
      lines,
      menu,
      subtotal,
      addOnsTotal,
      discount,
      gst,
      grandTotal,
      paid,
    };
  };

  // Download this order as a branded PDF invoice (not the whole page).
  const downloadMenu = () => {
    downloadInvoice(buildInvoice());
  };

  const buildWhatsAppMessage = (): string => {
    const occ = resolveOccasion(occasionId);
    const city = resolveCity(cityId);
    const pkg = packages.find((p) => p.id === packageId);
    const menuLines = activeCategories
      .map((cat) => {
        const chosen = categoryVendor[cat.id] ?? [];
        const lines = cat.vendors
          .filter((v) => chosen.includes(v.id))
          .map((v) => {
            const picks = v.items
              .filter((it) => itemsFor(cat.id).includes(it.id))
              .map((it) => it.name);
            return picks.length
              ? `${cat.name} — ${v.name}: ${picks.join(", ")}`
              : "";
          })
          .filter(Boolean);
        return lines.join("\n");
      })
      .filter(Boolean)
      .join("\n");
    const addOnLines = addOns
      .filter((a) => selectedAddOns.includes(a.id))
      .map((a) => {
        const vendor = addOnVendorNames(a.id).join(", ");
        return vendor ? `${a.name} (${vendor})` : a.name;
      })
      .join(", ");
    // Surface the booking advance so the team sees, at a glance, whether a 10%
    // advance has already been settled and what balance is still outstanding.
    const advance = Math.round(grandTotal * ADVANCE_RATE);
    const balance = Math.max(0, Math.round(grandTotal) - paidAmount);
    const paymentLines =
      paidAmount > 0
        ? `\nPaid${paidAmount >= Math.round(grandTotal) ? " (full)" : " (advance)"}: ${money(paidAmount)}\nBalance Due: ${money(balance)}` +
          (paymentRef ? `\nTransaction Ref: ${paymentRef}` : "")
        : `\nAdvance to confirm (10%): ${money(advance)}`;
    const contactLines =
      (customerName.trim() ? `Name: ${customerName.trim()}\n` : "") +
      (customerPhone.trim() ? `Phone: ${customerPhone.trim()}\n` : "") +
      (customerEmail.trim() ? `Email: ${customerEmail.trim()}\n` : "");
    const emiPlan = buildEmiPlanForOrder();
    const emiLines = emiPlan ? `\nPayment Plan (EMI):\n${formatEmiPlanText(emiPlan)}` : "";
    return (
      `Bhojpatra Feast Enquiry (${bookingId})\n` +
      contactLines +
      `Payment: ${ORDER_PAYMENT_LABELS[payMethod].en}\n` +
      `Occasion: ${occ ? occ.name : "-"}\n` +
      `Package: ${pkg ? `${pkg.name} (${pkg.price}${pkg.unit})` : "-"}\n` +
      `Date: ${eventDate || "-"}\n` +
      (servingTimeLabel(mealTime, eventTime)
        ? `Serving: ${servingTimeLabel(mealTime, eventTime)}\n`
        : "") +
      (foodPreference ? `Food: ${foodPreference}\n` : "") +
      `City: ${city ? city.name : "-"}\n` +
      `Venue: ${venue || "-"}\n` +
      `Guests: ${guests}\n` +
      (menuLines ? `\nMenu:\n${menuLines}\n` : "") +
      (addOnLines ? `\nAdd-ons: ${addOnLines}\n` : "") +
      (selectedService
        ? `\nService: ${selectedService.name} (${money(serviceTotal)})\n`
        : "") +
      (guests > 0
        ? `\nPer Plate: ≈ ${money(perPlateCost(grandTotal, guests))} × ${guests} guests`
        : "") +
      `\nGrand Total: ${money(grandTotal)}` +
      paymentLines +
      emiLines
    );
  };
  const whatsappHref = `https://wa.me/919918359017?text=${encodeURIComponent(
    buildWhatsAppMessage(),
  )}`;

  const router = useRouter();

  // Leaving this flow for the Single Stall one. That flow starts on the Brands
  // page — the stall is chosen there, from a brand's own Book Now — so the event
  // brief can't ride along in the URL the way it used to: the Brands page would
  // drop it. It's seeded into the Single Stall draft instead, which that wizard
  // rehydrates whenever the guest arrives from a brand.
  const goSingleStall = () => {
    seedStallDraftBrief({
      occasionId,
      customOccasion:
        occasionId === OTHER_OCCASION_ID ? customOccasion.trim() : "",
      eventDate,
      mealTime,
      eventTime,
      foodPreference,
      guests,
      venue: venue.trim(),
      venueFee,
    });
    // The city rides on the shared location store the Brands page already reads,
    // so it needs no hand-off of its own.
    const p = new URLSearchParams({ category: "single-stall" });
    if (referralCode.trim()) p.set("ref", referralCode.trim());
    router.push(`/vendors?${p.toString()}`);
  };

  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  // Wipe the saved draft and every in-progress pick, dropping the guest back to a
  // pristine Step 1. A hard navigation (not router.push) forces a full remount so
  // all wizard state resets — with the draft already cleared, nothing rehydrates.
  const startOver = () => {
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      t(
        "Start over? This clears your current booking selections.",
        "फिर से शुरू करें? इससे आपकी वर्तमान बुकिंग चयन हट जाएँगे।",
      ),
    );
    if (!ok) return;
    clearBookingDraft();
    window.location.assign("/book");
  };
  const goBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/vendors");
    }
  };

  // Menu-step (2) course navigation that spills into wizard steps at the edges:
  // back off the first course returns to Package; past the last advances to the
  // Live Stall step.
  const menuPrev = () => {
    if (activeCat > 0) setActiveCat((c) => c - 1);
    else goBack();
  };
  const menuNext = () => {
    if (activeCat < menuStepCategories.length - 1) setActiveCat((c) => c + 1);
    else if (hasStepAnySelection(menuStepCategories)) goNext();
  };
  // Live Stall-step (3) navigation — the same walk over the live-station courses.
  // Back off the first returns to Menu; past the last advances to Add-ons.
  const livePrev = () => {
    if (liveCat > 0) setLiveCat((c) => c - 1);
    else goBack();
  };
  const liveNext = () => {
    if (liveCat < liveStallCategories.length - 1) setLiveCat((c) => c + 1);
    else if (!hasLiveStalls || hasStepAnySelection(liveStallCategories)) goNext();
  };
  // Single Stall: skip the current stall and slide on to the next one. On the
  // last stall there's nowhere to advance — skipping just resolves it so the
  // Continue button below can light up. Works for either step's course list.
  const skipCurrentStall = () => {
    const cat = menuStepCategories[activeCat];
    if (!cat) return;
    skipCat(cat.id);
    if (activeCat < menuStepCategories.length - 1) setActiveCat((c) => c + 1);
  };
  const skipCurrentLiveStall = () => {
    const cat = liveStallCategories[liveCat];
    if (!cat) return;
    skipCat(cat.id);
    if (liveCat < liveStallCategories.length - 1) setLiveCat((c) => c + 1);
  };
  // Single Stall: skip the whole menu in one go and jump to the extras step to
  // build an add-ons-only order. Skips every course (plated + live, so nothing
  // is billed from the menu), then jumps straight to Add-ons (Step 4).
  const skipMenuEntirely = () => {
    activeCategories.forEach((c) => skipCat(c.id));
    setActiveCat(0);
    setLiveCat(0);
    setStep(4);
  };

  // Confirm the request and save it so it shows up on the My Bookings page and,
  // via /api/bookings, in the admin booking console — carrying the chosen
  // payment method and whatever the guest paid up front (a 10% advance, the
  // full total, or nothing for COD / "connect"). Our team reaches out to
  // finalise the menu and collect any balance.
  // `paidOverride` / `refOverride` let the online flow confirm the booking in the
  // same click that records the advance — the freshly-recorded amount + UTR are
  // passed straight through, since the `paidAmount` / `paymentRef` state they'd
  // otherwise read hasn't re-rendered yet. Called with no args by the Connect
  // (pay-later) confirm button, which just uses the current state (nothing paid).
  const handleConfirm = async (paidOverride?: number, refOverride?: string) => {
    setConfirmError("");
    // Contact is required so a "Bhojpatra connects you" order is actionable.
    if (!customerName.trim()) {
      setConfirmError(t("Please enter your name.", "कृपया अपना नाम दर्ज करें।"));
      return;
    }
    if (customerPhone.replace(/\D/g, "").length < 10) {
      setConfirmError(
        t("Please enter a valid phone number.", "कृपया सही फ़ोन नंबर दर्ज करें।"),
      );
      return;
    }
    if (!isValidEmail(customerEmail)) {
      setConfirmError(
        t("Please enter a valid email address.", "कृपया सही ईमेल पता दर्ज करें।"),
      );
      return;
    }

    setConfirming(true);
    const occ = resolveOccasion(occasionId);
    const cityObj = resolveCity(cityId);
    // Unique vendor names across every chosen course, plus any vendor assigned
    // to a selected add-on / counter.
    const vendorNames = Array.from(
      new Set(
        [
          ...activeCategories.flatMap((cat) => {
            const chosen = categoryVendor[cat.id] ?? [];
            return cat.vendors
              .filter((v) => chosen.includes(v.id))
              .map((v) => v.name);
          }),
          ...selectedAddOns.flatMap((id) => addOnVendorNames(id)),
        ],
      ),
    );
    const vendorLabel =
      vendorNames.join(", ") || (selectedPackage?.name ?? "Bhojpatra");

    // The same vendors as {id, name} pairs, retained on the order so each can be
    // rated individually later (My Bookings). Deduped by catalogue id.
    const bookedVendors = Array.from(
      new Map(
        [
          ...activeCategories.flatMap((cat) => {
            const chosen = categoryVendor[cat.id] ?? [];
            return cat.vendors
              .filter((v) => chosen.includes(v.id))
              .map((v) => ({ id: v.id, name: v.name }));
          }),
          ...selectedAddOns.flatMap((id) =>
            addOnVendorIds(id).flatMap((vId) => {
              const v = eligibleAddOnVendors.find((x) => x.id === vId);
              return v ? [{ id: v.id, name: v.name }] : [];
            }),
          ),
        ].map((v) => [v.id, v] as const),
      ).values(),
    );

    // Use the just-paid amount (auto-confirm passes it in before the `paidAmount`
    // state has flushed) so the EMI plan is computed against the real balance.
    const orderPaid = paidOverride ?? paidAmount;
    const orderPaymentRef = refOverride ?? paymentRef;
    const emiPlan = buildEmiPlanForOrder(orderPaid);
    // A booking is Confirmed once the advance is paid outright; an EMI plan
    // leaves the 90% balance financed over instalments, so the order stays
    // Pending until that balance is settled (paid off from My Bookings, or by
    // the team collecting each instalment).
    const orderStatus: BookingStatus = emiPlan ? "Pending" : "Confirmed";

    // Freeze the snapshot with the amount actually settled this click — the
    // auto-confirm path passes the advance via `orderPaid` before `paidAmount`
    // state has flushed, so read it here rather than the (still-stale) state.
    const invoiceData = buildInvoice(orderPaid);

    // Persist to the orders backend — the single source of truth (admin console,
    // the customer's My Bookings, the owner dashboard). The full record is sent,
    // including the receipt / invoice / vendors the My Bookings view needs. The
    // order MUST land server-side, so a failure surfaces an error and keeps the
    // guest on the confirm step to retry rather than showing a false success.
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bookingId,
          customer: customerName.trim(),
          phone: customerPhone.trim(),
          email: customerEmail.trim(),
          occasion: occ?.name ?? "Feast",
          date: formatEventDate(eventDate),
          // Raw ISO date + package/lead so the server can re-check the
          // advance-booking rule (the `date` above is a display string).
          eventDateISO: eventDate,
          // Serving time — meal period + clock slot, stored on the order and
          // shown via `servingTimeLabel` in the admin console / My Bookings.
          // Sent only when set (the server drops blank / malformed values).
          ...(mealTime ? { mealTime } : {}),
          ...(eventTime ? { eventTime } : {}),
          // Food (diet) preference — Pure Veg / Non-veg / Both. Sent only when set.
          ...(foodPreference ? { foodPreference } : {}),
          packageId,
          leadDays: effectiveLeadDays,
          guests,
          vendor: vendorLabel,
          city: cityObj?.name ?? "—",
          venue: venue.trim() || undefined,
          amount: Math.round(grandTotal),
          paid: orderPaid,
          paymentMethod: payMethod,
          paymentRef: orderPaymentRef || undefined,
          emiPlan: emiPlan ?? undefined,
          status: orderStatus,
          // A partner can't credit their own booking — drop the attribution
          // when the applied code is this account's own (the server enforces
          // this too).
          referralCode: selfReferral ? undefined : referralCode.trim() || undefined,
          referrerName: selfReferral ? undefined : referrerName || undefined,
          referrerType: selfReferral ? undefined : referrerType || undefined,
          // Customer-facing extras stored on the order (My Bookings needs these).
          ...(bookedVendors.length ? { vendors: bookedVendors } : {}),
          // The feast-wide service package (its price is already in `amount`).
          ...(selectedService
            ? {
                service: {
                  id: selectedService.id,
                  name: selectedService.name,
                  price: serviceTotal,
                },
              }
            : {}),
          receipt: buildReceipt(),
          invoice: invoiceData,
          // Lets the server email the owners a link to this order's invoice.
          invoiceToken: encodeInvoice(invoiceData),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setConfirmError(
          data?.error ??
            t(
              "Couldn't confirm your booking. Please try again.",
              "आपकी बुकिंग कन्फर्म नहीं हो सकी। कृपया पुनः प्रयास करें।",
            ),
        );
        setConfirming(false);
        return;
      }
    } catch {
      setConfirmError(
        t(
          "Network error. Please check your connection and try again.",
          "नेटवर्क त्रुटि। कृपया अपना कनेक्शन जाँचें और पुनः प्रयास करें।",
        ),
      );
      setConfirming(false);
      return;
    }

    setConfirmed(true);
    setConfirming(false);
    // Order placed — drop the saved draft so a later visit starts fresh rather
    // than resurrecting this (now-booked) menu.
    clearBookingDraft();
    // Bring the success screen into view — a paid-and-confirmed booking often
    // triggers from the advance button lower down, so jump back to the top.
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /* ─── Render ───────────────────────────────────────────────────────── */
  // The add-ons / details step (4) shows its content on the left with the
  // order-summary rail on the right; the confirm step (6) keeps it until paid.
  // The Package step (1) deliberately omits the rail — a guest is still just
  // exploring tiers there, so a running "estimate" (carried from the previously
  // selected package / defaults) reads as a stale, misleading number. Each tier
  // card already shows its own per-plate price. The full-width builders — Menu
  // (2) and Live Stall (3) — and the Essentials comparison (5) have no rail
  // (the service cards each show their own computed feast price instead).
  const showSummary = step === 4 || (step === 6 && !confirmed);

  // Step names, shared by the progress rail and the "up next" cue so a guest
  // always knows what they're on and what's coming. Order mirrors the flow:
  // Package → Menu → Live Stall → Add-ons → Essentials → Review.
  const stepLabels = [
    t("Package", "पैकेज"),
    t("Menu", "मेन्यू"),
    t("Live Stall", "लाइव स्टॉल"),
    t("Add-ons", "एक्स्ट्रा"),
    t("Essentials", "ज़रूरी सेवाएँ"),
    t("Review", "समीक्षा"),
  ];
  // The step a guest moves to next (empty on the final Review step).
  const nextStepLabel = step < TOTAL_STEPS ? stepLabels[step] : "";

  // Event brief — occasion / date / city / guests carried from the Hero bar,
  // editable on every step. Same controlled inputs everywhere, but its position
  // shifts per layout: on most steps it sits up top, while the Menu / Live Stall
  // builders reorder it below the builder on mobile (see the grid below) so a
  // guest can start picking dishes right away. `flush` drops its top margin when
  // the grid gap already supplies the spacing.
  const renderEventBar = (
    flush = false,
    mobileCollapse = false,
    embedded = false,
  ) => (
    <EventBar
      embedded={embedded}
      lang={lang}
      t={t}
      occasionId={occasionId}
      setOccasionId={setOccasionId}
      customOccasion={customOccasion}
      setCustomOccasion={setCustomOccasion}
      occasionList={occasionList}
      eventDate={eventDate}
      setEventDate={setEventDate}
      mealTime={mealTime}
      setMealTime={setMealTime}
      eventTime={eventTime}
      setEventTime={setEventTime}
      foodPreference={foodPreference}
      setFoodPreference={setFoodPreference}
      cityId={cityId}
      setCityId={setCityId}
      customCity={customCity}
      setCustomCity={setCustomCity}
      locations={locations}
      guests={guests}
      setGuests={setGuests}
      paxMin={paxMin}
      paxMax={paxMax}
      leadWarning={leadWarning}
      // The confirm step (6) locks the headcount and echoes it in the order
      // summary, so the editable Guests field is redundant there — hide it.
      // It stays on the Essentials step (5), where the price scales with guests.
      showGuests={step !== 6}
      flush={flush}
      // The reordered mobile layout (Menu / Live Stall steps, where `flush` is
      // set) collapses the brief to a one-line summary to keep this section tight.
      // `mobileCollapse` extends that one-line chip to the other steps, but only
      // on phones (< sm) — tablet / desktop keep the full editable card.
      collapsible={flush || mobileCollapse}
      collapseAt={mobileCollapse ? "sm" : "lg"}
    />
  );

  return (
    <section className="app-bottom-safe relative mx-auto w-full max-w-[90rem] overflow-x-hidden px-3 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      {/* A rich editorial opening gives the utility-heavy flow a premium moment.
          Phones drop the tall hero entirely for a minimal, low-scroll flow — it
          returns untouched at sm+ (tablet / desktop). */}
      <WizardHero
        eyebrow={t("BOOK A FEAST", "भोज बुक करें")}
        title={t("Plan Your Celebration", "अपना उत्सव प्लान करें")}
        sub={t(
          "A few thoughtful steps to a feast your guests will remember.",
          "कुछ आसान चरणों में ऐसा भोज, जिसे आपके मेहमान याद रखें।",
        )}
        chips={[
          t("6 guided steps", "6 आसान चरण"),
          t("Curated menus", "चुने हुए मेन्यू"),
          t("Verified partners", "सत्यापित पार्टनर"),
        ]}
      />

      {/* Progress rail — shows where the guest is in the 6-step flow, plus a
          plain-language "you're here / next up" line so they always know what
          they're picking now and what comes after. Hidden on the confirmed
          success screen. The Start over escape hatch is only offered once past
          Package selection, where there are selections worth discarding. */}
      {!confirmed && (
        <ProgressRail
          t={t}
          step={step}
          totalSteps={TOTAL_STEPS}
          stepLabels={stepLabels}
          onStartOver={step > 1 ? startOver : undefined}
        />
      )}

      {/* Layout */}
      {step === 2 || step === 3 ? (
        // Full-width builders — Menu (2) and Live Stall (3). The chosen package
        // is pinned on the left; vendor & item selection fills the right. Menu
        // builds the plated courses; Live Stall gathers the cook-to-order
        // stations that used to be mixed into the menu. A package with no live
        // stalls (Silver) shows an explanatory panel on Step 3 instead.
        //
        // Ordering: on desktop the event brief spans the full width up top, with
        // the package rail (left) and builder (right) below. On mobile the
        // event brief and package summary pack into ONE collapsed card — a row
        // each, with a pencil to expand and edit — with the builder below it.
        <div className="mt-8 grid w-full min-w-0 gap-4 sm:gap-8 lg:grid-cols-[18rem_1fr]">
          {/* Mobile / tablet — combined event + package summary card. */}
          <div className="order-1 w-full min-w-0 lg:hidden">
            <div className="rounded-[1.5rem] border border-cream bg-white p-4 shadow-card">
              {renderEventBar(true, false, true)}
              {selectedPackage && (
                <>
                  <div aria-hidden="true" className="my-3 h-px bg-cream" />
                  <SelectedPackageRail
                    lang={lang}
                    t={t}
                    tier={selectedPackage}
                    basePerPlate={basePerPlate}
                    onChange={() => setStep(1)}
                    embedded
                  />
                </>
              )}
            </div>
          </div>
          {/* Event brief — full-width top row on desktop. */}
          <div className="hidden w-full min-w-0 lg:block lg:col-span-2 lg:row-start-1">
            {renderEventBar(true)}
          </div>
          {/* Package / price rail — pinned left on desktop. */}
          <div className="hidden w-full min-w-0 lg:block lg:col-start-1 lg:row-start-2">
            <SelectedPackageRail
              lang={lang}
              t={t}
              tier={selectedPackage}
              basePerPlate={basePerPlate}
              onChange={() => setStep(1)}
            />
          </div>
          {/* Builder — below the combined card on mobile, right column on desktop. */}
          <div className="order-3 w-full min-w-0 lg:order-none lg:col-start-2 lg:row-start-2">
            {step === 2 ? (
              <>
              {/* A `/book?vendor=` hand-off we couldn't honour (delisted brand,
                  stale share link, hand-typed id). Say which brand went missing
                  and leave the guest here on the vendor-picking step with
                  nothing pre-selected — sits above the menu builder so it's
                  read before the roster. */}
              {missingBrand && (
                <div
                  role="status"
                  className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-maroon/20 bg-cream-2/60 px-4 py-3"
                >
                  <p className="text-sm leading-relaxed text-ink">
                    <span className="font-semibold text-maroon">
                      {t("Brand not found", "ब्रांड नहीं मिला")}
                    </span>{" "}
                    —{" "}
                    {t(
                      `We couldn't find "${missingBrand}". It may no longer be listed. Pick a vendor below to carry on.`,
                      `"${missingBrand}" नहीं मिला। हो सकता है यह अब सूचीबद्ध न हो। आगे बढ़ने के लिए नीचे से वेंडर चुनें।`,
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setMissingBrand("")}
                    aria-label={t("Dismiss", "बंद करें")}
                    className="shrink-0 rounded-full px-2 text-base font-semibold leading-none text-maroon"
                  >
                    ×
                  </button>
                </div>
              )}
              <StepMenu
                lang={lang}
                t={t}
                title={t("Build Your Menu", "अपना मेन्यू बनाएं")}
                // One line, not two: what the package unlocks (several vendors
                // and/or a spread of dishes) is folded into the same sentence
                // that says what's next, instead of a second note below the
                // head. Per-course caps are still spelled out by the "N/N
                // PICKED" counter on each course.
                subtitle={
                  // Single Stall is stall-first: which caterer runs each course
                  // is the choice, and whether there's a dish list to build is
                  // the caterer's call (set menu vs varied), so the line can't
                  // promise dish-picking the way the feast bands can.
                  singleStall
                    ? t(
                        "Pick one stall per course — most serve a set menu, some let you choose dishes. Live counters come next.",
                        "हर कोर्स के लिए एक स्टॉल चुनें — ज़्यादातर तय मेन्यू परोसते हैं, कुछ आपको व्यंजन चुनने देते हैं। लाइव काउंटर अगले चरण में।",
                      )
                    : multiVendor && multiDishIn(menuStepCategories)
                    ? t(
                        "Mix multiple vendors and pick multiple dishes across your plated courses — live counters come next.",
                        "अपने कोर्सेज़ में कई वेंडर मिलाएं और कई व्यंजन चुनें — लाइव काउंटर अगले चरण में।",
                      )
                    : multiVendor
                      ? t(
                          "Mix multiple vendors across your plated courses — live counters come next.",
                          "अपने कोर्सेज़ में कई वेंडर मिलाएं — लाइव काउंटर अगले चरण में।",
                        )
                      : multiDishIn(menuStepCategories)
                        ? t(
                            "Pick multiple dishes across your plated courses — live counters come next.",
                            "अपने कोर्सेज़ में कई व्यंजन चुनें — लाइव काउंटर अगले चरण में।",
                          )
                        : t(
                            "Pick vendors and dishes for your plated courses — live counters come next.",
                            "अपने कोर्सेज़ के लिए वेंडर और व्यंजन चुनें — लाइव काउंटर अगले चरण में।",
                          )
                }
                multiVendor={multiVendor}
                // Cap by band, not package id — the Silver/Gold packages.
                maxVendors={
                  effectiveTier === "Silver" || effectiveTier === "Gold"
                    ? 5
                    : undefined
                }
                categories={menuStepCategories}
                activeCat={activeCat}
                setActiveCat={setActiveCat}
                categoryVendor={categoryVendor}
                pickVendor={pickVendor}
                itemsFor={itemsFor}
                toggleItem={toggleItem}
                allowanceFor={allowanceFor}
                baseAllowanceFor={baseAllowanceFor}
                platformAllowanceFor={platformAllowanceFor}
                tierName={effectiveTier}
                categoryComplete={categoryComplete}
                isSkipped={isSkipped}
                unskipCat={unskipCat}
                onSkipMenu={singleStall ? skipMenuEntirely : undefined}
                showItemPrice={singleStall}
                fixedStall={isFixedStall}
                vendorRatings={vendorRatings}
              />
              </>
            ) : hasLiveStalls ? (
              <StepMenu
                lang={lang}
                t={t}
                title={t("Choose Your Live Stalls", "अपने लाइव स्टॉल चुनें")}
                // Same single-line treatment as the plated menu step above.
                subtitle={
                  counterMultiVendor && multiDishIn(liveStallCategories)
                    ? t(
                        "Mix multiple counter vendors and dishes, cooked fresh in front of your guests — add-ons come next.",
                        "कई काउंटर वेंडर और व्यंजन चुनें, मेहमानों के सामने ताज़ा बनते हुए — एक्स्ट्रा अगले चरण में।",
                      )
                    : counterMultiVendor
                      ? t(
                          "Mix multiple counter vendors, cooked fresh in front of your guests — add-ons come next.",
                          "कई काउंटर वेंडर चुनें, मेहमानों के सामने ताज़ा बनते हुए — एक्स्ट्रा अगले चरण में।",
                        )
                      : multiDishIn(liveStallCategories)
                        ? t(
                            "Pick multiple counters, cooked fresh in front of your guests — add-ons come next.",
                            "कई काउंटर चुनें, मेहमानों के सामने ताज़ा बनते हुए — एक्स्ट्रा अगले चरण में।",
                          )
                        : t(
                            "Cook-to-order counters made fresh in front of your guests — add-ons come next.",
                            "मेहमानों के सामने ताज़ा बनने वाले लाइव काउंटर — एक्स्ट्रा अगले चरण में।",
                          )
                }
                multiVendor={counterMultiVendor}
                maxVendors={
                  effectiveTier === "Silver" || effectiveTier === "Gold"
                    ? 5
                    : undefined
                }
                categories={liveStallCategories}
                activeCat={liveCat}
                setActiveCat={setLiveCat}
                categoryVendor={categoryVendor}
                pickVendor={pickVendor}
                itemsFor={itemsFor}
                toggleItem={toggleItem}
                allowanceFor={allowanceFor}
                baseAllowanceFor={baseAllowanceFor}
                platformAllowanceFor={platformAllowanceFor}
                tierName={effectiveTier}
                categoryComplete={categoryComplete}
                isSkipped={isSkipped}
                unskipCat={unskipCat}
                // Single Stall marks a live station fixed just like a plated
                // course, so this step must render (and count) it the same way.
                fixedStall={isFixedStall}
                vendorRatings={vendorRatings}
              />
            ) : (
              <LiveStallEmpty t={t} packageName={selectedPackage?.name ?? ""} />
            )}
          </div>
        </div>
      ) : (
      <>
      {/* Event brief sits up top on these steps (Package / Add-ons / Essentials /
          Review) — no reordering needed. On phones it collapses to a one-line
          editable chip (mobileCollapse) so the step content leads. */}
      {renderEventBar(false, true)}
      <div
        className={
          showSummary
            ? "mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_21rem]"
            : "mt-7"
        }
      >
        {/* min-w-0 lets the package carousel scroll inside this grid column
            instead of the column growing to the row's full content width. */}
        <div className="min-w-0">
          {step === 1 && (
            <StepPackage
              lang={lang}
              t={t}
              packageId={packageId}
              // Selecting a package drops the guest straight onto vendor
              // selection — no Next arrow needed.
              setPackageId={(id) => {
                setPackageId(id);
                setPackageChosen(true);
                setStep(2);
              }}
              eventDate={eventDate}
              shortNotice={shortNotice}
              // Carry the event brief already gathered here into the Single
              // Stall wizard, so switching flows never re-asks for it.
              onSingleStall={goSingleStall}
            />
          )}
          {step === 4 && (
            <StepExtras
              lang={lang}
              t={t}
              guests={guests}
              selectedAddOns={selectedAddOns}
              toggleAddOn={toggleAddOn}
              packageName={selectedPackage?.name ?? ""}
              multiVendor={counterMultiVendor}
              eligibleVendors={eligibleAddOnVendors}
              vendorIdsFor={addOnVendorIds}
              onVendorToggle={toggleAddOnVendor}
              // Gold & Platinum unlock the full extras filter (browse by
              // counters vs whole-event services); Single Stall & Silver keep
              // just the free-text search.
              fullFilter={packageId === "gold" || packageId === "platinum"}
            />
          )}
          {/* Essentials step (5) — the mandatory "Choose Your Service Package"
              comparison. Single-select; the chosen tier's price folds into the
              total (each card shows its own computed feast price). */}
          {step === 5 && (
            <ServicePackages
              packages={services}
              selectedId={serviceId}
              onSelect={setServiceId}
              guests={guests}
              embedded
            />
          )}
          {/* Confirm step — payment + placing the order. Both require a
              signed-in guest, so an anonymous visitor gets the login gate here
              (their in-progress booking stays intact); logging in reveals the
              real Confirm step. A neutral placeholder covers the brief moment
              the client session is still loading, to avoid a sign-in flash. */}
          {step === 6 && !confirmed && sessionStatus === undefined && (
            <div className="min-h-[40vh]" />
          )}
          {step === 6 && !confirmed && sessionStatus === null && (
            <LoginGate onBack={() => setStep(5)} />
          )}
          {step === 6 && !confirmed && sessionStatus != null && (
            <StepConfirm
              t={t}
              occasion={resolveOccasion(occasionId)}
              packageName={selectedPackage?.name ?? ""}
              eventDate={eventDate}
              city={resolveCity(cityId)}
              venue={venue}
              setVenue={setVenue}
              venueFee={venueFee}
              guests={guests}
              categories={activeCategories}
              categoryVendor={categoryVendor}
              itemsFor={itemsFor}
              selectedAddOns={selectedAddOns}
              addOnVendorNames={addOnVendorNames}
              serviceName={selectedService?.name}
              serviceTotal={serviceTotal}
              onEditMenu={() => setStep(2)}
              onEditCourse={editCourse}
              onRemoveVendor={removeVendor}
              onEditExtras={() => setStep(4)}
              onEditService={() => setStep(5)}
              couponInput={couponInput}
              setCouponInput={setCouponInput}
              applyCoupon={applyCoupon}
              applyCouponCode={applyCouponCode}
              removeCoupon={removeCoupon}
              preDiscount={preDiscount}
              appliedCoupon={appliedCoupon}
              couponError={couponError}
              couponDiscount={couponDiscount}
              referralDiscount={referralDiscount}
              referralPercent={referralCustomerPercent}
              grandTotal={grandTotal}
              bookingId={bookingId}
              paidAmount={paidAmount}
              onPaid={(amount, ref) => {
                setPaidAmount(amount);
                setPaymentRef(ref);
                // Advance settled → confirm the booking in the same click, using
                // the just-recorded amount + UTR (state above hasn't flushed yet).
                void handleConfirm(amount, ref);
              }}
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              customerEmail={customerEmail}
              setCustomerEmail={setCustomerEmail}
              knownContact={knownContact}
              referralCode={referralCode}
              setReferralCode={setReferralCode}
              referrerName={referrerName}
              selfReferral={selfReferral}
              payMethod={payMethod}
              setPayMethod={setPayMethod}
              emiCount={emiCount}
              setEmiCount={setEmiCount}
              confirming={confirming}
              confirmError={confirmError}
              onConfirm={handleConfirm}
              whatsappHref={whatsappHref}
            />
          )}
          {step === 6 && confirmed && (
            <StepDone
              t={t}
              bookingId={bookingId}
              occasion={resolveOccasion(occasionId)}
              eventDate={eventDate}
              city={resolveCity(cityId)}
              venue={venue}
              guests={guests}
              grandTotal={grandTotal}
              paidAmount={paidAmount}
              referrerName={referrerName}
              onDownload={downloadMenu}
              whatsappHref={whatsappHref}
            />
          )}
        </div>

        {showSummary && (
          <SummaryPanel
            t={t}
            packageName={selectedPackage?.name ?? ""}
            singleStall={singleStall}
            basePerPlate={basePerPlate}
            categoryAddTotal={menuAddTotal}
            perPlate={perPlate}
            guests={guests}
            subtotal={subtotal}
            addOnsTotal={addOnsTotal}
            serviceTotal={serviceTotal}
            serviceName={selectedService?.name ?? ""}
            venueFee={venueFee}
            venueName={venue}
            couponDiscount={couponDiscount}
            referralDiscount={referralDiscount}
            referrerName={referrerName}
            gst={gst}
            grandTotal={grandTotal}
          />
        )}
      </div>
      </>
      )}

      {/* Nav buttons */}
      {step === 2 ? (
        <MenuStepNav
          t={t}
          categories={menuStepCategories}
          activeCat={activeCat}
          canAdvance={hasStepAnySelection(menuStepCategories)}
          isPartial={isStepPartial(menuStepCategories)}
          missingSummaries={getMissingCategorySummaries(menuStepCategories)}
          singleStall={singleStall}
          isSkipped={isSkipped}
          unskipCat={unskipCat}
          onPrev={menuPrev}
          onNext={menuNext}
          onSkipCurrent={skipCurrentStall}
          // Withheld until the order actually holds something — package ×
          // guests alone is not a quote. See the sticky-bar note below.
          estTotal={orderHasItems ? grandTotal : 0}
          guestCount={guests}
          extraBanner={
            menuFullySkipped ? (
              <div className="mb-4 flex items-start gap-2 rounded-card border border-maroon/30 bg-cream/40 px-4 py-3 text-sm text-ink-soft">
                <span aria-hidden="true" className="text-maroon">
                  ★
                </span>
                <span>
                  {t(
                    "You've skipped every stall. Continue to live counters & extras — you'll pick at least one there to complete your order.",
                    "आपने हर स्टॉल छोड़ दिया है। लाइव काउंटर और एक्स्ट्रा तक जारी रखें — ऑर्डर पूरा करने के लिए वहाँ कम से कम एक चुनें।",
                  )}
                </span>
              </div>
            ) : undefined
          }
        />
      ) : step === 3 ? (
        hasLiveStalls ? (
          <MenuStepNav
            t={t}
            categories={liveStallCategories}
            activeCat={liveCat}
            canAdvance={hasStepAnySelection(liveStallCategories)}
            isPartial={isStepPartial(liveStallCategories)}
            missingSummaries={getMissingCategorySummaries(liveStallCategories)}
            singleStall={singleStall}
            isSkipped={isSkipped}
            unskipCat={unskipCat}
            onPrev={livePrev}
            onNext={liveNext}
            onSkipCurrent={skipCurrentLiveStall}
            estTotal={orderHasItems ? grandTotal : 0}
            guestCount={guests}
          />
        ) : (
          // Package with no live stalls (Silver) — nothing to pick here, so just
          // step back to the menu or move on to add-ons.
          <div className="mt-10 flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={goBack}
              aria-label={t("Back", "पीछे")}
            >
              ←
            </Button>
            <Button onClick={goNext}>
              {t("Continue to Add-ons", "एक्स्ट्रा तक जारी रखें")} →
            </Button>
          </div>
        )
      ) : step < TOTAL_STEPS ? (
        <div className="mt-8 sm:mt-10">
          {nextBlockers.length > 0 && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-maroon/30 bg-cream/40 px-3 py-2.5 text-[13px] text-ink/70 sm:rounded-card sm:px-4 sm:py-3 sm:text-sm sm:text-ink-soft">
              <span aria-hidden="true" className="text-maroon">
                ★
              </span>
              <span>
                {t("Before you continue:", "जारी रखने से पहले:")}{" "}
                <span className="font-semibold text-maroon">
                  {nextBlockers.join(" • ")}
                </span>
              </span>
            </div>
          )}
          {/* Desktop nav */}
          <div className="hidden items-center justify-between md:flex">
            <Button
              variant="secondary"
              onClick={goBack}
              aria-label={t("Back", "पीछे")}
            >
              {t("Back", "पीछे")}
            </Button>
            <Button
              onClick={goNext}
              disabled={!canNext}
              aria-label={t("Next", "आगे")}
            >
              {nextStepLabel
                ? `${t("Continue", "आगे")} · ${nextStepLabel} →`
                : `${t("Continue", "आगे")} →`}
            </Button>
          </div>
          {/* Mobile sticky checkout chrome — Back / Continue, with the running
              estimate above it once there's an order to price.

              A package tier and a headcount are NOT an order: multiplying the
              seeded "popular" tier by the guest count produces a confident
              ₹-figure for a feast the guest never assembled, which reads as a
              quote they're on the hook for. So the number only appears once
              `orderHasItems` — a built course, a picked stall dish, or an extra
              — is true, which in practice means it arrives late in the flow and
              the full breakdown still lands on Review. Until then the bar says
              plainly that nothing is booked. Desktop already omits the summary
              rail on Step 1 for the same reason. */}
          <div className="app-sticky-cta md:hidden">
            <div className="mx-auto max-w-3xl rounded-2xl border border-maroon/10 bg-white/96 px-3 py-2.5 shadow-pop-up backdrop-blur-xl">
              {orderHasItems ? (
                <div className="mb-2 flex items-end justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                      {t("Total (Est.)", "कुल (अनुमानित)")}
                    </span>
                    <span className="block truncate font-sans text-base font-bold leading-tight text-maroon">
                      {money(grandTotal)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-[11px] leading-tight text-ink-soft">
                    {t(
                      `For ${inr.format(guests)} guests`,
                      `${inr.format(guests)} मेहमानों के लिए`,
                    )}
                  </span>
                </div>
              ) : (
                <div className="mb-2 text-[11px] leading-tight text-ink-soft">
                  {step === 1
                    ? t(
                        "Pick a package to start — nothing is booked yet.",
                        "शुरू करने के लिए पैकेज चुनें — अभी कुछ भी बुक नहीं हुआ है।",
                      )
                    : t(
                        "Your total appears once you add items — nothing is booked yet.",
                        "आइटम जोड़ते ही आपका कुल दिखेगा — अभी कुछ भी बुक नहीं हुआ है।",
                      )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={goBack}
                  aria-label={t("Back", "पीछे")}
                  className="min-h-11 px-4"
                >
                  ←
                </Button>
                <Button
                  onClick={goNext}
                  disabled={!canNext}
                  fullWidth
                  className="min-h-11"
                >
                  {nextStepLabel
                    ? `${t("Continue", "आगे")} · ${nextStepLabel}`
                    : t("Continue", "आगे")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Trust strip — the reassurance row from the app mockup. Mobile-only so
          the tablet / desktop layout is untouched; hidden on the success screen. */}
      {!confirmed && (
        <ul className="mt-8 grid grid-cols-2 gap-2.5 sm:hidden">
          {[
            {
              icon: "🛡️",
              title: t("Trusted Vendors", "भरोसेमंद वेंडर"),
              sub: t("Quality you can rely on", "जिस पर आप भरोसा कर सकें"),
            },
            {
              icon: "🏅",
              title: t("Curated Menus", "चुने हुए मेन्यू"),
              sub: t("Tasty & verified", "स्वादिष्ट और सत्यापित"),
            },
            {
              icon: "🎧",
              title: t("24x7 Support", "24x7 सहायता"),
              sub: t("We're here to help", "हम मदद के लिए हैं"),
            },
            {
              icon: "🔒",
              title: t("Secure Booking", "सुरक्षित बुकिंग"),
              sub: t("100% safe payments", "100% सुरक्षित भुगतान"),
            },
          ].map((b) => (
            <li
              key={b.title}
              className="flex items-center gap-2.5 rounded-2xl border border-cream-3 bg-white px-3 py-2.5 shadow-sm"
            >
              <span
                aria-hidden="true"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cream text-base"
              >
                {b.icon}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-ink">
                  {b.title}
                </span>
                <span className="block truncate text-[11px] text-ink-soft">
                  {b.sub}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ─── Reusable heading ───────────────────────────────────────────────── */
/* ─── Incomplete-selection popup ─────────────────────────────────────────
   Fires on every Next / Continue press while the step still has courses short
   of their dish quota. It lists exactly what's outstanding and lets the guest
   either stay and finish or move on and come back later — the same message the
   step used to show as a static banner, promoted to a decision point so it can't
   be scrolled past. Portalled to <body> so the wizard's stacking contexts can't
   trap it under the sticky header. */
function IncompleteSelectionDialog({
  t,
  open,
  missingSummaries,
  onStay,
  onContinue,
}: {
  t: (en: string, hi: string) => string;
  open: boolean;
  missingSummaries: { id: string; name: string; missingCount: number }[];
  onStay: () => void;
  onContinue: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onStay();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onStay]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center overflow-y-auto bg-[rgba(0,0,0,0.55)] p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t(
        "Your selection is partially complete",
        "आपका चयन आंशिक रूप से पूरा है",
      )}
      onClick={onStay}
    >
      <div
        className="w-full max-w-md rounded-t-sheet bg-white p-5 pb-[max(1.25rem,var(--safe-bottom))] shadow-modal sm:rounded-card sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream text-base text-maroon"
          >
            ℹ
          </span>
          <div className="min-w-0">
            {/* Open Sans, not the display face — this is a UI alert, not a
                brand moment, and `h2` would otherwise inherit Ananda Neptouch. */}
            <h2 className="font-sans text-base font-bold leading-snug text-ink">
              {t(
                "Your selection is partially complete",
                "आपका चयन आंशिक रूप से पूरा है",
              )}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
              {t(
                "You can continue now and finalize the remaining choices later.",
                "आप अभी आगे बढ़ सकते हैं और बाकी विकल्प बाद में तय कर सकते हैं।",
              )}
            </p>
          </div>
        </div>

        <ul className="mt-4 divide-y divide-cream-3 rounded-xl border border-cream-3 bg-cream/40">
          {missingSummaries.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13px]"
            >
              <span className="min-w-0 truncate font-semibold text-ink">
                {s.name}
              </span>
              <span className="shrink-0 font-bold text-maroon">
                {s.missingCount} {t("more", "और")}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onStay} className="sm:flex-initial">
            {t("Keep selecting", "चुनते रहें")}
          </Button>
          <Button onClick={onContinue} className="sm:flex-initial">
            {t("Continue anyway", "फिर भी जारी रखें")} →
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─── Course-step nav (Menu · Live Stall) ────────────────────────────────
   Walks a step's courses tab-by-tab and spills into the wizard at the edges:
   Back off the first course returns to the previous step, Continue past the
   last advances to the next. Shared by the Menu (2) and Live Stall (3) steps so
   both behave identically — a clean Previous / Skip / Next row, per-stall skip
   on the Single Stall plan, and a Continue that's disabled until the step's
   courses are all resolved. */
function MenuStepNav({
  t,
  categories,
  activeCat,
  canAdvance,
  isPartial,
  missingSummaries = [],
  singleStall,
  isSkipped,
  unskipCat,
  onPrev,
  onNext,
  onSkipCurrent,
  extraBanner,
  estTotal,
  guestCount,
}: {
  t: (en: string, hi: string) => string;
  categories: MenuCategory[];
  activeCat: number;
  canAdvance: boolean;
  isPartial: boolean;
  missingSummaries?: { id: string; name: string; missingCount: number }[];
  singleStall: boolean;
  isSkipped: (catId: string) => boolean;
  unskipCat: (catId: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onSkipCurrent: () => void;
  extraBanner?: ReactNode;
  /** Running order estimate + headcount — surfaced on mobile as a compact
   *  summary strip above the nav, echoing the app mockup's persistent bar. */
  estTotal?: number;
  guestCount?: number;
}) {
  const atLast = activeCat >= categories.length - 1;
  const activeId = categories[activeCat]?.id ?? "";

  // What's still short of quota, raised as a popup rather than as a banner under
  // the nav — a guest deep in a long course list never scrolls back down to read
  // a static hint, so the reminder stands in front of the move it's about and
  // clears with one tap either way.
  //
  // It only fires when the guest actually steps over something. Mid-step that's
  // the course being left right now: courses further down the sequence haven't
  // been reached yet, and ones already walked past were raised (and dismissed)
  // when they were left — re-listing either turns every Next into a nag. On the
  // last course the step itself is closing, so everything still short is fair to
  // list one final time.
  const [askPartial, setAskPartial] = useState(false);
  const pendingSummaries = atLast
    ? missingSummaries
    : missingSummaries.filter((s) => s.id === activeId);
  const shouldAsk = isPartial && pendingSummaries.length > 0;
  const handleNext = () => {
    if (shouldAsk) {
      setAskPartial(true);
      return;
    }
    onNext();
  };

  return (
    <div className="mt-10 space-y-4">
      {extraBanner}

      <IncompleteSelectionDialog
        t={t}
        open={askPartial}
        missingSummaries={pendingSummaries}
        onStay={() => setAskPartial(false)}
        onContinue={() => {
          setAskPartial(false);
          onNext();
        }}
      />

      {/* Mobile — running order estimate (app mockup's persistent summary bar).
          Desktop keeps the price in the side rail / summary panel. */}
      {typeof estTotal === "number" && estTotal > 0 && (
        <div className="flex items-end justify-between gap-3 rounded-2xl border border-cream-3 bg-white px-3.5 py-2.5 shadow-sm sm:hidden">
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
              {t("Total (Est.)", "कुल (अनुमानित)")}
            </span>
            <span className="block truncate font-sans text-base font-bold leading-tight text-maroon">
              {money(estTotal)}
            </span>
          </span>
          <span className="shrink-0 text-right text-[11px] leading-tight text-ink-soft">
            {t(
              `For ${inr.format(guestCount ?? 0)} guests`,
              `${inr.format(guestCount ?? 0)} मेहमानों के लिए`,
            )}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2.5 sm:justify-between">
        <Button
          variant="secondary"
          onClick={onPrev}
          className="flex-1 shrink-0 sm:flex-initial"
        >
          ← {t("Previous", "पिछला")}
        </Button>

        <div className="flex flex-1 items-center justify-end gap-2.5 sm:flex-initial">
          {/* Single Stall lets a guest opt out of a course entirely — skip it and
              slide to the next stall, or undo if they skipped by mistake. */}
          {singleStall &&
            (isSkipped(activeId) ? (
              <Button
                variant="secondary"
                onClick={() => {
                  if (activeId) unskipCat(activeId);
                }}
                className="flex-1 sm:flex-initial"
              >
                {t("Undo", "पूर्ववत")}
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={onSkipCurrent}
                className="flex-1 sm:flex-initial"
              >
                {t("Skip", "छोड़ें")}
              </Button>
            ))}

          {!atLast ? (
            <Button
              onClick={handleNext}
              className="w-full flex-1 sm:w-auto sm:flex-initial"
            >
              {t("Next", "अगला")} →
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canAdvance}
              className="w-full flex-1 sm:w-auto sm:flex-initial"
            >
              {t("Continue", "जारी रखें")} →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Live Stall step · empty state ──────────────────────────────────────
   Shown on Step 3 when the chosen package (e.g. Silver) includes no live
   stations. Honest about it and points the guest at the next step, where live
   counters can still be added as extras — so the flow stays a consistent six
   steps for every package. */
function LiveStallEmpty({
  t,
  packageName,
}: {
  t: (en: string, hi: string) => string;
  packageName: string;
}) {
  return (
    <div className="min-w-0">
      <SectionHead
        title={t("Live Stalls", "लाइव स्टॉल")}
        sub={t(
          "Cook-to-order counters, made fresh in front of your guests.",
          "मेहमानों के सामने ताज़ा बनने वाले लाइव काउंटर।",
        )}
      />
      <div className="flex items-start gap-3 rounded-2xl border border-maroon/30 bg-cream/40 px-5 py-6 text-sm text-ink-soft">
        <span aria-hidden="true" className="text-lg text-maroon">
          🔥
        </span>
        <div>
          <p className="font-semibold text-ink">
            {t(
              `Your ${packageName || "package"} doesn't include live stalls.`,
              `आपके ${packageName || "पैकेज"} में लाइव स्टॉल शामिल नहीं हैं।`,
            )}
          </p>
          <p className="mt-1">
            {t(
              "No problem — you can add live counters (chaat, chinese, dosa, pizza & more) as add-ons on the next step, or go back and pick a higher package.",
              "कोई बात नहीं — अगले चरण में आप लाइव काउंटर (चाट, चाइनीज़, डोसा, पिज़्ज़ा वग़ैरह) एक्स्ट्रा के रूप में जोड़ सकते हैं, या पीछे जाकर बड़ा पैकेज चुनें।",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 1 · Package ────────────────────────────────────────────────  */
function StepPackage({
  lang,
  t,
  packageId,
  setPackageId,
  eventDate,
  shortNotice,
  onSingleStall,
}: {
  lang: Lang;
  t: (en: string, hi: string) => string;
  packageId: string;
  setPackageId: (v: string) => void;
  eventDate: string;
  shortNotice: boolean;
  /** Single Stall isn't a tier — its card hands off to its own wizard. */
  onSingleStall: () => void;
}) {
  // Apply the same admin-editable name / price overrides the home page uses, so
  // a tier reads identically here and on the landing page. The menu structure
  // (features / pax / footnote) stays sourced from `data.ts`.
  const { packages: homePackages } = useHomeContent();
  // Every tier is shown — with the same admin name/price overrides — but a tier
  // whose lead time the chosen date doesn't yet clear renders disabled (dimmed +
  // inert) with the date it unlocks, rather than silently vanishing. That way a
  // guest never wonders where e.g. Platinum (30-day lead) went for an event a
  // fortnight out: they see it, greyed, with "available from …".
  const tiers = packages.map((tier) => {
    const meta = homePackages.tiers.find((x) => x.id === tier.id);
    const display = meta
      ? {
          ...tier,
          name: tier.id === "custom" ? "Single Stall" : meta.name,
          nameHi: tier.id === "custom" ? "सिंगल स्टॉल" : meta.nameHi,
          price: meta.price,
        }
      : tier;
    const lead = packageLeadDays[tier.id] ?? 0;
    return {
      tier: display,
      tooSoon: !packageAvailable(tier.id, eventDate),
      lead,
      unlock: formatEventDate(isoAfterDays(lead)),
    };
  });
  return (
    <div>
      <SectionHead
        nowrap
        title={t("Choose a package", "पैकेज चुनें")}
        sub={t(
          "Sets your base plate price and how many items each course includes.",
          "यह आपकी बेस प्लेट कीमत और हर कोर्स में शामिल आइटम तय करता है।",
        )}
      />
      {/* Short-notice dates can't be sourced for the regular tiers — steer the
          guest to the Single Stall plan (one vendor per course) + add-ons.
          Tiers that just need more notice aren't hidden; each disabled card
          below spells out its own lead time and unlock date. */}
      {shortNotice && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-maroon/30 bg-cream/40 px-4 py-2.5 text-sm text-ink-soft">
          <span aria-hidden="true" className="text-maroon">
            ★
          </span>
          <span>
            {t(
              "This date is short-notice, so our full packages can't be arranged in time. You can still book a Single Stall — one verified vendor, their own menu, plus any add-ons & live counters.",
              "यह तारीख़ बहुत नज़दीक है, इसलिए हमारे पूरे पैकेज समय पर तैयार नहीं हो पाएंगे। फिर भी आप सिंगल स्टॉल बुक कर सकते हैं — एक वेरिफाइड वेंडर, उनका अपना मेन्यू, साथ में ऐड-ऑन और लाइव काउंटर।",
            )}
          </span>
        </p>
      )}
      {/* Same "patra scroll" cards the home page advertises, so a tier looks
          identical here and on the landing page — fold-mounted CTA pill and,
          on mobile, the same swipe left–right snap carousel. On sm+ the grid's
          columns track the number of packages the date qualifies for, so a
          lone available tier (e.g. only the Single Stall plan for a same-day date) fills the
          column instead of stranding an empty half beside it. */}
      <div
        className={
          // Phones stack the tiers vertically (all four visible on one scroll,
          // no sideways swipe); sm+ restores the original snap-carousel → grid.
          // pt keeps the Popular/Premium ribbons (which float above the cards)
          // clear of the availability notice above the grid.
          "no-scrollbar flex flex-col gap-3 pb-1 pt-7 sm:mx-0 sm:flex-row sm:snap-none sm:grid sm:justify-center sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 sm:pt-7 xl:gap-8 " +
          (tiers.length === 1
            ? "sm:grid-cols-1"
            : tiers.length === 2
              ? "sm:grid-cols-2"
              : tiers.length === 3
                ? "sm:grid-cols-2 lg:grid-cols-3"
                // Four tiers only go four-across at xl. At lg the columns would
                // be ~222px, which squeezes the scroll below the width its
                // written menu can fit in — the parchment clips. Two-across
                // keeps every menu readable in full until there's room for four.
                //
                // Columns are capped at the card's own widest size (not 1fr) and
                // the track set is centred, so two-across doesn't strand a wide
                // gutter between the pairs. minmax()'s 0 floor lets the tracks
                // still shrink on narrower screens.
                : "sm:grid-cols-[repeat(2,minmax(0,320px))] xl:grid-cols-[repeat(4,minmax(0,320px))]")
        }
      >
        {tiers.map(({ tier, tooSoon, lead, unlock }) => {
          // Single Stall is no longer a tier you select here — it's a separate
          // flow. Its card stays on the shelf for discovery but leaves for
          // /book/stall instead of switching this wizard into a custom mode.
          const isStall = tier.id === "custom";
          const selected = !isStall && tier.id === packageId;
          const tierName = lang === "hi" ? tier.nameHi : tier.name;
          const choose = isStall ? onSingleStall : () => setPackageId(tier.id);
          return (
            <div
              key={tier.id}
              // Cards are capped a step below their column so the scrolls read
              // as a tidy row of menus rather than four billboards — and
              // centred in the column, since the cap leaves slack. Don't cap
              // below ~265px: past that the parchment's type hits its px floors
              // and the written menu gets clipped (see PackageScrollCard).
              //
              // Keep `w-full` at every breakpoint: with `w-auto`, the `mx-auto`
              // margins suppress the grid item's default stretch, so it falls
              // back to shrink-to-fit — and the scroll inside sizes off a
              // percentage width, which then resolves to zero and the whole
              // card collapses to 0x0.
              className="relative mx-auto flex w-full max-w-[320px] flex-col sm:max-w-[300px] xl:max-w-[288px]"
            >
            {tooSoon ? (
              // Too-soon tier: the full scroll, dimmed and inert (not clickable
              // or focusable), with a legible notice below the scroll card naming
              // its lead time and the date it unlocks. Nothing is silently
              // dropped, so the guest can pick a later date to reach it. The card
              // stays only lightly muted (not near-invisible) and carries a
              // "Locked" badge pinned to the top so the tier reads as present but
              // temporarily unavailable — never as if it had gone missing.
              <>
                <div className="select-none opacity-60">
                  <PackageScrollCard
                    tier={tier}
                    selected={false}
                    onSelect={() => {}}
                    ctaOnFold
                    cta={<span aria-hidden="true" />}
                  />
                </div>
                <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-maroon px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-cream shadow-card">
                    <span aria-hidden="true">🔒</span>
                    {t("Locked", "लॉक")}
                  </span>
                </div>
                <div className="mt-2.5 flex justify-center px-1">
                  <div className="w-full rounded-lg border border-maroon/40 bg-white px-3 py-2 text-center shadow-card">
                    <p className="flex items-center justify-center gap-1 text-xs font-bold text-maroon">
                      <span aria-hidden="true">★</span>
                      {t(
                        `${tierName} needs ${lead} days' notice`,
                        `${tierName} के लिए ${lead} दिन का अग्रिम समय चाहिए`,
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-soft">
                      {t(`Available from ${unlock}`, `${unlock} से उपलब्ध`)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
            <PackageScrollCard
              tier={tier}
              selected={selected}
              onSelect={choose}
              ctaOnFold
              cta={
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    choose();
                  }}
                  className="btn-sheen inline-flex min-h-7 items-center gap-1 whitespace-nowrap rounded-full bg-cream px-4 text-xs font-bold tracking-wide text-maroon shadow-card ring-1 ring-maroon/30 transition duration-200 hover:-translate-y-0.5 hover:shadow-pop active:scale-95"
                >
                  <span className="font-display leading-none">
                    {isStall
                      ? `${t("Book a Single Stall", "सिंगल स्टॉल बुक करें")} →`
                      : selected
                        ? `✓ ${t("Selected", "चयनित")}`
                        : `${t("Select", "चुनें")} ${tierName}`}
                  </span>
                </button>
              }
            />
            )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Step 2 · Build the menu (per-category vendor + items) ───────────  */
function StepMenu({
  lang,
  t,
  title,
  subtitle,
  multiVendor,
  maxVendors,
  categories,
  activeCat,
  setActiveCat,
  categoryVendor,
  pickVendor,
  itemsFor,
  toggleItem,
  allowanceFor,
  baseAllowanceFor,
  platformAllowanceFor,
  tierName,
  categoryComplete,
  isSkipped,
  unskipCat,
  onSkipMenu,
  showItemPrice = false,
  fixedStall = () => false,
  vendorRatings,
}: {
  lang: Lang;
  t: (en: string, hi: string) => string;
  /** Step heading + sub — differs for the Menu (2) vs Live Stall (3) steps. */
  title?: string;
  subtitle?: string;
  multiVendor: boolean;
  maxVendors?: number;
  categories: MenuCategory[];
  activeCat: number;
  setActiveCat: (n: number) => void;
  categoryVendor: VendorMap;
  pickVendor: (catId: string, vendorId: string) => void;
  itemsFor: (catId: string) => string[];
  toggleItem: (catId: string, itemId: string) => void;
  /** Effective course allowance — scaled by vendor count on multi-vendor tiers. */
  allowanceFor: (catId: string) => number;
  /** Per-vendor dish quota (unscaled). Pass a vendor id to get that caterer's
   *  own published quota for the band; without one, the package's base. */
  baseAllowanceFor: (catId: string, vendorId?: string) => number;
  /** The package's own standard for a course — the number the home page's tier
   *  card advertises. Compared against the caterer's to keep the two honest. */
  platformAllowanceFor: (catId: string) => number;
  /** Band being browsed, named for the copy ("…on Gold"). Null on Single Stall,
   *  which has no band and so no standard to differ from. */
  tierName: VendorTier | null;
  categoryComplete: (cat: MenuCategory) => boolean;
  isSkipped: (catId: string) => boolean;
  unskipCat: (catId: string) => void;
  /** Single Stall only — skip the whole menu and go straight to add-ons. */
  onSkipMenu?: () => void;
  /** Single Stall — surface each delicacy's own per-plate price (vendors who
   *  sell Single Stall price dishes individually). Display only; the checkout
   *  total still runs on the course per-plate. */
  showItemPrice?: boolean;
  /** Whether this stall serves a fixed spread — every dish included, nothing
   *  for the guest to pick. Its dishes render read-only and the course reads as
   *  built the moment the stall is chosen. Only Single Stall passes a real
   *  predicate; the feast bands always let the guest build. */
  fixedStall?: (vendor: CategoryVendor) => boolean;
  vendorRatings: VendorRatings;
}) {
  const vendorScrollRef = useRef<HTMLDivElement>(null);
  // "Explore more" lets guests expand past the shortlist cap. Collapse it again
  // whenever the cap or the course changes, so a category never opens already
  // expanded from a previous one.
  const [showAllVendors, setShowAllVendors] = useState(false);
  useEffect(() => setShowAllVendors(false), [maxVendors, activeCat]);
  // Once a vendor is picked the rest of the roster collapses behind a single
  // row, so the chosen vendor's menu (below it) leads instead of competing with
  // a wall of cards. Re-collapses whenever the guest switches course.
  const [showOthers, setShowOthers] = useState(false);
  useEffect(() => setShowOthers(false), [activeCat]);
  const [vendorSearch, setVendorSearch] = useState("");
  // The filter is reveal-on-demand (see toggle by the "Pick a vendor" heading), so it
  // stays collapsed until the guest asks for it.
  const [showSearch, setShowSearch] = useState(false);
  // A query only matches the active course's roster, so collapse & clear it
  // whenever the guest switches courses — carrying it across tabs would strand
  // results behind an empty state.
  useEffect(() => {
    setShowSearch(false);
    setVendorSearch("");
  }, [activeCat]);
  // Guard against a transient out-of-range index right after the package (and
  // thus the category list) changes, before the parent's clamp effect runs.
  const cat = categories[activeCat] ?? categories[0];
  // Every course caps its roster to a scannable shortlist: admin-pinned "Top 5"
  // brands lead, seed brands fill the remaining slots, and live caterers (who
  // published a menu) always stay visible whatever the tier. Silver & Gold pass
  // their own curated cap; every other package defaults to five. "Explore more"
  // lifts the cap on demand, and an active search scans the *full* roster so the
  // cap never hides a match.
  const VENDOR_CAP = maxVendors ?? 5;
  // The guest's picked vendor(s) for this course — floated to the very front of
  // the roster so a pre-selected stall (deep-linked "Book this caterer") or a
  // just-picked one always leads and is never capped out behind "Explore more".
  const selectedIds = categoryVendor[cat.id] ?? [];
  const isSelectedVendor = (v: MenuCategory["vendors"][number]) =>
    selectedIds.includes(v.id);
  const floatSelected = (list: MenuCategory["vendors"]) => [
    ...list.filter(isSelectedVendor),
    ...list.filter((v) => !isSelectedVendor(v)),
  ];
  const pinnedVendors = cat.vendors.filter((v) => v.pinned);
  const seedVendors = cat.vendors.filter((v) => !v.live && !v.pinned);
  const liveVendors = cat.vendors.filter((v) => v.live && !v.pinned);
  // Full roster in display order — picked first, then pinned, seed, live.
  const orderedVendors = floatSelected([
    ...pinnedVendors,
    ...seedVendors,
    ...liveVendors,
  ]);
  const seedSlots = Math.max(0, VENDOR_CAP - pinnedVendors.length);
  // Collapsed view: the leading shortlist — but any selected vendor is always
  // pulled in (never hidden by the cap) and floated to the front.
  const shortlist = [
    ...pinnedVendors,
    ...seedVendors.slice(0, seedSlots),
    ...liveVendors,
  ];
  const cappedVendors = showAllVendors
    ? orderedVendors
    : floatSelected([
        ...shortlist,
        ...cat.vendors.filter(
          (v) => isSelectedVendor(v) && !shortlist.includes(v),
        ),
      ]);
  // Whatever the collapsed view omits is exactly what "Explore more" reveals.
  const hiddenVendorCount = Math.max(
    0,
    orderedVendors.length - cappedVendors.length,
  );
  // Offer the filter only when the full roster runs past five — a short
  // shortlist scans faster by eye than by typing.
  const searchable = orderedVendors.length > 5;
  const toggleSearch = () => {
    if (showSearch) {
      // Closing removes the filter so no hidden query lingers on the roster.
      setVendorSearch("");
      setShowSearch(false);
    } else {
      setShowSearch(true);
    }
  };
  const vSearchQuery = vendorSearch.trim().toLowerCase();
  // With a query, scan the full roster (bypassing the cap so hidden brands are
  // still findable); otherwise show the capped shortlist as-is.
  const filteredVendors = (vSearchQuery ? orderedVendors : cappedVendors).filter(
    (v) => {
      if (!vSearchQuery) return true;
      const nameMatch = v.name.toLowerCase().includes(vSearchQuery);
      const itemMatch = v.items?.some((item) =>
        item.name.toLowerCase().includes(vSearchQuery),
      );
      const cuisineMatch = Array.isArray((v as any).cuisines)
        ? (v as any).cuisines.some((c: string) =>
            c.toLowerCase().includes(vSearchQuery),
          )
        : typeof (v as any).cuisine === "string"
          ? (v as any).cuisine.toLowerCase().includes(vSearchQuery)
          : false;
      return nameMatch || itemMatch || cuisineMatch;
    },
  );
  const allowance = allowanceFor(cat.id); // effective total (scaled per vendor)
  const selectedVendors = cat.vendors.filter((v) => selectedIds.includes(v.id));
  // Each chosen caterer may publish its own quota for this course, so the
  // "one dish from each vendor" line only holds when they all agree; when they
  // don't, `null` sends the copy to the per-card counts instead.
  const uniformBase: number | null = (() => {
    const bases = selectedVendors.map((v) => baseAllowanceFor(cat.id, v.id));
    if (bases.length === 0) return baseAllowanceFor(cat.id);
    return bases.every((n) => n === bases[0]) ? bases[0] : null;
  })();
  // The tier card on the home page advertises a standard count for this course
  // ("5 Starters"), but a caterer may publish their own — and once one is
  // picked, theirs is the number on screen. Name whose it is, or the wizard
  // silently contradicts the card the guest chose their package from.
  const platformBase = platformAllowanceFor(cat.id);
  const quotaNote = (() => {
    if (!tierName) return "";
    const off = selectedVendors.filter(
      (v) => baseAllowanceFor(cat.id, v.id) !== platformBase,
    );
    if (off.length === 0) return "";
    return off
      .map((v) => {
        const n = baseAllowanceFor(cat.id, v.id);
        return t(
          `${v.name} serves ${n} ${n === 1 ? "dish" : "dishes"} from this course on ${tierName} — our ${tierName} standard is ${platformBase}.`,
          `${v.name} ${tierName} पर इस कोर्स से ${n} डिश देते हैं — हमारा ${tierName} मानक ${platformBase} है।`,
        );
      })
      .join(" ");
  })();
  const picks = itemsFor(cat.id);
  // Every stall picked for this course serves a set spread, so the whole block
  // below reads as "here's what's coming" rather than as a dish picker. Fixed
  // and varied stalls never mix on a course — only Single Stall marks a stall
  // fixed, and it allows one stall per course.
  const allFixed =
    selectedVendors.length > 0 && selectedVendors.every(fixedStall);
  // The browsable roster excludes whatever's already picked — a chosen vendor
  // shows up above with its menu attached, so leaving it in the strip below
  // would list it twice.
  const rosterVendors = filteredVendors.filter((v) => !isSelectedVendor(v));
  // Everything the collapsed row stands in for — the whole unpicked roster, not
  // just the capped shortlist, so the count doesn't undersell what's behind it.
  const otherCount = cat.vendors.length - selectedVendors.length;
  // With nothing picked the roster is the step. After the first pick it folds
  // into one row, and only a deliberate tap (or an active search) reopens it.
  const othersOpen =
    selectedVendors.length === 0 || showOthers || Boolean(vSearchQuery);
  return (
    <div className="min-w-0">
      <SectionHead
        title={title ?? t("Build Your Menu", "अपना मेन्यू बनाएं")}
        sub={subtitle}
      />

      {/* Single Stall only — a guest who just wants live counters & extras can
          bypass the courses entirely and jump to the add-ons step. */}
      {onSkipMenu && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cream-3 bg-cream-2/40 px-4 py-3 text-sm text-ink-soft">
          <span>
            {t(
              "Not building a menu? Skip straight to live counters & extras.",
              "मेन्यू नहीं बना रहे? सीधे लाइव काउंटर और एक्स्ट्रा पर जाएं।",
            )}
          </span>
          <button
            type="button"
            onClick={onSkipMenu}
            className="shrink-0 rounded-full border border-maroon px-4 py-1.5 text-xs font-semibold text-maroon transition hover:bg-maroon hover:text-cream"
          >
            {t("Skip menu · Add extras only", "मेन्यू छोड़ें · सिर्फ़ एक्स्ट्रा")} →
          </button>
        </div>
      )}

      {/* Category tabs */}
      <div className="-mx-3 flex flex-nowrap items-center gap-2 overflow-x-auto px-3 no-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {categories.map((c, i) => {
          const active = i === activeCat;
          const complete = categoryComplete(c);
          const skipped = isSkipped(c.id);
          return (
            <Fragment key={c.id}>
              {/* Mobile — vertical icon-card chip (app mockup): icon on top,
                  title-case label below; the active course fills cream with a
                  red label. Completion ✓ and skipped state carry over. */}
              <button
                type="button"
                onClick={() => setActiveCat(i)}
                className={
                  "flex min-w-[4.5rem] shrink-0 flex-col items-center gap-1 whitespace-nowrap rounded-xl border px-3 py-2 text-center transition sm:hidden " +
                  (active
                    ? "border-maroon/40 bg-cream/60 shadow-sm"
                    : skipped
                      ? "border-cream-3 bg-cream-2/60 opacity-70"
                      : "border-cream-3 bg-white")
                }
              >
                <span aria-hidden="true" className="text-xl leading-none">
                  {c.icon}
                </span>
                <span
                  className={
                    "text-[11px] font-semibold leading-tight " +
                    (active
                      ? "text-maroon"
                      : skipped
                        ? "text-ink-soft/60 line-through"
                        : "text-ink")
                  }
                >
                  {lang === "hi" ? c.nameHi : c.name}
                  {complete && (
                    <span aria-hidden="true" className="ml-1 text-maroon">
                      ✓
                    </span>
                  )}
                </span>
                {skipped && (
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-ink-soft/60">
                    {t("Skipped", "छोड़ा")}
                  </span>
                )}
              </button>
              {/* Desktop — original pill chip (unchanged). */}
              <button
                type="button"
                onClick={() => setActiveCat(i)}
                className={
                  "hidden shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition sm:flex " +
                  (active
                    ? "border-maroon bg-maroon text-cream"
                    : skipped
                      ? "border-cream-3 bg-cream-2/60 text-ink-soft/60 hover:bg-cream-2"
                      : "border-cream-3 bg-white text-ink-soft hover:bg-cream-2")
                }
              >
                <span aria-hidden="true">{c.icon}</span>
                <span
                  className={
                    "eyebrow text-xs" + (skipped && !active ? " line-through" : "")
                  }
                >
                  {(lang === "hi" ? c.nameHi : c.name).toUpperCase()}
                </span>
                {complete ? (
                  <span aria-hidden="true" className={active ? "text-cream" : "text-maroon"}>
                    ✓
                  </span>
                ) : skipped ? (
                  <span
                    className={
                      "eyebrow text-[10px] font-semibold " +
                      (active ? "text-cream" : "text-ink-soft/60")
                    }
                  >
                    {t("SKIPPED", "छोड़ा")}
                  </span>
                ) : null}
              </button>
            </Fragment>
          );
        })}
      </div>

      {/* Skipped-stall notice — the guest opted out of this stall; picking any
          vendor below folds it straight back in, or they can undo explicitly. */}
      {isSkipped(cat.id) && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-maroon/30 bg-cream/40 px-4 py-3 text-sm text-ink-soft">
          <span className="flex items-start gap-2">
            <span aria-hidden="true" className="text-maroon">
              ★
            </span>
            <span>
              {t(
                "You've skipped this stall — it won't be in your order or price. Pick a vendor below to add it back.",
                "आपने यह स्टॉल छोड़ दिया है — यह आपके ऑर्डर या कीमत में नहीं होगा। इसे वापस जोड़ने के लिए नीचे वेंडर चुनें।",
              )}
            </span>
          </span>
          <button
            type="button"
            onClick={() => unskipCat(cat.id)}
            className="shrink-0 rounded-full border border-maroon px-4 py-1.5 text-xs font-semibold text-maroon transition hover:bg-maroon hover:text-cream"
          >
            {t("Undo skip", "छोड़ना पूर्ववत करें")}
          </button>
        </div>
      )}

      {/* ── Your pick, with its menu docked underneath ───────────────────────
          The moment a vendor is chosen it leads the step and its dishes hang
          straight off it, so a dish is never ambiguous about who's cooking it.
          Multi-vendor tiers repeat the pair (vendor → that vendor's menu) once
          per pick; every unpicked vendor folds into the single row below. */}
      {selectedVendors.length > 0 && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-sans text-lg font-semibold text-maroon sm:text-xl">
              {allFixed
                ? t("What's served", "क्या परोसा जाएगा")
                : t("Choose dishes", "व्यंजन चुनें")}
            </h4>
            <span
              className={
                "text-[11px] font-bold uppercase tracking-wide text-maroon sm:text-base sm:normal-case sm:tracking-normal " +
                (picks.length >= allowance ? "sm:text-maroon" : "sm:text-ink-soft")
              }
            >
              {allFixed
                ? `${picks.length} ${t("INCLUDED", "शामिल")}`
                : `${picks.length}/${allowance} ${t("PICKED", "चुने गए")}`}
            </span>
          </div>

          {/* A fixed stall is a set spread — say so up front, so the read-only
              dish list below reads as "this is what comes" rather than as a
              picker that's failed to respond. */}
          {allFixed && (
            <p className="-mt-2 text-xs text-ink-soft">
              {t(
                "This stall serves a set menu — every dish below comes to your event, at one per-plate rate. Nothing to pick.",
                "यह स्टॉल तय मेन्यू परोसता है — नीचे की हर डिश आपके आयोजन में आएगी, एक ही प्रति-प्लेट दर पर। कुछ चुनना नहीं है।",
              )}
            </p>
          )}

          {/* Whose count this is, whenever the caterer's differs from the tier
              card's. Kept next to the counter it explains. */}
          {!allFixed && quotaNote && (
            <p className="-mt-2 text-xs text-ink-soft">{quotaNote}</p>
          )}

          {/* Multi-vendor tiers give each vendor its own quota, so the guest can
              take the full course from every vendor they picked (e.g. a welcome
              drink from each). Spell that out so the per-vendor counters read as
              intended, not as one shared cap. */}
          {multiVendor && selectedVendors.length > 1 && (
            <p className="-mt-2 text-xs text-ink-soft">
              {uniformBase === null
                ? t(
                    "Each vendor opens up its own number of dishes for this course — the count is on their card.",
                    "इस कोर्स के लिए हर वेंडर अपनी अलग संख्या में व्यंजन देता है — गिनती उनके कार्ड पर है।",
                  )
                : uniformBase === 1
                  ? t(
                      "You can pick one dish from each vendor for this course.",
                      "इस कोर्स के लिए आप हर वेंडर से एक व्यंजन चुन सकते हैं।",
                    )
                  : t(
                      `You can pick up to ${uniformBase} dishes from each vendor for this course.`,
                      `इस कोर्स के लिए आप हर वेंडर से ${uniformBase} व्यंजन तक चुन सकते हैं।`,
                    )}
            </p>
          )}

          {selectedVendors.map((vendor) => {
            // On multi-vendor tiers each vendor fills its OWN quota, so the cap
            // (and counter) are scoped to this vendor's picks.
            const vendorItemPicks = picks.filter((id) =>
              id.startsWith(`${vendor.id}-`),
            );
            // This caterer's own quota for the course, which may differ from
            // the package base and from the stall next to it.
            const vendorBase = baseAllowanceFor(cat.id, vendor.id);
            const vendorFull = vendorItemPicks.length >= vendorBase;
            const stat = statFor(vendorRatings, vendor);
            // A set-menu stall: its dishes are listed, not offered.
            const fixed = fixedStall(vendor);
            return (
              <div
                key={vendor.id}
                className="overflow-hidden rounded-2xl border border-maroon bg-white shadow-sm"
              >
                {/* Chosen vendor — one tap on "Change" drops it and reopens the
                    roster, the same as tapping it again in the list. */}
                <div className="flex items-center gap-2.5 border-b border-cream-3 p-2.5 sm:gap-3 sm:p-3">
                  <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-cream-3 bg-cream-2 sm:h-14 sm:w-14">
                    <Image
                      src={vendor.image}
                      alt={vendor.name}
                      fill
                      sizes="(min-width: 640px) 56px, 44px"
                      className="object-cover"
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-sans text-sm font-semibold text-maroon sm:text-base">
                        {vendor.name}
                      </span>
                      <span className="shrink-0 rounded-full border border-maroon/30 bg-cream px-2 py-0.5 text-[10px] font-semibold text-maroon">
                        {t("Selected", "चयनित")}
                      </span>
                      {fixed && (
                        <span className="shrink-0 rounded-full border border-maroon bg-maroon px-2 py-0.5 text-[10px] font-semibold text-cream">
                          {t("Set menu", "तय मेन्यू")}
                        </span>
                      )}
                    </span>
                    {stat ? (
                      <span className="mt-0.5 text-xs font-semibold text-maroon">
                        ★ {stat.rating} ·{" "}
                        {t(`${stat.count} verified`, `${stat.count} सत्यापित`)}
                      </span>
                    ) : vendor.reviews > 0 ? (
                      <span className="mt-0.5 text-xs text-ink-soft">
                        ⭐ {vendor.rating}{" "}
                        <span className="text-ink-soft/70">
                          ({inr.format(vendor.reviews)})
                        </span>
                      </span>
                    ) : null}
                    {showItemPrice && vendor.perPlate > 0 && (
                      <span className="mt-0.5 text-xs font-bold text-maroon">
                        {money(vendor.perPlate)} / {t("person", "व्यक्ति")}
                      </span>
                    )}
                  </span>
                  {multiVendor && !fixed && (
                    <span
                      className={
                        "eyebrow shrink-0 text-[10px] font-semibold " +
                        (vendorFull ? "text-maroon" : "text-ink-soft")
                      }
                    >
                      {vendorItemPicks.length}/{vendorBase}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => pickVendor(cat.id, vendor.id)}
                    className="shrink-0 rounded-full border border-maroon px-3 py-1.5 text-[11px] font-semibold text-maroon transition hover:bg-maroon hover:text-cream sm:text-xs"
                  >
                    {multiVendor ? t("Remove", "हटाएं") : t("Change", "बदलें")}
                  </button>
                </div>
                {/* This vendor's dishes — one row each, single tap to add or
                    remove. Swiggy/Zomato-style: thumbnail left, control right.
                    A set-menu stall lists the same rows read-only: every dish is
                    already in, so there's nothing to tap. */}
                <div className="flex flex-col gap-2 bg-cream-2/30 p-2.5 sm:p-4">
                  {vendor.items.map((it: CategoryItem) => {
                    const active = picks.includes(it.id);
                    const atCap =
                      !fixed &&
                      !active &&
                      (multiVendor ? vendorFull : picks.length >= allowance);
                    // Veg → green, non-veg → brand maroon. The card border and
                    // Add control take the diet colour so a dish reads as veg /
                    // non-veg at a glance (green = #1a7f37, standard veg green).
                    const veg = it.diet === "veg";
                    const dietBorder = veg ? "border-[#1a7f37]" : "border-maroon";
                    const dietRing = veg ? "ring-[#1a7f37]" : "ring-maroon";
                    const dietBg = veg ? "bg-[#1a7f37]" : "bg-maroon";
                    const dietText = veg ? "text-[#1a7f37]" : "text-maroon";
                    const rowClass =
                      "flex w-full items-center gap-3 rounded-2xl border p-1.5 text-left shadow-sm transition sm:gap-4 sm:p-2.5 " +
                      dietBorder +
                      " " +
                      (fixed
                        ? "bg-cream-2 ring-1 " + dietRing
                        : active
                          ? "bg-cream-2 ring-1 " + dietRing
                          : atCap
                            ? "cursor-not-allowed bg-white opacity-50"
                            : "bg-white hover:-translate-y-0.5 hover:shadow-md");
                    const row = (
                      <>
                        {/* Dish thumbnail — real photo when the vendor uploaded
                            one, otherwise a deterministic premium food shot. */}
                        <span className="relative block h-[51px] w-[51px] shrink-0 overflow-hidden rounded-xl border border-cream-3 bg-cream-2 shadow-sm sm:h-16 sm:w-16 sm:rounded-2xl">
                          <Image
                            src={it.photo ?? dummyDishPhoto(it.id)}
                            alt=""
                            fill
                            sizes="(min-width: 640px) 64px, 51px"
                            className="object-cover"
                          />
                        </span>
                        {/* Diet mark + dish name (+ per-delicacy price on a
                            varied Single Stall, where vendors price each dish;
                            a set menu carries one rate for the whole spread, so
                            per-dish prices would misread there). The mark is the
                            standard dot-in-a-square so it never reads as a second
                            checkbox next to the Add control. */}
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={
                              "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-sm border " +
                              dietBorder
                            }
                          >
                            <span
                              className={
                                "block h-1.5 w-1.5 rounded-full " + dietBg
                              }
                            />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-ink sm:text-base">
                              {it.name}
                            </span>
                            {showItemPrice &&
                              !fixed &&
                              (it.price ?? vendor.perPlate) > 0 && (
                                <span className="block text-xs font-semibold text-maroon">
                                  {money(it.price ?? vendor.perPlate)}/
                                  {t("plate", "प्लेट")}
                                </span>
                              )}
                          </span>
                        </span>
                        {/* Add / added control — the same single tap adds the
                            dish and takes it back off. On a set menu it's a
                            static "Included" mark, not a control. */}
                        <span
                          className={
                            "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition sm:px-5 sm:py-2 sm:text-xs " +
                            dietBorder +
                            " " +
                            (fixed || active
                              ? dietBg + " text-cream"
                              : "bg-white " + dietText)
                          }
                        >
                          {fixed
                            ? `✓ ${t("Included", "शामिल")}`
                            : active
                              ? `✓ ${t("Added", "जोड़ा")}`
                              : t("Add", "जोड़ें")}
                        </span>
                      </>
                    );
                    return fixed ? (
                      <div key={it.id} className={rowClass}>
                        {row}
                      </div>
                    ) : (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => toggleItem(cat.id, it.id)}
                        disabled={atCap}
                        aria-pressed={active}
                        className={rowClass}
                      >
                        {row}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Every unpicked vendor folds into this single row — one tap reopens the
          full roster to swap or (on multi-vendor tiers) add another. */}
      {selectedVendors.length > 0 && otherCount > 0 && !vSearchQuery && (
        <button
          type="button"
          onClick={() => setShowOthers((s) => !s)}
          aria-expanded={othersOpen}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-cream-3 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-maroon sm:px-4 sm:py-3"
        >
          <span aria-hidden="true" className="flex shrink-0 -space-x-2">
            {rosterVendors.slice(0, 3).map((v) => (
              <span
                key={v.id}
                className="relative block h-8 w-8 overflow-hidden rounded-full border-2 border-white bg-cream-2"
              >
                <Image src={v.image} alt="" fill sizes="32px" className="object-cover" />
              </span>
            ))}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
            {multiVendor
              ? t(
                  `Add another vendor · ${otherCount} more`,
                  `और वेंडर जोड़ें · ${otherCount} और`,
                )
              : t(
                  `Change vendor · ${otherCount} more`,
                  `वेंडर बदलें · ${otherCount} और`,
                )}
          </span>
          <span
            aria-hidden="true"
            className="shrink-0 text-base font-semibold leading-none text-maroon"
          >
            {othersOpen ? "↑" : "↓"}
          </span>
        </button>
      )}

      {othersOpen && (
        <>
      {/* Pick a vendor (multiple allowed on Platinum) */}
      <div className="mt-7 flex items-center justify-between gap-3">
        <h3 className="font-sans text-2xl font-semibold text-maroon">
          {multiVendor
            ? t("Pick vendors (select multiple)", "वेंडर चुनें (कई चुनें)")
            : t("Pick a vendor", "वेंडर चुनें")}
        </h3>
        {/* Filter is offered only when the roster is long enough to be worth
            typing over — a short shortlist stays clutter-free. */}
        {searchable && (
          <button
            type="button"
            onClick={toggleSearch}
            aria-expanded={showSearch}
            className={
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition " +
              (showSearch
                ? "border-maroon bg-maroon text-cream"
                : "border-cream-3 bg-white text-ink-soft hover:border-maroon hover:text-maroon")
            }
          >
            <span aria-hidden="true">🔍</span>
            {showSearch ? t("Close", "बंद करें") : t("Search", "खोजें")}
          </button>
        )}
      </div>

      {searchable && showSearch && (
        <div className="relative mt-3">
          <input
            type="search"
            autoFocus
            value={vendorSearch}
            onChange={(e) => setVendorSearch(e.target.value)}
            placeholder={t(
              "Search vendors by name or cuisine...",
              "नाम या व्यंजन से वेंडर खोजें...",
            )}
            aria-label={t(
              "Search vendors by name or cuisine",
              "नाम या व्यंजन से वेंडर खोजें",
            )}
            className="w-full rounded-2xl border border-cream-3 bg-white px-4 py-2.5 pr-10 text-sm text-ink shadow-sm transition placeholder:text-ink-soft/60 focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon"
          />
          {vendorSearch && (
            <button
              type="button"
              onClick={() => setVendorSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-soft transition hover:text-maroon"
              aria-label={t("Clear search", "खोज साफ़ करें")}
            >
              ✕
            </button>
          )}
        </div>
      )}
      {/* Mobile — vertical radio-row list (app-style). Each vendor reads as one
          tappable row: selection radio · thumbnail · name + rating · affordance.
          The horizontal cards below are kept untouched for tablet / desktop. */}
      <div className="mt-3 sm:hidden">
        {rosterVendors.length === 0 ? (
          <p className="py-8 text-center text-sm font-medium text-ink-soft">
            {t(
              `No vendors matching "${vendorSearch}" in this category.`,
              `इस श्रेणी में "${vendorSearch}" से मेल खाता कोई वेंडर नहीं मिला।`,
            )}
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {rosterVendors.map((v) => {
              const selected = selectedIds.includes(v.id);
              const stat = statFor(vendorRatings, v);
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => pickVendor(cat.id, v.id)}
                    className={
                      "flex w-full items-center gap-3 rounded-2xl border bg-white p-2.5 text-left shadow-sm transition " +
                      (selected
                        ? "border-maroon ring-2 ring-maroon"
                        : "border-cream-3")
                    }
                  >
                    {/* Selection radio */}
                    <span
                      aria-hidden="true"
                      className={
                        "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition " +
                        (selected ? "border-maroon" : "border-cream-3")
                      }
                    >
                      {selected && (
                        <span className="h-2.5 w-2.5 rounded-full bg-maroon" />
                      )}
                    </span>
                    {/* Thumbnail */}
                    <span className="relative block h-[54px] w-[54px] shrink-0 overflow-hidden rounded-xl border border-cream-3 bg-cream-2">
                      <Image
                        src={v.image}
                        alt={v.name}
                        fill
                        sizes="54px"
                        className="object-cover"
                      />
                    </span>
                    {/* Name + rating — same content as the desktop card. */}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-sans text-sm font-semibold text-maroon">
                        {v.name}
                      </span>
                      {v.reviews > 0 ? (
                        <span className="mt-0.5 text-xs text-ink-soft">
                          ⭐ {v.rating}{" "}
                          <span className="text-ink-soft/70">
                            ({inr.format(v.reviews)})
                          </span>
                        </span>
                      ) : v.googleRating ? (
                        <span className="mt-0.5 text-xs text-ink-soft">
                          <span aria-hidden="true" className="text-maroon">
                            ★
                          </span>{" "}
                          <span className="font-semibold text-ink">
                            {v.googleRating}
                          </span>{" "}
                          <span className="text-ink-soft/70">
                            {t("Google", "गूगल")}
                            {v.googleReviews
                              ? ` (${inr.format(v.googleReviews)})`
                              : ""}
                          </span>
                        </span>
                      ) : !stat ? (
                        <span className="mt-0.5 text-xs font-semibold text-maroon">
                          {t("New on Bhojpatra", "भोजपत्र पर नया")}
                        </span>
                      ) : null}
                      {stat && (
                        <span className="mt-0.5 text-xs font-semibold text-maroon">
                          ★ {stat.rating} ·{" "}
                          {t(`${stat.count} verified`, `${stat.count} सत्यापित`)}
                        </span>
                      )}
                      {/* Vendor's own per-person price — Single Stall only
                          (`showItemPrice`), where vendors price individually.
                          Fixed tiers price via the package, so no price here. */}
                      {showItemPrice && v.perPlate > 0 && (
                        <span className="mt-0.5 text-xs font-bold text-maroon">
                          {money(v.perPlate)} /{" "}
                          {t("person", "व्यक्ति")}
                          {/* A set-menu stall's rate buys the whole spread, so
                              say so here — before the guest picks and finds
                              there's nothing to choose. */}
                          {fixedStall(v) && (
                            <span className="font-semibold text-ink-soft">
                              {" · "}
                              {t(
                                `set menu, all ${v.items.length} dishes`,
                                `तय मेन्यू, सभी ${v.items.length} डिश`,
                              )}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                    {/* Selected mark / tap affordance */}
                    <span
                      aria-hidden="true"
                      className={
                        "shrink-0 pr-0.5 text-lg leading-none " +
                        (selected ? "text-maroon" : "text-ink-soft/40")
                      }
                    >
                      {selected ? "✓" : "›"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="relative mt-3 hidden sm:block">
      {rosterVendors.length === 0 ? (
        <p className="py-8 text-center text-sm font-medium text-ink-soft">
          {t(
            `No vendors matching "${vendorSearch}" in this category.`,
            `इस श्रेणी में "${vendorSearch}" से मेल खाता कोई वेंडर नहीं मिला।`,
          )}
        </p>
      ) : (
      <div
        ref={vendorScrollRef}
        // px/pt + matching -mx give the hover-lift and the selected ring-2 room
        // inside the scroller — overflow-x-auto otherwise clips them (the cards
        // looked cropped from the top and the red selected ring vanished).
        className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3 pt-2"
      >
        {rosterVendors.map((v) => {
          const selected = selectedIds.includes(v.id);
          const stat = statFor(vendorRatings, v);
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={selected}
              onClick={() => pickVendor(cat.id, v.id)}
              className={
                "group relative flex w-36 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md sm:w-[202px] " +
                (selected ? "border-maroon ring-2 ring-maroon" : "border-cream-3")
              }
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <Image
                  src={v.image}
                  alt={v.name}
                  fill
                  sizes="(min-width: 640px) 202px, 144px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col p-2.5 sm:p-3.5">
                <h4 className="font-sans text-xs font-semibold text-maroon sm:text-sm">
                  {v.name}
                </h4>
                {v.reviews > 0 ? (
                  <p className="mt-1 text-xs text-ink-soft">
                    ⭐ {v.rating}{" "}
                    <span className="text-ink-soft/70">
                      ({inr.format(v.reviews)})
                    </span>
                  </p>
                ) : v.googleRating ? (
                  <p className="mt-1 text-xs text-ink-soft">
                    <span aria-hidden="true" className="text-maroon">★</span>{" "}
                    <span className="font-semibold text-ink">{v.googleRating}</span>{" "}
                    <span className="text-ink-soft/70">
                      {t("Google", "गूगल")}
                      {v.googleReviews ? ` (${inr.format(v.googleReviews)})` : ""}
                    </span>
                  </p>
                ) : (
                  !stat && (
                    <p className="mt-1 text-xs font-semibold text-maroon">
                      {t("New on Bhojpatra", "भोजपत्र पर नया")}
                    </p>
                  )
                )}
                {stat && (
                  <p className="mt-1 text-xs font-semibold text-maroon">
                    ★ {stat.rating} ·{" "}
                    {t(
                      `${stat.count} verified`,
                      `${stat.count} सत्यापित`,
                    )}
                  </p>
                )}
              </div>
              <span
                className={
                  "block py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide transition sm:py-2 sm:text-xs " +
                  (selected
                    ? "bg-maroon text-cream"
                    : "bg-cream-2 text-ink-soft group-hover:bg-cream-3")
                }
              >
                {selected ? `✓ ${t("Selected", "चयनित")}` : t("Select", "चुनें")}
              </span>
            </button>
          );
        })}
      </div>
      )}

        {/* Scroll hint — more vendors than fit; nudge the guest to scroll. */}
        {rosterVendors.length > 5 && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent"
            />
            <button
              type="button"
              aria-label={t("Show more vendors", "और वेंडर दिखाएं")}
              onClick={() =>
                vendorScrollRef.current?.scrollBy({
                  left: 240,
                  behavior: "smooth",
                })
              }
              className="absolute right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-cream-3 bg-maroon text-cream shadow-md transition hover:scale-105"
            >
              <span aria-hidden="true" className="text-lg leading-none">→</span>
            </button>
          </>
        )}
      </div>

      {/* Explore more — each course shows a capped shortlist; let guests expand
          it to browse the rest of the roster on demand. Hidden while a search is
          active, since the query already scans the full roster. */}
      {hiddenVendorCount > 0 && !vSearchQuery && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAllVendors((s) => !s)}
            className="inline-flex items-center gap-2 rounded-full border border-maroon/40 bg-white px-5 py-2.5 text-sm font-semibold text-maroon shadow-sm transition hover:bg-maroon hover:text-cream"
          >
            {showAllVendors
              ? t("Show fewer vendors", "कम वेंडर दिखाएं")
              : t(
                  `Explore ${hiddenVendorCount} more vendors`,
                  `${hiddenVendorCount} और वेंडर देखें`,
                )}
            <span aria-hidden="true" className="text-base leading-none">
              {showAllVendors ? "↑" : "↓"}
            </span>
          </button>
        </div>
      )}
        </>
      )}

      {/* Nothing picked yet — the roster above is the whole step; say what a
          pick unlocks so the empty space below reads as intentional. */}
      {selectedVendors.length === 0 && (
        <p className="mt-6 rounded-2xl border border-cream-3 bg-cream-2/30 p-5 text-sm text-ink-soft shadow-sm">
          {multiVendor
            ? t(
                "Pick one or more vendors above — each one's menu opens right below it.",
                "ऊपर एक या अधिक वेंडर चुनें — हर वेंडर का मेन्यू उसी के नीचे खुलेगा।",
              )
            : t(
                "Pick a vendor above — their menu opens right below it.",
                "ऊपर वेंडर चुनें — उनका मेन्यू उसी के नीचे खुलेगा।",
              )}
        </p>
      )}
    </div>
  );
}

/* ─── Step 3 · Event details (occasion, date, venue, guests, extras) ───── */

/* ─── Step 4 · Confirm (review + coupon + payment) ───────────────────  */
function StepConfirm({
  t,
  occasion,
  packageName,
  eventDate,
  city,
  venue,
  setVenue,
  venueFee,
  guests,
  categories,
  categoryVendor,
  itemsFor,
  selectedAddOns,
  addOnVendorNames,
  serviceName,
  serviceTotal,
  onEditMenu,
  onEditCourse,
  onRemoveVendor,
  onEditExtras,
  onEditService,
  couponInput,
  setCouponInput,
  applyCoupon,
  applyCouponCode,
  removeCoupon,
  preDiscount,
  appliedCoupon,
  couponError,
  couponDiscount,
  referralDiscount,
  referralPercent,
  grandTotal,
  bookingId,
  paidAmount,
  onPaid,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerEmail,
  setCustomerEmail,
  knownContact,
  referralCode,
  setReferralCode,
  referrerName,
  selfReferral,
  payMethod,
  setPayMethod,
  emiCount,
  setEmiCount,
  confirming,
  confirmError,
  onConfirm,
  whatsappHref,
}: {
  t: (en: string, hi: string) => string;
  occasion: OccasionOption | undefined;
  packageName: string;
  eventDate: string;
  city: City | undefined;
  venue: string;
  setVenue: (v: string) => void;
  venueFee: number;
  guests: number;
  categories: MenuCategory[];
  categoryVendor: VendorMap;
  itemsFor: (catId: string) => string[];
  selectedAddOns: string[];
  addOnVendorNames: (addOnId: string) => string[];
  serviceName?: string;
  serviceTotal: number;
  onEditMenu: () => void;
  /** Jump back to the build step focused on one course (per-course "Edit"). */
  onEditCourse: (catId: string) => void;
  /** Drop one vendor's picks from a course (per-vendor "Remove"). */
  onRemoveVendor: (catId: string, vendorId: string) => void;
  onEditExtras: () => void;
  onEditService: () => void;
  couponInput: string;
  setCouponInput: (v: string) => void;
  applyCoupon: () => void;
  applyCouponCode: (code: string) => void;
  removeCoupon: () => void;
  preDiscount: number;
  appliedCoupon: Coupon | null;
  couponError: string;
  couponDiscount: number;
  referralDiscount: number;
  referralPercent: number;
  grandTotal: number;
  bookingId: string;
  paidAmount: number;
  onPaid: (amount: number, txnRef: string) => void;
  customerName: string;
  setCustomerName: (v: string) => void;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  customerEmail: string;
  setCustomerEmail: (v: string) => void;
  /** Contact details we already hold — the signed-in account's name/email and
   *  the phone from this customer's last booking. Read back, not re-asked. */
  knownContact: { name: string; email: string; phone: string };
  referralCode: string;
  setReferralCode: (v: string) => void;
  referrerName: string;
  selfReferral: boolean;
  payMethod: OrderPaymentMethod;
  setPayMethod: (m: OrderPaymentMethod) => void;
  emiCount: number;
  setEmiCount: (n: number) => void;
  confirming: boolean;
  confirmError: string;
  onConfirm: () => void;
  whatsappHref: string;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onConfirm();
      }}
    >
      <SectionHead
        title={t("Review & Confirm", "समीक्षा और पुष्टि")}
      />

      {/* Snapshot */}
      <div className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-ink-soft">{t("Occasion", "अवसर")}</dt>
            <dd className="font-semibold text-ink">
              {occasion ? t(occasion.name, occasion.nameHi) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">{t("Package", "पैकेज")}</dt>
            <dd className="font-semibold text-ink">{packageName || "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">{t("Guests", "मेहमान")}</dt>
            <dd className="font-semibold text-ink">{inr.format(guests)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">{t("Date", "तारीख")}</dt>
            <dd className="font-semibold text-ink">{eventDate || "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">{t("City", "शहर")}</dt>
            <dd className="font-semibold text-ink">
              {city ? t(city.name, city.nameHi) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">{t("Venue", "वेन्यू")}</dt>
            <dd className="font-semibold text-ink">{venue || "—"}</dd>
          </div>
        </dl>
      </div>

      {/* Menu summary by category */}
      <div className="mt-6 rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-ink">
            {t("Your Menu", "आपका मेन्यू")}
          </h3>
          <button
            type="button"
            onClick={onEditMenu}
            className="text-sm font-semibold text-maroon hover:underline"
          >
            {t("Edit all", "सब बदलें")}
          </button>
        </div>
        {(() => {
          // One card per course that has picks, one row per selected vendor
          // (several possible on Platinum). Each row can be re-opened on the
          // build step ("Edit") or dropped from the order ("Remove").
          const cards = categories
            .map((cat) => {
              const chosen = categoryVendor[cat.id] ?? [];
              const rows = cat.vendors
                .filter((v) => chosen.includes(v.id))
                .map((v) => ({
                  vendor: v,
                  picks: v.items
                    .filter((it) => itemsFor(cat.id).includes(it.id))
                    .map((it) => it.name),
                }))
                .filter((r) => r.picks.length > 0);
              return { cat, rows };
            })
            .filter((c) => c.rows.length > 0);
          if (cards.length === 0) {
            return (
              <p className="mt-3 text-sm text-ink-soft">
                {t("No dishes selected yet.", "अभी तक कोई व्यंजन नहीं चुना गया।")}
              </p>
            );
          }
          const countPicks = (rows: { picks: string[] }[]) =>
            rows.reduce((n, r) => n + r.picks.length, 0);
          return (
            <>
              {/* Mobile — collapsible "Your Selection" cards (app mockup): one
                  card per course, the first open by default. Same vendors, dishes
                  and Edit / Remove actions as the desktop list — just accordioned. */}
              <div className="mt-3 space-y-2.5 sm:hidden">
                {cards.map(({ cat, rows }, i) => {
                  const n = countPicks(rows);
                  return (
                    <details
                      key={cat.id}
                      open={i === 0}
                      className="group overflow-hidden rounded-2xl border border-cream-3 bg-cream-2/30"
                    >
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream text-base">
                          {cat.icon}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-semibold text-ink">
                            {t(cat.name, cat.nameHi)}
                          </span>
                          <span className="text-xs text-ink-soft">
                            {n}{" "}
                            {n === 1
                              ? t("item selected", "आइटम चुना")
                              : t("items selected", "आइटम चुने")}
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className="shrink-0 text-lg leading-none text-maroon transition-transform group-open:rotate-180"
                        >
                          ⌄
                        </span>
                      </summary>
                      <div className="space-y-3 border-t border-cream-3 px-3.5 py-3">
                        {rows.map((r) => (
                          <div
                            key={r.vendor.id}
                            className="flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="eyebrow text-[11px] font-semibold text-gold">
                                {r.vendor.name}
                              </p>
                              <p className="mt-0.5 text-sm text-ink">
                                {r.picks.join(", ")}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <button
                                type="button"
                                onClick={() => onEditCourse(cat.id)}
                                className="text-xs font-semibold text-maroon hover:underline"
                              >
                                {t("Edit", "बदलें")}
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemoveVendor(cat.id, r.vendor.id)}
                                aria-label={t(
                                  `Remove ${r.vendor.name} from ${cat.name}`,
                                  `${t(cat.name, cat.nameHi)} से ${r.vendor.name} हटाएं`,
                                )}
                                className="text-xs font-semibold text-ink-soft transition hover:text-maroon hover:underline"
                              >
                                {t("Remove", "हटाएं")}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
              {/* Desktop — original flat list (unchanged). */}
              <div className="mt-3 hidden space-y-3 sm:block">
                {cards.map(({ cat, rows }) => (
                  <div key={cat.id}>
                    {rows.map((r) => (
                      <div
                        key={r.vendor.id}
                        className="mt-2 flex items-start justify-between gap-3 first:mt-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-soft">
                            {cat.icon} {t(cat.name, cat.nameHi)} ·{" "}
                            <span className="text-maroon">{r.vendor.name}</span>
                          </p>
                          <p className="text-sm text-ink">{r.picks.join(", ")}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <button
                            type="button"
                            onClick={() => onEditCourse(cat.id)}
                            className="text-xs font-semibold text-maroon hover:underline"
                          >
                            {t("Edit", "बदलें")}
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveVendor(cat.id, r.vendor.id)}
                            aria-label={t(
                              `Remove ${r.vendor.name} from ${cat.name}`,
                              `${t(cat.name, cat.nameHi)} से ${r.vendor.name} हटाएं`,
                            )}
                            className="text-xs font-semibold text-ink-soft transition hover:text-maroon hover:underline"
                          >
                            {t("Remove", "हटाएं")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </div>

      {/* Add-ons */}
      <div className="mt-6 rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-ink">
            {t("Add-ons", "एक्स्ट्रा")}
          </h3>
          <button
            type="button"
            onClick={onEditExtras}
            className="text-sm font-semibold text-maroon hover:underline"
          >
            {t("Edit", "बदलें")}
          </button>
        </div>
        {selectedAddOns.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">{t("None", "कोई नहीं")}</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {addOns
              .filter((a) => selectedAddOns.includes(a.id))
              .map((a) => {
                const vendor = addOnVendorNames(a.id).join(", ");
                return (
                  <li key={a.id} className="text-sm text-ink">
                    {a.name}
                    {vendor && (
                      <span className="text-ink-soft">
                        {" "}
                        · <span className="text-maroon">{vendor}</span>
                      </span>
                    )}
                  </li>
                );
              })}
          </ul>
        )}
      </div>

      {/* Service package */}
      <div className="mt-6 rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-ink">
            {t("Service package", "सर्विस पैकेज")}
          </h3>
          <button
            type="button"
            onClick={onEditService}
            className="text-sm font-semibold text-maroon hover:underline"
          >
            {t("Edit", "बदलें")}
          </button>
        </div>
        {serviceName ? (
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-sm text-ink">{serviceName}</p>
            <p className="shrink-0 text-sm font-semibold text-maroon">
              {serviceTotal > 0 ? money(serviceTotal) : t("Included", "शामिल")}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">{t("None", "कोई नहीं")}</p>
        )}
      </div>

      <CheckoutPanel
        t={t}
        venue={venue}
        setVenue={setVenue}
        venueFee={venueFee}
        guests={guests}
        eventDate={eventDate}
        couponInput={couponInput}
        setCouponInput={setCouponInput}
        applyCoupon={applyCoupon}
        applyCouponCode={applyCouponCode}
        removeCoupon={removeCoupon}
        preDiscount={preDiscount}
        appliedCoupon={appliedCoupon}
        couponError={couponError}
        couponDiscount={couponDiscount}
        referralCode={referralCode}
        setReferralCode={setReferralCode}
        referrerName={referrerName}
        selfReferral={selfReferral}
        referralDiscount={referralDiscount}
        referralPercent={referralPercent}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerPhone={customerPhone}
        setCustomerPhone={setCustomerPhone}
        customerEmail={customerEmail}
        setCustomerEmail={setCustomerEmail}
        knownContact={knownContact}
        bookingId={bookingId}
        grandTotal={grandTotal}
        paidAmount={paidAmount}
        payMethod={payMethod}
        setPayMethod={setPayMethod}
        emiCount={emiCount}
        setEmiCount={setEmiCount}
        onPaid={onPaid}
        confirming={confirming}
        confirmError={confirmError}
        whatsappHref={whatsappHref}
      />
    </form>
  );
}

/* ─── Selected-package rail (left side of the vendor step) ───────────── */
function SelectedPackageRail({
  lang,
  t,
  tier,
  basePerPlate,
  onChange,
  collapsible = false,
  embedded = false,
}: {
  lang: Lang;
  t: (en: string, hi: string) => string;
  tier: PackageTier | undefined;
  basePerPlate: number;
  onChange: () => void;
  /** On mobile only, collapse to a one-line summary (package · base price) that
   *  expands on tap. Desktop always renders the full detail card. */
  collapsible?: boolean;
  /** Render bare (no card chrome) as one row of a shared summary card — the
   *  collapsed line gets a pencil affordance and expands to the full detail.
   *  Used by the combined mobile brief + package card on the builder steps. */
  embedded?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!tier) return null;
  const tierName = lang === "hi" ? tier.nameHi : tier.name;
  // Fixed tiers lead with their base plate price; the Single Stall plan has no
  // base (₹0 — the menu picks set the price), so say that instead of "₹0 / plate".
  const summaryLine =
    basePerPlate > 0
      ? `${tierName} · ${money(basePerPlate)} ${t("/ plate", "/ प्लेट")}`
      : `${tierName} · ${t("priced by your menu", "कीमत आपके मेन्यू से")}`;
  return (
    <aside className={embedded ? "" : "lg:sticky lg:top-32 lg:self-start"}>
      <div
        className={
          embedded
            ? ""
            : "rounded-2xl border border-maroon bg-white p-5 shadow-sm ring-2 ring-maroon"
        }
      >
        {/* Mobile collapsed summary — package + base price on one tappable line;
            hidden on desktop, where the full card is always shown. Embedded rows
            keep it at every width and swap the chevron for a pencil edit cue. */}
        {(collapsible || embedded) && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={
              "flex w-full items-center justify-between gap-3 text-left " +
              (embedded ? "" : "lg:hidden")
            }
          >
            <span className="flex min-w-0 items-baseline gap-2">
              <span
                className={
                  "eyebrow shrink-0 " +
                  (embedded
                    ? "text-[10px] font-bold text-maroon"
                    : "text-xs font-semibold text-gold")
                }
              >
                {t("YOUR PACKAGE", "आपका पैकेज")}
              </span>
              <span className="min-w-0 text-xs font-semibold text-ink/70 line-clamp-2 sm:line-clamp-none break-words">
                {summaryLine}
              </span>
            </span>
            {embedded ? (
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0 text-maroon"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                className={
                  "h-4 w-4 shrink-0 text-maroon transition-transform " +
                  (open ? "rotate-180" : "")
                }
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            )}
          </button>
        )}
        {/* Full detail — on mobile shown only when expanded; desktop always. */}
        <div
          className={
            embedded
              ? open
                ? "mt-3"
                : "hidden"
              : collapsible
                ? open
                  ? "mt-3 lg:mt-0"
                  : "hidden lg:block"
                : ""
          }
        >
        <p
          className={
            "eyebrow text-xs font-semibold text-gold " +
            (embedded ? "hidden" : collapsible ? "hidden lg:block" : "")
          }
        >
          {t("YOUR PACKAGE", "आपका पैकेज")}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold text-maroon">
            {lang === "hi" ? tier.nameHi : tier.name}
          </h3>
          {tier.popular && (
            <span className="rounded-full bg-gold-soft/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-maroon">
              {t("Popular", "लोकप्रिय")}
            </span>
          )}
        </div>
        <p className="mt-1 text-lg font-semibold text-maroon">
          {tier.price}
          <span className="text-xs font-normal text-ink-soft">
            {" "}
            {lang === "hi" ? tier.unitHi : tier.unit}
          </span>
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          {t("Base / plate", "बेस / प्लेट")}:{" "}
          <span className="font-semibold text-ink">{money(basePerPlate)}</span>
        </p>
        {(lang === "hi" ? tier.paxHi : tier.pax) && (
          <p className="mt-1 text-sm text-ink-soft">
            {t("Guests", "मेहमान")}:{" "}
            <span className="font-semibold text-ink">
              {lang === "hi" ? tier.paxHi : tier.pax}
            </span>
          </p>
        )}
        <ul className="mt-3 flex flex-col gap-1.5">
          {tier.features.map((feature, i) => {
            const label = lang === "hi" ? feature.labelHi : feature.label;
            if (feature.heading) {
              return (
                <li key={i} className="pt-1 text-sm font-semibold text-ink">
                  {label}
                </li>
              );
            }
            return (
              <li
                key={i}
                className="flex items-start gap-1.5 text-sm text-ink-soft"
              >
                <span aria-hidden="true" className="text-maroon">
                  ✓
                </span>
                {label}
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={onChange}
          className="mt-4 w-full rounded-full border border-maroon px-4 py-2 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
        >
          {t("Change package", "पैकेज बदलें")}
        </button>
        </div>
      </div>
    </aside>
  );
}

/* ─── Summary panel ──────────────────────────────────────────────────── */
function SummaryRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className={accent ? "font-medium text-maroon" : "text-ink"}>
        {value}
      </span>
    </div>
  );
}

function SummaryPanel({
  t,
  packageName,
  singleStall,
  basePerPlate,
  categoryAddTotal,
  perPlate,
  guests,
  subtotal,
  addOnsTotal,
  serviceTotal,
  serviceName,
  venueFee,
  venueName,
  couponDiscount,
  referralDiscount,
  referrerName,
  gst,
  grandTotal,
}: {
  t: (en: string, hi: string) => string;
  packageName: string;
  singleStall: boolean;
  basePerPlate: number;
  categoryAddTotal: number;
  perPlate: number;
  guests: number;
  subtotal: number;
  addOnsTotal: number;
  serviceTotal: number;
  serviceName: string;
  venueFee: number;
  venueName: string;
  couponDiscount: number;
  referralDiscount: number;
  referrerName: string;
  gst: number;
  grandTotal: number;
}) {
  // Bill breakdown collapses by default — like Swiggy/Zomato, the guest sees
  // just the total and advance up front, and can expand the itemised bill.
  const [showDetails, setShowDetails] = useState(false);
  const advance = Math.round(grandTotal * ADVANCE_RATE);
  return (
    <aside className="xl:sticky xl:top-28 xl:self-start">
      <div className="overflow-hidden rounded-[1.5rem] border border-cream bg-white shadow-pop">
        <div className="bg-maroon px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cream">
            {t("Live estimate", "लाइव अनुमान")}
          </p>
          <h3 className="mt-1 font-display text-xl font-normal text-white">
            {t("Order Summary", "ऑर्डर सारांश")}
          </h3>
        </div>
        <div className="p-5">
        {packageName && (
          <div className="flex items-center justify-between rounded-xl bg-cream-2/50 px-3 py-2">
            <span className="text-xs font-medium text-ink-soft">
              {t("Package", "पैकेज")}
            </span>
            <span className="rounded-full bg-gold-soft/50 px-3 py-0.5 text-sm font-semibold text-maroon">
              {packageName}
            </span>
          </div>
        )}

        {/* Per-plate rate is the headline — an all-in plate rate reads fair
            where a lakhs-scale lump sum reads scary. The grand total demotes
            to the smaller line below; it still multiplies back exactly. */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft">
              {guests > 0 && grandTotal > 0
                ? t("Per Plate", "प्रति प्लेट")
                : t("Total", "कुल")}
            </p>
            <p className="font-display text-2xl font-semibold text-maroon">
              {guests > 0 && grandTotal > 0 ? (
                <>
                  ≈ {money(perPlateCost(grandTotal, guests))}
                  <span className="text-sm font-medium">
                    {" "}
                    / {t("plate", "प्लेट")}
                  </span>
                </>
              ) : (
                money(grandTotal)
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft">
              {t("Advance (10%)", "एडवांस (10%)")}
            </p>
            <p className="font-display text-lg font-semibold text-ink">
              {money(advance)}
            </p>
          </div>
        </div>
        {guests > 0 && grandTotal > 0 && (
          <p className="mt-1.5 text-sm text-ink-soft">
            {t(
              `Total ${money(grandTotal)} for ${inr.format(guests)} guests`,
              `${inr.format(guests)} मेहमानों के लिए कुल ${money(grandTotal)}`,
            )}
          </p>
        )}

        {/* Toggle the itemised bill — collapsed by default. */}
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
          className="mt-4 flex w-full items-center justify-between rounded-xl bg-cream-2/50 px-3 py-2.5 text-sm font-semibold text-maroon transition-colors hover:bg-cream-2"
        >
          <span>
            {showDetails
              ? t("Hide bill details", "बिल विवरण छिपाएं")
              : t("View bill details", "बिल विवरण देखें")}
          </span>
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 transition-transform duration-200 ${showDetails ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {showDetails && (
          <div className="mt-4 space-y-2">
            <SummaryRow
              label={t("Package base / plate", "पैकेज बेस / प्लेट")}
              value={money(basePerPlate)}
            />
            <SummaryRow
              label={
                singleStall
                  ? t("Single Stall menu / plate", "सिंगल स्टॉल मेन्यू / प्लेट")
                  : t("Vendor add-ons / plate", "वेंडर ऐड-ऑन / प्लेट")
              }
              value={`+ ${money(categoryAddTotal)}`}
            />
            <SummaryRow
              label={t("Per plate", "प्रति प्लेट")}
              value={money(perPlate)}
              accent
            />
            <SummaryRow label={t("Guests", "मेहमान")} value={inr.format(guests)} />
            <div className="my-2 h-px bg-cream-3" />
            <SummaryRow label={t("Subtotal", "सबटोटल")} value={money(subtotal)} />
            <SummaryRow
              label={t("Add-ons", "एक्स्ट्रा")}
              value={money(addOnsTotal)}
            />
            {serviceName && (
              <SummaryRow
                label={`${t("Service", "सर्विस")} · ${serviceName}`}
                value={serviceTotal > 0 ? money(serviceTotal) : t("Included", "शामिल")}
              />
            )}
            {venueFee > 0 && (
              <SummaryRow
                label={`🏛 ${t("Venue", "वेन्यू")}${venueName ? ` · ${venueName}` : ""}`}
                value={money(venueFee)}
              />
            )}
            {couponDiscount > 0 && (
              <SummaryRow
                label={t("Coupon discount", "कूपन छूट")}
                value={`− ${money(couponDiscount)}`}
                accent
              />
            )}
            {referralDiscount > 0 && (
              <SummaryRow
                label={
                  referrerName
                    ? `${t("Referral", "रेफ़रल")} · ${referrerName}`
                    : t("Referral discount", "रेफ़रल छूट")
                }
                value={`− ${money(referralDiscount)}`}
                accent
              />
            )}
            <SummaryRow label={t("GST (18%)", "जीएसटी (18%)")} value={money(gst)} />
            <div className="my-2 h-px bg-cream-3" />
            <div className="flex items-center justify-between">
              <span className="font-display text-base font-semibold text-ink">
                {t("Grand Total", "कुल राशि")}
              </span>
              <span className="font-display text-lg font-semibold text-maroon">
                {money(grandTotal)}
              </span>
            </div>
          </div>
        )}

        <p className="mt-4 rounded-xl bg-cream/30 px-3 py-2.5 text-xs leading-relaxed text-ink-soft">
          {t(
            `Pay a 10% advance (${money(advance)}) to lock your date — or book now, pay later.`,
            `अपनी तारीख पक्की करने के लिए 10% एडवांस (${money(advance)}) दें — या अभी बुक करें, बाद में भुगतान करें।`,
          )}
        </p>
        </div>
      </div>
    </aside>
  );
}
