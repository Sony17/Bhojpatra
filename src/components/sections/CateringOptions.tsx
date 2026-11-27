"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { useLang } from "@/lib/i18n";
import { CuratedEnquiryPopup } from "@/components/sections/CuratedEnquiry";

/**
 * Catering: the three ways to book food with Bhojpatra, as wide photo cards
 * with a short line and a clear action. Brand colours only; Ananda Neptouch 2
 * for the section title, Open Sans for the rest.
 */
/**
 * `multiBrandPackages`: when given, Multi-Brand Feast Booking opens these
 * packages under the cards (instead of going to /book) and they stay hidden
 * until then.
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

  const options = [
    {
      href: "/book/stall",
      img: "/gallery/event-2.jpg",
      title: t("Single Brand Food Stall", "सिंगल ब्रांड फूड स्टॉल"),
      text: t(
        "One famous brand, one live stall at your event.",
        "एक मशहूर ब्रांड, आपके इवेंट में एक लाइव स्टॉल।",
      ),
      cta: t("Book now", "अभी बुक करें"),
    },
    {
      href: "/book",
      img: "/gallery/event-1.jpg",
      title: t("Multi-Brand Feast Booking", "मल्टी-ब्रांड भोज बुकिंग"),
      text: t(
        "Starters from one brand, mains from another, sweets from the best.",
        "स्टार्टर एक ब्रांड से, मेन कोर्स दूसरे से, मिठाई सबसे बेहतरीन से।",
      ),
      cta: t("Plan your feast", "अपना भोज प्लान करें"),
    },
    {
      href: "/service-packages",
      img: "/gallery/event-5.jpg",
      title: t("Bhojpatra Special Packages", "भोजपत्र स्पेशल पैकेज"),
      text: t(
        "None of these fit, or want a package curated just for you?",
        "इनमें से कोई फिट नहीं है, या अपने लिए एक खास पैकेज बनवाना चाहते हैं?",
      ),
      cta: t("Get a custom plan", "कस्टम प्लान पाएं"),
    },
  ];

  return (
    <section id="catering" className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-maroon">
          <span aria-hidden="true" className="h-px w-8 bg-maroon/40" />
          {t("Catering", "कैटरिंग")}
          <span aria-hidden="true" className="h-px w-8 bg-maroon/40" />
        </p>
        <h2 className="font-display mt-2 text-center text-3xl leading-tight text-maroon sm:text-[42px]">
          {t("Choose how you feast", "चुनें कैसे हो आपका भोज")}
        </h2>

        <ul className="-mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:mt-8 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
          {options.map((o) => {
            const body = (
              <>
                <span className="relative block aspect-[16/9] w-full overflow-hidden">
                  <Image
                    src={o.img}
                    alt=""
                    fill
                    sizes="(min-width:640px) 33vw, 80vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                  />
                </span>
                <span className="flex flex-1 flex-col p-4 sm:p-5">
                  <span className="text-base font-bold leading-tight text-black sm:text-lg">{o.title}</span>
                  <span className="mt-1 flex-1 text-[13px] leading-snug text-black/65 sm:text-sm">{o.text}</span>
                  <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-maroon px-5 py-2 text-[13px] font-semibold text-white shadow-[0_6px_16px_-8px_rgba(185,32,37,0.8)] transition-transform group-hover:-translate-y-0.5">
                    {o.cta}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </span>
              </>
            );
            // Multi-brand opens the packages here; Bhojpatra Special opens the
            // curated-package WhatsApp enquiry; the rest are plain links.
            const action =
              multiBrandPackages && o.href === "/book"
                ? "packages"
                : o.href === "/service-packages"
                  ? "enquiry"
                  : null;
            return (
              <li key={o.href} className="w-[68vw] max-w-[260px] shrink-0 snap-start sm:w-auto sm:max-w-none">
                {action ? (
                  <button
                    type="button"
                    onClick={() => (action === "packages" ? openPackages() : setEnquiryOpen(true))}
                    aria-expanded={o.href === "/book" ? packagesOpen : undefined}
                    className="group flex h-full w-full flex-col overflow-hidden border border-cream bg-white text-left shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_-18px_rgba(0,0,0,0.25)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_40px_-22px_rgba(185,32,37,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon"
                  >
                    {body}
                  </button>
                ) : (
                  <Link href={o.href} className="group flex h-full w-full flex-col overflow-hidden border border-cream bg-white text-left shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_-18px_rgba(0,0,0,0.25)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_40px_-22px_rgba(185,32,37,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon">
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
