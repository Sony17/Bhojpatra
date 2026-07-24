"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import ThemedSelect from "@/components/ThemedSelect";
import DatePicker from "@/components/DatePicker";
import PackageScrollCard from "@/components/packages/PackageScrollCard";
import {
  useVendorRatings,
  statFor,
  type VendorRatings,
} from "@/lib/vendorRatings";
import { fetchVenueById } from "@/lib/venues";
import { downloadInvoice, encodeInvoice, type InvoiceData } from "@/lib/invoice";
import {
  buildUpiUri,
  upiTxnRef,
  isValidTxnId,
  normalizeTxnId,
  DEFAULT_MERCHANT,
  type UpiPayeeConfig,
} from "@/lib/upi";
import {
  ORDER_PAYMENT_LABELS,
  ORDER_PAYMENT_HINTS,
  isOnlineMethod,
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
  bookingMealTimes,
  bookingTimeSlots,
  bookingFoodPreferences,
  formatClockTime,
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
  type AddOn,
  type AddOnCategory,
  type MenuCategory,
  type CategoryItem,
  type Coupon,
  type VendorListing,
  type BookingStatus,
} from "@/lib/data";
import { sortTiers, type VendorTier } from "@/lib/admin/types";
import {
  useLocations,
  OTHER_LOCATION_ID,
  type LocationOption,
} from "@/lib/locations";
import {
  readStoredLocation,
  markManualLocation,
  useDetectedLocation,
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
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import { Button, Stepper } from "@/components/ui";
import { inr, money, perPlateCost } from "@/lib/money";

/* ─── Constants ──────────────────────────────────────────────────────── */
const MIN_GUESTS = 50;
const MAX_GUESTS = 50_000;
const GST_RATE = 0.18;
// Advance booking fee — guests can lock a date by paying this share of the
// grand total up front (the rest is settled later with our team).
const ADVANCE_RATE = 0.1;
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
  stallTier: VendorTier | "";
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

/** Whole days from today (local midnight) until a `YYYY-MM-DD` date.
 *  Returns null for an empty/invalid date. */
function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86_400_000);
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** `YYYY-MM-DD` → e.g. "12 Dec 2026" (matches the My Bookings list style). */
function formatEventDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr || "—";
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

/** A package is offered when no date is set yet, or the chosen date is at least
 *  the package's lead time away. Custom (lead 0) is always available. */
function packageAvailable(packageId: string, eventDate: string): boolean {
  const days = daysUntil(eventDate);
  if (days === null) return true;
  return days >= (packageLeadDays[packageId] ?? 0);
}

/** The soonest bookable `YYYY-MM-DD` given a lead time in days — used as the
 *  date picker's `min` and to spell out the requirement in a notice when the
 *  chosen date falls short. Works for both fixed package leads and the Custom
 *  flow's per-vendor lead. */
function isoAfterDays(lead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + lead);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

  // Single Stall (custom) tier "lens" — which roster the guest browses on the
  // Menu step: Silver/Gold surface their-city vendors mapped to that band;
  // Platinum opens every city ("kahin ke bhi") so the premium reach stays
  // exclusive. Empty until the guest picks one (the tier picker on Step 2). The
  // fixed tiers derive their lens from the package itself, so this stays inert
  // for them.
  const [stallTier, setStallTier] = useState<VendorTier | "">("");

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
      if (d.packageId) setPackageId(d.packageId);
      if (d.stallTier) setStallTier(d.stallTier);
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
    if (pkgRequested && !pkgTooSoon) setPackageId(pkg!);
    if (stepParam === "menu" && !pkgTooSoon) setStep(2);
    // A Mehndi booking is a Single Stall order by design — the occasion
    // deep-link (e.g. the home page's Mehndi card) lands straight in the
    // custom plan's menu builder instead of the fixed-tier chooser. An
    // explicit ?package= tier deep-link still wins.
    if (occ === "mehndi" && !pkgRequested) {
      setPackageId("custom");
      setStep(2);
    }
    // A brand page ("book this stall") hands off a specific vendor. That's a
    // Single Stall (one-vendor) order, so force the custom plan and drop the
    // guest onto the Menu step; the resolve effect pre-selects the vendor and
    // infers its tier once the live menu loads.
    const vendorParam = sp.get("vendor")?.trim();
    if (vendorParam) {
      setPackageId("custom");
      setPendingVendorId(vendorParam);
      setStep(2);
    }
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
      stallTier,
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
    stallTier,
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
    if (capturedPhones.current.has(phone)) return;
    capturedPhones.current.add(phone);
    void fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, source: "booking-intent" }),
    }).catch(() => {
      /* offline — the full order still persists on confirm */
    });
  }, [customerPhone]);

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
  useEffect(() => {
    let live = true;
    fetch("/api/menu")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { categories?: MenuCategory[] } | null) => {
        if (live && d?.categories?.length) setLiveMenuCategories(d.categories);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  // Resolve a brand-page vendor hand-off (/book?vendor=ID) once the live menu
  // arrives: pre-select that vendor in every course it publishes and infer its
  // tier lens, so the Menu step skips the picker and opens on that vendor's
  // roster. Unknown ids (e.g. a curated catalog id absent from the booking
  // menu) fall through — the guest just picks a tier as usual. A resumed draft's
  // picks win, so returning to a half-built order isn't clobbered.
  useEffect(() => {
    if (!pendingVendorId) return;
    const preset: VendorMap = {};
    let tiers: VendorTier[] = [];
    for (const cat of liveMenuCategories) {
      const v = cat.vendors.find((x) => x.id === pendingVendorId);
      if (!v) continue;
      preset[cat.id] = [pendingVendorId];
      if (v.tiers?.length) tiers = v.tiers as VendorTier[];
    }
    if (Object.keys(preset).length === 0) return; // not loaded yet, or unknown id
    setCategoryVendor((m) => ({ ...preset, ...m }));
    setStallTier((cur) => cur || sortTiers(tiers)[0] || "Gold");
    setPendingVendorId("");
  }, [liveMenuCategories, pendingVendorId]);

  // The tier "lens" that decides which vendors each course surfaces. Fixed tiers
  // use their own band (Silver shows Silver-mapped vendors, etc.) via the
  // existing PACKAGE_VENDOR_TIERS map; Single Stall lets the guest pick the lens
  // on Step 2 (`stallTier`). `null` — an unset Single Stall lens, or a package
  // with no band — means "no tier gate", so behaviour is unchanged until a lens
  // applies. Platinum is handled as the premium reach inside the filter below.
  const effectiveTier: VendorTier | null =
    packageId === "custom"
      ? stallTier || null
      : (PACKAGE_VENDOR_TIERS[packageId]?.[0] ?? null);

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
        vendors: c.vendors.filter((v) => {
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
          return tierOk && cityOk;
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

  // The base per-course dish quota from the package config — the number of
  // dishes allowed from ONE vendor for this course (e.g. one welcome drink).
  const baseAllowanceFor = (catId: string): number =>
    packageCategoryItems[packageId]?.[catId] ?? 1;

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
    return (categoryItems[catId] ?? []).filter((id) =>
      chosen.some((vid) => id.startsWith(`${vid}-`)),
    );
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
    const base = baseAllowanceFor(catId);
    if (!multiVendorFor(catId)) return base;
    return base * Math.max(1, vendorsFor(catId).length);
  };

  const categoryComplete = (cat: MenuCategory): boolean => {
    const chosen = vendorsFor(cat.id);
    if (chosen.length === 0) return false;
    const base = baseAllowanceFor(cat.id);
    // Multi-vendor: every chosen vendor must contribute its own full quota.
    if (multiVendorFor(cat.id))
      return chosen.every((vid) => vendorPicks(cat.id, vid).length >= base);
    return itemsFor(cat.id).length >= base;
  };

  // The Single Stall (custom) plan lets a guest skip courses they don't want.
  // Skipping is meaningless on the fixed tiers (every course is included), so
  // it's gated to `custom` even if a stale skip id lingers from an earlier pick.
  const singleStall = packageId === "custom";
  const isSkipped = (catId: string): boolean =>
    singleStall && skippedCats.includes(catId);
  // A stall stops blocking "Continue" once it's either fully built or skipped.
  const categoryResolved = (cat: MenuCategory): boolean =>
    categoryComplete(cat) || isSkipped(cat.id);

  // Courses actually built (vendor + full item quota).
  const builtCount = activeCategories.filter(categoryComplete).length;
  // An order must carry something billable, but not necessarily from the menu —
  // a Single Stall guest may skip every stall and build an add-ons-only order.
  // Enforced on the details/extras step, where add-ons are chosen.
  const orderHasItems = builtCount > 0 || selectedAddOns.length > 0;
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
    const cur = itemsFor(catId);
    if (cur.includes(itemId)) {
      setCategoryItems((m) => ({ ...m, [catId]: cur.filter((x) => x !== itemId) }));
      return;
    }
    const base = baseAllowanceFor(catId);
    if (multiVendorFor(catId)) {
      // Per-vendor cap — each vendor may fill its own quota independently.
      const vid = vendorOfItem(catId, itemId);
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
  useEffect(() => {
    setGuests((g) => Math.max(paxMin, Math.min(paxMax, g)));
  }, [paxMin, paxMax]);

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

  // Single Stall bills per selected delicacy — each dish's own price, or the
  // vendor's course per-plate when the vendor left it blank ("pay only for what
  // you select"). The fixed feast tiers keep the flat per-vendor uplift above.
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
              v.items
                .filter((it) => picks.includes(it.id))
                .reduce((acc, it) => acc + (it.price ?? v.perPlate), 0),
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
        return packageId !== "";
      case 2:
        // Menu step — every plated course resolved.
        return menuComplete;
      case 3:
        // Live Stall step — every live-station course resolved. Packages with no
        // live stalls (Silver) are trivially done, so Continue is never blocked.
        return liveComplete;
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

  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
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
    else if (menuComplete) goNext();
  };
  // Live Stall-step (3) navigation — the same walk over the live-station courses.
  // Back off the first returns to Menu; past the last advances to Add-ons.
  const livePrev = () => {
    if (liveCat > 0) setLiveCat((c) => c - 1);
    else goBack();
  };
  const liveNext = () => {
    if (liveCat < liveStallCategories.length - 1) setLiveCat((c) => c + 1);
    else if (liveComplete) goNext();
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
  const renderEventBar = (flush = false) => (
    <EventBar
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
      collapsible={flush}
    />
  );

  return (
    <section className="app-bottom-safe relative mx-auto max-w-[90rem] overflow-hidden px-3 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      {/* A rich editorial opening gives the utility-heavy flow a premium moment. */}
      <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-maroon px-5 py-7 shadow-brand sm:rounded-[2rem] sm:px-9 sm:py-10 lg:px-12 lg:py-12">
        {/* Feast photo backdrop, dimmed and flooded maroon so the white
            headline stays legible and the brand red still reads dominant. */}
        <Image
          src="/hero-feast.jpg"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="(max-width: 1440px) 100vw, 1440px"
          className="absolute inset-0 -z-10 object-cover object-center opacity-30"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-maroon via-maroon/85 to-maroon/40"
        />
        <span
          aria-hidden="true"
          className="absolute -right-12 -top-20 h-56 w-56 rounded-full border-[34px] border-cream/15"
        />
        <span
          aria-hidden="true"
          className="absolute -bottom-20 right-[22%] h-44 w-44 rounded-full bg-cream/10"
        />
        <div className="relative max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-cream" />
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cream sm:text-xs">
              {t("BOOK A FEAST", "भोज बुक करें")}
            </p>
          </div>
          <h1 className="mt-3 font-display text-[2rem] font-normal leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            {t("Plan Your Celebration", "अपना उत्सव प्लान करें")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75 sm:mt-4 sm:text-lg">
            {t(
              "A few thoughtful steps to a feast your guests will remember.",
              "कुछ आसान चरणों में ऐसा भोज, जिसे आपके मेहमान याद रखें।",
            )}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.05em] text-cream sm:mt-6 sm:gap-2 sm:text-xs sm:tracking-[0.12em]">
            <span className="whitespace-nowrap rounded-full border border-cream/35 bg-black/10 px-2 py-1 sm:px-3 sm:py-1.5">
              {t("6 guided steps", "6 आसान चरण")}
            </span>
            <span className="whitespace-nowrap rounded-full border border-cream/35 bg-black/10 px-2 py-1 sm:px-3 sm:py-1.5">
              {t("Curated menus", "चुने हुए मेन्यू")}
            </span>
            <span className="whitespace-nowrap rounded-full border border-cream/35 bg-black/10 px-2 py-1 sm:px-3 sm:py-1.5">
              {t("Verified partners", "सत्यापित पार्टनर")}
            </span>
          </div>
        </div>
      </div>

      {/* Progress rail — shows where the guest is in the 6-step flow, plus a
          plain-language "you're here / next up" line so they always know what
          they're picking now and what comes after. Hidden on the confirmed
          success screen. */}
      {!confirmed && (
        <div className="app-sticky-chrome relative z-20 mx-2 -mt-3 rounded-card border border-cream bg-white px-4 py-3 shadow-pop sm:static sm:mx-5 sm:-mt-5 sm:rounded-2xl sm:px-6 sm:py-5 lg:mx-8">
          <Stepper current={step - 1} steps={stepLabels} />
          <p className="mt-2 text-[12px] text-ink/55 sm:mt-3 sm:text-sm sm:text-ink-soft">
            {t(
              `Step ${step} of ${TOTAL_STEPS}`,
              `चरण ${step} / ${TOTAL_STEPS}`,
            )}{" "}
            ·{" "}
            <span className="font-semibold text-maroon">{stepLabels[step - 1]}</span>
            {nextStepLabel && (
              <>
                {" "}
                <span className="hidden text-ink-soft/70 sm:inline">
                  {t("· Next: ", "· आगे: ")}
                </span>
                <span className="hidden font-semibold text-ink sm:inline">
                  {nextStepLabel}
                </span>
              </>
            )}
          </p>
        </div>
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
        // the package rail (left) and builder (right) below. On mobile the source
        // order is overridden so the *builder comes first* — guests land straight
        // on dish-picking — then the event brief, then the package / price rail.
        <div className="mt-8 grid gap-8 lg:grid-cols-[18rem_1fr]">
          {/* Event brief — full-width top on desktop; between builder and rail on mobile. */}
          <div className="order-2 lg:order-none lg:col-span-2 lg:row-start-1">
            {renderEventBar(true)}
          </div>
          {/* Package / price rail — last on mobile, pinned left on desktop. */}
          <div className="order-3 lg:order-none lg:col-start-1 lg:row-start-2">
            <SelectedPackageRail
              lang={lang}
              t={t}
              tier={selectedPackage}
              basePerPlate={basePerPlate}
              onChange={() => setStep(1)}
              // Collapse to a one-line summary on mobile so the event brief +
              // package sit compactly below the builder.
              collapsible
            />
          </div>
          {/* Builder — first on mobile, right column on desktop. */}
          <div className="order-1 min-w-0 lg:order-none lg:col-start-2 lg:row-start-2">
            {step === 2 ? (
              singleStall && !stallTier ? (
                <StallTierPicker
                  t={t}
                  lang={lang}
                  cityLabel={resolveCity(cityId)?.name ?? ""}
                  current={stallTier}
                  onPick={setStallTier}
                />
              ) : (
                <>
                  {singleStall && stallTier ? (
                    <StallTierBadge
                      t={t}
                      lang={lang}
                      tier={stallTier}
                      onChange={() => setStallTier("")}
                    />
                  ) : null}
                  <StepMenu
                lang={lang}
                t={t}
                title={t("Build Your Menu", "अपना मेन्यू बनाएं")}
                subtitle={t(
                  "Pick vendors and dishes for your plated courses — live counters come next.",
                  "अपने कोर्सेज़ के लिए वेंडर और व्यंजन चुनें — लाइव काउंटर अगले चरण में।",
                )}
                multiVendor={multiVendor}
                // Cap by band, not package id — covers Silver/Gold packages
                // AND the Single Stall flow once its Silver/Gold lens is set.
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
                categoryComplete={categoryComplete}
                isSkipped={isSkipped}
                unskipCat={unskipCat}
                onSkipMenu={singleStall ? skipMenuEntirely : undefined}
                showItemPrice={singleStall}
                vendorRatings={vendorRatings}
                  />
                </>
              )
            ) : hasLiveStalls ? (
              <StepMenu
                lang={lang}
                t={t}
                title={t("Choose Your Live Stalls", "अपने लाइव स्टॉल चुनें")}
                subtitle={t(
                  "Cook-to-order counters made fresh in front of your guests — add-ons come next.",
                  "मेहमानों के सामने ताज़ा बनने वाले लाइव काउंटर — एक्स्ट्रा अगले चरण में।",
                )}
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
                categoryComplete={categoryComplete}
                isSkipped={isSkipped}
                unskipCat={unskipCat}
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
          Review) — no reordering needed. */}
      {renderEventBar()}
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
                setStep(2);
              }}
              eventDate={eventDate}
              shortNotice={shortNotice}
            />
          )}
          {step === 4 && (
            <StepDetails
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
        singleStall && !stallTier ? (
          // Tier not chosen yet — the picker above is the only action; offer a
          // way back to the package step instead of the course nav.
          <div className="mt-8 flex">
            <Button
              variant="secondary"
              onClick={() => setStep(1)}
              aria-label={t("Back", "पीछे")}
            >
              ←
            </Button>
          </div>
        ) : (
        <MenuStepNav
          t={t}
          categories={menuStepCategories}
          activeCat={activeCat}
          allResolved={menuComplete}
          singleStall={singleStall}
          isSkipped={isSkipped}
          unskipCat={unskipCat}
          onPrev={menuPrev}
          onNext={menuNext}
          onSkipCurrent={skipCurrentStall}
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
        )
      ) : step === 3 ? (
        hasLiveStalls ? (
          <MenuStepNav
            t={t}
            categories={liveStallCategories}
            activeCat={liveCat}
            allResolved={liveComplete}
            singleStall={singleStall}
            isSkipped={isSkipped}
            unskipCat={unskipCat}
            onPrev={livePrev}
            onNext={liveNext}
            onSkipCurrent={skipCurrentLiveStall}
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
          {/* Mobile sticky checkout chrome */}
          <div className="app-sticky-cta md:hidden">
            <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-maroon/10 bg-white/96 px-3 py-2.5 shadow-pop-up backdrop-blur-xl">
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
      ) : null}
    </section>
  );
}

/* ─── Reusable heading ───────────────────────────────────────────────── */
function SectionHead({
  title,
  sub,
  nowrap = false,
}: {
  title: string;
  sub?: string;
  /** Keep the title on a single line on web (sm+) — used for short headings. */
  nowrap?: boolean;
}) {
  return (
    <div className="mb-5 sm:mb-7">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-px w-7 bg-maroon" aria-hidden="true" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-maroon">
          Curated for you
        </span>
      </div>
      <h2
        className={`font-display text-3xl leading-tight text-ink sm:text-4xl${
          nowrap ? " sm:whitespace-nowrap" : ""
        }`}
      >
        {title}
      </h2>
      {sub && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/55 sm:text-base">
          {sub}
        </p>
      )}
    </div>
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
  allResolved,
  singleStall,
  isSkipped,
  unskipCat,
  onPrev,
  onNext,
  onSkipCurrent,
  extraBanner,
}: {
  t: (en: string, hi: string) => string;
  categories: MenuCategory[];
  activeCat: number;
  allResolved: boolean;
  singleStall: boolean;
  isSkipped: (catId: string) => boolean;
  unskipCat: (catId: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onSkipCurrent: () => void;
  extraBanner?: ReactNode;
}) {
  const atLast = activeCat >= categories.length - 1;
  const activeId = categories[activeCat]?.id ?? "";
  return (
    <div className="mt-10">
      {extraBanner}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" onClick={onPrev}>
          ← {t("Previous", "पिछला")}
        </Button>
        {/* Single Stall lets a guest opt out of a course entirely — skip it and
            slide to the next stall, or undo if they skipped by mistake. */}
        {singleStall &&
          (isSkipped(activeId) ? (
            <Button
              variant="secondary"
              onClick={() => {
                if (activeId) unskipCat(activeId);
              }}
            >
              {t("Undo", "पूर्ववत")}
            </Button>
          ) : (
            <Button variant="secondary" onClick={onSkipCurrent}>
              {t("Skip", "छोड़ें")}
            </Button>
          ))}
        {!atLast ? (
          <Button onClick={onNext}>
            {t("Next", "अगला")} →
          </Button>
        ) : (
          <Button onClick={onNext} disabled={!allResolved}>
            {t("Continue", "जारी रखें")} →
          </Button>
        )}
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

/* ─── Event bar · always-visible occasion / date / city (from the Hero) ──── */
/* A single free-text field shown in place of the Occasion / City dropdown once
 * the guest picks "Other" — one clean text box (never the select AND a box at
 * once) with a small "Change" chip that drops back to the managed list. */
function OtherField({
  value,
  onChange,
  onReset,
  placeholder,
  changeLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  onReset: () => void;
  placeholder: string;
  changeLabel: string;
}) {
  return (
    <div className="relative mt-1.5">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-h-12 w-full rounded-control border border-maroon/40 bg-white py-2.5 pl-3.5 pr-[4.75rem] text-sm text-ink shadow-soft outline-none transition focus:border-maroon focus:shadow-card"
      />
      <button
        type="button"
        onClick={onReset}
        aria-label={changeLabel}
        className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center rounded-full border border-cream bg-cream/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-maroon transition hover:bg-cream active:scale-95"
      >
        {changeLabel}
      </button>
    </div>
  );
}

function EventBar({
  lang,
  t,
  occasionId,
  setOccasionId,
  customOccasion,
  setCustomOccasion,
  occasionList,
  eventDate,
  setEventDate,
  mealTime,
  setMealTime,
  eventTime,
  setEventTime,
  foodPreference,
  setFoodPreference,
  cityId,
  setCityId,
  customCity,
  setCustomCity,
  locations,
  guests,
  setGuests,
  paxMin,
  paxMax,
  leadWarning,
  showGuests = true,
  flush = false,
  collapsible = false,
}: {
  lang: Lang;
  t: (en: string, hi: string) => string;
  occasionId: string;
  setOccasionId: (v: string) => void;
  customOccasion: string;
  setCustomOccasion: (v: string) => void;
  occasionList: OccasionOption[];
  eventDate: string;
  setEventDate: (v: string) => void;
  mealTime: string;
  setMealTime: (v: string) => void;
  eventTime: string;
  setEventTime: (v: string) => void;
  foodPreference: string;
  setFoodPreference: (v: string) => void;
  cityId: string;
  setCityId: (v: string) => void;
  customCity: string;
  setCustomCity: (v: string) => void;
  locations: LocationOption[];
  guests: number;
  setGuests: (v: number) => void;
  paxMin: number;
  paxMax: number;
  leadWarning: string;
  /** The headcount is fixed and echoed in the order summary by the Confirm
   *  step, so the editable field is hidden there to avoid a redundant control. */
  showGuests?: boolean;
  /** Drops the card's top margin so it can sit inside a grid whose gap already
   *  supplies the spacing (used when the event brief is reordered on mobile). */
  flush?: boolean;
  /** On mobile only, collapse to a one-line summary (all values shown inline)
   *  that expands on tap. Desktop always renders the full editable card. */
  collapsible?: boolean;
}) {
  // Trigger styling for the themed dropdowns — matches the other field boxes
  // (bordered, cream, shadowed) so the select reads as one of the inputs.
  const selectButtonClass =
    "min-h-12 w-full rounded-control border border-cream bg-white px-3.5 py-2.5 text-sm shadow-soft outline-none transition focus:border-maroon focus:shadow-card";
  const labelClass =
    "text-[11px] font-bold uppercase tracking-[0.08em] text-ink/60";

  // GPS "use my location" for the City field. autoDetect is off — the header
  // bar already runs the silent IP pre-fill, and detecting here persists to the
  // same shared store, so the header mirrors it (and the parent's location
  // listener folds the result back into `cityId`).
  const { status: geoStatus, detect: detectLocation } = useDetectedLocation(
    locations,
    { autoDetect: false },
  );
  const detecting = geoStatus === "detecting";
  const geoMessage =
    geoStatus === "denied"
      ? t(
          "Location permission blocked — pick your city below.",
          "लोकेशन की अनुमति नहीं मिली — नीचे अपना शहर चुनें।",
        )
      : geoStatus === "failed" || geoStatus === "unsupported"
        ? t(
            "Couldn't detect your location — pick your city below.",
            "आपकी लोकेशन नहीं मिल पाई — नीचे अपना शहर चुनें।",
          )
        : "";

  // Local editing buffer for the typed headcount, so a guest can clear the box
  // and type an explicit number without every keystroke snapping to the package
  // minimum. Re-synced whenever the committed value changes (slider / +/−).
  const [guestsText, setGuestsText] = useState(String(guests));
  useEffect(() => setGuestsText(String(guests)), [guests]);
  const clampGuests = (n: number) => Math.max(paxMin, Math.min(paxMax, n));
  // While typing we only push *in-range* values up to the parent, so a partial
  // entry like "2" (below the 150 minimum) isn't snapped up mid-keystroke — it's
  // held in the text buffer and only clamped into range when the field blurs.
  const commitGuestsText = (raw: string) => {
    // Keep digits only and drop any leading zero(s) so the field never shows a
    // stray "0" in front of the count (e.g. "0150" → "150", "0" → "0").
    const cleaned = raw.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
    setGuestsText(cleaned);
    const n = Math.round(Number(cleaned));
    if (Number.isFinite(n) && n >= paxMin && n <= paxMax) setGuests(n);
  };
  const blurGuests = () => {
    const n = Math.round(Number(guestsText.replace(/[^0-9]/g, "")));
    const next = !Number.isFinite(n) || n <= 0 ? guests : clampGuests(n);
    setGuests(next);
    setGuestsText(String(next));
  };
  const stepGuests = (delta: number) => setGuests(clampGuests(guests + delta));

  // Collapsed one-line summary (mobile only) — every set value is shown inline
  // so the guest sees their whole event brief without expanding the card.
  const [open, setOpen] = useState(false);
  const occasionName =
    occasionId === OTHER_OCCASION_ID
      ? customOccasion.trim()
      : (occasionList.find((x) => x.id === occasionId) &&
          (lang === "hi"
            ? occasionList.find((x) => x.id === occasionId)!.nameHi
            : occasionList.find((x) => x.id === occasionId)!.name)) || "";
  const cityName =
    cityId === OTHER_LOCATION_ID
      ? customCity.trim()
      : (locations.find((x) => x.id === cityId) &&
          (lang === "hi"
            ? locations.find((x) => x.id === cityId)!.nameHi
            : locations.find((x) => x.id === cityId)!.name)) || "";
  const dateName = eventDate ? formatEventDate(eventDate) : "";
  // Serving time for the collapsed summary — the meal's localized name plus the
  // clock slot (the stored `mealTime` id is English, so we look up its label).
  const mealObj = bookingMealTimes.find((m) => m.id === mealTime);
  const mealLabel = mealObj ? (lang === "hi" ? mealObj.nameHi : mealObj.name) : "";
  const servingName = [mealLabel, formatClockTime(eventTime)]
    .filter(Boolean)
    .join(" · ");
  // Food preference for the collapsed summary — the stored value is the English
  // label, so map it to the Hindi one for the HI locale.
  const foodObj = bookingFoodPreferences.find((f) => f.value === foodPreference);
  const foodName = foodObj ? (lang === "hi" ? foodObj.nameHi : foodObj.value) : "";
  const summaryParts = [
    occasionName,
    dateName,
    servingName,
    foodName,
    cityName,
    showGuests ? `${guests} ${t("guests", "मेहमान")}` : "",
  ].filter(Boolean);
  const summaryLine =
    summaryParts.length > 0
      ? summaryParts.join(" · ")
      : t("Add your event details", "अपने इवेंट की जानकारी जोड़ें");

  return (
    <div
      className={
        "relative rounded-[1.5rem] border border-cream bg-white p-4 shadow-card sm:p-6 " +
        (flush ? "" : "mt-5 sm:mt-7")
      }
    >
      {Boolean(leadWarning) && (
        <span
          className="absolute inset-y-0 left-0 w-1 rounded-l-[1.5rem] bg-maroon"
          aria-hidden="true"
        />
      )}
      {/* Mobile collapsed summary — the whole brief on one tappable line; hidden
          on desktop, where the full card is always shown. */}
      {collapsible && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 text-left lg:hidden"
        >
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="eyebrow shrink-0 text-[10px] font-bold text-maroon">
              {t("YOUR EVENT", "आपका इवेंट")}
            </span>
            <span className="min-w-0 truncate text-xs text-ink/70">
              {summaryLine}
            </span>
          </span>
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
        </button>
      )}
      <div
        className={
          "flex items-center justify-between gap-4 " +
          (collapsible ? "hidden lg:flex" : "")
        }
      >
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="eyebrow shrink-0 text-[10px] font-bold text-maroon sm:text-xs">
            {t("YOUR EVENT", "आपका इवेंट")}
          </p>
          <p className="min-w-0 truncate text-xs text-ink/50 sm:text-sm">
            {t(
              "Tell us the essentials — you can edit these anytime.",
              "ज़रूरी जानकारी दें — इसे कभी भी बदल सकते हैं।",
            )}
          </p>
        </div>
        <span className="hidden rounded-full bg-cream/45 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-maroon sm:inline">
          {t("Event brief", "इवेंट ब्रीफ़")}
        </span>
      </div>
      <div
        className={
          "mt-4 grid gap-3 sm:mt-5 sm:grid-cols-2 sm:gap-4 " +
          // Web view keeps the whole brief on one row (serving-time + food-pref
          // selects folded in below). Guests gets the widest share so its stepper +
          // slider bar have room, while Meal / Time / Food are trimmed narrower.
          (showGuests
            ? "lg:grid-cols-[1fr_1fr_1fr_1.5fr_0.85fr_0.85fr_0.85fr] "
            : "lg:grid-cols-[1fr_1fr_1fr_0.85fr_0.85fr_0.85fr] ") +
          (collapsible && !open ? "hidden lg:grid" : "")
        }
      >
        <label className="block">
          <span className={labelClass}>{t("Occasion", "अवसर")}</span>
          {occasionId === OTHER_OCCASION_ID ? (
            <OtherField
              value={customOccasion}
              onChange={setCustomOccasion}
              onReset={() => {
                setOccasionId("");
                setCustomOccasion("");
              }}
              placeholder={t("Type your occasion", "अपना अवसर लिखें")}
              changeLabel={t("Change", "बदलें")}
            />
          ) : (
            <ThemedSelect
              value={occasionId}
              onChange={setOccasionId}
              ariaLabel={t("Occasion", "अवसर")}
              placeholder={t("Select occasion", "अवसर चुनें")}
              className="mt-1.5"
              buttonClassName={selectButtonClass}
              options={[
                ...occasionList.map((o) => ({
                  value: o.id,
                  label: lang === "hi" ? o.nameHi : o.name,
                })),
                { value: OTHER_OCCASION_ID, label: t("Other", "अन्य") },
              ]}
            />
          )}
        </label>

        <div className="block">
          <span className={labelClass}>{t("Date", "तारीख")}</span>
          {/* Branded calendar (same on-brand popup as the Hero booking bar)
              instead of the OS-grey native date control. Controlled by the
              carried-over event date; the floor is just today (no past dates,
              `minDaysAhead={0}`) — the lead-time shortfall is surfaced softly by
              `leadWarning` below, per the date-floor note earlier in this file. */}
          <DatePicker
            className={
              "mt-1.5 min-h-12 w-full rounded-control border bg-white shadow-soft transition focus-within:shadow-card " +
              (leadWarning ? "border-maroon" : "border-cream focus-within:border-maroon")
            }
            buttonClassName="min-h-12 w-full px-3.5 py-2.5 pr-11 text-sm"
            iconClassName="right-3.5"
            placeholder={t("Select date", "तारीख चुनें")}
            ariaLabel={t("Event date", "इवेंट की तारीख")}
            direction="down"
            align="left"
            minDaysAhead={0}
            valueIso={eventDate}
            onChange={(d) => {
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, "0");
              const day = String(d.getDate()).padStart(2, "0");
              setEventDate(`${y}-${m}-${day}`);
            }}
          />
          {leadWarning && (
            <span className="mt-1.5 flex items-start gap-1.5 text-xs text-maroon">
              <span aria-hidden="true">★</span>
              <span>{leadWarning}</span>
            </span>
          )}
        </div>

        <div className="block">
          <div className="flex items-center justify-between gap-2">
            <span className={labelClass}>{t("City / Location", "शहर / लोकेशन")}</span>
            <button
              type="button"
              onClick={() => void detectLocation()}
              disabled={detecting}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.06em] text-maroon transition hover:underline disabled:opacity-60"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
              {detecting
                ? t("Detecting…", "पता लगा रहे हैं…")
                : t("Use my location", "मेरी लोकेशन")}
            </button>
          </div>
          {cityId === OTHER_LOCATION_ID ? (
            <OtherField
              value={customCity}
              onChange={setCustomCity}
              onReset={() => {
                setCityId("");
                setCustomCity("");
              }}
              placeholder={t("Type your city or state", "अपना शहर या राज्य लिखें")}
              changeLabel={t("Change", "बदलें")}
            />
          ) : (
            <ThemedSelect
              value={cityId}
              onChange={setCityId}
              ariaLabel={t("City / Location", "शहर / लोकेशन")}
              placeholder={t("Select city", "शहर चुनें")}
              className="mt-1.5"
              buttonClassName={selectButtonClass}
              options={[
                ...locations.map((c) => ({
                  value: c.id,
                  label: lang === "hi" ? c.nameHi : c.name,
                })),
                { value: OTHER_LOCATION_ID, label: t("Other", "अन्य") },
              ]}
            />
          )}
          {geoMessage && (
            <span className="mt-1.5 block text-[11px] text-maroon/80">
              {geoMessage}
            </span>
          )}
        </div>

        {showGuests && (
          <div className="flex flex-col justify-center gap-3 rounded-control border border-cream bg-cream/20 px-4 py-3 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-maroon">
                  {t("Guests", "मेहमान")}
                </p>
                <p className="mt-0.5 text-caption text-ink/50">
                  {inr.format(paxMin)}–{inr.format(paxMax)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => stepGuests(-10)}
                  disabled={guests <= paxMin}
                  aria-label={t("Decrease guests", "मेहमान घटाएं")}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-cream bg-white text-lg font-bold leading-none text-maroon shadow-soft transition hover:bg-cream/40 active:scale-95 disabled:opacity-30"
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={guestsText}
                  min={paxMin}
                  max={paxMax}
                  onChange={(e) => commitGuestsText(e.target.value)}
                  onBlur={blurGuests}
                  aria-label={t("Number of guests", "मेहमानों की संख्या")}
                  className="h-9 w-16 rounded-full border border-cream bg-white text-center text-sm font-bold tabular-nums text-ink shadow-soft outline-none transition focus:border-maroon [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => stepGuests(10)}
                  disabled={guests >= paxMax}
                  aria-label={t("Increase guests", "मेहमान बढ़ाएं")}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-cream bg-white text-lg font-bold leading-none text-maroon shadow-soft transition hover:bg-cream/40 active:scale-95 disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
            <input
              type="range"
              min={paxMin}
              max={paxMax}
              step={10}
              value={guests}
              onChange={(e) => setGuests(clampGuests(Number(e.target.value)))}
              aria-label={t("Number of guests", "मेहमानों की संख्या")}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-cream outline-none [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-maroon [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-maroon [&::-webkit-slider-thumb]:shadow-soft"
            />
          </div>
        )}

        {/* Serving time — the meal period plus a clock slot within it. Folded
            into the grid above so the whole brief sits on one row in web view;
            each select carries its own label. Optional; when set it rides onto
            the order, invoice ("Serving time") and admin/My-Bookings via
            `servingTimeLabel`. */}
        <div className="block">
          <span className={labelClass}>
            {t("Meal", "भोजन")}{" "}
            <span className="font-medium normal-case tracking-normal text-ink/40">
              ({t("optional", "वैकल्पिक")})
            </span>
          </span>
          {/* Meal period — Breakfast / Lunch / Dinner. */}
          <ThemedSelect
            value={mealTime}
            onChange={(v) => {
              setMealTime(v);
              // Clock slots are scoped to the meal, so drop a slot that no
              // longer falls within the newly chosen period.
              if (!(bookingTimeSlots[v] ?? []).includes(eventTime))
                setEventTime("");
            }}
            ariaLabel={t("Meal period", "भोजन अवधि")}
            placeholder={t("Select meal", "भोजन चुनें")}
            className="mt-1.5"
            buttonClassName={selectButtonClass}
            options={bookingMealTimes.map((m) => ({
              value: m.id,
              label: lang === "hi" ? m.nameHi : m.name,
            }))}
          />
        </div>

        <div className="block">
          <span className={labelClass}>{t("Time", "समय")}</span>
          {/* Time slot within the chosen meal — enabled once a meal is picked. */}
          <ThemedSelect
            value={eventTime}
            onChange={setEventTime}
            disabled={!mealTime}
            ariaLabel={t("Time slot", "समय स्लॉट")}
            placeholder={
              mealTime
                ? t("Select time slot", "समय स्लॉट चुनें")
                : t("Pick a meal first", "पहले भोजन चुनें")
            }
            className="mt-1.5"
            buttonClassName={selectButtonClass}
            options={(bookingTimeSlots[mealTime] ?? []).map((hhmm) => ({
              value: hhmm,
              label: formatClockTime(hhmm),
            }))}
          />
        </div>

        {/* Food preference — Pure Veg / Non-veg / Both. Optional; rides onto the
            order, invoice ("Food preference") and admin / My-Bookings. */}
        <div className="block">
          <span className={labelClass}>
            {t("Food", "खाना")}{" "}
            <span className="font-medium normal-case tracking-normal text-ink/40">
              ({t("optional", "वैकल्पिक")})
            </span>
          </span>
          <ThemedSelect
            value={foodPreference}
            onChange={setFoodPreference}
            ariaLabel={t("Food preference", "खाने की पसंद")}
            placeholder={t("Select preference", "पसंद चुनें")}
            className="mt-1.5"
            buttonClassName={selectButtonClass}
            options={bookingFoodPreferences.map((f) => ({
              value: f.value,
              label: lang === "hi" ? f.nameHi : f.value,
            }))}
          />
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
}: {
  lang: Lang;
  t: (en: string, hi: string) => string;
  packageId: string;
  setPackageId: (v: string) => void;
  eventDate: string;
  shortNotice: boolean;
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
      ? { ...tier, name: meta.name, nameHi: meta.nameHi, price: meta.price }
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
              "This date is short-notice, so our full packages can't be arranged in time. You can still book with the Single Stall plan — one vendor per course, plus any add-ons & live counters.",
              "यह तारीख़ बहुत नज़दीक है, इसलिए हमारे पूरे पैकेज समय पर तैयार नहीं हो पाएंगे। फिर भी आप सिंगल स्टॉल प्लान से बुक कर सकते हैं — हर कोर्स के लिए एक वेंडर, साथ में ऐड-ऑन और लाइव काउंटर।",
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
          // pt keeps the Popular/Premium ribbons (which float above the cards)
          // clear of the availability notice above the grid.
          "no-scrollbar -mx-3 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-3 pb-5 pt-7 sm:mx-0 sm:snap-none sm:grid sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 sm:pt-7 xl:gap-8 " +
          (tiers.length === 1
            ? "sm:grid-cols-1"
            : tiers.length === 2
              ? "sm:grid-cols-2"
              : tiers.length === 3
                ? "sm:grid-cols-2 lg:grid-cols-3"
                : "sm:grid-cols-2 lg:grid-cols-4")
        }
      >
        {tiers.map(({ tier, tooSoon, lead, unlock }) => {
          const selected = tier.id === packageId;
          const tierName = lang === "hi" ? tier.nameHi : tier.name;
          return (
            <div
              key={tier.id}
              className="relative w-[88vw] max-w-[390px] shrink-0 snap-center first:snap-start sm:w-auto sm:max-w-none sm:shrink"
            >
            {tooSoon ? (
              // Too-soon tier: the full scroll, dimmed and inert (not clickable
              // or focusable), with a legible notice pinned over the fold naming
              // its lead time and the date it unlocks. Nothing is silently
              // dropped, so the guest can pick a later date to reach it. The card
              // stays only lightly muted (not near-invisible) and carries a
              // "Locked" badge pinned to the top so the tier reads as present but
              // temporarily unavailable — never as if it had gone missing.
              <>
                <div inert className="select-none opacity-60">
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
                <div className="pointer-events-none absolute inset-x-0 bottom-[12%] z-30 flex justify-center px-4">
                  <div className="rounded-lg border border-maroon/40 bg-white px-3 py-2 text-center shadow-card">
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
              onSelect={() => setPackageId(tier.id)}
              ctaOnFold
              cta={
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPackageId(tier.id);
                  }}
                  className="btn-sheen inline-flex min-h-7 items-center gap-1 whitespace-nowrap rounded-full bg-cream px-4 text-xs font-bold tracking-wide text-maroon shadow-card ring-1 ring-maroon/30 transition duration-200 hover:-translate-y-0.5 hover:shadow-pop active:scale-95"
                >
                  <span className="font-display leading-none">
                    {selected
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

/* ─── Step 2 · Single Stall tier lens ────────────────────────────────────────
 * Before a Single Stall guest builds their menu they pick a tier "lens": Silver
 * / Gold browse their own city's stalls (mapped to that band); Platinum opens
 * every city, keeping the premium reach exclusive. The pick sets `stallTier`,
 * which drives `effectiveTier` and the vendor filter on the Menu step. */
const STALL_TIER_LENSES: {
  id: VendorTier;
  nameHi: string;
  descEn: (city: string) => string;
  descHi: (city: string) => string;
}[] = [
  {
    id: "Silver",
    nameHi: "सिल्वर",
    descEn: (c) => `${c || "Your city"}'s Silver stalls`,
    descHi: (c) => `${c || "आपके शहर"} के सिल्वर स्टॉल`,
  },
  {
    id: "Gold",
    nameHi: "गोल्ड",
    descEn: (c) => `${c || "Your city"}'s Gold stalls`,
    descHi: (c) => `${c || "आपके शहर"} के गोल्ड स्टॉल`,
  },
  {
    id: "Platinum",
    nameHi: "प्लेटिनम",
    descEn: () => "Stalls from every city — the full roster",
    descHi: () => "हर शहर के स्टॉल — पूरा रोस्टर",
  },
];

function StallTierPicker({
  t,
  lang,
  cityLabel,
  current,
  onPick,
}: {
  t: (en: string, hi: string) => string;
  lang: Lang;
  cityLabel: string;
  current: VendorTier | "";
  onPick: (tier: VendorTier) => void;
}) {
  return (
    <section className="rounded-card border border-maroon/15 bg-white p-5 sm:p-6">
      <h2 className="font-display text-xl text-ink">
        {t("Choose your stall tier", "अपना स्टॉल टियर चुनें")}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        {t(
          "Your tier decides which stalls you browse. Silver & Gold show your city's stalls; Platinum opens every city.",
          "आपका टियर तय करता है कि आप कौन-से स्टॉल देखेंगे। सिल्वर और गोल्ड आपके शहर के स्टॉल दिखाते हैं; प्लेटिनम हर शहर खोलता है।",
        )}
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {STALL_TIER_LENSES.map((tier) => {
          const active = current === tier.id;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => onPick(tier.id)}
              className={`rounded-card border p-4 text-left transition ${
                active
                  ? "border-maroon bg-cream/50"
                  : "border-maroon/15 bg-white hover:border-maroon/40"
              }`}
            >
              <span className="font-display text-lg text-maroon">
                {lang === "hi" ? tier.nameHi : tier.id}
              </span>
              <span className="mt-1 block text-sm text-ink-soft">
                {lang === "hi"
                  ? tier.descHi(cityLabel)
                  : tier.descEn(cityLabel)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StallTierBadge({
  t,
  lang,
  tier,
  onChange,
}: {
  t: (en: string, hi: string) => string;
  lang: Lang;
  tier: VendorTier;
  onChange: () => void;
}) {
  const nameHi: Record<VendorTier, string> = {
    Silver: "सिल्वर",
    Gold: "गोल्ड",
    Platinum: "प्लेटिनम",
  };
  return (
    <div className="mb-4 flex items-center justify-between rounded-card border border-maroon/15 bg-cream/40 px-4 py-2.5 text-sm">
      <span className="text-ink-soft">
        {t("Stall tier", "स्टॉल टियर")}:{" "}
        <span className="font-semibold text-maroon">
          {lang === "hi" ? nameHi[tier] : tier}
        </span>
        {tier === "Platinum"
          ? t(" · every city", " · हर शहर")
          : t(" · your city", " · आपका शहर")}
      </span>
      <button
        type="button"
        onClick={onChange}
        className="font-semibold text-maroon underline underline-offset-2"
      >
        {t("Change", "बदलें")}
      </button>
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
  categoryComplete,
  isSkipped,
  unskipCat,
  onSkipMenu,
  showItemPrice = false,
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
  /** Per-vendor dish quota (the package's base, unscaled). */
  baseAllowanceFor: (catId: string) => number;
  categoryComplete: (cat: MenuCategory) => boolean;
  isSkipped: (catId: string) => boolean;
  unskipCat: (catId: string) => void;
  /** Single Stall only — skip the whole menu and go straight to add-ons. */
  onSkipMenu?: () => void;
  /** Single Stall — surface each delicacy's own per-plate price (vendors who
   *  sell Single Stall price dishes individually). Display only; the checkout
   *  total still runs on the course per-plate. */
  showItemPrice?: boolean;
  vendorRatings: VendorRatings;
}) {
  const vendorScrollRef = useRef<HTMLDivElement>(null);
  // "Explore more" lets guests expand past the shortlist cap. Collapse it again
  // whenever the cap or the course changes, so a category never opens already
  // expanded from a previous one.
  const [showAllVendors, setShowAllVendors] = useState(false);
  useEffect(() => setShowAllVendors(false), [maxVendors, activeCat]);
  const [vendorSearch, setVendorSearch] = useState("");
  // The filter is reveal-on-demand (see toggle by the "Step A" heading), so it
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
  const pinnedVendors = cat.vendors.filter((v) => v.pinned);
  const seedVendors = cat.vendors.filter((v) => !v.live && !v.pinned);
  const liveVendors = cat.vendors.filter((v) => v.live && !v.pinned);
  // Full roster in display order — pinned, then seed, then live.
  const orderedVendors = [...pinnedVendors, ...seedVendors, ...liveVendors];
  const seedSlots = Math.max(0, VENDOR_CAP - pinnedVendors.length);
  const hiddenVendorCount = Math.max(0, seedVendors.length - seedSlots);
  // Collapsed view: the leading shortlist. Expanded: the whole roster.
  const cappedVendors = showAllVendors
    ? orderedVendors
    : [...pinnedVendors, ...seedVendors.slice(0, seedSlots), ...liveVendors];
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
  const base = baseAllowanceFor(cat.id); // per-vendor quota for this course
  const selectedIds = categoryVendor[cat.id] ?? [];
  const selectedVendors = cat.vendors.filter((v) => selectedIds.includes(v.id));
  const picks = itemsFor(cat.id);
  // Whether this package lets a guest pick more than one dish in at least one
  // course. Package-wide (not the active course) so the capability note shows
  // the moment the menu opens — the first course (e.g. Welcome) may allow only
  // one dish even on tiers that open a wide spread elsewhere. Uses the base
  // (per-vendor) quota so multi-vendor scaling doesn't skew the note.
  const multiDish = categories.some((c) => baseAllowanceFor(c.id) > 1);

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

      {/* What this package unlocks — a package that lets the guest mix several
          vendors and/or pick a spread of dishes says so up front, so they know
          they can build a broader menu rather than assuming one vendor / one
          dish. Package-wide, always visible on the menu step (the per-course
          "N/N PICKED" counter below still spells out each course's exact cap). */}
      {(multiVendor || multiDish) && (
        <p className="mb-6 flex items-start gap-2 rounded-2xl border border-maroon/30 bg-cream/40 px-4 py-3 text-sm text-ink-soft">
          <span aria-hidden="true" className="text-maroon">
            ★
          </span>
          <span>
            {multiVendor && multiDish
              ? t(
                  "This package lets you mix multiple vendors and pick multiple dishes across your courses.",
                  "इस पैकेज में आप कई वेंडर मिला सकते हैं और अपने कोर्सेज़ में कई व्यंजन चुन सकते हैं।",
                )
              : multiVendor
                ? t(
                    "This package lets you mix multiple vendors across your courses.",
                    "इस पैकेज में आप अपने कोर्सेज़ में कई वेंडर मिला सकते हैं।",
                  )
                : t(
                    "This package lets you pick multiple dishes across your courses.",
                    "इस पैकेज में आप अपने कोर्सेज़ में कई व्यंजन चुन सकते हैं।",
                  )}
          </span>
        </p>
      )}

      {/* Category tabs */}
      <div className="-mx-4 flex flex-nowrap items-center gap-2 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {categories.map((c, i) => {
          const active = i === activeCat;
          const complete = categoryComplete(c);
          const skipped = isSkipped(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCat(i)}
              className={
                "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition " +
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

      {/* Step A · Pick a vendor (multiple allowed on Platinum) */}
      <div className="mt-7 flex items-center justify-between gap-3">
        <h3 className="font-sans text-2xl font-semibold text-maroon">
          {multiVendor
            ? t("Step A · Pick vendors (select multiple)", "चरण A · वेंडर चुनें (कई चुनें)")
            : t("Step A · Pick a vendor", "चरण A · वेंडर चुनें")}
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
      <div className="relative mt-3">
      {filteredVendors.length === 0 ? (
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
        {filteredVendors.map((v) => {
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
        {filteredVendors.length > 5 && (
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

      {/* Step B · Pick items */}
      <div className="mt-6 rounded-2xl border border-cream-3 bg-cream-2/30 p-5 shadow-sm">
        {selectedVendors.length === 0 ? (
          <p className="text-sm text-ink-soft">
            {multiVendor
              ? t(
                  "Pick one or more vendors above to see their menus.",
                  "उनके मेन्यू देखने के लिए ऊपर एक या अधिक वेंडर चुनें।",
                )
              : t(
                  "Pick a vendor above to see their menu.",
                  "उनका मेन्यू देखने के लिए ऊपर वेंडर चुनें।",
                )}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-sans text-2xl font-semibold text-maroon">
                {multiVendor
                  ? t("Step B · Pick items across your vendors", "चरण B · अपने वेंडरों से आइटम चुनें")
                  : t("Step B · Pick items from their menu", "चरण B · उनके मेन्यू से आइटम चुनें")}
              </h3>
              <span
                className={
                  "text-lg font-bold " +
                  (picks.length >= allowance ? "text-maroon" : "text-ink-soft")
                }
              >
                {picks.length}/{allowance} {t("PICKED", "चुने गए")}
              </span>
            </div>

            {/* Multi-vendor tiers give each vendor its own quota, so the guest
                can take the full course from every vendor they picked (e.g. a
                welcome drink from each). Spell that out so the per-vendor
                counters below read as intended, not as one shared cap. */}
            {multiVendor && selectedVendors.length > 1 && (
              <p className="mt-2 text-xs text-ink-soft">
                {base === 1
                  ? t(
                      "You can pick one dish from each vendor for this course.",
                      "इस कोर्स के लिए आप हर वेंडर से एक व्यंजन चुन सकते हैं।",
                    )
                  : t(
                      `You can pick up to ${base} dishes from each vendor for this course.`,
                      `इस कोर्स के लिए आप हर वेंडर से ${base} व्यंजन तक चुन सकते हैं।`,
                    )}
              </p>
            )}

            {/* One menu block per selected vendor — a single block for most
                tiers, several for Platinum's multi-vendor segments. */}
            {selectedVendors.map((vendor) => {
              // On multi-vendor tiers each vendor fills its OWN quota, so the
              // cap (and counter) are scoped to this vendor's picks.
              const vendorItemPicks = picks.filter((id) =>
                id.startsWith(`${vendor.id}-`),
              );
              const vendorFull = vendorItemPicks.length >= base;
              return (
              <div key={vendor.id} className="mt-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="eyebrow text-xs font-semibold text-gold">
                    {vendor.name}
                  </p>
                  {multiVendor && (
                    <span
                      className={
                        "eyebrow text-[10px] font-semibold " +
                        (vendorFull ? "text-maroon" : "text-ink-soft")
                      }
                    >
                      {vendorItemPicks.length}/{base}
                    </span>
                  )}
                </div>
                {/* Swiggy/Zomato-style menu list — one dish per row, thumbnail
                    on the left, add/added control on the right. */}
                <div className="mt-2 flex flex-col gap-2">
                  {vendor.items.map((it: CategoryItem) => {
                      const active = picks.includes(it.id);
                      const atCap =
                        !active &&
                        (multiVendor ? vendorFull : picks.length >= allowance);
                      // Veg → green, non-veg → brand maroon. The card border and
                      // Add control take the diet colour so a dish reads as veg /
                      // non-veg at a glance (green = #1a7f37, standard veg green).
                      const veg = it.diet === "veg";
                      const dietBorder = veg
                        ? "border-[#1a7f37]"
                        : "border-maroon";
                      const dietRing = veg ? "ring-[#1a7f37]" : "ring-maroon";
                      const dietBg = veg ? "bg-[#1a7f37]" : "bg-maroon";
                      const dietText = veg ? "text-[#1a7f37]" : "text-maroon";
                      return (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => toggleItem(cat.id, it.id)}
                          disabled={atCap}
                          aria-pressed={active}
                          className={
                            "flex w-full items-center gap-3 rounded-2xl border p-1.5 text-left shadow-sm transition sm:gap-4 sm:p-2.5 " +
                            dietBorder + " " +
                            (active
                              ? "bg-cream-2 ring-1 " + dietRing
                              : atCap
                                ? "cursor-not-allowed bg-white opacity-50"
                                : "bg-white hover:-translate-y-0.5 hover:shadow-md")
                          }
                        >
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
                          {/* Diet mark + dish name (+ per-delicacy price on
                              Single Stall, where vendors price each dish). */}
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            <span
                              aria-hidden="true"
                              className={
                                "inline-block h-3.5 w-3.5 shrink-0 rounded-sm border " +
                                dietBorder
                              }
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-ink sm:text-base">
                                {it.name}
                              </span>
                              {/* Single Stall shows each dish's own price, or
                                  the vendor's course per-plate as the fallback. */}
                              {showItemPrice &&
                                (it.price ?? vendor.perPlate) > 0 && (
                                  <span className="block text-xs font-semibold text-maroon">
                                    {money(it.price ?? vendor.perPlate)}/
                                    {t("plate", "प्लेट")}
                                  </span>
                                )}
                            </span>
                          </span>
                          {/* Add / added control */}
                          <span
                            className={
                              "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition sm:px-5 sm:py-2 sm:text-xs " +
                              dietBorder + " " +
                              (active
                                ? dietBg + " text-cream"
                                : "bg-white " + dietText)
                            }
                          >
                            {active
                              ? `✓ ${t("Added", "जोड़ा")}`
                              : t("Add", "जोड़ें")}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Step 3 · Event details (occasion, date, venue, guests, extras) ───── */
function StepDetails({
  lang,
  t,
  guests,
  selectedAddOns,
  toggleAddOn,
  packageName,
  multiVendor,
  eligibleVendors,
  vendorIdsFor,
  onVendorToggle,
  fullFilter,
}: {
  lang: Lang;
  t: (en: string, hi: string) => string;
  guests: number;
  selectedAddOns: string[];
  toggleAddOn: (id: string) => void;
  packageName: string;
  multiVendor: boolean;
  eligibleVendors: VendorListing[];
  vendorIdsFor: (addOnId: string) => string[];
  onVendorToggle: (addOnId: string, vendorId: string) => void;
  /** Gold/Platinum unlock the richer category filter; the lower tiers get just
   *  the free-text search. */
  fullFilter: boolean;
}) {
  // Free-text filter over the add-on roster. Matches the English/Hindi names,
  // the description, and the hidden `keywords` aliases (so "gol gappe" finds the
  // Chaat Station). Selections live in the parent, so filtering never drops a
  // chosen add-on from the order — it only hides its card.
  const [addOnQuery, setAddOnQuery] = useState("");
  // Category filter — only the full-filter tiers (Gold/Platinum) can narrow the
  // roster to live counters vs whole-event services. We derive the effective
  // category from `fullFilter` (rather than resetting stored state in an effect)
  // so switching down to a search-only tier never leaves a stale category
  // silently hiding cards with no chip left to clear it.
  const [addOnCat, setAddOnCat] = useState<"all" | AddOnCategory>("all");
  const activeCat = fullFilter ? addOnCat : "all";
  const query = addOnQuery.trim().toLowerCase();
  const catOf = (a: AddOn): AddOnCategory => a.category ?? "counter";
  const visibleAddOns = addOns.filter((a) => {
    const matchesCat = activeCat === "all" || catOf(a) === activeCat;
    const matchesQuery =
      !query ||
      a.name.toLowerCase().includes(query) ||
      a.nameHi.includes(query) ||
      a.description.toLowerCase().includes(query) ||
      (a.keywords ?? []).some((k) => k.toLowerCase().includes(query));
    return matchesCat && matchesQuery;
  });
  // A counter's real cost depends on which vendor runs the station, so each card
  // shows a price *range* rather than one figure: the counter's base price
  // scaled across the eligible vendors' spread — cheapest → priciest, anchored
  // on the roster average (so the base price sits inside the band). The roster
  // narrows with the package tier, so the range tightens/shifts to match who's
  // actually available. A counter's price swings far less than a caterer's full
  // menu price (a ₹199-vs-₹1349 menu gap doesn't mean a 7× chaat-counter gap),
  // so we dampen the raw menu spread toward 1 — otherwise the extremes produce
  // implausible figures. With <2 eligible vendors there's no spread: flat price.
  const SPREAD_DAMP = 0.45;
  const vendorPlates = eligibleVendors
    .map((v) => v.priceFrom)
    .filter((n) => n > 0);
  const priceSpread =
    vendorPlates.length >= 2
      ? (() => {
          const avg =
            vendorPlates.reduce((s, n) => s + n, 0) / vendorPlates.length;
          const rawLo = Math.min(...vendorPlates) / avg;
          const rawHi = Math.max(...vendorPlates) / avg;
          return {
            lo: 1 - SPREAD_DAMP * (1 - rawLo),
            hi: 1 + SPREAD_DAMP * (rawHi - 1),
          };
        })()
      : null;
  const priceRange = (base: number): { min: number; max: number } =>
    priceSpread
      ? {
          min: Math.round(base * priceSpread.lo),
          max: Math.round(base * priceSpread.hi),
        }
      : { min: base, max: base };
  // The category chips shown on the full-filter tiers.
  const catChips: { id: "all" | AddOnCategory; label: string }[] = [
    { id: "all", label: t("All", "सभी") },
    { id: "counter", label: t("Live Counters", "लाइव काउंटर") },
    { id: "service", label: t("Services", "सर्विसेज़") },
  ];
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHead
          title={t("Add Extras & Counters", "एक्स्ट्रा और काउंटर जोड़ें")}
          sub={t(
            "Optional live counters and add-ons to round out your menu.",
            "अपने मेन्यू को पूरा करने के लिए वैकल्पिक लाइव काउंटर और ऐड-ऑन।",
          )}
        />
        {selectedAddOns.length > 0 && (
          <span className="shrink-0 rounded-full bg-maroon px-3 py-1 text-xs font-semibold text-cream">
            {t(
              `${selectedAddOns.length} added`,
              `${selectedAddOns.length} जोड़े गए`,
            )}
          </span>
        )}
      </div>

      <div className="relative mt-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft"
        >
          🔍
        </span>
        <input
          type="search"
          value={addOnQuery}
          onChange={(e) => setAddOnQuery(e.target.value)}
          placeholder={t(
            "Search add-ons like pizza or gol gappe",
            "पिज़्ज़ा या गोल गप्पे जैसे ऐड-ऑन खोजें",
          )}
          aria-label={t("Search add-ons", "ऐड-ऑन खोजें")}
          className="w-full rounded-lg border border-cream-3 bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors focus:border-maroon"
        />
      </div>

      {/* Full-filter tiers (Gold/Platinum) can browse by category — live food /
          beverage counters vs whole-event services. The lower tiers (Single
          Stall / Silver) keep just the free-text search above. */}
      {fullFilter && (
        <div
          role="group"
          aria-label={t("Filter add-ons", "ऐड-ऑन फ़िल्टर करें")}
          className="mt-3 flex flex-nowrap gap-2 overflow-x-auto no-scrollbar sm:flex-wrap sm:overflow-visible"
        >
          {catChips.map((c) => {
            const active = addOnCat === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => setAddOnCat(c.id)}
                className={
                  "shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold transition " +
                  (active
                    ? "border-maroon bg-maroon text-cream"
                    : "border-cream-3 bg-white text-ink hover:bg-cream-2")
                }
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-4">
        {visibleAddOns.map((a: AddOn) => {
          const active = selectedAddOns.includes(a.id);
          // Per-unit range across eligible vendors, and the same range projected
          // over the headcount for the "≈ … for N guests" estimate.
          const { min: unitMin, max: unitMax } = priceRange(a.price);
          const hasRange = unitMin !== unitMax;
          const unitLabel = hasRange
            ? `${money(unitMin)}–${money(unitMax)}`
            : money(unitMin);
          const guestsLabel = hasRange
            ? `${money(unitMin * guests)}–${money(unitMax * guests)}`
            : money(unitMin * guests);
          const selectId = `addon-vendor-${a.id}`;
          // Vendors assigned to this counter — one on single-vendor tiers, or
          // several when the package allows splitting a counter across vendors.
          const pickedVendorIds = active ? vendorIdsFor(a.id) : [];
          return (
            <div
              key={a.id}
              className={
                "group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md " +
                (active ? "border-maroon ring-2 ring-maroon" : "border-cream-3")
              }
            >
              <button
                type="button"
                aria-pressed={active}
                onClick={() => toggleAddOn(a.id)}
                className="flex w-full flex-col text-left sm:flex-row"
              >
                {/* Counter photo — a fixed-width thumbnail on wider screens so
                    the row stays compact; full-width banner on mobile. The
                    price rides on the image as a pill. */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream-2 sm:aspect-auto sm:w-52 sm:shrink-0 sm:self-stretch">
                  <Image
                    src={a.image}
                    alt={lang === "hi" ? a.nameHi : a.name}
                    fill
                    sizes="(min-width: 640px) 208px, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute bottom-2 left-2 rounded-full bg-maroon px-2.5 py-1 text-xs font-semibold text-cream shadow-sm">
                    {a.perPlate
                      ? `${unitLabel} / ${t("plate", "प्लेट")}`
                      : unitLabel}
                  </span>
                </div>
                <div className="flex flex-1 items-start gap-3 p-4">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream-2 text-xl"
                  >
                    {a.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-display text-base font-semibold text-ink">
                      {lang === "hi" ? a.nameHi : a.name}
                    </h4>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {a.description}
                    </p>
                    <p className="mt-1.5 text-xs text-ink-soft">
                      {a.perPlate
                        ? t(
                            `≈ ${guestsLabel} for ${guests} guests`,
                            `${guests} मेहमानों के लिए ≈ ${guestsLabel}`,
                          )
                        : t("One-time charge", "एकमुश्त शुल्क")}
                    </p>
                  </div>
                  <span
                    className={
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-sm transition " +
                      (active
                        ? "border-maroon bg-maroon text-cream"
                        : "border-cream-3 text-transparent")
                    }
                  >
                    ✓
                  </span>
                </div>
              </button>

              {/* Vendor for this counter — drawn from the catalogue for the
                  selected package's tier. Shown only once the add-on is on.
                  Rendered as selectable tiles (not a dropdown) so every option
                  is visible at a glance and chosen with a single tap. */}
              {active && (
                <div className="border-t border-cream-3 px-4 pb-4 pt-3">
                  <span
                    id={selectId}
                    className="block text-xs font-semibold uppercase tracking-wide text-ink-soft"
                  >
                    {multiVendor
                      ? t("Vendors for this counter", "इस काउंटर के लिए वेंडर")
                      : t("Vendor for this counter", "इस काउंटर के लिए वेंडर")}
                  </span>
                  {multiVendor && eligibleVendors.length > 0 && (
                    <p className="mt-1 text-xs text-ink-soft">
                      {t(
                        `Split this counter across multiple vendors — ${pickedVendorIds.length} selected.`,
                        `इस काउंटर को कई वेंडरों में बाँटें — ${pickedVendorIds.length} चुने गए।`,
                      )}
                    </p>
                  )}
                  {eligibleVendors.length === 0 ? (
                    <p className="mt-1 text-sm text-ink-soft">
                      {t(
                        "No vendors available for this package.",
                        "इस पैकेज के लिए कोई वेंडर उपलब्ध नहीं।",
                      )}
                    </p>
                  ) : (
                    <div
                      role={multiVendor ? "group" : "radiogroup"}
                      aria-labelledby={selectId}
                      className="mt-2 grid gap-2 sm:grid-cols-2"
                    >
                      {eligibleVendors.map((v) => {
                        const picked = pickedVendorIds.includes(v.id);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            role={multiVendor ? "checkbox" : "radio"}
                            aria-checked={picked}
                            onClick={() => onVendorToggle(a.id, v.id)}
                            className={
                              "flex items-center gap-3 rounded-xl border bg-white p-2 text-left transition hover:-translate-y-0.5 hover:shadow-sm " +
                              (picked
                                ? "border-maroon ring-2 ring-maroon"
                                : "border-cream-3")
                            }
                          >
                            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-cream-2">
                              <Image
                                src={v.image}
                                alt={v.name}
                                fill
                                sizes="44px"
                                className="object-cover"
                              />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-display text-sm font-semibold text-ink">
                                {v.name}
                              </span>
                              <span className="mt-0.5 block text-xs text-ink-soft">
                                {v.city} · ★ {v.rating} ·{" "}
                                <span className="font-semibold text-ink">
                                  {t(
                                    `from ${money(v.priceFrom)} / plate`,
                                    `${money(v.priceFrom)} / प्लेट से`,
                                  )}
                                </span>
                              </span>
                            </span>
                            <span
                              className={
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] " +
                                (picked
                                  ? "border-maroon bg-maroon text-cream"
                                  : "border-cream-3 text-transparent")
                              }
                            >
                              ✓
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-ink-soft">
                    {t(
                      `${packageName || "Selected package"} vendors`,
                      `${packageName || "चयनित पैकेज"} वेंडर`,
                    )}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {visibleAddOns.length === 0 && (
        <p className="mt-5 rounded-xl border border-dashed border-cream-3 bg-cream-2/40 px-4 py-6 text-center text-sm text-ink-soft">
          {query
            ? t(
                `No add-ons match "${addOnQuery.trim()}".`,
                `"${addOnQuery.trim()}" से मिलता कोई ऐड-ऑन नहीं।`,
              )
            : t(
                "No add-ons in this category.",
                "इस श्रेणी में कोई ऐड-ऑन नहीं।",
              )}
        </p>
      )}
    </div>
  );
}

/* ─── Choose a payment method ──────────────────────────────────────────
 * Four ways to settle a booking, selected by the parent wizard so the chosen
 * method travels with the order to the admin console:
 *   • UPI / QR — pay online now against the merchant's UPI VPA. The QR is a real
 *     NPCI `upi://pay?...` deep-link rendered by our /api/payments/qr route, so
 *     any UPI app can scan it. There's no gateway callback, so settlement is
 *     customer-confirmed: tapping "I've paid" records the payment via
 *     /api/payments (idempotent on the txn ref → lands in the payment tracker)
 *     and reports the paid amount up to the wizard. UPI/QR can settle a 10%
 *     advance or the whole grand total.
 *   • COD — pay cash on delivery; nothing collected now.
 *   • Connect — let our team reach out to arrange the most convenient payment.
 */
function PaymentBox({
  t,
  bookingId,
  grandTotal,
  paidAmount,
  onPaid,
  customerName,
  customerPhone,
  customerEmail,
  payMethod,
  setPayMethod,
  eventDate,
  emiCount,
  setEmiCount,
}: {
  t: (en: string, hi: string) => string;
  bookingId: string;
  grandTotal: number;
  paidAmount: number;
  onPaid: (amount: number, txnRef: string) => void;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  payMethod: OrderPaymentMethod;
  setPayMethod: (m: OrderPaymentMethod) => void;
  eventDate: string;
  emiCount: number;
  setEmiCount: (n: number) => void;
}) {
  const [merchant, setMerchant] = useState<UpiPayeeConfig>(DEFAULT_MERCHANT);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  // The transaction / UTR the customer got from their UPI app — captured here so
  // it travels onto the payment record and the order before the booking is
  // confirmed, letting the team reconcile the transfer.
  const [txnId, setTxnId] = useState<string>("");

  // Pull the live merchant VPA (admin-configurable); fall back to the default.
  useEffect(() => {
    let active = true;
    fetch("/api/admin/payment-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (active && cfg && typeof cfg.vpa === "string") {
          setMerchant({
            vpa: cfg.vpa,
            payeeName: cfg.payeeName ?? DEFAULT_MERCHANT.payeeName,
            qrImage:
              typeof cfg.qrImage === "string" ? cfg.qrImage : undefined,
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const total = Math.round(grandTotal);
  // A fixed 10% advance confirms the booking; the 90% balance is settled later
  // (in one go or over EMIs). The online flow always collects exactly this.
  const advanceAmount = Math.max(1, Math.round(grandTotal * ADVANCE_RATE));
  const amount = advanceAmount;
  const balanceAmount = Math.max(0, total - advanceAmount);

  // How the customer wants to settle the 90% balance after the advance: pay it
  // in full (emiCount 1) or split into instalments. EMI counts >1 are only
  // offered when the event is far enough out; `emiCount` is owned by the wizard
  // so the choice travels onto the saved order.
  const emiOptions = emiOptionsForEvent(eventDate);
  const emiSelected = emiOptions.includes(emiCount) ? emiCount : 1;
  const emiPlan =
    emiSelected > 1
      ? buildEmiPlan(balanceAmount, emiSelected, eventDate)
      : null;
  // Contact (name + phone + a valid email) must be captured before we take
  // money, so the paid order is actionable and the auto-confirm that follows the
  // advance succeeds (handleConfirm enforces the same three fields).
  const contactReady =
    customerName.trim().length > 0 &&
    customerPhone.replace(/\D/g, "").length >= 10 &&
    isValidEmail(customerEmail);
  // A stable ref for the advance so a retry stays idempotent on the txn key.
  const txnRef = upiTxnRef(bookingId, "ADVANCE");
  const note = `Bhojpatra ${bookingId}`;
  const upiUri = buildUpiUri({
    vpa: merchant.vpa,
    payeeName: merchant.payeeName,
    amount,
    note,
    txnRef,
  });
  const qrSrc =
    `/api/payments/qr?pa=${encodeURIComponent(merchant.vpa)}` +
    `&pn=${encodeURIComponent(merchant.payeeName)}` +
    `&am=${amount}&tn=${encodeURIComponent(note)}&tr=${encodeURIComponent(txnRef)}`;

  const markPaid = async () => {
    // The customer's transaction ID is required proof of the transfer — take it
    // before recording the payment / confirming the booking.
    if (!isValidTxnId(txnId)) {
      setError(
        t(
          "Enter the transaction ID from your UPI app to confirm the payment.",
          "भुगतान की पुष्टि के लिए अपने UPI ऐप से लेनदेन आईडी दर्ज करें।",
        ),
      );
      return;
    }
    const customerTxnId = normalizeTxnId(txnId);
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          amount,
          method: payMethod === "QR" ? "qr" : "upi",
          vpa: merchant.vpa,
          txnRef,
          customerTxnId,
          customer: customerName.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(
          data?.error ??
            t("Couldn't record payment. Try again.", "भुगतान दर्ज नहीं हुआ। फिर कोशिश करें।"),
        );
        return;
      }
      onPaid(amount, customerTxnId);
    } catch {
      setError(
        t("Couldn't record payment. Try again.", "भुगतान दर्ज नहीं हुआ। फिर कोशिश करें।"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const copyVpa = async () => {
    try {
      await navigator.clipboard.writeText(merchant.vpa);
      setCopied(true);
    } catch {
      /* clipboard unavailable — the VPA is shown for manual entry anyway */
    }
  };

  if (paidAmount > 0) {
    const balance = Math.max(0, total - paidAmount);
    const fullyPaid = balance === 0;
    return (
      <div className="mt-6 rounded-2xl border border-maroon bg-white p-5 shadow-sm">
        <p className="font-display text-lg font-semibold text-maroon">
          ✓ {t("Payment received", "भुगतान प्राप्त हुआ")}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {fullyPaid
            ? t("Full payment recorded:", "पूरा भुगतान दर्ज:")
            : t("Advance recorded:", "एडवांस दर्ज:")}{" "}
          <span className="font-semibold text-ink">{money(paidAmount)}</span>
        </p>
        {!fullyPaid && (
          <p className="mt-1 text-sm text-ink-soft">
            {t("Balance due:", "शेष राशि:")}{" "}
            <span className="font-semibold text-ink">{money(balance)}</span>{" "}
            <span className="text-ink-soft/80">
              {t("— our team will collect this later.", "— हमारी टीम बाद में लेगी।")}
            </span>
          </p>
        )}
      </div>
    );
  }

  const online = isOnlineMethod(payMethod);

  return (
    <div className="mt-6 rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-ink">
          {t("How would you like to pay?", "आप कैसे भुगतान करना चाहेंगे?")}
        </h3>
        {online && (
          <span className="text-lg font-semibold text-maroon">{money(amount)}</span>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        {t(
          "Pay the 10% advance online to confirm now, or let our team connect to arrange payment.",
          "अभी पुष्टि के लिए 10% एडवांस ऑनलाइन दें, या भुगतान की व्यवस्था के लिए हमारी टीम से संपर्क करने दें।",
        )}
      </p>

      {/* Two top-level choices: pay online (UPI) now, or "Bhojpatra connects
          you (COD)" — book now and settle later. UPI expands into UPI-ID / QR. */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          aria-pressed={online}
          onClick={() => {
            if (!online) setPayMethod("UPI");
          }}
          className={
            "flex flex-col rounded-2xl border px-4 py-3 text-left transition " +
            (online
              ? "border-maroon bg-maroon-soft/30 ring-2 ring-maroon"
              : "border-cream-3 bg-white hover:bg-cream-2")
          }
        >
          <span className="text-sm font-semibold text-ink">{t("UPI", "UPI")}</span>
          <span className="mt-0.5 text-xs text-ink-soft">
            {t("Pay 10% advance online now", "अभी 10% एडवांस ऑनलाइन दें")}
          </span>
        </button>
        <button
          type="button"
          aria-pressed={payMethod === "Connect"}
          onClick={() => setPayMethod("Connect")}
          className={
            "flex flex-col rounded-2xl border px-4 py-3 text-left transition " +
            (payMethod === "Connect"
              ? "border-maroon bg-maroon-soft/30 ring-2 ring-maroon"
              : "border-cream-3 bg-white hover:bg-cream-2")
          }
        >
          <span className="text-sm font-semibold text-ink">
            {t(ORDER_PAYMENT_LABELS.Connect.en, ORDER_PAYMENT_LABELS.Connect.hi)}
          </span>
          <span className="mt-0.5 text-xs text-ink-soft">
            {t(
              "Confirm now — our team calls to arrange payment",
              "अभी पुष्टि करें — भुगतान के लिए हमारी टीम कॉल करेगी",
            )}
          </span>
        </button>
      </div>

      {online ? (
        <>
          {/* Sub-mode — pay the advance via a UPI ID or by scanning a QR. */}
          <div className="mt-4">
            <p className="text-sm font-semibold text-ink">
              {t("Choose how to pay the advance", "एडवांस कैसे दें, चुनें")}
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {(["UPI", "QR"] as const).map((m) => {
                const active = payMethod === m;
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPayMethod(m)}
                    className={
                      "flex flex-col rounded-2xl border px-4 py-3 text-left transition " +
                      (active
                        ? "border-maroon bg-maroon-soft/30 ring-2 ring-maroon"
                        : "border-cream-3 bg-white hover:bg-cream-2")
                    }
                  >
                    <span className="text-sm font-semibold text-ink">
                      {t(ORDER_PAYMENT_LABELS[m].en, ORDER_PAYMENT_LABELS[m].hi)}
                    </span>
                    <span className="mt-0.5 text-xs text-ink-soft">
                      {t(ORDER_PAYMENT_HINTS[m].en, ORDER_PAYMENT_HINTS[m].hi)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* The advance that confirms the booking — fixed at 10%. */}
          <div className="mt-4 rounded-2xl border border-maroon/30 bg-maroon-soft/20 p-4">
            <p className="text-sm text-ink">
              {t(
                `Pay a 10% advance of ${money(advanceAmount)} now to confirm your booking.`,
                `अपनी बुकिंग पक्की करने के लिए अभी 10% एडवांस ${money(advanceAmount)} दें।`,
              )}
            </p>
          </div>

          {payMethod === "QR" ? (
            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={merchant.qrImage || qrSrc}
                alt={t("UPI payment QR", "UPI भुगतान QR")}
                width={176}
                height={176}
                className="h-44 w-44 rounded-xl border border-cream-3 bg-white p-2 object-contain"
              />
              <div className="text-sm text-ink-soft">
                <p>
                  {t(
                    "Scan with any UPI app to pay",
                    "भुगतान के लिए किसी भी UPI ऐप से स्कैन करें",
                  )}
                </p>
                {merchant.qrImage && (
                  <p className="mt-1 text-xs">
                    {t(
                      `Enter ${money(amount)} in your UPI app.`,
                      `अपने UPI ऐप में ${money(amount)} दर्ज करें।`,
                    )}
                  </p>
                )}
                <p className="mt-1 font-semibold text-ink">{merchant.vpa}</p>
                <a
                  href={upiUri}
                  className="mt-3 inline-block rounded-full border border-maroon px-4 py-2 text-xs font-semibold text-maroon transition hover:bg-maroon/5 sm:hidden"
                >
                  {t("Open UPI app", "UPI ऐप खोलें")}
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-ink-soft">
                {t("Pay to this UPI ID", "इस UPI आईडी पर भुगतान करें")}
              </p>
              <div className="mt-2 flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar sm:flex-wrap sm:overflow-visible">
                <span className="shrink-0 whitespace-nowrap rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2 text-sm font-semibold text-ink">
                  {merchant.vpa}
                </span>
                <button
                  type="button"
                  onClick={copyVpa}
                  className="shrink-0 whitespace-nowrap rounded-full border border-maroon px-4 py-2 text-xs font-semibold text-maroon transition hover:bg-maroon/5"
                >
                  {copied ? t("Copied", "कॉपी हो गया") : t("Copy", "कॉपी")}
                </button>
                <a
                  href={upiUri}
                  className="shrink-0 whitespace-nowrap rounded-full bg-maroon px-4 py-2 text-xs font-semibold text-cream transition hover:bg-maroon/90"
                >
                  {t("Open UPI app", "UPI ऐप खोलें")}
                </a>
              </div>
            </div>
          )}

          {/* Transaction ID — the reference the customer's UPI app shows after
              paying. Required before we record the payment and confirm, so the
              team can reconcile the transfer. */}
          <div className="mt-4">
            <label htmlFor="upi-txn-id" className="text-sm font-semibold text-ink">
              {t("UPI Transaction ID", "UPI लेनदेन आईडी")}
            </label>
            <input
              id="upi-txn-id"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={txnId}
              onChange={(e) => setTxnId(e.target.value)}
              placeholder={t(
                "12-digit UPI reference / UTR",
                "12-अंकों का UPI रेफ़रेंस / UTR",
              )}
              className="mt-1.5 w-full rounded-xl border border-cream-3 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-maroon focus:ring-2 focus:ring-maroon/30"
            />
            <p className="mt-1.5 text-xs text-ink-soft">
              {t(
                "After paying, enter the reference number your UPI app shows so we can match your payment.",
                "भुगतान के बाद अपने UPI ऐप में दिखने वाला रेफ़रेंस नंबर दर्ज करें ताकि हम आपका भुगतान मिला सकें।",
              )}
            </p>
          </div>

          {/* Balance preference — how to settle the remaining 90% after the
              advance: in one payment, or split into EMIs (offered when the event
              is far enough out). Track-only: our team collects each instalment on
              its due date. */}
          <div className="mt-4 rounded-2xl border border-cream-3 bg-cream-2/30 p-4">
            <p className="text-sm font-semibold text-ink">
              {t(
                "How would you like to settle the balance?",
                "शेष राशि कैसे चुकाना चाहेंगे?",
              )}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {t(
                `After the ${money(advanceAmount)} advance, settle the ${money(balanceAmount)} balance in full or over easy EMIs.`,
                `${money(advanceAmount)} एडवांस के बाद, ${money(balanceAmount)} शेष राशि एकमुश्त या आसान EMI में चुकाएं।`,
              )}
            </p>
            <div className="mt-3 flex flex-nowrap gap-2 overflow-x-auto no-scrollbar sm:flex-wrap sm:overflow-visible">
              {emiOptions.map((n) => {
                const active = emiSelected === n;
                const label =
                  n === 1
                    ? t("Pay in full", "एकमुश्त")
                    : t(`${n} EMIs`, `${n} EMI`);
                return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setEmiCount(n)}
                    className={
                      "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition " +
                      (active
                        ? "border-maroon bg-maroon text-cream"
                        : "border-cream-3 bg-white text-ink hover:bg-cream-2")
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {emiPlan && (
              <ul className="mt-3 divide-y divide-cream-3 rounded-xl border border-cream-3 bg-white">
                {emiPlan.installments.map((it) => (
                  <li
                    key={it.index}
                    className="flex items-center justify-between px-4 py-2 text-sm"
                  >
                    <span className="text-ink-soft">
                      {t(
                        `EMI ${it.index} · ${it.dueLabel}`,
                        `EMI ${it.index} · ${it.dueLabel}`,
                      )}
                    </span>
                    <span className="font-semibold text-ink">
                      {money(it.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {emiPlan && (
              <p className="mt-2 text-xs text-ink-soft">
                {t(
                  "Our team collects each instalment on its due date — no card is charged automatically.",
                  "हमारी टीम हर किश्त उसकी नियत तारीख पर लेगी — कोई कार्ड अपने आप चार्ज नहीं होगा।",
                )}
              </p>
            )}
          </div>

          {error && (
            <p className="mt-3 text-sm font-medium text-maroon">{error}</p>
          )}

          {/* One tap records the advance and confirms the booking — no need to
              scroll down to a separate confirm button. */}
          <button
            type="button"
            onClick={markPaid}
            disabled={submitting || !isValidTxnId(txnId) || !contactReady}
            className="mt-4 rounded-full bg-maroon px-6 py-2.5 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon/90 disabled:opacity-60"
          >
            {submitting
              ? t("Confirming…", "पुष्टि हो रही है…")
              : `${t("Pay & Confirm", "भुगतान करें और पुष्टि करें")} ${money(amount)}`}
          </button>
          {!contactReady && (
            <p className="mt-2 text-xs font-medium text-maroon">
              {t(
                "Enter your name, phone and email above to confirm your booking.",
                "अपनी बुकिंग पक्की करने के लिए ऊपर अपना नाम, फ़ोन और ईमेल दर्ज करें।",
              )}
            </p>
          )}
          <p className="mt-2 text-xs text-ink-soft">
            {t(
              "Prefer to pay later? Choose “Bhojpatra connects you (COD)” above.",
              "बाद में भुगतान करना चाहते हैं? ऊपर “भोजपत्र आपसे संपर्क करेगा (COD)” चुनें।",
            )}
          </p>
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-cream-3 bg-cream-2/40 p-4">
          <p className="text-sm font-semibold text-ink">
            {t(ORDER_PAYMENT_LABELS.Connect.en, ORDER_PAYMENT_LABELS.Connect.hi)}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {t(
              "Confirm below and our team will call you to finalise the menu and arrange the most convenient way to pay — no payment now.",
              "नीचे पुष्टि करें और हमारी टीम मेन्यू तय करने और भुगतान का सबसे सुविधाजनक तरीका तय करने के लिए आपको कॉल करेगी — अभी कोई भुगतान नहीं।",
            )}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Step 4 · Confirm (review + coupon + payment) ───────────────────  */
function StepConfirm({
  t,
  occasion,
  packageName,
  eventDate,
  city,
  venue,
  setVenue,
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
        <div className="mt-3 space-y-3">
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
                <p className="text-sm text-ink-soft">
                  {t("No dishes selected yet.", "अभी तक कोई व्यंजन नहीं चुना गया।")}
                </p>
              );
            }
            return cards.map(({ cat, rows }) => (
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
            ));
          })()}
        </div>
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

      {/* Coupon */}
      <div className="mt-6 rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-maroon/10 text-maroon">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />
              <path d="M9 7v10" strokeDasharray="2 2" />
            </svg>
          </span>
          <h3 className="font-display text-base font-semibold text-ink">
            {t("Apply a coupon", "कूपन लगाएं")}
          </h3>
        </div>

        {appliedCoupon && couponDiscount > 0 ? (
          /* Applied — compact success card with remove */
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-maroon/30 bg-cream-2/40 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-maroon text-white">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  <span className="font-mono font-bold tracking-wide text-maroon">
                    {appliedCoupon.code}
                  </span>{" "}
                  {t("applied", "लागू")}
                </p>
                <p className="text-xs font-medium text-ink-soft/70">
                  {t("You save", "आपकी बचत")} {money(couponDiscount)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={removeCoupon}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-maroon transition hover:bg-maroon/10"
            >
              {t("Remove", "हटाएं")}
            </button>
          </div>
        ) : (
          <>
            {/* Compact single-line input with inline apply */}
            <div className="mt-3 flex items-center gap-2 rounded-full border border-cream-3 bg-cream-2/30 py-1 pl-4 pr-1 transition-colors focus-within:border-maroon focus-within:bg-white">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder={t("Enter code", "कोड दर्ज करें")}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium uppercase tracking-wide text-ink outline-none placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-soft/50"
              />
              <button
                type="button"
                onClick={applyCoupon}
                disabled={!couponInput.trim()}
                className="shrink-0 rounded-full bg-maroon px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("Apply", "लगाएं")}
              </button>
            </div>
            {couponError && (
              <p className="mt-2 pl-1 text-xs font-medium text-maroon">
                {couponError}
              </p>
            )}

            {/* Select-to-apply offer tickets */}
            <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-soft/50">
              {t("Tap to apply", "लगाने के लिए टैप करें")}
            </p>
            <div className="-mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {coupons.map((c) => {
                const save = Math.min((preDiscount * c.percent) / 100, c.cap);
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => applyCouponCode(c.code)}
                    className="group relative flex w-44 shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-dashed border-maroon/40 bg-cream-2/25 p-3 text-left transition hover:border-maroon hover:bg-cream-2/50 hover:shadow-sm"
                  >
                    {/* punched ticket notches */}
                    <span className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-cream-3 bg-white" />
                    <span className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-cream-3 bg-white" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-bold tracking-wide text-maroon">
                        {c.code}
                      </span>
                      <span className="rounded-md bg-maroon px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white opacity-90 transition group-hover:opacity-100">
                        {t("Apply", "लगाएं")}
                      </span>
                    </div>
                    <span className="mt-1.5 text-xs font-semibold text-ink">
                      {save > 0
                        ? t(`Save ${money(save)}`, `बचाएं ${money(save)}`)
                        : c.label}
                    </span>
                    {save > 0 && (
                      <span className="mt-0.5 truncate text-[10px] text-ink-soft/60">
                        {c.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Contact — so our team can reach out (required for COD / connect). */}
      <div className="mt-6 rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
        <h3 className="font-display text-base font-semibold text-ink">
          {t("Your contact details", "आपकी संपर्क जानकारी")}
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-ink-soft">
              {t("Full name", "पूरा नाम")}
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t("e.g. Ankit Sharma", "उदा. अंकित शर्मा")}
              autoComplete="name"
              className="mt-1 w-full rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-maroon focus:bg-white placeholder:text-ink-soft/60"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-soft">
              {t("Phone number", "फ़ोन नंबर")}
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder={t("10-digit mobile", "10 अंकों का मोबाइल")}
              autoComplete="tel"
              inputMode="tel"
              className="mt-1 w-full rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-maroon focus:bg-white placeholder:text-ink-soft/60"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-soft">
              {t("Email", "ईमेल")}
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder={t("you@example.com", "you@example.com")}
              autoComplete="email"
              inputMode="email"
              className="mt-1 w-full rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-maroon focus:bg-white placeholder:text-ink-soft/60"
            />
          </div>
          {/* Venue — usually pre-filled from the Hero booking bar or the venue
              catalogue, but editable here so it's captured even when the guest
              reached the wizard without one. Spans the full row. */}
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-ink-soft">
              {t("Venue", "वेन्यू")}
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder={t(
                "e.g. Grand Palace Lawn, Gomti Nagar",
                "उदा. ग्रैंड पैलेस लॉन, गोमती नगर",
              )}
              className="mt-1 w-full rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-maroon focus:bg-white placeholder:text-ink-soft/60"
            />
          </div>
        </div>
      </div>

      {/* Referral — auto-filled from a partner's share link (?ref=) or typed in.
          A recognised code shows the referrer's name as a tag. */}
      <div className="mt-6 rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
        <h3 className="font-display text-base font-semibold text-ink">
          {t("Referral code", "रेफ़रल कोड")}{" "}
          <span className="text-sm font-normal text-ink-soft">
            ({t("optional", "वैकल्पिक")})
          </span>
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          {t(
            "Referred by a Bhojpatra partner? Enter their code so they get credit.",
            "किसी Bhojpatra पार्टनर ने रेफ़र किया? उनका कोड दर्ज करें ताकि उन्हें श्रेय मिले।",
          )}
        </p>
        <input
          type="text"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
          placeholder="REF-XXXXXX"
          className="mt-3 w-full rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm uppercase tracking-wider text-ink outline-none transition-colors focus:border-maroon focus:bg-white placeholder:text-ink-soft/60 placeholder:normal-case placeholder:tracking-normal sm:max-w-xs"
        />
        {selfReferral ? (
          <p className="mt-2 text-sm font-medium text-maroon">
            {t(
              "This is your own referral code — you can't refer yourself, so it won't be credited.",
              "यह आपका ही रेफ़रल कोड है — आप खुद को रेफ़र नहीं कर सकते, इसलिए इसका श्रेय नहीं मिलेगा।",
            )}
          </p>
        ) : (
          referralCode.trim() &&
          referrerName && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-maroon px-3 py-1 text-xs font-semibold text-cream">
                <span aria-hidden="true">★</span>
                {t("Referred by", "रेफ़र किया")} {referrerName}
              </span>
              {referralDiscount > 0 && (
                <span className="text-sm font-medium text-maroon">
                  {t("You save", "आपकी बचत")} {money(referralDiscount)}
                  {referralPercent > 0 ? ` (${referralPercent}%)` : ""}
                </span>
              )}
            </div>
          )
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-maroon/30 bg-maroon-soft/30 p-5">
        {guests > 0 && grandTotal > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-soft">
                {t("Per plate (all-in)", "प्रति प्लेट (सब मिलाकर)")}
              </p>
              <p className="text-2xl font-semibold text-maroon">
                ≈ {money(perPlateCost(grandTotal, guests))}
                <span className="text-sm font-medium">
                  {" "}
                  / {t("plate", "प्लेट")}
                </span>
              </p>
            </div>
            <p className="mt-0.5 text-right text-sm text-ink-soft">
              {t(
                `Grand total ${money(grandTotal)} for ${inr.format(guests)} guests`,
                `${inr.format(guests)} मेहमानों के लिए कुल राशि ${money(grandTotal)}`,
              )}
            </p>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-soft">{t("Grand total", "कुल राशि")}</p>
            <p className="text-2xl font-semibold text-maroon">
              {money(grandTotal)}
            </p>
          </div>
        )}
        {paidAmount >= Math.round(grandTotal) ? (
          <p className="mt-1 text-sm font-semibold text-maroon">
            ✓ {t("Paid in full", "पूरा भुगतान हो गया")} · {money(paidAmount)}
          </p>
        ) : paidAmount > 0 ? (
          <p className="mt-1 text-sm font-semibold text-maroon">
            ✓ {t("Advance paid", "एडवांस भुगतान")} · {money(paidAmount)} ·{" "}
            <span className="font-normal text-ink-soft">
              {t("Balance", "शेष")}{" "}
              {money(Math.max(0, Math.round(grandTotal) - paidAmount))}
            </span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-soft">
            {t(
              `Pay a 10% advance (${money(Math.round(grandTotal * ADVANCE_RATE))}) now to confirm your booking — or choose “Bhojpatra connects you (COD)” below and our team will reach out to finalise the menu and payment.`,
              `अपनी बुकिंग पक्की करने के लिए अभी 10% एडवांस (${money(Math.round(grandTotal * ADVANCE_RATE))}) दें — या नीचे “भोजपत्र आपसे संपर्क करेगा (COD)” चुनें, हमारी टीम मेन्यू और भुगतान तय करने के लिए संपर्क करेगी।`,
            )}
          </p>
        )}
      </div>

      {/* Choose how to pay — pay the 10% advance online (UPI ID / QR) to confirm
          right here, or "Bhojpatra connects you (COD)" to book now and settle
          later. The online path records the advance and confirms in one click. */}
      <PaymentBox
        t={t}
        bookingId={bookingId}
        grandTotal={grandTotal}
        paidAmount={paidAmount}
        onPaid={onPaid}
        customerName={customerName}
        customerPhone={customerPhone}
        customerEmail={customerEmail}
        payMethod={payMethod}
        setPayMethod={setPayMethod}
        eventDate={eventDate}
        emiCount={emiCount}
        setEmiCount={setEmiCount}
      />

      {confirmError && (
        <p role="alert" className="mt-4 text-sm font-medium text-maroon">
          {confirmError}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {/* The online (UPI) path confirms straight from its "Pay & Confirm"
            button, so this submit only shows for the pay-later Connect flow, or
            as a retry once an advance has already been recorded. */}
        {(payMethod === "Connect" || paidAmount > 0) && (
          <button
            type="submit"
            disabled={confirming}
            className="rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon/90 disabled:opacity-60"
          >
            {confirming
              ? t("Confirming…", "पुष्टि हो रही है…")
              : t("Confirm Booking", "बुकिंग पक्की करें")}
          </button>
        )}
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-maroon px-6 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
        >
          {t("Share on WhatsApp", "WhatsApp पर शेयर करें")}
        </a>
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        {t(
          "We'll confirm your booking and contact you to complete the arrangements.",
          "हम आपकी बुकिंग की पुष्टि करेंगे और व्यवस्था पूरी करने के लिए आपसे संपर्क करेंगे।",
        )}
      </p>
    </form>
  );
}

/* ─── Confirmation view ──────────────────────────────────────────────── */
function StepDone({
  t,
  bookingId,
  occasion,
  eventDate,
  city,
  venue,
  guests,
  grandTotal,
  paidAmount,
  referrerName,
  onDownload,
  whatsappHref,
}: {
  t: (en: string, hi: string) => string;
  bookingId: string;
  occasion: OccasionOption | undefined;
  eventDate: string;
  city: City | undefined;
  venue: string;
  guests: number;
  grandTotal: number;
  paidAmount: number;
  referrerName: string;
  onDownload: () => void;
  whatsappHref: string;
}) {
  const total = Math.round(grandTotal);
  const balance = Math.max(0, total - paidAmount);
  const fullyPaid = paidAmount >= total;
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-maroon text-3xl text-cream shadow-sm">
        ✓
      </div>
      <h1 className="mt-5 text-3xl text-ink sm:text-4xl">
        {t("Booking Confirmed!", "बुकिंग पक्की!")}
      </h1>
      <p className="font-script mt-3 text-xl text-ink-soft">
        {t("your feast is on its way", "आपका भोज तैयार है")}
      </p>
      <p className="mt-4 inline-block rounded-full bg-cream-2 px-5 py-2 text-sm font-semibold text-maroon">
        {t("Booking ID", "बुकिंग आईडी")}: {bookingId}
      </p>
      {referrerName && (
        <p className="mt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-maroon px-4 py-2 text-sm font-semibold text-cream">
            <span aria-hidden="true">★</span>
            {t("Referred by", "रेफ़र किया")} {referrerName}
          </span>
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-cream-3 bg-white p-5 text-left shadow-sm">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-soft">{t("Occasion", "अवसर")}</dt>
            <dd className="font-semibold text-ink">
              {occasion ? t(occasion.name, occasion.nameHi) : "—"}
            </dd>
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
          <div>
            <dt className="text-ink-soft">{t("Guests", "मेहमान")}</dt>
            <dd className="font-semibold text-ink">{inr.format(guests)}</dd>
          </div>
          <div>
            {guests > 0 && grandTotal > 0 ? (
              <>
                <dt className="text-ink-soft">{t("Per Plate", "प्रति प्लेट")}</dt>
                <dd className="text-base font-semibold text-maroon">
                  ≈ {money(perPlateCost(grandTotal, guests))} /{" "}
                  {t("plate", "प्लेट")}
                </dd>
                <dd className="text-xs text-ink-soft">
                  {t(
                    `Grand total ${money(grandTotal)}`,
                    `कुल राशि ${money(grandTotal)}`,
                  )}
                </dd>
              </>
            ) : (
              <>
                <dt className="text-ink-soft">{t("Grand Total", "कुल राशि")}</dt>
                <dd className="font-semibold text-ink">{money(grandTotal)}</dd>
              </>
            )}
          </div>
          {paidAmount > 0 && (
            <>
              <div>
                <dt className="text-ink-soft">
                  {fullyPaid ? t("Paid", "भुगतान") : t("Advance Paid", "एडवांस भुगतान")}
                </dt>
                <dd className="font-semibold text-maroon">{money(paidAmount)}</dd>
              </div>
              {!fullyPaid && (
                <div>
                  <dt className="text-ink-soft">{t("Balance Due", "शेष राशि")}</dt>
                  <dd className="font-semibold text-ink">{money(balance)}</dd>
                </div>
              )}
            </>
          )}
        </dl>
      </div>

      <p className="mt-4 text-sm text-ink-soft">
        {paidAmount > 0
          ? fullyPaid
            ? t(
                "Payment received in full and a confirmation has been sent via WhatsApp and email. Our team will reach out to finalise the arrangements.",
                "पूरा भुगतान प्राप्त हुआ और पुष्टि WhatsApp व ईमेल पर भेज दी गई है। व्यवस्था तय करने के लिए हमारी टीम संपर्क करेगी।",
              )
            : t(
                `Your ${money(paidAmount)} advance is received and your date is locked. A confirmation has been sent via WhatsApp and email — our team will collect the ${money(balance)} balance and finalise the arrangements.`,
                `आपका ${money(paidAmount)} एडवांस प्राप्त हुआ और आपकी तारीख पक्की है। पुष्टि WhatsApp व ईमेल पर भेज दी गई है — हमारी टीम ${money(balance)} शेष राशि लेगी और व्यवस्था तय करेगी।`,
              )
          : t(
              "A confirmation has been sent via WhatsApp and email. Our team will reach out to finalise the arrangements and payment.",
              "पुष्टि WhatsApp और ईमेल पर भेज दी गई है। व्यवस्था और भुगतान तय करने के लिए हमारी टीम संपर्क करेगी।",
            )}
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onDownload}
          className="rounded-full border border-maroon px-4 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/5 sm:px-6"
        >
          ⬇ {t("Download Menu", "मेन्यू डाउनलोड")}
        </button>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-maroon px-4 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon/90 sm:px-6"
        >
          {t("Share on WhatsApp", "WhatsApp पर शेयर करें")}
        </a>
      </div>

      {/* Turn a happy booking into word-of-mouth — promote Bhojpatra to friends. */}
      <p className="mt-8 text-sm text-ink-soft">
        {t("Loved planning with us? Tell a friend.", "हमारे साथ प्लानिंग पसंद आई? किसी दोस्त को बताएं।")}
      </p>
      <div className="mt-2 flex justify-center">
        <WhatsAppShareButton
          variant="ghost"
          size="sm"
          label="Share Bhojpatra"
          labelHi="भोजपत्र शेयर करें"
          message="I just booked my celebration on Bhojpatra — verified caterers & venues, all in one place. Plan yours:"
          messageHi="मैंने अभी Bhojpatra पर अपना उत्सव बुक किया — वेरिफाइड कैटरर और वेन्यू, सब एक जगह। आप भी प्लान करें:"
        />
      </div>
    </div>
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
}: {
  lang: Lang;
  t: (en: string, hi: string) => string;
  tier: PackageTier | undefined;
  basePerPlate: number;
  onChange: () => void;
  /** On mobile only, collapse to a one-line summary (package · base price) that
   *  expands on tap. Desktop always renders the full detail card. */
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!tier) return null;
  const tierName = lang === "hi" ? tier.nameHi : tier.name;
  const summaryLine = `${tierName} · ${money(basePerPlate)} ${t("/ plate", "/ प्लेट")}`;
  return (
    <aside className="lg:sticky lg:top-32 lg:self-start">
      <div className="rounded-2xl border border-maroon bg-white p-5 shadow-sm ring-2 ring-maroon">
        {/* Mobile collapsed summary — package + base price on one tappable line;
            hidden on desktop, where the full card is always shown. */}
        {collapsible && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-3 text-left lg:hidden"
          >
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="eyebrow shrink-0 text-xs font-semibold text-gold">
                {t("YOUR PACKAGE", "आपका पैकेज")}
              </span>
              <span className="min-w-0 truncate text-xs font-semibold text-ink/70">
                {summaryLine}
              </span>
            </span>
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
          </button>
        )}
        {/* Full detail — on mobile shown only when expanded; desktop always. */}
        <div
          className={
            collapsible ? (open ? "mt-3 lg:mt-0" : "hidden lg:block") : ""
          }
        >
        <p
          className={
            "eyebrow text-xs font-semibold text-gold " +
            (collapsible ? "hidden lg:block" : "")
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
                label={`${t("Venue", "वेन्यू")}${venueName ? ` · ${venueName}` : ""}`}
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
