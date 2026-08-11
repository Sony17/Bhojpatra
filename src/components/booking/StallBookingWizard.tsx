"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useLang } from "@/lib/i18n";
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
import StepDone from "@/components/booking/shared/StepDone";
import SectionHead from "@/components/booking/shared/SectionHead";
import EventBar from "@/components/booking/shared/EventBar";
import StepExtras from "@/components/booking/shared/StepExtras";
import CheckoutPanel from "@/components/booking/shared/CheckoutPanel";
import ServicePackages from "@/components/sections/ServicePackages";
import {
  WizardHero,
  ProgressRail,
} from "@/components/booking/shared/WizardChrome";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
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
  addOns,
  coupons,
  menuCategories,
  servingTimeLabel,
  isLiveStallCategory,
  customOrderLeadDays,
  vendorListings,
  dummyDishPhoto,
  type MenuCategory,
  type CategoryItem,
  type DietType,
  type Coupon,
  type BookingStatus,
} from "@/lib/data";
import { slugifyName } from "@/lib/bookings";
import {
  readStallDraft,
  writeStallDraft,
  clearStallDraft,
  type StallItemMap as ItemMap,
} from "@/lib/stallDraft";
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
import { Button } from "@/components/ui";
import { inr, money, perPlateCost } from "@/lib/money";
import {
  MIN_GUESTS,
  MAX_GUESTS,
  ADVANCE_RATE,
  computeOrderTotals,
  deriveBookingId,
  daysUntil,
  formatEventDate,
  isoAfterDays,
} from "@/lib/bookingPricing";

/* ─── Constants ──────────────────────────────────────────────────────── */
// Menu (1) · Details (2) · Confirm (3). Deliberately shorter than the tiered
// wizard at /book: a Single Stall order is one vendor's own menu, so there is
// no package to choose and no per-course vendor shopping. Which stall is not a
// step either — that choice happens on the Brands page, which already lists
// every stall with its photos, ratings, filters and full menu; the wizard is
// entered from a brand's "Book Now" and opens straight on that stall's menu.
const TOTAL_STEPS = 3;

// Where a guest picks their stall: the Brands catalogue, lensed to the Single
// Stall category. Every entry point into this flow that doesn't already name a
// vendor sends them here first.
const BRANDS_HREF = "/vendors?category=single-stall";

// The order is stored under the platform's "custom" plan — the same id the
// tiered wizard used for its single-stall path, so every downstream consumer
// (admin console, My Bookings, invoices, the server's lead-time backstop)
// keeps working unchanged.
const STALL_PACKAGE_ID = "custom";

type Lang = "en" | "hi";
type City = (typeof cities)[number];

/** A `?vendor=` id we can't resolve to a brand, made readable for the
 *  "brand not found" notice ("awadhi-royal" → "Awadhi Royal"). */
function prettifyVendorId(id: string): string {
  const words = id
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return words.length ? words.join(" ") : id;
}

/** One course a stall publishes, with that stall's dishes for it. */
interface StallCourse {
  id: string;
  name: string;
  nameHi: string;
  icon: string;
  /** The stall's per-plate rate for this course. On a fixed menu that IS the
   *  price — one rate for the whole spread. On a varied one it's the fallback
   *  for a dish the vendor didn't price individually. */
  perPlate: number;
  items: CategoryItem[];
  live: boolean;
  /** How the vendor sells this course, set in their dashboard. `"fixed"` — a
   *  set menu: every dish comes, the guest customises nothing, and the course
   *  bills at `perPlate`. `"varied"` — the guest picks delicacies and pays for
   *  each. Anything the vendor never answered reads as fixed. */
  fixed: boolean;
}

/** A bookable stall — one vendor, collapsed across every course they publish. */
interface StallOption {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  live: boolean;
  pinned: boolean;
  city?: string;
  courses: StallCourse[];
  /** Cheapest way into this stall — the "from" price on its card. A set-menu
   *  course enters at its own per-plate rate (the whole spread), a varied one
   *  at its cheapest dish. */
  fromPrice: number;
  dishCount: number;
  /** Every course this stall runs is a set menu, so the card can say so and
   *  price per plate rather than per dish. */
  allFixed: boolean;
}

/** The price of one dish on a VARIED course: the vendor's own per-delicacy
 *  price, or their course per-plate rate when they didn't price it separately.
 *  "Pay only for what you select" — there is no package base underneath.
 *  Meaningless on a fixed course, which charges `perPlate` for the whole
 *  spread however many dishes it holds — use `coursePrice` for that. */
function dishPrice(item: CategoryItem, course: StallCourse): number {
  return item.price ?? course.perPlate;
}

/** The veg / non-veg mark. This is the one place the four-colour brand palette
 *  gives way: in India the green-dot / red-dot square is a statutory FSSAI food
 *  label, and guests read it as a symbol rather than as brand colour. Non-veg
 *  keeps brand red. */
const DIET_MARK: Record<DietType, string> = {
  veg: "#008000",
  "non-veg": "#B92025",
};

/** What one course adds to the per-plate, given the guest's picks. A fixed
 *  course is all-or-nothing at its own rate; a varied one bills dish by dish. */
function coursePrice(course: StallCourse, picks: string[]): number {
  if (course.fixed) {
    // A fixed course only bills once the guest has taken the stall's course at
    // all — `picks` carries its whole dish list the moment they do.
    return picks.length > 0 ? course.perPlate : 0;
  }
  return course.items
    .filter((it) => picks.includes(it.id))
    .reduce((s, it) => s + dishPrice(it, course), 0);
}

/* ─── Component ──────────────────────────────────────────────────────── */
export default function StallBookingWizard() {
  const { lang, t } = useLang();
  const sessionStatus = useSessionStatus();
  const hydrated = useRef(false);

  const [step, setStep] = useState<number>(1);

  // Step 1 — the chosen stall (one vendor for the whole order).
  const [stallId, setStallId] = useState<string>("");
  // A `?vendor=` hand-off from a brand page, held until the live roster loads.
  const [pendingVendorId, setPendingVendorId] = useState<string>("");
  const [missingBrand, setMissingBrand] = useState<string>("");

  // Step 2 — the stall's own menu.
  const [activeCat, setActiveCat] = useState<number>(0);
  const [categoryItems, setCategoryItems] = useState<ItemMap>({});

  // Step 3 — event details.
  const [occasionId, setOccasionId] = useState<string>("");
  const [customOccasion, setCustomOccasion] = useState<string>("");
  const [guests, setGuests] = useState<number>(100);
  const [eventDate, setEventDate] = useState<string>("");
  const [mealTime, setMealTime] = useState<string>("");
  const [eventTime, setEventTime] = useState<string>("");
  const [foodPreference, setFoodPreference] = useState<string>("");
  const [cityId, setCityId] = useState<string>("");
  const [customCity, setCustomCity] = useState<string>("");
  const [venue, setVenue] = useState<string>("");
  const [venueFee, setVenueFee] = useState<number>(0);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  // add-on id → the catalogue vendor running it. A Single Stall order keeps one
  // vendor per counter (the whole point is a single kitchen per line item).
  const [addOnVendor, setAddOnVendor] = useState<Record<string, string>>({});
  // Optional feast-wide service package (crew, buffet setup). Unlike the tiered
  // flow this is not mandatory — a single stall often needs nothing extra.
  const services = useServices();
  const [serviceId, setServiceId] = useState<string>("");

  // Step 4 — confirm.
  const [couponInput, setCouponInput] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string>("");
  const [confirming, setConfirming] = useState<boolean>(false);
  const [confirmError, setConfirmError] = useState<string>("");
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [payMethod, setPayMethod] = useState<OrderPaymentMethod>("UPI");
  const [emiCount, setEmiCount] = useState<number>(1);

  // Referral attribution — same rules as the tiered wizard.
  const [referralCode, setReferralCode] = useState<string>("");
  const [referrerName, setReferrerName] = useState<string>("");
  const [referrerType, setReferrerType] = useState<string>("");
  const [referrerPhone, setReferrerPhone] = useState<string>("");
  const [referralRates, setReferralRates] = useState<ReferralRates>(
    DEFAULT_REFERRAL_RATES,
  );

  const occasionList = useOccasions();
  const locations = useLocations();

  const resolveOccasion = (id: string): OccasionOption | undefined => {
    if (!id) return undefined;
    if (id === OTHER_OCCASION_ID) {
      const name = customOccasion.trim();
      return name ? { id, name, nameHi: name } : undefined;
    }
    return occasionList.find((o) => o.id === id);
  };
  const resolveCity = (id: string): City | undefined => {
    if (!id) return undefined;
    if (id === OTHER_LOCATION_ID) {
      const name = customCity.trim();
      return name ? { id, name, nameHi: name } : undefined;
    }
    return locations.find((c) => c.id === id) ?? cities.find((c) => c.id === id);
  };

  /* ─── Effects ──────────────────────────────────────────────────────── */

  // Scroll to top on step transitions.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [step]);

  // Rehydrate a persisted draft BEFORE the URL effect below, so a fresh deep
  // link still overrides a stale draft while a plain return resumes the order.
  useEffect(() => {
    const d = readStallDraft();
    if (d) {
      if (typeof d.step === "number") setStep(d.step);
      if (d.stallId) setStallId(d.stallId);
      if (typeof d.activeCat === "number") setActiveCat(d.activeCat);
      if (d.categoryItems) setCategoryItems(d.categoryItems);
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
      if (d.addOnVendor) setAddOnVendor(d.addOnVendor);
      if (d.serviceId) setServiceId(d.serviceId);
    }
    hydrated.current = true;
  }, []);

  // Prefill from the query string — the Hero booking bar, a brand page's "book
  // this stall", or a partner's share link.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const occ = sp.get("occasion");
    const occName = sp.get("occName")?.trim();
    if (occ === OTHER_OCCASION_ID || occName) {
      setOccasionId(OTHER_OCCASION_ID);
      if (occName) setCustomOccasion(occName);
    } else if (occ) {
      setOccasionId(occ);
    }
    const date = sp.get("date");
    if (date) setEventDate(date);
    const city = sp.get("city");
    const loc = sp.get("loc")?.trim();
    if (city === OTHER_LOCATION_ID || loc) {
      setCityId(OTHER_LOCATION_ID);
      if (loc) setCustomCity(loc);
    } else if (city) {
      setCityId(city);
    }
    const venueParam = sp.get("venue");
    if (venueParam) setVenue(venueParam);
    const g = Number(sp.get("guests"));
    if (g >= MIN_GUESTS && g <= MAX_GUESTS) setGuests(Math.round(g));
    // A brand page hands off its vendor — resolve it once the roster loads and
    // drop the guest straight onto the menu builder for that stall.
    const vendorParam = sp.get("vendor")?.trim();
    if (vendorParam) setPendingVendorId(vendorParam);
    const ref = sp.get("ref");
    if (ref) setReferralCode(ref.trim().toUpperCase());
  }, []);

  // Persist the draft on every change (once the rehydrate above has run).
  useEffect(() => {
    if (!hydrated.current) return;
    writeStallDraft({
      step,
      stallId,
      activeCat,
      categoryItems,
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
    stallId,
    activeCat,
    categoryItems,
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

  // When the URL didn't pass a city, reuse the detected / persisted one.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("city") || sp.get("loc")) return;
    const stored = readStoredLocation();
    if (!stored?.cityId) return;
    setCityId(stored.cityId);
    if (stored.customCity) setCustomCity(stored.customCity);
  }, []);

  // Resolve a venue passed by id to its name + booking fee.
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

  // Keep the header's location bar and this wizard's city in lockstep.
  useEffect(() => {
    if (!cityId) return;
    const custom = cityId === OTHER_LOCATION_ID ? customCity.trim() : undefined;
    if (cityId === OTHER_LOCATION_ID && !custom) return;
    const stored = readStoredLocation();
    if (stored?.cityId === cityId && (stored.customCity ?? "") === (custom ?? ""))
      return;
    markManualLocation(cityId, custom);
  }, [cityId, customCity]);

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

  useEffect(() => {
    let active = true;
    fetch("/api/admin/referral-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ReferralRates | null) => {
        if (active && d) setReferralRates(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const ownMemberships = useMemo(
    () => partnerMemberships(sessionStatus ?? null),
    [sessionStatus],
  );

  useEffect(() => {
    const code = referralCode.trim();
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
        setReferrerPhone(p?.phone ?? "");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [referralCode, ownMemberships]);

  // Prefill contact from the signed-in account / last booking.
  useEffect(() => {
    if (!sessionStatus) return;
    if (sessionStatus.name) setCustomerName((n) => n || sessionStatus.name!);
    if (sessionStatus.email) setCustomerEmail((e) => e || sessionStatus.email!);
  }, [sessionStatus]);

  const [lastBookingPhone, setLastBookingPhone] = useState<string>("");
  useEffect(() => {
    if (!sessionStatus) return;
    let active = true;
    fetch("/api/bookings/mine")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { orders?: { phone?: string }[] } | null) => {
        if (!active) return;
        const phone = (data?.orders ?? []).find((o) => o.phone?.trim())?.phone;
        if (!phone) return;
        setLastBookingPhone(phone.trim());
        setCustomerPhone((p) => p || phone.trim());
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [sessionStatus]);

  // Best-effort lead capture for an abandoned booking.
  const capturedPhones = useRef<Set<string>>(new Set());
  useEffect(() => {
    const phone = customerPhone.replace(/[\s-]/g, "");
    if (!/^[6-9]\d{9}$/.test(phone)) return;
    if (phone === lastBookingPhone.replace(/[\s-]/g, "")) return;
    if (capturedPhones.current.has(phone)) return;
    capturedPhones.current.add(phone);
    void fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, source: "booking-intent" }),
    }).catch(() => {});
  }, [customerPhone, lastBookingPhone]);

  /* ─── The stall roster ─────────────────────────────────────────────── */
  // Courses + dishes come from the vendor store (`/api/menu`): curated seed
  // specialists plus every live vendor menu published from a vendor dashboard.
  // The static fixture renders instantly until the fetch answers.
  const [liveMenuCategories, setLiveMenuCategories] =
    useState<MenuCategory[]>(menuCategories);
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

  const cityName = resolveCity(cityId)?.name.toLowerCase();

  // Every stall a guest can book, collapsed from the per-course roster into one
  // card per vendor. NO tier gate — that is the whole point of this flow: a
  // Single Stall order browses every verified stall the city offers, whatever
  // marketplace band the vendor sits in. Live vendors are filtered to the event
  // city (they cook locally); curated seeds are city-agnostic.
  //
  // The stall already chosen is never filtered out: the city is editable on
  // every step now, and a guest correcting it must not have the stall (and the
  // menu they built on it) vanish underneath them.
  const stalls = useMemo<StallOption[]>(() => {
    const byId = new Map<string, StallOption>();
    for (const cat of liveMenuCategories) {
      for (const v of cat.vendors) {
        if (
          v.live &&
          cityName &&
          v.city?.toLowerCase() !== cityName &&
          v.id !== stallId
        )
          continue;
        if (!v.items.length) continue;
        const course: StallCourse = {
          id: cat.id,
          name: cat.name,
          nameHi: cat.nameHi,
          icon: cat.icon,
          perPlate: v.perPlate,
          items: v.items,
          live: isLiveStallCategory(cat.id),
          // Anything the vendor never answered is a set menu — the platform
          // default, and what an older record with no `menuType` means.
          fixed: v.menuType !== "varied",
        };
        const existing = byId.get(v.id);
        if (existing) {
          existing.courses.push(course);
          continue;
        }
        byId.set(v.id, {
          id: v.id,
          name: v.name,
          image: v.image,
          rating: v.rating,
          reviews: v.reviews,
          live: Boolean(v.live),
          pinned: Boolean(v.pinned),
          city: v.city,
          courses: [course],
          fromPrice: 0,
          dishCount: 0,
          allFixed: false,
        });
      }
    }
    const list = Array.from(byId.values());
    for (const s of list) {
      // Cheapest entry point per course: a set menu costs its per-plate rate
      // whole, a varied one starts at its cheapest dish.
      const prices = s.courses.flatMap((c) =>
        c.fixed ? [c.perPlate] : c.items.map((it) => dishPrice(it, c)),
      );
      s.fromPrice = prices.length ? Math.min(...prices) : 0;
      s.dishCount = s.courses.reduce((n, c) => n + c.items.length, 0);
      s.allFixed = s.courses.every((c) => c.fixed);
    }
    // Admin-pinned brands lead, then the best rated.
    return list.sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) || b.rating - a.rating,
    );
  }, [liveMenuCategories, cityName, stallId]);

  const stall = useMemo<StallOption | undefined>(
    () => stalls.find((s) => s.id === stallId),
    [stalls, stallId],
  );

  // Resolve a `?vendor=` hand-off once the roster arrives. A catalogue id with
  // no booking-menu record under it (a curated caterer listing) is bridged to
  // its wizard counterpart by name-slug — tolerating the listing's trailing
  // "Caterers" ("Awadhi Royal Caterers" ↔ "Awadhi Royal").
  useEffect(() => {
    if (!pendingVendorId) return;
    const nameKey = (name: string) =>
      slugifyName(name).replace(/-caterers$/, "");
    let targetId = pendingVendorId;
    if (!stalls.some((s) => s.id === pendingVendorId)) {
      const listing = vendorListings.find((l) => l.id === pendingVendorId);
      const hit = listing
        ? stalls.find((s) => nameKey(s.name) === nameKey(listing.name))
        : undefined;
      if (hit) targetId = hit.id;
    }
    if (!stalls.some((s) => s.id === targetId)) {
      // While the live roster is in flight this only means "not loaded yet".
      if (!menuSettled) return;
      const listing = vendorListings.find((l) => l.id === pendingVendorId);
      setMissingBrand(listing?.name ?? prettifyVendorId(pendingVendorId));
      setPendingVendorId("");
      return;
    }
    setMissingBrand("");
    // A different stall than the draft held invalidates every dish pick — item
    // ids are vendor-scoped.
    setStallId((prev) => {
      if (prev !== targetId) setCategoryItems({});
      return targetId;
    });
    setActiveCat(0);
    setStep(1);
    setPendingVendorId("");
  }, [stalls, pendingVendorId, menuSettled]);

  // Nobody books a stall they haven't seen. Landing here without one — a bare
  // /book/stall, a cleared draft — means the guest hasn't chosen yet, so send
  // them to the Brands page, which lists every stall with its photos, filters
  // and full menu. They come back through a brand's "Book Now" with `?vendor=`,
  // and the draft (event brief and all) is still in session storage. A hand-off
  // we couldn't resolve keeps them here instead, so the notice is read first.
  useEffect(() => {
    if (!menuSettled || stallId || pendingVendorId || missingBrand) return;
    if (typeof window === "undefined") return;
    window.location.replace(BRANDS_HREF);
  }, [menuSettled, stallId, pendingVendorId, missingBrand]);

  // Keep the active course tab in range when the stall (and its course list)
  // changes.
  useEffect(() => {
    if (stall && activeCat > stall.courses.length - 1) setActiveCat(0);
  }, [stall, activeCat]);

  /* ─── Menu selection ───────────────────────────────────────────────── */
  // No quotas here. A tier hands you "N dishes from this course"; a Single
  // Stall order is priced by the course, so the guest takes exactly the courses
  // they want. What they may do WITHIN a course is the vendor's call: a fixed
  // course is all-or-nothing (its whole spread, one rate), a varied one is
  // picked dish by dish.
  const courseById = (catId: string): StallCourse | undefined =>
    stall?.courses.find((c) => c.id === catId);

  const itemsFor = (catId: string): string[] => {
    const stored = categoryItems[catId] ?? [];
    const course = courseById(catId);
    // A taken fixed course always carries its FULL dish list, so a draft saved
    // while the vendor still sold this course dish-by-dish can't resume as a
    // half-picked set menu.
    if (course?.fixed) return stored.length ? course.items.map((it) => it.id) : [];
    return stored;
  };

  const toggleItem = (catId: string, itemId: string) => {
    // Nothing to toggle on a set menu — the whole course goes in or out.
    if (courseById(catId)?.fixed) return;
    setCategoryItems((m) => {
      const current = m[catId] ?? [];
      return {
        ...m,
        [catId]: current.includes(itemId)
          ? current.filter((x) => x !== itemId)
          : [...current, itemId],
      };
    });
  };

  /** Take (or drop) a whole set-menu course — the only choice a fixed stall
   *  offers: this course's spread is in your order, or it isn't. */
  const toggleCourse = (catId: string) => {
    const course = courseById(catId);
    if (!course) return;
    setCategoryItems((m) => ({
      ...m,
      [catId]: (m[catId] ?? []).length ? [] : course.items.map((it) => it.id),
    }));
  };

  const pickedCount = useMemo<number>(
    () =>
      (stall?.courses ?? []).reduce(
        (n, c) => n + itemsFor(c.id).filter((id) => id.startsWith(`${stall!.id}-`)).length,
        0,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stall, categoryItems],
  );

  /* ─── Derived pricing ──────────────────────────────────────────────── */
  // Per-plate is what the chosen courses add up to — a set menu at its own
  // rate, a varied one dish by dish. There is no package base under a Single
  // Stall order.
  const perPlate = useMemo<number>(() => {
    if (!stall) return 0;
    return stall.courses.reduce(
      (sum, c) => sum + coursePrice(c, itemsFor(c.id)),
      0,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stall, categoryItems]);

  const subtotal = perPlate * guests;

  const addOnsTotal = useMemo<number>(
    () =>
      addOns
        .filter((a) => selectedAddOns.includes(a.id))
        .reduce((sum, a) => sum + (a.perPlate ? a.price * guests : a.price), 0),
    [selectedAddOns, guests],
  );

  const selectedService = services.find((s) => s.id === serviceId);
  const serviceTotal = selectedService
    ? selectedService.perPlate
      ? selectedService.priceMin * guests
      : selectedService.priceMin
    : 0;

  // A counter's vendor: the guest's pick when it's still valid, else the first
  // eligible one so a selected counter is never vendorless. Single Stall opens
  // the whole catalogue — no tier narrowing.
  const addOnVendorId = (addOnId: string): string => {
    const chosen = addOnVendor[addOnId];
    if (chosen && vendorListings.some((v) => v.id === chosen)) return chosen;
    return vendorListings[0]?.id ?? "";
  };
  const addOnVendorName = (addOnId: string): string =>
    vendorListings.find((v) => v.id === addOnVendorId(addOnId))?.name ?? "";

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

  const referralCustomerPercent =
    !isSelfReferral(referralCode, ownMemberships) &&
    !isPhoneSelfReferral(customerPhone, {
      type: referrerType as PartnerRole,
      phone: referrerPhone,
    }) &&
    referralCode.trim() &&
    referrerName
      ? customerPercentFor(referralRates, referrerType)
      : 0;

  const selfReferral =
    isSelfReferral(referralCode, ownMemberships) ||
    isPhoneSelfReferral(customerPhone, {
      type: referrerType as PartnerRole,
      phone: referrerPhone,
    });

  const totals = computeOrderTotals({
    subtotal,
    addOnsTotal,
    venueFee,
    serviceTotal,
    coupon: appliedCoupon,
    referralPercent: referralCustomerPercent,
  });
  const {
    preDiscount,
    couponDiscount,
    referralDiscount,
    discount,
    gst,
    grandTotal,
  } = totals;

  // What we already hold for this guest — read back on the Review step instead
  // of asked for a second time (same treatment as the tiered flow).
  const knownContact = useMemo(
    () => ({
      name: sessionStatus?.name ?? "",
      email: sessionStatus?.email ?? "",
      phone: lastBookingPhone,
    }),
    [sessionStatus, lastBookingPhone],
  );

  const totalItems = Object.values(categoryItems).reduce(
    (n, arr) => n + arr.length,
    0,
  );
  const bookingId = deriveBookingId(guests, grandTotal, totalItems);

  /* ─── Advance-booking lead time ────────────────────────────────────── */
  // "As per vendor specification": the longest lead among the stall and any
  // counter vendors on the order. Derived through the same helper the server's
  // backstop uses, so the client never green-lights a date the API will reject.
  const orderVendorIds = useMemo<string[]>(
    () => [
      ...(stallId ? [stallId] : []),
      ...selectedAddOns.map((id) => addOnVendorId(id)).filter(Boolean),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stallId, selectedAddOns, addOnVendor],
  );
  const vendorLead = customOrderLeadDays(orderVendorIds);
  const occasionLead = occasionLeadFor(occasionId, occasionList);
  const effectiveLeadDays = Math.max(vendorLead, occasionLead);

  const daysToEvent = daysUntil(eventDate);
  const dateMeetsLead = daysToEvent === null || daysToEvent >= effectiveLeadDays;
  const earliestDate = isoAfterDays(effectiveLeadDays);
  const leadOccasion =
    occasionLead > vendorLead ? resolveOccasion(occasionId) : undefined;
  const leadWarning =
    eventDate === "" || dateMeetsLead
      ? ""
      : leadOccasion
        ? t(
            `A ${leadOccasion.name} needs ${effectiveLeadDays} days' notice. Pick a date on or after ${formatEventDate(earliestDate)}.`,
            `${leadOccasion.nameHi} के लिए ${effectiveLeadDays} दिन का अग्रिम समय चाहिए। ${formatEventDate(earliestDate)} या उसके बाद की तारीख़ चुनें।`,
          )
        : t(
            `${stall?.name ?? "This stall"} needs ${effectiveLeadDays} ${effectiveLeadDays === 1 ? "day" : "days"}' notice. Pick a date on or after ${formatEventDate(earliestDate)}, or choose a same-day stall.`,
            `${stall?.name ?? "इस स्टॉल"} के लिए ${effectiveLeadDays} दिन का अग्रिम समय चाहिए। ${formatEventDate(earliestDate)} या उसके बाद की तारीख़ चुनें, या सेम-डे स्टॉल चुनें।`,
          );

  /* ─── Validation per step ──────────────────────────────────────────── */
  const stepValid = (s: number): boolean => {
    switch (s) {
      case 1:
        return Boolean(stall) && pickedCount > 0;
      case 2:
        return (
          occasionId !== "" &&
          (occasionId !== OTHER_OCCASION_ID || customOccasion.trim() !== "") &&
          guests >= MIN_GUESTS &&
          guests <= MAX_GUESTS &&
          eventDate !== "" &&
          dateMeetsLead
        );
      default:
        return true;
    }
  };
  const canNext = stepValid(step);

  const nextBlockers = ((): string[] => {
    if (canNext) return [];
    if (step === 1) {
      if (!stall) return [t("Choose a stall", "एक स्टॉल चुनें")];
      return [
        stall.allFixed
          ? t(
              "Add at least one course from this stall.",
              "इस स्टॉल से कम से कम एक कोर्स जोड़ें।",
            )
          : t(
              "Pick at least one dish from this stall's menu.",
              "इस स्टॉल के मेन्यू से कम से कम एक व्यंजन चुनें।",
            ),
      ];
    }
    if (step === 2) {
      const out: string[] = [];
      if (occasionId === "") out.push(t("Select an occasion", "अवसर चुनें"));
      else if (
        occasionId === OTHER_OCCASION_ID &&
        customOccasion.trim() === ""
      )
        out.push(t("Name your occasion", "अपने अवसर का नाम लिखें"));
      if (eventDate === "")
        out.push(t("Pick an event date", "इवेंट की तारीख़ चुनें"));
      else if (!dateMeetsLead && leadWarning) out.push(leadWarning);
      if (guests < MIN_GUESTS || guests > MAX_GUESTS)
        out.push(
          t(
            `Set guests between ${inr.format(MIN_GUESTS)} and ${inr.format(MAX_GUESTS)}`,
            `मेहमानों की संख्या ${inr.format(MIN_GUESTS)} से ${inr.format(MAX_GUESTS)} के बीच रखें`,
          ),
        );
      return out;
    }
    return [];
  })();

  /* ─── Handlers ─────────────────────────────────────────────────────── */
  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  // Start over drops every pick — including the stall — so it lands back where
  // the flow begins: the Brands page.
  const startOver = () => {
    clearStallDraft();
    if (typeof window !== "undefined") window.location.assign(BRANDS_HREF);
  };

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

  const buildEmiPlanForOrder = (paid: number = paidAmount): EmiPlan | undefined => {
    const total = Math.round(grandTotal);
    const balance = total - paid;
    if (emiCount <= 1 || paid <= 0 || balance <= 0) return undefined;
    if (!emiOptionsForEvent(eventDate).includes(emiCount)) return undefined;
    return buildEmiPlan(balance, emiCount, eventDate);
  };

  /** The chosen dishes grouped by course — the shape the receipt, invoice and
   *  WhatsApp summary all render from. */
  const menuGroups = useMemo(
    () =>
      (stall?.courses ?? [])
        .map((c) => {
          const picks = itemsFor(c.id);
          const names = c.items
            .filter((it) => picks.includes(it.id))
            .map((it) => it.name);
          return names.length ? { heading: c.name, items: names } : null;
        })
        .filter((g): g is { heading: string; items: string[] } => g !== null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stall, categoryItems],
  );

  const buildReceipt = (): string => {
    const occ = resolveOccasion(occasionId);
    const cityObj = resolveCity(cityId);
    const menuLines = menuGroups
      .map((g) => `  • ${g.heading}: ${g.items.join(", ")}`)
      .join("\n");
    const addOnLines = addOns
      .filter((a) => selectedAddOns.includes(a.id))
      .map((a) => {
        const v = addOnVendorName(a.id);
        return v ? `  • ${a.name} — ${v}` : `  • ${a.name}`;
      })
      .join("\n");

    const lines = [
      "BHOJPATRA — BOOKING RECEIPT",
      `Booking ID: ${bookingId}`,
      "",
      `Occasion: ${occ ? occ.name : "-"}`,
      `Plan:     Single Stall`,
      `Stall:    ${stall?.name ?? "-"}`,
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

  const buildInvoice = (paid: number = paidAmount): InvoiceData => {
    const occ = resolveOccasion(occasionId);
    const cityObj = resolveCity(cityId);

    const lines: InvoiceData["lines"] = [];
    if (perPlate > 0) {
      lines.push({
        label: `${stall?.name ?? "Single Stall"} menu (${money(perPlate)}/plate × ${guests})`,
        amount: subtotal,
      });
    }
    addOns
      .filter((a) => selectedAddOns.includes(a.id))
      .forEach((a) => {
        const v = addOnVendorName(a.id);
        const name = v ? `${a.name} — ${v}` : a.name;
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
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      occasion: occ?.name ?? "Feast",
      eventDate: eventDate ? formatEventDate(eventDate) : "-",
      servingTime: servingTimeLabel(mealTime, eventTime) || undefined,
      foodPreference: foodPreference || undefined,
      city: cityObj?.name ?? "-",
      venue: venue || "-",
      guests,
      packageName: stall ? `Single Stall — ${stall.name}` : "Single Stall",
      lines,
      menu: menuGroups.map((g) => ({
        heading: g.heading,
        items: g.items.join(", "),
      })),
      subtotal,
      addOnsTotal,
      discount,
      gst,
      grandTotal,
      paid,
    };
  };

  const downloadMenu = () => downloadInvoice(buildInvoice());

  const buildWhatsAppMessage = (): string => {
    const occ = resolveOccasion(occasionId);
    const cityObj = resolveCity(cityId);
    const menuLines = menuGroups
      .map((g) => `${g.heading}: ${g.items.join(", ")}`)
      .join("\n");
    const addOnLines = addOns
      .filter((a) => selectedAddOns.includes(a.id))
      .map((a) => {
        const v = addOnVendorName(a.id);
        return v ? `${a.name} (${v})` : a.name;
      })
      .join(", ");
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
    const emiLines = emiPlan
      ? `\nPayment Plan (EMI):\n${formatEmiPlanText(emiPlan)}`
      : "";
    return (
      `Bhojpatra Single Stall Booking (${bookingId})\n` +
      contactLines +
      `Payment: ${ORDER_PAYMENT_LABELS[payMethod].en}\n` +
      `Occasion: ${occ ? occ.name : "-"}\n` +
      `Stall: ${stall?.name ?? "-"}\n` +
      `Date: ${eventDate || "-"}\n` +
      (servingTimeLabel(mealTime, eventTime)
        ? `Serving: ${servingTimeLabel(mealTime, eventTime)}\n`
        : "") +
      (foodPreference ? `Food: ${foodPreference}\n` : "") +
      `City: ${cityObj ? cityObj.name : "-"}\n` +
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

  const handleConfirm = async (paidOverride?: number, refOverride?: string) => {
    setConfirmError("");
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

    // The stall itself plus every counter vendor, deduped — retained on the
    // order so each can be rated individually later (My Bookings).
    const bookedVendors = Array.from(
      new Map(
        [
          ...(stall ? [{ id: stall.id, name: stall.name }] : []),
          ...selectedAddOns.flatMap((id) => {
            const v = vendorListings.find((x) => x.id === addOnVendorId(id));
            return v ? [{ id: v.id, name: v.name }] : [];
          }),
        ].map((v) => [v.id, v] as const),
      ).values(),
    );
    const vendorLabel =
      bookedVendors.map((v) => v.name).join(", ") || "Bhojpatra";

    const orderPaid = paidOverride ?? paidAmount;
    const orderPaymentRef = refOverride ?? paymentRef;
    const emiPlan = buildEmiPlanForOrder(orderPaid);
    const orderStatus: BookingStatus = emiPlan ? "Pending" : "Confirmed";
    const invoiceData = buildInvoice(orderPaid);

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
          eventDateISO: eventDate,
          ...(mealTime ? { mealTime } : {}),
          ...(eventTime ? { eventTime } : {}),
          ...(foodPreference ? { foodPreference } : {}),
          packageId: STALL_PACKAGE_ID,
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
          referralCode: selfReferral
            ? undefined
            : referralCode.trim() || undefined,
          referrerName: selfReferral ? undefined : referrerName || undefined,
          referrerType: selfReferral ? undefined : referrerType || undefined,
          ...(bookedVendors.length ? { vendors: bookedVendors } : {}),
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
    clearStallDraft();
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /* ─── Render ───────────────────────────────────────────────────────── */
  const stepLabels = [
    t("Menu", "मेन्यू"),
    t("Details", "विवरण"),
    t("Review", "समीक्षा"),
  ];

  // The event brief — the same always-editable card the tiered wizard carries,
  // so occasion / date / city / guests are gathered once and identically on
  // both flows instead of hiding inside a step.
  const renderEventBar = (mobileCollapse = false) => (
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
      paxMin={MIN_GUESTS}
      paxMax={MAX_GUESTS}
      leadWarning={leadWarning}
      // Review locks the headcount and echoes it in the order summary, so the
      // editable field would be redundant there.
      showGuests={step !== TOTAL_STEPS}
      collapsible={mobileCollapse}
      collapseAt="sm"
    />
  );

  if (confirmed) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <StepDone
          t={t}
          bookingId={bookingId}
          occasion={resolveOccasion(occasionId)}
          eventDate={eventDate ? formatEventDate(eventDate) : ""}
          city={resolveCity(cityId)}
          venue={venue}
          guests={guests}
          grandTotal={grandTotal}
          paidAmount={paidAmount}
          referrerName={selfReferral ? "" : referrerName}
          onDownload={downloadMenu}
          whatsappHref={whatsappHref}
        />
      </div>
    );
  }

  // Details (2) and Review (3) run beside the live order summary; the menu
  // builder (1) takes the full width.
  const showSummary = step === 2 || step === 3;

  return (
    <section className="app-bottom-safe relative mx-auto w-full max-w-[90rem] overflow-x-hidden px-3 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      {/* Same editorial opening the tiered flow leads with, so the Single Stall
          plan reads as a first-class plan rather than a stripped-down one.
          Phones drop it for a minimal, low-scroll flow. */}
      <WizardHero
        eyebrow={t("SINGLE STALL", "सिंगल स्टॉल")}
        title={t("One Stall, One Great Menu", "एक स्टॉल, एक बढ़िया मेन्यू")}
        sub={t(
          "One verified stall runs your whole order — their menu, their price, and nothing you didn't ask for.",
          "एक वेरिफाइड स्टॉल आपका पूरा ऑर्डर संभालता है — उनका मेन्यू, उनकी कीमत, और कुछ भी फ़ालतू नहीं।",
        )}
        chips={[
          t("3 guided steps", "3 आसान चरण"),
          t("One verified vendor", "एक वेरिफाइड वेंडर"),
          t("Pay for what you pick", "जो चुनें उसी का भुगतान"),
        ]}
        aside={
          <a
            href="/book"
            className="whitespace-nowrap rounded-full border border-cream/35 bg-black/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cream transition hover:bg-black/20 sm:text-xs"
          >
            {t("Want a full feast package?", "पूरा फीस्ट पैकेज चाहिए?")} →
          </a>
        }
      />

      <ProgressRail
        t={t}
        step={step}
        totalSteps={TOTAL_STEPS}
        stepLabels={stepLabels}
        onStartOver={startOver}
      />

      {/* Event brief — up top on every step, collapsed to one editable line on
          phones so the step content leads. */}
      {renderEventBar(true)}

      <div
        className={
          showSummary
            ? "mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_21rem]"
            : "mt-7"
        }
      >
        <div className="min-w-0">
          {/* Step 1 · the chosen stall's menu. Without a stall this is a hand-off
              back to the Brands page — the only place stalls are picked. */}
          {step === 1 &&
            (stall ? (
              <StepStallMenu
                t={t}
                lang={lang}
                stall={stall}
                activeCat={activeCat}
                setActiveCat={setActiveCat}
                itemsFor={itemsFor}
                toggleItem={toggleItem}
                toggleCourse={toggleCourse}
                perPlate={perPlate}
                pickedCount={pickedCount}
                guests={guests}
                brandsHref={BRANDS_HREF}
              />
            ) : (
              <StallHandoff
                t={t}
                missingBrand={missingBrand}
                brandsHref={BRANDS_HREF}
              />
            ))}

          {step === 2 && (
            <StepStallDetails
              t={t}
              lang={lang}
              guests={guests}
              selectedAddOns={selectedAddOns}
              toggleAddOn={toggleAddOn}
              addOnVendorId={addOnVendorId}
              setAddOnVendor={setAddOnVendor}
              services={services}
              serviceId={serviceId}
              setServiceId={setServiceId}
            />
          )}

          {step === 3 &&
            (sessionStatus === undefined ? (
              <p className="text-sm text-ink-soft">{t("Loading…", "लोड हो रहा है…")}</p>
            ) : sessionStatus === null ? (
              <LoginGate onBack={goBack} />
            ) : (
              <StepStallConfirm
                t={t}
                stall={stall}
                menuGroups={menuGroups}
                guests={guests}
                perPlate={perPlate}
                occasion={resolveOccasion(occasionId)}
                eventDate={eventDate}
                servingLabel={servingTimeLabel(mealTime, eventTime)}
                foodPreference={foodPreference}
                city={resolveCity(cityId)}
                venue={venue}
                setVenue={setVenue}
                venueFee={venueFee}
                selectedAddOns={selectedAddOns}
                addOnVendorName={addOnVendorName}
                serviceName={selectedService?.name ?? ""}
                serviceTotal={serviceTotal}
                couponInput={couponInput}
                setCouponInput={setCouponInput}
                appliedCoupon={appliedCoupon}
                couponError={couponError}
                applyCoupon={applyCoupon}
                applyCouponCode={applyCouponCode}
                removeCoupon={removeCoupon}
                preDiscount={preDiscount}
                couponDiscount={couponDiscount}
                referralDiscount={referralDiscount}
                referralPercent={referralCustomerPercent}
                referralCode={referralCode}
                setReferralCode={setReferralCode}
                referrerName={referrerName}
                selfReferral={selfReferral}
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
                onPaid={(amount, ref) => {
                  setPaidAmount(amount);
                  setPaymentRef(ref);
                  void handleConfirm(amount, ref);
                }}
                confirming={confirming}
                confirmError={confirmError}
                onConfirm={() => void handleConfirm()}
                onEditMenu={() => setStep(1)}
                onEditExtras={() => setStep(2)}
                brandsHref={BRANDS_HREF}
                whatsappHref={whatsappHref}
              />
            ))}
        </div>

        {showSummary && (
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <StallSummary
              t={t}
              stall={stall}
              guests={guests}
              perPlate={perPlate}
              subtotal={subtotal}
              addOnsTotal={addOnsTotal}
              serviceTotal={serviceTotal}
              venueFee={venueFee}
              discount={discount}
              gst={gst}
              grandTotal={grandTotal}
              pickedCount={pickedCount}
            />
          </aside>
        )}
      </div>

      {/* Step nav — same shape as the tiered wizard: blockers spelled out in a
          cream notice, Back / Continue on desktop, and a sticky checkout bar on
          phones carrying the running estimate. Review carries its own actions,
          so the nav stops before it. */}
      {step < TOTAL_STEPS && (
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
          {/* Desktop nav — Back only once there's a step behind this one; the
              menu step's own way back is to the Brands page, in its header. */}
          <div className="hidden items-center justify-between md:flex">
            {step > 1 ? (
              <Button
                variant="secondary"
                onClick={goBack}
                aria-label={t("Back", "पीछे")}
              >
                {t("Back", "पीछे")}
              </Button>
            ) : (
              <a
                href={BRANDS_HREF}
                className="text-sm font-semibold text-ink-soft underline underline-offset-4 transition hover:text-maroon"
              >
                ← {t("Back to all stalls", "सभी स्टॉल पर वापस")}
              </a>
            )}
            <Button onClick={goNext} disabled={!canNext}>
              {`${t("Continue", "आगे")} · ${stepLabels[step]} →`}
            </Button>
          </div>
          {/* Mobile sticky checkout chrome. The estimate only appears once the
              guest has actually picked something — a stall and a headcount are
              not an order, and pricing one they never assembled reads as a quote
              they're on the hook for. */}
          <div className="app-sticky-cta md:hidden">
            <div className="mx-auto max-w-3xl rounded-2xl border border-maroon/10 bg-white/96 px-3 py-2.5 shadow-pop-up backdrop-blur-xl">
              {pickedCount > 0 ? (
                <div className="mb-2 flex items-end justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                      {t("Per plate", "प्रति प्लेट")}
                    </span>
                    <span className="block truncate font-sans text-base font-bold leading-tight text-maroon">
                      {money(perPlate)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-[11px] leading-tight text-ink-soft">
                    {money(grandTotal)} ·{" "}
                    {t(
                      `${inr.format(guests)} guests`,
                      `${inr.format(guests)} मेहमान`,
                    )}
                  </span>
                </div>
              ) : (
                <div className="mb-2 text-[11px] leading-tight text-ink-soft">
                  {t(
                    "Your total appears once you add courses — nothing is booked yet.",
                    "कोर्स जोड़ते ही आपका कुल दिखेगा — अभी कुछ भी बुक नहीं हुआ है।",
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                {step > 1 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={goBack}
                    aria-label={t("Back", "पीछे")}
                    className="min-h-11 px-4"
                  >
                    ←
                  </Button>
                )}
                <Button
                  onClick={goNext}
                  disabled={!canNext}
                  fullWidth
                  className="min-h-11"
                >
                  {`${t("Continue", "आगे")} · ${stepLabels[step]}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ─── Step 1 fallback · no stall chosen yet ───────────────────────────────
 * Stalls are browsed and compared on the Brands page, not in here — it already
 * carries every stall's photos, ratings, cuisine filters and full menu. So a
 * guest who reaches the wizard without one is handed straight back to it. This
 * panel is what they see on the way (and what a `?vendor=` we couldn't resolve
 * lands on, with the brand named).
 */
function StallHandoff({
  t,
  missingBrand,
  brandsHref,
}: {
  t: (en: string, hi: string) => string;
  missingBrand: string;
  brandsHref: string;
}) {
  return (
    <div>
      <SectionHead
        eyebrow={t("Single Stall", "सिंगल स्टॉल")}
        title={t("Choose your stall", "अपना स्टॉल चुनें")}
        sub={t(
          "Every verified stall lives on the Brands page — browse their photos, menus and ratings there, then hit Book Now on the one you want.",
          "हर वेरिफाइड स्टॉल ब्रांड्स पेज पर है — वहाँ उनकी तस्वीरें, मेन्यू और रेटिंग देखें, फिर जो पसंद आए उस पर बुक नाउ दबाएँ।",
        )}
      />

      {missingBrand && (
        <p className="mb-5 rounded-2xl border border-maroon/30 bg-cream/40 px-4 py-3 text-sm text-ink">
          <span aria-hidden="true" className="mr-1.5 text-maroon">
            ★
          </span>
          {t(
            `We couldn't find "${missingBrand}" in the booking roster right now — pick another stall from the Brands page.`,
            `हमें अभी "${missingBrand}" बुकिंग सूची में नहीं मिला — ब्रांड्स पेज से दूसरा स्टॉल चुनें।`,
          )}
        </p>
      )}

      <div className="rounded-[1.5rem] border border-cream bg-white p-6 text-center shadow-card sm:p-10">
        <p className="text-sm leading-relaxed text-ink-soft">
          {t(
            "Pick a stall to start building your menu.",
            "मेन्यू बनाना शुरू करने के लिए एक स्टॉल चुनें।",
          )}
        </p>
        <a
          href={brandsHref}
          className="btn-sheen mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-maroon px-6 text-sm font-bold text-cream shadow-card transition hover:-translate-y-0.5 hover:shadow-pop active:scale-95"
        >
          {t("Browse all stalls", "सभी स्टॉल देखें")} →
        </a>
      </div>
    </div>
  );
}


/* ─── Step 1 · Build the stall's menu ─────────────────────────────────── */
function StepStallMenu({
  t,
  lang,
  stall,
  activeCat,
  setActiveCat,
  itemsFor,
  toggleItem,
  toggleCourse,
  perPlate,
  pickedCount,
  guests,
  brandsHref,
}: {
  t: (en: string, hi: string) => string;
  lang: Lang;
  stall: StallOption;
  activeCat: number;
  setActiveCat: (n: number) => void;
  itemsFor: (catId: string) => string[];
  toggleItem: (catId: string, itemId: string) => void;
  /** Take or drop a whole set-menu course — the only choice a fixed one offers. */
  toggleCourse: (catId: string) => void;
  perPlate: number;
  pickedCount: number;
  /** Headcount from the event brief — turns every per-plate figure on this step
   *  into the total the guest actually pays. */
  guests: number;
  /** Where a different stall is picked — the Brands page, not a step in here. */
  brandsHref: string;
}) {
  const course = stall.courses[activeCat] ?? stall.courses[0];
  if (!course) return null;
  const picks = itemsFor(course.id);
  // A set-menu course is in the order whole or not at all, so "picked" is one
  // yes/no rather than a running tally of dishes.
  const courseTaken = course.fixed && picks.length > 0;

  return (
    <div>
      <SectionHead
        eyebrow={t("Single Stall", "सिंगल स्टॉल")}
        title={
          stall.allFixed
            ? t("Choose Your Courses", "अपने कोर्स चुनें")
            : t("Build Your Menu", "अपना मेन्यू बनाएं")
        }
        sub={
          stall.allFixed
            ? t(
                `${stall.name} serves set menus — each course comes exactly as listed, at one rate per plate. Pick the courses you want; the dishes within them aren't changed.`,
                `${stall.name} तय मेन्यू परोसते हैं — हर कोर्स ठीक वैसा ही आता है जैसा लिखा है, एक ही प्रति-प्लेट दर पर। जो कोर्स चाहिए वे चुनें; उनके अंदर के व्यंजन बदले नहीं जाते।`,
              )
            : t(
                `Every dish ${stall.name} offers. Take as many or as few as you like — there are no package limits here.`,
                `${stall.name} के सारे व्यंजन। जितने चाहें उतने लें — यहाँ कोई पैकेज सीमा नहीं है।`,
              )
        }
      />

      {/* Whose stall this is — the counterpart to the tiered flow's package
          rail. The guest picked this brand on the Brands page, so its identity
          rides along here, with the way back to change it. */}
      <div className="mb-6 flex items-center gap-3 rounded-[1.5rem] border border-cream bg-white p-3 shadow-card sm:gap-4 sm:p-4">
        <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-cream bg-cream/40 sm:h-16 sm:w-16">
          <Image
            src={stall.image}
            alt={stall.name}
            fill
            sizes="(min-width: 640px) 64px, 56px"
            className="object-cover"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-[10px] font-bold text-maroon">
            {t("YOUR STALL", "आपका स्टॉल")}
          </p>
          <p className="truncate font-sans text-base font-semibold text-ink sm:text-lg">
            {stall.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-ink-soft">
            ★ {stall.rating.toFixed(1)}
            {stall.city ? ` · ${stall.city}` : ""}
            {stall.allFixed ? ` · ${t("set menu", "तय मेन्यू")}` : ""}
          </p>
        </div>
        <a
          href={brandsHref}
          className="shrink-0 rounded-full border border-maroon px-3 py-1.5 text-[11px] font-semibold text-maroon transition hover:bg-maroon hover:text-cream sm:px-4 sm:text-xs"
        >
          {t("Change stall", "स्टॉल बदलें")}
        </a>
      </div>

      {/* Course tabs — only the courses this stall actually publishes. */}
      <div className="mt-5 flex flex-nowrap gap-2 overflow-x-auto no-scrollbar sm:flex-wrap">
        {stall.courses.map((c, i) => {
          const active = i === activeCat;
          const n = itemsFor(c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveCat(i)}
              className={
                "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition " +
                (active
                  ? "border-maroon bg-maroon text-cream"
                  : "border-cream-3 bg-white text-ink hover:bg-cream-2")
              }
            >
              {c.icon} {lang === "hi" ? c.nameHi : c.name}
              {n > 0 && (
                <span
                  className={
                    "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] " +
                    (active ? "bg-cream text-maroon" : "bg-maroon text-cream")
                  }
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {course.live && (
        <p className="mt-4 rounded-xl border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-xs text-ink-soft">
          {t(
            "Live station — cooked fresh in front of your guests.",
            "लाइव स्टेशन — आपके मेहमानों के सामने ताज़ा बनता है।",
          )}
        </p>
      )}

      {/* A set-menu course: one control for the whole spread, and the dishes
          below listed rather than offered. Taking it adds every dish at the
          course's own per-plate rate. */}
      {course.fixed && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cream bg-cream/35 px-4 py-3">
          <span className="min-w-0 text-sm text-ink">
            <span className="font-semibold">
              {t("Set menu", "तय मेन्यू")}
            </span>
            {" — "}
            {t(
              `all ${course.items.length} dishes below, ${money(course.perPlate)} per plate. Nothing to pick.`,
              `नीचे की सभी ${course.items.length} डिश, ${money(course.perPlate)} प्रति प्लेट। कुछ चुनना नहीं है।`,
            )}
          </span>
          <button
            type="button"
            aria-pressed={courseTaken}
            onClick={() => toggleCourse(course.id)}
            className={
              "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition " +
              (courseTaken
                ? "border-maroon bg-cream text-maroon shadow-soft"
                : "border-maroon bg-white text-maroon hover:bg-cream")
            }
          >
            {courseTaken
              ? `✓ ${t("In your order", "आपके ऑर्डर में")}`
              : t("Add this course", "यह कोर्स जोड़ें")}
          </button>
        </div>
      )}

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {course.items.map((it) => {
          const active = picks.includes(it.id);
          const price = dishPrice(it, course);
          const mark = DIET_MARK[it.diet];
          // On a set menu the row states what's coming; only a varied course
          // turns it into a control.
          const body = (
            <>
              <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-cream-2">
                <Image
                  src={it.photo || dummyDishPhoto(it.id)}
                  alt={it.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
                {/* FSSAI veg / non-veg mark, sat on the photo the way a menu
                    card prints it — not floating out in the row. */}
                <span
                  aria-hidden="true"
                  className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-[4px] border-[1.5px] bg-white"
                  style={{ borderColor: mark }}
                >
                  <span
                    className="block h-2 w-2 rounded-full"
                    style={{ backgroundColor: mark }}
                  />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">
                  <span className="sr-only">
                    {it.diet === "veg"
                      ? t("Veg", "शाकाहारी")
                      : t("Non-veg", "मांसाहारी")}
                    {" · "}
                  </span>
                  {it.name}
                </span>
                {/* Only a varied course prices a dish, because only there does
                    the guest buy one: the price is the vendor's own, and the
                    headcount total trails it. A set menu sells the spread at a
                    single rate — dividing that rate by the dish count would
                    print a per-dish figure nobody is billed, and leave the last
                    dish wearing the rounding remainder. The rate belongs to the
                    course, so it is stated once, on the course. */}
                {!course.fixed && (
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    <span className="font-semibold text-ink">
                      {money(price)}
                    </span>{" "}
                    / {t("plate", "प्लेट")}
                    {guests > 0 && (
                      <span className="whitespace-nowrap">
                        {" · "}
                        {money(price * guests)}
                      </span>
                    )}
                  </span>
                )}
              </span>
              <span
                className={
                  "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition " +
                  (active
                    ? "border-maroon/40 bg-cream text-maroon"
                    : "border-cream-3 text-ink-soft")
                }
              >
                {course.fixed
                  ? active
                    ? t("Included", "शामिल")
                    : t("In set menu", "तय मेन्यू में")
                  : active
                    ? t("Added", "जोड़ा")
                    : t("Add", "जोड़ें")}
              </span>
            </>
          );
          const rowClass =
            "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition " +
            (active
              ? "border-maroon/40 bg-cream/35 shadow-soft"
              : "border-cream-3 bg-white" + (course.fixed ? "" : " hover:bg-cream/25"));
          return (
            <li key={it.id}>
              {course.fixed ? (
                <div className={rowClass}>{body}</div>
              ) : (
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleItem(course.id, it.id)}
                  className={rowClass}
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* Running per-plate — the number a Single Stall guest actually shops on. */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cream-3 bg-white px-4 py-3">
        <span className="text-sm text-ink-soft">
          {inr.format(pickedCount)}{" "}
          {stall.allFixed
            ? t("dishes included", "व्यंजन शामिल")
            : t("dishes selected", "व्यंजन चुने गए")}
        </span>
        <span className="text-right">
          <span className="block text-lg font-semibold text-maroon">
            {money(perPlate)}{" "}
            <span className="text-sm font-normal text-ink-soft">
              / {t("plate", "प्लेट")}
            </span>
          </span>
          {/* Per-plate is the number a Single Stall guest shops on; the menu
              total trails it so the headcount arithmetic is still visible. */}
          {guests > 0 && (
            <span className="block text-xs text-ink-soft">
              {money(perPlate * guests)} ·{" "}
              {t(`${inr.format(guests)} guests`, `${inr.format(guests)} मेहमान`)}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

/* ─── Step 2 · Venue & extras ─────────────────────────────────────────────
 * The tiered flow's extras step, on the Single Stall plan: same counters, same
 * vendor rosters, same price bands (StepExtras is shared), with the venue field
 * above it and the optional service package below.
 */
function StepStallDetails({
  t,
  lang,
  guests,
  selectedAddOns,
  toggleAddOn,
  addOnVendorId,
  setAddOnVendor,
  services,
  serviceId,
  setServiceId,
}: {
  t: (en: string, hi: string) => string;
  lang: Lang;
  guests: number;
  selectedAddOns: string[];
  toggleAddOn: (id: string) => void;
  addOnVendorId: (id: string) => string;
  setAddOnVendor: (
    fn: (m: Record<string, string>) => Record<string, string>,
  ) => void;
  services: ReturnType<typeof useServices>;
  serviceId: string;
  setServiceId: (v: string) => void;
}) {
  return (
    <div>
      {/* Occasion / date / city / guests come from the event brief above, and
          the venue is asked for on Review beside the contact details — exactly
          where the tiered flow asks for it. What's left here is the extras.

          The tiered wizard's own extras step, verbatim. Single Stall opens the
          whole catalogue (no tier narrowing) and holds one vendor per counter,
          so the multi-vendor toggle is off and the id list is a single pick. */}
      <StepExtras
        lang={lang}
        t={t}
        guests={guests}
        selectedAddOns={selectedAddOns}
        toggleAddOn={toggleAddOn}
        packageName={t("Single Stall", "सिंगल स्टॉल")}
        multiVendor={false}
        eligibleVendors={vendorListings}
        vendorIdsFor={(id) => [addOnVendorId(id)].filter(Boolean)}
        onVendorToggle={(addOnId, vendorId) =>
          setAddOnVendor((m) => ({ ...m, [addOnId]: vendorId }))
        }
        fullFilter
      />


      {/* Service package — the same tiered Essentials comparison the feast
          wizard makes its own step of (Package A is pitched "For Single Stall &
          Small Functions", so this flow gets the full cards, not a cut-down
          list). Optional here, unlike the tiered feast flow where a
          full-service crew is part of the package promise — hence the skip
          control, and re-tapping the chosen tier also clears it. */}
      {services.length > 0 && (
        <>
          <h3 className="mt-9 text-lg font-semibold text-ink">
            {t("Serving & essentials", "सर्विस और ज़रूरी सामान")}
            <span className="ml-2 text-sm font-normal text-ink-soft">
              {t("optional", "वैकल्पिक")}
            </span>
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            {t(
              "Add serving crew, buffet setup and crockery — or skip it if your venue already covers this.",
              "सर्विस स्टाफ, बुफे सेटअप और क्रॉकरी जोड़ें — या छोड़ दें अगर वेन्यू पहले से दे रहा है।",
            )}
          </p>
          <button
            type="button"
            aria-pressed={serviceId === ""}
            onClick={() => setServiceId("")}
            className={
              "mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition " +
              (serviceId === ""
                ? "border-maroon/40 bg-cream/35 shadow-soft"
                : "border-cream-3 bg-white hover:bg-cream-2")
            }
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">
                {t("No service needed", "कोई सर्विस नहीं चाहिए")}
              </span>
              <span className="mt-0.5 block text-xs text-ink-soft">
                {t("Just the stall", "सिर्फ़ स्टॉल")}
              </span>
            </span>
            <span
              className={
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold " +
                (serviceId === ""
                  ? "border-maroon/40 bg-cream text-maroon"
                  : "border-cream-3 text-ink-soft")
              }
            >
              {serviceId === ""
                ? `✓ ${t("Selected", "चुना गया")}`
                : t("Skip service", "सर्विस छोड़ें")}
            </span>
          </button>
          <div className="mt-4">
            <ServicePackages
              packages={services}
              selectedId={serviceId}
              // Tapping the already-chosen tier clears it back to "no service"
              // — the optionality the feast flow doesn't have.
              onSelect={(id) => setServiceId(id === serviceId ? "" : id)}
              guests={guests}
              embedded
              hideIntro
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Step 4 · Review & confirm ───────────────────────────────────────── */
function StepStallConfirm({
  t,
  stall,
  menuGroups,
  guests,
  perPlate,
  occasion,
  eventDate,
  servingLabel,
  foodPreference,
  city,
  venue,
  selectedAddOns,
  addOnVendorName,
  serviceName,
  serviceTotal,
  setVenue,
  venueFee,
  couponInput,
  setCouponInput,
  appliedCoupon,
  couponError,
  applyCoupon,
  applyCouponCode,
  removeCoupon,
  preDiscount,
  couponDiscount,
  referralDiscount,
  referralPercent,
  referralCode,
  setReferralCode,
  referrerName,
  selfReferral,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerEmail,
  setCustomerEmail,
  knownContact,
  bookingId,
  grandTotal,
  paidAmount,
  payMethod,
  setPayMethod,
  emiCount,
  setEmiCount,
  onPaid,
  confirming,
  confirmError,
  onConfirm,
  onEditMenu,
  onEditExtras,
  brandsHref,
  whatsappHref,
}: {
  t: (en: string, hi: string) => string;
  stall: StallOption | undefined;
  menuGroups: { heading: string; items: string[] }[];
  guests: number;
  perPlate: number;
  occasion: OccasionOption | undefined;
  eventDate: string;
  servingLabel: string;
  foodPreference: string;
  city: City | undefined;
  venue: string;
  selectedAddOns: string[];
  addOnVendorName: (id: string) => string;
  serviceName: string;
  serviceTotal: number;
  setVenue: (v: string) => void;
  venueFee: number;
  couponInput: string;
  setCouponInput: (v: string) => void;
  appliedCoupon: Coupon | null;
  couponError: string;
  applyCoupon: () => void;
  applyCouponCode: (code: string) => void;
  removeCoupon: () => void;
  preDiscount: number;
  couponDiscount: number;
  referralDiscount: number;
  referralPercent: number;
  referralCode: string;
  setReferralCode: (v: string) => void;
  referrerName: string;
  selfReferral: boolean;
  customerName: string;
  setCustomerName: (v: string) => void;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  customerEmail: string;
  setCustomerEmail: (v: string) => void;
  knownContact: { name: string; email: string; phone: string };
  bookingId: string;
  grandTotal: number;
  paidAmount: number;
  payMethod: OrderPaymentMethod;
  setPayMethod: (m: OrderPaymentMethod) => void;
  emiCount: number;
  setEmiCount: (n: number) => void;
  onPaid: (amount: number, ref: string) => void;
  confirming: boolean;
  confirmError: string;
  onConfirm: () => void;
  /** Back to the menu builder (step 1). */
  onEditMenu: () => void;
  /** Back to venue & extras (step 2). */
  onEditExtras: () => void;
  /** The Brands page — where a different stall is chosen. */
  brandsHref: string;
  whatsappHref: string;
}) {
  return (
    // A form, like the tiered wizard's review: the shared checkout panel's
    // pay-later CTA is a submit button, so the confirm handler hangs here.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onConfirm();
      }}
    >
      <SectionHead
        eyebrow={t("Single Stall", "सिंगल स्टॉल")}
        title={t("Review & Confirm", "समीक्षा और पुष्टि")}
      />

      {/* The order at a glance */}
      <div className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-maroon">
              {t("Single Stall", "सिंगल स्टॉल")}
            </p>
            <p className="mt-0.5 text-lg font-semibold text-ink">
              {stall?.name ?? "—"}
            </p>
          </div>
          {/* Changing the stall means picking another brand, so this leaves for
              the Brands page rather than stepping back inside the wizard. */}
          <a
            href={brandsHref}
            className="text-xs font-semibold text-maroon underline underline-offset-4"
          >
            {t("Change", "बदलें")}
          </a>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-ink-soft">{t("Occasion", "अवसर")}</dt>
            <dd className="font-semibold text-ink">
              {occasion ? t(occasion.name, occasion.nameHi) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">{t("Date", "तारीख")}</dt>
            <dd className="font-semibold text-ink">
              {eventDate ? formatEventDate(eventDate) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">{t("Guests", "मेहमान")}</dt>
            <dd className="font-semibold text-ink">{inr.format(guests)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">{t("City", "शहर")}</dt>
            <dd className="font-semibold text-ink">
              {city ? t(city.name, city.nameHi) : "—"}
            </dd>
          </div>
          {venue && (
            <div>
              <dt className="text-ink-soft">{t("Venue", "वेन्यू")}</dt>
              <dd className="font-semibold text-ink">{venue}</dd>
            </div>
          )}
          {servingLabel && (
            <div>
              <dt className="text-ink-soft">{t("Serving", "परोसना")}</dt>
              <dd className="font-semibold text-ink">{servingLabel}</dd>
            </div>
          )}
          {foodPreference && (
            <div>
              <dt className="text-ink-soft">{t("Food", "भोजन")}</dt>
              <dd className="font-semibold text-ink">{foodPreference}</dd>
            </div>
          )}
        </dl>

        <div className="mt-5 border-t border-cream-3 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">
              {t("Your menu", "आपका मेन्यू")}
            </p>
            <button
              type="button"
              onClick={onEditMenu}
              className="text-xs font-semibold text-maroon underline underline-offset-4"
            >
              {t("Edit", "बदलें")}
            </button>
          </div>
          {menuGroups.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">—</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {menuGroups.map((g) => (
                <li key={g.heading}>
                  <span className="font-semibold text-ink">{g.heading}: </span>
                  <span className="text-ink-soft">{g.items.join(", ")}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm">
            <span className="font-semibold text-maroon">{money(perPlate)}</span>
            <span className="text-ink-soft"> / {t("plate", "प्लेट")}</span>
          </p>
        </div>

        {(selectedAddOns.length > 0 || serviceName) && (
          <div className="mt-4 border-t border-cream-3 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">
                {t("Extras", "एक्स्ट्रा")}
              </p>
              <button
                type="button"
                onClick={onEditExtras}
                className="text-xs font-semibold text-maroon underline underline-offset-4"
              >
                {t("Edit", "बदलें")}
              </button>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-ink-soft">
              {addOns
                .filter((a) => selectedAddOns.includes(a.id))
                .map((a) => (
                  <li key={a.id}>
                    {a.name}
                    {addOnVendorName(a.id) ? ` — ${addOnVendorName(a.id)}` : ""}
                  </li>
                ))}
              {serviceName && (
                <li>
                  {serviceName} ({money(serviceTotal)})
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Coupon, contact + venue, referral, the total and how to pay — the
          tiered wizard's own checkout, shared verbatim so settling a Single
          Stall order is the same screen as settling a feast. */}
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

      <div className="mt-6">
        <WhatsAppShareButton
          variant="ghost"
          size="sm"
          label="Share this plan"
          labelHi="यह प्लान शेयर करें"
          message="Planning a Single Stall order on Bhojpatra — one verified stall, our own menu. Take a look:"
          messageHi="Bhojpatra पर सिंगल स्टॉल ऑर्डर प्लान कर रहे हैं — एक वेरिफाइड स्टॉल, अपना मेन्यू। देखिए:"
        />
      </div>
    </form>
  );
}

/* ─── Order summary rail ──────────────────────────────────────────────── */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

function StallSummary({
  t,
  stall,
  guests,
  perPlate,
  subtotal,
  addOnsTotal,
  serviceTotal,
  venueFee,
  discount,
  gst,
  grandTotal,
  pickedCount,
}: {
  t: (en: string, hi: string) => string;
  stall: StallOption | undefined;
  guests: number;
  perPlate: number;
  subtotal: number;
  addOnsTotal: number;
  serviceTotal: number;
  venueFee: number;
  discount: number;
  gst: number;
  grandTotal: number;
  pickedCount: number;
}) {
  return (
    <div className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-maroon">
        {t("Your order", "आपका ऑर्डर")}
      </p>
      <p className="mt-1 font-semibold text-ink">{stall?.name ?? "—"}</p>
      <p className="text-xs text-ink-soft">
        {inr.format(pickedCount)} {t("dishes", "व्यंजन")} ·{" "}
        {inr.format(guests)} {t("guests", "मेहमान")}
      </p>

      {/* Per-plate leads; the total is the smaller sub-line. */}
      <div className="mt-4 rounded-xl bg-cream-2/50 p-3 text-center">
        <p className="text-2xl font-semibold text-maroon">
          {money(perPlate)}
          <span className="text-sm font-normal text-ink-soft">
            {" "}
            / {t("plate", "प्लेट")}
          </span>
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {t("menu price before extras & tax", "एक्स्ट्रा और टैक्स से पहले")}
        </p>
      </div>

      <div className="mt-4 divide-y divide-cream-3 border-t border-cream-3">
        <SummaryRow label={t("Menu subtotal", "मेन्यू उप-योग")} value={money(subtotal)} />
        {addOnsTotal > 0 && (
          <SummaryRow label={t("Extra counters", "अतिरिक्त काउंटर")} value={money(addOnsTotal)} />
        )}
        {serviceTotal > 0 && (
          <SummaryRow label={t("Service", "सर्विस")} value={money(serviceTotal)} />
        )}
        {venueFee > 0 && <SummaryRow label={t("Venue fee", "वेन्यू शुल्क")} value={money(venueFee)} />}
        {discount > 0 && (
          <SummaryRow label={t("Discount", "छूट")} value={`- ${money(discount)}`} />
        )}
        <SummaryRow label={t("GST (18%)", "जीएसटी (18%)")} value={money(gst)} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-cream-3 pt-3">
        <span className="text-sm font-semibold text-ink">
          {t("Grand total", "कुल राशि")}
        </span>
        <span className="text-lg font-semibold text-maroon">
          {money(grandTotal)}
        </span>
      </div>
      {guests > 0 && grandTotal > 0 && (
        <p className="mt-1 text-right text-xs text-ink-soft">
          ≈ {money(perPlateCost(grandTotal, guests))} / {t("plate", "प्लेट")}{" "}
          {t("all-in", "सब मिलाकर")}
        </p>
      )}
    </div>
  );
}
