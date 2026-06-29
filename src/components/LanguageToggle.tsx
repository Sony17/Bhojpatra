"use client";

import { useEffect, useRef, useState } from "react";
import { useLang, type Lang } from "@/lib/i18n";

const options: { id: Lang; label: string; full: string }[] = [
  { id: "en", label: "EN", full: "English" },
  { id: "hi", label: "हिं", full: "हिंदी" },
];

/**
 * Language picker dropdown. The trigger shows the active language; clicking it
 * reveals the full list. Closes on outside click or Escape.
 * Reused in the desktop header and the mobile header strip.
 */
export default function LanguageToggle({
  className = "",
}: {
  className?: string;
}) {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = options.find((o) => o.id === lang) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  return (
    <div ref={ref} className={"relative shrink-0 " + className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
        className="inline-flex items-center gap-1.5 rounded-full border border-maroon/40 bg-white/80 px-3 py-1.5 text-xs font-semibold text-maroon shadow-sm backdrop-blur-sm transition-colors hover:bg-maroon/5"
      >
        <span>{current.label}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className={
            "h-3 w-3 transition-transform " + (open ? "-rotate-180" : "")
          }
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Language"
          className="absolute right-0 top-full z-50 mt-2 w-32 overflow-hidden rounded-xl border border-maroon/40 bg-white shadow-xl shadow-black/10"
        >
          {options.map((o) => {
            const active = lang === o.id;
            return (
              <li key={o.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    setLang(o.id);
                    setOpen(false);
                  }}
                  className={
                    "flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-semibold transition-colors " +
                    (active
                      ? "bg-maroon text-cream"
                      : "text-maroon hover:bg-maroon/5")
                  }
                >
                  <span>{o.full}</span>
                  <span className="text-xs opacity-70">{o.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
