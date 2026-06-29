"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type BookingStatus } from "@/lib/data";
import {
  getStoredBookings,
  onStoredBookingsChange,
  updateStoredBooking,
  downloadReceipt,
  bookingInvoice,
  type StoredBooking,
} from "@/lib/bookings";
import { downloadInvoice, invoiceShareUrl } from "@/lib/invoice";
import { useLang } from "@/lib/i18n";
import InvoicePreview from "./InvoicePreview";

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

/** Months as they appear in a booking's date label (e.g. "12 Dec 2026"). */
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** A booking locks for editing this many days before the event. */
const EDIT_LOCK_DAYS = 30;

/** "12 Dec 2026" → "2026-12-12" (for a native date input); "" if unparseable. */
function labelToISO(label: string): string {
  const [d, mon, y] = label.split(" ");
  const m = MONTHS.indexOf(mon);
  if (!d || m < 0 || !y) return "";
  return `${y}-${String(m + 1).padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** "2026-12-12" → "12 Dec 2026"; falls back to the input if unparseable. */
function isoToLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

/** Whole days from today until a booking's event date; null if unparseable. */
function daysUntilLabel(label: string): number | null {
  const iso = labelToISO(label);
  if (!iso) return null;
  const event = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(event.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((event.getTime() - today.getTime()) / 86_400_000);
}

/** Whether a booking may still be edited, and why not when it can't. Editing
 *  closes once the event is within EDIT_LOCK_DAYS, and is never allowed for
 *  completed or cancelled orders. */
function editability(booking: StoredBooking): {
  editable: boolean;
  reason: { en: string; hi: string } | null;
} {
  if (booking.status === "Cancelled" || booking.status === "Completed") {
    return {
      editable: false,
      reason: {
        en: "This booking can no longer be edited.",
        hi: "यह बुकिंग अब संपादित नहीं की जा सकती।",
      },
    };
  }
  const days = daysUntilLabel(booking.date);
  if (days !== null && days <= EDIT_LOCK_DAYS) {
    return {
      editable: false,
      reason: {
        en:
          days < 0
            ? "Your event date has passed."
            : `Editing closes ${EDIT_LOCK_DAYS} days before the event — please contact us for changes.`,
        hi:
          days < 0
            ? "आपकी इवेंट तिथि बीत चुकी है।"
            : `संपादन इवेंट से ${EDIT_LOCK_DAYS} दिन पहले बंद हो जाता है — बदलाव के लिए हमसे संपर्क करें।`,
      },
    };
  }
  return { editable: true, reason: null };
}

export default function MyBookings() {
  const { t } = useLang();
  const [filter, setFilter] = useState<Filter>(ALL);
  // Bookings the user has actually made. Empty until they book through the
  // wizard — loaded client-side from localStorage so the list starts empty.
  const [bookings, setBookings] = useState<StoredBooking[]>([]);
  // The booking open in the details modal, tracked by id so edits made in the
  // modal re-read from the freshly reloaded list rather than going stale.
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(
    () => bookings.find((b) => b.id === activeId) ?? null,
    [bookings, activeId],
  );

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
            <BookingCard
              key={booking.id}
              booking={booking}
              onView={() => setActiveId(booking.id)}
            />
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

      {active && (
        <BookingDetailsModal booking={active} onClose={() => setActiveId(null)} />
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

function BookingCard({
  booking,
  onView,
}: {
  booking: StoredBooking;
  onView: () => void;
}) {
  const { t } = useLang();
  const balance = booking.amount - booking.paid;
  const cancelled = booking.status === "Cancelled";
  const progress =
    booking.amount > 0
      ? Math.min(100, Math.round((booking.paid / booking.amount) * 100))
      : 0;

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
            {booking.referralCode && (
              <span className="inline-flex items-center gap-1 rounded-full bg-maroon px-3 py-1 text-xs font-semibold text-cream">
                <span aria-hidden="true">★</span>
                {booking.referrerName
                  ? t(`Referred by ${booking.referrerName}`, `रेफ़र: ${booking.referrerName}`)
                  : t("Referral", "रेफ़रल")}
              </span>
            )}
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
          onClick={onView}
          className="rounded-full border border-maroon px-6 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
        >
          {t("View Details", "विवरण देखें")}
        </button>
        <DownloadMenu booking={booking} />
      </div>
    </li>
  );
}

/**
 * "Download" dropdown — offers this one order's branded PDF invoice and its
 * plain receipt. Closes on outside click or Escape.
 */
function DownloadMenu({
  booking,
  variant = "outline",
}: {
  booking: StoredBooking;
  variant?: "outline" | "solid";
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const trigger =
    variant === "solid"
      ? "bg-maroon text-cream shadow-sm hover:bg-maroon-dark"
      : "border border-maroon text-maroon hover:bg-maroon/5";

  const choose = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition " +
          trigger
        }
      >
        {t("Download", "डाउनलोड")}
        <span aria-hidden="true" className="text-xs">
          ▾
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-cream-3 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={choose(() => downloadInvoice(bookingInvoice(booking)))}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink transition hover:bg-cream/50"
          >
            <span aria-hidden="true">🧾</span>
            <span>
              <span className="block font-medium">
                {t("Tax Invoice (PDF)", "टैक्स इनवॉइस (PDF)")}
              </span>
              <span className="block text-xs text-ink-soft">
                {t("Itemised, branded invoice", "विस्तृत, ब्रांडेड इनवॉइस")}
              </span>
            </span>
          </button>
          {booking.receipt && (
            <button
              type="button"
              role="menuitem"
              onClick={choose(() => downloadReceipt(booking))}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink transition hover:bg-cream/50"
            >
              <span aria-hidden="true">📄</span>
              <span>
                <span className="block font-medium">
                  {t("Order Receipt (PDF)", "ऑर्डर रसीद (PDF)")}
                </span>
                <span className="block text-xs text-ink-soft">
                  {t("Plain-text summary", "सादा-पाठ सारांश")}
                </span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Full-screen booking details — a branded invoice preview plus actions:
 * download, share (a self-contained invoice link, openable on WhatsApp) and,
 * while the event is more than EDIT_LOCK_DAYS away, in-place editing.
 */
function BookingDetailsModal({
  booking,
  onClose,
}: {
  booking: StoredBooking;
  onClose: () => void;
}) {
  const { t, lang } = useLang();
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { editable, reason } = editability(booking);
  const invoice = useMemo(() => bookingInvoice(booking), [booking]);

  // Close on Escape and lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const shareUrl = invoiceShareUrl(invoice);
  const balance = Math.max(0, booking.amount - booking.paid);
  const waMessage =
    `${t("Here's my Bhojpatra invoice", "यह मेरा भोजपत्र इनवॉइस है")} — ${booking.occasion} (${booking.id})\n` +
    `${t("Date", "तिथि")}: ${booking.date} · ${booking.guests} ${t("guests", "मेहमान")}\n` +
    `${t("Total", "कुल")}: ${formatINR(booking.amount)}` +
    (balance > 0 ? ` · ${t("Balance", "बकाया")}: ${formatINR(balance)}` : "") +
    `\n${t("View & download", "देखें और डाउनलोड करें")}: ${shareUrl}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the WhatsApp button still works */
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(0,0,0,0.55)] p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t("Booking details", "बुकिंग विवरण")}
      onClick={onClose}
    >
      <div
        className="relative my-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-2xl border-b border-cream-3 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-display truncate text-xl font-semibold text-ink">
                {t(
                  booking.occasion,
                  OCCASION_HI[booking.occasion] ?? booking.occasion,
                )}
              </h2>
              <StatusBadge status={booking.status} />
            </div>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-ink-soft">
              {t("Booking ID", "बुकिंग आईडी")}: {booking.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close", "बंद करें")}
            className="shrink-0 rounded-full border border-cream-3 px-3 py-1.5 text-sm font-semibold text-ink-soft transition hover:bg-cream-2"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 sm:px-7 sm:py-6">
          {editing ? (
            <EditBookingForm
              booking={booking}
              onDone={() => setEditing(false)}
            />
          ) : (
            <>
              <InvoicePreview data={invoice} />

              {booking.note && (
                <div className="mt-5 rounded-xl border border-cream-3 bg-cream/40 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-maroon">
                    {t("Special Requests", "विशेष अनुरोध")}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-ink">
                    {booking.note}
                  </p>
                </div>
              )}

              {/* Editability note */}
              <p className="mt-4 text-xs text-ink-soft">
                {editable
                  ? t(
                      `You can edit this booking until ${EDIT_LOCK_DAYS} days before the event.`,
                      `आप इस बुकिंग को इवेंट से ${EDIT_LOCK_DAYS} दिन पहले तक संपादित कर सकते हैं।`,
                    )
                  : reason
                    ? lang === "hi"
                      ? reason.hi
                      : reason.en
                    : ""}
              </p>
            </>
          )}
        </div>

        {/* Footer actions */}
        {!editing && (
          <div className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-b-2xl border-t border-cream-3 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
            <DownloadMenu booking={booking} variant="solid" />
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-maroon px-6 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
            >
              <span aria-hidden="true">🟢</span>
              {t("Share on WhatsApp", "व्हाट्सएप पर साझा करें")}
            </a>
            <button
              type="button"
              onClick={copyLink}
              className="rounded-full border border-cream-3 px-6 py-3 text-sm font-semibold text-ink-soft transition hover:bg-cream-2"
            >
              {copied ? t("Link copied ✓", "लिंक कॉपी ✓") : t("Copy link", "लिंक कॉपी करें")}
            </button>
            {editable && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="ml-auto rounded-full border border-maroon px-6 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
              >
                {t("Edit Booking", "बुकिंग संपादित करें")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * In-place editor for the logistics fields a customer can still change while
 * the event is more than EDIT_LOCK_DAYS away. Pricing isn't recomputed here —
 * changes to date / venue / guest count are confirmed (and re-quoted, if
 * needed) by the team, which the note makes explicit.
 */
function EditBookingForm({
  booking,
  onDone,
}: {
  booking: StoredBooking;
  onDone: () => void;
}) {
  const { t } = useLang();
  const invoice = bookingInvoice(booking);
  const [occasion, setOccasion] = useState(booking.occasion);
  const [dateISO, setDateISO] = useState(labelToISO(booking.date));
  const [guests, setGuests] = useState(String(booking.guests));
  const [city, setCity] = useState(booking.city);
  const [venue, setVenue] = useState(invoice.venue === "-" ? "" : invoice.venue);
  const [note, setNote] = useState(booking.note ?? "");
  const [error, setError] = useState("");

  const save = () => {
    const guestCount = Math.round(Number(guests));
    if (!occasion.trim()) {
      setError(t("Please enter an occasion.", "कृपया अवसर दर्ज करें।"));
      return;
    }
    if (!Number.isFinite(guestCount) || guestCount <= 0) {
      setError(t("Please enter a valid guest count.", "कृपया मान्य मेहमान संख्या दर्ज करें।"));
      return;
    }
    const dateLabel = dateISO ? isoToLabel(dateISO) : booking.date;
    updateStoredBooking(booking.id, {
      occasion: occasion.trim(),
      date: dateLabel,
      guests: guestCount,
      city: city.trim(),
      note: note.trim() || undefined,
      // Keep the invoice's mirrored fields in step so downloads/shares match.
      invoice: {
        ...invoice,
        occasion: occasion.trim(),
        eventDate: dateLabel,
        guests: guestCount,
        city: city.trim(),
        venue: venue.trim() || "-",
      },
    });
    onDone();
  };

  const fieldCls =
    "mt-1 w-full rounded-lg border border-cream-3 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-maroon";
  const labelCls =
    "text-[11px] font-semibold uppercase tracking-wide text-maroon";

  return (
    <div>
      <p className={labelCls}>{t("Edit Booking", "बुकिंग संपादित करें")}</p>
      <span className="mt-1 block h-0.5 w-8 rounded bg-maroon" />

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>{t("Occasion", "अवसर")}</span>
          <input
            type="text"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            className={fieldCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>{t("Event Date", "इवेंट तिथि")}</span>
          <input
            type="date"
            value={dateISO}
            onChange={(e) => setDateISO(e.target.value)}
            className={fieldCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>{t("Guests", "मेहमान")}</span>
          <input
            type="number"
            min={1}
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className={fieldCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>{t("City", "शहर")}</span>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={fieldCls}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelCls}>{t("Venue", "वेन्यू")}</span>
          <input
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className={fieldCls}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelCls}>
            {t("Special Requests", "विशेष अनुरोध")}
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={t(
              "Dietary notes, timing, decor preferences…",
              "आहार संबंधी नोट्स, समय, सजावट प्राथमिकताएँ…",
            )}
            className={fieldCls + " resize-none"}
          />
        </label>
      </div>

      <p className="mt-3 text-xs text-ink-soft">
        {t(
          "Changes to date, venue or guest count may affect final pricing — our team will confirm.",
          "तिथि, वेन्यू या मेहमान संख्या में बदलाव से अंतिम मूल्य प्रभावित हो सकता है — हमारी टीम पुष्टि करेगी।",
        )}
      </p>

      {error && <p className="mt-2 text-sm font-medium text-maroon">{error}</p>}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={save}
          className="rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
        >
          {t("Save Changes", "बदलाव सहेजें")}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-cream-3 px-6 py-3 text-sm font-semibold text-ink-soft transition hover:bg-cream-2"
        >
          {t("Cancel", "रद्द करें")}
        </button>
      </div>
    </div>
  );
}
