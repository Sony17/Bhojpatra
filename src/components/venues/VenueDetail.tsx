"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { useSessionStatus } from "@/lib/session";
import LoginGate from "@/components/auth/LoginGate";
import StickyBookingBar from "@/components/StickyBookingBar";
import { occasions } from "@/lib/data";
import {
  fetchVenueById,
  venueCityName,
  VENUE_GST_RATE,
  VENUE_ADVANCE_RATE,
  type BookableVenue,
} from "@/lib/venues";
import { downloadInvoice, type InvoiceData } from "@/lib/invoice";
import {
  buildUpiUri,
  upiTxnRef,
  isValidTxnId,
  normalizeTxnId,
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
import { useVendorRatings, statFor } from "@/lib/vendorRatings";
import { StarIcon } from "@/components/reviews/reviewDisplay";
import VenueReviews from "@/components/venues/VenueReviews";
import { Button, Card, Container, Input, Select } from "@/components/ui";

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
      <Container size="md" className="py-16">
        <p className="text-sm text-ink-soft">{t("Loading venue…", "वेन्यू लोड हो रहा है…")}</p>
      </Container>
    );
  }

  if (venue === null) {
    return (
      <Container size="md" className="py-16 text-center">
        <h1 className="font-display text-2xl text-ink">
          {t("Venue not found", "वेन्यू नहीं मिला")}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {t(
            "This venue may have been removed. Browse all venues instead.",
            "यह वेन्यू हटाया जा चुका हो सकता है। सभी वेन्यू देखें।",
          )}
        </p>
        <Button href="/venues" variant="primary" size="lg" className="mt-6">
          {t("Back to Venues", "वेन्यू पर वापस")}
        </Button>
      </Container>
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
  // The transaction / UTR the customer got from their UPI app — taken before the
  // booking is confirmed so it lands on the payment record and the order.
  const [txnId, setTxnId] = useState("");
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
            qrImage:
              typeof cfg.qrImage === "string" ? cfg.qrImage : undefined,
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

  // Real, customer-submitted rating for this venue — layered over the seed
  // number for the headline badge (the reviews section below computes its own
  // live figure from the loaded list). Falls back to the seed until reviews land.
  const ratings = useVendorRatings();
  const stat = statFor(ratings, venue);
  const shownRating = stat?.rating ?? venue.rating;
  const shownCount = stat?.count ?? venue.reviews;

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
    // Require the customer's transaction ID as proof before recording payment.
    if (!isValidTxnId(txnId)) {
      setPayError(
        t(
          "Enter the transaction ID from your UPI app to confirm the payment.",
          "भुगतान की पुष्टि के लिए अपने UPI ऐप से लेनदेन आईडी दर्ज करें।",
        ),
      );
      return;
    }
    const customerTxnId = normalizeTxnId(txnId);
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
          customerTxnId,
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
      setPaidRef(customerTxnId);
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

    const invoiceData = buildInvoice(paid);

    // Persist to the orders backend — the single source of truth (admin console,
    // owner dashboard, the customer's My Bookings). The venue is credited back to
    // the Venue-Owner partner who listed it. The order MUST land server-side, so
    // a failure surfaces an error and keeps the guest on this step to retry.
    try {
      const res = await fetch("/api/bookings", {
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
          // Carry the venue's catalogue identity so the order is rateable as a
          // venue from My Bookings and the review links back to this venue by id
          // (name-slug stays the fallback bridge for legacy orders).
          vendors: [{ id: venue.id, name: venue.name }],
          city: cityLabel,
          amount: total,
          paid,
          paymentMethod: payMethod,
          paymentRef: paidRef || undefined,
          status: "Confirmed",
          referralCode: venue.ownerCode || undefined,
          referrerName: venue.ownerName || undefined,
          referrerType: venue.ownerCode ? "venue" : undefined,
          receipt: buildReceipt(paid),
          invoice: invoiceData,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setPayError(
          data?.error ??
            t(
              "Couldn't confirm your booking. Please try again.",
              "आपकी बुकिंग कन्फर्म नहीं हो सकी। कृपया पुनः प्रयास करें।",
            ),
        );
        setConfirming(false);
        return;
      }
    } catch {
      setPayError(
        t(
          "Network error. Please try again.",
          "नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।",
        ),
      );
      setConfirming(false);
      return;
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
    <>
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
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card border border-cream-3 bg-cream-2 shadow-card">
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
              {/* Rating badge — jumps to the reviews section below. */}
              <a
                href="#reviews"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cream-2 px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-cream-3"
              >
                <StarIcon className="h-4 w-4 text-maroon" />
                {shownRating}
                {shownCount > 0 && (
                  <span className="font-normal text-ink-soft">({shownCount})</span>
                )}
              </a>
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

            <div className="mt-5 rounded-card border border-cream-3 bg-cream-2/40 p-4">
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
            <Button
              href={cateringHref}
              variant="secondary"
              leftIcon={<span aria-hidden="true">🍽️</span>}
              className="mt-4"
            >
              {t("Add catering for this venue", "इस वेन्यू के लिए कैटरिंग जोड़ें")}
            </Button>
          </div>
        </div>

        {/* ── Booking panel ──────────────────────────────────────────── */}
        <div id="venue-booking" className="scroll-mt-28 lg:sticky lg:top-32 lg:self-start">
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
            <Card padding="none" className="p-5 sm:p-6">
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
                      <Input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder={t("Full name", "पूरा नाम")}
                        className="mt-1.5"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-medium text-ink-soft">
                        {t("Phone", "फ़ोन")}
                      </span>
                      <Input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+91 …"
                        className="mt-1.5"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-ink-soft">
                        {t("Occasion", "अवसर")}
                      </span>
                      <Select
                        value={occasionId}
                        onChange={setOccasionId}
                        ariaLabel={t("Occasion", "अवसर")}
                        buttonClassName="mt-1.5"
                        options={[
                          { value: "", label: t("Select", "चुनें") },
                          ...occasions.map((o) => ({
                            value: o.id,
                            label: lang === "hi" ? o.nameHi : o.name,
                          })),
                        ]}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-ink-soft">
                        {t("Guests", "मेहमान")}
                      </span>
                      <Input
                        type="number"
                        min={1}
                        value={guests}
                        onChange={(e) => setGuests(Number(e.target.value))}
                        onBlur={(e) =>
                          setGuests(Math.max(1, Math.round(Number(e.target.value) || 1)))
                        }
                        className="mt-1.5"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-medium text-ink-soft">
                        {t("Event date", "इवेंट की तारीख़")}
                      </span>
                      <Input
                        type="date"
                        value={eventDate}
                        min={todayISO()}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="mt-1.5"
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

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={goToPay}
                    rightIcon={<span aria-hidden="true">→</span>}
                    className="mt-5"
                  >
                    {t("Continue to payment", "भुगतान तक जारी रखें")}
                  </Button>
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
                            "flex flex-col rounded-card border px-4 py-3 text-left transition " +
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
                    <div className="mt-4 rounded-card border border-maroon bg-white p-4">
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
                                "flex items-center justify-between gap-2 rounded-card border px-4 py-3 text-left transition " +
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
                            src={merchant.qrImage || qrSrc}
                            alt={t("UPI payment QR", "UPI भुगतान QR")}
                            width={176}
                            height={176}
                            className="h-44 w-44 rounded-control border border-cream-3 bg-white p-2 object-contain"
                          />
                          {merchant.qrImage && (
                            <p className="text-xs text-ink-soft">
                              {t(
                                `Enter ${money(amount)} in your UPI app.`,
                                `अपने UPI ऐप में ${money(amount)} दर्ज करें।`,
                              )}
                            </p>
                          )}
                          <p className="text-sm font-semibold text-ink">{merchant.vpa}</p>
                          <Button
                            href={upiUri}
                            variant="secondary"
                            size="sm"
                            className="sm:hidden"
                          >
                            {t("Open UPI app", "UPI ऐप खोलें")}
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-4">
                          <p className="text-sm text-ink-soft">
                            {t("Pay to this UPI ID", "इस UPI आईडी पर भुगतान करें")}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-control border border-cream-3 bg-cream-2/40 px-4 py-2 text-sm font-semibold text-ink">
                              {merchant.vpa}
                            </span>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard?.writeText(merchant.vpa).then(
                                  () => setCopied(true),
                                  () => {},
                                );
                              }}
                            >
                              {copied ? t("Copied", "कॉपी हो गया") : t("Copy", "कॉपी")}
                            </Button>
                            <Button href={upiUri} variant="primary" size="sm">
                              {t("Open UPI app", "UPI ऐप खोलें")}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Transaction ID — the reference the customer's UPI app
                          shows after paying. Required before we record the
                          payment and confirm the booking. */}
                      <div className="mt-4">
                        <label
                          htmlFor="venue-upi-txn-id"
                          className="text-sm font-semibold text-ink"
                        >
                          {t("UPI Transaction ID", "UPI लेनदेन आईडी")}
                        </label>
                        <Input
                          id="venue-upi-txn-id"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={txnId}
                          onChange={(e) => setTxnId(e.target.value)}
                          placeholder={t(
                            "12-digit UPI reference / UTR",
                            "12-अंकों का UPI रेफ़रेंस / UTR",
                          )}
                          className="mt-1.5"
                        />
                        <p className="mt-1.5 text-xs text-ink-soft">
                          {t(
                            "After paying, enter the reference number your UPI app shows so we can match your payment.",
                            "भुगतान के बाद अपने UPI ऐप में दिखने वाला रेफ़रेंस नंबर दर्ज करें ताकि हम आपका भुगतान मिला सकें।",
                          )}
                        </p>
                      </div>

                      {payError && (
                        <p className="mt-3 text-sm font-medium text-maroon">{payError}</p>
                      )}

                      <Button
                        variant="primary"
                        fullWidth
                        onClick={markPaid}
                        loading={paying}
                        disabled={paying || !isValidTxnId(txnId)}
                        className="mt-4"
                      >
                        {paying
                          ? t("Recording…", "दर्ज हो रहा है…")
                          : `${t("I've paid", "मैंने भुगतान कर दिया")} ${money(amount)}`}
                      </Button>
                      <p className="mt-2 text-xs text-ink-soft">
                        {t(
                          "Optional — you can also confirm now and pay later.",
                          "वैकल्पिक — आप अभी पुष्टि करके बाद में भी भुगतान कर सकते हैं।",
                        )}
                      </p>
                    </>
                  ) : (
                    <div className="mt-4 rounded-card border border-cream-3 bg-cream-2/40 p-4 text-sm text-ink-soft">
                      {t(
                        "No payment now — confirm and our team will call you to arrange the most convenient way to pay.",
                        "अभी कोई भुगतान नहीं — पुष्टि करें और हमारी टीम भुगतान का सुविधाजनक तरीका तय करने के लिए कॉल करेगी।",
                      )}
                    </div>
                  )}

                  <Button
                    variant="secondary"
                    size="lg"
                    fullWidth
                    onClick={handleConfirm}
                    loading={confirming}
                    disabled={confirming}
                    className="mt-4"
                  >
                    {confirming
                      ? t("Confirming…", "पुष्टि हो रही है…")
                      : t("Confirm booking", "बुकिंग पुष्ट करें")}
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Mobile sticky booking bar — jumps to the booking form; hidden once the
          guest moves past the details step (payment / done). */}
      <StickyBookingBar
        price={venue.priceFrom}
        priceNote={t("Booking fee · +18% GST", "बुकिंग शुल्क · +18% जीएसटी")}
        cta={t("Book This Venue", "यह वेन्यू बुक करें")}
        onClick={() =>
          document
            .getElementById("venue-booking")
            ?.scrollIntoView({ behavior: "smooth" })
        }
        hidden={step !== "details"}
      />
    </section>

    {/* Ratings & reviews — venue-side twin of the caterer profile's reviews. */}
    <VenueReviews venue={venue} />
    </>
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
    <div className="mt-5 space-y-2 rounded-card border border-cream-3 bg-cream-2/30 p-4">
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
    <div className="rounded-card border border-maroon bg-white p-6 shadow-card">
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

      <dl className="mt-5 space-y-2 rounded-card border border-cream-3 bg-cream-2/30 p-4 text-sm">
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
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onDownload}
          leftIcon={<span aria-hidden="true">⬇</span>}
        >
          {t("Download invoice", "इनवॉइस डाउनलोड करें")}
        </Button>
        <Button href="/bookings" variant="secondary" size="lg" fullWidth>
          {t("View in My Dashboard", "मेरे डैशबोर्ड में देखें")}
        </Button>
      </div>
    </div>
  );
}
