"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  packageCategories,
  packageCategoryItems,
  isLiveStallCategory,
  packageBasePerPlate,
  packageLeadDays,
  DEFAULT_VENDOR_LEAD_DAYS,
  vendorLeadDays,
  vendorListings,
  type PackageTier,
  type AddOn,
  type MenuCategory,
  type CategoryItem,
  type Coupon,
  type VendorListing,
  type BookingStatus,
} from "@/lib/data";
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

const inr = new Intl.NumberFormat("en-IN");
const money = (n: number) => `₹${inr.format(Math.round(n))}`;

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

  const [step, setStep] = useState<number>(1);

  // Step 1 — Package
  const [packageId, setPackageId] = useState<string>(
    packages.find((p) => p.popular)?.id ?? packages[0].id,
  );

  // Step 2 — Menu (per-category vendor + items). `activeCat` walks the plated
  // courses; `liveCat` walks the Live Stall step's live-station courses (Step 3).
  const [activeCat, setActiveCat] = useState<number>(0);
  const [liveCat, setLiveCat] = useState<number>(0);
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
  // add-on id → chosen vendor (catalogue) id. The roster a guest can choose
  // from is narrowed to the selected package's tier (see PACKAGE_VENDOR_TIERS).
  const [addOnVendor, setAddOnVendor] = useState<Record<string, string>>({});

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
    if (pkg && packages.some((p) => p.id === pkg)) setPackageId(pkg);
    if (stepParam === "menu") setStep(2);
    // A partner's share link (/book?ref=CODE) pre-fills the referral code.
    const ref = sp.get("ref");
    if (ref) setReferralCode(ref.trim().toUpperCase());
  }, []);

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

  // Keep the header's "Celebrating in" bar and the booking's City/Location in
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
  // date or a lower tier on purpose. Step 1 still hides too-soon tiers up front.

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
        vendors: c.vendors.filter(
          (v) => !v.live || !cityName || v.city?.toLowerCase() === cityName,
        ),
      }));
  }, [packageId, liveMenuCategories, cityId]);

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
    if (!multiVendor) return base;
    return base * Math.max(1, vendorsFor(catId).length);
  };

  const categoryComplete = (cat: MenuCategory): boolean => {
    const chosen = vendorsFor(cat.id);
    if (chosen.length === 0) return false;
    const base = baseAllowanceFor(cat.id);
    // Multi-vendor: every chosen vendor must contribute its own full quota.
    if (multiVendor)
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
  // Courses still needing a decision (not built and not skipped), per step — used
  // to tell the guest exactly what's left before "Continue" and to jump them
  // there. Kept separate so each step only nags about its own courses.
  const menuIncompleteCats = menuStepCategories.filter((c) => !categoryResolved(c));
  const firstMenuIncomplete = menuStepCategories.findIndex((c) => !categoryResolved(c));
  const menuIncompleteNames = menuIncompleteCats.map((c) =>
    lang === "hi" ? c.nameHi : c.name,
  );
  const liveIncompleteCats = liveStallCategories.filter((c) => !categoryResolved(c));
  const firstLiveIncomplete = liveStallCategories.findIndex((c) => !categoryResolved(c));
  const liveIncompleteNames = liveIncompleteCats.map((c) =>
    lang === "hi" ? c.nameHi : c.name,
  );

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
    if (!multiVendor) {
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
    if (multiVendor) {
      // Per-vendor cap — each vendor may fill its own quota independently.
      const vid = vendorOfItem(catId, itemId);
      if (vid && vendorPicks(catId, vid).length >= base) return;
    } else if (cur.length >= base) {
      return; // at the package cap
    }
    setCategoryItems((m) => ({ ...m, [catId]: [...cur, itemId] }));
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

  const perPlate = basePerPlate + categoryAddTotal;
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

  // The vendor effectively assigned to an add-on. We honour the guest's explicit
  // pick when it's still valid for the current package tier; otherwise we fall
  // back to the first eligible vendor. Deriving this at read time (rather than
  // reconciling stored state in an effect) keeps it correct when the package —
  // and therefore the eligible roster — changes.
  const addOnVendorId = (addOnId: string): string | undefined => {
    const chosen = addOnVendor[addOnId];
    if (chosen && eligibleAddOnVendors.some((v) => v.id === chosen)) return chosen;
    return eligibleAddOnVendors[0]?.id;
  };

  const addOnVendorName = (addOnId: string): string | undefined =>
    eligibleAddOnVendors.find((v) => v.id === addOnVendorId(addOnId))?.name;

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
  // Silver/Gold/Platinum carry a fixed package lead (7/21/45 days). The Custom
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
    // Catalogue vendors assigned to selected add-ons / live counters.
    for (const addOnId of selectedAddOns) {
      const v = eligibleAddOnVendors.find((x) => x.id === addOnVendorId(addOnId));
      if (v) {
        picked = true;
        lead = Math.max(lead, vendorLeadDays(v));
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
  // (esp. Gold/Platinum's 21/45-day leads). Instead we let the guest pick freely
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
        const vendor = addOnVendorName(a.id);
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
    lines.push(
      `GST (18%):   ${money(gst)}`,
      `Grand Total: ${money(grandTotal)}`,
    );
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
  const buildInvoice = (): InvoiceData => {
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
    if (categoryAddTotal > 0) {
      lines.push({
        label: `Premium vendor add-ons (${money(categoryAddTotal)}/plate × ${guests})`,
        amount: categoryAddTotal * guests,
      });
    }
    addOns
      .filter((a) => selectedAddOns.includes(a.id))
      .forEach((a) => {
        const vendor = addOnVendorName(a.id);
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
      occasion: occ?.name ?? "Feast",
      eventDate: eventDate ? formatEventDate(eventDate) : "-",
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
      paid: paidAmount,
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
        const vendor = addOnVendorName(a.id);
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
      `City: ${city ? city.name : "-"}\n` +
      `Venue: ${venue || "-"}\n` +
      `Guests: ${guests}\n` +
      (menuLines ? `\nMenu:\n${menuLines}\n` : "") +
      (addOnLines ? `\nAdd-ons: ${addOnLines}\n` : "") +
      (selectedService
        ? `\nService: ${selectedService.name} (${money(serviceTotal)})\n`
        : "") +
      `\nGrand Total: ${money(grandTotal)}` +
      paymentLines +
      emiLines
    );
  };
  const whatsappHref = `https://wa.me/919918359017?text=${encodeURIComponent(
    buildWhatsAppMessage(),
  )}`;

  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const goBack = () => setStep((s) => Math.max(1, s - 1));

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
          ...selectedAddOns
            .map((id) => addOnVendorName(id))
            .filter((n): n is string => Boolean(n)),
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
          ...selectedAddOns.flatMap((id) => {
            const vId = addOnVendorId(id);
            const vName = addOnVendorName(id);
            return vId && vName ? [{ id: vId, name: vName }] : [];
          }),
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

    const invoiceData = buildInvoice();

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
    // Bring the success screen into view — a paid-and-confirmed booking often
    // triggers from the advance button lower down, so jump back to the top.
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /* ─── Render ───────────────────────────────────────────────────────── */
  // Package (1) and the add-ons / details step (4) show their content on the
  // left with the order-summary rail on the right; the confirm step (6) keeps it
  // until paid. The full-width builders — Menu (2) and Live Stall (3) — and the
  // Essentials comparison (5) have no rail (the service cards each show their own
  // computed feast price instead).
  const showSummary = step === 1 || step === 4 || (step === 6 && !confirmed);

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
      <div className="relative overflow-hidden rounded-[1.75rem] bg-maroon px-5 py-7 shadow-brand sm:rounded-[2rem] sm:px-9 sm:py-10 lg:px-12 lg:py-12">
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
          <div className="mt-5 flex flex-nowrap items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.05em] text-cream sm:mt-6 sm:flex-wrap sm:gap-2 sm:text-xs sm:tracking-[0.12em]">
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
              <StepMenu
                lang={lang}
                t={t}
                title={t("Build Your Menu", "अपना मेन्यू बनाएं")}
                subtitle={t(
                  "Pick vendors and dishes for your plated courses — live counters come next.",
                  "अपने कोर्सेज़ के लिए वेंडर और व्यंजन चुनें — लाइव काउंटर अगले चरण में।",
                )}
                multiVendor={multiVendor}
                maxVendors={packageId === "silver" ? 5 : undefined}
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
                vendorRatings={vendorRatings}
              />
            ) : hasLiveStalls ? (
              <StepMenu
                lang={lang}
                t={t}
                title={t("Choose Your Live Stalls", "अपने लाइव स्टॉल चुनें")}
                subtitle={t(
                  "Cook-to-order counters made fresh in front of your guests — add-ons come next.",
                  "मेहमानों के सामने ताज़ा बनने वाले लाइव काउंटर — एक्स्ट्रा अगले चरण में।",
                )}
                multiVendor={multiVendor}
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
              eligibleVendors={eligibleAddOnVendors}
              vendorIdFor={addOnVendorId}
              onVendorChange={(addOnId, vendorId) =>
                setAddOnVendor((m) => ({ ...m, [addOnId]: vendorId }))
              }
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
              addOnVendorName={addOnVendorName}
              serviceName={selectedService?.name}
              serviceTotal={serviceTotal}
              onEditMenu={() => setStep(2)}
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
            basePerPlate={basePerPlate}
            categoryAddTotal={categoryAddTotal}
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
          setActiveCat={setActiveCat}
          allResolved={menuComplete}
          incompleteNames={menuIncompleteNames}
          firstIncomplete={firstMenuIncomplete}
          singleStall={singleStall}
          isSkipped={isSkipped}
          unskipCat={unskipCat}
          onPrev={menuPrev}
          onNext={menuNext}
          onSkipCurrent={skipCurrentStall}
          continueLabel={t("Continue to Live Stall", "लाइव स्टॉल तक जारी रखें")}
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
            setActiveCat={setLiveCat}
            allResolved={liveComplete}
            incompleteNames={liveIncompleteNames}
            firstIncomplete={firstLiveIncomplete}
            singleStall={singleStall}
            isSkipped={isSkipped}
            unskipCat={unskipCat}
            onPrev={livePrev}
            onNext={liveNext}
            onSkipCurrent={skipCurrentLiveStall}
            continueLabel={t("Continue to Add-ons", "एक्स्ट्रा तक जारी रखें")}
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
              disabled={step === 1}
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
                disabled={step === 1}
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
}: {
  title: string;
  sub?: string;
}) {
  return (
    <div className="mb-5 sm:mb-7">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-px w-7 bg-maroon" aria-hidden="true" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-maroon">
          Curated for you
        </span>
      </div>
      <h2 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
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
   both behave identically — a "still to finish" jump banner, per-stall skip on
   the Single Stall plan, and a Continue that names where it leads. */
function MenuStepNav({
  t,
  categories,
  activeCat,
  setActiveCat,
  allResolved,
  incompleteNames,
  firstIncomplete,
  singleStall,
  isSkipped,
  unskipCat,
  onPrev,
  onNext,
  onSkipCurrent,
  continueLabel,
  extraBanner,
}: {
  t: (en: string, hi: string) => string;
  categories: MenuCategory[];
  activeCat: number;
  setActiveCat: (n: number) => void;
  allResolved: boolean;
  incompleteNames: string[];
  firstIncomplete: number;
  singleStall: boolean;
  isSkipped: (catId: string) => boolean;
  unskipCat: (catId: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onSkipCurrent: () => void;
  continueLabel: string;
  extraBanner?: ReactNode;
}) {
  const atLast = activeCat >= categories.length - 1;
  const activeId = categories[activeCat]?.id ?? "";
  return (
    <div className="mt-10">
      {/* When the step isn't finished, name the unfinished courses and let the
          guest jump straight to the first — a silently-disabled Continue gives
          no clue what's left to pick. */}
      {!allResolved && incompleteNames.length > 0 && (
        <button
          type="button"
          onClick={() => setActiveCat(Math.max(0, firstIncomplete))}
          className="focus-ring mb-4 flex w-full items-start gap-2 rounded-card border border-maroon/30 bg-cream/40 px-4 py-3 text-left text-sm text-ink-soft transition hover:bg-cream/60"
        >
          <span aria-hidden="true" className="text-maroon">
            ★
          </span>
          <span>
            {t("Still to finish:", "अभी बाकी:")}{" "}
            <span className="font-semibold text-maroon">
              {incompleteNames.join(", ")}
            </span>
            {". "}
            {singleStall
              ? t(
                  "Tap to jump there, or skip the stalls you don't want.",
                  "वहाँ जाने के लिए टैप करें, या जो स्टॉल नहीं चाहिए उन्हें छोड़ दें।",
                )
              : t(
                  "Tap to jump to the next course and pick the rest.",
                  "अगले कोर्स पर जाने और बाकी चुनने के लिए टैप करें।",
                )}
          </span>
        </button>
      )}
      {extraBanner}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" onClick={onPrev}>
          ←{" "}
          {activeCat > 0
            ? t("Prev Category", "पिछली श्रेणी")
            : t("Back", "पीछे")}
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
              {t("Undo skip", "छोड़ना पूर्ववत करें")}
            </Button>
          ) : (
            <Button variant="secondary" onClick={onSkipCurrent}>
              {t("Skip this stall", "यह स्टॉल छोड़ें")}
            </Button>
          ))}
        {!atLast ? (
          <Button onClick={onNext}>
            {singleStall
              ? t("Next stall", "अगला स्टॉल")
              : t("Next Category", "अगली श्रेणी")}{" "}
            →
          </Button>
        ) : (
          <Button onClick={onNext} disabled={!allResolved}>
            {continueLabel} →
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
    setGuestsText(raw);
    const n = Math.round(Number(raw.replace(/[^0-9]/g, "")));
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
  const summaryParts = [
    occasionName,
    dateName,
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
      <span
        className="absolute inset-y-0 left-0 w-1 rounded-l-[1.5rem] bg-maroon"
        aria-hidden="true"
      />
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
          (showGuests ? "lg:grid-cols-4 " : "lg:grid-cols-3 ") +
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
  const available = packages
    .filter((tier) => packageAvailable(tier.id, eventDate))
    .map((tier) => {
      const meta = homePackages.tiers.find((x) => x.id === tier.id);
      return meta
        ? { ...tier, name: meta.name, nameHi: meta.nameHi, price: meta.price }
        : tier;
    });
  const hiddenCount = packages.length - available.length;
  return (
    <div>
      <SectionHead
        title={t("Choose a package", "पैकेज चुनें")}
        sub={t(
          "Sets your base plate price and how many items each course includes.",
          "यह आपकी बेस प्लेट कीमत और हर कोर्स में शामिल आइटम तय करता है।",
        )}
      />
      {/* Short-notice dates can't be sourced for the regular tiers — steer the
          guest to the Single Stall plan (one vendor per course) + add-ons
          rather than leaving the lone Single Stall card unexplained. */}
      {shortNotice ? (
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
      ) : hiddenCount > 0 && (
        <p className="mb-4 rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm text-ink-soft">
          {t(
            `Showing packages available for your event date. ${hiddenCount} ${
              hiddenCount === 1 ? "package needs" : "packages need"
            } more advance notice and ${
              hiddenCount === 1 ? "is" : "are"
            } hidden.`,
            `आपकी इवेंट तारीख़ के लिए उपलब्ध पैकेज दिखाए जा रहे हैं। ${hiddenCount} पैकेज को ज़्यादा अग्रिम समय चाहिए, इसलिए छिपाए गए हैं।`,
          )}
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
          (available.length === 1
            ? "sm:grid-cols-1"
            : available.length === 2
              ? "sm:grid-cols-2"
              : available.length === 3
                ? "sm:grid-cols-2 lg:grid-cols-3"
                : "sm:grid-cols-2")
        }
      >
        {available.map((tier: PackageTier) => {
          const selected = tier.id === packageId;
          const tierName = lang === "hi" ? tier.nameHi : tier.name;
          return (
            <div
              key={tier.id}
              className="w-[82vw] max-w-[360px] shrink-0 snap-center first:snap-start sm:w-auto sm:max-w-none sm:shrink"
            >
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
                  className="btn-sheen inline-flex min-h-7 items-center gap-1 whitespace-nowrap rounded-full bg-cream px-4 text-[10px] font-bold tracking-wide text-maroon shadow-card ring-1 ring-maroon/30 transition duration-200 hover:-translate-y-0.5 hover:shadow-pop active:scale-95"
                >
                  <span className="font-display leading-none">
                    {selected
                      ? `✓ ${t("Selected", "चयनित")}`
                      : `${t("Select", "चुनें")} ${tierName}`}
                  </span>
                </button>
              }
            />
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
  categoryComplete,
  isSkipped,
  unskipCat,
  onSkipMenu,
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
  vendorRatings: VendorRatings;
}) {
  const vendorScrollRef = useRef<HTMLDivElement>(null);
  // "Show more" lets guests expand past the curated cap (Silver only). Reset
  // whenever the cap itself changes (e.g. switching away from / back to Silver)
  // so the roster doesn't stay expanded on a package that never capped it.
  const [showAllVendors, setShowAllVendors] = useState(false);
  useEffect(() => setShowAllVendors(false), [maxVendors]);
  // Guard against a transient out-of-range index right after the package (and
  // thus the category list) changes, before the parent's clamp effect runs.
  const cat = categories[activeCat] ?? categories[0];
  // Silver advertises a fixed set of curated vendors — the cap applies to the
  // seed roster only. Live caterers who published a menu always stay visible,
  // whatever the package (they'd otherwise never surface on Silver, since the
  // curated seeds sort first). "Show more" lifts the cap on demand.
  const seedVendors = cat.vendors.filter((v) => !v.live);
  const cap = maxVendors && !showAllVendors ? maxVendors : undefined;
  const hiddenVendorCount = maxVendors
    ? Math.max(0, seedVendors.length - maxVendors)
    : 0;
  const visibleVendors = maxVendors
    ? [...seedVendors.slice(0, cap), ...cat.vendors.filter((v) => v.live)]
    : cat.vendors;
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
      <h3 className="mt-7 font-sans text-2xl font-semibold text-maroon">
        {multiVendor
          ? t("Step A · Pick vendors (select multiple)", "चरण A · वेंडर चुनें (कई चुनें)")
          : t("Step A · Pick a vendor", "चरण A · वेंडर चुनें")}
      </h3>
      <div className="relative mt-3">
      <div
        ref={vendorScrollRef}
        className="flex snap-x gap-4 overflow-x-auto pb-3"
      >
        {visibleVendors.map((v) => {
          const selected = selectedIds.includes(v.id);
          const stat = statFor(vendorRatings, v);
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={selected}
              onClick={() => pickVendor(cat.id, v.id)}
              className={
                "group relative flex w-40 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md sm:w-56 " +
                (selected ? "border-maroon ring-2 ring-maroon" : "border-cream-3")
              }
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <Image
                  src={v.image}
                  alt={v.name}
                  fill
                  sizes="(min-width: 640px) 224px, 160px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col p-3 sm:p-4">
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
                {/* Menu preview — list this vendor's dishes row-wise so guests
                    can gauge the spread before selecting. */}
                {v.items.length > 0 && (
                  <div className="mt-2 flex flex-col gap-0.5 border-t border-cream-3 pt-2">
                    {v.items.map((it: CategoryItem) => (
                      <span
                        key={it.id}
                        className="flex items-center gap-1.5 text-[11px] leading-tight text-ink-soft"
                      >
                        <span
                          aria-hidden="true"
                          className={
                            "inline-block h-2 w-2 shrink-0 rounded-sm border " +
                            (it.diet === "veg" ? "border-ink" : "border-maroon")
                          }
                        />
                        <span className="truncate">{it.name}</span>
                      </span>
                    ))}
                  </div>
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

        {/* Scroll hint — more vendors than fit; nudge the guest to scroll. */}
        {visibleVendors.length > 5 && (
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

      {/* Show more — Silver curates a capped roster; let guests expand it to
          browse the rest of the seed vendors on demand. */}
      {hiddenVendorCount > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAllVendors((s) => !s)}
            className="inline-flex items-center gap-2 rounded-full border border-maroon/40 bg-white px-5 py-2.5 text-sm font-semibold text-maroon shadow-sm transition hover:bg-maroon hover:text-cream"
          >
            {showAllVendors
              ? t("Show fewer vendors", "कम वेंडर दिखाएं")
              : t(
                  `Show ${hiddenVendorCount} more vendors`,
                  `${hiddenVendorCount} और वेंडर दिखाएं`,
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
                  "eyebrow text-xs font-semibold " +
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
                      return (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => toggleItem(cat.id, it.id)}
                          disabled={atCap}
                          aria-pressed={active}
                          className={
                            "flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition " +
                            (active
                              ? "border-maroon bg-cream-2 ring-1 ring-maroon"
                              : atCap
                                ? "cursor-not-allowed border-cream-3 bg-white opacity-50"
                                : "border-cream-3 bg-white hover:bg-cream-2")
                          }
                        >
                          {/* Dish thumbnail — falls back to the course icon when a
                              seed vendor hasn't uploaded a photo. */}
                          <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-cream-3 bg-cream-2">
                            {it.photo ? (
                              <Image
                                src={it.photo}
                                alt=""
                                fill
                                sizes="64px"
                                className="object-cover"
                              />
                            ) : (
                              <span
                                aria-hidden="true"
                                className="flex h-full w-full items-center justify-center text-2xl"
                              >
                                {cat.icon}
                              </span>
                            )}
                          </span>
                          {/* Diet mark + dish name */}
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            <span
                              aria-hidden="true"
                              className={
                                "inline-block h-3.5 w-3.5 shrink-0 rounded-sm border " +
                                (it.diet === "veg"
                                  ? "border-ink"
                                  : "border-maroon")
                              }
                            />
                            <span className="truncate text-sm font-medium text-ink">
                              {it.name}
                            </span>
                          </span>
                          {/* Add / added control */}
                          <span
                            className={
                              "shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition " +
                              (active
                                ? "border-maroon bg-maroon text-cream"
                                : "border-maroon bg-white text-maroon")
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
  eligibleVendors,
  vendorIdFor,
  onVendorChange,
}: {
  lang: Lang;
  t: (en: string, hi: string) => string;
  guests: number;
  selectedAddOns: string[];
  toggleAddOn: (id: string) => void;
  packageName: string;
  eligibleVendors: VendorListing[];
  vendorIdFor: (addOnId: string) => string | undefined;
  onVendorChange: (addOnId: string, vendorId: string) => void;
}) {
  // Free-text filter over the add-on roster. Matches the English/Hindi names,
  // the description, and the hidden `keywords` aliases (so "gol gappe" finds the
  // Chaat Station). Selections live in the parent, so filtering never drops a
  // chosen add-on from the order — it only hides its card.
  const [addOnQuery, setAddOnQuery] = useState("");
  const query = addOnQuery.trim().toLowerCase();
  const visibleAddOns = query
    ? addOns.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.nameHi.includes(query) ||
          a.description.toLowerCase().includes(query) ||
          (a.keywords ?? []).some((k) => k.toLowerCase().includes(query)),
      )
    : addOns;
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

      <div className="mt-5 flex flex-col gap-4">
        {visibleAddOns.map((a: AddOn) => {
          const active = selectedAddOns.includes(a.id);
          const lineTotal = a.perPlate ? a.price * guests : a.price;
          const selectId = `addon-vendor-${a.id}`;
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
                      ? `${money(a.price)} / ${t("plate", "प्लेट")}`
                      : money(a.price)}
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
                            `≈ ${money(lineTotal)} for ${guests} guests`,
                            `${guests} मेहमानों के लिए ≈ ${money(lineTotal)}`,
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
                    {t("Vendor for this counter", "इस काउंटर के लिए वेंडर")}
                  </span>
                  {eligibleVendors.length === 0 ? (
                    <p className="mt-1 text-sm text-ink-soft">
                      {t(
                        "No vendors available for this package.",
                        "इस पैकेज के लिए कोई वेंडर उपलब्ध नहीं।",
                      )}
                    </p>
                  ) : (
                    <div
                      role="radiogroup"
                      aria-labelledby={selectId}
                      className="mt-2 grid gap-2 sm:grid-cols-2"
                    >
                      {eligibleVendors.map((v) => {
                        const picked = vendorIdFor(a.id) === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            role="radio"
                            aria-checked={picked}
                            onClick={() => onVendorChange(a.id, v.id)}
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
          {t(
            `No add-ons match "${addOnQuery.trim()}".`,
            `"${addOnQuery.trim()}" से मिलता कोई ऐड-ऑन नहीं।`,
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
  addOnVendorName,
  serviceName,
  serviceTotal,
  onEditMenu,
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
  addOnVendorName: (addOnId: string) => string | undefined;
  serviceName?: string;
  serviceTotal: number;
  onEditMenu: () => void;
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
            {t("Edit", "बदलें")}
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {categories.map((cat) => {
            const chosen = categoryVendor[cat.id] ?? [];
            // One line per selected vendor (several possible on Platinum).
            const rows = cat.vendors
              .filter((v) => chosen.includes(v.id))
              .map((v) => ({
                vendor: v,
                picks: v.items
                  .filter((it) => itemsFor(cat.id).includes(it.id))
                  .map((it) => it.name),
              }))
              .filter((r) => r.picks.length > 0);
            if (rows.length === 0) return null;
            return (
              <div key={cat.id}>
                {rows.map((r) => (
                  <div key={r.vendor.id} className="mt-2 first:mt-0">
                    <p className="text-sm font-semibold text-ink-soft">
                      {cat.icon} {t(cat.name, cat.nameHi)} ·{" "}
                      <span className="text-maroon">{r.vendor.name}</span>
                    </p>
                    <p className="text-sm text-ink">{r.picks.join(", ")}</p>
                  </div>
                ))}
              </div>
            );
          })}
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
                const vendor = addOnVendorName(a.id);
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink-soft">{t("Grand total", "कुल राशि")}</p>
          <p className="text-2xl font-semibold text-maroon">
            {money(grandTotal)}
          </p>
        </div>
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
            <dt className="text-ink-soft">{t("Grand Total", "कुल राशि")}</dt>
            <dd className="font-semibold text-ink">{money(grandTotal)}</dd>
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

        {/* Total to pay + advance — always visible, headline of the summary. */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft">
              {t("Total", "कुल")}
            </p>
            <p className="font-display text-2xl font-semibold text-maroon">
              {money(grandTotal)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft">
              {t("Advance (10%)", "एडवांस (10%)")}
            </p>
            <p className="font-display text-2xl font-semibold text-ink">
              {money(advance)}
            </p>
          </div>
        </div>

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
              label={t("Vendor add-ons / plate", "वेंडर ऐड-ऑन / प्लेट")}
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
