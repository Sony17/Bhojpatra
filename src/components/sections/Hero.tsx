"use client";

import { useState } from "react";
import Image from "next/image";
import BrandSelect from "@/components/BrandSelect";
import DatePicker from "@/components/DatePicker";
import { occasions, cities } from "@/lib/data";
import { useLang } from "@/lib/i18n";

/** Local YYYY-MM-DD (matches the <input type="date"> value on /book). */
function toYmd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default function Hero() {
  const { t } = useLang();

  // The booking bar's selections, carried into /book as query params so the
  // wizard can prefill its editable occasion / date / city fields.
  const [occasionId, setOccasionId] = useState(occasions[0].id);
  const [cityId, setCityId] = useState(cities[0].id);
  const [date, setDate] = useState<Date | null>(null);

  const bookParams = new URLSearchParams({ occasion: occasionId, city: cityId });
  if (date) bookParams.set("date", toYmd(date));
  const bookHref = `/book?${bookParams.toString()}`;

  return (
    <section id="home" className="relative isolate flex min-h-screen flex-col overflow-hidden bg-surface-beige">
      {/* Full-bleed hero artwork — spans the entire section edge-to-edge.
          A slow scale-settle ("Ken Burns") gives the still image life. */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/hero-bg.webp"
          alt="A golden Indian wedding feast laid out in brass serving dishes"
          fill
          priority
          sizes="100vw"
          className="animate-kenburns object-cover object-center"
        />
      </div>

      {/* Readability scrim — keeps the black headline and lede legible over the
          busy feast backdrop. Brand white only, fading out toward the artwork
          on the right; alpha is the sole permitted variation. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-r from-white/90 via-white/60 to-white/10"
      />

      {/* Content */}
      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 pb-16 pt-32 sm:pt-36 lg:pb-20 lg:pt-44">
        <div className="max-w-xl">
          <h1 className="font-display text-[2.75rem] font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            <span className="animate-rise block font-sans sm:whitespace-nowrap">
              {t("Different Specialists.", "अलग-अलग स्पेशलिस्ट।")}
            </span>
            <span className="animate-rise delay-1 font-display block pt-1 text-6xl font-normal text-maroon sm:text-7xl">
              {t("One Celebration.", "एक उत्सव।")}
            </span>
          </h1>

          <p className="animate-rise delay-2 mt-5 max-w-md text-base text-ink-soft sm:text-lg">
            {t(
              "Plan your perfect celebration with the best specialists from your city, state or across India.",
              "अपने शहर, राज्य या पूरे भारत के बेहतरीन स्पेशलिस्ट के साथ अपना परफेक्ट उत्सव प्लान करें।",
            )}
          </p>

          {/* Booking bar — occasion, date, and city + CTA */}
          <div className="animate-rise delay-3 mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-stretch">
            {/* Occasion card */}
            <div className="relative flex flex-1 items-stretch rounded-2xl border border-maroon/40 bg-white shadow-[0_10px_30px_-12px_rgba(185,32,37,0.25)] transition-shadow focus-within:border-maroon focus-within:shadow-[0_14px_36px_-12px_rgba(185,32,37,0.35)]">
              <BrandSelect
                className="flex-1"
                options={occasions}
                placeholder={t("Select Occasion", "अवसर चुनें")}
                ariaLabel={t("Select Occasion", "अवसर चुनें")}
                icon="calendar"
                direction="up"
                defaultId={occasions[0].id}
                onChange={(o) => setOccasionId(o.id)}
              />
            </div>

            {/* Date card — defaults to 21 days from today */}
            <div className="relative flex flex-1 items-stretch rounded-2xl border border-maroon/40 bg-white shadow-[0_10px_30px_-12px_rgba(185,32,37,0.25)] transition-shadow focus-within:border-maroon focus-within:shadow-[0_14px_36px_-12px_rgba(185,32,37,0.35)]">
              <DatePicker
                className="flex-1"
                placeholder={t("Select Date", "तारीख चुनें")}
                ariaLabel={t("Select Date", "तारीख चुनें")}
                direction="up"
                defaultDaysAhead={21}
                onChange={(d) => setDate(d)}
              />
            </div>

            {/* City + CTA card */}
            <div className="relative flex flex-[1.4] items-stretch rounded-2xl border border-maroon/40 bg-white p-1.5 shadow-[0_10px_30px_-12px_rgba(185,32,37,0.25)] transition-shadow focus-within:border-maroon focus-within:shadow-[0_14px_36px_-12px_rgba(185,32,37,0.35)]">
              <BrandSelect
                className="flex-1"
                options={cities}
                placeholder={t("Select Location", "लोकेशन चुनें")}
                ariaLabel={t("Select Location", "लोकेशन चुनें")}
                icon="mapPin"
                buttonClassName="px-3.5 py-2 pr-9"
                iconClassName="right-2.5"
                direction="up"
                defaultId={cities[0].id}
                onChange={(c) => setCityId(c.id)}
              />

              <a
                href={bookHref}
                className="btn-sheen flex shrink-0 items-center rounded-xl bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-[0_6px_16px_-6px_rgba(185,32,37,0.6)] transition-all duration-300 hover:bg-maroon-dark hover:shadow-[0_10px_24px_-8px_rgba(185,32,37,0.7)] active:scale-[0.97] sm:whitespace-nowrap"
              >
                {t("Explore Packages", "पैकेज देखें")}
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
