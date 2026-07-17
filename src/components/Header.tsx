"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { navLinks } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import AccountMenuPanel from "./AccountMenuPanel";
import MobileTabBar from "./MobileTabBar";
import { AppLocationBar } from "@/components/ui";

/** Role icons for the "Partner With Us" dropdown — drawn to match each option. */
const partnerIcons: Record<string, React.ReactNode> = {
  vendor: (
    <path d="M7 14v4.5h10V14m-9 0a3.5 3.5 0 0 1-1-6.86A3.5 3.5 0 0 1 12 4a3.5 3.5 0 0 1 5 3.14A3.5 3.5 0 0 1 16 14H8Z" />
  ),
  planner: (
    <>
      <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-12Z" />
      <path d="M8 3v4M16 3v4M4 9.5h16M9 14.5l2 2 4-4" />
    </>
  ),
  individual: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  venue: (
    <>
      <path d="M5 20V6.5L12 4l7 2.5V20" />
      <path d="M3.5 20h17M9 20v-4h6v4M9 9h1.5M13.5 9H15M9 12.5h1.5M13.5 12.5H15" />
    </>
  ),
};

function LogoMark() {
  return (
    <Link
      href="/"
      className="focus-ring flex shrink-0 items-center rounded-xl transition-transform duration-200 hover:scale-[1.02]"
      aria-label="Bhojpatra home"
    >
      <Image
        src="/bhojpatra-logo.png"
        alt="Bhojpatra"
        width={894}
        height={226}
        priority
        className="h-9 w-auto sm:h-12 lg:h-14"
      />
    </Link>
  );
}

/**
 * Desktop header profile menu — avatar pill → AccountMenuPanel.
 * Mobile account lives in the bottom tab bar.
 */
function ProfileMenu({ onLight = false }: { onLight?: boolean }) {
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
        className={
          "focus-ring flex min-h-11 items-center gap-2.5 rounded-full py-1 pl-1 pr-3.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-95 " +
          (onLight
            ? "border border-maroon/10 bg-white text-ink shadow-soft hover:border-maroon/20 hover:bg-cream/30"
            : "border border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25")
        }
      >
        <span
          className={
            "flex h-8 w-8 items-center justify-center rounded-full " +
            (onLight
              ? "bg-maroon text-cream"
              : "bg-white text-maroon ring-1 ring-white/30")
          }
        >
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
          className={"h-3 w-3 transition-transform duration-200 " + (open ? "-rotate-180" : "")}
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

/**
 * Sticky app chrome — Swiggy/Zomato style on mobile (location + logo),
 * desktop keeps full nav. Bottom tabs render via MobileTabBar.
 *
 * On home the bar overlays the hero (transparent + soft scrim) so the first
 * viewport is one continuous composition — no solid white slab.
 */
export default function Header() {
  const { lang } = useLang();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  /* Detail / AppBar screens skip the location chrome. */
  const isDetail =
    /^\/(vendors|venues)\/[^/]+/.test(pathname) ||
    pathname.startsWith("/bookings/invoice") ||
    pathname === "/compare" ||
    pathname === "/about" ||
    pathname === "/careers" ||
    pathname === "/terms" ||
    pathname === "/refund" ||
    pathname === "/dashboard" ||
    pathname.startsWith("/partner/dashboard");

  const navSurface =
    "border border-white/60 shadow-[0_12px_40px_rgba(0,0,0,0.25)] backdrop-blur-[20px] transition-[background-color,border-color,box-shadow] duration-300 " +
    (scrolled ? "bg-white/80" : "bg-white/65");

  const isNavActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={
        (isHome ? "fixed " : "sticky ") +
        "inset-x-0 top-[calc(20px+var(--safe-top))] z-50"
      }
    >
      {/* Light top veil blends the floating white glass into the hero. */}
      {isHome && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-white/70 via-cream/25 to-transparent"
        />
      )}

      {/* Mobile app bar — location + mark (hidden on detail; AppBar takes over) */}
      {!isDetail && (
        <div
          className={
            "animate-fade mx-4 flex h-16 items-center justify-between gap-3 rounded-[18px] px-4 lg:hidden " +
            navSurface
          }
        >
          <LogoMark />
          <div className="min-w-0 max-w-[13rem] flex-1">
            <AppLocationBar
              compact
              onDark={false}
              className="ml-auto min-w-0 justify-end"
            />
          </div>
        </div>
      )}

      {/* Desktop nav bar */}
      <div
        className={
          "animate-fade relative mx-auto hidden h-[72px] w-[calc(100%-40px)] max-w-[1240px] items-center justify-between rounded-[18px] px-6 lg:flex " +
          navSurface
        }
      >
        <div className="flex min-w-0 items-center">
          <LogoMark />
        </div>

        <nav className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-10">
          {navLinks.map((link) => {
            const active = isNavActive(link.href);
            return (
              <div key={link.label} className="group relative">
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    "relative flex items-center gap-1.5 py-2 text-[15px] font-medium tracking-[0.3px] transition-colors duration-200 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:transition-transform after:duration-200 " +
                    (active
                      ? "text-maroon after:scale-x-100 after:bg-maroon"
                      : "text-ink after:scale-x-0 after:bg-maroon hover:text-maroon hover:after:scale-x-100")
                  }
                >
                  {lang === "hi" ? link.labelHi : link.label}
                  {link.hasDropdown && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 12 12"
                      className="h-3 w-3 transition-transform duration-200 group-hover:-rotate-180"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </Link>

                {link.items && (
                  <div className="invisible absolute left-1/2 top-full z-50 w-80 -translate-x-1/2 translate-y-2 pt-5 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    <ul className="overflow-hidden rounded-card border border-maroon/10 bg-white shadow-pop">
                      {link.items.map((item) => (
                        <li key={item.title} className="border-b border-maroon/8 last:border-b-0">
                          <a
                            href={item.href}
                            className="group/item flex items-center gap-4 px-5 py-4 transition-colors duration-200 hover:bg-cream/40"
                          >
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cream text-maroon ring-1 ring-maroon/15 transition-transform duration-200 group-hover/item:scale-105">
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="h-6 w-6"
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
                              <span className="text-sm font-normal text-ink/55">
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
            );
          })}
        </nav>

        <div className="flex items-center">
          <ProfileMenu onLight />
        </div>
      </div>

      <MobileTabBar />
    </header>
  );
}
