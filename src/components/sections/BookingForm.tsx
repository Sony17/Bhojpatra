"use client";

import { useState } from "react";
import Link from "next/link";
import { occasions, packages, guestPresets } from "@/lib/data";
import Reveal from "@/components/Reveal";
import { useLang } from "@/lib/i18n";

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
  const [occasion, setOccasion] = useState<string>(occasions[0].id);
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

  return (
    <section id="book" className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
      <Reveal className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl text-ink sm:text-4xl">
          {t("Book Your Celebration", "अपना उत्सव बुक करें")}
        </h2>
        <p className="font-script mt-3 text-xl text-ink-soft sm:text-2xl">
          {t(
            "Fill in the details to confirm your booking.",
            "अपनी बुकिंग पक्की करने के लिए विवरण भरें।",
          )}
        </p>
      </Reveal>

      <Reveal
        variant="scale"
        className="mx-auto mt-10 max-w-3xl rounded-2xl border border-cream-3 bg-white p-6 shadow-sm sm:mt-12 sm:p-8 lg:p-10"
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
                  onChange={(e) => setEventDate(e.target.value)}
                  autoComplete="off"
                  className="rounded-lg border border-cream-3 bg-cream/40 px-3 py-2.5 text-ink placeholder:text-ink-soft/60 outline-none transition-all duration-200 focus:border-maroon focus:bg-white focus:ring-2 focus:ring-maroon/20"
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
                  className="rounded-lg border border-cream-3 bg-cream/40 px-3 py-2.5 text-ink placeholder:text-ink-soft/60 outline-none transition-all duration-200 focus:border-maroon focus:bg-white focus:ring-2 focus:ring-maroon/20"
                />
                <div className="mt-1 flex flex-wrap gap-2">
                  {guestPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setGuests(String(preset))}
                      className={
                        "rounded-full px-3 py-1 text-xs font-medium transition-colors " +
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
                return (
                  <label
                    key={tier.id}
                    className={
                      "relative flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-all duration-200 " +
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
                        {lang === "hi" ? tier.nameHi : tier.name}
                      </span>
                      {tier.popular && (
                        <span className="rounded-full bg-gold-soft/50 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-maroon">
                          {t("Popular", "लोकप्रिय")}
                        </span>
                      )}
                    </div>
                    <span className="text-base font-semibold text-maroon">
                      {tier.price}
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
                    className="rounded-lg border border-cream-3 bg-cream/40 px-3 py-2.5 text-ink placeholder:text-ink-soft/60 outline-none transition-all duration-200 focus:border-maroon focus:bg-white focus:ring-2 focus:ring-maroon/20"
                  />
                </div>
              ))}
            </div>
          </fieldset>

          <div>
            <Link
              href={bookHref}
              className="btn-sheen block w-full rounded-lg bg-maroon px-5 py-3 text-center text-base font-semibold text-cream shadow-sm transition-all duration-300 hover:bg-maroon-dark hover:shadow-lg active:scale-[0.98]"
            >
              {t("Submit Booking Request", "बुकिंग अनुरोध भेजें")}
            </Link>
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
