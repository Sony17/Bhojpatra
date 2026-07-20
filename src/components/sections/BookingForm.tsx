"use client";

import { useState } from "react";
import { occasions, packages, guestPresets } from "@/lib/data";
import Reveal from "@/components/Reveal";
import { useLang } from "@/lib/i18n";
import { useHomeContent } from "@/lib/homeContent";
import { useOccasions, occasionLeadFor } from "@/lib/occasions";
import { Button, controlClass } from "@/components/ui";

/** Soonest bookable `YYYY-MM-DD` given a lead time in days — the date input's
 *  `min`. Computed at render (client component), matching the booking wizard. */
function isoAfterDays(lead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(0, lead));
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Contact + event detail fields rendered as a two-column grid. */
const contactFields = [
  {
    id: "fullName",
    label: "Full Name",
    labelHi: "पूरा नाम",
    type: "text",
    placeholder: "Enter your full name",
    placeholderHi: "अपना पूरा नाम दर्ज करें",
    autoComplete: "name",
  },
  {
    id: "mobile",
    label: "Mobile Number",
    labelHi: "मोबाइल नंबर",
    type: "tel",
    placeholder: "10-digit mobile number",
    placeholderHi: "10 अंकों का मोबाइल नंबर",
    autoComplete: "tel",
  },
  {
    id: "email",
    label: "Email Address",
    labelHi: "ईमेल पता",
    type: "email",
    placeholder: "you@example.com",
    placeholderHi: "you@example.com",
    autoComplete: "email",
  },
  {
    id: "venue",
    label: "Venue",
    labelHi: "वेन्यू",
    type: "text",
    placeholder: "City / Banquet / Address",
    placeholderHi: "शहर / बैंक्वेट / पता",
    autoComplete: "off",
  },
];

export default function BookingForm() {
  const { lang, t } = useLang();
  const { booking, packages: homePackages } = useHomeContent();
  // Admin-managed occasions carry a per-occasion lead time; the pills below stay
  // on the static seed list (they need icons), but the earliest bookable date
  // honours the admin-configured notice for the chosen occasion.
  const occasionList = useOccasions();
  const [occasion, setOccasion] = useState<string>(occasions[0].id);
  const minDate = isoAfterDays(1);
  const [guests, setGuests] = useState<string>(String(guestPresets[2]));
  const [selectedPackage, setSelectedPackage] = useState<string>(
    packages.find((p) => p.popular)?.id ?? packages[0].id,
  );
  const [eventDate, setEventDate] = useState<string>("");

  // Submitting the form carries the chosen package, occasion, date and headcount
  // into the full booking flow and lands on vendor selection (Step 2 of /book).
  const bookParams = new URLSearchParams({
    package: selectedPackage,
    occasion,
    guests,
    step: "menu",
  });
  if (eventDate) bookParams.set("date", eventDate);
  const bookHref = `/book?${bookParams.toString()}`;

  // Admin-editable name / price overrides, keyed by package id.
  const tierMeta = (id: string) => homePackages.tiers.find((x) => x.id === id);

  return (
    <section id="book" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
      <Reveal className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl text-ink sm:text-4xl">
          {lang === "hi" ? booking.headingHi : booking.heading}
        </h2>
        <p className="font-script mt-3 text-xl text-ink-soft sm:text-2xl">
          {lang === "hi" ? booking.subtitleHi : booking.subtitle}
        </p>
      </Reveal>

      <Reveal
        variant="scale"
        className="mx-auto mt-10 max-w-3xl rounded-card border border-cream-3 bg-white p-6 shadow-card sm:mt-12 sm:p-8 lg:p-10"
      >
        <form className="flex flex-col gap-8">
          {/* Occasion & Guests */}
          <fieldset className="flex min-w-0 flex-col gap-5">
            <legend className="eyebrow text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {t("Occasion & Guests", "अवसर और मेहमान")}
            </legend>

            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="occasion" className="text-sm text-ink-soft">
                {t("Occasion", "अवसर")}
              </label>
              <div className="flex min-w-0 max-w-full flex-nowrap gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:pb-0">
                {occasions.map((o) => {
                  const active = occasion === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setOccasion(o.id)}
                      aria-pressed={active}
                      className={
                        "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors " +
                        (active
                          ? "bg-maroon text-cream"
                          : "bg-cream-2 text-ink-soft hover:bg-cream-3")
                      }
                    >
                      <span aria-hidden="true">{o.icon}</span>
                      {lang === "hi" ? o.nameHi : o.name}
                    </button>
                  );
                })}
              </div>
              {/* Selected occasion submitted via a hidden field. */}
              <input type="hidden" name="occasion" value={occasion} />
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="eventDate" className="text-sm text-ink-soft">
                  {t("Event Date", "इवेंट की तारीख")}
                </label>
                <input
                  id="eventDate"
                  name="eventDate"
                  type="date"
                  value={eventDate}
                  min={minDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  autoComplete="off"
                  className={controlClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="guestCount" className="text-sm text-ink-soft">
                  {t("Guest Count", "मेहमानों की संख्या")}
                </label>
                <input
                  id="guestCount"
                  name="guestCount"
                  type="number"
                  min={1}
                  max={50000}
                  value={guests}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setGuests(
                      e.target.value === "" || Number.isNaN(n)
                        ? e.target.value
                        : String(Math.min(50000, Math.max(0, n))),
                    );
                  }}
                  placeholder={t("e.g. 250", "जैसे 250")}
                  autoComplete="off"
                  className={controlClass}
                />
                <div className="no-scrollbar mt-1 flex flex-nowrap gap-2 overflow-x-auto md:flex-wrap md:overflow-visible">
                  {guestPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setGuests(String(preset))}
                      className={
                        "shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors " +
                        (guests === String(preset)
                          ? "bg-maroon text-cream"
                          : "bg-cream-2 text-ink-soft hover:bg-cream-3")
                      }
                    >
                      {preset.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </fieldset>

          {/* Package selection — one of the three tiers. */}
          <fieldset className="flex flex-col gap-3">
            <legend className="eyebrow text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {t("Select Package", "पैकेज चुनें")}
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {packages.map((tier) => {
                const active = selectedPackage === tier.id;
                const meta = tierMeta(tier.id);
                const name =
                  lang === "hi"
                    ? meta?.nameHi ?? tier.nameHi
                    : meta?.name ?? tier.name;
                const price = meta?.price ?? tier.price;
                return (
                  <label
                    key={tier.id}
                    className={
                      "relative flex cursor-pointer flex-col gap-1 rounded-card border p-4 transition-all duration-200 " +
                      (active
                        ? "border-maroon bg-maroon/[0.04] ring-2 ring-maroon/20"
                        : "border-cream-3 bg-cream/40 hover:border-maroon/40")
                    }
                  >
                    <input
                      type="radio"
                      name="package"
                      value={tier.id}
                      checked={active}
                      onChange={() => setSelectedPackage(tier.id)}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">
                        {name}
                      </span>
                      {tier.popular && (
                        <span className="rounded-full bg-gold-soft/50 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-maroon">
                          {t("Popular", "लोकप्रिय")}
                        </span>
                      )}
                    </div>
                    <span className="text-base font-semibold text-maroon">
                      {price}
                      <span className="text-xs font-normal text-ink-soft">
                        {" "}
                        {lang === "hi" ? tier.unitHi : tier.unit}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Contact details */}
          <fieldset className="flex flex-col gap-5">
            <legend className="eyebrow text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {t("Your Details", "आपका विवरण")}
            </legend>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              {contactFields.map((field) => (
                <div key={field.id} className="flex flex-col gap-1.5">
                  <label htmlFor={field.id} className="text-sm text-ink-soft">
                    {lang === "hi" ? field.labelHi : field.label}
                  </label>
                  <input
                    id={field.id}
                    name={field.id}
                    type={field.type}
                    placeholder={
                      (lang === "hi" ? field.placeholderHi : field.placeholder) ||
                      undefined
                    }
                    autoComplete={field.autoComplete}
                    className={controlClass}
                  />
                </div>
              ))}
            </div>
          </fieldset>

          <div>
            <Button href={bookHref} size="lg" fullWidth>
              {t("Submit Booking Request", "बुकिंग अनुरोध भेजें")}
            </Button>
            <p className="mt-3 text-center text-xs text-ink-soft">
              {t(
                "Your data is safe with us. We will get back to you shortly to confirm your booking.",
                "आपका डेटा हमारे पास सुरक्षित है। हम आपकी बुकिंग पक्की करने के लिए जल्द ही संपर्क करेंगे।",
              )}
            </p>
          </div>
        </form>
      </Reveal>
    </section>
  );
}
