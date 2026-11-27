"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useLang } from "@/lib/i18n";

/**
 * "Our Services" block: four service cards (Baina, Catering, Venues, Event Essentials) and a
 * "Your Celebration, Our Responsibility." strip. Brand colours only; Ananda Neptouch 2 for
 * the section title and card names, Open Sans for the rest.
 */
export default function ServiceCards() {
  const { t } = useLang();

  const services: {
    href: string;
    img: string;
    alt: string;
    title: string;
    text: string;
    icon: ReactNode;
  }[] = [
    {
      href: "/baina-box",
      img: "/services/baina.jpg",
      alt: t("A Baina box of sweets and dry fruits", "मिठाई और मेवे का बैना बॉक्स"),
      title: t("Baina & Gift Boxes", "बैना और गिफ्ट बॉक्स"),
      text: t(
        "Traditional and modern wedding favours, Baina, and curated gifts.",
        "पारंपरिक और आधुनिक शादी के उपहार, बैना और चुने हुए गिफ्ट।",
      ),
      icon: <GiftIcon />,
    },
    {
      href: "/vendors",
      img: "/services/catering.jpg",
      alt: t("A lit buffet counter in front of a decorated mandap", "सजे मंडप के सामने रोशन बुफे काउंटर"),
      title: t("Catering", "कैटरिंग"),
      text: t(
        "Customisable menus for weddings, parties, and events.",
        "शादी, पार्टी और इवेंट के लिए अपनी पसंद का मेन्यू।",
      ),
      icon: <ClocheIcon />,
    },
    {
      href: "/venues",
      img: "/services/venue-peepals-retreat.jpg",
      alt: t("The Peepal's Retreat venue lit up for an evening event", "शाम के इवेंट के लिए सजा द पीपल्स रिट्रीट वेन्यू"),
      title: t("Venues", "वेन्यू"),
      text: t(
        "Banquet halls, lawns, resorts, and unique venues across India.",
        "पूरे भारत में बैंक्वेट हॉल, लॉन, रिज़ॉर्ट और खास वेन्यू।",
      ),
      icon: <BuildingIcon />,
    },
    {
      href: "/categories",
      img: "/gallery/event-3.jpg",
      alt: t("Lit buffet counters with decor at an evening event", "शाम के इवेंट में सजे हुए बुफे काउंटर"),
      title: t("Event Essentials", "इवेंट ज़रूरतें"),
      text: t(
        "Decor, tents, lighting and crockery for every event.",
        "हर इवेंट के लिए सजावट, टेंट, लाइटिंग और क्रॉकरी।",
      ),
      icon: <SparkleIcon />,
    },
  ];

  const reasons = [
    { label: t("Verified Vendors", "सत्यापित वेंडर"), icon: <ShieldIcon /> },
    { label: t("Compare & Book Easily", "आसानी से तुलना और बुकिंग"), icon: <BoltIcon /> },
    { label: t("Transparent Pricing", "पारदर्शी कीमत"), icon: <RupeeIcon /> },
    { label: t("Dedicated Support", "समर्पित सहायता"), icon: <HeadsetIcon /> },
  ];

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <p className="flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-maroon">
          <span aria-hidden="true" className="h-px w-8 bg-maroon/40" />
          {t("Explore our services", "हमारी सेवाएं देखें")}
          <span aria-hidden="true" className="h-px w-8 bg-maroon/40" />
        </p>
        <h2 className="font-display mt-2 text-center text-3xl leading-tight text-maroon sm:text-[42px]">
          {t("Plan your perfect celebration", "अपना परफेक्ट जश्न प्लान करें")}
        </h2>

        {/* Phones: one row of four icon shortcuts */}
        <ul className="mt-6 grid grid-cols-4 gap-2 sm:hidden">
          {services.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="flex flex-col items-center gap-1.5 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-cream bg-cream/30 text-maroon [&_svg]:h-6 [&_svg]:w-6">
                  {s.icon}
                </span>
                <span className="text-[11px] font-semibold leading-tight text-black">{s.title}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Tablet and up: photo cards */}
        <div className="mt-8 hidden gap-4 sm:grid sm:grid-cols-2 lg:mt-10 lg:grid-cols-4 lg:gap-5">
          {services.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group flex flex-col border border-cream bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_-18px_rgba(0,0,0,0.25)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_40px_-22px_rgba(185,32,37,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon"
            >
              <div className="relative aspect-[16/11] w-full overflow-hidden">
                <Image
                  src={s.img}
                  alt={s.alt}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                />
              </div>
              <span className="relative z-10 -mt-6 ml-4 flex h-12 w-12 items-center justify-center rounded-full border border-cream bg-white text-maroon shadow-[0_4px_12px_-6px_rgba(0,0,0,0.3)] [&_svg]:h-[22px] [&_svg]:w-[22px]">
                {s.icon}
              </span>
              <div className="flex flex-1 items-end gap-3 px-4 pb-4 pt-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[22px] leading-tight text-maroon">{s.title}</h3>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-black/65">{s.text}</p>
                </div>
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-maroon/40 text-maroon transition-colors group-hover:border-maroon group-hover:bg-maroon group-hover:text-white"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Trust strip */}
        <div className="mt-6 flex flex-col items-center gap-3 border border-cream bg-cream/30 px-4 py-4 sm:mt-8 lg:flex-row lg:gap-8 lg:px-8">
          <p className="shrink-0 text-center text-sm font-semibold leading-tight text-black lg:border-r lg:border-maroon/30 lg:pr-8 lg:text-left">
            {t("Your Celebration,", "आपका उत्सव,")}{" "}
            <span className="font-display text-lg font-normal text-maroon">{t("Our Responsibility.", "हमारी ज़िम्मेदारी।")}</span>
          </p>
          <ul className="grid w-full grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-4 lg:flex-1">
            {reasons.map((r) => (
              <li key={r.label} className="flex items-center justify-center gap-2 text-xs font-semibold text-black sm:text-[13px]">
                <span className="text-maroon [&_svg]:h-5 [&_svg]:w-5">{r.icon}</span>
                {r.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

const ico = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function GiftIcon() {
  return (
    <svg {...ico} className="h-6 w-6">
      <rect x="3.5" y="8" width="17" height="4" rx="1" />
      <path d="M5 12v8.5h14V12M12 8v12.5M12 8c-1.5-3-5-3.5-5-1.2C7 8 9 8 12 8Zm0 0c1.5-3 5-3.5 5-1.2C17 8 15 8 12 8Z" />
    </svg>
  );
}

function ClocheIcon() {
  return (
    <svg {...ico} className="h-6 w-6">
      <path d="M3 18h18M5 18a7 7 0 0 1 14 0M12 8V6M10 6h4" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg {...ico} className="h-6 w-6">
      <path d="M4 21V8h7v13M11 21V4h9v17M2.5 21h19M7 11h1M7 14h1M7 17h1M14 7h2M14 10h2M14 13h2M14 16h2" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg {...ico} className="h-6 w-6">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5" />
    </svg>
  );
}

function RupeeIcon() {
  return (
    <svg {...ico} className="h-6 w-6">
      <path d="M7 5h10M7 9h10M10 5c3 0 5 1.5 5 4s-2 4-5 4H7l7 7" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg {...ico} className="h-6 w-6">
      <path d="M12 3 5 6v5c0 4.5 3 8.4 7 10 4-1.6 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg {...ico} className="h-6 w-6">
      <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" />
    </svg>
  );
}

function HeadsetIcon() {
  return (
    <svg {...ico} className="h-6 w-6">
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
    </svg>
  );
}
