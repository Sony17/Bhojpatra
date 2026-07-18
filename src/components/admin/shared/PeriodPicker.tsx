"use client";

import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
} from "@/components/admin/shared/icons";
import {
  MONTHS_LONG,
  periodLabel,
  toISODate,
  type Period,
} from "@/lib/admin/bookingPeriods";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/**
 * Period picker for the admin dashboard — quick month presets (This month /
 * Last month / All time) plus an inline calendar for picking a whole month or a
 * custom day range. Controlled: the parent owns the {@link Period}. Brand colors
 * only (maroon endpoints, cream fill). `today` is passed in so the component
 * stays pure and the "This/Last month" presets are stable across renders.
 */
export default function PeriodPicker({
  value,
  onChange,
  today,
}: {
  value: Period;
  onChange: (period: Period) => void;
  today: Date;
}) {
  const [open, setOpen] = useState(false);
  // First click of a range; the second click completes and commits it.
  const [anchor, setAnchor] = useState<string | null>(null);
  // Which month the calendar grid is showing (independent of the selection).
  const [view, setView] = useState(() => seedMonth(value, today));
  const rootRef = useRef<HTMLDivElement>(null);

  // Re-seed the grid on the current selection each time we open, and drop any
  // half-finished range.
  const toggle = () => {
    setOpen((wasOpen) => {
      if (!wasOpen) {
        setView(seedMonth(value, today));
        setAnchor(null);
      }
      return !wasOpen;
    });
  };

  // Dismiss on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const commit = (period: Period) => {
    onChange(period);
    setOpen(false);
    setAnchor(null);
  };

  const onDayClick = (iso: string) => {
    if (anchor === null) {
      setAnchor(iso);
      return;
    }
    const from = anchor <= iso ? anchor : iso;
    const to = anchor <= iso ? iso : anchor;
    commit({ kind: "range", from, to });
  };

  const thisMonth: Period = {
    kind: "month",
    year: today.getFullYear(),
    month: today.getMonth(),
  };
  const lastMonth: Period = {
    kind: "month",
    year: today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear(),
    month: today.getMonth() === 0 ? 11 : today.getMonth() - 1,
  };

  const span = selectedSpan(value, anchor);
  const todayISO = toISODate(today);
  const cells = monthCells(view.year, view.month);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg border border-cream-3 bg-cream/40 px-3 py-2.5 text-sm text-ink transition-colors hover:bg-cream/60"
      >
        <Calendar className="h-4 w-4 text-maroon" />
        <span className="font-medium">{periodLabel(value)}</span>
        <ChevronDown
          className={`h-4 w-4 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a period"
          className="absolute right-0 z-40 mt-2 w-[320px] rounded-2xl border border-cream-3 bg-white p-4 shadow-lg"
        >
          {/* Quick presets */}
          <div className="flex flex-wrap gap-2">
            <PresetButton
              label="This month"
              active={samePeriod(value, thisMonth)}
              onClick={() => commit(thisMonth)}
            />
            <PresetButton
              label="Last month"
              active={samePeriod(value, lastMonth)}
              onClick={() => commit(lastMonth)}
            />
            <PresetButton
              label="All time"
              active={value.kind === "all"}
              onClick={() => commit({ kind: "all" })}
            />
          </div>

          <div className="my-3 h-px bg-cream-3" />

          {/* Calendar header — month nav + "select whole month" */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setView(stepMonth(view, -1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink transition-colors hover:bg-cream/60"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </button>
            <button
              type="button"
              onClick={() =>
                commit({ kind: "month", year: view.year, month: view.month })
              }
              className="rounded-lg px-2 py-1 text-sm font-semibold text-ink transition-colors hover:bg-cream/60"
              title="Select this whole month"
            >
              {MONTHS_LONG[view.month]} {view.year}
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setView(stepMonth(view, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink transition-colors hover:bg-cream/60"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday row */}
          <div className="mt-2 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="py-1 text-center text-[11px] font-semibold text-ink-soft"
              >
                {w}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) =>
              cell === null ? (
                <div key={`pad-${i}`} />
              ) : (
                <DayButton
                  key={cell.iso}
                  day={cell.day}
                  iso={cell.iso}
                  span={span}
                  isToday={cell.iso === todayISO}
                  onClick={() => onDayClick(cell.iso)}
                />
              ),
            )}
          </div>

          <p className="mt-3 text-[11px] leading-snug text-ink-soft">
            {anchor
              ? "Tap another day to finish the range."
              : "Tap a day to start a custom range, or the month name above to pick the whole month."}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Sub-parts ────────────────────────────────────────────────────────────── */

function PresetButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-maroon px-3 py-1.5 text-xs font-semibold text-white"
          : "rounded-full border border-cream-3 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream/60"
      }
    >
      {label}
    </button>
  );
}

function DayButton({
  day,
  iso,
  span,
  isToday,
  onClick,
}: {
  day: number;
  iso: string;
  span: { start: string; end: string } | null;
  isToday: boolean;
  onClick: () => void;
}) {
  const inSpan = span !== null && iso >= span.start && iso <= span.end;
  const isEnd = span !== null && (iso === span.start || iso === span.end);

  let cls =
    "flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors ";
  if (isEnd) cls += "bg-maroon font-semibold text-white";
  else if (inSpan) cls += "bg-cream text-ink";
  else cls += "text-ink hover:bg-cream/60";
  if (isToday && !inSpan) cls += " font-bold text-maroon";

  return (
    <button type="button" onClick={onClick} className={cls} aria-label={iso}>
      {day}
    </button>
  );
}

/* ── Pure calendar/selection helpers ──────────────────────────────────────── */

/** Which month grid to show for a given selection. */
function seedMonth(value: Period, today: Date): { year: number; month: number } {
  if (value.kind === "month") return { year: value.year, month: value.month };
  if (value.kind === "range") {
    const [y, m] = value.from.split("-").map(Number);
    return { year: y, month: m - 1 };
  }
  return { year: today.getFullYear(), month: today.getMonth() };
}

/** The highlighted span: the in-progress anchor, else the committed selection. */
function selectedSpan(
  value: Period,
  anchor: string | null,
): { start: string; end: string } | null {
  if (anchor) return { start: anchor, end: anchor };
  if (value.kind === "month") {
    const start = toISODate(new Date(value.year, value.month, 1, 12));
    const end = toISODate(new Date(value.year, value.month + 1, 0, 12));
    return { start, end };
  }
  if (value.kind === "range") return { start: value.from, end: value.to };
  return null;
}

/** Move a {year,month} view by ±1 month, wrapping the year. */
function stepMonth(
  view: { year: number; month: number },
  delta: number,
): { year: number; month: number } {
  const total = view.year * 12 + view.month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/** Leading blanks (Monday-first) + each day of the month, as grid cells. */
function monthCells(
  year: number,
  month: number,
): ({ day: number; iso: string } | null)[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (new Date(year, month, 1).getDay() + 6) % 7; // Mon = 0
  const cells: ({ day: number; iso: string } | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++)
    cells.push({ day, iso: toISODate(new Date(year, month, day, 12)) });
  return cells;
}

/** Structural equality for two periods (used to light up active presets). */
function samePeriod(a: Period, b: Period): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "month" && b.kind === "month")
    return a.year === b.year && a.month === b.month;
  if (a.kind === "range" && b.kind === "range")
    return a.from === b.from && a.to === b.to;
  return a.kind === "all";
}
