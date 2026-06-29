"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { navLinks } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { clearSession, dashboardPath, useSession } from "@/lib/session";
import LanguageToggle from "./LanguageToggle";
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
    <Link href="/" target="_blank" rel="noopener noreferrer" className="flex flex-col gap-0 leading-none">
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

/** Signed-in account menu — name + dashboard/logout, shown in place of the
 *  Log In / Sign Up buttons once a session exists. */
function AccountMenu() {
  const { t } = useLang();
  const router = useRouter();
  const session = useSession();

  if (!session) {
    return (
      <>
        <Link
          href="/login"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-maroon/40 px-5 py-2 text-sm font-medium text-maroon transition-all duration-200 hover:bg-maroon/5 active:scale-95"
        >
          {t("Log In", "लॉग इन")}
        </Link>
        <Link
          href="/signup"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-sheen rounded-md bg-maroon px-5 py-2 text-sm font-medium text-cream shadow-sm transition-all duration-200 hover:bg-maroon-dark hover:shadow-md active:scale-95"
        >
          {t("Sign Up", "साइन अप")}
        </Link>
      </>
    );
  }

  const name = session.name?.trim();
  const label = name || (session.type === "vendor" ? t("Vendor", "वेंडर") : t("Customer", "ग्राहक"));
  const initial = (name || label).charAt(0).toUpperCase();

  function handleLogout() {
    clearSession();
    router.push("/");
  }

  return (
    <div className="group relative">
      <button
        type="button"
        className="flex items-center gap-2 rounded-md border border-maroon/40 py-1.5 pl-1.5 pr-3 text-sm font-medium text-maroon transition-all duration-200 hover:bg-maroon/5 active:scale-95"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-maroon text-cream">
          {initial}
        </span>
        <span className="max-w-[10rem] truncate">{label}</span>
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
      </button>

      <div className="invisible absolute right-0 top-full z-50 w-52 translate-y-2 pt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <ul className="overflow-hidden rounded-xl border border-maroon-dark/40 bg-cream shadow-xl shadow-maroon/20">
          <li className="border-b border-maroon/10">
            <Link
              href={dashboardPath(session.type)}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-maroon/5 hover:text-maroon"
            >
              {t("My Dashboard", "मेरा डैशबोर्ड")}
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full px-4 py-3 text-left text-sm font-medium text-maroon transition-colors hover:bg-maroon/5"
            >
              {t("Log Out", "लॉग आउट")}
            </button>
          </li>
        </ul>
      </div>
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
      <div className="animate-fade mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
        <Logo />

        <nav className="hidden items-center gap-7 text-sm font-semibold text-ink lg:flex [&_a]:[text-shadow:0_1px_3px_rgba(255,255,255,0.6)]">
          {navLinks.map((link) => (
            <div key={link.label} className="group relative">
              <a
                href={link.href.startsWith("#") ? `/${link.href}` : link.href}
                target="_blank"
                rel="noopener noreferrer"
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
                  <ul className="overflow-hidden rounded-2xl border border-maroon/15 bg-white shadow-xl shadow-maroon/20 [&_a]:[text-shadow:none]">
                    {link.items.map((item) => (
                      <li key={item.title} className="border-b border-maroon/10 last:border-b-0">
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
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

        {/* Desktop auth buttons + language toggle */}
        <div className="hidden items-center gap-2.5 lg:flex">
          <LanguageToggle />
          <AccountMenu />
        </div>

        {/* Mobile language toggle — auth + nav live in the bottom tab bar */}
        <div className="lg:hidden">
          <LanguageToggle />
        </div>

      </div>

      <MobileTabBar />
    </header>
  );
}
