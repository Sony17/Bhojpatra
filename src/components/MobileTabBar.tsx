"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { setAccountMenuState } from "@/lib/accountMenu";
import AccountMenuPanel from "./AccountMenuPanel";

/** Primary destinations surfaced as an app-style bottom tab bar on mobile.
 *  On mobile the header nav is hidden, so "Partner With Us" rides here as a
 *  dedicated tab. The tab for the page you're currently on is dropped, so the
 *  bar always shows five slots: four of these plus the account menu (below). */
const tabs: { label: string; labelHi: string; href: string; icon: React.ReactNode }[] = [
  {
    label: "Home",
    labelHi: "होम",
    href: "/",
    icon: <path d="M4 11.5 12 4l8 7.5M6 10v9h12v-9M9.5 19v-5h5v5" />,
  },
  {
    label: "Book",
    labelHi: "बुक",
    href: "/book",
    icon: (
      <>
        <path d="M5 3v6a2 2 0 0 0 2 2 2 2 0 0 0 2-2V3" />
        <path d="M7 11v10" />
        <path d="M19 14V3a4 4 0 0 0-4 4v5a2 2 0 0 0 2 2h2Zm0 0v7" />
      </>
    ),
  },
  {
    label: "Vendors",
    labelHi: "वेंडर",
    href: "/vendors",
    icon: (
      <>
        <path d="M4 9.5 5 5h14l1 4.5M4 9.5h16M4 9.5a2.2 2.2 0 0 0 4 1 2.2 2.2 0 0 0 4 0 2.2 2.2 0 0 0 4 0 2.2 2.2 0 0 0 4-1" />
        <path d="M5.5 11v8h13v-8" />
      </>
    ),
  },
  {
    label: "Venues",
    labelHi: "वेन्यू",
    href: "/venues",
    icon: (
      <>
        <path d="M5 20V6.5L12 4l7 2.5V20" />
        <path d="M3.5 20h17M9 20v-4h6v4M9 9h1.5M13.5 9H15M9 12.5h1.5M13.5 12.5H15" />
      </>
    ),
  },
  {
    label: "Partner",
    labelHi: "पार्टनर",
    href: "/partner",
    icon: (
      <>
        <circle cx="8.5" cy="8" r="3" />
        <path d="M3 19a5.5 5.5 0 0 1 11 0" />
        <path d="M15.5 5.2a3 3 0 0 1 0 5.6M16.5 13.4A5.5 5.5 0 0 1 21 18.8" />
      </>
    ),
  },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const { t, lang } = useLang();
  const [accountOpen, setAccountOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);

  // Publish the popup's open state + measured height so the floating chat
  // launcher can lift itself clear of the menu instead of overlapping it.
  useEffect(() => {
    if (accountOpen && popupRef.current) {
      setAccountMenuState(true, popupRef.current.offsetHeight);
    } else {
      setAccountMenuState(false);
    }
  }, [accountOpen]);

  // Make sure the signal is cleared if the bar unmounts while open.
  useEffect(() => () => setAccountMenuState(false), []);

  return (
    <nav
      ref={navRef}
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-maroon/10 bg-cream-2/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(185,32,37,0.08)] backdrop-blur-md lg:hidden"
    >
      {/* Account popup opens upward, above the bar, anchored to the right by the
          Account tab. It stays at the bar's z-50 — below the floating chat
          launcher (z-[60]) — so the chat button remains on top. */}
      {accountOpen && (
        <div
          ref={popupRef}
          className="absolute bottom-full right-3 z-50 mb-2 w-60 max-w-[calc(100vw-1.5rem)]"
        >
          <AccountMenuPanel onClose={() => setAccountOpen(false)} />
        </div>
      )}

      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs
          .filter((tab) =>
            tab.href === "/"
              ? pathname !== "/"
              : !pathname.startsWith(tab.href),
          )
          .map((tab) => (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                onClick={() => setAccountOpen(false)}
                className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-ink-soft transition-colors hover:text-maroon"
              >
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
                  {tab.icon}
                </svg>
                {lang === "hi" ? tab.labelHi : tab.label}
              </Link>
            </li>
          ))}

        {/* Account — opens the shared account/language menu upward. */}
        <li className="flex-1">
          <button
            type="button"
            onClick={() => setAccountOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            className={`flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
              accountOpen ? "text-maroon" : "text-ink-soft hover:text-maroon"
            }`}
          >
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
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
            </svg>
            {t("Account", "अकाउंट")}
          </button>
        </li>
      </ul>
    </nav>
  );
}
