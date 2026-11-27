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
    <div className="w-full">
      <TaglineStrip />
      <AppSection />
      <LinkFooter tabBarPad={tabBarPad} />
    </div>
  );
}

/* ── 1. Tagline strip ────────────────────────────────────────────────── */

function TaglineStrip() {
  const { t } = useLang();
  return (
    <section className="bg-maroon">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-3 sm:gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bhoj7.png" alt="" width={424} height={538} className="h-8 w-auto shrink-0 sm:h-9" />
        <p className="font-display text-center text-[15px] leading-snug text-cream sm:text-lg lg:text-xl">
          {t("Har celebration khaas hai,", "हर सेलिब्रेशन खास है,")}
          <br className="sm:hidden" /> {t("Bhojpatra ke saath aur bhi yaadgaar hai.", "भोजपत्र के साथ और भी यादगार है।")}
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bhoj7.png" alt="" width={424} height={538} className="h-8 w-auto shrink-0 sm:h-9" />
      </div>
    </section>
  );
}

/* ── 2. App coming soon ──────────────────────────────────────────────── */

function AppSection() {
  const { t } = useLang();
  return (
    <section className="overflow-hidden border-b border-black/5 bg-white">
      <div className="mx-auto grid max-w-4xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_auto] lg:gap-16 lg:py-0">
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
          <div className="mt-5 flex flex-wrap justify-center gap-2.5 lg:justify-start">
            <StoreBadge store="Google Play" icon={<PlayIcon />} />
            <StoreBadge store="App Store" icon={<AppleIcon />} />
          </div>
        </div>
        <div className="hidden h-[300px] items-start pt-10 lg:flex">
          <Phone />
        </div>
      </div>
    </section>
  );
}

function StoreBadge({ store, icon }: { store: string; icon: React.ReactNode }) {
  return (
    <span className="inline-flex h-11 items-center gap-2.5 rounded-lg bg-black px-4 text-white">
      {icon}
      <span className="text-left leading-none">
        <span className="block text-[9px] font-semibold uppercase tracking-wider text-white/70">Coming soon on</span>
        <span className="mt-0.5 block text-[15px] font-semibold">{store}</span>
      </span>
    </span>
  );
}

function Phone() {
  const { t } = useLang();
  const rows = [
    { label: t("Book Caterers", "कैटरर बुक करें"), icon: <ChefIcon /> },
    { label: t("Find Venues", "वेन्यू खोजें"), icon: <PinIcon className="h-4 w-4" /> },
    { label: t("Manage Events", "इवेंट मैनेज करें"), icon: <CalendarIcon /> },
  ];
  return (
    <div className="h-[400px] w-[200px] rotate-[6deg] rounded-[2.25rem] bg-black p-1.5 shadow-[0_24px_48px_-20px_rgba(0,0,0,0.35)]">
      <div className="relative h-full w-full overflow-hidden rounded-[1.9rem] bg-white">
        <div className="absolute left-1/2 top-2.5 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
        <div className="flex flex-col items-center px-4 pt-12 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bhojpatra-logo.png" alt="" width={894} height={226} className="h-auto w-32" />
          <p className="mt-2 text-[10px] leading-snug text-black/60">
            {t("Your celebrations, now in your pocket", "आपके उत्सव, अब आपकी जेब में")}
          </p>
          <div className="mt-5 w-full space-y-2">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center gap-2.5 rounded-xl bg-maroon/5 px-3 py-2.5 text-[11px] font-semibold text-black">
                <span className="text-maroon">{r.icon}</span>
                {r.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
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
    { href: "/careers", label: t("Careers", "करियर") },
    { href: "/contact", label: t("Contact", "संपर्क") },
    { href: "/terms", label: t("Terms & Privacy", "नियम और गोपनीयता") },
    { href: "/refund", label: t("Refund Policy", "रिफंड नीति") },
  ];
  const touch = (
    <ul className="space-y-2.5 text-sm text-white/80">
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
    // Background art (brand red + cream line skyline): a tall phone version and
    // a wide desktop version, pinned to the bottom so the skyline sits just
    // above the copyright. The spacer and copyright heights below follow the
    // art's proportions (skyline ≈ 13.4% / 7.2% of width, band under it
    // ≈ 14.5% / 2.85%).
    <footer
      className={`bg-maroon bg-[url('/footer-bg-mobile.webp')] bg-[length:100%_auto] bg-no-repeat text-white lg:bg-[url('/footer-bg-desktop.webp')] lg:bg-bottom ${
        tabBarPad
          ? "pb-[calc(var(--tab-bar-h)+var(--safe-bottom)+var(--booking-bar-h,0px))] [background-position:center_bottom_calc(var(--tab-bar-h)+var(--safe-bottom)+var(--booking-bar-h,0px))] lg:pb-0"
          : "bg-bottom"
      }`}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Desktop */}
        <div className="hidden grid-cols-[1.3fr_1fr_1fr_1.4fr] gap-10 pt-8 lg:grid">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bhojpatra-logo1.png" alt="bhojpatra" width={460} height={543} className="h-auto w-[72px]" />
            <p className="mt-3 text-sm text-white/80">{t("Feast Booking Platform", "भोज बुकिंग प्लेटफॉर्म")}</p>
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
        <div className="pt-6 lg:hidden">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bhojpatra-logo1.png" alt="bhojpatra" width={460} height={543} className="h-auto w-12" />
            <div className="min-w-0">
              <p className="text-sm">{t("Feast Booking Platform", "भोज बुकिंग प्लेटफॉर्म")}</p>
              <a href={insta} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-white/80">
                <InstaIcon />
                {contact.instagram}
              </a>
            </div>
          </div>
          <div className="mt-5 divide-y divide-white/15 border-t border-white/15">
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

      <div aria-hidden="true" className="h-[14vw] lg:h-[6.4vw]" />
      <p className="flex h-[14.5vw] items-center justify-center px-4 text-center text-xs text-white/70 lg:h-[2.85vw] lg:min-h-9">
        © {year} Bhojpatra · Norion India Pvt Ltd. {t("All rights reserved.", "सर्वाधिकार सुरक्षित।")}
      </p>
    </footer>
  );
}

type FooterLink = { href: string; label: string };

function Heading({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-cream">{children}</p>;
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
    <ul className="space-y-2 text-sm text-white/80">
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
      <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-xs font-semibold uppercase tracking-[0.12em] text-cream [&::-webkit-details-marker]:hidden">
        {title}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="pb-4">{children}</div>
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

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M3.6 2.3a1 1 0 0 0-.6.92v17.56a1 1 0 0 0 .6.92L13.4 12 3.6 2.3Zm11.2 8.3 2.5-2.5-9-5.1 6.5 7.6Zm0 2.8-6.5 7.6 9-5.1-2.5-2.5Zm4.2-4.6-2.1 2.1 2.1 2.1 2.4-1.4a1 1 0 0 0 0-1.4l-2.4-1.4Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
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

function ChefIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico} className="h-4 w-4" aria-hidden="true">
      <path d="M7 13.5V19h10v-5.5" />
      <path d="M7 13.5a4 4 0 0 1-.6-7.9A4.5 4.5 0 0 1 12 3a4.5 4.5 0 0 1 5.6 2.6 4 4 0 0 1-.6 7.9Z" />
      <path d="M7 16.5h10" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico} className="h-4 w-4" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </svg>
  );
}
