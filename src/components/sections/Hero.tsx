"use client";

import { useState } from "react";
import Image from "next/image";
import BrandSelect from "@/components/BrandSelect";
import DatePicker from "@/components/DatePicker";
import { ShieldCheck, PriceTag, ClipboardCheck, Headset } from "@/components/icons";
import { occasions, cities } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";

/** Local YYYY-MM-DD (matches the <input type="date"> value on /book). */
function toYmd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default function Hero() {
  const { lang, t } = useLang();
  const { hero } = useHomeContent();

  // Booking selections, carried into /book as query params.
  const [occasionId, setOccasionId] = useState(occasions[0].id);
  const [cityId, setCityId] = useState(cities[0].id);
  const [date, setDate] = useState<Date | null>(null);

  const bookParams = new URLSearchParams({ occasion: occasionId, city: cityId });
  if (date) bookParams.set("date", toYmd(date));
  const bookHref = `/book?${bookParams.toString()}`;

  // Occasion / date / location + CTA — one unified white search bar, per the
  // reference mock: labelled fields separated by hairlines, CTA on the right
  // edge of the same pill.
  const fieldLabel = "block text-xs font-semibold text-ink";
  const divider = (
    <span aria-hidden="true" className="hidden w-px self-stretch bg-maroon/15 lg:block" />
  );
  const bookingBar = (
    <div className="flex w-full flex-col gap-1 rounded-2xl border border-maroon/20 bg-white p-2.5 shadow-[0_18px_45px_-18px_rgba(185,32,37,0.35)] transition-shadow focus-within:border-maroon/40 lg:flex-row lg:items-stretch lg:gap-0 lg:rounded-[1.6rem]">
      <div className="min-w-0 flex-1 px-3 py-2 lg:px-4">
        <span className={fieldLabel}>{t("Occasion", "अवसर")}</span>
        <BrandSelect
          className="mt-0.5"
          options={occasions}
          placeholder={t("Select Occasion", "अवसर चुनें")}
          ariaLabel={t("Select Occasion", "अवसर चुनें")}
          icon="chevron"
          buttonClassName="py-0.5 pr-8 text-sm"
          iconClassName="right-1"
          direction="up"
          defaultId={occasions[0].id}
          onChange={(o) => setOccasionId(o.id)}
        />
      </div>

      {divider}

      <div className="min-w-0 flex-1 px-3 py-2 lg:px-4">
        <span className={fieldLabel}>{t("Date", "तारीख")}</span>
        <DatePicker
          className="mt-0.5"
          placeholder={t("Select Date", "तारीख चुनें")}
          ariaLabel={t("Select Date", "तारीख चुनें")}
          buttonClassName="py-0.5 pr-8 text-sm"
          iconClassName="right-1"
          direction="up"
          defaultDaysAhead={21}
          onChange={(d) => setDate(d)}
        />
      </div>

      {divider}

      <div className="min-w-0 flex-1 px-3 py-2 lg:px-4">
        <span className={fieldLabel}>{t("Location", "लोकेशन")}</span>
        <BrandSelect
          className="mt-0.5"
          options={cities}
          placeholder={t("Select Location", "लोकेशन चुनें")}
          ariaLabel={t("Select Location", "लोकेशन चुनें")}
          icon="mapPin"
          buttonClassName="py-0.5 pr-8 text-sm"
          iconClassName="right-1"
          direction="up"
          defaultId={cities[0].id}
          onChange={(c) => setCityId(c.id)}
        />
      </div>

      <a
        href={bookHref}
        className="btn-sheen flex shrink-0 items-center justify-center rounded-xl bg-maroon px-5 py-3.5 text-sm font-semibold text-cream shadow-[0_6px_16px_-6px_rgba(185,32,37,0.6)] transition-all duration-300 hover:bg-maroon-dark hover:shadow-[0_10px_24px_-8px_rgba(185,32,37,0.7)] active:scale-[0.97] lg:ml-2 lg:whitespace-nowrap lg:rounded-[1.15rem]"
      >
        {t("Find Your Perfect Feast", "अपनी परफेक्ट दावत खोजें")}
      </a>
    </div>
  );

  // Trust strip under the booking bar — mirrors the reference mock.
  const trustBadges = [
    {
      Icon: ShieldCheck,
      title: t("Verified Partners", "वेरिफाइड पार्टनर्स"),
      sub: t("Quality you can trust", "क्वालिटी जिस पर भरोसा हो"),
    },
    {
      Icon: PriceTag,
      title: t("Transparent Pricing", "पारदर्शी कीमतें"),
      sub: t("No hidden surprises", "कोई छिपा खर्च नहीं"),
    },
    {
      Icon: ClipboardCheck,
      title: t("Easy Booking", "आसान बुकिंग"),
      sub: t("In just a few clicks", "बस कुछ क्लिक में"),
    },
    {
      Icon: Headset,
      title: t("Dedicated Support", "समर्पित सपोर्ट"),
      sub: t("We're here for you", "हम आपके साथ हैं"),
    },
  ];

  return (
    <section id="home" className="relative isolate flex min-h-screen flex-col overflow-hidden bg-surface-beige">
      {/* Full-bleed hero artwork — a single static backdrop the admin can swap
          via the home-content store. */}
      <div className="absolute inset-0 -z-10">
        <Image
          src={hero.background}
          alt="A golden Indian wedding feast laid out in brass serving dishes"
          fill
          priority
          sizes="100vw"
          className="animate-kenburns object-cover object-center"
          unoptimized={isUnoptimized(hero.background)}
        />
      </div>

      {/* Readability scrim. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-r from-white/95 via-white/85 via-[62%] to-white/15"
      />

      {/* Content — left-aligned headline, lede, and booking bar. */}
      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 pb-16 pt-32 sm:pt-36 lg:pb-20 lg:pt-44">
        <div className="max-w-xl">
          <h1 className="font-display text-3xl font-bold leading-[1.15] tracking-tight text-ink sm:text-4xl lg:text-5xl">
            <span className="animate-rise block font-sans text-xl sm:text-2xl lg:text-3xl">
              {lang === "hi" ? hero.headlineTopHi : hero.headlineTop}
            </span>
            <span className="animate-rise delay-1 font-display block pt-1 text-3xl font-normal text-maroon sm:text-4xl lg:text-5xl">
              {lang === "hi" ? hero.headlineBottomHi : hero.headlineBottom}
            </span>
          </h1>

          <p className="animate-rise delay-2 mt-5 max-w-md text-base text-ink-soft sm:text-lg">
            {lang === "hi" ? hero.ledeHi : hero.lede}
          </p>

        </div>

        {/* Search bar — slightly wider than the headline column. */}
        <div className="animate-rise delay-3 mt-6 max-w-3xl">{bookingBar}</div>

        {/* Trust strip keeps to the same column width as the search bar. */}
        <div className="animate-rise delay-4 mt-10 grid max-w-3xl grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {trustBadges.map(({ Icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cream bg-white shadow-sm">
                <Icon className="h-4 w-4 text-maroon" />
              </span>
              <span className="min-w-0 [text-shadow:0_0_6px_rgba(255,255,255,0.95),0_0_14px_rgba(255,255,255,0.85),0_0_26px_rgba(255,255,255,0.7)]">
                <span className="block whitespace-nowrap text-[13px] font-bold text-ink">
                  {title}
                </span>
                <span className="block whitespace-nowrap text-xs text-ink-soft">{sub}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
