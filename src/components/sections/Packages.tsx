"use client";

import { useState } from "react";
import Link from "next/link";
import { packages } from "@/lib/data";
import Reveal from "@/components/Reveal";
import PackageScrollCard from "@/components/packages/PackageScrollCard";
import { useLang } from "@/lib/i18n";
import { useSiteContent } from "@/lib/sitePages";
import { useHomeContent } from "@/lib/homeContent";

export default function Packages() {
  const { lang, t } = useLang();
  const { contact } = useSiteContent();
  const { packages: homePackages } = useHomeContent();
  const waText = t(
    "Hi Bhojpatra, none of the packages quite fit my event — I'd like a curated package.",
    "नमस्ते भोजपत्र, कोई भी पैकेज मेरे इवेंट के लिए पूरी तरह फिट नहीं है — मुझे एक कस्टम पैकेज चाहिए।",
  );
  const waLink = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(waText)}`;
  // Only the three headline tiers are shown here — Custom lives in the booking flow.
  // Admin-editable name / price (from the home-content store) override the
  // seed values; the menu structure stays sourced from `data.ts`.
  const tiers = packages
    .filter((p) => p.id !== "custom")
    .map((p) => {
      const meta = homePackages.tiers.find((x) => x.id === p.id);
      return meta
        ? { ...p, name: meta.name, nameHi: meta.nameHi, price: meta.price }
        : p;
    });
  // Pre-select the popular tier so a highlight is visible by default.
  const [selectedId, setSelectedId] = useState<string>(
    tiers.find((p) => p.popular)?.id ?? tiers[0].id,
  );

  return (
    <section
      id="packages"
      className="relative overflow-hidden py-20 sm:py-24"
    >
      <div className="relative w-full px-5 sm:px-8 lg:px-12">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl text-maroon sm:text-4xl">
            {lang === "hi" ? homePackages.headingHi : homePackages.heading}
          </h2>
          <p className="font-script mt-4 text-xl text-ink-soft sm:text-2xl">
            {lang === "hi" ? homePackages.subtitleHi : homePackages.subtitle}
          </p>
          <Ornament className="mx-auto mt-6 text-maroon/50" />
        </Reveal>

        <Reveal
          stagger
          from="right"
          className="mx-auto mt-12 grid max-w-6xl grid-cols-1 items-stretch gap-7 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3"
        >
          {tiers.map((tier) => {
            const selected = tier.id === selectedId;
            const tierName = lang === "hi" ? tier.nameHi : tier.name;
            return (
              <PackageScrollCard
                key={tier.id}
                tier={tier}
                selected={selected}
                onSelect={() => setSelectedId(tier.id)}
                cta={
                  <Link
                    href={`/book?package=${tier.id}&step=menu`}
                    onClick={() => setSelectedId(tier.id)}
                    aria-label={`${t("Book", "बुक करें")} ${tierName}`}
                    className="btn-sheen mx-auto mt-2 flex h-9 w-9 items-center justify-center rounded-full bg-maroon text-cream shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:scale-95"
                  >
                    <span aria-hidden="true" className="text-base leading-none">
                      →
                    </span>
                  </Link>
                }
              />
            );
          })}
        </Reveal>

        {/* Curated-package option — when no tier fits, reach out on WhatsApp. */}
        <Reveal className="mx-auto mt-10 max-w-2xl">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-maroon/20 bg-cream/40 px-6 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm text-ink-soft">
              {t(
                "None of these fit, or want a package curated just for you?",
                "इनमें से कोई फिट नहीं है, या अपने लिए एक खास पैकेज बनवाना चाहते हैं?",
              )}{" "}
              <span className="font-display text-maroon">
                {t("Contact Bhojpatra.", "भोजपत्र से संपर्क करें।")}
              </span>
            </p>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-sheen inline-flex shrink-0 items-center gap-2 rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:scale-95"
            >
              <WhatsAppIcon className="h-4 w-4" />
              <span className="font-display">
                {t("Chat on WhatsApp", "व्हाट्सएप पर चैट करें")}
              </span>
            </a>
          </div>
        </Reveal>

        {/* Disclaimer — echoes the reference footer note. */}
        <Reveal className="mx-auto mt-10 max-w-2xl">
          <p className="rounded-2xl border border-maroon/15 bg-cream/30 px-5 py-3 text-center text-sm text-ink-soft">
            {t(
              "Prices are approximate. Final price may vary as per menu & vendor selection.",
              "कीमतें अनुमानित हैं। अंतिम कीमत मेन्यू और वेंडर के चयन के अनुसार बदल सकती है।",
            )}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/** WhatsApp glyph — rendered in a single brand colour via currentColor. */
function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.46 9.46 0 01-4.82-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.45 9.45 0 01-1.45-5.04c0-5.22 4.25-9.47 9.48-9.47 2.53 0 4.91.99 6.7 2.78a9.42 9.42 0 012.77 6.7c0 5.22-4.25 9.47-9.47 9.47zm8.06-17.53A11.36 11.36 0 0012.04.5C5.76.5.65 5.61.65 11.89c0 2.01.53 3.98 1.53 5.71L.5 23.5l6.05-1.59a11.35 11.35 0 005.49 1.4h.01c6.28 0 11.39-5.11 11.39-11.39 0-3.04-1.18-5.9-3.34-8.05z" />
    </svg>
  );
}

/** Slim line–diamond–line flourish used under headings and titles. */
function Ornament({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex w-28 items-center justify-center gap-2 ${className}`}
    >
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-current opacity-70" />
      <span className="h-1.5 w-1.5 rotate-45 bg-current" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-current opacity-70" />
    </span>
  );
}
