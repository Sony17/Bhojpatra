"use client";

import Link from "next/link";
import { Lora } from "next/font/google";
import { navLinks } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { useSiteContent } from "@/lib/sitePages";

/**
 * New three-part footer from the ad design: tagline band → "app coming soon"
 * block with a tilted phone → red link footer. Used by the ad pages and
 * /home-recreate. Desktop (lg+) and phone layouts follow the two mockups.
 * Every colour is a brand token; depth comes from alpha of those colours only.
 */
const serif = Lora({ subsets: ["latin"], weight: ["500", "600", "700"], display: "swap" });

export default function AdFooter({ tabBarPad = false }: { tabBarPad?: boolean }) {
  return (
    <div className="w-full overflow-x-clip">
      <TaglineBand />
      <AppSection />
      <LinkFooter tabBarPad={tabBarPad} />
    </div>
  );
}

/* ── 1. Tagline band ─────────────────────────────────────────────────── */

function TaglineBand() {
  const { t } = useLang();
  return (
    <section className="relative overflow-hidden bg-maroon">
      <Vignette />
      <Mandala className="absolute -left-24 -top-24 h-72 w-72 lg:-left-16 lg:-top-28 lg:h-80 lg:w-80" />
      <Mandala className="absolute -right-24 -top-24 h-72 w-72 lg:-right-16 lg:-top-28 lg:h-80 lg:w-80" />
      <div className="relative mx-auto flex max-w-6xl items-center justify-center gap-4 px-4 py-6 sm:gap-8 lg:gap-10 lg:py-9">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bhoj7.png" alt="" width={424} height={538} className="h-12 w-auto shrink-0 lg:h-[76px]" />
        <div className="flex flex-col items-center">
          <p
            className={`${serif.className} text-center text-[17px] leading-[1.3] text-cream sm:text-2xl lg:text-[33px] lg:leading-[1.25]`}
          >
            <span className="lg:hidden">
              {t("Har celebration khaas hai,", "हर सेलिब्रेशन खास है,")}
              <br />
              {t("Bhojpatra ke saath", "भोजपत्र के साथ")}
              <br />
              {t("aur bhi yaadgaar hai.", "और भी यादगार है।")}
            </span>
            <span className="hidden lg:inline">
              {t("Har  celebration khaas hai,", "हर सेलिब्रेशन खास है,")}
              <br />
              {t("Bhojpatra ke saath aur bhi yaadgaar hai.", "भोजपत्र के साथ और भी यादगार है।")}
            </span>
          </p>
          <Flourish className="mt-2 w-36 lg:mt-3 lg:w-52" />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bhoj7.png" alt="" width={424} height={538} className="h-12 w-auto shrink-0 lg:h-[76px]" />
      </div>
    </section>
  );
}

/* ── 2. App coming soon ──────────────────────────────────────────────── */

function AppSection() {
  const { t } = useLang();
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-cream/20" aria-hidden="true" />
      <Leaf className="absolute right-6 top-4 hidden h-40 w-40 opacity-50 lg:block" />
      <div className="relative mx-auto grid max-w-6xl items-center px-4 pt-6 lg:grid-cols-[1.15fr_1fr] lg:px-20 lg:pt-0">
        {/* Copy */}
        <div className="flex flex-col items-center text-center lg:items-start lg:py-16 lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full bg-cream/70 px-4 py-1.5 text-[13px] font-semibold text-maroon lg:px-6 lg:py-2.5 lg:text-[17px]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 lg:h-5 lg:w-5" aria-hidden="true">
              <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
              <path d="M10.5 18.5h3" strokeLinecap="round" />
            </svg>
            {t("Mobile App Coming Soon", "मोबाइल ऐप जल्द आ रहा है")}
          </span>
          <h2
            className={`${serif.className} mt-3 text-[31px] font-bold leading-[1.05] tracking-[-0.01em] text-maroon lg:mt-7 lg:text-[54px]`}
          >
            {t("Your celebrations,", "आपके उत्सव,")}
            <br />
            {t("now in your ", "अब आपकी ")}
            <span className="relative inline-block">
              {t("pocket.", "जेब में।")}
              <Swoosh className="absolute -bottom-3 left-[6%] hidden w-[88%] lg:block" />
            </span>
          </h2>
          <p className="mt-3 max-w-[18rem] text-[16px] leading-snug text-black/80 lg:mt-8 lg:max-w-md lg:text-[23px]">
            {t(
              "Book, manage and plan your events anytime, anywhere.",
              "कभी भी, कहीं भी अपने इवेंट बुक करें, मैनेज करें और प्लान करें।",
            )}
          </p>
          <div className="mt-8 hidden gap-4 lg:flex">
            <StoreButtons />
          </div>
        </div>

        {/* Phone */}
        <div className="relative mt-4 flex h-[175px] justify-center lg:mt-0 lg:h-[460px]">
          <div className="absolute left-1/2 top-6 h-[260px] w-[260px] -translate-x-1/2 rounded-full bg-cream/30 lg:top-10 lg:h-[440px] lg:w-[440px]" aria-hidden="true" />
          <Rays className="absolute left-[14%] top-4 w-12 lg:left-[2%] lg:top-[90px] lg:w-20" />
          <Cloche className="absolute bottom-6 right-[-2%] hidden w-[150px] lg:block" />
          <Phone />
        </div>

        <div className="relative z-10 -mt-1 grid justify-items-center gap-2.5 pb-5 lg:hidden">
          <StoreButtons />
        </div>
      </div>
    </section>
  );
}

function Phone() {
  const { t } = useLang();
  const rows = [
    { label: t("Book Caterers", "कैटरर बुक करें"), icon: <ChefIcon /> },
    { label: t("Find Venues", "वेन्यू खोजें"), icon: <PinIcon /> },
    { label: t("Manage Events", "इवेंट मैनेज करें"), icon: <CalendarIcon /> },
  ];
  return (
    <div className="relative top-5 h-[330px] w-[185px] rotate-[8deg] rounded-[2rem] bg-black p-[5px] shadow-[0_30px_60px_-24px_rgba(0,0,0,0.5)] lg:top-8 lg:h-[560px] lg:w-[290px] lg:rotate-[12deg] lg:rounded-[3rem] lg:p-2">
      <div className="relative h-full w-full overflow-hidden rounded-[1.7rem] bg-white lg:rounded-[2.6rem]">
        <div className="flex items-center justify-between px-5 pt-2.5 text-[8px] font-semibold text-black lg:px-8 lg:pt-4 lg:text-[11px]">
          <span>9:41</span>
          <span className="flex items-center gap-1" aria-hidden="true">
            <svg viewBox="0 0 18 12" className="h-2 w-3 lg:h-2.5 lg:w-4" fill="currentColor">
              <rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="7" rx="1" />
              <rect x="10" y="2" width="3" height="10" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" />
            </svg>
            <svg viewBox="0 0 26 12" className="h-2 w-4 lg:h-2.5 lg:w-5" fill="none" stroke="currentColor">
              <rect x="0.5" y="0.5" width="22" height="11" rx="3" /><rect x="2.5" y="2.5" width="16" height="7" rx="1.5" fill="currentColor" />
              <path d="M24.5 4v4" strokeLinecap="round" />
            </svg>
          </span>
        </div>
        <div className="absolute left-1/2 top-2 h-4 w-16 -translate-x-1/2 rounded-full bg-black lg:top-3 lg:h-6 lg:w-24" />
        <div className="flex flex-col items-center px-4 pt-6 text-center lg:px-7 lg:pt-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bhojpatra-logo.png" alt="bhojpatra" width={894} height={226} className="h-auto w-[120px] lg:w-[190px]" />
          <p className="mt-3 text-[9px] leading-snug text-black lg:mt-6 lg:text-[15px]">
            {t("Your Celebrations,", "आपके उत्सव,")}
            <br />
            {t("Now in Your Pocket", "अब आपकी जेब में")}
          </p>
          <div className="mt-4 w-full space-y-2 lg:mt-8 lg:space-y-3.5">
            {rows.map((r) => (
              <div
                key={r.label}
                className="flex items-center gap-2.5 rounded-xl bg-maroon/10 px-3 py-2.5 text-left text-[9px] text-black lg:gap-4 lg:rounded-2xl lg:px-5 lg:py-4 lg:text-[14px]"
              >
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

function StoreButtons() {
  return (
    <>
      <span className="inline-flex h-[52px] min-w-[16rem] items-center justify-center gap-3 rounded-xl bg-black px-6 text-white lg:h-16 lg:min-w-0 lg:justify-start">
        <svg viewBox="0 0 48 48" className="h-8 w-8 lg:h-9 lg:w-9" aria-hidden="true">
          <path fill="#00d7fe" d="M7 4.5 26.4 24 7 43.5c-.6-.4-1-1.2-1-2.1V6.6c0-.9.4-1.7 1-2.1Z" />
          <path fill="#32bb5d" d="M7 4.5c.7-.5 1.7-.6 2.6 0l22.6 13L26.4 24Z" />
          <path fill="#f5363e" d="M26.4 24 32.2 30.5l-22.6 13c-.9.5-1.9.5-2.6 0Z" />
          <path fill="#fcc400" d="m32.2 17.5 7 4c1.6.9 1.6 4.1 0 5l-7 4L26.4 24Z" />
        </svg>
        <span className="text-left leading-none">
          <span className="block text-[10px] font-semibold tracking-wide lg:text-[13px]">COMING SOON ON</span>
          <span className="mt-1 block text-[19px] font-semibold tracking-tight lg:text-[24px]">Google Play</span>
        </span>
      </span>
      <span className="inline-flex h-[52px] min-w-[16rem] items-center justify-center gap-3 rounded-xl bg-black px-6 text-white lg:h-16 lg:min-w-0 lg:justify-start lg:px-7">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 lg:h-9 lg:w-9" aria-hidden="true">
          <path d="M16.4 12.7c0-2 1.6-3 1.7-3a3.7 3.7 0 0 0-2.9-1.6c-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7a3.9 3.9 0 0 0-3.3 2c-1.4 2.5-.4 6.1 1 8.1.7 1 1.4 2.1 2.4 2 1-.04 1.3-.6 2.5-.6 1.2 0 1.5.6 2.6.6 1 0 1.7-1 2.3-2a8.7 8.7 0 0 0 1-2.1 3.6 3.6 0 0 1-2.2-3.4ZM14.5 6.5a3.5 3.5 0 0 0 .8-2.5 3.6 3.6 0 0 0-2.3 1.2 3.3 3.3 0 0 0-.8 2.4 3 3 0 0 0 2.3-1.1Z" />
        </svg>
        <span className="text-left leading-none">
          <span className="block text-[10px] font-semibold tracking-wide lg:text-[13px]">COMING SOON ON</span>
          <span className="mt-1 block text-[19px] font-semibold tracking-tight lg:text-[24px]">App Store</span>
        </span>
      </span>
    </>
  );
}

/* ── 3. Link footer ──────────────────────────────────────────────────── */

function LinkFooter({ tabBarPad }: { tabBarPad: boolean }) {
  const { lang, t } = useLang();
  const { contact } = useSiteContent();
  const insta = `https://www.instagram.com/${contact.instagram.replace(/^@/, "")}`;

  const explore = navLinks.map((l) => ({ href: l.href, label: lang === "hi" ? l.labelHi : l.label }));
  const company = [
    { href: "/about", label: t("About Us", "हमारे बारे में") },
    { href: "/careers", label: t("Careers", "करियर") },
    { href: "/contact", label: t("Contact", "संपर्क") },
    { href: "/terms", label: t("Terms & Privacy", "नियम और गोपनीयता") },
    { href: "/refund", label: t("Refund Policy", "रिफंड नीति") },
  ];
  const touch = (
    <ul className="space-y-3 text-[15px] lg:text-[17px]">
      <li>
        <a href={`mailto:${contact.email}`} className="flex items-start gap-4 hover:text-cream">
          <MailIcon />
          {contact.email}
        </a>
      </li>
      <li>
        <a href={`https://${contact.website}`} target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 hover:text-cream">
          <GlobeIcon />
          {contact.website}
        </a>
      </li>
      <li className="flex items-start gap-4">
        <PinIcon className="mt-0.5 h-5 w-5 shrink-0" />
        <span className="max-w-[12rem]">{contact.address}</span>
      </li>
    </ul>
  );

  return (
    <footer
      className={`relative overflow-hidden bg-maroon text-white ${
        tabBarPad ? "pb-[calc(var(--tab-bar-h)+var(--safe-bottom)+var(--booking-bar-h,0px))] lg:pb-0" : ""
      }`}
    >
      <Vignette />
      <Skyline className="absolute inset-x-0 bottom-9 hidden h-16 w-full lg:block" />

      {/* Desktop */}
      <div className="relative mx-auto hidden max-w-6xl grid-cols-[1.35fr_auto_1fr_auto_1fr_auto_1.4fr] gap-x-8 px-16 pb-16 pt-9 lg:grid">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bhojpatra-logo1.png" alt="bhojpatra" width={460} height={543} className="ml-1 h-auto w-[118px]" />
          <p className="mt-3 whitespace-nowrap text-[19px]">{t("Feast Booking Platform", "भोज बुकिंग प्लेटफॉर्म")}</p>
          <a href={insta} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-3 text-[17px] hover:text-cream">
            <InstaIcon />
            {contact.instagram}
          </a>
        </div>
        <Divider />
        <Column title={t("Explore", "एक्सप्लोर")} links={explore} />
        <Divider />
        <Column title={t("Company", "कंपनी")} links={company} tight />
        <Divider />
        <div className="pt-5">
          <p className="mb-5 text-[18px] font-semibold tracking-[0.14em]">{t("GET IN TOUCH", "संपर्क करें")}</p>
          {touch}
        </div>
      </div>
      <p className="relative hidden pb-5 text-center text-[14px] lg:block">
        © {new Date().getFullYear()} Bhojpatra · Norion India Pvt Ltd. {t("All rights reserved.", "सर्वाधिकार सुरक्षित।")}
      </p>

      {/* Phone */}
      <div className="relative px-6 pb-4 pt-4 lg:hidden">
        <div className="flex items-center gap-8 px-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bhojpatra-logo1.png" alt="bhojpatra" width={460} height={543} className="h-auto w-[72px]" />
          <div>
            <p className="text-[15px]">{t("Feast Booking Platform", "भोज बुकिंग प्लेटफॉर्म")}</p>
            <a href={insta} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-[13px]">
              <InstaIcon className="h-5 w-5" />
              {contact.instagram}
            </a>
          </div>
        </div>
        <div className="mt-3 border-b border-cream/40">
          <Fold title={t("Explore", "एक्सप्लोर")}>
            <LinkList links={explore} />
          </Fold>
          <Fold title={t("Company", "कंपनी")}>
            <LinkList links={company} />
          </Fold>
          <Fold title={t("Get in touch", "संपर्क करें")}>{touch}</Fold>
        </div>
        <p className="mt-5 text-center text-[10.5px]">
          © {new Date().getFullYear()} Bhojpatra · Norion India Pvt Ltd. {t("All rights reserved.", "सर्वाधिकार सुरक्षित।")}
        </p>
      </div>
    </footer>
  );
}

type FooterLink = { href: string; label: string };

function Column({ title, links, tight = false }: { title: string; links: FooterLink[]; tight?: boolean }) {
  return (
    <div className="pt-5">
      <p className="mb-5 text-[18px] font-semibold uppercase tracking-[0.14em]">{title}</p>
      <ul className={`${tight ? "space-y-1.5" : "space-y-2.5"} text-[17px]`}>
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="hover:text-cream">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LinkList({ links }: { links: FooterLink[] }) {
  return (
    <ul className="space-y-2.5 text-[15px]">
      {links.map((l) => (
        <li key={l.href}>
          <Link href={l.href} className="hover:text-cream">
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Fold({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-t border-cream/40">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[15px] font-semibold uppercase tracking-[0.14em] [&::-webkit-details-marker]:hidden">
        {title}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function Divider() {
  return <span className="my-6 w-px bg-cream/50" aria-hidden="true" />;
}

/* ── Decorations (brand colours + alpha only) ────────────────────────── */

/** Soft darker edges on the red bands, like the mockup's vignette. */
function Vignette() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_45%,rgba(0,0,0,0.18)_100%)]"
    />
  );
}

/** Faint line-art mandala for the tagline band corners. */
function Mandala({ className }: { className?: string }) {
  const petals = Array.from({ length: 16 }, (_, i) => i * 22.5);
  return (
    <svg viewBox="-100 -100 200 200" className={className} fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth={1.2} aria-hidden="true">
      {[20, 34, 62, 92].map((r) => (
        <circle key={r} r={r} />
      ))}
      {petals.map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d="M0 -34 C 9 -46 9 -56 0 -62 C -9 -56 -9 -46 0 -34 Z" />
          <path d="M0 -62 C 14 -72 14 -84 0 -92 C -14 -84 -14 -72 0 -62 Z" />
          <circle cy={-77} r={2.5} />
        </g>
      ))}
      {petals.map((a) => (
        <path key={`s${a}`} transform={`rotate(${a + 11.25})`} d="M0 -20 L0 -34" />
      ))}
    </svg>
  );
}

/** Line · dot · diamond · dot · line under the tagline. */
function Flourish({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 12" className={className} fill="none" stroke="#F0D09E" strokeWidth={1.4} aria-hidden="true">
      <path d="M0 6h80M120 6h80" />
      <circle cx="86" cy="6" r="1.8" fill="#F0D09E" />
      <circle cx="114" cy="6" r="1.8" fill="#F0D09E" />
      <path d="m100 1 5 5-5 5-5-5Z" />
    </svg>
  );
}

/** Brush-stroke underline under "pocket." */
function Swoosh({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 16" className={className} fill="none" aria-hidden="true">
      <path d="M3 13 C 50 3, 140 1, 197 7" stroke="#B92025" strokeOpacity={0.6} strokeWidth={4} strokeLinecap="round" />
    </svg>
  );
}

/** Three short accent strokes beside the phone. */
function Rays({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 70" className={className} fill="none" stroke="#B92025" strokeOpacity={0.55} strokeWidth={3} strokeLinecap="round" aria-hidden="true">
      <path d="M46 6 58 34" />
      <path d="M16 18 46 44" />
      <path d="M4 56 38 60" />
    </svg>
  );
}

/** Serving cloche with steam, line art. */
function Cloche({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 150" className={className} fill="none" stroke="#F0D09E" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M70 12c-8 10 8 16 0 28M86 4c-8 12 8 18 0 32M102 14c-8 10 8 16 0 26" />
      <path d="M22 108a58 58 0 0 1 116 0Z" />
      <path d="M46 92a40 40 0 0 1 26-30" />
      <circle cx="80" cy="46" r="4" />
      <path d="M10 108h140M16 118h128c-4 8-10 12-18 12H34c-8 0-14-4-18-12Z" />
    </svg>
  );
}

/** Faint leaf sprig in the top-right of the app section. */
function Leaf({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" className={className} fill="none" stroke="#F0D09E" strokeWidth={2} aria-hidden="true">
      <path d="M150 10C110 40 70 80 30 150" />
      {[30, 55, 80, 105].map((y, i) => (
        <g key={y}>
          <path d={`M${140 - i * 24} ${y - 12}c-20-6-34 2-40 16 20 4 34-2 40-16Z`} />
          <path d={`M${132 - i * 24} ${y + 4}c4-20 16-30 32-30-2 18-14 28-32 30Z`} />
        </g>
      ))}
    </svg>
  );
}

/** Low skyline of domes, minarets and a fort, with wave lines on the left. */
function Skyline({ className }: { className?: string }) {
  const c = "rgba(240,208,158,0.13)";
  return (
    <svg viewBox="0 0 1200 70" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true">
      <g fill="none" stroke={c} strokeWidth={1.5}>
        <path d="M0 58c60-10 120-10 180 0s120 10 180 0 120-10 180 0" />
        <path d="M0 66c60-8 120-8 180 0s120 8 180 0 120-8 180 0" />
      </g>
      <g fill={c}>
        <rect x="860" y="52" width="340" height="18" />
        {/* minaret */}
        <rect x="868" y="20" width="8" height="32" />
        <path d="M866 20h12l-6-10Z" />
        {/* small domed pavilions */}
        <path d="M890 52v-14h30v14Z" />
        <path d="M888 38a17 15 0 0 1 34 0Z" />
        <path d="M905 22v-6" stroke={c} strokeWidth={2} />
        <path d="M932 52V30h56v22Z" />
        <path d="M930 30a30 24 0 0 1 60 0Z" />
        <path d="M960 6v-6" stroke={c} strokeWidth={2} />
        <rect x="996" y="16" width="9" height="36" />
        <path d="M994 16h13l-6.5-11Z" />
        {/* big central dome */}
        <path d="M1012 52V28h84v24Z" />
        <path d="M1010 28c0-20 20-30 44-34 24 4 44 14 44 34Z" />
        <rect x="1104" y="16" width="9" height="36" />
        <path d="M1102 16h13l-6.5-11Z" />
        {/* fort wall with crenellations */}
        <path d="M1120 52V36h80v16Z" />
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x={1122 + i * 10} y="30" width="6" height="6" />
        ))}
        <path d="M1140 36a12 10 0 0 1 24 0Z" />
      </g>
    </svg>
  );
}

/* ── Icons ───────────────────────────────────────────────────────────── */

const ico = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function InstaIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" {...ico} className={className} aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico} className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="1.5" />
      <path d="m3 6 9 7 9-7M3 18l6.5-6M21 18l-6.5-6" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico} className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M2.5 12h19M12 2.5c2.6 2.8 3.8 6 3.8 9.5s-1.2 6.7-3.8 9.5c-2.6-2.8-3.8-6-3.8-9.5s1.2-6.7 3.8-9.5Z" />
    </svg>
  );
}

function PinIcon({ className = "h-4 w-4 lg:h-6 lg:w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" {...ico} className={className} aria-hidden="true">
      <path d="M12 21.5s-7-6.3-7-11.8a7 7 0 0 1 14 0c0 5.5-7 11.8-7 11.8Z" />
      <circle cx="12" cy="9.7" r="2.6" />
    </svg>
  );
}

function ChefIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico} className="h-4 w-4 lg:h-6 lg:w-6" aria-hidden="true">
      <path d="M7 13.5V19h10v-5.5" />
      <path d="M7 13.5a4 4 0 0 1-.6-7.9A4.5 4.5 0 0 1 12 3a4.5 4.5 0 0 1 5.6 2.6 4 4 0 0 1-.6 7.9Z" />
      <path d="M7 16.5h10" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico} className="h-4 w-4 lg:h-6 lg:w-6" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M8 3v4M16 3v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
    </svg>
  );
}
