"use client";

import { partnerOptions } from "@/lib/data";
import { useLang } from "@/lib/i18n";

/** Role icons for the "Partner With Us" options — drawn to match each option. */
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

/**
 * The "Partner With Us" options list shared by the desktop header dropdown and
 * the mobile bottom-bar partner tab. The trigger + positioning live in each
 * caller; this is just the panel so both entry points stay in visual sync.
 *
 * `onClose` is invoked when an option is chosen so the caller can dismiss the
 * popup (the desktop hover dropdown simply omits it).
 */
export default function PartnerMenuPanel({ onClose }: { onClose?: () => void }) {
  const { lang } = useLang();

  return (
    <ul className="overflow-hidden rounded-card border border-maroon/10 bg-white shadow-pop">
      {partnerOptions.map((item) => (
        <li key={item.title} className="border-b border-maroon/8 last:border-b-0">
          <a
            href={item.href}
            onClick={onClose}
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
  );
}
