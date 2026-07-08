"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { navLinks } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import AccountMenuPanel from "./AccountMenuPanel";
import MobileTabBar from "./MobileTabBar";

/** Role icons for the "Partner With Us" dropdown — drawn to match each option. */
const partnerIcons: Record<string, React.ReactNode> = {
  // Vendor — chef's hat (works / cooking)
  vendor: (
    <path d="M7 14v4.5h10V14m-9 0a3.5 3.5 0 0 1-1-6.86A3.5 3.5 0 0 1 12 4a3.5 3.5 0 0 1 5 3.14A3.5 3.5 0 0 1 16 14H8Z" />
  ),
  // Event Planner — calendar with a check
  planner: (
    <>
      <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-12Z" />
      <path d="M8 3v4M16 3v4M4 9.5h16M9 14.5l2 2 4-4" />
    </>
  ),
  // Individual — single person
  individual: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  // Venue Owner — building
  venue: (
    <>
      <path d="M5 20V6.5L12 4l7 2.5V20" />
      <path d="M3.5 20h17M9 20v-4h6v4M9 9h1.5M13.5 9H15M9 12.5h1.5M13.5 12.5H15" />
    </>
  ),
};

function Logo() {
  const { t } = useLang();
  return (
    <Link href="/" className="flex shrink-0 flex-col gap-0 leading-none">
      <Image
        src="/bhojpatra-logo.png"
        alt="Bhojpatra"
        width={894}
        height={226}
        priority
        className="h-12 w-auto drop-shadow-[0_2px_8px_rgba(255,255,255,0.65)] sm:h-16"
      />
      <span className="font-script block w-full text-center text-[0.7875rem] leading-none text-black [text-shadow:0_1px_3px_rgba(255,255,255,0.7)] sm:text-[0.875rem]">
        {t("India's Feast Booking Platform", "भारत का फ़ीस्ट बुकिंग प्लेटफ़ॉर्म")}
      </span>
    </Link>
  );
}

/**
 * Desktop header profile menu — an avatar pill that opens the shared
 * {@link AccountMenuPanel} below it. On mobile the account isn't shown up here;
 * it lives in the bottom tab bar's Account item instead (see MobileTabBar), so
 * this control is hidden below the `lg` breakpoint by its wrapper.
 */
function ProfileMenu() {
  const { t } = useLang();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const name = session?.name?.trim();
  const typeLabel = session
    ? session.type === "vendor"
      ? t("Vendor", "वेंडर")
      : session.type === "partner"
        ? t("Partner", "पार्टनर")
        : t("Customer", "ग्राहक")
    : "";
  const displayName = name || typeLabel || t("Account", "अकाउंट");
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("Account menu", "अकाउंट मेन्यू")}
        className="focus-ring flex items-center gap-2 rounded-full border border-maroon/40 bg-white/80 py-1 pl-1 pr-2.5 text-sm font-medium text-maroon shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-maroon/5 active:scale-95"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-maroon text-cream">
          {session ? (
            <span className="text-xs font-semibold">{initial}</span>
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
            </svg>
          )}
        </span>
        <span className="max-w-[9rem] truncate">
          {session ? displayName : t("Account", "अकाउंट")}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className={"h-3 w-3 transition-transform " + (open ? "-rotate-180" : "")}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-60">
          <AccountMenuPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { lang } = useLang();
  return (
    <header className="absolute inset-x-0 top-0 z-50">
      {/* Light scrim so the maroon logo + dark nav stay legible over the now
          dark, vibrant hero artwork. Solid cream at the very top, fading to
          transparent so the photo still breathes below the header. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-cream-2 via-cream-2/85 to-transparent"
      />
      <div className="animate-fade relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
        <Logo />

        <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-7 text-sm font-semibold text-ink lg:flex [&_a]:[text-shadow:0_1px_3px_rgba(255,255,255,0.6)]">
          {navLinks.map((link) => (
            <div key={link.label} className="group relative">
              <a
                href={link.href.startsWith("#") ? `/${link.href}` : link.href}
                className="link-underline flex items-center gap-1 transition-colors group-hover:text-maroon"
              >
                {lang === "hi" ? link.labelHi : link.label}
                {link.hasDropdown && (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 12 12"
                    className="h-3 w-3 transition-transform group-hover:-rotate-180"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </a>

              {link.items && (
                <div className="invisible absolute left-1/2 top-full z-50 w-80 -translate-x-1/2 translate-y-2 pt-3 opacity-0 transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  <ul className="overflow-hidden rounded-card border border-maroon/15 bg-white shadow-pop [&_a]:[text-shadow:none]">
                    {link.items.map((item) => (
                      <li key={item.title} className="border-b border-maroon/10 last:border-b-0">
                        <a
                          href={item.href}
                          className="group/item flex items-center gap-4 px-5 py-4 transition-colors hover:bg-maroon/5"
                        >
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-maroon/10 ring-1 ring-maroon/20 transition-transform duration-300 group-hover/item:scale-110">
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="h-6 w-6 text-maroon"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              {partnerIcons[item.iconKey]}
                            </svg>
                          </span>
                          <span className="flex flex-col leading-tight">
                            <span className="text-base font-bold text-maroon">
                              {lang === "hi" ? item.titleHi : item.title}
                            </span>
                            <span className="text-sm font-normal text-ink/60">
                              {lang === "hi" ? item.subtitleHi : item.subtitle}
                            </span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Profile menu (account + language) — desktop only; on mobile the
            account lives in the bottom tab bar instead (see MobileTabBar). */}
        <div className="hidden items-center lg:flex">
          <ProfileMenu />
        </div>
      </div>

      <MobileTabBar />
    </header>
  );
}
