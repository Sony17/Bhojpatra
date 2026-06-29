"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useLang } from "@/lib/i18n";
import { addStoredBooking, downloadReceipt } from "@/lib/bookings";
import {
  occasions,
  cities,
  guestPresets,
  packages,
  addOns,
  coupons,
  menuCategories,
  packageCategories,
  packageCategoryItems,
  packageBasePerPlate,
  packageLeadDays,
  type Occasion,
  type PackageTier,
  type AddOn,
  type MenuCategory,
  type CategoryItem,
  type Coupon,
} from "@/lib/data";

/* ─── Constants ──────────────────────────────────────────────────────── */
const MIN_GUESTS = 50;
const MAX_GUESTS = 50_000;
const GST_RATE = 0.18;
const TOTAL_STEPS = 4;
// Large functions (1000+ guests) may split a single segment across vendors.
const MULTI_VENDOR_MIN = 1000;

type Lang = "en" | "hi";
type DietFilter = "all" | "veg" | "non-veg";
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

/* ─── Component ──────────────────────────────────────────────────────── */
export default function BookingWizard() {
  // Language is driven by the shared, site-wide context (Header toggle).
  const { lang, t } = useLang();

  const [step, setStep] = useState<number>(1);

  // Step 1 — Package
  const [packageId, setPackageId] = useState<string>(
    packages.find((p) => p.popular)?.id ?? packages[0].id,
  );

  // Step 2 — Menu (per-category vendor + items)
  const [activeCat, setActiveCat] = useState<number>(0);
  const [categoryVendor, setCategoryVendor] = useState<VendorMap>({});
  const [categoryItems, setCategoryItems] = useState<ItemMap>({});

  // Step 3 — Event details (occasion, date, city, venue, guests, extras).
  // Occasion / date / city / venue are usually pre-chosen in the Hero booking
  // bar and carried over via the URL; here they remain fully editable.
  const [occasionId, setOccasionId] = useState<string>("");
  const [guests, setGuests] = useState<number>(100);
  const [eventDate, setEventDate] = useState<string>("");
  const [cityId, setCityId] = useState<string>("");
  const [venue, setVenue] = useState<string>("");
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

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
    if (occ && occasions.some((o) => o.id === occ)) setOccasionId(occ);
    if (date) setEventDate(date);
    if (city && cities.some((c) => c.id === city)) setCityId(city);
    if (venueParam) setVenue(venueParam);
    const g = Number(guestsParam);
    if (g >= MIN_GUESTS && g <= MAX_GUESTS) setGuests(Math.round(g));
    // A package chosen on the home page's "Select Your Package" section arrives
    // here pre-selected; `step=menu` then drops the guest straight onto vendor
    // selection (Step 2) so they flow into the booking instead of re-picking.
    if (pkg && packages.some((p) => p.id === pkg)) setPackageId(pkg);
    if (stepParam === "menu") setStep(2);
  }, []);

  // When the chosen date can't meet the selected package's lead time, fall back
  // to the first package the date does qualify for (Custom always qualifies).
  useEffect(() => {
    if (packageAvailable(packageId, eventDate)) return;
    const next = packages.find((p) => packageAvailable(p.id, eventDate));
    if (next) setPackageId(next.id);
  }, [eventDate, packageId]);

  // Step 4 — Confirm (coupon only; no advance payment is collected at booking)
  const [couponInput, setCouponInput] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string>("");
  const [confirming, setConfirming] = useState<boolean>(false);
  const [confirmError, setConfirmError] = useState<string>("");
  const [confirmed, setConfirmed] = useState<boolean>(false);

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

  // The course tabs the guest sees on this step are driven by the selected
  // package — each tier opens a different set of segments (Silver is a short
  // fixed menu; Gold adds Chaat / Chinese / South Indian; Platinum curates
  // premium segments). This keeps /book in sync with what the package card on
  // the home page advertises. Order follows `packageCategories`.
  const activeCategories = useMemo<MenuCategory[]>(() => {
    const ids = packageCategories[packageId] ?? menuCategories.map((c) => c.id);
    return ids
      .map((id) => menuCategories.find((c) => c.id === id))
      .filter((c): c is MenuCategory => Boolean(c));
  }, [packageId]);

  // Switching to a package with fewer segments can leave the active tab index
  // past the end of the new list — pull it back into range.
  useEffect(() => {
    if (activeCat > activeCategories.length - 1) setActiveCat(0);
  }, [activeCategories, activeCat]);

  const allowanceFor = (catId: string): number =>
    packageCategoryItems[packageId]?.[catId] ?? 1;

  const vendorsFor = (catId: string): string[] => categoryVendor[catId] ?? [];
  const itemsFor = (catId: string): string[] => categoryItems[catId] ?? [];

  const categoryComplete = (cat: MenuCategory): boolean => {
    return (
      vendorsFor(cat.id).length > 0 &&
      itemsFor(cat.id).length >= allowanceFor(cat.id)
    );
  };

  const completedCount = activeCategories.filter(categoryComplete).length;
  const allComplete = completedCount === activeCategories.length;
  // Courses still missing a vendor or their full item quota — used to tell the
  // guest exactly what's blocking "Continue" and to jump them there.
  const incompleteCategories = activeCategories.filter((c) => !categoryComplete(c));
  const firstIncompleteCat = activeCategories.findIndex((c) => !categoryComplete(c));
  const incompleteCategoryNames = incompleteCategories.map((c) =>
    lang === "hi" ? c.nameHi : c.name,
  );

  const pickVendor = (catId: string, vendorId: string) => {
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
    } else {
      if (cur.length >= allowanceFor(catId)) return; // at the package cap
      setCategoryItems((m) => ({ ...m, [catId]: [...cur, itemId] }));
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

  const perPlate = basePerPlate + categoryAddTotal;
  const subtotal = perPlate * guests;

  const addOnsTotal = useMemo<number>(
    () =>
      addOns
        .filter((a) => selectedAddOns.includes(a.id))
        .reduce((sum, a) => sum + (a.perPlate ? a.price * guests : a.price), 0),
    [selectedAddOns, guests],
  );

  const preDiscount = subtotal + addOnsTotal;
  const discount = appliedCoupon
    ? Math.min((preDiscount * appliedCoupon.percent) / 100, appliedCoupon.cap)
    : 0;
  const taxable = preDiscount - discount;
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
        return allComplete;
      case 3:
        return (
          occasionId !== "" &&
          guests >= paxMin &&
          guests <= paxMax &&
          eventDate !== ""
        );
      default:
        return true;
    }
  };
  const canNext = stepValid(step);

  /* ─── Handlers ─────────────────────────────────────────────────────── */
  const toggle = (arr: string[], setArr: (v: string[]) => void, id: string) => {
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  };

  const clampGuests = (raw: number) => {
    if (Number.isNaN(raw)) return;
    setGuests(Math.max(paxMin, Math.min(paxMax, Math.round(raw))));
  };

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    const found = coupons.find((c) => c.code.toUpperCase() === code);
    if (found) {
      setAppliedCoupon(found);
      setCouponError("");
    } else {
      setAppliedCoupon(null);
      setCouponError(t("Invalid coupon code.", "अमान्य कूपन कोड।"));
    }
  };

  // A plain-text receipt for THIS order — used both for the download action and
  // for the saved booking that appears on the My Bookings page.
  const buildReceipt = (): string => {
    const occ = occasions.find((o) => o.id === occasionId);
    const cityObj = cities.find((c) => c.id === cityId);
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
      .map((a) => `  • ${a.name}`)
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
    if (discount > 0) lines.push(`Discount:    - ${money(discount)}`);
    lines.push(
      `GST (18%):   ${money(gst)}`,
      `Grand Total: ${money(grandTotal)}`,
    );
    return lines.join("\n");
  };

  // Download just this order's receipt (not the whole page).
  const downloadMenu = () => {
    downloadReceipt({ id: bookingId, receipt: buildReceipt() });
  };

  const buildWhatsAppMessage = (): string => {
    const occ = occasions.find((o) => o.id === occasionId);
    const city = cities.find((c) => c.id === cityId);
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
      .map((a) => a.name)
      .join(", ");
    return (
      `Bhojpatra Feast Enquiry (${bookingId})\n` +
      `Occasion: ${occ ? occ.name : "-"}\n` +
      `Package: ${pkg ? `${pkg.name} (${pkg.price}${pkg.unit})` : "-"}\n` +
      `Date: ${eventDate || "-"}\n` +
      `City: ${city ? city.name : "-"}\n` +
      `Venue: ${venue || "-"}\n` +
      `Guests: ${guests}\n` +
      (menuLines ? `\nMenu:\n${menuLines}\n` : "") +
      (addOnLines ? `\nAdd-ons: ${addOnLines}\n` : "") +
      `\nGrand Total: ${money(grandTotal)}`
    );
  };
  const whatsappHref = `https://wa.me/919918359017?text=${encodeURIComponent(
    buildWhatsAppMessage(),
  )}`;

  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  // Menu-step category navigation that spills into wizard steps at the edges.
  const menuPrev = () => {
    if (activeCat > 0) setActiveCat((c) => c - 1);
    else goBack();
  };
  const menuNext = () => {
    if (activeCat < activeCategories.length - 1) setActiveCat((c) => c + 1);
    else if (allComplete) goNext();
  };

  // No advance is collected at booking — confirm the request directly and save
  // it so it shows up on the My Bookings page. Our team reaches out to finalise
  // the menu and payment afterwards.
  const handleConfirm = () => {
    setConfirming(true);
    setConfirmError("");
    const occ = occasions.find((o) => o.id === occasionId);
    const cityObj = cities.find((c) => c.id === cityId);
    // Unique vendor names across every chosen course.
    const vendorNames = Array.from(
      new Set(
        activeCategories.flatMap((cat) => {
          const chosen = categoryVendor[cat.id] ?? [];
          return cat.vendors
            .filter((v) => chosen.includes(v.id))
            .map((v) => v.name);
        }),
      ),
    );
    addStoredBooking({
      id: bookingId,
      occasion: occ?.name ?? "Feast",
      date: formatEventDate(eventDate),
      guests,
      vendor: vendorNames.join(", ") || (selectedPackage?.name ?? "Bhojpatra"),
      city: cityObj?.name ?? "—",
      amount: Math.round(grandTotal),
      paid: 0,
      status: "Confirmed",
      receipt: buildReceipt(),
    });
    setConfirmed(true);
    setConfirming(false);
  };

  /* ─── Render ───────────────────────────────────────────────────────── */
  // Package step (1) and event details (3) show the package list / fields on the
  // left with the order-summary rail on the right; step 4 keeps it until paid.
  // The full-width menu builder (step 2) has no summary rail.
  const showSummary = (step === 1 || step === 3 || (step === 4 && !confirmed));

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:py-16">
      {/* Header */}
      <div>
        <p className="eyebrow text-sm font-medium text-gold">
          {t("BOOK A FEAST", "भोज बुक करें")}
        </p>
        <h1 className="mt-2 text-3xl text-ink sm:text-4xl">
          {t("Plan Your Celebration", "अपना उत्सव प्लान करें")}
        </h1>
        <p className="font-script mt-3 text-xl text-ink-soft">
          {t(
            "a few guided steps to your perfect feast",
            "कुछ आसान चरणों में आपका परफेक्ट भोज",
          )}
        </p>
      </div>

      {/* Event bar — occasion / date / city carried from the Hero booking bar,
          shown up top and editable from any step (mirrors the Step 3 fields). */}
      <EventBar
        lang={lang}
        t={t}
        occasionId={occasionId}
        setOccasionId={setOccasionId}
        eventDate={eventDate}
        setEventDate={setEventDate}
        cityId={cityId}
        setCityId={setCityId}
      />

      {/* Layout */}
      {step === 2 ? (
        // Vendor/menu step — the chosen package is pinned on the left, vendor &
        // item selection on the right. Picking a package on Step 1 lands here
        // automatically, so guests flow straight from package → vendors.
        <div className="mt-8 grid gap-8 lg:grid-cols-[18rem_1fr]">
          <SelectedPackageRail
            lang={lang}
            t={t}
            tier={selectedPackage}
            basePerPlate={basePerPlate}
            onChange={() => setStep(1)}
          />
          <StepMenu
            lang={lang}
            t={t}
            multiVendor={multiVendor}
            maxVendors={packageId === "silver" ? 5 : undefined}
            categories={activeCategories}
            activeCat={activeCat}
            setActiveCat={setActiveCat}
            categoryVendor={categoryVendor}
            pickVendor={pickVendor}
            itemsFor={itemsFor}
            toggleItem={toggleItem}
            allowanceFor={allowanceFor}
            categoryComplete={categoryComplete}
          />
        </div>
      ) : (
      <div
        className={
          showSummary ? "mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]" : "mt-8"
        }
      >
        <div>
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
          {step === 3 && (
            <StepDetails
              lang={lang}
              t={t}
              occasionId={occasionId}
              setOccasionId={setOccasionId}
              guests={guests}
              setGuests={setGuests}
              clampGuests={clampGuests}
              paxMin={paxMin}
              paxMax={paxMax}
              packageName={selectedPackage?.name ?? ""}
              eventDate={eventDate}
              setEventDate={setEventDate}
              cityId={cityId}
              setCityId={setCityId}
              venue={venue}
              setVenue={setVenue}
              selectedAddOns={selectedAddOns}
              setSelectedAddOns={setSelectedAddOns}
              toggle={toggle}
            />
          )}
          {step === 4 && !confirmed && (
            <StepConfirm
              t={t}
              occasion={occasions.find((o) => o.id === occasionId)}
              packageName={selectedPackage?.name ?? ""}
              eventDate={eventDate}
              city={cities.find((c) => c.id === cityId)}
              venue={venue}
              guests={guests}
              categories={activeCategories}
              categoryVendor={categoryVendor}
              itemsFor={itemsFor}
              selectedAddOns={selectedAddOns}
              onEditMenu={() => setStep(2)}
              onEditExtras={() => setStep(3)}
              couponInput={couponInput}
              setCouponInput={setCouponInput}
              applyCoupon={applyCoupon}
              appliedCoupon={appliedCoupon}
              couponError={couponError}
              discount={discount}
              grandTotal={grandTotal}
              confirming={confirming}
              confirmError={confirmError}
              onConfirm={handleConfirm}
              whatsappHref={whatsappHref}
            />
          )}
          {step === 4 && confirmed && (
            <StepDone
              t={t}
              bookingId={bookingId}
              occasion={occasions.find((o) => o.id === occasionId)}
              eventDate={eventDate}
              city={cities.find((c) => c.id === cityId)}
              venue={venue}
              guests={guests}
              grandTotal={grandTotal}
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
            discount={discount}
            gst={gst}
            grandTotal={grandTotal}
          />
        )}
      </div>
      )}

      {/* Nav buttons */}
      {step === 2 ? (
        <div className="mt-10">
          {/* When the menu isn't finished, name the unfinished courses and let
              the guest jump straight to the first one — a silently-disabled
              Continue gives no clue what's left to pick. */}
          {!allComplete && (
            <button
              type="button"
              onClick={() => setActiveCat(firstIncompleteCat)}
              className="mb-4 flex w-full items-start gap-2 rounded-2xl border border-maroon/30 bg-cream/40 px-4 py-3 text-left text-sm text-ink-soft transition hover:bg-cream/60"
            >
              <span aria-hidden="true" className="text-maroon">
                ★
              </span>
              <span>
                {t("Still to finish:", "अभी बाकी:")}{" "}
                <span className="font-semibold text-maroon">
                  {incompleteCategoryNames.join(", ")}
                </span>
                {". "}
                {t(
                  "Tap to jump to the next course and pick the rest.",
                  "अगले कोर्स पर जाने और बाकी चुनने के लिए टैप करें।",
                )}
              </span>
            </button>
          )}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={menuPrev}
              className="rounded-full border border-maroon px-6 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
            >
              ←{" "}
              {activeCat > 0
                ? t("Prev Category", "पिछली श्रेणी")
                : t("Back", "पीछे")}
            </button>
            {activeCat < activeCategories.length - 1 ? (
              <button
                type="button"
                onClick={menuNext}
                className="rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
              >
                {t("Next Category", "अगली श्रेणी")} →
              </button>
            ) : (
              <button
                type="button"
                onClick={menuNext}
                disabled={!allComplete}
                className={
                  "rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark " +
                  (!allComplete ? "cursor-not-allowed opacity-50" : "")
                }
              >
                {t("Continue to Details", "विवरण तक जारी रखें")} →
              </button>
            )}
          </div>
        </div>
      ) : step < TOTAL_STEPS ? (
        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1}
            className={
              "rounded-full border border-maroon px-6 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/5 " +
              (step === 1 ? "pointer-events-none opacity-40" : "")
            }
          >
            ←
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canNext}
            className={
              "rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark " +
              (!canNext ? "cursor-not-allowed opacity-50" : "")
            }
          >
            →
          </button>
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
    <div className="mb-6">
      <h1 className="text-2xl text-ink sm:text-3xl">{title}</h1>
      {sub && <p className="mt-1 text-sm text-ink-soft">{sub}</p>}
    </div>
  );
}

/* ─── Event bar · always-visible occasion / date / city (from the Hero) ──── */
function EventBar({
  lang,
  t,
  occasionId,
  setOccasionId,
  eventDate,
  setEventDate,
  cityId,
  setCityId,
}: {
  lang: Lang;
  t: (en: string, hi: string) => string;
  occasionId: string;
  setOccasionId: (v: string) => void;
  eventDate: string;
  setEventDate: (v: string) => void;
  cityId: string;
  setCityId: (v: string) => void;
}) {
  const fieldClass =
    "mt-1.5 w-full rounded-lg border border-cream-3 bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-maroon";

  return (
    <div className="mt-6 rounded-2xl border border-maroon/30 bg-cream-2/40 p-4 shadow-sm sm:p-5">
      <p className="eyebrow text-xs font-semibold text-gold">
        {t("YOUR EVENT", "आपका इवेंट")}
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-medium text-ink-soft">
            {t("Occasion", "अवसर")}
          </span>
          <select
            value={occasionId}
            onChange={(e) => setOccasionId(e.target.value)}
            className={fieldClass}
          >
            <option value="">{t("Select occasion", "अवसर चुनें")}</option>
            {occasions.map((o) => (
              <option key={o.id} value={o.id}>
                {lang === "hi" ? o.nameHi : o.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-ink-soft">
            {t("Date", "तारीख")}
          </span>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-ink-soft">
            {t("City / Location", "शहर / लोकेशन")}
          </span>
          <select
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            className={fieldClass}
          >
            <option value="">{t("Select city", "शहर चुनें")}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {lang === "hi" ? c.nameHi : c.name}
              </option>
            ))}
          </select>
        </label>
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
  const available = packages.filter((tier) =>
    packageAvailable(tier.id, eventDate),
  );
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
          guest to the Custom single-stall plan (one vendor per course) + add-ons
          rather than leaving the lone Custom card unexplained. */}
      {shortNotice ? (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-maroon/30 bg-cream/40 px-4 py-2.5 text-sm text-ink-soft">
          <span aria-hidden="true" className="text-maroon">
            ★
          </span>
          <span>
            {t(
              "This date is short-notice, so our full packages can't be arranged in time. You can still book with the Custom single-stall plan — one vendor per course, plus any add-ons & live counters.",
              "यह तारीख़ बहुत नज़दीक है, इसलिए हमारे पूरे पैकेज समय पर तैयार नहीं हो पाएंगे। फिर भी आप कस्टम सिंगल-स्टॉल प्लान से बुक कर सकते हैं — हर कोर्स के लिए एक वेंडर, साथ में ऐड-ऑन और लाइव काउंटर।",
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
      {/* Columns track the number of packages the date qualifies for, so a lone
          available tier (e.g. only Custom for a same-day date) fills the column
          instead of stranding an empty half beside it. */}
      <div
        className={
          "grid gap-4 " +
          (available.length === 1
            ? "grid-cols-1"
            : available.length === 2
              ? "sm:grid-cols-2"
              : available.length === 3
                ? "sm:grid-cols-2 lg:grid-cols-3"
                : "sm:grid-cols-2")
        }
      >
        {available.map((tier: PackageTier) => {
          const selected = tier.id === packageId;
          return (
            <button
              key={tier.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setPackageId(tier.id)}
              className={
                "group relative flex flex-col rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md " +
                (selected ? "border-maroon ring-2 ring-maroon" : "border-cream-3")
              }
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-base font-semibold text-ink">
                  {lang === "hi" ? tier.nameHi : tier.name}
                </span>
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
              <ul className="mt-3 flex flex-1 flex-col gap-1.5">
                {tier.features.map((feature, i) => {
                  const label = lang === "hi" ? feature.labelHi : feature.label;
                  if (feature.heading) {
                    return (
                      <li
                        key={i}
                        className="pt-1 text-sm font-semibold text-ink"
                      >
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
              <span
                className={
                  "mt-4 inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-semibold transition " +
                  (selected
                    ? "bg-maroon text-cream"
                    : "bg-cream-2 text-ink-soft group-hover:bg-cream-3")
                }
              >
                {selected ? t("Selected", "चयनित") : t("Select", "चुनें")}
              </span>
            </button>
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
  categoryComplete,
}: {
  lang: Lang;
  t: (en: string, hi: string) => string;
  multiVendor: boolean;
  maxVendors?: number;
  categories: MenuCategory[];
  activeCat: number;
  setActiveCat: (n: number) => void;
  categoryVendor: VendorMap;
  pickVendor: (catId: string, vendorId: string) => void;
  itemsFor: (catId: string) => string[];
  toggleItem: (catId: string, itemId: string) => void;
  allowanceFor: (catId: string) => number;
  categoryComplete: (cat: MenuCategory) => boolean;
}) {
  const [diet, setDiet] = useState<DietFilter>("all");
  const vendorScrollRef = useRef<HTMLDivElement>(null);
  // Guard against a transient out-of-range index right after the package (and
  // thus the category list) changes, before the parent's clamp effect runs.
  const cat = categories[activeCat] ?? categories[0];
  // Silver advertises a fixed set of vendors — cap the carousel accordingly.
  const visibleVendors = maxVendors
    ? cat.vendors.slice(0, maxVendors)
    : cat.vendors;
  const allowance = allowanceFor(cat.id);
  const selectedIds = categoryVendor[cat.id] ?? [];
  const selectedVendors = cat.vendors.filter((v) => selectedIds.includes(v.id));
  const picks = itemsFor(cat.id);

  // Dishes available across the chosen vendor(s) under the active diet filter.
  // When this is below the package quota, the guest can pick every visible dish
  // and still not complete the course — surface that rather than dead-ending.
  const availableForDiet = selectedVendors.reduce(
    (n, v) =>
      n + v.items.filter((it) => diet === "all" || it.diet === diet).length,
    0,
  );
  const dietShortfall =
    selectedVendors.length > 0 &&
    picks.length < allowance &&
    availableForDiet < allowance;

  const dietOptions: { id: DietFilter; en: string; hi: string }[] = [
    { id: "all", en: "All", hi: "सभी" },
    { id: "veg", en: "Veg", hi: "वेज" },
    { id: "non-veg", en: "Non-Veg", hi: "नॉन-वेज" },
  ];

  return (
    <div className="min-w-0">
      <SectionHead title={t("Build Your Menu", "अपना मेन्यू बनाएं")} />

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((c, i) => {
          const active = i === activeCat;
          const complete = categoryComplete(c);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCat(i)}
              className={
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition " +
                (active
                  ? "border-maroon bg-maroon text-cream"
                  : "border-cream-3 bg-white text-ink-soft hover:bg-cream-2")
              }
            >
              <span aria-hidden="true">{c.icon}</span>
              <span className="eyebrow text-xs">
                {(lang === "hi" ? c.nameHi : c.name).toUpperCase()}
              </span>
              {complete && (
                <span aria-hidden="true" className={active ? "text-cream" : "text-maroon"}>
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Step A · Pick a vendor (multiple allowed on Platinum) */}
      <h3 className="mt-7 font-display text-lg font-semibold text-maroon">
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
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={selected}
              onClick={() => pickVendor(cat.id, v.id)}
              className={
                "group relative flex w-56 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md " +
                (selected ? "border-maroon ring-2 ring-maroon" : "border-cream-3")
              }
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <Image
                  src={v.image}
                  alt={v.name}
                  fill
                  sizes="224px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h4 className="font-display text-sm font-semibold text-maroon">
                  {v.name}
                </h4>
                <p className="mt-1 text-xs text-ink-soft">
                  ⭐ {v.rating}{" "}
                  <span className="text-ink-soft/70">
                    ({inr.format(v.reviews)})
                  </span>
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  + {money(v.perPlate)}/{t("plate", "प्लेट")}
                </p>
              </div>
              <span
                className={
                  "block py-2 text-center text-xs font-semibold uppercase tracking-wide transition " +
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
              <h3 className="font-display text-lg font-semibold text-maroon">
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

            {/* Diet filter */}
            <div className="mt-3 inline-flex rounded-full border border-cream-3 bg-white p-1">
              {dietOptions.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDiet(d.id)}
                  className={
                    "rounded-full px-4 py-1 text-xs font-medium transition " +
                    (diet === d.id
                      ? "bg-maroon text-cream shadow-sm"
                      : "text-ink-soft hover:text-ink")
                  }
                >
                  {t(d.en, d.hi)}
                </button>
              ))}
            </div>

            {/* Diet-filter trap — the current filter leaves too few dishes for
                this vendor to meet the package quota. Tell the guest how to
                proceed instead of silently disabling Continue. */}
            {dietShortfall && (
              <p className="mt-3 rounded-xl border border-maroon/30 bg-cream/40 px-4 py-2.5 text-sm text-ink-soft">
                <span aria-hidden="true" className="text-maroon">★ </span>
                {t(
                  `Only ${availableForDiet} ${diet === "veg" ? "Veg" : "Non-Veg"} dish${
                    availableForDiet === 1 ? "" : "es"
                  } here, but this course needs ${allowance}. Switch the filter to “All”${
                    multiVendor ? " or add another vendor" : " or pick another vendor"
                  } to finish this course.`,
                  `यहाँ सिर्फ़ ${availableForDiet} ${
                    diet === "veg" ? "वेज" : "नॉन-वेज"
                  } डिश हैं, पर इस कोर्स के लिए ${allowance} चाहिए। “सभी” फ़िल्टर चुनें${
                    multiVendor ? " या एक और वेंडर जोड़ें" : " या दूसरा वेंडर चुनें"
                  }।`,
                )}
              </p>
            )}

            {/* One menu block per selected vendor — a single block for most
                tiers, several for Platinum's multi-vendor segments. */}
            {selectedVendors.map((vendor) => (
              <div key={vendor.id} className="mt-4">
                <p className="eyebrow text-xs font-semibold text-gold">
                  {vendor.name}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {vendor.items
                    .filter((it) => diet === "all" || it.diet === diet)
                    .map((it: CategoryItem) => {
                      const active = picks.includes(it.id);
                      const atCap = !active && picks.length >= allowance;
                      return (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => toggleItem(cat.id, it.id)}
                          disabled={atCap}
                          className={
                            "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition " +
                            (active
                              ? "border-maroon bg-maroon text-cream"
                              : atCap
                                ? "cursor-not-allowed border-cream-3 bg-white text-ink-soft/40"
                                : "border-cream-3 bg-white text-ink hover:bg-cream-2")
                          }
                        >
                          <span
                            aria-hidden="true"
                            className={
                              "inline-block h-2.5 w-2.5 rounded-sm border " +
                              (it.diet === "veg" ? "border-ink" : "border-maroon") +
                              (active ? " bg-cream" : "")
                            }
                          />
                          {active && "✓ "}
                          {it.name}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
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
  occasionId,
  setOccasionId,
  guests,
  setGuests,
  clampGuests,
  paxMin,
  paxMax,
  packageName,
  eventDate,
  setEventDate,
  cityId,
  setCityId,
  venue,
  setVenue,
  selectedAddOns,
  setSelectedAddOns,
  toggle,
}: {
  lang: Lang;
  t: (en: string, hi: string) => string;
  occasionId: string;
  setOccasionId: (v: string) => void;
  guests: number;
  setGuests: (v: number) => void;
  clampGuests: (raw: number) => void;
  paxMin: number;
  paxMax: number;
  packageName: string;
  eventDate: string;
  setEventDate: (v: string) => void;
  cityId: string;
  setCityId: (v: string) => void;
  venue: string;
  setVenue: (v: string) => void;
  selectedAddOns: string[];
  setSelectedAddOns: (v: string[]) => void;
  toggle: (arr: string[], setArr: (v: string[]) => void, id: string) => void;
}) {
  return (
    <div>
      <SectionHead
        title={t("Event Details", "इवेंट विवरण")}
        sub={t(
          "Confirm the occasion, date and venue, then the headcount and any add-on counters.",
          "अवसर, तारीख और वेन्यू की पुष्टि करें, फिर मेहमानों की संख्या और एक्स्ट्रा काउंटर बताएं।",
        )}
      />

      {/* Occasion */}
      <h3 className="font-display text-lg font-semibold text-ink">
        {t("What's the occasion?", "क्या अवसर है?")}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2.5">
        {occasions.map((occasion: Occasion) => {
          const active = occasion.id === occasionId;
          return (
            <button
              key={occasion.id}
              type="button"
              aria-pressed={active}
              onClick={() => setOccasionId(occasion.id)}
              className={
                "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition " +
                (active
                  ? "bg-maroon text-cream"
                  : "bg-cream-2 text-ink-soft hover:bg-cream-3")
              }
            >
              <span aria-hidden="true">{occasion.icon}</span>
              {t(occasion.name, occasion.nameHi)}
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">
            {t("How many guests?", "कितने मेहमान?")}
          </h3>
          {/* Presets outside the selected package's guest range are hidden so a
              tap can't push the headcount out of bounds (e.g. Silver caps 300). */}
          <div className="mt-4 flex flex-wrap gap-2">
            {guestPresets
              .filter((g) => g >= paxMin && g <= paxMax)
              .map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGuests(g)}
                  className={
                    "rounded-full px-5 py-2 text-sm font-medium transition " +
                    (guests === g
                      ? "bg-maroon text-cream"
                      : "bg-cream-2 text-ink-soft hover:bg-cream-3")
                  }
                >
                  {inr.format(g)}
                </button>
              ))}
          </div>
          <div className="mt-4 max-w-xs">
            <label className="mb-1.5 block text-sm font-medium text-ink-soft">
              {t("Exact count", "सटीक संख्या")} ({inr.format(paxMin)}–
              {inr.format(paxMax)})
            </label>
            <input
              type="number"
              min={paxMin}
              max={paxMax}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              onBlur={(e) => clampGuests(Number(e.target.value))}
              className="w-full rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-maroon focus:bg-white placeholder:text-ink-soft/60"
            />
            {/* Range note + out-of-bounds nudge tied to the active package. */}
            <p className="mt-1.5 text-xs text-ink-soft">
              {guests < paxMin || guests > paxMax
                ? t(
                    `${packageName} serves ${inr.format(paxMin)}–${inr.format(
                      paxMax,
                    )} guests. Adjust the count or switch package.`,
                    `${packageName} ${inr.format(paxMin)}–${inr.format(
                      paxMax,
                    )} मेहमानों के लिए है। संख्या बदलें या पैकेज बदलें।`,
                  )
                : t(
                    `${packageName} package · ${inr.format(paxMin)}–${inr.format(
                      paxMax,
                    )} guests`,
                    `${packageName} पैकेज · ${inr.format(paxMin)}–${inr.format(
                      paxMax,
                    )} मेहमान`,
                  )}
            </p>
          </div>
        </div>

        <div>
          <h3 className="font-display text-lg font-semibold text-ink">
            {t("Event date", "इवेंट की तारीख")}
          </h3>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="mt-4 w-full max-w-xs rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-maroon focus:bg-white"
          />

          <h3 className="mt-6 font-display text-lg font-semibold text-ink">
            {t("City", "शहर")}
          </h3>
          <select
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            className="mt-4 w-full max-w-xs rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-maroon focus:bg-white"
          >
            <option value="">{t("Select a city", "शहर चुनें")}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {lang === "hi" ? c.nameHi : c.name}
              </option>
            ))}
          </select>

          <h3 className="mt-6 font-display text-lg font-semibold text-ink">
            {t("Venue / Address", "वेन्यू / पता")}
          </h3>
          <input
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder={t("Banquet / Hall / Address", "बैंक्वेट / हॉल / पता")}
            className="mt-4 w-full max-w-xs rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-maroon focus:bg-white placeholder:text-ink-soft/60"
          />
        </div>
      </div>

      <h3 className="mt-10 font-display text-lg font-semibold text-ink">
        {t("Add Extras & Counters", "एक्स्ट्रा और काउंटर जोड़ें")}
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {addOns.map((a: AddOn) => {
          const active = selectedAddOns.includes(a.id);
          const lineTotal = a.perPlate ? a.price * guests : a.price;
          return (
            <button
              key={a.id}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(selectedAddOns, setSelectedAddOns, a.id)}
              className={
                "flex items-start gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md " +
                (active ? "border-maroon ring-2 ring-maroon" : "border-cream-3")
              }
            >
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream-2 text-xl"
              >
                {a.icon}
              </span>
              <div className="flex-1">
                <h4 className="font-display text-base font-semibold text-ink">
                  {lang === "hi" ? a.nameHi : a.name}
                </h4>
                <p className="mt-0.5 text-sm text-ink-soft">{a.description}</p>
                <p className="mt-1 text-sm font-semibold text-maroon">
                  {a.perPlate
                    ? `${money(a.price)} / ${t("plate", "प्लेट")}`
                    : money(a.price)}
                  <span className="ml-2 text-xs font-normal text-ink-soft">
                    ≈ {money(lineTotal)}
                  </span>
                </p>
              </div>
              <span
                className={
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-sm " +
                  (active
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
  guests,
  categories,
  categoryVendor,
  itemsFor,
  selectedAddOns,
  onEditMenu,
  onEditExtras,
  couponInput,
  setCouponInput,
  applyCoupon,
  appliedCoupon,
  couponError,
  discount,
  grandTotal,
  confirming,
  confirmError,
  onConfirm,
  whatsappHref,
}: {
  t: (en: string, hi: string) => string;
  occasion: Occasion | undefined;
  packageName: string;
  eventDate: string;
  city: City | undefined;
  venue: string;
  guests: number;
  categories: MenuCategory[];
  categoryVendor: VendorMap;
  itemsFor: (catId: string) => string[];
  selectedAddOns: string[];
  onEditMenu: () => void;
  onEditExtras: () => void;
  couponInput: string;
  setCouponInput: (v: string) => void;
  applyCoupon: () => void;
  appliedCoupon: Coupon | null;
  couponError: string;
  discount: number;
  grandTotal: number;
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
          <p className="mt-2 text-sm text-ink">
            {addOns
              .filter((a) => selectedAddOns.includes(a.id))
              .map((a) => a.name)
              .join(", ")}
          </p>
        )}
      </div>

      {/* Coupon */}
      <div className="mt-6 rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
        <h3 className="font-display text-base font-semibold text-ink">
          {t("Apply a coupon", "कूपन लगाएं")}
        </h3>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value)}
            placeholder={t("Enter code", "कोड दर्ज करें")}
            className="min-w-0 flex-1 rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm uppercase text-ink outline-none transition-colors focus:border-maroon focus:bg-white placeholder:text-ink-soft/60"
          />
          <button
            type="button"
            onClick={applyCoupon}
            className="rounded-full border border-maroon px-6 py-2.5 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
          >
            {t("Apply", "लगाएं")}
          </button>
        </div>
        {couponError && <p className="mt-2 text-sm text-maroon">{couponError}</p>}
        {appliedCoupon && discount > 0 && (
          <p className="mt-2 text-sm font-medium text-maroon">
            {t("Applied", "लागू")} {appliedCoupon.code} — {t("you save", "बचत")}{" "}
            {money(discount)}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {coupons.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setCouponInput(c.code)}
              className="rounded-full bg-cream-2 px-4 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-cream-3"
            >
              {c.code} · {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-maroon/30 bg-maroon-soft/30 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink-soft">{t("Grand total", "कुल राशि")}</p>
          <p className="text-2xl font-semibold text-maroon">
            {money(grandTotal)}
          </p>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          {t(
            "No advance needed to book — our team will reach out to finalise the menu and payment.",
            "बुकिंग के लिए कोई एडवांस नहीं — मेन्यू और भुगतान तय करने के लिए हमारी टीम आपसे संपर्क करेगी।",
          )}
        </p>
      </div>

      {confirmError && (
        <p role="alert" className="mt-4 text-sm font-medium text-maroon">
          {confirmError}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={confirming}
          className="rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark disabled:opacity-60"
        >
          {confirming
            ? t("Confirming…", "पुष्टि हो रही है…")
            : t("Confirm Booking", "बुकिंग पक्की करें")}
        </button>
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
  onDownload,
  whatsappHref,
}: {
  t: (en: string, hi: string) => string;
  bookingId: string;
  occasion: Occasion | undefined;
  eventDate: string;
  city: City | undefined;
  venue: string;
  guests: number;
  grandTotal: number;
  onDownload: () => void;
  whatsappHref: string;
}) {
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
        </dl>
      </div>

      <p className="mt-4 text-sm text-ink-soft">
        {t(
          "A confirmation has been sent via WhatsApp and email. No advance payment is required — our team will reach out to finalise the arrangements.",
          "पुष्टि WhatsApp और ईमेल पर भेज दी गई है। कोई एडवांस भुगतान आवश्यक नहीं — व्यवस्था तय करने के लिए हमारी टीम संपर्क करेगी।",
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
          className="rounded-full bg-maroon px-4 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark sm:px-6"
        >
          {t("Share on WhatsApp", "WhatsApp पर शेयर करें")}
        </a>
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
}: {
  lang: Lang;
  t: (en: string, hi: string) => string;
  tier: PackageTier | undefined;
  basePerPlate: number;
  onChange: () => void;
}) {
  if (!tier) return null;
  return (
    <aside className="lg:sticky lg:top-32 lg:self-start">
      <div className="rounded-2xl border border-maroon bg-white p-5 shadow-sm ring-2 ring-maroon">
        <p className="eyebrow text-xs font-semibold text-gold">
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
  discount,
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
  discount: number;
  gst: number;
  grandTotal: number;
}) {
  return (
    <aside className="lg:sticky lg:top-32 lg:self-start">
      <div className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
        <h3 className="font-display text-base font-semibold text-ink">
          {t("Order Summary", "ऑर्डर सारांश")}
        </h3>
        {packageName && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-cream-2/50 px-3 py-2">
            <span className="text-xs font-medium text-ink-soft">
              {t("Package", "पैकेज")}
            </span>
            <span className="rounded-full bg-gold-soft/50 px-3 py-0.5 text-sm font-semibold text-maroon">
              {packageName}
            </span>
          </div>
        )}
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
          {discount > 0 && (
            <SummaryRow
              label={t("Discount", "छूट")}
              value={`− ${money(discount)}`}
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
          <p className="pt-1 text-xs text-ink-soft">
            {t(
              "No advance required to book.",
              "बुकिंग के लिए कोई एडवांस आवश्यक नहीं।",
            )}
          </p>
        </div>
      </div>
    </aside>
  );
}
