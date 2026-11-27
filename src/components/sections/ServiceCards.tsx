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
      alt: t("A catering stall at an evening event", "शाम के इवेंट में कैटरिंग स्टॉल"),
      title: t("Catering", "कैटरिंग"),
      text: t(
        "Customisable menus for weddings, parties, and events.",
        "शादी, पार्टी और इवेंट के लिए अपनी पसंद का मेन्यू।",
      ),
      icon: <ClocheIcon />,
    },
    {
      href: "/venues",
      img: "/services/venue.jpg",
      alt: t("A wedding celebration at a venue", "वेन्यू पर शादी का जश्न"),
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
    { label: t("Dedicated Support", "समर्पित सहायता"), icon: <HeadsetIcon /> },
  ];

  return (
    <section className="bg-gradient-to-b from-white via-cream/15 to-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-maroon">
          {t("Our Services", "हमारी सेवाएं")}
        </p>
        <h2 className="font-display mt-2 text-center text-3xl leading-tight text-maroon sm:text-5xl">
          {t("Plan your perfect celebration", "अपना परफेक्ट जश्न प्लान करें")}
        </h2>

        <div className="mt-6 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {services.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group relative flex overflow-hidden rounded-2xl border border-cream bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-16px_rgba(0,0,0,0.18)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_4px_10px_rgba(0,0,0,0.06),0_24px_40px_-18px_rgba(185,32,37,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon sm:flex-col sm:rounded-[1.75rem] sm:border-2 sm:bg-gradient-to-b sm:from-white sm:to-cream/30 sm:p-3"
            >
              <Corners />
              <div className="relative w-28 shrink-0 overflow-hidden sm:aspect-square sm:w-full sm:rounded-[1.25rem] sm:ring-1 sm:ring-cream">
                <Image
                  src={s.img}
                  alt={s.alt}
                  fill
                  sizes="(min-width: 640px) 33vw, 112px"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </div>
              <span className="relative z-10 mx-auto -mt-7 hidden h-14 w-14 items-center justify-center rounded-full border-2 border-cream bg-white text-maroon shadow-[0_4px_12px_-6px_rgba(0,0,0,0.25)] sm:flex">
                {s.icon}
              </span>
              <div className="flex min-w-0 flex-1 flex-col items-start px-4 py-3 text-left sm:items-center sm:px-4 sm:pb-3 sm:pt-1 sm:text-center">
                <h3 className="font-display text-xl leading-tight text-maroon sm:text-[24px] lg:text-[22px]">{s.title}</h3>
                <p className="mt-1 flex-1 text-[13px] leading-snug text-black/70 sm:mt-1 sm:line-clamp-2 sm:max-w-[17rem] sm:text-[13px] sm:leading-snug sm:text-black/75">{s.text}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-maroon sm:mt-3 sm:h-9 sm:gap-1.5 sm:rounded-full sm:border sm:border-maroon/40 sm:bg-white sm:px-7 sm:text-sm sm:shadow-[0_2px_8px_-4px_rgba(185,32,37,0.3)] transition-colors sm:group-hover:border-maroon sm:group-hover:bg-maroon sm:group-hover:text-white">
                  {t("Explore", "देखें")}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 grid items-center gap-4 rounded-2xl bg-cream/30 px-5 py-5 sm:mt-8 sm:grid-cols-[auto_1fr] sm:gap-8 sm:px-10 sm:py-6">
          <h3 className="text-center text-lg font-semibold leading-tight text-black sm:border-r sm:border-maroon/40 sm:pr-10 sm:text-left sm:text-xl">
            {t("Your Celebration,", "आपका उत्सव,")}
            <span className="font-display block text-2xl font-normal text-maroon sm:text-3xl">{t("Our Responsibility.", "हमारी ज़िम्मेदारी।")}</span>
          </h3>
          <ul className="grid grid-cols-3 gap-2 sm:divide-x sm:divide-maroon/30">
            {reasons.map((r) => (
              <li key={r.label} className="flex flex-col items-center gap-1.5 text-center text-xs font-semibold text-black sm:text-sm">
                <span className="text-maroon">{r.icon}</span>
                {r.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** Cream corner scrolls on the card frame (tablet and up), like the design. */
function Corners() {
  const corner = (
    <svg viewBox="0 0 32 32" fill="none" stroke="#F0D09E" strokeWidth={1.6} strokeLinecap="round" className="h-full w-full">
      <path d="M3 26V9a6 6 0 0 1 6-6h17" />
      <path d="M8 18c0-6 4-10 10-10" />
      <circle cx="9" cy="9" r="2" fill="#F0D09E" stroke="none" />
    </svg>
  );
  const pos = ["left-0.5 top-0.5", "right-0.5 top-0.5 rotate-90", "bottom-0.5 right-0.5 rotate-180", "bottom-0.5 left-0.5 -rotate-90"];
  return (
    <>
      {pos.map((p) => (
        <span key={p} aria-hidden="true" className={`pointer-events-none absolute z-20 hidden h-8 w-8 sm:block ${p}`}>
          {corner}
        </span>
      ))}
    </>
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
