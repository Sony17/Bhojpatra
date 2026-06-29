"use client";

import { useState } from "react";
import Image from "next/image";
import BrandSelect from "@/components/BrandSelect";
import DatePicker from "@/components/DatePicker";
import { occasions, cities, planningOccasions, type PlanningOccasion } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import {
  Sparkle,
  Rings,
  Briefcase,
  Gift,
  Lantern,
  HomeIcon,
  Diya,
} from "@/components/icons";

type IconComponent = (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;

const eventIcons: Record<string, IconComponent> = {
  sparkle: Sparkle,
  rings: Rings,
  briefcase: Briefcase,
  gift: Gift,
  lantern: Lantern,
  home: HomeIcon,
  diya: Diya,
};

/**
 * Hero looks the user can flip between via the right-side switch.
 *  - "vibrant"  — dark scrim, cream text; the food photos stay rich.
 *  - "classic"  — a white wash with black ink headline.
 *  - "original" — the original fixed hero backdrop.
 *  - "minimal"  — centred "What are you planning?" over the hero image.
 */
type VariantId = "vibrant" | "classic" | "original" | "minimal";

const heroVariants: { id: VariantId; name: string; nameHi: string }[] = [
  { id: "vibrant", name: "Vibrant", nameHi: "वाइब्रेंट" },
  { id: "classic", name: "Classic", nameHi: "क्लासिक" },
  { id: "original", name: "Original", nameHi: "ओरिजिनल" },
  { id: "minimal", name: "Minimal", nameHi: "मिनिमल" },
];

const variantStyles: Record<
  VariantId,
  {
    scrim: string;
    headline: string;
    accent: string;
    lede: string;
    pillInactive: string;
    /** When set, the hero shows this single static image instead of the
     *  event-switchable crossfade — the previous (original) hero backdrop. */
    staticBg?: string;
    /** Renders the centred "What are you planning?" layout. */
    minimal?: boolean;
  }
> = {
  vibrant: {
    scrim: "bg-gradient-to-r from-black/80 via-black/55 to-black/25",
    headline: "text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]",
    accent: "text-cream",
    lede: "text-cream/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]",
    pillInactive:
      "bg-white/15 text-cream ring-1 ring-white/25 backdrop-blur-sm hover:-translate-y-0.5 hover:bg-white/25 hover:ring-white/50",
  },
  classic: {
    scrim: "bg-gradient-to-r from-white/90 via-white/60 to-white/10",
    headline: "text-ink",
    accent: "text-maroon",
    lede: "text-ink-soft",
    pillInactive:
      "bg-white text-ink ring-1 ring-maroon/25 hover:-translate-y-0.5 hover:bg-white hover:ring-maroon/50",
  },
  original: {
    scrim: "bg-gradient-to-r from-white/90 via-white/60 to-white/10",
    headline: "text-ink",
    accent: "text-maroon",
    lede: "text-ink-soft",
    pillInactive:
      "bg-white text-ink ring-1 ring-maroon/25 hover:-translate-y-0.5 hover:bg-white hover:ring-maroon/50",
    staticBg: "/hero-bg.webp",
  },
  minimal: {
    // Soft, even white wash over the hero photo so the centred black headline
    // and the white search card stay legible across the whole width.
    scrim: "bg-gradient-to-b from-white/85 via-white/70 to-white/85",
    headline: "text-ink",
    accent: "text-maroon",
    lede: "text-ink-soft",
    pillInactive:
      "bg-white text-ink ring-1 ring-maroon/25 hover:-translate-y-0.5 hover:ring-maroon/50",
    staticBg: "/hero-bg.webp",
    minimal: true,
  },
};

/** Local YYYY-MM-DD (matches the <input type="date"> value on /book). */
function toYmd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default function Hero() {
  const { lang, t } = useLang();

  // Booking selections, carried into /book as query params.
  const [occasionId, setOccasionId] = useState(occasions[0].id);
  const [cityId, setCityId] = useState(cities[0].id);
  const [date, setDate] = useState<Date | null>(null);

  // Event switch — selecting a pill crossfades the hero backdrop.
  const [eventId, setEventId] = useState<string>(planningOccasions[0].id);

  // Hero-look switch — flip between the three treatments.
  const [variant, setVariant] = useState<VariantId>("vibrant");
  const v = variantStyles[variant];

  const bookParams = new URLSearchParams({ occasion: occasionId, city: cityId });
  if (date) bookParams.set("date", toYmd(date));
  const bookHref = `/book?${bookParams.toString()}`;

  // Event pills shared across the variants — icons in the standard layouts,
  // text-only and centred in the minimal layout.
  const eventPills = (containerClass: string, inactiveClass: string, showIcons: boolean) => (
    <div className={containerClass}>
      {planningOccasions.map((o: PlanningOccasion) => {
        const Icon = eventIcons[o.iconKey];
        const active = o.id === eventId;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => setEventId(o.id)}
            aria-pressed={active}
            className={
              "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-all duration-300 sm:px-4 " +
              (active
                ? "scale-105 bg-maroon text-cream shadow-[0_8px_20px_-8px_rgba(0,0,0,0.7)]"
                : inactiveClass)
            }
          >
            {showIcons && <Icon className="h-[17px] w-[17px]" />}
            <span className="whitespace-nowrap">{lang === "hi" ? o.nameHi : o.name}</span>
          </button>
        );
      })}
    </div>
  );

  // Occasion / date / location + CTA search bar, reused by every variant.
  const bookingBar = (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-stretch">
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
  );

  return (
    <section id="home" className="relative isolate flex min-h-screen flex-col overflow-hidden bg-surface-beige">
      {/* Full-bleed hero artwork — every event's image is stacked and only the
          selected one is faded in, so clicking a pill crossfades the backdrop. */}
      <div className="absolute inset-0 -z-10">
        {v.staticBg ? (
          <Image
            src={v.staticBg}
            alt="A golden Indian wedding feast laid out in brass serving dishes"
            fill
            priority
            sizes="100vw"
            className="animate-kenburns object-cover object-center"
          />
        ) : (
          planningOccasions.map((o: PlanningOccasion) => {
            const active = o.id === eventId;
            return (
              <Image
                key={o.id}
                src={o.image}
                alt=""
                aria-hidden="true"
                fill
                priority={o.id === planningOccasions[0].id}
                sizes="100vw"
                className={
                  "object-cover object-center transition-all duration-[1200ms] ease-out " +
                  (active ? "animate-kenburns scale-100 opacity-100" : "scale-105 opacity-0")
                }
              />
            );
          })
        )}
      </div>

      {/* Readability scrim — driven by the active hero variant. */}
      <div aria-hidden className={"absolute inset-0 -z-10 transition-colors duration-500 " + v.scrim} />

      {/* Hero-look switch — a vertical segmented control on the right lets the
          user flip between the treatments. */}
      <div className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 sm:block lg:right-6">
        <div className="flex flex-col gap-1.5 rounded-full bg-black/45 p-1.5 ring-1 ring-white/25 backdrop-blur-md shadow-[0_10px_30px_-12px_rgba(0,0,0,0.8)]">
          {heroVariants.map((hv) => {
            const active = hv.id === variant;
            return (
              <button
                key={hv.id}
                type="button"
                onClick={() => setVariant(hv.id)}
                aria-pressed={active}
                className={
                  "rounded-full px-4 py-2.5 text-xs font-semibold transition-all duration-300 " +
                  (active
                    ? "scale-105 bg-maroon text-cream shadow-[0_6px_16px_-6px_rgba(0,0,0,0.7)]"
                    : "text-cream/85 hover:bg-white/15 hover:text-cream")
                }
              >
                {lang === "hi" ? hv.nameHi : hv.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content — the minimal variant is a centred "What are you planning?"
          layout over the hero photo; every other variant is left-aligned. */}
      {v.minimal ? (
        <div className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-5 pb-16 pt-36 text-center sm:pt-40">
          <h1 className="animate-rise font-display text-[2.75rem] font-normal leading-[1.05] tracking-tight text-ink drop-shadow-[0_2px_10px_rgba(255,255,255,0.7)] sm:text-7xl">
            {t("What are you planning?", "आप क्या प्लान कर रहे हैं?")}
          </h1>

          {eventPills(
            "animate-rise delay-1 mt-9 flex flex-wrap justify-center gap-2.5 sm:gap-3",
            "bg-white text-ink ring-1 ring-maroon/25 hover:-translate-y-0.5 hover:ring-maroon/50",
            false,
          )}

          <div className="animate-rise delay-2 mx-auto mt-7 w-full max-w-3xl">{bookingBar}</div>
        </div>
      ) : (
        <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 pb-16 pt-32 sm:pt-36 lg:pb-20 lg:pt-44">
          <div className="max-w-xl">
            <h1 className={"font-display text-[2.75rem] font-bold leading-[1.05] tracking-tight transition-colors duration-500 sm:text-6xl " + v.headline}>
              <span className="animate-rise block font-sans sm:whitespace-nowrap">
                {t("Different Specialists.", "अलग-अलग स्पेशलिस्ट।")}
              </span>
              <span className={"animate-rise delay-1 font-display block pt-1 text-6xl font-normal transition-colors duration-500 sm:text-7xl " + v.accent}>
                {t("One Celebration.", "एक उत्सव।")}
              </span>
            </h1>

            <p className={"animate-rise delay-2 mt-5 max-w-md text-base transition-colors duration-500 sm:text-lg " + v.lede}>
              {t(
                "Plan your perfect celebration with the best specialists from your city, state or across India.",
                "अपने शहर, राज्य या पूरे भारत के बेहतरीन स्पेशलिस्ट के साथ अपना परफेक्ट उत्सव प्लान करें।",
              )}
            </p>

            {/* Event switch — crossfades the hero backdrop. Hidden in the
                Original variant, which has a fixed backdrop. */}
            {!v.staticBg &&
              eventPills(
                "animate-rise delay-2 mt-7 -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:max-w-2xl sm:flex-wrap sm:overflow-x-visible sm:px-0 sm:pb-0 sm:gap-2.5",
                v.pillInactive,
                true,
              )}

            <div className="animate-rise delay-3 mt-6 max-w-2xl">{bookingBar}</div>
          </div>
        </div>
      )}
    </section>
  );
}
