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
      tag: t("One brand", "एक ब्रांड"),
      title: t("Single Brand Food Stall", "सिंगल ब्रांड फूड स्टॉल"),
      text: t(
        "One famous brand, one live stall at your event.",
        "एक मशहूर ब्रांड, आपके इवेंट में एक लाइव स्टॉल।",
      ),
      cta: t("Book a stall", "स्टॉल बुक करें"),
    },
    {
      href: "/book",
      img: "/gallery/event-1.jpg",
      tag: t("Mix & match", "मिक्स एंड मैच"),
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
      tag: t("Curated", "चुना हुआ"),
      title: t("Bhojpatra Special", "भोजपत्र स्पेशल"),
      text: t(
        "Our signature packages, ready to book.",
        "हमारे खास पैकेज, बुक करने के लिए तैयार।",
      ),
      cta: t("See packages", "पैकेज देखें"),
    },
  ];

  return (
    <section id="catering" className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-maroon">
          {t("Catering", "कैटरिंग")}
        </p>
        <h2 className="font-display mt-2 text-center text-3xl leading-tight text-maroon sm:text-4xl">
          {t("Choose how you feast", "चुनें कैसे हो आपका भोज")}
        </h2>

        <ul className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-5">
          {options.map((o) => (
            <li key={o.href}>
              {multiBrandPackages && o.href === "/book" ? (
                <button
                  type="button"
                  onClick={openPackages}
                  aria-expanded={packagesOpen}
                  className="w-full text-left group flex h-full overflow-hidden border border-cream bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-16px_rgba(0,0,0,0.18)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_10px_rgba(0,0,0,0.06),0_20px_36px_-18px_rgba(185,32,37,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon sm:flex-col"
                >
                <span className="relative w-28 shrink-0 overflow-hidden sm:aspect-[16/10] sm:w-full">
                  <Image
                    src={o.img}
                    alt=""
                    fill
                    sizes="(min-width:640px) 33vw, 112px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                  <span aria-hidden="true" className="absolute inset-0 bg-black/20" />
                  <span className="absolute left-2 top-2 hidden bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-maroon sm:block">
                    {o.tag}
                  </span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col px-4 py-3 sm:p-5">
                  <span className="text-base font-bold leading-tight text-black sm:text-lg">{o.title}</span>
                  <span className="mt-1 flex-1 text-[13px] leading-snug text-black/70 sm:text-sm">{o.text}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-maroon sm:mt-4 sm:text-sm">
                    {o.cta}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </span>
              </button>
              ) : (
                <Link href={o.href} className="group flex h-full overflow-hidden border border-cream bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-16px_rgba(0,0,0,0.18)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_10px_rgba(0,0,0,0.06),0_20px_36px_-18px_rgba(185,32,37,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon sm:flex-col">
                <span className="relative w-28 shrink-0 overflow-hidden sm:aspect-[16/10] sm:w-full">
                  <Image
                    src={o.img}
                    alt=""
                    fill
                    sizes="(min-width:640px) 33vw, 112px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                  <span aria-hidden="true" className="absolute inset-0 bg-black/20" />
                  <span className="absolute left-2 top-2 hidden bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-maroon sm:block">
                    {o.tag}
                  </span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col px-4 py-3 sm:p-5">
                  <span className="text-base font-bold leading-tight text-black sm:text-lg">{o.title}</span>
                  <span className="mt-1 flex-1 text-[13px] leading-snug text-black/70 sm:text-sm">{o.text}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-maroon sm:mt-4 sm:text-sm">
                    {o.cta}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </span>
              </Link>
              )}
            </li>
          ))}
        </ul>

        {/* Custom route: opens the WhatsApp enquiry with an optional PDF */}
        <button
          type="button"
          onClick={() => setEnquiryOpen(true)}
          className="group mx-auto mt-5 flex w-full max-w-2xl items-center gap-3 border border-dashed border-maroon/40 bg-cream/30 px-4 py-3 text-left transition-colors hover:border-maroon hover:bg-cream/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon sm:mt-6 sm:px-5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-maroon text-white" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12Z" />
              <path d="M8.5 11h7M8.5 14h4" />
            </svg>
          </span>
          <span className="min-w-0 flex-1 text-sm leading-snug text-black/80">
            {t("None of these fit, or want a package curated just for you?", "इनमें से कोई फिट नहीं है, या अपने लिए एक खास पैकेज बनवाना चाहते हैं?")}{" "}
            <span className="font-display text-base text-maroon">{t("Contact Bhojpatra.", "भोजपत्र से संपर्क करें।")}</span>
          </span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 shrink-0 text-maroon transition-transform group-hover:translate-x-0.5" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
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
