"use client";

import Link from "next/link";
import { navLinks } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { useSiteContent } from "@/lib/sitePages";

/**
 * Compact three-part footer for the ad pages and /home-recreate:
 * tagline strip → "app coming soon" block → link footer.
 * Brand only: the four brand colours (alpha for soft text/lines), Ananda
 * Neptouch 2 for the two display lines, Open Sans for everything else.
 */
export default function AdFooter({ tabBarPad = false }: { tabBarPad?: boolean }) {
  return (
    // site-footer-mobile: pages that end on their own content (mobileChrome.ts)
    // hide the footer on phones through html.hide-mobile-footer.
    <div className="site-footer-mobile w-full lg:block">
      <TaglineStrip />
      <AppSection />
      <LinkFooter tabBarPad={tabBarPad} />
    </div>
  );
}

/* ── 1. Tagline strip ────────────────────────────────────────────────── */

/** The site footer's original tagline band (pots either side), shown at every width. */
function TaglineStrip() {
  const { t } = useLang();
  return (
    <section className="bg-maroon">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 border-y border-cream/10 px-4 py-6 sm:px-5 text-center sm:gap-8 lg:py-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bhoj7.png" alt="" width={424} height={538} className="h-10 w-auto shrink-0 sm:h-16" />
        <p className="font-display text-[15px] leading-snug text-cream sm:text-2xl">
          {t("Har Celebration Khaas Hai,", "हर सेलिब्रेशन खास है,")}
          <br />
          {t("Bhojpatra Ke Saath", "भोजपत्र के साथ")}
          <br className="sm:hidden" /> {t("Aur Bhi Yaadgaar Hai.", "और भी यादगार है।")}
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bhoj7.png" alt="" width={424} height={538} className="h-10 w-auto shrink-0 sm:h-16" />
      </div>
    </section>
  );
}

/* ── 2. App coming soon ──────────────────────────────────────────────── */

function AppSection() {
  const { t } = useLang();
  return (
    <section className="overflow-hidden border-b border-black/5 bg-white">
      <div className="mx-auto grid max-w-4xl items-center gap-8 px-4 pb-6 pt-7 sm:px-6 sm:py-8 lg:grid-cols-[1fr_auto] lg:gap-16 lg:py-0">
        <div className="flex flex-col items-center text-center lg:items-start lg:py-10 lg:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1 text-xs font-semibold text-maroon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden="true">
              <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
              <path d="M10.5 18.5h3" strokeLinecap="round" />
            </svg>
            {t("Mobile app coming soon", "मोबाइल ऐप जल्द आ रहा है")}
          </span>
          <h2 className="font-display mt-3 text-[28px] leading-tight text-maroon sm:text-4xl">
            {t("Your celebrations,", "आपके उत्सव,")}
            <br />
            {t("now in your pocket.", "अब आपकी जेब में।")}
          </h2>
          <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-black/70">
            {t(
              "Book, manage and plan your events anytime, anywhere.",
              "कभी भी, कहीं भी अपने इवेंट बुक करें, मैनेज करें और प्लान करें।",
            )}
          </p>
          <div className="mt-5 grid w-full max-w-[16rem] gap-2.5 sm:flex sm:max-w-none sm:flex-wrap sm:justify-center lg:justify-start">
            <StoreBadge store="Google Play" icon={<PlayIcon />} />
            <StoreBadge store="App Store" icon={<AppleIcon />} />
          </div>
        </div>
        {/* Desktop: scan to open the website (the app isn't live yet) */}
        <div className="hidden lg:block">
          <QrCard />
        </div>
      </div>
    </section>
  );
}

function StoreBadge({ store, icon }: { store: string; icon: React.ReactNode }) {
  return (
    <span className="inline-flex h-12 items-center justify-center gap-3 rounded-xl bg-black px-4 text-white sm:h-[52px] sm:justify-start sm:px-5">
      {icon}
      <span className="text-left leading-none">
        <span className="block text-[10px] font-semibold uppercase tracking-wide sm:text-[11px]">Coming soon on</span>
        <span className="mt-1 block text-lg font-semibold tracking-tight sm:text-xl">{store}</span>
      </span>
    </span>
  );
}

function QrCard() {
  const { t } = useLang();
  return (
    <figure className="flex w-48 flex-col items-center rounded-2xl border border-cream bg-white p-4 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-16px_rgba(0,0,0,0.18)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/qr-website.svg"
        alt={t("QR code for www.bhojpatra.co.in", "www.bhojpatra.co.in का QR कोड")}
        width={160}
        height={160}
        className="h-40 w-40"
      />
      <figcaption className="mt-3 text-xs leading-snug text-black/70">
        {t("Scan to visit", "स्कैन करें और देखें")}
        <span className="block font-semibold text-maroon">www.bhojpatra.co.in</span>
      </figcaption>
    </figure>
  );
}

/* ── 3. Link footer ──────────────────────────────────────────────────── */

function LinkFooter({ tabBarPad }: { tabBarPad: boolean }) {
  const { lang, t } = useLang();
  const { contact } = useSiteContent();
  const insta = `https://www.instagram.com/${contact.instagram.replace(/^@/, "")}`;
  const year = new Date().getFullYear();

  const explore = navLinks.map((l) => ({ href: l.href, label: lang === "hi" ? l.labelHi : l.label }));
  const company = [
    { href: "/about", label: t("About Us", "हमारे बारे में") },
    { href: "/contact", label: t("Contact", "संपर्क") },
    { href: "/terms", label: t("Terms & Privacy", "नियम और गोपनीयता") },
    { href: "/refund", label: t("Refund Policy", "रिफंड नीति") },
  ];
  const touch = (
    <ul className="space-y-1.5 text-sm text-white/80">
      <li>
        <a href={`mailto:${contact.email}`} className="flex items-center gap-2.5 transition-colors hover:text-white">
          <MailIcon />
          <span className="min-w-0 break-words">{contact.email}</span>
        </a>
      </li>
      <li>
        <a href={`https://${contact.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 transition-colors hover:text-white">
          <GlobeIcon />
          {contact.website}
        </a>
      </li>
      <li className="flex items-start gap-2.5">
        <PinIcon className="mt-0.5 h-4 w-4 shrink-0" />
        {contact.address}
      </li>
    </ul>
  );

  return (
    <footer
      className={`bg-maroon text-white ${
        tabBarPad ? "pb-[calc(var(--tab-bar-h)+var(--safe-bottom)+var(--booking-bar-h,0px))] lg:pb-0" : ""
      }`}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Desktop */}
        <div className="hidden grid-cols-[1.3fr_1fr_1fr_1.4fr] gap-10 pt-5 lg:grid">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bhojpatra-logo1.png" alt="bhojpatra" width={460} height={543} className="h-auto w-14" />
            <p className="mt-2 text-sm text-white/80">{t("Feast Booking Platform", "भोज बुकिंग प्लेटफॉर्म")}</p>
            <a href={insta} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm text-white/80 transition-colors hover:text-white">
              <InstaIcon />
              {contact.instagram}
            </a>
          </div>
          <Column title={t("Explore", "एक्सप्लोर")} links={explore} />
          <Column title={t("Company", "कंपनी")} links={company} />
          <div>
            <Heading>{t("Get in touch", "संपर्क करें")}</Heading>
            {touch}
          </div>
        </div>

        {/* Phone */}
        <div className="pt-4 lg:hidden">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bhojpatra-logo1.png" alt="bhojpatra" width={460} height={543} className="h-auto w-10" />
            <div className="min-w-0">
              <p className="text-sm">{t("Feast Booking Platform", "भोज बुकिंग प्लेटफॉर्म")}</p>
              <a href={insta} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-white/80">
                <InstaIcon />
                {contact.instagram}
              </a>
            </div>
          </div>
          <div className="mt-3 divide-y divide-white/15 border-t border-white/15">
            <Fold title={t("Explore", "एक्सप्लोर")}>
              <LinkList links={explore} />
            </Fold>
            <Fold title={t("Company", "कंपनी")}>
              <LinkList links={company} />
            </Fold>
            <Fold title={t("Get in touch", "संपर्क करें")}>{touch}</Fold>
          </div>
        </div>

      </div>

      {/* Cream line-art skyline at half tone, from the supplied footer art */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/footer-skyline-mobile.png" alt="" aria-hidden="true" width={887} height={60} className="mt-3 block h-auto w-full lg:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/footer-skyline-desktop.png" alt="" aria-hidden="true" width={2000} height={72} className="-mt-6 hidden h-auto w-full lg:block" />
      <p className="px-4 py-2.5 text-center text-[11px] text-white/70 lg:text-xs">
        © {year} Bhojpatra · Norion India Pvt Ltd. {t("All rights reserved.", "सर्वाधिकार सुरक्षित।")}
      </p>
    </footer>
  );
}

type FooterLink = { href: string; label: string };

function Heading({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-cream">{children}</p>;
}

function Column({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <Heading>{title}</Heading>
      <LinkList links={links} />
    </div>
  );
}

function LinkList({ links }: { links: FooterLink[] }) {
  return (
    <ul className="space-y-1.5 text-sm text-white/80 lg:space-y-1">
      {links.map((l) => (
        <li key={l.href}>
          <Link href={l.href} className="transition-colors hover:text-white">
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Fold({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-cream [&::-webkit-details-marker]:hidden">
        {title}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="pb-3">{children}</div>
    </details>
  );
}

/* ── Icons ───────────────────────────────────────────────────────────── */

const ico = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Google Play mark in its official colours, as on the store badge. */
function PlayIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" aria-hidden="true">
      <path fill="#00d7fe" d="M7 4.5 26.4 24 7 43.5c-.6-.4-1-1.2-1-2.1V6.6c0-.9.4-1.7 1-2.1Z" />
      <path fill="#32bb5d" d="M7 4.5c.7-.5 1.7-.6 2.6 0l22.6 13L26.4 24Z" />
      <path fill="#f5363e" d="M26.4 24 32.2 30.5l-22.6 13c-.9.5-1.9.5-2.6 0Z" />
      <path fill="#fcc400" d="m32.2 17.5 7 4c1.6.9 1.6 4.1 0 5l-7 4L26.4 24Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" aria-hidden="true">
      <path d="M16.4 12.7c0-2 1.6-3 1.7-3a3.7 3.7 0 0 0-2.9-1.6c-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7a3.9 3.9 0 0 0-3.3 2c-1.4 2.5-.4 6.1 1 8.1.7 1 1.4 2.1 2.4 2 1-.04 1.3-.6 2.5-.6 1.2 0 1.5.6 2.6.6 1 0 1.7-1 2.3-2a8.7 8.7 0 0 0 1-2.1 3.6 3.6 0 0 1-2.2-3.4ZM14.5 6.5a3.5 3.5 0 0 0 .8-2.5 3.6 3.6 0 0 0-2.3 1.2 3.3 3.3 0 0 0-.8 2.4 3 3 0 0 0 2.3-1.1Z" />
    </svg>
  );
}

function InstaIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico} className="h-4 w-4 shrink-0" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico} className="h-4 w-4 shrink-0" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="m3 6.5 9 6.5 9-6.5" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico} className="h-4 w-4 shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M2.5 12h19M12 2.5c2.6 2.8 3.8 6 3.8 9.5s-1.2 6.7-3.8 9.5c-2.6-2.8-3.8-6-3.8-9.5s1.2-6.7 3.8-9.5Z" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" {...ico} className={className} aria-hidden="true">
      <path d="M12 21.5s-7-6.3-7-11.8a7 7 0 0 1 14 0c0 5.5-7 11.8-7 11.8Z" />
      <circle cx="12" cy="9.7" r="2.6" />
    </svg>
  );
}

