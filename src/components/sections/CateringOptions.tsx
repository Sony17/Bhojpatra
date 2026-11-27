"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { useLang } from "@/lib/i18n";
import { CuratedEnquiryPopup } from "@/components/sections/CuratedEnquiry";

/**
 * Catering: the three ways to book food with Bhojpatra. Each rounded card has
 * a photo with an overlapping icon badge, a title, a two-line description and
 * a centred action (the middle one filled). A snap-scroll row on phones.
 *
 * `multiBrandPackages`: when given, Multi-Brand Feast Booking opens these
 * packages under the cards (instead of going to /book) and they stay hidden
 * until then. Bhojpatra Special opens the curated-package WhatsApp enquiry.
 */
export default function CateringOptions({ multiBrandPackages }: { multiBrandPackages?: ReactNode }) {
  const { t } = useLang();
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [packagesOpen, setPackagesOpen] = useState(false);
  const packagesRef = useRef<HTMLDivElement>(null);
  const openPackages = () => {
    setPackagesOpen(true);
    // Wait a frame so the packages exist before scrolling to them.
    requestAnimationFrame(() => packagesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const options: {
    key: string;
    href: string;
    img: string;
    icon: ReactNode;
    title: string;
    text: string;
    cta: string;
    primary?: boolean;
    action?: "packages" | "enquiry";
  }[] = [
    {
      key: "stall",
      href: "/book/stall",
      img: "/gallery/event-2.jpg",
      icon: <StallIcon />,
      title: t("Single Brand Food Stall", "सिंगल ब्रांड फूड स्टॉल"),
      text: t(
        "A signature food experience with one curated brand for your event.",
        "आपके इवेंट के लिए एक चुने हुए ब्रांड के साथ खास खाने का अनुभव।",
      ),
      cta: t("Book Now", "अभी बुक करें"),
    },
    {
      key: "multi",
      href: "/book",
      img: "/gallery/event-1.jpg",
      icon: <ClocheIcon />,
      title: t("Multi-Brand Feast Booking", "मल्टी-ब्रांड भोज बुकिंग"),
      text: t(
        "Bring together multiple cuisines and live food stalls for a diverse feast.",
        "कई व्यंजन और लाइव फूड स्टॉल एक साथ, एक शानदार भोज के लिए।",
      ),
      cta: t("Plan Your Feast", "अपना भोज प्लान करें"),
      primary: true,
      action: multiBrandPackages ? "packages" : undefined,
    },
    {
      key: "special",
      href: "/service-packages",
      img: "/gallery/event-5.jpg",
      icon: <CrownIcon />,
      title: t("Bhojpatra Special Packages", "भोजपत्र स्पेशल पैकेज"),
      text: t(
        "Thoughtfully curated catering experiences for weddings and large celebrations.",
        "शादियों और बड़े उत्सवों के लिए सोच-समझकर चुनी गई कैटरिंग।",
      ),
      cta: t("Get a Custom Plan", "कस्टम प्लान पाएं"),
      action: "enquiry",
    },
  ];

  const cardCls =
    "group flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white text-left shadow-[0_2px_6px_rgba(0,0,0,0.05),0_16px_36px_-18px_rgba(0,0,0,0.25)] ring-1 ring-cream transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_4px_10px_rgba(0,0,0,0.06),0_26px_46px_-22px_rgba(185,32,37,0.4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon";

  return (
    <section id="catering">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-maroon">
          <span aria-hidden="true" className="h-px w-8 bg-maroon/40" />
          {t("Catering", "कैटरिंग")}
          <span aria-hidden="true" className="h-px w-8 bg-maroon/40" />
        </p>
        <h2 className="font-display mt-2 text-center text-3xl leading-tight text-maroon sm:text-[42px]">
          {t("Choose how you feast", "चुनें कैसे हो आपका भोज")}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-black/70 sm:text-base">
          {t(
            "Curated catering experiences for every celebration, size and style.",
            "हर उत्सव, हर आकार और हर अंदाज़ के लिए चुनी हुई कैटरिंग।",
          )}
        </p>

        <ul className="-mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:mt-8 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
          {options.map((o) => {
            const body = (
              <>
                <span className="relative block aspect-[16/8] w-full overflow-hidden">
                  <Image
                    src={o.img}
                    alt=""
                    fill
                    sizes="(min-width:1024px) 33vw, 82vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                  />
                </span>
                <span className="relative z-10 -mt-8 ml-5 flex h-14 w-14 items-center justify-center rounded-full bg-white text-maroon shadow-[0_6px_16px_-6px_rgba(0,0,0,0.3)] [&_svg]:h-7 [&_svg]:w-7">
                  {o.icon}
                </span>
                <span className="flex flex-1 flex-col px-5 pb-6 pt-2">
                  <span className="font-display text-[22px] leading-tight text-maroon sm:text-2xl">{o.title}</span>
                  <span className="mt-1.5 flex-1 text-sm leading-relaxed text-black/75">{o.text}</span>
                  <span
                    className={
                      "mx-auto mt-6 inline-flex items-center gap-2 rounded-full px-7 py-2.5 text-sm font-semibold transition-colors " +
                      (o.primary
                        ? "bg-maroon text-white shadow-[0_8px_18px_-8px_rgba(185,32,37,0.8)]"
                        : "border-[1.5px] border-maroon text-maroon group-hover:bg-maroon group-hover:text-white")
                    }
                  >
                    {o.cta}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </span>
              </>
            );
            return (
              <li key={o.key} className="w-[82vw] max-w-[340px] shrink-0 snap-start lg:w-auto lg:max-w-none">
                {o.action ? (
                  <button
                    type="button"
                    onClick={() => (o.action === "packages" ? openPackages() : setEnquiryOpen(true))}
                    aria-expanded={o.action === "packages" ? packagesOpen : undefined}
                    className={cardCls}
                  >
                    {body}
                  </button>
                ) : (
                  <Link href={o.href} className={cardCls}>
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {multiBrandPackages && packagesOpen && (
        <div ref={packagesRef} className="scroll-mt-24">
          {multiBrandPackages}
        </div>
      )}
      <CuratedEnquiryPopup open={enquiryOpen} onClose={() => setEnquiryOpen(false)} />
    </section>
  );
}

const ico = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function StallIcon() {
  return (
    <svg {...ico}>
      <path d="M4 9h16l-1.5-4h-13ZM4 9c0 1.4 1.1 2.5 2.5 2.5S9 10.4 9 9c0 1.4 1.1 2.5 2.5 2.5h1C13.9 11.5 15 10.4 15 9c0 1.4 1.1 2.5 2.5 2.5S20 10.4 20 9" />
      <path d="M5.5 11.5V20h13v-8.5M5.5 16h13" />
    </svg>
  );
}
function ClocheIcon() {
  return (
    <svg {...ico}>
      <path d="M3 18h18M5 18a7 7 0 0 1 14 0M12 8V6M10 6h4" />
    </svg>
  );
}
function CrownIcon() {
  return (
    <svg {...ico}>
      <path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 10H5Z" />
      <path d="M5 21h14" />
    </svg>
  );
}
