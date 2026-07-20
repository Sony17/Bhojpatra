"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
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
  align = "left",
  defaultDaysAhead,
  valueIso,
  minDaysAhead = 1,
  onChange,
}: {
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
  iconClassName?: string;
  direction?: "up" | "down";
  /** Horizontal anchor for the calendar popup — keeps the wide panel on-screen
   *  when the trigger is a narrow, middle-of-row field (mobile hero). */
  align?: "left" | "center" | "right";
  /** Pre-select a date this many days from today (computed client-side). */
  defaultDaysAhead?: number;
  /** Controlled selection as a `YYYY-MM-DD` string. When supplied, the shown
   *  date tracks the parent's value (e.g. a booking date carried in from the
   *  URL); an empty string clears the selection. Leave undefined to run the
   *  picker uncontrolled (the Hero hero-bar usage). */
  valueIso?: string;
  /** Minimum advance notice, in days — dates before `today + minDaysAhead` are
   *  disabled (e.g. a wedding that needs 30 days' lead). Defaults to 1 (tomorrow). */
  minDaysAhead?: number;
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
  const popupRef = useRef<HTMLDivElement>(null);

  // The popup renders in a body-level portal (position: fixed) so it can sit
  // above the fixed site header — an `absolute` popup is trapped inside
  // ancestor stacking contexts (the hero's `isolate`, the booking bar's
  // backdrop-blur) and paints underneath it no matter its z-index.
  const [popupStyle, setPopupStyle] = useState<CSSProperties | null>(null);

  const positionPopup = useCallback(() => {
    const anchor = rootRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Trigger scrolled out of view — dismiss rather than leave the panel
    // glued to a point outside the screen.
    if (r.bottom < 0 || r.top > vh) {
      setOpen(false);
      return;
    }
    const margin = 12; // minimum gutter to the viewport edges
    const width = Math.min(304, vw - margin * 2); // 19rem panel, capped on tiny screens
    let left =
      align === "right"
        ? r.right - width
        : align === "center"
          ? r.left + r.width / 2 - width / 2
          : r.left;
    left = Math.min(Math.max(left, margin), vw - width - margin);
    const style: CSSProperties = { left, width };
    // Flip to whichever side of the trigger still has room once scrolling
    // squeezes the preferred one — an unchecked `maxHeight` would go negative
    // there (invalid CSS, so no cap at all) and the panel would spill past the
    // viewport edge.
    const spaceUp = r.top - 8 - margin;
    const spaceDown = vh - r.bottom - 8 - margin;
    const MIN_PANEL = 240;
    let up = direction === "up";
    if (up && spaceUp < MIN_PANEL && spaceDown > spaceUp) up = false;
    else if (!up && spaceDown < MIN_PANEL && spaceUp > spaceDown) up = true;
    if (up) {
      style.bottom = vh - r.top + 8;
      style.maxHeight = Math.max(spaceUp, 120);
    } else {
      style.top = r.bottom + 8;
      style.maxHeight = Math.max(spaceDown, 120);
    }
    setPopupStyle(style);
  }, [align, direction]);

  // Position before paint on open; track scroll/resize while open so the
  // fixed-position panel stays glued to its trigger.
  useLayoutEffect(() => {
    if (!open) return;
    positionPopup();
    window.addEventListener("resize", positionPopup);
    window.addEventListener("scroll", positionPopup, true);
    return () => {
      window.removeEventListener("resize", positionPopup);
      window.removeEventListener("scroll", positionPopup, true);
    };
  }, [open, positionPopup]);

  const today = useMemo(() => startOfDay(new Date()), []);

  // The earliest selectable day — today plus the required advance notice. Dates
  // before this are disabled in the grid (defaults to tomorrow).
  const minDate = useMemo(() => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() + Math.max(1, minDaysAhead));
    return d;
  }, [minDaysAhead]);

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

  // Controlled mode — mirror the parent's `YYYY-MM-DD` value into the shown
  // selection (and page the grid to its month). Skipped entirely when the prop
  // is undefined so the uncontrolled Hero usage is unaffected.
  useEffect(() => {
    if (valueIso === undefined) return;
    if (!valueIso) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(null);
      return;
    }
    const [y, m, d] = valueIso.split("-").map(Number);
    if (!y || !m || !d) return;
    const dt = startOfDay(new Date(y, m - 1, d));
    setSelected(dt);
    setView(new Date(dt.getFullYear(), dt.getMonth(), 1));
  }, [valueIso]);

  // If the minimum notice grows past the current pick — the guest switched to an
  // occasion that needs more lead, or the default landed below it — nudge the
  // selection forward to the earliest still-valid date instead of leaving a
  // now-disabled date chosen (and keep the parent in sync via onChange).
  useEffect(() => {
    if (selected && selected < minDate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(minDate);
      setView(new Date(minDate.getFullYear(), minDate.getMonth(), 1));
      onChange?.(minDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minDate, selected]);

  // Close on outside press or Escape. `pointerdown` (not `mousedown`) — iOS
  // Safari doesn't synthesize mouse events for taps on non-interactive
  // elements, so a mousedown-only listener never fires and the panel sticks
  // open on real phones. Same pattern as BrandSelect.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      const target = e.target as Node;
      // The popup lives in a body portal, so check both the trigger and it.
      if (
        rootRef.current?.contains(target) ||
        popupRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
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

  // Can't page earlier than the earliest selectable month (today, or the first
  // month that contains a date meeting the required lead).
  const atFirstMonth =
    new Date(view.getFullYear(), view.getMonth(), 1) <=
    new Date(minDate.getFullYear(), minDate.getMonth(), 1);

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

      {open &&
        popupStyle &&
        createPortal(
          <div
            ref={popupRef}
            role="dialog"
            aria-label={ariaLabel}
            style={popupStyle}
            className="animate-rise fixed z-[70] overflow-y-auto rounded-2xl border border-maroon/40 bg-white p-3 shadow-[0_20px_50px_-12px_rgba(185,32,37,0.35)]"
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
              // Disabled = before the earliest allowed date (past days, plus any
              // that fall short of the occasion's required lead time).
              const isDisabled = date < minDate;
              const isToday = date.getTime() === today.getTime();
              const isSel =
                selected !== null && date.getTime() === selected.getTime();
              return (
                <button
                  key={i}
                  type="button"
                  disabled={isDisabled}
                  aria-pressed={isSel}
                  onClick={() => {
                    setSelected(date);
                    onChange?.(date);
                    setOpen(false);
                  }}
                  className={`flex h-9 items-center justify-center rounded-lg text-sm transition-colors ${
                    isSel
                      ? "bg-maroon font-semibold text-cream"
                      : isDisabled
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
          </div>,
          document.body,
        )}
    </div>
  );
}
