"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { setAccountMenuState } from "@/lib/accountMenu";
import AccountMenuPanel from "./AccountMenuPanel";

/** App-style bottom tabs — always visible, active state highlighted.
 *  Same destinations; finish matches Zomato/Swiggy chrome. */
const tabs: { label: string; labelHi: string; href: string; icon: React.ReactNode }[] = [
  {
    label: "Home",
    labelHi: "होम",
    href: "/",
    icon: <path d="M4 11.5 12 4l8 7.5M6 10v9h12v-9M9.5 19v-5h5v5" />,
  },
  {
    label: "Brands",
    labelHi: "ब्रांड",
    href: "/vendors",
    icon: (
      <>
        <path d="M4 9.5 5 5h14l1 4.5M4 9.5h16M4 9.5a2.2 2.2 0 0 0 4 1 2.2 2.2 0 0 0 4 0 2.2 2.2 0 0 0 4 0 2.2 2.2 0 0 0 4-1" />
        <path d="M5.5 11v8h13v-8" />
      </>
    ),
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
    label: "Bookings",
    labelHi: "बुकिंग",
    href: "/bookings",
    icon: (
      <>
        <path d="M5 5.5A1.5 1.5 0 0 1 6.5 4h11A1.5 1.5 0 0 1 19 5.5v13A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5v-13Z" />
        <path d="M8 2.5v3M16 2.5v3M5 9h14M9 13h6M9 16.5h4" />
      </>
    ),
  },
];

function tabActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

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

  useEffect(() => {
    if (accountOpen && popupRef.current) {
      setAccountMenuState(true, popupRef.current.offsetHeight);
    } else {
      setAccountMenuState(false);
    }
  }, [accountOpen]);

  useEffect(() => () => setAccountMenuState(false), []);

  return (
    <nav
      ref={navRef}
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-maroon/8 bg-white/96 pb-[var(--safe-bottom)] shadow-pop-up backdrop-blur-xl lg:hidden"
    >
      {accountOpen && (
        <div
          ref={popupRef}
          className="absolute bottom-full right-3 z-50 mb-2 w-60 max-w-[calc(100vw-1.5rem)]"
        >
          <AccountMenuPanel onClose={() => setAccountOpen(false)} />
        </div>
      )}

      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {tabs.map((tab) => {
          const active = tabActive(pathname, tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                onClick={() => setAccountOpen(false)}
                aria-current={active ? "page" : undefined}
                className={
                  "focus-ring tap relative flex min-h-12 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition duration-200 active:scale-95 touch-manipulation " +
                  (active ? "text-maroon" : "text-ink/55 hover:text-maroon")
                }
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute top-0 h-0.5 w-8 rounded-full bg-maroon"
                  />
                )}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-[22px] w-[22px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? "2" : "1.6"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {tab.icon}
                </svg>
                {lang === "hi" ? tab.labelHi : tab.label}
              </Link>
            </li>
          );
        })}

        <li className="flex-1">
          <button
            type="button"
            onClick={() => setAccountOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            className={`focus-ring tap relative flex min-h-12 w-full flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition duration-200 active:scale-95 touch-manipulation ${
              accountOpen ? "text-maroon" : "text-ink/55 hover:text-maroon"
            }`}
          >
            {accountOpen && (
              <span
                aria-hidden
                className="absolute top-0 h-0.5 w-8 rounded-full bg-maroon"
              />
            )}
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-[22px] w-[22px]"
              fill="none"
              stroke="currentColor"
              strokeWidth={accountOpen ? "2" : "1.6"}
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
