"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  occasions,
  guestPresets,
  cuisines,
  menuCourses,
  addOns,
  comparisonVendors,
  coupons,
  type Occasion,
  type Cuisine,
  type MenuCourse,
  type Dish,
  type AddOn,
  type ComparisonVendor,
  type Coupon,
} from "@/lib/data";

/* ─── Constants ──────────────────────────────────────────────────────── */
const MIN_GUESTS = 50;
const MAX_GUESTS = 50_000;
const GST_RATE = 0.18;
const ADVANCE_RATE = 0.25;
const DEFAULT_PER_PLATE = comparisonVendors[comparisonVendors.length - 1].perPlate;
const TOTAL_STEPS = 7;

type Lang = "en" | "hi";
type DietFilter = "all" | "veg" | "non-veg";
type SortBy = "price" | "rating";
type PayMethod = "upi" | "qr" | "card";

const inr = new Intl.NumberFormat("en-IN");
const money = (n: number) => `₹${inr.format(Math.round(n))}`;

/* ─── Component ──────────────────────────────────────────────────────── */
export default function BookingWizard() {
  const [lang, setLang] = useState<Lang>("en");
  const t = (en: string, hi: string) => (lang === "hi" ? hi : en);

  const [step, setStep] = useState<number>(1);

  // Step 1
  const [occasionId, setOccasionId] = useState<string>("");
  const [guests, setGuests] = useState<number>(100);
  const [eventDate, setEventDate] = useState<string>("");

  // Step 2
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [diet, setDiet] = useState<DietFilter>("all");
  const [selectedDishes, setSelectedDishes] = useState<string[]>([]);

  // Step 3
  const [vendorId, setVendorId] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortBy>("price");

  // Step 4
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  // Step 6
  const [couponInput, setCouponInput] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string>("");
  const [payMethod, setPayMethod] = useState<PayMethod>("upi");

  /* ─── Derived data ─────────────────────────────────────────────────── */
  const selectedVendor: ComparisonVendor | undefined = comparisonVendors.find(
    (v) => v.id === vendorId,
  );
  const perPlate = selectedVendor ? selectedVendor.perPlate : DEFAULT_PER_PLATE;

  const sortedVendors = useMemo<ComparisonVendor[]>(
    () =>
      [...comparisonVendors].sort((a, b) =>
        sortBy === "price" ? a.perPlate - b.perPlate : b.rating - a.rating,
      ),
    [sortBy],
  );

  const dishVisible = (d: Dish): boolean => {
    const cuisineOk =
      selectedCuisines.length === 0 || selectedCuisines.includes(d.cuisineId);
    const dietOk = diet === "all" || d.diet === diet;
    return cuisineOk && dietOk;
  };

  // Money math
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
  const advance = grandTotal * ADVANCE_RATE;

  // Deterministic booking id derived from state (no random / time).
  const bookingId = `BHJ-${(
    (guests * 7 + Math.round(grandTotal) + selectedDishes.length * 13) %
    90000 +
    10000
  ).toString()}`;

  /* ─── Validation per step ──────────────────────────────────────────── */
  const stepValid = (s: number): boolean => {
    switch (s) {
      case 1:
        return occasionId !== "" && guests >= MIN_GUESTS && guests <= MAX_GUESTS;
      case 2:
        return selectedDishes.length > 0;
      case 3:
        return vendorId !== "";
      case 4:
        return true; // add-ons optional
      case 5:
        return eventDate !== "";
      case 6:
        return true;
      default:
        return true;
    }
  };

  const canNext = stepValid(step);

  /* ─── Handlers ─────────────────────────────────────────────────────── */
  const toggle = (
    arr: string[],
    setArr: (v: string[]) => void,
    id: string,
  ) => {
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  };

  const clampGuests = (raw: number) => {
    if (Number.isNaN(raw)) return;
    setGuests(Math.max(MIN_GUESTS, Math.min(MAX_GUESTS, Math.round(raw))));
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

  // Stand-in for a real PDF export — print the page (browser "Save as PDF").
  const downloadMenu = () => {
    if (typeof window !== "undefined") window.print();
  };

  const buildWhatsAppMessage = (): string => {
    const occ = occasions.find((o) => o.id === occasionId);
    const dishLines = menuCourses
      .map((course) => {
        const picks = course.dishes
          .filter((d) => selectedDishes.includes(d.id))
          .map((d) => d.name);
        return picks.length
          ? `${course.name}: ${picks.join(", ")}`
          : "";
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
      `Date: ${eventDate || "-"}\n` +
      `Guests: ${guests}\n` +
      `Vendor: ${selectedVendor ? selectedVendor.name : "-"}\n` +
      (dishLines ? `\nMenu:\n${dishLines}\n` : "") +
      (addOnLines ? `\nAdd-ons: ${addOnLines}\n` : "") +
      `\nGrand Total: ${money(grandTotal)}\n` +
      `Advance (25%): ${money(advance)}`
    );
  };
  const whatsappHref = `https://wa.me/919918359017?text=${encodeURIComponent(
    buildWhatsAppMessage(),
  )}`;

  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const stepTitles: string[] = [
    t("Occasion & Guests", "अवसर और मेहमान"),
    t("Build the Menu", "मेन्यू बनाएं"),
    t("Compare Vendors", "वेंडर तुलना"),
    t("Add Extras", "एक्स्ट्रा जोड़ें"),
    t("Review & Share", "समीक्षा और शेयर"),
    t("Discount & Payment", "छूट और भुगतान"),
    t("Confirmation", "पुष्टि"),
  ];

  /* ─── Render ───────────────────────────────────────────────────────── */
  const showSummary = step >= 2 && step <= 6;

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:py-16">
      {/* Header + language toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
        <div className="flex gap-2">
          {(["en", "hi"] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={
                "rounded-full px-5 py-2 text-sm font-medium transition " +
                (lang === l
                  ? "bg-maroon text-cream"
                  : "bg-cream-2 text-ink-soft hover:bg-cream-3")
              }
            >
              {l === "en" ? "English" : "हिंदी"}
            </button>
          ))}
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator
        step={step}
        titles={stepTitles}
        onJump={(s) => {
          // only allow jumping to already-completed/current steps
          if (s < step) setStep(s);
        }}
      />

      {/* Layout: content + summary */}
      <div
        className={
          showSummary
            ? "mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]"
            : "mt-8"
        }
      >
        <div>
          {step === 1 && (
            <Step1
              t={t}
              occasionId={occasionId}
              setOccasionId={setOccasionId}
              guests={guests}
              setGuests={setGuests}
              clampGuests={clampGuests}
            />
          )}
          {step === 2 && (
            <Step2
              lang={lang}
              t={t}
              selectedCuisines={selectedCuisines}
              setSelectedCuisines={setSelectedCuisines}
              diet={diet}
              setDiet={setDiet}
              selectedDishes={selectedDishes}
              setSelectedDishes={setSelectedDishes}
              dishVisible={dishVisible}
              toggle={toggle}
            />
          )}
          {step === 3 && (
            <Step3
              t={t}
              vendors={sortedVendors}
              vendorId={vendorId}
              setVendorId={setVendorId}
              guests={guests}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />
          )}
          {step === 4 && (
            <Step4
              lang={lang}
              t={t}
              guests={guests}
              selectedAddOns={selectedAddOns}
              setSelectedAddOns={setSelectedAddOns}
              toggle={toggle}
            />
          )}
          {step === 5 && (
            <Step5
              t={t}
              occasion={occasions.find((o) => o.id === occasionId)}
              eventDate={eventDate}
              setEventDate={setEventDate}
              guests={guests}
              vendor={selectedVendor}
              selectedDishes={selectedDishes}
              selectedAddOns={selectedAddOns}
              grandTotal={grandTotal}
              onEditMenu={() => setStep(2)}
              onEditExtras={() => setStep(4)}
              onDownload={downloadMenu}
              whatsappHref={whatsappHref}
            />
          )}
          {step === 6 && (
            <Step6
              t={t}
              couponInput={couponInput}
              setCouponInput={setCouponInput}
              applyCoupon={applyCoupon}
              appliedCoupon={appliedCoupon}
              couponError={couponError}
              discount={discount}
              payMethod={payMethod}
              setPayMethod={setPayMethod}
              advance={advance}
              onPay={goNext}
            />
          )}
          {step === 7 && (
            <Step7
              t={t}
              bookingId={bookingId}
              occasion={occasions.find((o) => o.id === occasionId)}
              eventDate={eventDate}
              guests={guests}
              vendor={selectedVendor}
              grandTotal={grandTotal}
              advance={advance}
              onDownload={downloadMenu}
              whatsappHref={whatsappHref}
            />
          )}
        </div>

        {showSummary && (
          <SummaryPanel
            t={t}
            perPlate={perPlate}
            usingDefault={!selectedVendor}
            guests={guests}
            subtotal={subtotal}
            addOnsTotal={addOnsTotal}
            discount={discount}
            gst={gst}
            grandTotal={grandTotal}
            advance={advance}
          />
        )}
      </div>

      {/* Nav buttons (hidden on confirmation) */}
      {step < TOTAL_STEPS && (
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
            ← {t("Back", "पीछे")}
          </button>
          {/* Step 6 uses its own Pay button to advance, so hide generic Next there */}
          {step !== 6 && (
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className={
                "rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark " +
                (!canNext ? "cursor-not-allowed opacity-50" : "")
              }
            >
              {t("Next", "आगे")} →
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/* ─── Step indicator ─────────────────────────────────────────────────── */
function StepIndicator({
  step,
  titles,
  onJump,
}: {
  step: number;
  titles: string[];
  onJump: (s: number) => void;
}) {
  return (
    <ol className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-3">
      {titles.map((title, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <li key={title} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onJump(n)}
              disabled={n >= step}
              className={
                "flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition " +
                (n < step ? "cursor-pointer hover:bg-cream-2" : "cursor-default")
              }
            >
              <span
                className={
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition " +
                  (done
                    ? "bg-maroon text-cream"
                    : current
                      ? "bg-maroon text-cream ring-2 ring-maroon ring-offset-2"
                      : "bg-cream-2 text-ink-soft")
                }
              >
                {done ? "✓" : n}
              </span>
              <span
                className={
                  "hidden text-sm font-medium sm:inline " +
                  (current ? "text-ink" : "text-ink-soft")
                }
              >
                {title}
              </span>
            </button>
            {n < titles.length && (
              <span aria-hidden="true" className="h-px w-4 bg-cream-3 sm:w-6" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ─── Reusable heading ───────────────────────────────────────────────── */
function SectionHead({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-6">
      <p className="eyebrow text-sm font-medium text-gold">{label}</p>
      <h1 className="mt-2 text-2xl text-ink sm:text-3xl">{title}</h1>
    </div>
  );
}

/* ─── Step 1 ─────────────────────────────────────────────────────────── */
function Step1({
  t,
  occasionId,
  setOccasionId,
  guests,
  setGuests,
  clampGuests,
}: {
  t: (en: string, hi: string) => string;
  occasionId: string;
  setOccasionId: (v: string) => void;
  guests: number;
  setGuests: (v: number) => void;
  clampGuests: (raw: number) => void;
}) {
  return (
    <div>
      <SectionHead
        label={t("STEP 1", "चरण 1")}
        title={t("Occasion & Guests", "अवसर और मेहमान")}
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {occasions.map((occasion: Occasion) => {
          const selected = occasion.id === occasionId;
          return (
            <button
              key={occasion.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setOccasionId(occasion.id)}
              className={
                "group relative flex flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md " +
                (selected ? "border-maroon ring-2 ring-maroon" : "border-cream-3")
              }
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src={occasion.image}
                  alt={occasion.name}
                  fill
                  sizes="(min-width: 1024px) 200px, (min-width: 640px) 30vw, 45vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {selected && (
                  <span className="absolute right-2 top-2 rounded-full bg-maroon px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cream shadow-sm">
                    {t("Selected", "चयनित")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 px-4 py-3.5">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream-2 text-base"
                >
                  {occasion.icon}
                </span>
                <span className="font-display text-sm font-semibold text-ink">
                  {occasion.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Guests */}
      <div className="mt-10">
        <h3 className="font-display text-lg font-semibold text-ink">
          {t("How many guests?", "कितने मेहमान?")}
        </h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {guestPresets.map((g) => (
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
            {t("Exact count", "सटीक संख्या")} ({MIN_GUESTS}–{inr.format(MAX_GUESTS)})
          </label>
          <input
            type="number"
            min={MIN_GUESTS}
            max={MAX_GUESTS}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            onBlur={(e) => clampGuests(Number(e.target.value))}
            className="w-full rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-maroon focus:bg-white placeholder:text-ink-soft/60"
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Step 2 ─────────────────────────────────────────────────────────── */
function Step2({
  lang,
  t,
  selectedCuisines,
  setSelectedCuisines,
  diet,
  setDiet,
  selectedDishes,
  setSelectedDishes,
  dishVisible,
  toggle,
}: {
  lang: Lang;
  t: (en: string, hi: string) => string;
  selectedCuisines: string[];
  setSelectedCuisines: (v: string[]) => void;
  diet: DietFilter;
  setDiet: (v: DietFilter) => void;
  selectedDishes: string[];
  setSelectedDishes: (v: string[]) => void;
  dishVisible: (d: Dish) => boolean;
  toggle: (arr: string[], setArr: (v: string[]) => void, id: string) => void;
}) {
  const dietOptions: { id: DietFilter; en: string; hi: string }[] = [
    { id: "all", en: "All", hi: "सभी" },
    { id: "veg", en: "Veg", hi: "वेज" },
    { id: "non-veg", en: "Non-Veg", hi: "नॉन-वेज" },
  ];

  return (
    <div>
      <SectionHead
        label={t("STEP 2", "चरण 2")}
        title={t("Build the Menu", "मेन्यू बनाएं")}
      />

      {/* Cuisine multi-select */}
      <h3 className="font-display text-sm font-semibold text-ink-soft">
        {t("Cuisines", "व्यंजन")}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {cuisines.map((c: Cuisine) => {
          const active = selectedCuisines.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(selectedCuisines, setSelectedCuisines, c.id)}
              className={
                "rounded-full px-5 py-2 text-sm font-medium transition " +
                (active
                  ? "bg-maroon text-cream"
                  : "bg-cream-2 text-ink-soft hover:bg-cream-3")
              }
            >
              <span aria-hidden="true">{c.icon}</span>{" "}
              {lang === "hi" ? c.nameHi : c.name}
            </button>
          );
        })}
      </div>

      {/* Diet segmented filter */}
      <div className="mt-6 flex flex-wrap sm:inline-flex rounded-full border border-cream-3 bg-cream-2/40 p-1">
        {dietOptions.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDiet(d.id)}
            className={
              "rounded-full px-5 py-1.5 text-sm font-medium transition " +
              (diet === d.id
                ? "bg-maroon text-cream shadow-sm"
                : "text-ink-soft hover:text-ink")
            }
          >
            {t(d.en, d.hi)}
          </button>
        ))}
      </div>

      {/* Courses */}
      <div className="mt-8 space-y-8">
        {menuCourses.map((course: MenuCourse) => {
          const visible = course.dishes.filter(dishVisible);
          const selectedInCourse = course.dishes.filter((d) =>
            selectedDishes.includes(d.id),
          ).length;
          return (
            <div key={course.id}>
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-lg font-semibold text-ink">
                  {lang === "hi" ? course.nameHi : course.name}
                </h3>
                <span className="text-sm text-ink-soft">
                  {selectedInCourse} {t("selected", "चयनित")} ·{" "}
                  {t("suggest", "सुझाव")} {course.suggested}
                </span>
              </div>
              {visible.length === 0 ? (
                <p className="mt-2 text-sm text-ink-soft/70">
                  {t(
                    "No dishes match your filters.",
                    "आपके फ़िल्टर से कोई व्यंजन मेल नहीं खाता।",
                  )}
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {visible.map((d) => {
                    const active = selectedDishes.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() =>
                          toggle(selectedDishes, setSelectedDishes, d.id)
                        }
                        className={
                          "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition " +
                          (active
                            ? "border-maroon bg-maroon text-cream"
                            : "border-cream-3 bg-white text-ink hover:bg-cream-2")
                        }
                      >
                        <span
                          aria-hidden="true"
                          className={
                            "inline-block h-2.5 w-2.5 rounded-sm border " +
                            (d.diet === "veg"
                              ? "border-green-600"
                              : "border-red-600") +
                            (active ? " bg-cream" : "")
                          }
                        />
                        {d.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Step 3 ─────────────────────────────────────────────────────────── */
function Step3({
  t,
  vendors,
  vendorId,
  setVendorId,
  guests,
  sortBy,
  setSortBy,
}: {
  t: (en: string, hi: string) => string;
  vendors: ComparisonVendor[];
  vendorId: string;
  setVendorId: (v: string) => void;
  guests: number;
  sortBy: SortBy;
  setSortBy: (v: SortBy) => void;
}) {
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <SectionHead
          label={t("STEP 3", "चरण 3")}
          title={t("Compare Vendors", "वेंडर तुलना")}
        />
        <div className="mb-6 flex flex-wrap sm:inline-flex rounded-full border border-cream-3 bg-cream-2/40 p-1">
          {(["price", "rating"] as SortBy[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSortBy(s)}
              className={
                "rounded-full px-4 py-1.5 text-sm font-medium transition " +
                (sortBy === s
                  ? "bg-maroon text-cream shadow-sm"
                  : "text-ink-soft hover:text-ink")
              }
            >
              {s === "price"
                ? t("Sort: Price", "क्रम: कीमत")
                : t("Sort: Rating", "क्रम: रेटिंग")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {vendors.map((v) => {
          const selected = v.id === vendorId;
          const total = v.perPlate * guests;
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setVendorId(v.id)}
              className={
                "group flex flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md " +
                (selected ? "border-maroon ring-2 ring-maroon" : "border-cream-3")
              }
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden">
                <Image
                  src={v.image}
                  alt={v.name}
                  fill
                  sizes="(min-width: 1280px) 280px, (min-width: 640px) 45vw, 90vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute left-2 top-2 rounded-full bg-maroon px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cream shadow-sm">
                  {v.tier}
                </span>
                {selected && (
                  <span className="absolute right-2 top-2 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-maroon shadow-sm">
                    {t("Selected", "चयनित")}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-display text-base font-semibold text-ink">
                  {v.name}
                </h3>
                <p className="mt-0.5 text-sm text-ink-soft">
                  ⭐ {v.rating} · {inr.format(v.reviews)}{" "}
                  {t("reviews", "समीक्षाएं")} · {v.location}
                </p>
                <p className="mt-1 text-sm text-ink-soft">{v.speciality}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {v.badges.map((b) => (
                    <span
                      key={b}
                      className="rounded-full bg-cream-2 px-2.5 py-0.5 text-[11px] font-medium text-ink-soft"
                    >
                      {b}
                    </span>
                  ))}
                </div>
                <div className="mt-auto pt-4">
                  <p className="text-lg font-semibold text-maroon">
                    {money(v.perPlate)}{" "}
                    <span className="text-sm font-normal text-ink-soft">
                      / {t("plate", "प्लेट")}
                    </span>
                  </p>
                  <p className="text-sm text-ink-soft">
                    {t("Total", "कुल")}: {money(total)} ({inr.format(guests)}{" "}
                    {t("guests", "मेहमान")})
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Step 4 ─────────────────────────────────────────────────────────── */
function Step4({
  lang,
  t,
  guests,
  selectedAddOns,
  setSelectedAddOns,
  toggle,
}: {
  lang: Lang;
  t: (en: string, hi: string) => string;
  guests: number;
  selectedAddOns: string[];
  setSelectedAddOns: (v: string[]) => void;
  toggle: (arr: string[], setArr: (v: string[]) => void, id: string) => void;
}) {
  return (
    <div>
      <SectionHead
        label={t("STEP 4", "चरण 4")}
        title={t("Add Extras & Counters", "एक्स्ट्रा और काउंटर")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
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
                <h3 className="font-display text-base font-semibold text-ink">
                  {lang === "hi" ? a.nameHi : a.name}
                </h3>
                <p className="mt-0.5 text-sm text-ink-soft">{a.description}</p>
                <p className="mt-1 text-sm font-semibold text-maroon">
                  {a.perPlate
                    ? `${money(a.price)} / ${t("plate", "प्लेट")}`
                    : money(a.price)}
                  <span className="ml-2 text-xs font-normal text-ink-soft">
                    {t("≈", "≈")} {money(lineTotal)}
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

/* ─── Step 5 ─────────────────────────────────────────────────────────── */
function Step5({
  t,
  occasion,
  eventDate,
  setEventDate,
  guests,
  vendor,
  selectedDishes,
  selectedAddOns,
  grandTotal,
  onEditMenu,
  onEditExtras,
  onDownload,
  whatsappHref,
}: {
  t: (en: string, hi: string) => string;
  occasion: Occasion | undefined;
  eventDate: string;
  setEventDate: (v: string) => void;
  guests: number;
  vendor: ComparisonVendor | undefined;
  selectedDishes: string[];
  selectedAddOns: string[];
  grandTotal: number;
  onEditMenu: () => void;
  onEditExtras: () => void;
  onDownload: () => void;
  whatsappHref: string;
}) {
  return (
    <div>
      <SectionHead
        label={t("STEP 5", "चरण 5")}
        title={t("Review & Share", "समीक्षा और शेयर")}
      />

      <div className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-ink-soft">{t("Occasion", "अवसर")}</dt>
            <dd className="font-semibold text-ink">
              {occasion ? occasion.name : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">{t("Guests", "मेहमान")}</dt>
            <dd className="font-semibold text-ink">{inr.format(guests)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">{t("Vendor", "वेंडर")}</dt>
            <dd className="font-semibold text-ink">
              {vendor ? vendor.name : "—"}
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-ink-soft">{t("Event date", "तारीख")}</dt>
            <dd>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full rounded-lg border border-cream-3 bg-cream-2/40 px-3 py-1.5 text-sm text-ink outline-none transition-colors focus:border-maroon focus:bg-white"
              />
            </dd>
          </div>
        </dl>
      </div>

      {/* Menu summary */}
      <div className="mt-6 rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-ink">
            {t("Selected Menu", "चयनित मेन्यू")}
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
          {menuCourses.map((course) => {
            const picks = course.dishes.filter((d) =>
              selectedDishes.includes(d.id),
            );
            if (picks.length === 0) return null;
            return (
              <div key={course.id}>
                <p className="text-sm font-semibold text-ink-soft">
                  {course.name}
                </p>
                <p className="text-sm text-ink">
                  {picks.map((d) => d.name).join(", ")}
                </p>
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

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onDownload}
          className="rounded-full border border-maroon px-6 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
        >
          ⬇ {t("Download Menu (PDF)", "मेन्यू डाउनलोड (PDF)")}
        </button>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
        >
          {t("Share on WhatsApp", "WhatsApp पर शेयर करें")} · {money(grandTotal)}
        </a>
      </div>
    </div>
  );
}

/* ─── Step 6 ─────────────────────────────────────────────────────────── */
function Step6({
  t,
  couponInput,
  setCouponInput,
  applyCoupon,
  appliedCoupon,
  couponError,
  discount,
  payMethod,
  setPayMethod,
  advance,
  onPay,
}: {
  t: (en: string, hi: string) => string;
  couponInput: string;
  setCouponInput: (v: string) => void;
  applyCoupon: () => void;
  appliedCoupon: Coupon | null;
  couponError: string;
  discount: number;
  payMethod: PayMethod;
  setPayMethod: (v: PayMethod) => void;
  advance: number;
  onPay: () => void;
}) {
  const methods: { id: PayMethod; en: string; hi: string; icon: string }[] = [
    { id: "upi", en: "UPI", hi: "UPI", icon: "📱" },
    { id: "qr", en: "QR Code", hi: "QR कोड", icon: "🔳" },
    { id: "card", en: "Card", hi: "कार्ड", icon: "💳" },
  ];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onPay();
      }}
    >
      <SectionHead
        label={t("STEP 6", "चरण 6")}
        title={t("Discount & Payment", "छूट और भुगतान")}
      />

      {/* Coupon */}
      <div className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
        <h3 className="font-display text-base font-semibold text-ink">
          {t("Apply a coupon", "कूपन लगाएं")}
        </h3>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value)}
            placeholder={t("Enter code", "कोड दर्ज करें")}
            className="min-w-0 flex-1 rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm text-ink uppercase outline-none transition-colors focus:border-maroon focus:bg-white placeholder:text-ink-soft/60"
          />
          <button
            type="button"
            onClick={applyCoupon}
            className="rounded-full border border-maroon px-6 py-2.5 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
          >
            {t("Apply", "लगाएं")}
          </button>
        </div>
        {couponError && (
          <p className="mt-2 text-sm text-maroon">{couponError}</p>
        )}
        {appliedCoupon && discount > 0 && (
          <p className="mt-2 text-sm font-medium text-green-700">
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

      {/* Payment method */}
      <div className="mt-6">
        <h3 className="font-display text-base font-semibold text-ink">
          {t("Payment method", "भुगतान का तरीका")}
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {methods.map((m) => {
            const active = payMethod === m.id;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={active}
                onClick={() => setPayMethod(m.id)}
                className={
                  "flex items-center gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md " +
                  (active ? "border-maroon ring-2 ring-maroon" : "border-cream-3")
                }
              >
                <span aria-hidden="true" className="text-2xl">
                  {m.icon}
                </span>
                <span className="font-display text-sm font-semibold text-ink">
                  {t(m.en, m.hi)}
                </span>
              </button>
            );
          })}
        </div>

        {payMethod === "qr" && (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-cream-3 bg-white p-6 shadow-sm">
            <svg
              viewBox="0 0 100 100"
              className="h-32 w-32 sm:h-40 sm:w-40 text-ink"
              role="img"
              aria-label={t("QR code placeholder", "QR कोड प्लेसहोल्डर")}
            >
              <rect x="0" y="0" width="100" height="100" fill="white" />
              <rect x="6" y="6" width="22" height="22" fill="currentColor" />
              <rect x="12" y="12" width="10" height="10" fill="white" />
              <rect x="72" y="6" width="22" height="22" fill="currentColor" />
              <rect x="78" y="12" width="10" height="10" fill="white" />
              <rect x="6" y="72" width="22" height="22" fill="currentColor" />
              <rect x="12" y="78" width="10" height="10" fill="white" />
              <rect x="40" y="10" width="8" height="8" fill="currentColor" />
              <rect x="52" y="10" width="8" height="8" fill="currentColor" />
              <rect x="40" y="40" width="20" height="20" fill="currentColor" />
              <rect x="46" y="46" width="8" height="8" fill="white" />
              <rect x="72" y="46" width="8" height="8" fill="currentColor" />
              <rect x="84" y="60" width="8" height="8" fill="currentColor" />
              <rect x="40" y="78" width="8" height="8" fill="currentColor" />
              <rect x="60" y="84" width="8" height="8" fill="currentColor" />
            </svg>
            <p className="text-sm text-ink-soft">
              {t("Scan to pay the advance", "एडवांस चुकाने के लिए स्कैन करें")}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-maroon/30 bg-maroon-soft/30 p-5">
        <p className="text-sm text-ink-soft">
          {t("Amount payable now (25% advance)", "अभी देय राशि (25% एडवांस)")}
        </p>
        <p className="mt-1 text-2xl font-semibold text-maroon">
          {money(advance)}
        </p>
      </div>

      <button
        type="submit"
        className="mt-6 w-full rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark sm:w-auto"
      >
        {t("Pay Advance", "एडवांस भुगतान")} {money(advance)}
      </button>
    </form>
  );
}

/* ─── Step 7 ─────────────────────────────────────────────────────────── */
function Step7({
  t,
  bookingId,
  occasion,
  eventDate,
  guests,
  vendor,
  grandTotal,
  advance,
  onDownload,
  whatsappHref,
}: {
  t: (en: string, hi: string) => string;
  bookingId: string;
  occasion: Occasion | undefined;
  eventDate: string;
  guests: number;
  vendor: ComparisonVendor | undefined;
  grandTotal: number;
  advance: number;
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
              {occasion ? occasion.name : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">{t("Date", "तारीख")}</dt>
            <dd className="font-semibold text-ink">{eventDate || "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">{t("Guests", "मेहमान")}</dt>
            <dd className="font-semibold text-ink">{inr.format(guests)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">{t("Vendor", "वेंडर")}</dt>
            <dd className="font-semibold text-ink">
              {vendor ? vendor.name : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">{t("Grand Total", "कुल राशि")}</dt>
            <dd className="font-semibold text-ink">{money(grandTotal)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">{t("Advance Paid", "एडवांस")}</dt>
            <dd className="font-semibold text-green-700">{money(advance)}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-4 text-sm text-ink-soft">
        {t(
          "A confirmation has been sent via WhatsApp and email.",
          "पुष्टि WhatsApp और ईमेल पर भेज दी गई है।",
        )}
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onDownload}
          className="rounded-full border border-maroon px-4 sm:px-6 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
        >
          ⬇ {t("Download Menu", "मेन्यू डाउनलोड")}
        </button>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-maroon px-4 sm:px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
        >
          {t("Share on WhatsApp", "WhatsApp पर शेयर करें")}
        </a>
      </div>
    </div>
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
      <span className={accent ? "font-medium text-green-700" : "text-ink"}>
        {value}
      </span>
    </div>
  );
}

function SummaryPanel({
  t,
  perPlate,
  usingDefault,
  guests,
  subtotal,
  addOnsTotal,
  discount,
  gst,
  grandTotal,
  advance,
}: {
  t: (en: string, hi: string) => string;
  perPlate: number;
  usingDefault: boolean;
  guests: number;
  subtotal: number;
  addOnsTotal: number;
  discount: number;
  gst: number;
  grandTotal: number;
  advance: number;
}) {
  return (
    <aside className="lg:sticky lg:top-32 lg:self-start">
      <div className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
        <h3 className="font-display text-base font-semibold text-ink">
          {t("Order Summary", "ऑर्डर सारांश")}
        </h3>
        <div className="mt-4 space-y-2">
          <SummaryRow
            label={`${t("Per plate", "प्रति प्लेट")}${
              usingDefault ? ` (${t("est.", "अनुमानित")})` : ""
            }`}
            value={money(perPlate)}
          />
          <SummaryRow label={t("Guests", "मेहमान")} value={inr.format(guests)} />
          <div className="my-2 h-px bg-cream-3" />
          <SummaryRow label={t("Subtotal", "सबटोटल")} value={money(subtotal)} />
          <SummaryRow label={t("Add-ons", "एक्स्ट्रा")} value={money(addOnsTotal)} />
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
          <SummaryRow
            label={t("Advance (25%)", "एडवांस (25%)")}
            value={money(advance)}
          />
        </div>
      </div>
    </aside>
  );
}
