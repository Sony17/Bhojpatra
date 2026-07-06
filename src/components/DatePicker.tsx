"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronDown } from "@/components/icons";
import { useLang } from "@/lib/i18n";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAYS_HI = ["र", "सो", "मं", "बु", "गु", "शु", "श"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_HI = [
  "जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून",
  "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर",
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDate(d: Date, lang: "en" | "hi") {
  const month =
    lang === "hi" ? MONTHS_HI[d.getMonth()] : MONTHS[d.getMonth()].slice(0, 3);
  return `${d.getDate()} ${month} ${d.getFullYear()}`;
}

export default function DatePicker({
  placeholder = "Select Date",
  ariaLabel = "Select Date",
  className = "",
  buttonClassName = "px-5 py-3.5 pr-11 text-sm",
  iconClassName = "right-4",
  direction = "down",
  defaultDaysAhead,
  onChange,
}: {
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
  iconClassName?: string;
  direction?: "up" | "down";
  /** Pre-select a date this many days from today (computed client-side). */
  defaultDaysAhead?: number;
  onChange?: (date: Date) => void;
}) {
  const { lang, t } = useLang();
  const months = lang === "hi" ? MONTHS_HI : MONTHS;
  const weekdays = lang === "hi" ? WEEKDAYS_HI : WEEKDAYS;
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | null>(null);
  // The first day of the month currently shown in the grid.
  const [view, setView] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const rootRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => startOfDay(new Date()), []);

  // Pre-select a default date `defaultDaysAhead` days out. Done in an effect
  // (not a lazy initializer) so the server render and first client render
  // match — `new Date()` would otherwise diverge and trip hydration.
  useEffect(() => {
    if (defaultDaysAhead == null) return;
    const d = startOfDay(new Date());
    d.setDate(d.getDate() + defaultDaysAhead);
    setSelected(d);
    setView(new Date(d.getFullYear(), d.getMonth(), 1));
    onChange?.(d);
    // Run once on mount for the given offset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultDaysAhead]);

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

  // Build the 6-row grid of day cells (leading blanks for offset).
  const cells = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(year, month, d));
    return out;
  }, [view]);

  // Can't page earlier than the current month.
  const atFirstMonth =
    view.getFullYear() === today.getFullYear() &&
    view.getMonth() === today.getMonth();

  function shiftMonth(delta: number) {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-full w-full cursor-pointer items-center rounded-2xl bg-transparent text-left outline-none ${buttonClassName} ${selected ? "text-ink" : "text-ink/60"}`}
      >
        <span className="truncate">{selected ? formatDate(selected, lang) : placeholder}</span>
      </button>

      <Calendar
        className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-maroon/70 ${iconClassName}`}
      />

      {open && (
        <div
          role="dialog"
          aria-label={ariaLabel}
          className={`animate-rise absolute left-0 z-50 w-[19rem] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-maroon/40 bg-white p-3 shadow-[0_20px_50px_-12px_rgba(185,32,37,0.35)] ${
            direction === "up"
              ? "bottom-[calc(100%+0.5rem)]"
              : "top-[calc(100%+0.5rem)]"
          }`}
        >
          {/* Month navigation */}
          <div className="mb-2 flex items-center justify-between px-1">
            <button
              type="button"
              aria-label={t("Previous month", "पिछला महीना")}
              onClick={() => shiftMonth(-1)}
              disabled={atFirstMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-maroon transition-colors hover:bg-cream/60 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronDown className="h-4 w-4 rotate-90" />
            </button>
            <span className="text-sm font-semibold text-ink">
              {months[view.getMonth()]} {view.getFullYear()}
            </span>
            <button
              type="button"
              aria-label={t("Next month", "अगला महीना")}
              onClick={() => shiftMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-maroon transition-colors hover:bg-cream/60"
            >
              <ChevronDown className="h-4 w-4 -rotate-90" />
            </button>
          </div>

          {/* Weekday header */}
          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {weekdays.map((w, i) => (
              <div
                key={i}
                className="flex h-8 items-center justify-center text-xs font-semibold text-ink/50"
              >
                {w}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((date, i) => {
              if (!date) return <div key={i} className="h-9" />;
              const isPast = date < today;
              const isToday = date.getTime() === today.getTime();
              const isSel =
                selected !== null && date.getTime() === selected.getTime();
              return (
                <button
                  key={i}
                  type="button"
                  disabled={isPast}
                  aria-pressed={isSel}
                  onClick={() => {
                    setSelected(date);
                    onChange?.(date);
                    setOpen(false);
                  }}
                  className={`flex h-9 items-center justify-center rounded-lg text-sm transition-colors ${
                    isSel
                      ? "bg-maroon font-semibold text-cream"
                      : isPast
                        ? "cursor-not-allowed text-ink/25"
                        : isToday
                          ? "font-semibold text-maroon hover:bg-cream/60"
                          : "text-ink hover:bg-cream/60"
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
