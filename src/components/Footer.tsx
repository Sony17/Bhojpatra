"use client";

import { navLinks } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { useSiteContent } from "@/lib/sitePages";

export default function Footer() {
  const { lang, t } = useLang();
  const { contact } = useSiteContent();
  return (
    <>
      <section className="bg-maroon-dark">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-4 border-y border-cream/10 px-5 py-10 text-center sm:gap-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/bhoj7.png"
            alt=""
            width={424}
            height={538}
            className="h-12 w-auto shrink-0 sm:h-16"
          />
          <p className="font-display text-xl leading-snug text-cream sm:text-2xl">
            {t("Har Celebration Khaas Hai,", "हर सेलिब्रेशन खास है,")}
            <br />
            {t("Bhojpatra Ke Saath Aur Bhi Yaadgaar Hai.", "भोजपत्र के साथ और भी यादगार है।")}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/bhoj7.png"
            alt=""
            width={424}
            height={538}
            className="h-12 w-auto shrink-0 sm:h-16"
          />
        </div>
      </section>
      <section className="bg-white text-black">
        <div className="mx-auto grid max-w-7xl [zoom:0.75] items-center gap-24 px-5 py-7 sm:py-8 lg:grid-cols-2 lg:gap-48">
          <div className="text-center lg:text-right">
            <span className="inline-flex items-center gap-2 rounded-full bg-maroon px-3 py-1 text-xs font-semibold tracking-wide text-cream">
              <span className="h-1.5 w-1.5 rounded-full bg-cream" />
              {t("Mobile App Coming Soon", "मोबाइल ऐप जल्द आ रहा है")}
            </span>
            <h2 className="font-display mt-4 text-3xl leading-tight text-maroon sm:text-4xl">
              {t("Your Celebrations,", "आपके उत्सव,")}
              <br />
              {t("Now in Your Pocket", "अब आपकी जेब में")}
            </h2>
            <p className="mt-3 text-sm text-black/70 sm:text-base">
              {t(
                "Book, manage and plan your events anytime, anywhere.",
                "कभी भी, कहीं भी अपने इवेंट बुक करें, मैनेज करें और प्लान करें।",
              )}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-end">
              <span className="inline-flex items-center gap-3 rounded-xl bg-black px-4 py-2.5 text-left text-cream">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
                  <path d="M3.6 2.3a1 1 0 0 0-.6.92v17.56a1 1 0 0 0 .6.92L13.4 12 3.6 2.3Zm11.2 8.3 2.5-2.5-9-5.1 6.5 7.6Zm0 2.8-6.5 7.6 9-5.1-2.5-2.5Zm4.2-4.6-2.1 2.1 2.1 2.1 2.4-1.4a1 1 0 0 0 0-1.4l-2.4-1.4Z" />
                </svg>
                <span className="leading-tight">
                  <span className="block text-[10px] uppercase opacity-80">{t("Coming soon on", "जल्द आ रहा है")}</span>
                  <span className="block text-sm font-semibold">Google Play</span>
                </span>
              </span>
              <span className="inline-flex items-center gap-3 rounded-xl bg-black px-4 py-2.5 text-left text-cream">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
                  <path d="M16.4 12.7c0-2 1.6-3 1.7-3a3.7 3.7 0 0 0-2.9-1.6c-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7a3.9 3.9 0 0 0-3.3 2c-1.4 2.5-.4 6.1 1 8.1.7 1 1.4 2.1 2.4 2 1-.04 1.3-.6 2.5-.6 1.2 0 1.5.6 2.6.6 1 0 1.7-1 2.3-2a8.7 8.7 0 0 0 1-2.1 3.6 3.6 0 0 1-2.2-3.4ZM14.5 6.5a3.5 3.5 0 0 0 .8-2.5 3.6 3.6 0 0 0-2.3 1.2 3.3 3.3 0 0 0-.8 2.4 3 3 0 0 0 2.3-1.1Z" />
                </svg>
                <span className="leading-tight">
                  <span className="block text-[10px] uppercase opacity-80">{t("Coming soon on the", "जल्द आ रहा है")}</span>
                  <span className="block text-sm font-semibold">App Store</span>
                </span>
              </span>
            </div>
          </div>
          <div className="flex h-[260px] items-start justify-center overflow-hidden px-10 pt-10 lg:justify-start">
            {/* tilted phone — cropped to show top half */}
            <div className="relative h-[420px] w-[210px] -rotate-[8deg] rounded-[2.5rem] bg-black p-1.5 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.55)]">
              <div className="absolute left-1/2 top-3 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
              <div className="flex h-full w-full flex-col items-center overflow-hidden rounded-[2rem] bg-white px-5 pt-12 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/bhojpatra-logo.png"
                    alt="bhojpatra"
                    width={910}
                    height={250}
                    className="h-8 w-auto"
                  />
                  <p className="mt-1 text-[11px] text-black/60">
                    {t("Your Celebrations, Now in Your Pocket", "आपके उत्सव, अब आपकी जेब में")}
                  </p>
                  <div className="mt-5 w-full space-y-2.5">
                    <div className="h-9 rounded-xl bg-maroon/10" />
                    <div className="h-9 rounded-xl bg-maroon/10" />
                    <div className="h-9 rounded-xl bg-maroon/10" />
                    <div className="mt-4 h-10 rounded-xl bg-maroon" />
                  </div>
                </div>
              </div>
            </div>
          </div>
      </section>
    <footer className="bg-maroon-dark pb-[calc(4.5rem+env(safe-area-inset-bottom))] text-cream/80 lg:pb-0">
      <div className="mx-auto max-w-7xl px-5 py-12">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 text-center sm:grid-cols-4 sm:gap-x-6 sm:text-left">
          <div className="col-span-2 flex flex-col items-center sm:col-span-1 sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/bhojpatra-logo1.png"
              alt="bhojpatra"
              width={460}
              height={543}
              className="h-auto w-32"
            />
            <a
              href={`https://www.instagram.com/${contact.instagram.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm text-cream/70 hover:text-cream"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
              @bhojpatraofficial
            </a>
          </div>

          <div>
            <p className="eyebrow mb-3 text-xs font-semibold text-cream">{t("Explore", "एक्सप्लोर")}</p>
            <ul className="space-y-2 text-sm">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="hover:text-cream">
                    {lang === "hi" ? link.labelHi : link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3 text-xs font-semibold text-cream">{t("Company", "कंपनी")}</p>
            <ul className="space-y-2 text-sm">
              <li><a href="/about" className="hover:text-cream">{t("About Us", "हमारे बारे में")}</a></li>
              <li><a href="/careers" className="hover:text-cream">{t("Careers", "करियर")}</a></li>
              <li><a href="/contact" className="hover:text-cream">{t("Contact", "संपर्क")}</a></li>
              <li><a href="/terms" className="hover:text-cream">{t("Terms & Privacy", "नियम और गोपनीयता")}</a></li>
            </ul>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <p className="eyebrow mb-3 text-xs font-semibold text-cream">{t("Get in touch", "संपर्क करें")}</p>
            <a href={`mailto:${contact.email}`} className="block text-sm text-cream/70 hover:text-cream">
              {contact.email}
            </a>
            <a href={`tel:+${contact.whatsapp}`} className="mt-1 block text-sm text-cream/70 hover:text-cream">
              {contact.phoneDisplay}
            </a>
            <a
              href={`https://${contact.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-sm text-cream/70 hover:text-cream"
            >
              {contact.website}
            </a>
            <p className="mt-1 text-sm text-cream/70">{contact.address}</p>
          </div>
        </div>

        <div className="mt-10 border-t border-cream/10 pt-6 text-center text-xs text-cream/50">
          © {new Date().getFullYear()} Bhojpatra · Norion India Pvt Ltd. {t("All rights reserved.", "सर्वाधिकार सुरक्षित।")}
        </div>
      </div>
    </footer>
    </>
  );
}
