"use client";

import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import SectionIntro from "@/components/SectionIntro";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";

/**
 * Explore More section (Row 53) —
 * Focused 2-card showcase displaying Baina Boxes and Single Stalls,
 * directly linking customers to their respective dedicated booking flows.
 */
export default function TopCategories() {
  const { lang, t } = useLang();
  const { services } = useHomeContent();

  const bainaImage =
    services.bainaBox?.image ||
    "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80";

  const singleStallImage =
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80";

  return (
    <section
      id="services"
      className="relative mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16"
    >
      <SectionIntro
        eyebrow={t("Explore More", "और देखें")}
        title={lang === "hi" ? services.headingHi : services.heading}
        subtitle={lang === "hi" ? services.subtitleHi : services.subtitle}
      />

      <div className="mt-10 grid grid-cols-1 gap-6 sm:mt-12 md:grid-cols-2 lg:gap-8">
        {/* ── 1. Baina Boxes Card ── */}
        <Reveal>
          <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-card border border-maroon/15 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-maroon/30 hover:shadow-pop sm:p-7">
            <div>
              {/* Media banner */}
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-cream/30">
                <Image
                  src={bainaImage}
                  alt={t("Baina Boxes", "बैना बॉक्स")}
                  fill
                  sizes="(min-width: 1024px) 560px, (min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  unoptimized={isUnoptimized(bainaImage)}
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent"
                />
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-maroon shadow-sm backdrop-blur-sm">
                  {t("From ₹599 / box", "₹599 / बॉक्स से")}
                </span>
                <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-semibold text-cream backdrop-blur-sm">
                  {t("Gifting & Sweet Boxes", "मिठाई और गिफ्ट बॉक्स")}
                </span>
              </div>

              {/* Text info */}
              <div className="mt-5">
                <p className="eyebrow text-xs font-semibold uppercase tracking-[0.18em] text-maroon">
                  {t("Iconic Sweet Houses", "मशहूर मिठाई घराने")}
                </p>
                <h3 className="mt-1 font-display text-2xl font-normal text-ink sm:text-3xl">
                  {t("Baina Boxes", "बैना बॉक्स")}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {t(
                    "Handcrafted sweet gift hampers, wedding bhaji, and festive boxes curated from Lucknow's iconic brands like Ram Asrey, Chhappan Bhog, and Hazelnut Factory.",
                    "राम आसरे, छप्पन भोग और हेज़लनट फैक्ट्री जैसे मशहूर ब्रांड्स के प्रीमियम बैना बॉक्स, मिठाई गिफ्ट हैंपर और शादी की भाजी — खूबसूरती से पैक की हुई।",
                  )}
                </p>

                {/* Key Highlights */}
                <ul className="mt-4 space-y-1.5 border-t border-cream/70 pt-3 text-xs text-ink-soft">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rotate-45 bg-maroon" />
                    <span>{t("Verified iconic sweet houses & halwais", "वेरिफाइड मशहूर मिठाई ब्रांड्स व हलवाई")}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rotate-45 bg-maroon" />
                    <span>{t("Custom quantities & elegant gift packaging", "कस्टम मात्रा व आकर्षक गिफ्ट पैकेजिंग")}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Action CTA */}
            <div className="mt-6 pt-2">
              <Link
                href="/baina-box"
                className="btn-sheen inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-maroon px-6 text-sm font-bold text-cream shadow-card transition-all hover:brightness-110 hover:shadow-pop active:scale-[0.98]"
              >
                <span>{t("Explore Baina Boxes", "बैना बॉक्स देखें")}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </Reveal>

        {/* ── 2. Single Stalls Card ── */}
        <Reveal>
          <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-card border border-maroon/15 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-maroon/30 hover:shadow-pop sm:p-7">
            <div>
              {/* Media banner */}
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-cream/30">
                <Image
                  src={singleStallImage}
                  alt={t("Single Stalls", "सिंगल स्टॉल")}
                  fill
                  sizes="(min-width: 1024px) 560px, (min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  unoptimized={isUnoptimized(singleStallImage)}
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent"
                />
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-maroon shadow-sm backdrop-blur-sm">
                  {t("From ₹60 / plate", "₹60 / प्लेट से")}
                </span>
                <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-semibold text-cream backdrop-blur-sm">
                  {t("Live Counters & Food Stalls", "लाइव काउंटर और फूड स्टॉल")}
                </span>
              </div>

              {/* Text info */}
              <div className="mt-5">
                <p className="eyebrow text-xs font-semibold uppercase tracking-[0.18em] text-maroon">
                  {t("Dedicated Specialists", "समर्पित स्पेशलिस्ट")}
                </p>
                <h3 className="mt-1 font-display text-2xl font-normal text-ink sm:text-3xl">
                  {t("Single Stalls", "सिंगल स्टॉल")}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {t(
                    "Book standalone food stations and live counters — authentic Chaat, Dosa, street food, and specialty delicacies prepared live by verified stall masters.",
                    "वेरिफाइड स्पेशलिस्ट के साथ सिंगल फूड स्टॉल बुक करें — लाइव चाट, डोसा, स्ट्रीट फूड और खास व्यंजन जो लाइव तैयार किए जाते हैं।",
                  )}
                </p>

                {/* Key Highlights */}
                <ul className="mt-4 space-y-1.5 border-t border-cream/70 pt-3 text-xs text-ink-soft">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rotate-45 bg-maroon" />
                    <span>{t("Dedicated single-vendor food stalls", "एक वेंडर का समर्पित सिंगल फूड स्टॉल")}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rotate-45 bg-maroon" />
                    <span>{t("Verified stall masters & live station setup", "वेरिफाइड मास्टर शेफ व लाइव स्टेशन सेटअप")}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Action CTA */}
            <div className="mt-6 pt-2">
              <Link
                href="/book/stall"
                className="btn-sheen inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-maroon px-6 text-sm font-bold text-cream shadow-card transition-all hover:brightness-110 hover:shadow-pop active:scale-[0.98]"
              >
                <span>{t("Book a Single Stall", "सिंगल स्टॉल बुक करें")}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
