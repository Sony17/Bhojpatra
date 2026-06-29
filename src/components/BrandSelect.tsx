"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown, MapPin } from "@/components/icons";
import { useLang } from "@/lib/i18n";

type Option = { id: string; name: string; nameHi?: string };

type IconKey = "calendar" | "mapPin";

const icons = {
  calendar: Calendar,
  mapPin: MapPin,
} as const;

export default function BrandSelect({
  options,
  placeholder,
  ariaLabel,
  icon,
  className = "",
  buttonClassName = "px-5 py-3.5 pr-11",
  iconClassName = "right-4",
  direction = "down",
  defaultId,
  onChange,
}: {
  options: Option[];
  placeholder: string;
  ariaLabel: string;
  icon: IconKey;
  className?: string;
  buttonClassName?: string;
  iconClassName?: string;
  direction?: "up" | "down";
  /** Pre-select the option with this id on first render. */
  defaultId?: string;
  /** Fired with the chosen option whenever the selection changes. */
  onChange?: (option: Option) => void;
}) {
  const Icon = icons[icon];
  const { lang } = useLang();
  const label = (o: Option) => (lang === "hi" && o.nameHi ? o.nameHi : o.name);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Option | null>(
    () => options.find((o) => o.id === defaultId) ?? null,
  );
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-full w-full cursor-pointer items-center rounded-2xl bg-transparent text-left text-sm outline-none ${buttonClassName} ${selected ? "text-ink" : "text-ink/60"}`}
      >
        <span className="truncate">{selected ? label(selected) : placeholder}</span>
      </button>

      <Icon
        className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-maroon/70 transition-transform duration-200 ${iconClassName} ${open ? "rotate-180" : ""}`}
      />

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className={`animate-rise absolute left-0 right-0 z-50 max-h-72 overflow-auto rounded-2xl border border-maroon/40 bg-white p-1.5 shadow-[0_20px_50px_-12px_rgba(185,32,37,0.35)] ${
            direction === "up"
              ? "bottom-[calc(100%+0.5rem)]"
              : "top-[calc(100%+0.5rem)]"
          }`}
        >
          {options.map((o) => {
            const isSel = selected?.id === o.id;
            return (
              <li key={o.id} role="option" aria-selected={isSel}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(o);
                    onChange?.(o);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${
                    isSel
                      ? "bg-cream text-ink"
                      : "text-ink hover:bg-cream/60"
                  }`}
                >
                  <span className="truncate">{label(o)}</span>
                  {isSel && <ChevronDown className="h-3.5 w-3.5 rotate-180 opacity-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
