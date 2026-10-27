"use client";

/**
 * Single Stall vendor availability, customer side (and the month grid the
 * vendor portal's Calendar tab reuses).
 *
 *   • `useVendorAvailability` — the vendor's public calendar
 *     (GET /api/vendors/availability).
 *   • `AvailabilityCalendar` — an inline month grid painting days off, fully
 *     booked and partly booked days.
 *   • `VendorAvailabilitySheet` — "check availability": the calendar plus the
 *     open meal periods on the chosen day.
 *   • `useStallAvailabilityGate` — runs the check the moment a guest picks a
 *     vendor (the /vendors "Book" CTA): when the event date already in their
 *     brief is taken, the sheet opens instead of the booking page.
 */

import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n";
import { bookingMealTimes } from "@/lib/data";
import { formatEventDate } from "@/lib/bookingPricing";
import { readStallDraft, seedStallDraftBrief } from "@/lib/stallDraft";
import {
  availabilityFor,
  partlyBookedDates,
  takenMeals,
  todayIsoIST,
  unavailableDates,
  type Unavailable,
  type VendorAvailability,
} from "@/lib/vendorAvailability";
import { Sheet } from "@/components/vendor/portalUi";
import { cn } from "@/components/ui/cn";

type T = (en: string, hi: string) => string;

export async function fetchVendorAvailability(
  vendorId: string,
): Promise<VendorAvailability | null> {
  try {
    const r = await fetch(
      `/api/vendors/availability?id=${encodeURIComponent(vendorId)}`,
      { cache: "no-store" },
    );
    if (!r.ok) return null;
    const d = (await r.json()) as Partial<VendorAvailability>;
    return { blocked: d.blocked ?? [], booked: d.booked ?? [] };
  } catch {
    return null;
  }
}

/** The vendor's public calendar; null while loading, or when it can't be read
 *  (the booking POST still checks, so a failed read never blocks anyone).
 *  Bump `refresh` to read it again (e.g. after checkout found the slot gone). */
export function useVendorAvailability(vendorId: string | undefined, refresh = 0) {
  const [state, setState] = useState<{ id: string; av: VendorAvailability | null }>({
    id: "",
    av: null,
  });
  useEffect(() => {
    if (!vendorId) return;
    let live = true;
    const load = () =>
      void fetchVendorAvailability(vendorId).then((av) => {
        // A failed re-read keeps the last good calendar.
        if (live) setState((prev) => (av || prev.id !== vendorId ? { id: vendorId, av } : prev));
      });
    load();
    // The vendor can switch a day off while this page sits open (often in
    // another tab) — re-read whenever the guest comes back to it.
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", load);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", load);
    };
  }, [vendorId, refresh]);
  return vendorId && state.id === vendorId ? state.av : null;
}

/** The customer-facing sentence for an unavailable date / meal. */
export function unavailableText(
  t: T,
  reason: Unavailable,
  vendorName: string,
  date: string,
  meals: string[],
): string {
  const when = formatEventDate(date);
  if (reason === "blocked")
    return t(
      `${vendorName} isn't taking orders on ${when}.`,
      `${vendorName} ${when} को ऑर्डर नहीं ले रहे हैं।`,
    );
  if (reason === "day")
    return t(
      `${vendorName} is fully booked on ${when}.`,
      `${vendorName} ${when} को पूरी तरह बुक हैं।`,
    );
  const list = meals.join(", ").toLowerCase();
  return t(
    `${vendorName} is already booked for ${list || "a meal"} on ${when}. Pick another meal time or date.`,
    `${vendorName} ${when} को ${list || "एक भोजन"} के लिए पहले से बुक हैं। दूसरा भोजन समय या तारीख़ चुनें।`,
  );
}

/* ── Month grid ───────────────────────────────────────────────────────────── */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_HI = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAYS_HI = ["र", "सो", "मं", "बु", "गु", "शु", "श"];

const isoOf = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

type DayKind = "past" | "off" | "full" | "partly" | "free";

/**
 * Inline month grid over a vendor's availability. The customer variant can't
 * pick an unavailable day; the vendor variant can pick any day from today on
 * (to switch it on or off), and paints their own days off apart from days
 * their bookings filled.
 */
export function AvailabilityCalendar({
  availability,
  selected,
  onSelect,
  variant = "customer",
  minDate,
}: {
  availability: VendorAvailability | null;
  selected?: string;
  onSelect?: (iso: string) => void;
  variant?: "customer" | "vendor";
  /** Earliest pickable day (YYYY-MM-DD); defaults to today in India. */
  minDate?: string;
}) {
  const { lang, t } = useLang();
  const today = todayIsoIST();
  const floor = minDate && minDate > today ? minDate : today;
  const start = selected && selected >= today ? selected : today;
  const [view, setView] = useState(() => ({
    y: Number(start.slice(0, 4)),
    m: Number(start.slice(5, 7)) - 1,
  }));

  const off = useMemo(() => new Set(availability?.blocked ?? []), [availability]);
  const full = useMemo(() => new Set(unavailableDates(availability)), [availability]);
  const partly = useMemo(() => new Set(partlyBookedDates(availability)), [availability]);

  const kindOf = (iso: string): DayKind =>
    iso < floor
      ? "past"
      : off.has(iso)
        ? "off"
        : full.has(iso)
          ? "full"
          : partly.has(iso)
            ? "partly"
            : "free";

  const first = new Date(view.y, view.m, 1).getDay();
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(first).fill(null),
    ...Array.from({ length: days }, (_, i) => isoOf(view.y, view.m, i + 1)),
  ];
  const atFirst =
    view.y < Number(today.slice(0, 4)) ||
    (view.y === Number(today.slice(0, 4)) && view.m <= Number(today.slice(5, 7)) - 1);
  const shift = (n: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const label = (kind: DayKind): string | undefined =>
    kind === "off"
      ? variant === "vendor"
        ? t("day off", "छुट्टी")
        : t("unavailable", "उपलब्ध नहीं")
      : kind === "full"
        ? t("fully booked", "पूरी तरह बुक")
        : kind === "partly"
          ? t("some meals booked", "कुछ भोजन बुक")
          : undefined;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          type="button"
          aria-label={t("Previous month", "पिछला महीना")}
          onClick={() => shift(-1)}
          disabled={atFirst}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-maroon hover:bg-cream/50 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ‹
        </button>
        <span className="text-sm font-bold text-ink">
          {(lang === "hi" ? MONTHS_HI : MONTHS)[view.m]} {view.y}
        </span>
        <button
          type="button"
          aria-label={t("Next month", "अगला महीना")}
          onClick={() => shift(1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-maroon hover:bg-cream/50"
        >
          ›
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {(lang === "hi" ? WEEKDAYS_HI : WEEKDAYS).map((w, i) => (
          <div key={i} className="flex h-7 items-center justify-center text-[11px] font-semibold text-ink/50">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((iso, i) => {
          if (!iso) return <div key={i} className="h-10" />;
          const kind = kindOf(iso);
          const isSel = iso === selected;
          const disabled =
            kind === "past" || (variant === "customer" && (kind === "off" || kind === "full"));
          const extra = label(kind);
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled || !onSelect}
              aria-pressed={isSel}
              aria-label={`${Number(iso.slice(8))}${extra ? ` — ${extra}` : ""}`}
              onClick={() => onSelect?.(iso)}
              className={cn(
                "relative flex h-10 items-center justify-center rounded-lg text-sm transition-colors",
                kind === "past" && "cursor-not-allowed text-ink/25",
                kind === "off" &&
                  (variant === "vendor"
                    ? "bg-ink font-semibold text-white"
                    : "cursor-not-allowed bg-maroon/15 font-semibold text-maroon line-through"),
                kind === "full" &&
                  (variant === "vendor"
                    ? "bg-maroon/15 font-semibold text-maroon"
                    : "cursor-not-allowed bg-maroon/15 font-semibold text-maroon line-through"),
                kind === "partly" && "bg-cream/70 font-semibold text-ink",
                kind === "free" && "text-ink hover:bg-cream/40",
                isSel && "ring-2 ring-maroon ring-offset-1",
                isSel && kind === "free" && "bg-maroon font-semibold text-white hover:bg-maroon",
              )}
            >
              {Number(iso.slice(8))}
              {iso === today && (
                <span aria-hidden className="absolute bottom-1 h-1 w-1 rounded-full bg-current" />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-cream/60 pt-2.5 text-[11px] text-ink/70">
        {variant === "vendor" && (
          <Legend swatch="bg-ink">{t("Day off (you)", "छुट्टी (आप)")}</Legend>
        )}
        <Legend swatch="bg-maroon/15">
          {variant === "vendor"
            ? t("Fully booked", "पूरी तरह बुक")
            : t("Unavailable", "उपलब्ध नहीं")}
        </Legend>
        <Legend swatch="bg-cream/70">{t("Some meals booked", "कुछ भोजन बुक")}</Legend>
        <Legend swatch="border border-cream bg-white">{t("Available", "उपलब्ध")}</Legend>
      </div>
    </div>
  );
}

function Legend({ swatch, children }: { swatch: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn("inline-block h-3 w-3 shrink-0 rounded", swatch)} />
      {children}
    </span>
  );
}

/* ── "Check availability" sheet ───────────────────────────────────────────── */

/**
 * The vendor's calendar for a guest: pick an open day, see which meal periods
 * are still free on it, and carry on with that date (and meal) — or go back
 * and choose another stall.
 */
export function VendorAvailabilitySheet({
  open,
  onClose,
  vendorId,
  vendorName,
  date,
  mealTime,
  onContinue,
  continueLabel,
}: {
  open: boolean;
  onClose: () => void;
  vendorId: string;
  vendorName: string;
  /** The date already in the guest's brief, if any. */
  date?: string;
  mealTime?: string;
  /** Called with the chosen open date (and meal, when one was picked). */
  onContinue?: (date: string, mealTime: string) => void;
  continueLabel?: string;
}) {
  const { lang, t } = useLang();
  const av = useVendorAvailability(open ? vendorId : undefined);
  const [picked, setPicked] = useState<string>("");
  const [meal, setMeal] = useState<string>("");
  const day = picked || date || "";
  const chosenMeal = picked ? meal : meal || mealTime || "";
  const reason = av && day ? availabilityFor(av, day, chosenMeal) : null;
  const taken = av && day ? takenMeals(av, day) : [];
  const takenSet = new Set(taken.map((m) => m.toLowerCase()));

  const close = () => {
    setPicked("");
    setMeal("");
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      eyebrow={t("Check availability", "उपलब्धता देखें")}
      // Above the booking brief's phone drawer (z-[90]) it can open from.
      overlayClassName="z-[100]"
      title={vendorName}
      footer={
        onContinue ? (
          <>
            <button
              type="button"
              onClick={close}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-cream px-4 text-[13px] font-bold text-ink/80"
            >
              {t("Choose another stall", "दूसरा स्टॉल चुनें")}
            </button>
            <button
              type="button"
              disabled={!av || !day || reason !== null}
              onClick={() => onContinue(day, chosenMeal)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-maroon px-5 text-[13px] font-bold text-white disabled:opacity-50"
            >
              {continueLabel ?? t("Continue", "आगे बढ़ें")}
            </button>
          </>
        ) : undefined
      }
    >
      {!av ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-maroon border-t-transparent" />
        </div>
      ) : (
        <>
          {day && reason && (
            <p role="alert" className="mb-3 rounded-control border border-maroon/40 bg-maroon/5 px-3 py-2.5 text-[13px] font-semibold text-maroon">
              {unavailableText(t, reason, vendorName, day, reason === "slot" ? taken : [])}
            </p>
          )}
          <AvailabilityCalendar
            availability={av}
            selected={day}
            onSelect={(iso) => {
              setPicked(iso);
              setMeal("");
            }}
          />
          {day && reason !== "blocked" && reason !== "day" && (
            <div className="mt-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink/60">
                {t(`Meal times on ${formatEventDate(day)}`, `${formatEventDate(day)} के भोजन समय`)}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {bookingMealTimes.map((m) => {
                  const busy = takenSet.has(m.id.toLowerCase());
                  const on = chosenMeal.toLowerCase() === m.id.toLowerCase();
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={busy}
                      aria-pressed={on}
                      onClick={() => {
                        if (!picked && date) setPicked(date);
                        setMeal(m.id);
                      }}
                      className={cn(
                        "min-h-[40px] rounded-full border px-3.5 text-[13px] font-semibold",
                        busy
                          ? "cursor-not-allowed border-maroon/20 bg-maroon/10 text-maroon line-through"
                          : on
                            ? "border-maroon bg-maroon text-white"
                            : "border-cream bg-white text-ink hover:border-maroon",
                      )}
                    >
                      {lang === "hi" ? m.nameHi : m.name}
                      {busy ? ` · ${t("booked", "बुक")}` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}

/* ── The check at vendor selection ────────────────────────────────────────── */

/** The vendor a booking link books — its `?vendor=` (the booking roster's
 *  id, which orders carry), else the listing's own id. */
export function bookedVendorId(href: string, fallback: string): string {
  return new URLSearchParams(href.split("?")[1] ?? "").get("vendor") || fallback;
}

/** The event date / meal the guest has already given, wherever it lives: a
 *  `?date=` on this page (Hero hand-off) or the Single Stall draft. */
function briefInHand(): { date: string; mealTime: string } {
  const draft = readStallDraft();
  const urlDate =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("date") ?? ""
      : "";
  return {
    date: urlDate || draft?.eventDate || "",
    mealTime: draft?.mealTime ?? "",
  };
}

/**
 * Wraps a "Book this stall" link: when the guest's brief already has an
 * event date, the vendor's calendar is checked before leaving the page. A
 * free slot navigates as normal; a taken one opens the availability sheet,
 * from which the guest picks an open date (carried onto the booking) or
 * another stall. With no date yet the link just navigates — the wizard's
 * date picker shows the same calendar.
 */
export function useStallAvailabilityGate() {
  const router = useRouter();
  const { t } = useLang();
  const [target, setTarget] = useState<{
    vendorId: string;
    vendorName: string;
    href: string;
    date: string;
    mealTime: string;
    /** Opened from a "Check availability" link rather than a clash. */
    browsing?: boolean;
  } | null>(null);

  const onSelect = useCallback(
    (
      e: MouseEvent<HTMLElement>,
      v: { vendorId: string; vendorName: string; href: string },
    ) => {
      const brief = briefInHand();
      if (!brief.date || brief.date < todayIsoIST()) return;
      // Let modified clicks (new tab) through untouched.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      const vendorId = bookedVendorId(v.href, v.vendorId);
      void fetchVendorAvailability(vendorId).then((av) => {
        if (av && availabilityFor(av, brief.date, brief.mealTime)) {
          setTarget({ ...v, vendorId, ...brief });
        } else {
          router.push(v.href);
        }
      });
    },
    [router],
  );

  /** "Check availability": the vendor's calendar, opened on the date already
   *  in the guest's brief (if any). */
  const openCalendar = useCallback(
    (v: { vendorId: string; vendorName: string; href: string }) => {
      const brief = briefInHand();
      setTarget({
        ...v,
        vendorId: bookedVendorId(v.href, v.vendorId),
        date: brief.date >= todayIsoIST() ? brief.date : "",
        mealTime: brief.mealTime,
        browsing: true,
      });
    },
    [],
  );

  // Portalled: the gate sits inside cards whose hover transform would trap a
  // fixed-position sheet.
  const sheet = target ? createPortal(
    <VendorAvailabilitySheet
      open
      onClose={() => setTarget(null)}
      vendorId={target.vendorId}
      vendorName={target.vendorName}
      date={target.date}
      mealTime={target.mealTime}
      continueLabel={target.browsing ? t("Book this date", "यह तारीख़ बुक करें") : undefined}
      onContinue={(date, mealTime) => {
        if (mealTime) seedStallDraftBrief({ mealTime });
        const [path, qs = ""] = target.href.split("?");
        const sp = new URLSearchParams(qs);
        sp.set("date", date);
        setTarget(null);
        router.push(`${path}?${sp.toString()}`);
      }}
    />,
    document.body,
  ) : null;

  return { onSelect, openCalendar, sheet };
}
