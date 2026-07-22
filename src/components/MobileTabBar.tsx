"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { setAccountMenuState } from "@/lib/accountMenu";
import AccountMenuPanel from "./AccountMenuPanel";
import PartnerMenuPanel from "./PartnerMenuPanel";

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
];

function tabActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileTabBar() {
  const pathname = usePathname();
  const { t, lang } = useLang();
  // One popup at a time — opening a tab's menu hides whichever is already open.
  const [openMenu, setOpenMenu] = useState<"partner" | "account" | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    function onPointerDown(e: PointerEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu]);

  useEffect(() => {
    if (openMenu && popupRef.current) {
      setAccountMenuState(true, popupRef.current.offsetHeight);
    } else {
      setAccountMenuState(false);
    }
  }, [openMenu]);

  useEffect(() => () => setAccountMenuState(false), []);

  return (
    <nav
      ref={navRef}
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-maroon/8 bg-white/96 pb-[var(--safe-bottom)] shadow-pop-up backdrop-blur-xl lg:hidden"
    >
      {openMenu === "partner" && (
        <div
          ref={popupRef}
          className="absolute bottom-full right-3 z-50 mb-2 w-80 max-w-[calc(100vw-1.5rem)]"
        >
          <PartnerMenuPanel onClose={() => setOpenMenu(null)} />
        </div>
      )}

      {openMenu === "account" && (
        <div
          ref={popupRef}
          className="absolute bottom-full right-3 z-50 mb-2 w-60 max-w-[calc(100vw-1.5rem)]"
        >
          <AccountMenuPanel onClose={() => setOpenMenu(null)} />
        </div>
      )}

      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {tabs.map((tab) => {
          const active = tabActive(pathname, tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                onClick={() => setOpenMenu(null)}
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
            onClick={() => setOpenMenu((v) => (v === "partner" ? null : "partner"))}
            aria-haspopup="menu"
            aria-expanded={openMenu === "partner"}
            className={`focus-ring tap relative flex min-h-12 w-full flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition duration-200 active:scale-95 touch-manipulation ${
              openMenu === "partner" ? "text-maroon" : "text-ink/55 hover:text-maroon"
            }`}
          >
            {openMenu === "partner" && (
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
              strokeWidth={openMenu === "partner" ? "2" : "1.6"}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="8.5" r="3" />
              <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
              <path d="M15.5 5.8a3 3 0 0 1 0 5.4M17.5 13.9a5.5 5.5 0 0 1 3 5.1" />
            </svg>
            {t("Partner", "पार्टनर")}
          </button>
        </li>

        <li className="flex-1">
          <button
            type="button"
            onClick={() => setOpenMenu((v) => (v === "account" ? null : "account"))}
            aria-haspopup="menu"
            aria-expanded={openMenu === "account"}
            className={`focus-ring tap relative flex min-h-12 w-full flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition duration-200 active:scale-95 touch-manipulation ${
              openMenu === "account" ? "text-maroon" : "text-ink/55 hover:text-maroon"
            }`}
          >
            {openMenu === "account" && (
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
              strokeWidth={openMenu === "account" ? "2" : "1.6"}
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
