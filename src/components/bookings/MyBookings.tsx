"use client";

import { useEffect, useMemo, useState } from "react";
import { type BookingStatus } from "@/lib/data";
import {
  getStoredBookings,
  onStoredBookingsChange,
  downloadReceipt,
  type StoredBooking,
} from "@/lib/bookings";
import { useLang } from "@/lib/i18n";

const ALL = "All" as const;
type Filter = typeof ALL | BookingStatus;

const FILTERS: Filter[] = [ALL, "Confirmed", "Pending", "Completed", "Cancelled"];

const STATUS_HI: Record<Filter, string> = {
  All: "सभी",
  Confirmed: "कन्फर्म्ड",
  Pending: "पेंडिंग",
  Completed: "पूर्ण",
  Cancelled: "रद्द",
};

const OCCASION_HI: Record<string, string> = {
  Wedding: "शादी",
  Engagement: "सगाई",
  "Birthday Party": "बर्थडे पार्टी",
  "Corporate Event": "कॉर्पोरेट इवेंट",
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const formatINR = (value: number) => inr.format(value);

export default function MyBookings() {
  const { t } = useLang();
  const [filter, setFilter] = useState<Filter>(ALL);
  // Bookings the user has actually made. Empty until they book through the
  // wizard — loaded client-side from localStorage so the list starts empty.
  const [bookings, setBookings] = useState<StoredBooking[]>([]);

  useEffect(() => {
    const load = () => setBookings(getStoredBookings());
    load();
    return onStoredBookingsChange(load);
  }, []);

  const counts = useMemo(() => {
    const confirmed = bookings.filter((b) => b.status === "Confirmed").length;
    const completed = bookings.filter((b) => b.status === "Completed").length;
    // Outstanding balance across Confirmed + Pending bookings.
    const dueAmount = bookings
      .filter((b) => b.status === "Confirmed" || b.status === "Pending")
      .reduce((sum, b) => sum + (b.amount - b.paid), 0);
    return {
      total: bookings.length,
      confirmed,
      completed,
      dueAmount,
    };
  }, [bookings]);

  const results = useMemo(
    () =>
      filter === ALL
        ? bookings
        : bookings.filter((b) => b.status === filter),
    [filter, bookings],
  );

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:py-16">
      <div className="max-w-2xl">
        <p className="eyebrow text-sm font-medium text-gold">
          {t("Your Account", "आपका खाता")}
        </p>
        <h1 className="mt-2 text-3xl text-ink sm:text-4xl">
          {t("My Bookings", "मेरी बुकिंग")}
        </h1>
        <p className="font-script mt-3 text-xl text-ink-soft">
          {t(
            "Track your celebrations, payments & confirmations — all in one place.",
            "अपने समारोह, भुगतान और कन्फर्मेशन — सब एक ही जगह पर ट्रैक करें।",
          )}
        </p>
      </div>

      {/* Summary stats */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label={t("Total Bookings", "कुल बुकिंग")}
          value={String(counts.total)}
        />
        <StatCard
          label={t("Confirmed", "कन्फर्म्ड")}
          value={String(counts.confirmed)}
        />
        <StatCard
          label={t("Amount Due", "बकाया राशि")}
          value={formatINR(counts.dueAmount)}
        />
        <StatCard
          label={t("Completed", "पूर्ण")}
          value={String(counts.completed)}
        />
      </div>

      {/* Filter chips */}
      <div className="mt-8 flex flex-wrap gap-2.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={
              "rounded-full px-5 py-2 text-sm font-medium transition-colors " +
              (filter === f
                ? "bg-maroon text-cream"
                : "bg-cream-2 text-ink-soft hover:bg-cream-3")
            }
          >
            {t(f, STATUS_HI[f])}
          </button>
        ))}
      </div>

      {/* Bookings list */}
      {results.length > 0 ? (
        <ul className="mt-6 flex flex-col gap-5">
          {results.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </ul>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-cream-3 bg-white/60 p-12 text-center">
          <p className="font-display text-lg text-ink">
            {t("No bookings here", "यहाँ कोई बुकिंग नहीं")}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {filter === ALL
              ? t("No bookings yet", "अभी कोई बुकिंग नहीं")
              : t(
                  `You have no ${filter.toLowerCase()} bookings yet.`,
                  `अभी कोई ${STATUS_HI[filter]} बुकिंग नहीं।`,
                )}
          </p>
        </div>
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
        {label}
      </p>
      <p className="font-display mt-2 text-2xl font-semibold text-maroon">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useLang();
  const base =
    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold";
  switch (status) {
    case "Confirmed":
      return (
        <span className={`${base} bg-maroon text-cream`}>
          {t("Confirmed", STATUS_HI.Confirmed)}
        </span>
      );
    case "Pending":
      return (
        <span className={`${base} bg-cream-3 text-ink`}>
          {t("Pending", STATUS_HI.Pending)}
        </span>
      );
    case "Completed":
      return (
        <span className={`${base} bg-cream-2 text-ink`}>
          <span aria-hidden="true">✓</span> {t("Completed", STATUS_HI.Completed)}
        </span>
      );
    case "Cancelled":
      return (
        <span
          className={`${base} border border-cream-3 text-ink-soft line-through`}
        >
          {t("Cancelled", STATUS_HI.Cancelled)}
        </span>
      );
  }
}

function BookingCard({ booking }: { booking: StoredBooking }) {
  const { t } = useLang();
  const balance = booking.amount - booking.paid;
  const cancelled = booking.status === "Cancelled";
  const progress =
    booking.amount > 0
      ? Math.min(100, Math.round((booking.paid / booking.amount) * 100))
      : 0;

  // Download just this order's receipt — not any other booking.
  const handleDownloadMenu = () => downloadReceipt(booking);

  return (
    <li
      className={
        "rounded-2xl border border-cream-3 bg-white p-5 shadow-sm sm:p-6 " +
        (cancelled ? "opacity-75" : "")
      }
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-display text-lg font-semibold text-ink">
              {t(booking.occasion, OCCASION_HI[booking.occasion] ?? booking.occasion)}
            </h3>
            <StatusBadge status={booking.status} />
          </div>

          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-soft">
            {t("Booking ID", "बुकिंग आईडी")}: {booking.id}
          </p>

          <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm text-ink-soft sm:grid-cols-2">
            <p className="flex items-center gap-1.5">
              <span aria-hidden="true">📅</span>
              {booking.date}
            </p>
            <p className="flex items-center gap-1.5">
              <span aria-hidden="true">👥</span>
              {booking.guests} {t("Guests", "मेहमान")}
            </p>
            <p className="flex items-center gap-1.5">
              <span aria-hidden="true">🍲</span>
              {booking.vendor}
            </p>
            <p className="flex items-center gap-1.5">
              <span aria-hidden="true">📍</span>
              {booking.city}
            </p>
          </div>
        </div>

        {/* Payment summary */}
        <div className="lg:w-72 lg:shrink-0">
          <div className="rounded-xl border border-cream-3 bg-cream/40 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink-soft">
                {t("Total", "कुल राशि")}
              </span>
              <span className="font-display text-lg font-semibold text-ink">
                {formatINR(booking.amount)}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between text-sm">
              <span className="text-ink-soft">{t("Paid", "भुगतान")}</span>
              <span className="font-medium text-maroon">
                {formatINR(booking.paid)}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between text-sm">
              <span className="text-ink-soft">{t("Balance", "बकाया")}</span>
              <span className="font-medium text-ink">
                {formatINR(balance)}
              </span>
            </div>

            {/* Paid / total progress bar */}
            <div
              className="mt-3 h-2 w-full overflow-hidden rounded-full bg-cream-2"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("Payment progress", "भुगतान प्रगति")}
            >
              <div
                className="h-full rounded-full bg-maroon transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">
              {t(`${progress}% paid`, `${progress}% भुगतान`)}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap gap-3 border-t border-cream-3 pt-4">
        {booking.status === "Pending" && (
          <button
            type="button"
            className="rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
          >
            {t("Pay Advance", "अभी भुगतान करें")}
          </button>
        )}
        <button
          type="button"
          onClick={handleDownloadMenu}
          className="rounded-full border border-maroon px-6 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
        >
          {t("Download Menu", "मेन्यू डाउनलोड")}
        </button>
        <button
          type="button"
          className="rounded-full border border-cream-3 px-6 py-3 text-sm font-semibold text-ink-soft transition hover:bg-cream-2"
        >
          {t("View Details", "विवरण देखें")}
        </button>
      </div>
    </li>
  );
}
