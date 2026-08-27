"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { type BookingStatus } from "@/lib/data";
import {
  fetchMyBookings,
  onStoredBookingsChange,
  patchMyBooking,
  downloadReceipt,
  bookingInvoice,
  bookingVendors,
  vendorKey,
  type StoredBooking,
  type BookingVendorReview,
  type BookingPatchResult,
} from "@/lib/bookings";
import type { EmiPlan } from "@/lib/emi";
import { downloadInvoice, invoiceShareUrl } from "@/lib/invoice";
import { useLang } from "@/lib/i18n";
import {
  Button,
  type ButtonVariant,
  Card,
  Chip,
  EmptyState,
  Input,
  PullToRefresh,
  Textarea,
} from "@/components/ui";
import InvoicePreview from "./InvoicePreview";
import StarInput from "@/components/reviews/StarInput";
import { money, perPlateCost } from "@/lib/money";

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
  // wizard — fetched from the API (the customer's own orders).
  const [bookings, setBookings] = useState<StoredBooking[]>([]);
  // The booking open in the details modal, tracked by id so edits made in the
  // modal re-read from the freshly reloaded list rather than going stale.
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(
    () => bookings.find((b) => b.id === activeId) ?? null,
    [bookings, activeId],
  );
  // The completed booking whose "Rate your experience" modal is open, if any.
  const [reviewId, setReviewId] = useState<string | null>(null);
  const reviewTarget = useMemo(
    () => bookings.find((b) => b.id === reviewId) ?? null,
    [bookings, reviewId],
  );

  const loadBookings = useCallback(async () => {
    const list = await fetchMyBookings();
    setBookings(list);
  }, []);

  useEffect(() => {
    // Bookings come from the API (the customer's own orders). The server runs
    // the past-event auto-complete sweep, so we just fetch the list and re-fetch
    // whenever an edit/complete/review elsewhere fires the change event.
    let active = true;
    const load = () => {
      void fetchMyBookings().then((list) => {
        if (active) setBookings(list);
      });
    };
    load();
    const unsub = onStoredBookingsChange(load);
    return () => {
      active = false;
      unsub();
    };
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
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-12 lg:py-16">
      <div className="max-w-xl px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon">
          {t("Your Account", "आपका खाता")}
        </p>
        <h1 className="mt-1.5 font-sans text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {t("My Bookings", "मेरी बुकिंग")}
        </h1>
        <p className="mt-1.5 text-sm text-ink/55">
          {t(
            "Track celebrations, payments & confirmations.",
            "समारोह, भुगतान और कन्फर्मेशन ट्रैक करें।",
          )}
        </p>
      </div>

      <PullToRefresh onRefresh={loadBookings}>
        {/* Summary stats — denser on mobile */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-4 lg:grid-cols-4">
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
            value={money(counts.dueAmount)}
          />
          <StatCard
            label={t("Completed", "पूर्ण")}
            value={String(counts.completed)}
          />
        </div>

        {/* Sticky status chips */}
        <div className="app-sticky-chrome -mx-4 mt-5 px-4 py-2.5 sm:static sm:mx-0 sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
            {FILTERS.map((f) => (
              <Chip
                key={f}
                selected={filter === f}
                onClick={() => setFilter(f)}
                className="shrink-0"
              >
                {t(f, STATUS_HI[f])}
              </Chip>
            ))}
          </div>
        </div>

        {/* Bookings list */}
        {results.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-3 sm:mt-6 sm:gap-5">
            {results.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onView={() => setActiveId(booking.id)}
                onReview={() => setReviewId(booking.id)}
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            className="mt-4 sm:mt-6"
            title={t("No bookings here", "यहाँ कोई बुकिंग नहीं")}
            message={
              filter === ALL
                ? t("No bookings yet", "अभी कोई बुकिंग नहीं")
                : t(
                    `You have no ${filter.toLowerCase()} bookings yet.`,
                    `अभी कोई ${STATUS_HI[filter]} बुकिंग नहीं।`,
                  )
            }
            action={
              <Button href="/book" variant="primary">
                {t("Book now", "अभी बुक करें")}
              </Button>
            }
          />
        )}
      </PullToRefresh>

      {active && (
        <BookingDetailsModal booking={active} onClose={() => setActiveId(null)} />
      )}

      {reviewTarget && (
        <ReviewModal
          booking={reviewTarget}
          onClose={() => setReviewId(null)}
        />
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
        {label}
      </p>
      <p className="font-display mt-2 text-2xl font-semibold text-maroon">
        {value}
      </p>
    </Card>
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

/**
 * Two-step control that flips a booking between Confirmed and Completed.
 * A Confirmed booking shows "Mark as Complete" (→ Completed, which unlocks the
 * review flow); a Completed booking shows "Reopen booking" (→ Confirmed, an
 * un-complete). The flip is committed on the server first (PATCH
 * /api/bookings/[id]) — which checks the customer owns the booking and that the
 * transition is allowed — and only mirrored into the local list once the server
 * accepts, so the two never drift. Reopening also sets `reopened` so the
 * past-event auto-complete sweep leaves it alone. Each action takes one extra
 * confirm click so it can't fire by accident. Renders nothing for Pending /
 * Cancelled orders. Shared by the booking card and the details-modal footer.
 */
function CompleteToggle({ booking }: { booking: StoredBooking }) {
  const { t } = useLang();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (booking.status !== "Confirmed" && booking.status !== "Completed") {
    return null;
  }
  const completing = booking.status === "Confirmed";
  const nextStatus: BookingStatus = completing ? "Completed" : "Confirmed";

  const apply = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    // Commit on the server (owner + transition are checked there). Reopens also
    // flag the record so the past-event auto-complete sweep won't flip it back.
    // On success the change event fires and My Bookings re-fetches the list.
    const result = await patchMyBooking(booking.id, {
      status: nextStatus,
      ...(completing ? {} : { reopened: true }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(
        result.error ??
          t(
            "Couldn't update this booking. Please try again.",
            "यह बुकिंग अपडेट नहीं हो सकी। कृपया पुनः प्रयास करें।",
          ),
      );
      return;
    }
    setConfirming(false);
  };

  if (confirming) {
    return (
      <div className="flex shrink-0 flex-col items-start gap-1.5">
        <div className="flex flex-nowrap items-center gap-2.5 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible">
          <span className="shrink-0 whitespace-nowrap text-sm text-ink-soft">
            {completing
              ? t("Mark this event as complete?", "इस इवेंट को पूर्ण चिह्नित करें?")
              : t("Reopen this booking?", "इस बुकिंग को फिर से खोलें?")}
          </span>
          <Button
            variant="primary"
            onClick={apply}
            disabled={busy}
            className="shrink-0"
          >
            {busy
              ? t("Saving…", "सहेज रहे हैं…")
              : completing
                ? t("Yes, it's done", "हाँ, हो गया")
                : t("Yes, reopen", "हाँ, फिर से खोलें")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setConfirming(false);
              setError("");
            }}
            disabled={busy}
            className="shrink-0"
          >
            {t("Not yet", "अभी नहीं")}
          </Button>
        </div>
        {error && <p className="text-xs font-medium text-maroon">{error}</p>}
      </div>
    );
  }

  return (
    <Button
      variant={completing ? "primary" : "secondary"}
      onClick={() => setConfirming(true)}
      leftIcon={<span aria-hidden="true">{completing ? "✓" : "↩"}</span>}
      className="shrink-0"
    >
      {completing
        ? t("Mark as Complete", "पूर्ण चिह्नित करें")
        : t("Reopen booking", "बुकिंग फिर से खोलें")}
    </Button>
  );
}

/**
 * A one-way status action with a two-step confirm, so it can't fire by accident.
 * The first click reveals a confirm prompt; the second commits the change on the
 * server (PATCH /api/bookings/[id], which re-checks owner + transition) and — on
 * success — lets My Bookings re-fetch via the change event. Used for Pay Advance
 * (Pending → Confirmed) and Cancel (→ Cancelled); the Confirmed ⇄ Completed flip
 * keeps its own two-way toggle in CompleteToggle.
 */
function ConfirmAction({
  triggerLabel,
  tone,
  prompt,
  confirmLabel,
  run,
}: {
  triggerLabel: ReactNode;
  tone: "solid" | "outline" | "ghost";
  prompt: string;
  confirmLabel: string;
  run: () => Promise<BookingPatchResult>;
}) {
  const { t } = useLang();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const apply = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    const result = await run();
    setBusy(false);
    if (!result.ok) {
      setError(
        result.error ??
          t(
            "Couldn't update this booking. Please try again.",
            "यह बुकिंग अपडेट नहीं हो सकी। कृपया पुनः प्रयास करें।",
          ),
      );
      return;
    }
    setConfirming(false);
  };

  if (confirming) {
    return (
      <div className="flex shrink-0 flex-col items-start gap-1.5">
        <div className="flex flex-nowrap items-center gap-2.5 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible">
          <span className="shrink-0 whitespace-nowrap text-sm text-ink-soft">{prompt}</span>
          <Button
            variant="primary"
            onClick={apply}
            disabled={busy}
            className="shrink-0"
          >
            {busy ? t("Saving…", "सहेज रहे हैं…") : confirmLabel}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setConfirming(false);
              setError("");
            }}
            disabled={busy}
            className="shrink-0"
          >
            {t("Not yet", "अभी नहीं")}
          </Button>
        </div>
        {error && <p className="text-xs font-medium text-maroon">{error}</p>}
      </div>
    );
  }

  const triggerVariant: ButtonVariant =
    tone === "solid" ? "primary" : tone === "outline" ? "secondary" : "ghost";

  return (
    <Button
      variant={triggerVariant}
      onClick={() => setConfirming(true)}
      className="shrink-0"
    >
      {triggerLabel}
    </Button>
  );
}

/**
 * "Pay Balance" — settles a Pending EMI order's outstanding balance in one go,
 * which confirms it (Pending → Confirmed). The server records the full payment
 * against `paid` on that transition (the client never sends money), so the
 * balance clears on refetch.
 */
function PayBalanceButton({ booking }: { booking: StoredBooking }) {
  const { t } = useLang();
  const balance = Math.max(0, booking.amount - booking.paid);
  return (
    <ConfirmAction
      tone="solid"
      triggerLabel={t(
        `Pay Balance · ${money(balance)}`,
        `शेष भुगतान · ${money(balance)}`,
      )}
      prompt={t(
        `Settle the ${money(balance)} balance now to confirm this booking?`,
        `इस बुकिंग की पुष्टि के लिए अभी ${money(balance)} शेष राशि चुकाएँ?`,
      )}
      confirmLabel={t("Yes, pay balance", "हाँ, भुगतान करें")}
      run={() => patchMyBooking(booking.id, { status: "Confirmed" })}
    />
  );
}

/** Compact instalment schedule shown on a Pending (EMI) booking so the customer
 *  can see what's financed and when each instalment falls due. Track-only — the
 *  team collects each on its date; "Pay Balance" clears them all at once. */
function EmiSchedule({ plan }: { plan: EmiPlan }) {
  const { t } = useLang();
  return (
    <div className="mt-5 rounded-xl border border-cream-3 bg-cream/40 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-maroon">
        {t(
          `Instalment plan · ${plan.count} EMIs`,
          `किस्त योजना · ${plan.count} EMI`,
        )}
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {plan.installments.map((it) => (
          <li
            key={it.index}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-ink-soft">
              {t(`EMI ${it.index}`, `EMI ${it.index}`)} · {it.dueLabel}
            </span>
            <span className="font-medium text-ink">{money(it.amount)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-soft">
        {t(
          "Our team collects each instalment on its due date.",
          "हमारी टीम प्रत्येक किस्त उसकी देय तिथि पर लेती है।",
        )}
      </p>
    </div>
  );
}

/**
 * "Cancel booking" — cancels a Pending or Confirmed order (→ Cancelled, which is
 * terminal). Rendered low-emphasis so it doesn't compete with the primary
 * actions; the two-step confirm guards against an accidental cancel.
 */
function CancelBookingButton({ booking }: { booking: StoredBooking }) {
  const { t } = useLang();
  return (
    <ConfirmAction
      tone="ghost"
      triggerLabel={
        <>
          <span aria-hidden="true">✕</span>
          {t("Cancel booking", "बुकिंग रद्द करें")}
        </>
      }
      prompt={t(
        "Cancel this booking? This can't be undone.",
        "इस बुकिंग को रद्द करें? इसे पूर्ववत नहीं किया जा सकता।",
      )}
      confirmLabel={t("Yes, cancel", "हाँ, रद्द करें")}
      run={() => patchMyBooking(booking.id, { status: "Cancelled" })}
    />
  );
}

/**
 * "Request refund" — raises a refund claim against a booking the customer paid
 * on (POST /api/refunds). Shown once an order is Cancelled or Completed with
 * money collected; the server derives the amount/method from the booking and
 * allows one open claim at a time (a second attempt gets a friendly 409).
 */
function RequestRefundButton({ booking }: { booking: StoredBooking }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p className="shrink-0 text-sm font-medium text-maroon">
        <span aria-hidden="true">✓</span>{" "}
        {t(
          "Refund requested — our team will review it shortly.",
          "रिफ़ंड का अनुरोध हो गया — हमारी टीम जल्द समीक्षा करेगी।",
        )}
      </p>
    );
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        leftIcon={<span aria-hidden="true">↺</span>}
        className="shrink-0"
      >
        {t("Request refund", "रिफ़ंड का अनुरोध करें")}
      </Button>
    );
  }

  const submit = async () => {
    if (busy) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(
        t(
          "Please tell us why you're requesting a refund.",
          "कृपया बताएं कि आप रिफ़ंड क्यों चाहते हैं।",
        ),
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, reason: trimmed }),
      });
      const json = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) {
        setError(
          json?.error ??
            t(
              "Couldn't send your request. Please try again.",
              "आपका अनुरोध नहीं भेजा जा सका। कृपया पुनः प्रयास करें।",
            ),
        );
        return;
      }
      setDone(true);
    } catch {
      setError(
        t(
          "Couldn't send your request. Please try again.",
          "आपका अनुरोध नहीं भेजा जा सका। कृपया पुनः प्रयास करें।",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex shrink-0 flex-col items-start gap-1.5">
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder={t(
          "Why are you requesting a refund?",
          "आप रिफ़ंड का अनुरोध क्यों कर रहे हैं?",
        )}
        aria-label={t("Refund reason", "रिफ़ंड का कारण")}
        className="w-72"
      />
      <div className="flex flex-nowrap items-center gap-2.5">
        <Button variant="primary" onClick={submit} disabled={busy} className="shrink-0">
          {busy
            ? t("Sending…", "भेज रहे हैं…")
            : t("Send request", "अनुरोध भेजें")}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          disabled={busy}
          className="shrink-0"
        >
          {t("Not yet", "अभी नहीं")}
        </Button>
      </div>
      {error && <p className="text-xs font-medium text-maroon">{error}</p>}
    </div>
  );
}

/* "Get help" ticket categories — the `en` label is the canonical value sent to
   /api/support (it must match the server's TICKET_CATEGORIES whitelist); `hi`
   is display-only. */
const HELP_CATEGORIES: { en: string; hi: string }[] = [
  { en: "Booking", hi: "बुकिंग" },
  { en: "Payment", hi: "भुगतान" },
  { en: "Refund", hi: "रिफ़ंड" },
  { en: "Vendor", hi: "वेंडर" },
  { en: "Billing", hi: "बिलिंग" },
  { en: "Technical", hi: "तकनीकी" },
  { en: "General", hi: "सामान्य" },
];

/**
 * "Get help" — raises a support ticket against this booking (POST
 * /api/support), which lands in the admin Support view. The customer's name
 * and email come from the session server-side, so the form only asks what the
 * problem is about and a description.
 */
function GetHelpButton({ booking }: { booking: StoredBooking }) {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Booking");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ticketId, setTicketId] = useState("");

  if (ticketId) {
    return (
      <p className="shrink-0 text-sm font-medium text-maroon">
        <span aria-hidden="true">✓</span>{" "}
        {t(
          `Ticket ${ticketId} raised — our team will get back to you soon.`,
          `टिकट ${ticketId} बन गया — हमारी टीम जल्द आपसे संपर्क करेगी।`,
        )}
      </p>
    );
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        leftIcon={<span aria-hidden="true">🎧</span>}
        className="shrink-0"
      >
        {t("Get help", "मदद चाहिए")}
      </Button>
    );
  }

  const submit = async () => {
    if (busy) return;
    if (!subject.trim() || !message.trim()) {
      setError(
        t(
          "Please add a subject and describe the issue.",
          "कृपया विषय लिखें और समस्या बताएं।",
        ),
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          category,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { error?: string; ticket?: { id: string } }
        | null;
      if (!res.ok || !json?.ticket) {
        setError(
          json?.error ??
            t(
              "Couldn't send your request. Please try again.",
              "आपका अनुरोध नहीं भेजा जा सका। कृपया पुनः प्रयास करें।",
            ),
        );
        return;
      }
      setTicketId(json.ticket.id);
    } catch {
      setError(
        t(
          "Couldn't send your request. Please try again.",
          "आपका अनुरोध नहीं भेजा जा सका। कृपया पुनः प्रयास करें।",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex shrink-0 flex-col items-start gap-1.5">
      <div className="no-scrollbar flex w-72 flex-nowrap gap-2 overflow-x-auto">
        {HELP_CATEGORIES.map((c) => (
          <Chip
            key={c.en}
            selected={category === c.en}
            onClick={() => setCategory(c.en)}
            className="shrink-0 whitespace-nowrap"
          >
            {lang === "hi" ? c.hi : c.en}
          </Chip>
        ))}
      </div>
      <Input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        maxLength={120}
        placeholder={t("What's it about?", "किस बारे में है?")}
        aria-label={t("Subject", "विषय")}
        className="w-72"
      />
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder={t("Describe the issue…", "समस्या बताएं…")}
        aria-label={t("Message", "संदेश")}
        className="w-72"
      />
      <div className="flex flex-nowrap items-center gap-2.5">
        <Button variant="primary" onClick={submit} disabled={busy} className="shrink-0">
          {busy
            ? t("Sending…", "भेज रहे हैं…")
            : t("Raise ticket", "टिकट बनाएं")}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          disabled={busy}
          className="shrink-0"
        >
          {t("Not now", "अभी नहीं")}
        </Button>
      </div>
      {error && <p className="text-xs font-medium text-maroon">{error}</p>}
    </div>
  );
}

function BookingCard({
  booking,
  onView,
  onReview,
}: {
  booking: StoredBooking;
  onView: () => void;
  onReview: () => void;
}) {
  const { t } = useLang();
  const balance = booking.amount - booking.paid;
  const cancelled = booking.status === "Cancelled";
  const progress =
    booking.amount > 0
      ? Math.min(100, Math.round((booking.paid / booking.amount) * 100))
      : 0;

  return (
    <Card as="li" className={"sm:p-6 " + (cancelled ? "opacity-75" : "")}>
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
          {booking.paymentRef && (
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-soft">
              {t("Transaction Ref", "ट्रांज़ैक्शन रेफ़")}: {booking.paymentRef}
            </p>
          )}

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
            {booking.guests > 0 && booking.amount > 0 ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-ink-soft">
                    {t("Per plate", "प्रति प्लेट")}
                  </span>
                  <span className="font-display text-lg font-semibold text-maroon">
                    ≈ {money(perPlateCost(booking.amount, booking.guests))}
                    <span className="text-xs font-medium">
                      {" "}
                      / {t("plate", "प्लेट")}
                    </span>
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between text-sm">
                  <span className="text-ink-soft">{t("Total", "कुल राशि")}</span>
                  <span className="font-medium text-ink">
                    {money(booking.amount)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-soft">
                  {t("Total", "कुल राशि")}
                </span>
                <span className="font-display text-lg font-semibold text-ink">
                  {money(booking.amount)}
                </span>
              </div>
            )}
            <div className="mt-1.5 flex items-baseline justify-between text-sm">
              <span className="text-ink-soft">{t("Paid", "भुगतान")}</span>
              <span className="font-medium text-maroon">
                {money(booking.paid)}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between text-sm">
              <span className="text-ink-soft">{t("Balance", "बकाया")}</span>
              <span className="font-medium text-ink">
                {money(balance)}
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

      {/* Instalment plan, for a Pending EMI order. */}
      {booking.status === "Pending" && booking.emiPlan && (
        <EmiSchedule plan={booking.emiPlan} />
      )}

      {/* Actions */}
      <div className="mt-5 flex flex-nowrap items-center gap-3 overflow-x-auto no-scrollbar border-t border-cream-3 pt-4 md:flex-wrap md:overflow-visible">
        {booking.status === "Pending" && <PayBalanceButton booking={booking} />}
        <Button variant="secondary" onClick={onView} className="shrink-0">
          {t("View Details", "विवरण देखें")}
        </Button>
        <DownloadMenu booking={booking} />
        {(booking.status === "Pending" || booking.status === "Confirmed") && (
          <CancelBookingButton booking={booking} />
        )}
        {(booking.status === "Cancelled" || booking.status === "Completed") &&
          booking.paid > 0 && <RequestRefundButton booking={booking} />}
        <GetHelpButton booking={booking} />

        {/* Status actions, right-aligned: review a completed order plus the
            Confirmed ⇄ Completed toggle. */}
        <div className="ml-auto flex flex-nowrap items-center gap-3 md:flex-wrap">
          {booking.status === "Completed" &&
            (booking.review ? (
              <div className="flex shrink-0 items-center gap-2">
                <Stars
                  rating={booking.review.rating}
                  label={t(
                    `You rated ${booking.review.rating} out of 5 stars`,
                    `आपने 5 में से ${booking.review.rating} स्टार दिए`,
                  )}
                />
                <Button variant="ghost" onClick={onReview} className="shrink-0">
                  {t("Edit review", "समीक्षा संपादित करें")}
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                onClick={onReview}
                leftIcon={<span aria-hidden="true">★</span>}
                className="shrink-0"
              >
                {t("Rate your experience", "अपना अनुभव रेट करें")}
              </Button>
            ))}
          <CompleteToggle booking={booking} />
        </div>
      </div>
    </Card>
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

  const choose = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <Button
        variant={variant === "solid" ? "primary" : "secondary"}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        rightIcon={
          <span aria-hidden="true" className="text-xs">
            ▾
          </span>
        }
      >
        {t("Download", "डाउनलोड")}
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-card border border-cream-3 bg-white py-1 shadow-modal"
        >
          {/* Transaction ID — the reference for the online payment on this
              order, shown for quick copy. Absent on COD / unpaid orders. */}
          {booking.paymentRef && (
            <div className="border-b border-cream-3 px-4 py-2.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                {t("Transaction ID", "लेनदेन आईडी")}
              </span>
              <span className="mt-0.5 block select-all break-all text-xs font-medium text-ink">
                {booking.paymentRef}
              </span>
            </div>
          )}
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

  const shareUrl = invoiceShareUrl(
    invoice,
    (booking as { invoiceSig?: string }).invoiceSig,
  );
  const balance = Math.max(0, booking.amount - booking.paid);
  const waMessage =
    `${t("Here's my Bhojpatra invoice", "यह मेरा भोजपत्र इनवॉइस है")} — ${booking.occasion} (${booking.id})\n` +
    `${t("Date", "तिथि")}: ${booking.date} · ${booking.guests} ${t("guests", "मेहमान")}\n` +
    (booking.guests > 0
      ? `${t("Per plate", "प्रति प्लेट")}: ≈ ${money(perPlateCost(booking.amount, booking.guests))} · ${t("Total", "कुल")}: ${money(booking.amount)}`
      : `${t("Total", "कुल")}: ${money(booking.amount)}`) +
    (balance > 0 ? ` · ${t("Balance", "बकाया")}: ${money(balance)}` : "") +
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
        className="relative my-4 w-full max-w-2xl rounded-card bg-white shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 rounded-t-card border-b border-cream-3 bg-white px-5 py-4 sm:px-7">
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
            {booking.paymentRef && (
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-ink-soft">
                {t("Transaction Ref", "ट्रांज़ैक्शन रेफ़")}: {booking.paymentRef}
              </p>
            )}
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
          <div className="sticky bottom-0 z-20 flex flex-nowrap items-center gap-3 overflow-x-auto no-scrollbar rounded-b-card border-t border-cream-3 bg-white px-5 py-4 sm:px-7 md:flex-wrap md:overflow-visible">
            <DownloadMenu booking={booking} variant="solid" />
            <Button
              variant="secondary"
              href={waHref}
              target="_blank"
              rel="noreferrer"
              leftIcon={<span aria-hidden="true">🟢</span>}
              className="shrink-0"
            >
              {t("Share on WhatsApp", "व्हाट्सएप पर साझा करें")}
            </Button>
            <Button variant="secondary" onClick={copyLink} className="shrink-0">
              {copied ? t("Link copied ✓", "लिंक कॉपी ✓") : t("Copy link", "लिंक कॉपी करें")}
            </Button>
            <div className="ml-auto flex flex-nowrap items-center gap-3 md:flex-wrap">
              {editable && (
                <Button variant="secondary" onClick={() => setEditing(true)} className="shrink-0">
                  {t("Edit Booking", "बुकिंग संपादित करें")}
                </Button>
              )}
              {booking.status === "Pending" && (
                <PayBalanceButton booking={booking} />
              )}
              {(booking.status === "Pending" ||
                booking.status === "Confirmed") && (
                <CancelBookingButton booking={booking} />
              )}
              <CompleteToggle booking={booking} />
            </div>
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
    void patchMyBooking(booking.id, {
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

  const labelCls =
    "text-[11px] font-semibold uppercase tracking-wide text-maroon";

  return (
    <div>
      <p className={labelCls}>{t("Edit Booking", "बुकिंग संपादित करें")}</p>
      <span className="mt-1 block h-0.5 w-8 rounded bg-maroon" />

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>{t("Occasion", "अवसर")}</span>
          <Input
            type="text"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            className="mt-1"
          />
        </label>
        <label className="block">
          <span className={labelCls}>{t("Event Date", "इवेंट तिथि")}</span>
          <Input
            type="date"
            value={dateISO}
            onChange={(e) => setDateISO(e.target.value)}
            className="mt-1"
          />
        </label>
        <label className="block">
          <span className={labelCls}>{t("Guests", "मेहमान")}</span>
          <Input
            type="number"
            min={1}
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className="mt-1"
          />
        </label>
        <label className="block">
          <span className={labelCls}>{t("City", "शहर")}</span>
          <Input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelCls}>{t("Venue", "वेन्यू")}</span>
          <Input
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="mt-1"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelCls}>
            {t("Special Requests", "विशेष अनुरोध")}
          </span>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={t(
              "Dietary notes, timing, decor preferences…",
              "आहार संबंधी नोट्स, समय, सजावट प्राथमिकताएँ…",
            )}
            className="mt-1 resize-none"
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

      <div className="mt-5 flex flex-nowrap gap-3 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible">
        <Button variant="primary" onClick={save} className="shrink-0">
          {t("Save Changes", "बदलाव सहेजें")}
        </Button>
        <Button variant="secondary" onClick={onDone} className="shrink-0">
          {t("Cancel", "रद्द करें")}
        </Button>
      </div>
    </div>
  );
}

/** Read-only 5-star row (matches the home-page testimonial stars). */
function Stars({ rating, label }: { rating: number; label: string }) {
  return (
    <span aria-label={label} className="flex items-center gap-0.5 text-gold">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={i < rating ? "" : "opacity-25"}
        >
          ★
        </span>
      ))}
    </span>
  );
}

/** A vendor's in-progress rating within the review editor. */
type DraftRating = { rating: number; comment: string };

/**
 * "Rate your experience" — the customer rates each vendor on a completed booking
 * individually (a star row + optional note per vendor). Posts them as a batch to
 * /api/reviews (which publishes to the home-page testimonials feed and feeds the
 * per-vendor rating shown on vendor cards) and mirrors the ratings back onto the
 * stored booking, so the card reflects them and a second submission edits in
 * place.
 */
function ReviewModal({
  booking,
  onClose,
}: {
  booking: StoredBooking;
  onClose: () => void;
}) {
  const { t } = useLang();

  // The vendors on this order, each rated on its own. Prefill from any ratings
  // the customer already left (editing) so their earlier scores show.
  const vendors = useMemo(() => bookingVendors(booking), [booking]);
  const [name, setName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, DraftRating>>(() => {
    const prev = new Map<string, BookingVendorReview>();
    (booking.reviews ?? []).forEach((r) =>
      prev.set(vendorKey({ id: r.vendorId, name: r.vendorName }), r),
    );
    const init: Record<string, DraftRating> = {};
    for (const v of vendors) {
      const p = prev.get(vendorKey(v));
      init[vendorKey(v)] = { rating: p?.rating ?? 0, comment: p?.comment ?? "" };
    }
    return init;
  });
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState("");

  const setRating = (key: string, rating: number) =>
    setDrafts((d) => ({ ...d, [key]: { ...d[key], rating } }));
  const setComment = (key: string, comment: string) =>
    setDrafts((d) => ({ ...d, [key]: { ...d[key], comment } }));

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

  const submit = async () => {
    if (status === "submitting") return;
    // Only vendors the customer actually gave a star to are submitted.
    const rated = vendors
      .map((v) => ({ v, draft: drafts[vendorKey(v)] }))
      .filter((x) => x.draft && x.draft.rating >= 1);
    if (rated.length === 0) {
      setError(
        t(
          "Please give at least one vendor a star rating.",
          "कृपया कम से कम एक वेंडर को स्टार रेटिंग दें।",
        ),
      );
      return;
    }
    setStatus("submitting");
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          name: name.trim(),
          occasion: booking.occasion,
          city: booking.city,
          reviews: rated.map((x) => ({
            vendorId: x.v.id,
            vendor: x.v.name,
            rating: x.draft.rating,
            comment: x.draft.comment.trim(),
          })),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        setStatus("idle");
        setError(
          data?.error ??
            t(
              "Something went wrong. Please try again.",
              "कुछ गड़बड़ हो गई। कृपया पुनः प्रयास करें।",
            ),
        );
        return;
      }
      // Mirror onto the stored booking: the per-vendor ratings for editing, plus
      // a rounded-average summary for the card's star display.
      const createdAt = new Date().toISOString();
      const reviews: BookingVendorReview[] = rated.map((x) => ({
        vendorId: x.v.id,
        vendorName: x.v.name,
        rating: x.draft.rating,
        comment: x.draft.comment.trim(),
        createdAt,
      }));
      const avg = Math.round(
        reviews.reduce((s, r) => s + r.rating, 0) / reviews.length,
      );
      await patchMyBooking(booking.id, {
        reviews,
        review: {
          rating: avg,
          comment: reviews.find((r) => r.comment)?.comment ?? "",
          createdAt,
        },
      });
      onClose();
    } catch {
      setStatus("idle");
      setError(
        t("Network error. Please try again.", "नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।"),
      );
    }
  };

  const labelCls =
    "text-[11px] font-semibold uppercase tracking-wide text-maroon";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(0,0,0,0.55)] p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t("Rate your experience", "अपना अनुभव रेट करें")}
      onClick={onClose}
    >
      <div
        className="relative my-4 w-full max-w-lg rounded-card bg-white shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-cream-3 px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <h2 className="font-sans text-xl font-semibold text-ink">
              {t("Rate your experience", "अपना अनुभव रेट करें")}
            </h2>
            <p className="mt-0.5 truncate text-sm text-ink-soft">
              {vendors.length > 1
                ? t(
                    `Rate each of your ${vendors.length} vendors`,
                    `अपने ${vendors.length} वेंडर को रेट करें`,
                  )
                : `${booking.vendor} · ${booking.occasion}`}
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
          {/* One rating block per vendor. */}
          <div className="flex flex-col gap-4">
            {vendors.map((v) => {
              const key = vendorKey(v);
              const draft = drafts[key] ?? { rating: 0, comment: "" };
              return (
                <div
                  key={key}
                  className="rounded-xl border border-cream-3 bg-cream-2/40 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-sans text-sm font-semibold text-ink">
                      {v.name}
                    </p>
                    <StarInput
                      value={draft.rating}
                      onChange={(n) => setRating(key, n)}
                      label={(n) =>
                        t(
                          `${n} out of 5 stars for ${v.name}`,
                          `${v.name} के लिए 5 में से ${n} स्टार`,
                        )
                      }
                    />
                  </div>
                  <Textarea
                    value={draft.comment}
                    onChange={(e) => setComment(key, e.target.value)}
                    rows={2}
                    maxLength={600}
                    placeholder={t(
                      "Add a note (optional)",
                      "एक नोट जोड़ें (वैकल्पिक)",
                    )}
                    className="mt-1 resize-none"
                  />
                </div>
              );
            })}
          </div>

          <label className="mt-5 block">
            <span className={labelCls}>{t("Your name", "आपका नाम")}</span>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("e.g. Priya S.", "उदा. प्रिया एस.")}
              className="mt-1"
            />
          </label>

          <p className="mt-2 text-xs text-ink-soft">
            {t(
              "Your reviews may appear publicly on our home page and on vendor profiles.",
              "आपकी समीक्षाएँ हमारे होम पेज और वेंडर प्रोफ़ाइल पर सार्वजनिक रूप से दिख सकती हैं।",
            )}
          </p>

          {error && (
            <p className="mt-3 text-sm font-medium text-maroon">{error}</p>
          )}

          <div className="mt-5 flex flex-nowrap gap-3 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible">
            <Button
              variant="primary"
              onClick={submit}
              disabled={status === "submitting"}
              className="shrink-0"
            >
              {status === "submitting"
                ? t("Submitting…", "सबमिट हो रहा है…")
                : t("Submit review", "समीक्षा सबमिट करें")}
            </Button>
            <Button variant="secondary" onClick={onClose} className="shrink-0">
              {t("Cancel", "रद्द करें")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
