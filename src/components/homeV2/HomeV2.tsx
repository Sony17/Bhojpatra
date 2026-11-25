"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import BrandSelect from "@/components/BrandSelect";
import DatePicker from "@/components/DatePicker";
import {
  ArrowRight,
  Gift,
  Headset,
  ShieldCheck,
  StarSolid,
} from "@/components/icons";
import { Button } from "@/components/ui";
import { guestPresets, DEFAULT_VENDOR_LEAD_DAYS } from "@/lib/data";
import { isoAfterDays } from "@/lib/bookingPricing";
import { useLang } from "@/lib/i18n";
import { useLocations } from "@/lib/locations";
import {
  LOCATION_CHANGED_EVENT,
  useDetectedLocation,
  type StoredLocation,
} from "@/lib/detectedLocation";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";
import { occasionHref } from "@/lib/homeLinks";

/**
 * Home — V2 layout ("Plan, Book & Celebrate").
 *
 * Lives beside the classic home (`/`) at `/home-v2` so both can be compared.
 * Every image, occasion and brand comes from the same admin-managed home
 * content as the classic page, and every colour is one of the four brand hexes.
 */

/* ── Small inline icons the shared set doesn't have ───────────────────────── */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

function ClocheIcon({ className }: { className?: string }) {
  return (
    <svg {...stroke} className={className}>
      <path d="M3 18h18M5 18a7 7 0 0 1 14 0M12 8V6M10 6h4" />
    </svg>
  );
}
function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg {...stroke} className={className}>
      <path d="M4 21V9l8-5 8 5v12M4 21h16M9 21v-5h6v5M8 11h.01M12 11h.01M16 11h.01" />
    </svg>
  );
}
function GridIcon({ className }: { className?: string }) {
  return (
    <svg {...stroke} className={className}>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}
function BoltIcon({ className }: { className?: string }) {
  return (
    <svg {...stroke} className={className}>
      <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" />
    </svg>
  );
}
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg {...stroke} strokeWidth={2.2} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/** Local YYYY-MM-DD. */
function toYmd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

type ServiceKey = "all" | "baina" | "catering" | "venues";

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-maroon sm:text-sm">
      {children}
    </p>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-2 text-center font-display text-[1.75rem] leading-tight text-ink sm:text-[2.5rem]">
      {children}
    </h2>
  );
}

export default function HomeV2() {
  const { lang, t } = useLang();
  const { hero, services, occasions, brandRibbon } = useHomeContent();
  const hi = lang === "hi";

  /* ── Search bar state ───────────────────────────────────────────────── */
  const locations = useLocations();
  const { match: detected } = useDetectedLocation(locations);
  const [cityId, setCityId] = useState<string>("");
  const [service, setService] = useState<ServiceKey>("all");
  const [date, setDate] = useState<Date | null>(null);
  const [guests, setGuests] = useState<string>(String(guestPresets[1]));
  const cityTouched = useRef(false);

  useEffect(() => {
    if (detected && !cityTouched.current) setCityId(detected.locationId);
  }, [detected]);

  useEffect(() => {
    function onChanged(e: Event) {
      const entry = (e as CustomEvent<StoredLocation>).detail;
      if (!entry?.cityId) return;
      cityTouched.current = true;
      setCityId(entry.cityId);
    }
    window.addEventListener(LOCATION_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(LOCATION_CHANGED_EVENT, onChanged);
  }, []);

  const serviceOptions: { id: ServiceKey; name: string }[] = [
    { id: "all", name: t("All Services", "सभी सेवाएँ") },
    { id: "baina", name: t("Baina & Gift Boxes", "बैना और गिफ्ट बॉक्स") },
    { id: "catering", name: t("Catering", "कैटरिंग") },
    { id: "venues", name: t("Venues", "वेन्यू") },
  ];
  const guestOptions = guestPresets.map((p) => ({
    id: String(p),
    name: p.toLocaleString("en-IN"),
  }));

  const searchHref = (() => {
    const qs = new URLSearchParams();
    if (cityId) qs.set("city", cityId);
    switch (service) {
      case "baina":
        return `/baina-box${qs.size ? `?${qs}` : ""}`;
      case "venues":
        return `/venues${qs.size ? `?${qs}` : ""}`;
      case "catering":
        qs.set("date", date ? toYmd(date) : isoAfterDays(DEFAULT_VENDOR_LEAD_DAYS));
        qs.set("guests", guests);
        return `/book/stall?${qs}`;
      default:
        return `/vendors${qs.size ? `?${qs}` : ""}`;
    }
  })();

  /* ── Content ─────────────────────────────────────────────────────────── */
  const cateringImage =
    services.categories.find((c) => c.id === "caterers")?.image ??
    services.categories[0]?.image ??
    hero.background;
  const venueImage =
    occasions.items.find((o) => /wedding/i.test(o.id))?.image ??
    occasions.items[0]?.image ??
    hero.background;

  const serviceCards = [
    {
      id: "baina",
      title: t("Baina & Gift Boxes", "बैना और गिफ्ट बॉक्स"),
      body: t(
        "Traditional and modern wedding favours, Baina, and curated gifts.",
        "पारंपरिक और आधुनिक शादी के उपहार, बैना और चुनिंदा गिफ्ट।",
      ),
      image: services.bainaBox.image,
      href: "/baina-box",
      Icon: Gift,
    },
    {
      id: "catering",
      title: t("Catering", "कैटरिंग"),
      body: t(
        "Customisable menus for weddings, parties, and events.",
        "शादी, पार्टी और कार्यक्रमों के लिए अपनी पसंद का मेन्यू।",
      ),
      image: cateringImage,
      href: "/book/stall",
      Icon: ClocheIcon,
    },
    {
      id: "venues",
      title: t("Venues", "वेन्यू"),
      body: t(
        "Banquet halls, lawns, resorts, and unique venues across India.",
        "पूरे भारत में बैंक्वेट हॉल, लॉन, रिज़ॉर्ट और खास वेन्यू।",
      ),
      image: venueImage,
      href: "/venues",
      Icon: BuildingIcon,
    },
  ];

  const why = [
    { id: "verified", Icon: ShieldCheck, label: t("Verified Vendors", "सत्यापित वेंडर") },
    { id: "compare", Icon: BoltIcon, label: t("Compare & Book Easily", "तुलना करें, आसानी से बुक करें") },
    { id: "support", Icon: Headset, label: t("Dedicated Support", "समर्पित सहायता") },
  ];

  const trending = [...brandRibbon.brands]
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .slice(0, 4);

  const fieldBtn = "py-1 pr-6 text-sm font-semibold text-ink";

  return (
    <div className="bg-white">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-5 pt-[calc(5.5rem+var(--safe-top))] sm:px-8 sm:pt-[calc(7rem+var(--safe-top))]">
        <div className="grid items-center gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-4">
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink sm:text-xs">
              {t("Weddings · Events · Corporate · Social", "शादी · कार्यक्रम · कॉर्पोरेट · सामाजिक")}
            </p>
            <h1 className="mt-4 font-display text-[2.4rem] leading-[1.05] text-ink sm:text-[3.5rem] lg:text-[4rem]">
              {t("Plan, Book & Celebrate", "प्लान करें, बुक करें और जश्न मनाएँ")}
              <br />
              {t("with", "")} <span className="text-maroon">{t("Bhojpatra", "भोजपत्र के साथ")}</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink sm:text-base">
              {t(
                "Discover trusted vendors for Baina & Gift Boxes, Catering, and Venues — all in one place.",
                "बैना और गिफ्ट बॉक्स, कैटरिंग और वेन्यू के भरोसेमंद वेंडर — सब एक ही जगह।",
              )}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                href="#services"
                size="lg"
                className="rounded-full"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {t("Explore Services", "सेवाएँ देखें")}
              </Button>
              <Button href="/contact" size="lg" variant="secondary" className="rounded-full bg-white">
                {t("Get a Quote", "कोटेशन पाएँ")}
              </Button>
            </div>
          </div>

          <div className="relative -mx-5 aspect-[16/10] sm:mx-0 lg:aspect-[5/4]">
            <Image
              src={hero.background}
              alt=""
              aria-hidden
              fill
              priority
              sizes="(min-width:1024px) 55vw, 100vw"
              className="object-cover [mask-image:radial-gradient(ellipse_at_65%_45%,#000_50%,transparent_78%)]"
              unoptimized={isUnoptimized(hero.background)}
            />
          </div>
        </div>

        {/* Search bar */}
        <div className="relative z-20 mt-4 lg:-mt-10">
          <div className="flex items-stretch rounded-full border border-cream bg-white p-1.5 shadow-pop lg:max-w-5xl">
            <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
              <BrandSelect
                className="w-full"
                options={locations}
                placeholder={t("Select City", "शहर चुनें")}
                ariaLabel={t("Select City", "शहर चुनें")}
                icon="mapPin"
                buttonClassName={fieldBtn}
                direction="down"
                align="left"
                valueId={cityId || undefined}
                onChange={(o) => {
                  cityTouched.current = true;
                  setCityId(o.id);
                }}
              />
            </div>

            <span aria-hidden className="my-2 hidden w-px bg-cream lg:block" />
            <div className="hidden min-w-0 flex-1 items-center gap-2 px-4 lg:flex">
              <GridIcon className="h-4 w-4 shrink-0 text-ink" />
              <BrandSelect
                className="w-full"
                options={serviceOptions}
                placeholder={t("All Services", "सभी सेवाएँ")}
                ariaLabel={t("Choose a service", "सेवा चुनें")}
                icon="chevron"
                buttonClassName={fieldBtn}
                direction="down"
                align="left"
                valueId={service}
                onChange={(o) => setService(o.id as ServiceKey)}
              />
            </div>

            <span aria-hidden className="my-2 hidden w-px bg-cream lg:block" />
            <div className="hidden min-w-0 flex-1 items-center px-4 lg:flex">
              <DatePicker
                className="w-full"
                placeholder={t("Event Date", "कार्यक्रम की तारीख")}
                ariaLabel={t("Event Date", "कार्यक्रम की तारीख")}
                buttonClassName={fieldBtn}
                direction="down"
                align="center"
                minDaysAhead={1}
                onChange={(d) => setDate(d)}
              />
            </div>

            <span aria-hidden className="my-2 hidden w-px bg-cream lg:block" />
            <div className="hidden min-w-0 flex-1 items-center px-4 lg:flex">
              <BrandSelect
                className="w-full"
                options={guestOptions}
                placeholder={t("Guest Count", "मेहमान")}
                ariaLabel={t("Guest Count", "मेहमान")}
                icon="chevron"
                buttonClassName={fieldBtn}
                direction="down"
                align="left"
                valueId={guests}
                onChange={(o) => setGuests(o.id)}
              />
            </div>

            <a
              href={searchHref}
              aria-label={t("Search Vendors", "वेंडर खोजें")}
              className="btn-sheen focus-ring flex shrink-0 items-center justify-center gap-2 rounded-full bg-maroon px-4 py-3 text-sm font-semibold text-white shadow-brand transition hover:-translate-y-0.5 lg:px-7"
            >
              <SearchIcon className="h-4 w-4" />
              <span className="hidden lg:inline">{t("Search Vendors", "वेंडर खोजें")}</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────────────── */}
      <section id="services" className="mx-auto max-w-7xl scroll-mt-24 px-5 pt-14 sm:px-8 sm:pt-20">
        <Eyebrow>{t("Our Services", "हमारी सेवाएँ")}</Eyebrow>
        <SectionTitle>{t("Plan Your Perfect Celebration", "अपने खास जश्न की योजना बनाएँ")}</SectionTitle>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-ink sm:text-base">
          {t(
            "Everything you need for your special occasion — curated, trusted, and personalised.",
            "आपके खास मौके की हर ज़रूरत — चुनी हुई, भरोसेमंद और आपके अनुसार।",
          )}
        </p>

        {/* Desktop / tablet: cards */}
        <div className="mt-10 hidden gap-6 sm:grid sm:grid-cols-3">
          {serviceCards.map(({ id, title, body, image, href, Icon }) => (
            <Link
              key={id}
              href={href}
              className="group flex flex-col overflow-hidden rounded-card border-2 border-cream bg-white p-2 shadow-card transition hover:-translate-y-1 hover:shadow-pop"
            >
              <span className="relative block aspect-[4/3] overflow-hidden rounded-[0.75rem]">
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(min-width:1024px) 400px, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  unoptimized={isUnoptimized(image)}
                />
              </span>
              <span className="relative z-10 mx-auto -mt-8 flex h-16 w-16 items-center justify-center rounded-full border-2 border-cream bg-white text-maroon shadow-card">
                <Icon className="h-7 w-7" />
              </span>
              <span className="flex flex-1 flex-col items-center px-4 pb-5 pt-3 text-center">
                <span className="font-display text-2xl text-maroon">{title}</span>
                <span className="mt-2 text-sm leading-relaxed text-ink">{body}</span>
                <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-maroon px-6 py-2 text-sm font-semibold text-maroon transition group-hover:bg-maroon group-hover:text-white">
                  {t("Explore", "देखें")}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </span>
            </Link>
          ))}
        </div>

        {/* Phone: compact rows */}
        <div className="mt-6 grid gap-3 sm:hidden">
          {serviceCards.map(({ id, title, image, href, Icon }) => (
            <Link
              key={id}
              href={href}
              className="flex items-center gap-3 overflow-hidden rounded-card border border-cream bg-white pr-4 shadow-card active:scale-[0.99]"
            >
              <span className="relative block h-16 w-24 shrink-0">
                <Image src={image} alt="" fill sizes="96px" className="object-cover" unoptimized={isUnoptimized(image)} />
              </span>
              <span className="-ml-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cream bg-white text-maroon shadow-card">
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex-1 text-[15px] font-semibold text-maroon">{title}</span>
              <ArrowRight className="h-4 w-4 text-maroon" />
            </Link>
          ))}
        </div>
      </section>

      {/* ── Why choose ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 pt-12 sm:px-8">
        <div className="grid items-center gap-6 rounded-card bg-cream px-6 py-6 sm:grid-cols-[auto_1fr] sm:px-10">
          <h2 className="text-center font-display text-2xl leading-tight text-ink sm:border-r sm:border-maroon sm:pr-10 sm:text-left">
            {t("Why Choose", "क्यों चुनें")}
            <br />
            <span className="text-3xl text-maroon">{t("Bhojpatra?", "भोजपत्र?")}</span>
          </h2>
          <ul className="grid grid-cols-3 gap-2">
            {why.map(({ id, Icon, label }) => (
              <li key={id} className="flex flex-col items-center gap-2 text-center">
                <Icon className="h-7 w-7 text-maroon" />
                <span className="text-xs font-semibold text-ink sm:text-sm">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Occasions ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 pt-14 sm:px-8 sm:pt-20">
        <Eyebrow>{t("Curated Collections", "चुनिंदा संग्रह")}</Eyebrow>
        <SectionTitle>{t("Explore by Occasion", "अवसर के अनुसार देखें")}</SectionTitle>
        <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-5 sm:gap-4">
          {occasions.items.slice(0, 5).map((o, i) => {
            const name = hi ? o.nameHi : o.name;
            return (
              <Link
                key={o.id}
                href={occasionHref(o.id)}
                className={
                  "group relative block aspect-[4/5] overflow-hidden rounded-card shadow-card transition hover:-translate-y-0.5 sm:aspect-[3/2]" +
                  (i > 2 ? " hidden sm:block" : "")
                }
              >
                <Image
                  src={o.image}
                  alt=""
                  fill
                  sizes="(min-width:640px) 240px, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                  unoptimized={isUnoptimized(o.image)}
                />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3">
                  <span className="truncate font-display text-base text-white sm:text-xl">{name}</span>
                  <span className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-maroon sm:flex">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Trending vendors ────────────────────────────────────────── */}
      {trending.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pt-14 sm:px-8 sm:pt-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl text-ink sm:text-[1.75rem]">
              {t("Trending Vendors Near You", "आपके पास लोकप्रिय वेंडर")}
            </h2>
            <Link href="/vendors" className="inline-flex items-center gap-1 text-sm font-semibold text-maroon hover:underline">
              {t("View All", "सभी देखें")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="-mx-5 mt-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {trending.map((b, i) => (
              <Link
                key={b.id}
                href={`/vendors?q=${encodeURIComponent(b.name)}`}
                className="group w-[15rem] shrink-0 snap-start overflow-hidden rounded-card border border-cream bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-pop sm:w-auto"
              >
                <span className="relative block aspect-[16/9]">
                  <Image
                    src={b.image || b.logo}
                    alt=""
                    fill
                    sizes="(min-width:1024px) 300px, 240px"
                    className="object-cover"
                    unoptimized={isUnoptimized(b.image || b.logo)}
                  />
                  {i === 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-cream px-2.5 py-1 text-[10px] font-bold text-maroon">
                      {t("Best Seller", "बेस्ट सेलर")}
                    </span>
                  )}
                </span>
                <span className="block px-3 py-3">
                  <span className="block truncate text-sm font-bold text-ink">
                    {hi ? b.nameHi || b.name : b.name}
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-xs text-ink">
                    {b.rating > 0 && (
                      <>
                        <StarSolid className="h-3.5 w-3.5 text-maroon" />
                        <span className="font-semibold">{b.rating.toFixed(1)}</span>
                        {b.reviewCount > 0 && <span>({b.reviewCount.toLocaleString("en-IN")})</span>}
                        <span aria-hidden>·</span>
                      </>
                    )}
                    <span className="truncate">{hi ? b.categoryHi || b.category : b.category}</span>
                  </span>
                  {b.priceFrom > 0 && (
                    <span className="mt-2 block text-sm font-semibold text-ink">
                      ₹{b.priceFrom.toLocaleString("en-IN")} {t("onwards", "से शुरू")}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Offers band ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="flex flex-col items-center gap-5 rounded-card border border-cream bg-white px-6 py-7 text-center shadow-card sm:flex-row sm:px-10 sm:text-left">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-maroon shadow-brand">
            <Image src="/bhojpatra-icon.png" alt="" width={40} height={40} className="h-10 w-10 object-contain" />
          </span>
          <h2 className="font-display text-2xl leading-tight text-maroon sm:border-r sm:border-cream sm:pr-8 sm:text-[1.75rem]">
            {t("Save More on", "जश्न पर")}
            <br className="hidden sm:block" /> {t("Celebrations", "ज़्यादा बचत")}
          </h2>
          <p className="flex-1 text-sm text-ink">
            {t(
              "Get exclusive deals on Baina, Catering, and Venues. Book early and save big!",
              "बैना, कैटरिंग और वेन्यू पर खास ऑफ़र। जल्दी बुक करें, ज़्यादा बचाएँ!",
            )}
          </p>
          <Button
            href="/service-packages"
            className="rounded-full"
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            {t("Explore Offers", "ऑफ़र देखें")}
          </Button>
        </div>
      </section>
    </div>
  );
}
