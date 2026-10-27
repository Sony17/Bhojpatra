"use client";

/**
 * Vendor Portal → Calendar. The vendor's Single Stall availability: a switch
 * for today, their booking notice (same day / next day / …), the month
 * calendar (their days off, days their bookings filled, days with some meals
 * taken), and a switch for whichever day they tap.
 * Wired to GET/POST /api/vendor/availability; customers see the same calendar
 * (GET /api/vendors/availability) when they pick this vendor or a date.
 */

import { useCallback, useEffect, useState } from "react";
import { AvailabilityCalendar } from "@/components/booking/VendorAvailability";
import { formatEventDate } from "@/lib/bookingPricing";
import {
  availabilityFor,
  todayIsoIST,
  type VendorAvailability,
} from "@/lib/vendorAvailability";
import type { VendorOrderSummary } from "@/lib/vendorOrders";
import {
  DEFAULT_SAME_DAY_CUTOFF,
  SAME_DAY_CUTOFFS,
  STALL_NOTICE_OPTIONS,
  formatCutoff,
} from "@/lib/stallNotice";

/** The vendor's Single Stall notice; `days: null` = never set. */
type Notice = { days: number | null; cutoff: string | null };
import { cn } from "@/components/ui/cn";

const CARD = "rounded-card border border-cream/30 bg-white shadow-card";

/** On/off switch (role="switch"): red track when on, cream when off. */
function Switch({
  on,
  onChange,
  disabled,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        on ? "bg-maroon" : "bg-cream",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block h-6 w-6 rounded-full bg-white shadow-card transition-transform",
          on ? "translate-x-7" : "translate-x-1",
        )}
      />
    </button>
  );
}

export default function AvailabilityTab({
  orders,
  flash,
}: {
  /** The vendor's active orders (pending + confirmed) — listed under a day. */
  orders: VendorOrderSummary[];
  flash: (msg: string) => void;
}) {
  const today = todayIsoIST();
  const [av, setAv] = useState<VendorAvailability | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState(today);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>({ days: null, cutoff: null });

  useEffect(() => {
    let live = true;
    fetch("/api/vendor/availability", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: VendorAvailability & { notice?: Notice }) => {
        if (!live) return;
        setAv({ blocked: d.blocked ?? [], booked: d.booked ?? [] });
        if (d.notice) setNotice(d.notice);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  const setAvailable = useCallback(
    async (date: string, available: boolean) => {
      setSaving(true);
      const r = await fetch("/api/vendor/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates: [date], available }),
      }).catch(() => null);
      const d = await r?.json().catch(() => null);
      setSaving(false);
      if (!r?.ok) {
        flash(d?.error || "Couldn't update your availability. Please try again.");
        return;
      }
      setAv({ blocked: d.blocked ?? [], booked: d.booked ?? [] });
      flash(
        available
          ? `You're taking Single Stall orders on ${formatEventDate(date)}.`
          : `${formatEventDate(date)} is marked off — customers can't book you that day.`,
      );
    },
    [flash],
  );

  const saveNotice = async (days: number, cutoff: string | null) => {
    setSaving(true);
    const r = await fetch("/api/vendor/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notice: { days, cutoff } }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setSaving(false);
    if (!r?.ok) {
      flash(d?.error || "Couldn't update your booking notice. Please try again.");
      return;
    }
    if (d.notice) setNotice(d.notice);
    flash(
      days === 0
        ? `Same-day Single Stall orders are on — until ${formatCutoff(d.notice?.cutoff ?? DEFAULT_SAME_DAY_CUTOFF)} each day.`
        : `Customers now book your Single Stall ${days === 1 ? "from the next day" : `${days} days ahead`}.`,
    );
  };

  if (failed) {
    return (
      <div className={cn(CARD, "p-6 text-sm text-ink/70")}>
        Couldn&apos;t load your calendar. Please refresh the page.
      </div>
    );
  }
  if (!av) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-maroon border-t-transparent" />
      </div>
    );
  }

  const isOff = (date: string) => av.blocked.includes(date);
  const day = av.booked.find((d) => d.date === selected);
  const dayOrders = orders.filter((o) => o.eventDateISO === selected);
  const status = availabilityFor(av, selected);
  const upcomingOff = av.blocked.filter((d) => d >= today);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      {/* Today */}
      <div className={cn(CARD, "flex items-center justify-between gap-4 p-4 sm:p-5")}>
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wide text-maroon">Today · {formatEventDate(today)}</div>
          <div className="mt-0.5 text-[15px] font-bold text-ink">
            {isOff(today) ? "Not taking Single Stall orders" : "Taking Single Stall orders"}
          </div>
          <p className="mt-0.5 text-[12.5px] text-ink/60">Switch off when your kitchen can&apos;t take a new stall today.</p>
        </div>
        <Switch
          on={!isOff(today)}
          disabled={saving}
          label="Taking Single Stall orders today"
          onChange={(next) => void setAvailable(today, next)}
        />
      </div>

      {/* Booking notice — how far ahead customers must book the stall */}
      <div className={cn(CARD, "p-4 sm:p-5")}>
        <div className="text-[15px] font-bold text-ink">Single Stall booking notice</div>
        <p className="mt-0.5 text-[12.5px] text-ink/60">
          How far ahead customers must book your stall. Choose “Same day” if your kitchen can take an order for today.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-[12px] font-bold text-ink/70">
            Notice
            <select
              value={notice.days ?? ""}
              disabled={saving}
              onChange={(e) => void saveNotice(Number(e.target.value), notice.cutoff)}
              className="h-11 rounded-control border border-cream bg-white px-3 text-[14px] font-semibold text-ink"
            >
              {notice.days == null && (
                <option value="" disabled>
                  Not set — platform default (2 days)
                </option>
              )}
              {STALL_NOTICE_OPTIONS.map((o) => (
                <option key={o.days} value={o.days}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {notice.days === 0 && (
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-[12px] font-bold text-ink/70">
              Same-day orders until
              <select
                value={notice.cutoff ?? DEFAULT_SAME_DAY_CUTOFF}
                disabled={saving}
                onChange={(e) => void saveNotice(0, e.target.value)}
                className="h-11 rounded-control border border-cream bg-white px-3 text-[14px] font-semibold text-ink"
              >
                {SAME_DAY_CUTOFFS.map((c) => (
                  <option key={c} value={c}>
                    {formatCutoff(c)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <p className="mt-2 text-[12px] text-ink/55">
          Some occasions need more notice set by Bhojpatra (e.g. weddings) — the longer of the two applies.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Calendar */}
        <div className={cn(CARD, "p-4 sm:p-5 lg:col-span-3")}>
          <div className="mb-3">
            <div className="text-base font-bold text-ink">Availability calendar</div>
            <p className="text-[12.5px] text-ink/60">Tap a day to switch it on or off. Customers see these dates when they pick your stall.</p>
          </div>
          <AvailabilityCalendar
            availability={av}
            selected={selected}
            onSelect={setSelected}
            variant="vendor"
          />
        </div>

        {/* The tapped day */}
        <div className={cn(CARD, "flex flex-col gap-3 p-4 sm:p-5 lg:col-span-2")}>
          <div className="text-[11px] font-bold uppercase tracking-wide text-maroon">{formatEventDate(selected)}</div>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[15px] font-bold text-ink">
                {isOff(selected) ? "Day off" : "Available for Single Stall"}
              </div>
              <p className="text-[12.5px] text-ink/60">
                {isOff(selected)
                  ? "Customers can't book you on this day."
                  : status === "day"
                    ? "Fully booked — no slot left this day."
                    : day?.meals.length
                      ? `Booked for ${day.meals.join(", ")} — other meal times are open.`
                      : "Open for every meal time."}
              </p>
            </div>
            <Switch
              on={!isOff(selected)}
              disabled={saving}
              label={`Taking Single Stall orders on ${formatEventDate(selected)}`}
              onChange={(next) => void setAvailable(selected, next)}
            />
          </div>
          {isOff(selected) && dayOrders.length > 0 && (
            <p className="rounded-control bg-cream/40 px-3 py-2 text-[12.5px] text-ink">
              A day off stops new orders only — the bookings below are still yours to serve.
            </p>
          )}

          <div className="border-t border-cream/60 pt-3">
            <div className="text-[12px] font-bold text-ink/70">Bookings this day</div>
            {dayOrders.length === 0 ? (
              <p className="mt-1 text-[12.5px] text-ink/50">No bookings.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {dayOrders.map((o) => (
                  <li key={o.id} className="rounded-control border border-cream/60 px-3 py-2 text-[12.5px]">
                    <div className="font-bold text-ink">{o.occasion} ({o.customer})</div>
                    <div className="text-ink/60">
                      {[o.mealTime || "Whole day", `${o.guests} guests`, o.vendorAcknowledged ? "Accepted" : "Awaiting your response"].join(" · ")}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {upcomingOff.length > 0 && (
            <div className="border-t border-cream/60 pt-3">
              <div className="text-[12px] font-bold text-ink/70">Your upcoming days off</div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {upcomingOff.slice(0, 12).map((d) => (
                  <li key={d}>
                    <button
                      type="button"
                      onClick={() => setSelected(d)}
                      className="rounded-full bg-ink px-2.5 py-1 text-[11.5px] font-bold text-white"
                    >
                      {formatEventDate(d)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
