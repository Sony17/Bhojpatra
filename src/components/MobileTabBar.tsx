"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n";

/** Primary destinations surfaced as an app-style bottom tab bar on mobile.
 *  Secondary items (Partner, Contact, auth) stay in the header hamburger. */
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
    label: "Bookings",
    labelHi: "बुकिंग",
    href: "/bookings",
    icon: (
      <>
        <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-12Z" />
        <path d="M8 3v4M16 3v4M4 9.5h16M9 14.5l2 2 4-4" />
      </>
    ),
  },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const { lang } = useLang();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-maroon/10 bg-cream-2/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(185,32,37,0.08)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                  active ? "text-maroon" : "text-ink-soft hover:text-maroon"
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
                  {tab.icon}
                </svg>
                {lang === "hi" ? tab.labelHi : tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
