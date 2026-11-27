"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useLang } from "@/lib/i18n";

/**
 * "Our Services" block: four service cards (Baina, Catering, Venues, Event Essentials) and a
 * one-bar trust strip. Brand colours only; Ananda Neptouch 2 for
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
        "Thoughtful gifting for every occasion",
        "हर मौके के लिए सोच-समझकर चुने उपहार",
      ),
      icon: <GiftIcon />,
    },
    {
      href: "/vendors",
      img: "/services/catering.jpg",
      alt: t("A lit buffet counter in front of a decorated mandap", "सजे मंडप के सामने रोशन बुफे काउंटर"),
      title: t("Catering", "कैटरिंग"),
      text: t(
        "Exceptional food, beautifully served",
        "बेहतरीन खाना, खूबसूरती से परोसा गया",
      ),
      icon: <ClocheIcon />,
    },
    {
      href: "/venues",
      img: "/services/venue-peepals-retreat.jpg",
      alt: t("The Peepal's Retreat venue lit up for an evening event", "शाम के इवेंट के लिए सजा द पीपल्स रिट्रीट वेन्यू"),
      title: t("Venues", "वेन्यू"),
      text: t(
        "Find the perfect celebration space",
        "अपने उत्सव के लिए सही जगह खोजें",
      ),
      icon: <BuildingIcon />,
    },
    {
      href: "/categories",
      img: "/gallery/event-3.jpg",
      alt: t("Lit buffet counters with decor at an evening event", "शाम के इवेंट में सजे हुए बुफे काउंटर"),
      title: t("Event Essentials", "इवेंट ज़रूरतें"),
      text: t(
        "Everything that completes your event",
        "वह सब कुछ जो आपके इवेंट को पूरा करे",
      ),
      icon: <SparkleIcon />,
    },
  ];

  const reasons = [
    { label: t("Verified Vendors", "सत्यापित वेंडर"), icon: <LaurelIcon /> },
    { label: t("Quality Assured", "गुणवत्ता की गारंटी"), icon: <ShieldIcon /> },
    { label: t("Transparent Pricing", "पारदर्शी कीमत"), icon: <RupeeIcon /> },
    { label: t("Dedicated Support", "समर्पित सहायता"), icon: <HeadsetIcon /> },
  ];

  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <p className="flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-maroon">
          <span aria-hidden="true" className="h-px w-8 bg-maroon/40" />
          {t("Explore our services", "हमारी सेवाएं देखें")}
          <span aria-hidden="true" className="h-px w-8 bg-maroon/40" />
        </p>
        <h2 className="font-display mt-2 text-center text-3xl leading-tight text-maroon sm:text-[42px]">
          {t("Plan your perfect celebration", "अपना परफेक्ट जश्न प्लान करें")}
        </h2>

        {/* Phones: one horizontal row card per service */}
        <ul className="mt-6 space-y-2.5 sm:hidden">
          {services.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="flex min-h-[5.75rem] items-stretch overflow-hidden rounded-2xl bg-white shadow-[0_8px_20px_-16px_rgba(0,0,0,0.3)] ring-1 ring-cream/70 transition-transform active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon"
              >
                <span className="relative w-[34%] shrink-0 overflow-hidden rounded-l-2xl">
                  <Image src={s.img} alt={s.alt} fill sizes="34vw" className="object-cover" />
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2.5 py-3 pl-2.5 pr-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-full bg-cream/45 text-maroon [&_svg]:h-4 [&_svg]:w-4">
                    {s.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-display block truncate text-[17px] leading-tight text-maroon">{s.title}</span>
                    <span className="mt-1 block line-clamp-2 text-[12.5px] leading-snug text-black/70">{s.text}</span>
                  </span>
                  <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream/45 text-maroon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </span>
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
              className="group flex flex-col overflow-hidden rounded-2xl bg-cream/35 shadow-[0_2px_6px_rgba(0,0,0,0.05),0_14px_32px_-16px_rgba(0,0,0,0.22)] ring-1 ring-cream transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_4px_10px_rgba(0,0,0,0.06),0_24px_44px_-20px_rgba(185,32,37,0.4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <Image
                  src={s.img}
                  alt={s.alt}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                />
              </div>
              <span className="relative z-10 -mt-7 ml-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-maroon shadow-[0_6px_16px_-6px_rgba(0,0,0,0.3)] [&_svg]:h-6 [&_svg]:w-6">
                {s.icon}
              </span>
              <div className="flex flex-1 items-end gap-3 px-5 pb-5 pt-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display whitespace-nowrap text-[21px] leading-tight text-black">{s.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-snug text-black/80">{s.text}</p>
                </div>
                <span
                  aria-hidden="true"
                  className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-maroon/50 text-maroon transition-colors group-hover:border-maroon group-hover:bg-maroon group-hover:text-white"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Trust strip: one rounded bar, four promises */}
        <div className="mt-6 rounded-2xl bg-cream/40 px-2 pb-5 pt-4 sm:mt-8 sm:px-6 sm:py-3.5">
        <p className="mb-4 text-center text-base font-semibold leading-tight text-black sm:hidden">
          {t("Your celebration,", "आपका उत्सव,")}
          <span className="font-display mt-0.5 block text-[22px] font-normal text-maroon">{t("our responsibility.", "हमारी ज़िम्मेदारी।")}</span>
        </p>
        <ul className="grid grid-cols-4 [&>li+li]:border-l [&>li+li]:border-maroon/15 sm:flex sm:items-center sm:justify-around">
          {reasons.map((r) => (
            <li key={r.label} className="flex flex-1 flex-col items-center justify-start gap-2 px-1 text-center text-[11.5px] font-medium leading-tight text-black sm:flex-row sm:justify-center sm:gap-2.5 sm:text-sm sm:font-semibold">
              <span className="text-maroon [&_svg]:h-6 [&_svg]:w-6">{r.icon}</span>
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

function LaurelIcon() {
  return (
    <svg {...ico} className="h-6 w-6">
      <path d="M8 20c-3-2-4.5-5-4.5-8.5S5 5.5 7.5 4M16 20c3-2 4.5-5 4.5-8.5S19 5.5 16.5 4" />
      <path d="M4 9.5c1.2.2 2.2.9 2.6 2M3.8 13.5c1.3 0 2.4.6 3 1.7M5.5 17c1.2-.3 2.4 0 3.2.9M20 9.5c-1.2.2-2.2.9-2.6 2M20.2 13.5c-1.3 0-2.4.6-3 1.7M18.5 17c-1.2-.3-2.4 0-3.2.9M12 9.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3Z" />
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

function HeadsetIcon() {
  return (
    <svg {...ico} className="h-6 w-6">
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
    </svg>
  );
}
