"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { useSessionStatus } from "@/lib/session";
import LoginGate from "@/components/auth/LoginGate";
import { occasions } from "@/lib/data";
import {
  fetchVenueById,
  venueCityName,
  VENUE_GST_RATE,
  VENUE_ADVANCE_RATE,
  type BookableVenue,
} from "@/lib/venues";
import { addStoredBooking } from "@/lib/bookings";
import { downloadInvoice, type InvoiceData } from "@/lib/invoice";
import {
  buildUpiUri,
  upiTxnRef,
  DEFAULT_MERCHANT,
  type UpiPayeeConfig,
} from "@/lib/upi";
import {
  ORDER_PAYMENT_METHODS,
  ORDER_PAYMENT_LABELS,
  ORDER_PAYMENT_HINTS,
  isOnlineMethod,
  type OrderPaymentMethod,
} from "@/lib/orderPayment";

const inr = new Intl.NumberFormat("en-IN");
const money = (n: number) => `₹${inr.format(Math.round(n))}`;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** `YYYY-MM-DD` → "12 Dec 2026" (matches the My Bookings list style). */
function formatEventDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr || "—";
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

/** Deterministic BHJ- booking id from the venue + date + guests (no random). */
function venueBookingId(venueId: string, eventDate: string, guests: number): string {
  const seed = `${venueId}|${eventDate}|${guests}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `BHJ-${((h % 90000) + 10000).toString()}`;
}

/** Today's local date as `YYYY-MM-DD` (the date picker's `min`). */
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

type Step = "details" | "pay" | "done";

export default function VenueDetail({ id }: { id: string }) {
  const { t, lang } = useLang();
  const [venue, setVenue] = useState<BookableVenue | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    fetchVenueById(id).then((v) => {
      if (active) setVenue(v);
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (venue === undefined) {
    return (
      <section className="mx-auto max-w-5xl px-5 py-16">
        <p className="text-sm text-ink-soft">{t("Loading venue…", "वेन्यू लोड हो रहा है…")}</p>
      </section>
    );
  }

  if (venue === null) {
    return (
      <section className="mx-auto max-w-5xl px-5 py-16 text-center">
        <h1 className="font-display text-2xl text-ink">
          {t("Venue not found", "वेन्यू नहीं मिला")}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {t(
            "This venue may have been removed. Browse all venues instead.",
            "यह वेन्यू हटाया जा चुका हो सकता है। सभी वेन्यू देखें।",
          )}
        </p>
        <Link
          href="/venues"
          className="mt-6 inline-block rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
        >
          {t("Back to Venues", "वेन्यू पर वापस")}
        </Link>
      </section>
    );
  }

  return <VenueBooking venue={venue} t={t} lang={lang} />;
}

function VenueBooking({
  venue,
  t,
  lang,
}: {
  venue: BookableVenue;
  t: (en: string, hi: string) => string;
  lang: "en" | "hi";
}) {
  // Booking + payment require a signed-in guest. Tri-state: `undefined` while
  // loading, `null` signed out, object signed in — the Pay & Confirm step gates
  // on this so anonymous guests are asked to log in first.
  const sessionStatus = useSessionStatus();
  const [step, setStep] = useState<Step>("details");

  // Step 1 — event details
  const [occasionId, setOccasionId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [guests, setGuests] = useState(100);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [detailsError, setDetailsError] = useState("");

  // Step 2 — payment
  const [payMethod, setPayMethod] = useState<OrderPaymentMethod>("UPI");
  const [choice, setChoice] = useState<"advance" | "full">("advance");
  const [paidAmount, setPaidAmount] = useState(0);
  // Transaction / reference ID captured when the online payment succeeds, so it
  // travels onto the saved booking (admin console + customer's My Bookings).
  const [paidRef, setPaidRef] = useState("");
  const [merchant, setMerchant] = useState<UpiPayeeConfig>(DEFAULT_MERCHANT);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  // Pull the live merchant VPA (admin-configurable); fall back to the default.
  useEffect(() => {
    let active = true;
    fetch("/api/admin/payment-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (active && cfg && typeof cfg.vpa === "string") {
          setMerchant({
            vpa: cfg.vpa,
            payeeName: cfg.payeeName ?? DEFAULT_MERCHANT.payeeName,
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  /* ── Pricing ─────────────────────────────────────────────────────────── */
  const subtotal = venue.price;
  const gst = subtotal * VENUE_GST_RATE;
  const grandTotal = subtotal + gst;
  const total = Math.round(grandTotal);
  const advanceAmount = Math.max(1, Math.round(grandTotal * VENUE_ADVANCE_RATE));
  const amount = choice === "advance" ? advanceAmount : total;

  const bookingId = useMemo(
    () => venueBookingId(venue.id, eventDate, guests),
    [venue.id, eventDate, guests],
  );

  const cityLabel = venueCityName(venue.city);
  const occasionName =
    occasions.find((o) => o.id === occasionId)?.name ?? t("Venue Booking", "वेन्यू बुकिंग");

  /* ── Invoice + receipt for this venue order ──────────────────────────── */
  const buildInvoice = (paid: number): InvoiceData => ({
    id: bookingId,
    dateLabel: formatEventDate(todayISO()),
    occasion: occasionName,
    eventDate: eventDate ? formatEventDate(eventDate) : "—",
    city: cityLabel,
    venue: venue.name,
    guests,
    packageName: `${venue.type} — ${t("Venue Booking", "वेन्यू बुकिंग")}`,
    lines: [
      { label: `${venue.name} — ${t("venue booking fee", "वेन्यू बुकिंग शुल्क")}`, amount: subtotal },
    ],
    menu: [],
    subtotal,
    addOnsTotal: 0,
    discount: 0,
    gst,
    grandTotal,
    paid,
  });

  const buildReceipt = (paid: number): string => {
    const balance = Math.max(0, total - paid);
    const lines = [
      "BHOJPATRA — VENUE BOOKING RECEIPT",
      `Booking ID: ${bookingId}`,
      "",
      `Venue:    ${venue.name} (${venue.type})`,
      `Location: ${[venue.location, cityLabel].filter(Boolean).join(", ")}`,
      `Occasion: ${occasionName}`,
      `Date:     ${eventDate ? formatEventDate(eventDate) : "-"}`,
      `Guests:   ${guests}`,
      "",
      `Venue Fee:   ${money(subtotal)}`,
      `GST (18%):   ${money(gst)}`,
      `Grand Total: ${money(grandTotal)}`,
      `Paid:        ${money(paid)}`,
      `Balance Due: ${money(balance)}`,
    ];
    return lines.join("\n");
  };

  /* ── Payment ─────────────────────────────────────────────────────────── */
  const txnRef = upiTxnRef(bookingId, choice === "advance" ? "ADVANCE" : "FULL");
  const note = `Bhojpatra ${bookingId}`;
  const upiUri = buildUpiUri({
    vpa: merchant.vpa,
    payeeName: merchant.payeeName,
    amount,
    note,
    txnRef,
  });
  const qrSrc =
    `/api/payments/qr?pa=${encodeURIComponent(merchant.vpa)}` +
    `&pn=${encodeURIComponent(merchant.payeeName)}` +
    `&am=${amount}&tn=${encodeURIComponent(note)}&tr=${encodeURIComponent(txnRef)}`;

  const markPaid = async () => {
    setPaying(true);
    setPayError("");
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          amount,
          method: payMethod === "QR" ? "qr" : "upi",
          vpa: merchant.vpa,
          txnRef,
          customer: customerName.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setPayError(
          data?.error ??
            t("Couldn't record payment. Try again.", "भुगतान दर्ज नहीं हुआ। फिर कोशिश करें।"),
        );
        return;
      }
      setPaidAmount(amount);
      setPaidRef(txnRef);
    } catch {
      setPayError(
        t("Couldn't record payment. Try again.", "भुगतान दर्ज नहीं हुआ। फिर कोशिश करें।"),
      );
    } finally {
      setPaying(false);
    }
  };

  /* ── Confirm — save the booking so it shows in My Bookings + admin ────── */
  const handleConfirm = async () => {
    setConfirming(true);
    const paid = paidAmount;

    addStoredBooking({
      id: bookingId,
      occasion: occasionName,
      date: eventDate ? formatEventDate(eventDate) : "—",
      guests,
      vendor: venue.name,
      city: cityLabel,
      amount: total,
      paid,
      status: "Confirmed",
      ...(paidRef ? { paymentRef: paidRef } : {}),
      receipt: buildReceipt(paid),
      invoice: buildInvoice(paid),
      // Credit the venue back to the Venue-Owner partner who listed it.
      ...(venue.ownerCode
        ? {
            referralCode: venue.ownerCode,
            referrerName: venue.ownerName,
            referrerType: "venue",
          }
        : {}),
    });

    // Persist to the orders backend (admin console + owner dashboard). A blip
    // here shouldn't strand the guest — the order is already saved locally.
    try {
      await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bookingId,
          customer: customerName.trim(),
          phone: customerPhone.trim(),
          occasion: occasionName,
          date: eventDate ? formatEventDate(eventDate) : "—",
          guests,
          vendor: venue.name,
          city: cityLabel,
          amount: total,
          paid,
          paymentMethod: payMethod,
          paymentRef: paidRef || undefined,
          status: "Confirmed",
          referralCode: venue.ownerCode || undefined,
          referrerName: venue.ownerName || undefined,
          referrerType: venue.ownerCode ? "venue" : undefined,
        }),
      });
    } catch {
      /* offline — order saved locally; team follows up */
    }

    setConfirming(false);
    setStep("done");
  };

  const goToPay = () => {
    setDetailsError("");
    if (!eventDate) {
      setDetailsError(t("Please pick an event date.", "कृपया इवेंट की तारीख़ चुनें।"));
      return;
    }
    if (!customerName.trim()) {
      setDetailsError(t("Please enter your name.", "कृपया अपना नाम दर्ज करें।"));
      return;
    }
    if (customerPhone.replace(/\D/g, "").length < 10) {
      setDetailsError(t("Please enter a valid phone number.", "कृपया सही फ़ोन नंबर दर्ज करें।"));
      return;
    }
    setStep("pay");
  };

  const online = isOnlineMethod(payMethod);
  const fieldClass =
    "mt-1.5 w-full rounded-lg border border-cream-3 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-maroon focus:ring-1 focus:ring-maroon/30";

  /* ── Catering hand-off ("Both" flows) — carry the venue into /book ───── */
  const cateringHref = (() => {
    const p = new URLSearchParams();
    p.set("venue", venue.id);
    if (venue.city) p.set("city", venue.city);
    if (occasionId) p.set("occasion", occasionId);
    if (eventDate) p.set("date", eventDate);
    if (guests) p.set("guests", String(guests));
    return `/book?${p.toString()}`;
  })();

  return (
    <section className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <Link
        href="/venues"
        className="text-sm font-semibold text-maroon hover:underline"
      >
        ← {t("All Venues", "सभी वेन्यू")}
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        {/* ── Venue showcase ─────────────────────────────────────────── */}
        <div>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-cream-3 bg-cream-2 shadow-sm">
            <Image
              src={venue.image}
              alt={venue.name}
              fill
              priority
              sizes="(min-width: 1024px) 600px, 100vw"
              className="object-cover"
            />
            <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-maroon shadow-sm backdrop-blur-sm">
              {venue.type}
            </span>
          </div>

          <div className="mt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="font-display text-3xl text-ink">{venue.name}</h1>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cream-2 px-3 py-1 text-sm font-medium text-ink">
                <span aria-hidden="true" className="text-gold">⭐</span>
                {venue.rating}
                {venue.reviews > 0 && (
                  <span className="text-ink-soft">
                    ({venue.reviews})
                  </span>
                )}
              </span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
              <span aria-hidden="true">📍</span>
              {[venue.location, cityLabel].filter(Boolean).join(", ")}
            </p>
            {venue.capacity && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
                <span aria-hidden="true">👥</span>
                {venue.capacity}
              </p>
            )}

            <div className="mt-5 rounded-2xl border border-cream-3 bg-cream-2/40 p-4">
              <p className="text-xs text-ink-soft">{t("Booking fee from", "बुकिंग शुल्क")}</p>
              <p className="font-display text-2xl font-bold text-maroon">
                {venue.priceFrom}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                {t(
                  "Plus 18% GST. Pay a 10% advance to lock your date.",
                  "साथ में 18% जीएसटी। तारीख़ पक्की करने के लिए 10% एडवांस दें।",
                )}
              </p>
            </div>

            {/* Want catering at this venue too? Carry it into the feast wizard. */}
            <Link
              href={cateringHref}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-maroon px-5 py-2.5 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
            >
              🍽️ {t("Add catering for this venue", "इस वेन्यू के लिए कैटरिंग जोड़ें")}
            </Link>
          </div>
        </div>

        {/* ── Booking panel ──────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          {step === "done" ? (
            <DonePanel
              t={t}
              bookingId={bookingId}
              venue={venue}
              eventDate={eventDate}
              guests={guests}
              cityLabel={cityLabel}
              grandTotal={grandTotal}
              paidAmount={paidAmount}
              onDownload={() => downloadInvoice(buildInvoice(paidAmount))}
            />
          ) : (
            <div className="rounded-3xl border border-cream-3 bg-white p-5 shadow-sm sm:p-6">
              {/* Step indicator */}
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span
                  className={
                    "rounded-full px-3 py-1 " +
                    (step === "details"
                      ? "bg-maroon text-cream"
                      : "bg-cream-2 text-ink-soft")
                  }
                >
                  1 · {t("Details", "विवरण")}
                </span>
                <span aria-hidden="true" className="text-ink-soft">→</span>
                <span
                  className={
                    "rounded-full px-3 py-1 " +
                    (step === "pay"
                      ? "bg-maroon text-cream"
                      : "bg-cream-2 text-ink-soft")
                  }
                >
                  2 · {t("Pay & Confirm", "भुगतान और पुष्टि")}
                </span>
              </div>

              {step === "details" ? (
                <div className="mt-5">
                  <h2 className="font-display text-lg font-semibold text-ink">
                    {t("Book this venue", "यह वेन्यू बुक करें")}
                  </h2>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-medium text-ink-soft">
                        {t("Your name", "आपका नाम")}
                      </span>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder={t("Full name", "पूरा नाम")}
                        className={fieldClass}
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-medium text-ink-soft">
                        {t("Phone", "फ़ोन")}
                      </span>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+91 …"
                        className={fieldClass}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-ink-soft">
                        {t("Occasion", "अवसर")}
                      </span>
                      <select
                        value={occasionId}
                        onChange={(e) => setOccasionId(e.target.value)}
                        className={fieldClass}
                      >
                        <option value="">{t("Select", "चुनें")}</option>
                        {occasions.map((o) => (
                          <option key={o.id} value={o.id}>
                            {lang === "hi" ? o.nameHi : o.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-ink-soft">
                        {t("Guests", "मेहमान")}
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={guests}
                        onChange={(e) => setGuests(Number(e.target.value))}
                        onBlur={(e) =>
                          setGuests(Math.max(1, Math.round(Number(e.target.value) || 1)))
                        }
                        className={fieldClass}
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-medium text-ink-soft">
                        {t("Event date", "इवेंट की तारीख़")}
                      </span>
                      <input
                        type="date"
                        value={eventDate}
                        min={todayISO()}
                        onChange={(e) => setEventDate(e.target.value)}
                        className={fieldClass}
                      />
                    </label>
                  </div>

                  {detailsError && (
                    <p className="mt-3 text-sm font-medium text-maroon">{detailsError}</p>
                  )}

                  <PriceBreakdown
                    t={t}
                    subtotal={subtotal}
                    gst={gst}
                    grandTotal={grandTotal}
                    advanceAmount={advanceAmount}
                  />

                  <button
                    type="button"
                    onClick={goToPay}
                    className="mt-5 w-full rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
                  >
                    {t("Continue to payment", "भुगतान तक जारी रखें")} →
                  </button>
                </div>
              ) : sessionStatus === undefined ? (
                /* Client session still loading — hold the panel to avoid a
                   sign-in flash before we know whether to show the gate. */
                <div className="mt-5 min-h-[18rem]" />
              ) : sessionStatus === null ? (
                /* Anonymous guest — booking + payment need a login first. The
                   entered details stay put; logging in reveals Pay & Confirm. */
                <div className="mt-5">
                  <LoginGate onBack={() => setStep("details")} />
                </div>
              ) : (
                /* ── Step 2 · Pay & confirm ─────────────────────────── */
                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold text-ink">
                      {t("Pay & confirm", "भुगतान और पुष्टि")}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setStep("details")}
                      className="text-sm font-semibold text-maroon hover:underline"
                    >
                      {t("Edit", "संपादित करें")}
                    </button>
                  </div>

                  <PriceBreakdown
                    t={t}
                    subtotal={subtotal}
                    gst={gst}
                    grandTotal={grandTotal}
                    advanceAmount={advanceAmount}
                  />

                  {/* Payment method */}
                  <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    {ORDER_PAYMENT_METHODS.map((m) => {
                      const active = payMethod === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setPayMethod(m)}
                          className={
                            "flex flex-col rounded-2xl border px-4 py-3 text-left transition " +
                            (active
                              ? "border-maroon bg-maroon-soft/30 ring-2 ring-maroon"
                              : "border-cream-3 bg-white hover:bg-cream-2")
                          }
                        >
                          <span className="text-sm font-semibold text-ink">
                            {t(ORDER_PAYMENT_LABELS[m].en, ORDER_PAYMENT_LABELS[m].hi)}
                          </span>
                          <span className="mt-0.5 text-xs text-ink-soft">
                            {t(ORDER_PAYMENT_HINTS[m].en, ORDER_PAYMENT_HINTS[m].hi)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {paidAmount > 0 ? (
                    <div className="mt-4 rounded-2xl border border-maroon bg-white p-4">
                      <p className="font-display text-sm font-semibold text-maroon">
                        ✓ {t("Payment received", "भुगतान प्राप्त हुआ")}: {money(paidAmount)}
                      </p>
                      {total - paidAmount > 0 && (
                        <p className="mt-1 text-xs text-ink-soft">
                          {t("Balance due:", "शेष राशि:")} {money(total - paidAmount)}{" "}
                          {t("— our team collects this later.", "— हमारी टीम बाद में लेगी।")}
                        </p>
                      )}
                    </div>
                  ) : online ? (
                    <>
                      {/* Advance vs full */}
                      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                        {(
                          [
                            ["advance", t("Pay 10% Advance", "10% एडवांस दें"), advanceAmount],
                            ["full", t("Pay Full", "पूरा भुगतान"), total],
                          ] as const
                        ).map(([id, label, amt]) => {
                          const active = choice === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setChoice(id)}
                              className={
                                "flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-left transition " +
                                (active
                                  ? "border-maroon bg-maroon-soft/30 ring-2 ring-maroon"
                                  : "border-cream-3 bg-white hover:bg-cream-2")
                              }
                            >
                              <span className="text-sm font-semibold text-ink">{label}</span>
                              <span className="font-display text-sm font-semibold text-maroon">
                                {money(amt)}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {payMethod === "QR" ? (
                        <div className="mt-4 flex flex-col items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qrSrc}
                            alt={t("UPI payment QR", "UPI भुगतान QR")}
                            width={176}
                            height={176}
                            className="h-44 w-44 rounded-xl border border-cream-3 bg-white p-2"
                          />
                          <p className="text-sm font-semibold text-ink">{merchant.vpa}</p>
                          <a
                            href={upiUri}
                            className="rounded-full border border-maroon px-4 py-2 text-xs font-semibold text-maroon transition hover:bg-maroon/5 sm:hidden"
                          >
                            {t("Open UPI app", "UPI ऐप खोलें")}
                          </a>
                        </div>
                      ) : (
                        <div className="mt-4">
                          <p className="text-sm text-ink-soft">
                            {t("Pay to this UPI ID", "इस UPI आईडी पर भुगतान करें")}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2 text-sm font-semibold text-ink">
                              {merchant.vpa}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(merchant.vpa).then(
                                  () => setCopied(true),
                                  () => {},
                                );
                              }}
                              className="rounded-full border border-maroon px-4 py-2 text-xs font-semibold text-maroon transition hover:bg-maroon/5"
                            >
                              {copied ? t("Copied", "कॉपी हो गया") : t("Copy", "कॉपी")}
                            </button>
                            <a
                              href={upiUri}
                              className="rounded-full bg-maroon px-4 py-2 text-xs font-semibold text-cream transition hover:bg-maroon-dark"
                            >
                              {t("Open UPI app", "UPI ऐप खोलें")}
                            </a>
                          </div>
                        </div>
                      )}

                      {payError && (
                        <p className="mt-3 text-sm font-medium text-maroon">{payError}</p>
                      )}

                      <button
                        type="button"
                        onClick={markPaid}
                        disabled={paying}
                        className="mt-4 w-full rounded-full bg-maroon px-6 py-2.5 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark disabled:opacity-60"
                      >
                        {paying
                          ? t("Recording…", "दर्ज हो रहा है…")
                          : `${t("I've paid", "मैंने भुगतान कर दिया")} ${money(amount)}`}
                      </button>
                      <p className="mt-2 text-xs text-ink-soft">
                        {t(
                          "Optional — you can also confirm now and pay later.",
                          "वैकल्पिक — आप अभी पुष्टि करके बाद में भी भुगतान कर सकते हैं।",
                        )}
                      </p>
                    </>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-cream-3 bg-cream-2/40 p-4 text-sm text-ink-soft">
                      {payMethod === "COD"
                        ? t(
                            `No payment now — settle ${money(total)} directly with the venue. Confirm to lock your date.`,
                            `अभी कोई भुगतान नहीं — ${money(total)} सीधे वेन्यू को दें। तारीख़ पक्की करने के लिए पुष्टि करें।`,
                          )
                        : t(
                            "Confirm and our team will call you to arrange the most convenient way to pay.",
                            "पुष्टि करें और हमारी टीम भुगतान का सुविधाजनक तरीका तय करने के लिए कॉल करेगी।",
                          )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="mt-4 w-full rounded-full border border-maroon bg-white px-6 py-3 text-sm font-semibold text-maroon shadow-sm transition hover:bg-maroon/5 disabled:opacity-60"
                  >
                    {confirming
                      ? t("Confirming…", "पुष्टि हो रही है…")
                      : t("Confirm booking", "बुकिंग पुष्ट करें")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PriceBreakdown({
  t,
  subtotal,
  gst,
  grandTotal,
  advanceAmount,
}: {
  t: (en: string, hi: string) => string;
  subtotal: number;
  gst: number;
  grandTotal: number;
  advanceAmount: number;
}) {
  return (
    <div className="mt-5 space-y-2 rounded-2xl border border-cream-3 bg-cream-2/30 p-4">
      <Row label={t("Venue fee", "वेन्यू शुल्क")} value={money(subtotal)} />
      <Row label={t("GST (18%)", "जीएसटी (18%)")} value={money(gst)} />
      <div className="my-1 h-px bg-cream-3" />
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-semibold text-ink">
          {t("Grand Total", "कुल राशि")}
        </span>
        <span className="font-display text-base font-semibold text-maroon">
          {money(grandTotal)}
        </span>
      </div>
      <p className="pt-1 text-xs text-ink-soft">
        {t(
          `10% advance to lock the date: ${money(advanceAmount)}`,
          `तारीख़ पक्की करने के लिए 10% एडवांस: ${money(advanceAmount)}`,
        )}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

function DonePanel({
  t,
  bookingId,
  venue,
  eventDate,
  guests,
  cityLabel,
  grandTotal,
  paidAmount,
  onDownload,
}: {
  t: (en: string, hi: string) => string;
  bookingId: string;
  venue: BookableVenue;
  eventDate: string;
  guests: number;
  cityLabel: string;
  grandTotal: number;
  paidAmount: number;
  onDownload: () => void;
}) {
  const balance = Math.max(0, Math.round(grandTotal) - paidAmount);
  return (
    <div className="rounded-3xl border border-maroon bg-white p-6 shadow-sm">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-maroon-soft text-3xl">
        🎉
      </span>
      <h2 className="font-display mt-4 text-2xl font-semibold text-ink">
        {t("Venue booked!", "वेन्यू बुक हो गया!")}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        {t("Booking reference", "बुकिंग संदर्भ")}:{" "}
        <span className="font-semibold text-maroon">{bookingId}</span>
      </p>

      <dl className="mt-5 space-y-2 rounded-2xl border border-cream-3 bg-cream-2/30 p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-soft">{t("Venue", "वेन्यू")}</dt>
          <dd className="font-medium text-ink">{venue.name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-soft">{t("Date", "तारीख़")}</dt>
          <dd className="font-medium text-ink">
            {eventDate ? formatEventDate(eventDate) : "—"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-soft">{t("Guests", "मेहमान")}</dt>
          <dd className="font-medium text-ink">{guests}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-soft">{t("City", "शहर")}</dt>
          <dd className="font-medium text-ink">{cityLabel}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-soft">{t("Total", "कुल")}</dt>
          <dd className="font-medium text-ink">{money(grandTotal)}</dd>
        </div>
        {paidAmount > 0 && (
          <div className="flex justify-between">
            <dt className="text-ink-soft">{t("Paid", "भुगतान")}</dt>
            <dd className="font-medium text-ink">{money(paidAmount)}</dd>
          </div>
        )}
        {balance > 0 && (
          <div className="flex justify-between">
            <dt className="text-ink-soft">{t("Balance", "शेष")}</dt>
            <dd className="font-medium text-ink">{money(balance)}</dd>
          </div>
        )}
      </dl>

      <div className="mt-5 flex flex-col gap-3">
        <button
          type="button"
          onClick={onDownload}
          className="w-full rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
        >
          ⬇ {t("Download invoice", "इनवॉइस डाउनलोड करें")}
        </button>
        <Link
          href="/bookings"
          className="w-full rounded-full border border-maroon px-6 py-3 text-center text-sm font-semibold text-maroon transition hover:bg-maroon/5"
        >
          {t("View in My Bookings", "मेरी बुकिंग में देखें")}
        </Link>
      </div>
    </div>
  );
}
