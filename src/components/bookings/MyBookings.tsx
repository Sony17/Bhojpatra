"use client";

import { useMemo, useState } from "react";
import { myBookings, type Booking, type BookingStatus } from "@/lib/data";

const ALL = "All" as const;
type Filter = typeof ALL | BookingStatus;

const FILTERS: Filter[] = [ALL, "Confirmed", "Pending", "Completed", "Cancelled"];

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const formatINR = (value: number) => inr.format(value);

export default function MyBookings() {
  const [filter, setFilter] = useState<Filter>(ALL);

  const counts = useMemo(() => {
    const confirmed = myBookings.filter((b) => b.status === "Confirmed").length;
    const completed = myBookings.filter((b) => b.status === "Completed").length;
    // Outstanding balance across Confirmed + Pending bookings.
    const dueAmount = myBookings
      .filter((b) => b.status === "Confirmed" || b.status === "Pending")
      .reduce((sum, b) => sum + (b.amount - b.paid), 0);
    return {
      total: myBookings.length,
      confirmed,
      completed,
      dueAmount,
    };
  }, []);

  const results = useMemo(
    () =>
      filter === ALL
        ? myBookings
        : myBookings.filter((b) => b.status === filter),
    [filter],
  );

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:py-16">
      <div className="max-w-2xl">
        <p className="eyebrow text-sm font-medium text-gold">Your Account</p>
        <h1 className="mt-2 text-3xl text-ink sm:text-4xl">My Bookings</h1>
        <p className="font-script mt-3 text-xl text-ink-soft">
          Track your celebrations, payments & confirmations — all in one place.
        </p>
      </div>

      {/* Summary stats */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total Bookings" value={String(counts.total)} />
        <StatCard label="Confirmed" value={String(counts.confirmed)} />
        <StatCard label="Amount Due" value={formatINR(counts.dueAmount)} />
        <StatCard label="Completed" value={String(counts.completed)} />
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
            {f}
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
          <p className="font-display text-lg text-ink">No bookings here</p>
          <p className="mt-1 text-sm text-ink-soft">
            You have no {filter === ALL ? "" : `${filter.toLowerCase()} `}
            bookings yet.
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
  const base =
    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold";
  switch (status) {
    case "Confirmed":
      return <span className={`${base} bg-maroon text-cream`}>Confirmed</span>;
    case "Pending":
      return <span className={`${base} bg-cream-3 text-ink`}>Pending</span>;
    case "Completed":
      return (
        <span className={`${base} bg-cream-2 text-ink`}>
          <span aria-hidden="true">✓</span> Completed
        </span>
      );
    case "Cancelled":
      return (
        <span
          className={`${base} border border-cream-3 text-ink-soft line-through`}
        >
          Cancelled
        </span>
      );
  }
}

function BookingCard({ booking }: { booking: Booking }) {
  const balance = booking.amount - booking.paid;
  const cancelled = booking.status === "Cancelled";
  const progress =
    booking.amount > 0
      ? Math.min(100, Math.round((booking.paid / booking.amount) * 100))
      : 0;

  // Stand-in for a real menu PDF — triggers the browser print dialog for now.
  const handleDownloadMenu = () => window.print();

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
              {booking.occasion}
            </h3>
            <StatusBadge status={booking.status} />
          </div>

          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-soft">
            Booking ID: {booking.id}
          </p>

          <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm text-ink-soft sm:grid-cols-2">
            <p className="flex items-center gap-1.5">
              <span aria-hidden="true">📅</span>
              {booking.date}
            </p>
            <p className="flex items-center gap-1.5">
              <span aria-hidden="true">👥</span>
              {booking.guests} Guests
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
              <span className="text-sm text-ink-soft">Total</span>
              <span className="font-display text-lg font-semibold text-ink">
                {formatINR(booking.amount)}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between text-sm">
              <span className="text-ink-soft">Paid</span>
              <span className="font-medium text-maroon">
                {formatINR(booking.paid)}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between text-sm">
              <span className="text-ink-soft">Balance</span>
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
              aria-label="Payment progress"
            >
              <div
                className="h-full rounded-full bg-maroon transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">{progress}% paid</p>
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
            Pay Advance
          </button>
        )}
        <button
          type="button"
          onClick={handleDownloadMenu}
          className="rounded-full border border-maroon px-6 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
        >
          Download Menu
        </button>
        <button
          type="button"
          className="rounded-full border border-cream-3 px-6 py-3 text-sm font-semibold text-ink-soft transition hover:bg-cream-2"
        >
          View Details
        </button>
      </div>
    </li>
  );
}
