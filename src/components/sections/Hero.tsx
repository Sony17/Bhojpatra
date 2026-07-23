"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import BrandSelect from "@/components/BrandSelect";
import DatePicker from "@/components/DatePicker";
import { ShieldCheck, PriceTag, ClipboardCheck, Headset } from "@/components/icons";
import type { ComponentType } from "react";
import { occasions, cities } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { useLocations, OTHER_LOCATION_ID } from "@/lib/locations";
import {
  LOCATION_CHANGED_EVENT,
  useDetectedLocation,
  type StoredLocation,
} from "@/lib/detectedLocation";
import {
  useOccasions,
  occasionLeadFor,
  OTHER_OCCASION_ID,
} from "@/lib/occasions";
import {
  useHomeContent,
  isUnoptimized,
  resolveHeroBackground,
  collectHeroBackgroundUrls,
  type HomeTrustBadgeIcon,
} from "@/lib/homeContent";

const TRUST_ICON: Record<
  HomeTrustBadgeIcon,
  ComponentType<{ className?: string }>
> = {
  shield: ShieldCheck,
  price: PriceTag,
  clipboard: ClipboardCheck,
  headset: Headset,
};

/** Local YYYY-MM-DD (matches the <input type="date"> value on /book). */
function toYmd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default function Hero() {
  const { lang, t } = useLang();
  const { hero, occasions: homeOccasions } = useHomeContent();

  const occasionList = useOccasions();
  const occasionOptions = [
    ...occasionList,
    { id: OTHER_OCCASION_ID, name: t("Other", "अन्य"), nameHi: "अन्य" },
  ];
  const locations = useLocations();

  // Location is chosen from the header bar now — the hero just consumes the
  // detected/selected city to pre-fill the Book / Find-caterers links.
  const { match: detectedMatch } = useDetectedLocation(locations);

  const [occasionId, setOccasionId] = useState(occasions[0].id);
  const [customOccasion, setCustomOccasion] = useState("");
  const [cityId, setCityId] = useState(cities[0].id);
  const [customCity, setCustomCity] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  // Seed from IP/GPS at most once. After the visitor picks a city (or edits
  // "Other"), never let a late detection response overwrite them.
  const locationTouched = useRef(false);
  const seededFromDetection = useRef(false);

  useEffect(() => {
    if (
      !detectedMatch ||
      locationTouched.current ||
      seededFromDetection.current
    ) {
      return;
    }
    seededFromDetection.current = true;
    setCityId(detectedMatch.locationId);
    if (detectedMatch.customCity) {
      setCustomCity(detectedMatch.customCity);
    }
  }, [detectedMatch]);

  // Keep the hero location in sync when the header picker changes city.
  useEffect(() => {
    function onChanged(e: Event) {
      const entry = (e as CustomEvent<StoredLocation>).detail;
      if (!entry?.cityId) return;
      locationTouched.current = true;
      seededFromDetection.current = true;
      setCityId(entry.cityId);
      setCustomCity(entry.customCity ?? "");
    }
    window.addEventListener(LOCATION_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(LOCATION_CHANGED_EVENT, onChanged);
  }, []);

  const occasionLead = occasionLeadFor(occasionId, occasionList);

  const isOtherOccasion = occasionId === OTHER_OCCASION_ID;
  const isOtherCity = cityId === OTHER_LOCATION_ID;

  const activeBackground = resolveHeroBackground(
    hero,
    occasionId,
    cityId,
    homeOccasions.items,
  );
  const heroBackgrounds = useMemo(
    () => collectHeroBackgroundUrls({ hero, occasions: homeOccasions }),
    [hero, homeOccasions],
  );

  const bookParams = new URLSearchParams({ occasion: occasionId, city: cityId });
  if (isOtherOccasion && customOccasion.trim())
    bookParams.set("occName", customOccasion.trim());
  if (isOtherCity && customCity.trim()) bookParams.set("loc", customCity.trim());
  if (date) bookParams.set("date", toYmd(date));
  const bookHref = `/book?${bookParams.toString()}`;

  // Browse path — same location, into the catalog (Zomato-style discover → convert).
  const cityDisplayName = isOtherCity
    ? customCity.trim()
    : (locations.find((l) => l.id === cityId)?.name ?? "");
  const vendorsParams = new URLSearchParams();
  if (cityDisplayName) vendorsParams.set("city", cityDisplayName);
  const vendorsHref = vendorsParams.size
    ? `/vendors?${vendorsParams.toString()}`
    : "/vendors";

  const ctaLabel = lang === "hi" ? hero.ctaHi : hero.cta;
  const browseLabel = t("Explore more", "और देखें");

  const fieldLabel =
    "block truncate text-[10px] font-bold uppercase tracking-[0.16em] text-ink/65";
  const divider = (
    <span
      aria-hidden="true"
      className="hidden w-px self-stretch bg-maroon/10 sm:block"
    />
  );
  const slotInputClass =
    "mt-0.5 w-full bg-transparent py-0.5 pr-1 text-sm font-semibold text-ink outline-none placeholder:text-ink/55";

  const bookingBar = (
    <div className="grid w-full grid-cols-2 overflow-visible rounded-[1.5rem] border border-white/40 bg-white/95 p-1.5 shadow-[0_24px_64px_-28px_rgba(0,0,0,0.75)] backdrop-blur-2xl transition-shadow focus-within:border-cream sm:flex sm:items-stretch sm:rounded-[1.25rem] sm:p-1">
      <div className="min-w-0 flex-1 border-b border-r border-maroon/10 px-3 py-2.5 sm:border-b-0 sm:border-r-0 sm:px-3 sm:py-2.5 lg:px-4">
        <span className={fieldLabel}>{t("Occasion", "अवसर")}</span>
        {isOtherOccasion ? (
          <div className="relative mt-1 flex min-w-0 items-center">
            <input
              type="text"
              value={customOccasion}
              onChange={(e) => setCustomOccasion(e.target.value)}
              placeholder={t("Type your occasion", "अपना अवसर लिखें")}
              aria-label={t("Type your occasion", "अपना अवसर लिखें")}
              className={`${slotInputClass} mt-0 pr-7`}
              autoFocus={!isOtherCity || Boolean(customCity)}
            />
            <BrandSelect
              className="absolute inset-y-0 right-0 w-7"
              options={occasionOptions}
              placeholder={t("Change occasion", "अवसर बदलें")}
              ariaLabel={t("Change occasion", "अवसर बदलें")}
              icon="chevron"
              buttonClassName="h-full w-full p-0 text-[0px] leading-none"
              iconClassName="right-0 h-3.5 w-3.5"
              direction="up"
              align="left"
              valueId={occasionId}
              displayLabel={"\u00A0"}
              onChange={(o) => {
                setOccasionId(o.id);
                if (o.id !== OTHER_OCCASION_ID) setCustomOccasion("");
              }}
            />
          </div>
        ) : (
          <BrandSelect
            className="mt-1"
            options={occasionOptions}
            placeholder={t("Select Occasion", "अवसर चुनें")}
            ariaLabel={t("Select Occasion", "अवसर चुनें")}
            icon="chevron"
            buttonClassName="py-0.5 pr-5 text-sm font-medium lg:pr-8"
            iconClassName="right-1"
            direction="up"
            align="left"
            defaultId={occasions[0].id}
            valueId={occasionId}
            onChange={(o) => {
              setOccasionId(o.id);
              if (o.id !== OTHER_OCCASION_ID) setCustomOccasion("");
            }}
          />
        )}
      </div>

      {divider}

      <div className="min-w-0 flex-1 border-b border-maroon/10 px-3 py-2.5 sm:border-b-0 sm:px-3 sm:py-2.5 lg:px-4">
        <span className={fieldLabel}>{t("Date", "तारीख")}</span>
        <DatePicker
          className="mt-1"
          placeholder={t("Select Date", "तारीख चुनें")}
          ariaLabel={t("Select Date", "तारीख चुनें")}
          buttonClassName="py-0.5 pr-5 text-sm font-medium lg:pr-8"
          iconClassName="right-1"
          direction="up"
          align="center"
          defaultDaysAhead={occasionLead}
          minDaysAhead={1}
          onChange={(d) => setDate(d)}
        />
      </div>

      <div className="relative z-0 col-span-2 m-1 grid shrink-0 grid-cols-2 gap-2 sm:m-0 sm:ml-1 sm:flex sm:self-stretch sm:items-stretch">
        <a
          href={bookHref}
          aria-label={ctaLabel}
          className="btn-sheen flex flex-1 items-center justify-center rounded-xl bg-maroon px-3 py-2.5 text-[12px] font-bold tracking-wide text-white shadow-brand transition-all duration-200 hover:shadow-pop active:scale-[0.97] sm:min-w-[7.5rem] sm:rounded-[0.9rem] sm:px-5 sm:text-[13px]"
        >
          <span className="whitespace-nowrap">{ctaLabel}</span>
        </a>
        <a
          href={vendorsHref}
          aria-label={browseLabel}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-maroon/15 bg-cream/50 px-3 py-2.5 text-[12px] font-bold tracking-wide text-maroon transition-all duration-200 hover:border-maroon hover:bg-cream active:scale-[0.97] sm:min-w-[7.5rem] sm:rounded-[0.9rem] sm:px-4 sm:text-[13px]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <span className="whitespace-nowrap">{browseLabel}</span>
        </a>
      </div>
    </div>
  );

  return (
    <section
      id="home"
      className="relative isolate flex min-h-[100svh] flex-col overflow-x-hidden overflow-y-clip bg-white"
    >
      <div className="absolute inset-0 -z-10">
        {heroBackgrounds.map((src) => {
          const active = src === activeBackground;
          return (
            <Image
              key={src}
              src={src}
              alt=""
              aria-hidden="true"
              fill
              priority={src === hero.background}
              sizes="100vw"
              className={
                "scale-[1.2] object-cover object-[58%_center] transition-[opacity,transform] duration-500 ease-out sm:scale-100 sm:object-center " +
                (active
                  ? "animate-hero-drift z-10 opacity-100"
                  : "z-0 opacity-0")
              }
              unoptimized={isUnoptimized(src)}
            />
          );
        })}
      </div>

      <div
        aria-hidden
        className="hero-scrim-readability absolute inset-0 -z-10"
      />

      <div className="relative mx-auto flex w-full max-w-[1240px] flex-1 flex-col justify-end px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] pt-[calc(5.75rem+var(--safe-top))] sm:px-8 sm:pb-10 sm:pt-[calc(6.5rem+var(--safe-top))] lg:px-6 lg:pb-12 lg:pt-[calc(7.5rem+var(--safe-top))]">
        <div className="max-w-3xl">
          <h1 className="text-hero text-ink">
            <span className="animate-rise delay-1 block max-w-2xl font-sans text-[13px] font-bold uppercase leading-relaxed tracking-[0.12em] text-ink sm:text-base lg:text-lg">
              {lang === "hi" ? hero.headlineTopHi : hero.headlineTop}
            </span>
            <span className="animate-rise delay-2 mt-2 block max-w-3xl font-display text-[2.25rem] font-normal leading-[1.05] text-maroon sm:mt-3 sm:text-[clamp(2.75rem,2rem+3.2vw,4.75rem)]">
              {lang === "hi" ? hero.headlineBottomHi : hero.headlineBottom}
            </span>
          </h1>

          <p className="animate-rise delay-3 mt-3 max-w-xl text-sm leading-relaxed text-ink/80 sm:mt-5 sm:text-base sm:leading-7">
            {lang === "hi" ? hero.ledeHi : hero.lede}
          </p>
        </div>

        <div className="animate-rise delay-4 mt-5 max-w-5xl sm:mt-9">
          {bookingBar}
        </div>

        <ul className="animate-rise delay-5 mt-6 grid grid-cols-4 gap-0 divide-x divide-maroon/10 border-t border-maroon/10 pt-4 sm:mt-12 sm:pt-7">
          {hero.trustBadges.map((badge) => {
            const Icon = TRUST_ICON[badge.icon] ?? ShieldCheck;
            const title = lang === "hi" ? badge.titleHi : badge.title;
            const sub = lang === "hi" ? badge.subHi : badge.sub;
            return (
              <li
                key={badge.id}
                className="flex min-w-0 flex-col items-center gap-1 px-1 text-center sm:flex-row sm:items-start sm:gap-3 sm:px-5 sm:text-left sm:first:pl-0 sm:last:pr-0"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/85 text-maroon ring-1 ring-maroon/12 sm:mt-0.5 sm:h-9 sm:w-9">
                  <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-semibold leading-tight text-ink sm:text-[13px] sm:tracking-wide">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-[8px] leading-tight text-ink/65 sm:mt-1 sm:text-xs sm:leading-snug">
                    {sub}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
