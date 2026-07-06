"use client";

import { useState } from "react";
import Image from "next/image";
import BrandSelect from "@/components/BrandSelect";
import DatePicker from "@/components/DatePicker";
import { ShieldCheck, PriceTag, ClipboardCheck, Headset } from "@/components/icons";
import { occasions, cities } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { useLocations, OTHER_LOCATION_ID } from "@/lib/locations";
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

  // Admin-managed serviceable locations, plus a free-text "Other" fallback so
  // customers outside the listed cities/states can still enter their own.
  const locations = useLocations();
  const locationOptions = [
    ...locations,
    { id: OTHER_LOCATION_ID, name: t("Other", "अन्य"), nameHi: "अन्य" },
  ];

  // Booking selections, carried into /book as query params.
  const [occasionId, setOccasionId] = useState(occasions[0].id);
  const [cityId, setCityId] = useState(cities[0].id);
  const [customCity, setCustomCity] = useState("");
  const [date, setDate] = useState<Date | null>(null);

  const isOtherCity = cityId === OTHER_LOCATION_ID;
  const bookParams = new URLSearchParams({ occasion: occasionId, city: cityId });
  if (isOtherCity && customCity.trim()) bookParams.set("loc", customCity.trim());
  if (date) bookParams.set("date", toYmd(date));
  const bookHref = `/book?${bookParams.toString()}`;

  // Occasion / date / location + CTA — one unified white search bar, per the
  // reference mock: labelled fields separated by hairlines, CTA on the right
  // edge of the same pill.
  const fieldLabel = "block truncate text-xs font-semibold text-ink";
  const divider = (
    <span aria-hidden="true" className="block w-px self-stretch bg-maroon/15" />
  );
  // One horizontal row at every breakpoint — three selectors sharing the pill
  // with the CTA on the right edge. On phones the fields tighten and the CTA
  // shrinks to a magnifier; the full label returns from `sm` up.
  const bookingBar = (
    <div className="flex w-full flex-row items-stretch gap-0 rounded-2xl border border-maroon/20 bg-white p-1.5 shadow-[0_18px_45px_-18px_rgba(185,32,37,0.35)] transition-shadow focus-within:border-maroon/40 sm:p-2.5 lg:rounded-[1.6rem]">
      <div className="min-w-0 flex-1 px-2 py-2 lg:px-4">
        <span className={fieldLabel}>{t("Occasion", "अवसर")}</span>
        <BrandSelect
          className="mt-0.5"
          options={occasions}
          placeholder={t("Select Occasion", "अवसर चुनें")}
          ariaLabel={t("Select Occasion", "अवसर चुनें")}
          icon="chevron"
          buttonClassName="py-0.5 pr-6 text-sm lg:pr-8"
          iconClassName="right-1"
          direction="up"
          align="left"
          defaultId={occasions[0].id}
          onChange={(o) => setOccasionId(o.id)}
        />
      </div>

      {divider}

      <div className="min-w-0 flex-1 px-2 py-2 lg:px-4">
        <span className={fieldLabel}>{t("Date", "तारीख")}</span>
        <DatePicker
          className="mt-0.5"
          placeholder={t("Select Date", "तारीख चुनें")}
          ariaLabel={t("Select Date", "तारीख चुनें")}
          buttonClassName="py-0.5 pr-6 text-sm lg:pr-8"
          iconClassName="right-1"
          direction="up"
          align="center"
          defaultDaysAhead={21}
          onChange={(d) => setDate(d)}
        />
      </div>

      {divider}

      <div className="min-w-0 flex-1 px-2 py-2 lg:px-4">
        <span className={fieldLabel}>{t("Location", "लोकेशन")}</span>
        <BrandSelect
          className="mt-0.5"
          options={locationOptions}
          placeholder={t("Select Location", "लोकेशन चुनें")}
          ariaLabel={t("Select Location", "लोकेशन चुनें")}
          icon="mapPin"
          buttonClassName="py-0.5 pr-6 text-sm lg:pr-8"
          iconClassName="right-1"
          direction="up"
          align="right"
          defaultId={cities[0].id}
          onChange={(c) => setCityId(c.id)}
        />
      </div>

      <a
        href={bookHref}
        aria-label={t("Find Your Perfect Feast", "अपनी परफेक्ट दावत खोजें")}
        className="btn-sheen ml-1 flex shrink-0 items-center justify-center self-center rounded-xl bg-maroon px-3.5 py-3 text-sm font-semibold text-cream shadow-[0_6px_16px_-6px_rgba(185,32,37,0.6)] transition-all duration-300 hover:bg-maroon-dark hover:shadow-[0_10px_24px_-8px_rgba(185,32,37,0.7)] active:scale-[0.97] sm:self-stretch sm:px-5 sm:py-3.5 lg:ml-2 lg:rounded-[1.15rem]"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5 sm:hidden"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <span className="hidden whitespace-nowrap sm:inline">
          {t("Find Your Perfect Feast", "अपनी परफेक्ट दावत खोजें")}
        </span>
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
        <div className="animate-rise delay-3 mt-6 max-w-3xl">
          {bookingBar}
          {isOtherCity && (
            <input
              type="text"
              value={customCity}
              onChange={(e) => setCustomCity(e.target.value)}
              placeholder={t("Type your city or state", "अपना शहर या राज्य लिखें")}
              aria-label={t("Type your city or state", "अपना शहर या राज्य लिखें")}
              className="mt-2 w-full rounded-xl border border-maroon/20 bg-white px-4 py-2.5 text-sm text-ink shadow-sm outline-none placeholder:text-ink/50 focus:border-maroon/50"
            />
          )}
        </div>

        {/* Trust strip keeps to the same column width as the search bar. On
            phones all four sit in one row as compact stacked chips; from `sm`
            they return to the horizontal icon + title/subtitle layout. */}
        <div className="animate-rise delay-4 mt-10 grid max-w-3xl grid-cols-4 gap-x-2 gap-y-5 sm:gap-x-4">
          {trustBadges.map(({ Icon, title, sub }) => (
            <div
              key={title}
              className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cream bg-white shadow-sm sm:h-10 sm:w-10">
                <Icon className="h-4 w-4 text-maroon" />
              </span>
              <span className="min-w-0 [text-shadow:0_0_6px_rgba(255,255,255,0.95),0_0_14px_rgba(255,255,255,0.85),0_0_26px_rgba(255,255,255,0.7)]">
                <span className="block text-[11px] font-bold leading-tight text-ink sm:whitespace-nowrap sm:text-[13px]">
                  {title}
                </span>
                <span className="hidden text-xs text-ink-soft sm:block sm:whitespace-nowrap">
                  {sub}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
