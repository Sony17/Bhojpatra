"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isValidEmail } from "@/lib/validate";
import { money } from "@/lib/money";
import { ADVANCE_RATE } from "@/lib/bookingPricing";
import {
  buildUpiUri,
  upiTxnRef,
  isValidTxnId,
  normalizeTxnId,
  DEFAULT_MERCHANT,
  type UpiPayeeConfig,
} from "@/lib/upi";
import {
  ORDER_PAYMENT_LABELS,
  ORDER_PAYMENT_HINTS,
  isOnlineMethod,
  type OrderPaymentMethod,
} from "@/lib/orderPayment";
import { emiOptionsForEvent, buildEmiPlan } from "@/lib/emi";
import {
  startRazorpayCheckout,
  RazorpayCheckoutError,
} from "@/lib/razorpayCheckout";

/* ─── Choose a payment method ──────────────────────────────────────────
 * Shared by both booking flows (`/book` and `/book/stall`). Ways to settle a
 * booking, selected by the parent wizard so the chosen method travels with the
 * order to the admin console:
 *   • Razorpay — when the gateway keypair is configured (surfaced to the client
 *     as `razorpayKeyId` on /api/admin/payment-settings), the online choice is
 *     Razorpay Checkout: UPI, cards & netbanking in Razorpay's modal, verified
 *     server-side (signature + payment fetch) before /api/payments/razorpay/verify
 *     records the advance. No customer-entered UTR. Replaces the manual modes
 *     below whenever it's available.
 *   • UPI / QR — pay online now against the merchant's UPI VPA. The QR is a real
 *     NPCI `upi://pay?...` deep-link rendered by our /api/payments/qr route, so
 *     any UPI app can scan it. There's no gateway callback, so settlement is
 *     customer-confirmed: tapping "I've paid" records the payment via
 *     /api/payments (idempotent on the txn ref → lands in the payment tracker)
 *     and reports the paid amount up to the wizard. UPI/QR can settle a 10%
 *     advance or the whole grand total.
 *   • Connect — let our team reach out to arrange the most convenient payment.
 */
export default function PaymentBox({
  t,
  bookingId,
  grandTotal,
  paidAmount,
  onPaid,
  customerName,
  customerPhone,
  customerEmail,
  payMethod,
  setPayMethod,
  eventDate,
  emiCount,
  setEmiCount,
}: {
  t: (en: string, hi: string) => string;
  bookingId: string;
  grandTotal: number;
  paidAmount: number;
  onPaid: (amount: number, txnRef: string) => void;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  payMethod: OrderPaymentMethod;
  setPayMethod: (m: OrderPaymentMethod) => void;
  eventDate: string;
  emiCount: number;
  setEmiCount: (n: number) => void;
}) {
  const [merchant, setMerchant] = useState<UpiPayeeConfig>(DEFAULT_MERCHANT);
  // Razorpay publishable key id — non-empty means the gateway is configured
  // and the online path runs through Razorpay Checkout instead of manual UPI.
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  // Informational (non-error) line under the pay button — e.g. the customer
  // closed the checkout without paying. Softer styling than `error`.
  const [notice, setNotice] = useState<string>("");
  // A gateway payment attempt actually failed (vs. a form/validation error) —
  // renders the full failure panel with retry / go-home actions.
  const [failedPayment, setFailedPayment] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  // The transaction / UTR the customer got from their UPI app — captured here so
  // it travels onto the payment record and the order before the booking is
  // confirmed, letting the team reconcile the transfer.
  const [txnId, setTxnId] = useState<string>("");

  // Pull the live merchant VPA (admin-configurable) plus the gateway key;
  // fall back to the default manual-UPI merchant.
  useEffect(() => {
    let active = true;
    fetch("/api/admin/payment-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (!active || !cfg) return;
        if (typeof cfg.vpa === "string") {
          setMerchant({
            vpa: cfg.vpa,
            payeeName: cfg.payeeName ?? DEFAULT_MERCHANT.payeeName,
            qrImage:
              typeof cfg.qrImage === "string" ? cfg.qrImage : undefined,
          });
        }
        if (typeof cfg.razorpayKeyId === "string" && cfg.razorpayKeyId) {
          setRazorpayKeyId(cfg.razorpayKeyId);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // With the gateway on, the manual UPI/QR modes aren't offered — upgrade any
  // lingering UPI/QR selection (the wizards default to "UPI") to Razorpay so
  // the method saved on the order matches how the advance was actually paid.
  useEffect(() => {
    if (razorpayKeyId && (payMethod === "UPI" || payMethod === "QR")) {
      setPayMethod("Razorpay");
    }
  }, [razorpayKeyId, payMethod, setPayMethod]);

  const total = Math.round(grandTotal);
  // A fixed 10% advance confirms the booking; the 90% balance is settled later
  // (in one go or over EMIs). The online flow always collects exactly this.
  const advanceAmount = Math.max(1, Math.round(grandTotal * ADVANCE_RATE));
  const amount = advanceAmount;
  const balanceAmount = Math.max(0, total - advanceAmount);

  // How the customer wants to settle the 90% balance after the advance: pay it
  // in full (emiCount 1) or split into instalments. EMI counts >1 are only
  // offered when the event is far enough out; `emiCount` is owned by the wizard
  // so the choice travels onto the saved order.
  const emiOptions = emiOptionsForEvent(eventDate);
  const emiSelected = emiOptions.includes(emiCount) ? emiCount : 1;
  const emiPlan =
    emiSelected > 1
      ? buildEmiPlan(balanceAmount, emiSelected, eventDate)
      : null;
  // Contact (name + phone + a valid email) must be captured before we take
  // money, so the paid order is actionable and the auto-confirm that follows the
  // advance succeeds (handleConfirm enforces the same three fields).
  const contactReady =
    customerName.trim().length > 0 &&
    customerPhone.replace(/\D/g, "").length >= 10 &&
    isValidEmail(customerEmail);
  // A stable ref for the advance so a retry stays idempotent on the txn key.
  const txnRef = upiTxnRef(bookingId, "ADVANCE");
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
    // The customer's transaction ID is required proof of the transfer — take it
    // before recording the payment / confirming the booking.
    if (!isValidTxnId(txnId)) {
      setError(
        t(
          "Enter the transaction ID from your UPI app to confirm the payment.",
          "भुगतान की पुष्टि के लिए अपने UPI ऐप से लेनदेन आईडी दर्ज करें।",
        ),
      );
      return;
    }
    const customerTxnId = normalizeTxnId(txnId);
    setSubmitting(true);
    setError("");
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
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(
          data?.error ??
            t("Couldn't record payment. Try again.", "भुगतान दर्ज नहीं हुआ। फिर कोशिश करें।"),
        );
        return;
      }
      onPaid(amount, customerTxnId);
    } catch {
      setError(
        t("Couldn't record payment. Try again.", "भुगतान दर्ज नहीं हुआ। फिर कोशिश करें।"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Gateway path — Razorpay Checkout collects the advance and the verify route
  // records it (gateway-verified, so there's no UTR to ask for). On success the
  // wizard auto-confirms exactly like the manual flow.
  const payViaRazorpay = async () => {
    setSubmitting(true);
    setError("");
    setNotice("");
    setFailedPayment(false);
    try {
      const result = await startRazorpayCheckout({
        bookingId,
        amount,
        note,
        customerName: customerName.trim(),
        customerEmail,
        customerPhone,
      });
      onPaid(result.amountPaid, result.paymentId);
    } catch (err) {
      if (err instanceof RazorpayCheckoutError && err.code === "dismissed") {
        // Closing the modal without attempting a payment isn't an error — a
        // soft reassurance that nothing was charged, with the ways forward.
        setNotice(
          t(
            "Payment not completed — nothing was charged. Try again when you're ready, or choose “Bhojpatra connects you” to pay later.",
            "भुगतान पूरा नहीं हुआ — कोई राशि नहीं कटी। तैयार होने पर फिर कोशिश करें, या बाद में भुगतान के लिए “भोजपत्र आपसे संपर्क करेगा” चुनें।",
          ),
        );
      } else if (
        err instanceof RazorpayCheckoutError &&
        err.code === "failed"
      ) {
        // A payment attempt failed and the customer left the modal — show the
        // failure panel with the gateway's reason and the ways forward.
        setFailedPayment(true);
        setError(
          t(
            `${err.message} Nothing was charged.`,
            `${err.message} कोई राशि नहीं कटी।`,
          ),
        );
      } else if (
        err instanceof RazorpayCheckoutError &&
        err.code === "verify"
      ) {
        // Money may have moved but our confirm call didn't land — the webhook
        // still records it, so above all stop them paying twice.
        setError(
          t(
            "Your payment went through but we couldn't confirm it here. Don't pay again — it will be recorded automatically. If your booking doesn't confirm shortly, contact us with your booking ID.",
            "आपका भुगतान हो गया लेकिन हम यहाँ इसकी पुष्टि नहीं कर सके। दोबारा भुगतान न करें — यह अपने आप दर्ज हो जाएगा। यदि आपकी बुकिंग जल्द कन्फर्म न हो, तो अपनी बुकिंग आईडी के साथ हमसे संपर्क करें।",
          ),
        );
      } else {
        setError(
          t(
            "Couldn't start the payment. Try again.",
            "भुगतान शुरू नहीं हो सका। फिर कोशिश करें।",
          ),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyVpa = async () => {
    try {
      await navigator.clipboard.writeText(merchant.vpa);
      setCopied(true);
    } catch {
      /* clipboard unavailable — the VPA is shown for manual entry anyway */
    }
  };

  if (paidAmount > 0) {
    const balance = Math.max(0, total - paidAmount);
    const fullyPaid = balance === 0;
    return (
      <div className="mt-6 rounded-2xl border border-maroon bg-white p-5 shadow-sm">
        <p className="font-display text-lg font-semibold text-maroon">
          ✓ {t("Payment received", "भुगतान प्राप्त हुआ")}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {fullyPaid
            ? t("Full payment recorded:", "पूरा भुगतान दर्ज:")
            : t("Advance recorded:", "एडवांस दर्ज:")}{" "}
          <span className="font-semibold text-ink">{money(paidAmount)}</span>
        </p>
        {!fullyPaid && (
          <p className="mt-1 text-sm text-ink-soft">
            {t("Balance due:", "शेष राशि:")}{" "}
            <span className="font-semibold text-ink">{money(balance)}</span>{" "}
            <span className="text-ink-soft/80">
              {t("— our team will collect this later.", "— हमारी टीम बाद में लेगी।")}
            </span>
          </p>
        )}
      </div>
    );
  }

  const online = isOnlineMethod(payMethod);
  // Whether the online path runs through Razorpay Checkout (gateway configured)
  // rather than the manual UPI/QR deep-link flow.
  const gatewayMode = payMethod === "Razorpay";

  return (
    <div className="mt-6 rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-ink">
          {t("How would you like to pay?", "आप कैसे भुगतान करना चाहेंगे?")}
        </h3>
        {online && (
          <span className="text-lg font-semibold text-maroon">{money(amount)}</span>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        {t(
          "Pay the 10% advance online to confirm now, or let our team connect to arrange payment.",
          "अभी पुष्टि के लिए 10% एडवांस ऑनलाइन दें, या भुगतान की व्यवस्था के लिए हमारी टीम से संपर्क करने दें।",
        )}
      </p>

      {/* Two top-level choices: pay online (UPI) now, or "Bhojpatra connects
          you (COD)" — book now and settle later. UPI expands into UPI-ID / QR. */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          aria-pressed={online}
          onClick={() => {
            if (!online) setPayMethod(razorpayKeyId ? "Razorpay" : "UPI");
          }}
          className={
            "flex flex-col rounded-2xl border px-4 py-3 text-left transition " +
            (online
              ? "border-maroon bg-cream/45 shadow-soft"
              : "border-cream-3 bg-white hover:bg-cream-2")
          }
        >
          <span className="text-sm font-semibold text-ink">
            {razorpayKeyId
              ? t(ORDER_PAYMENT_LABELS.Razorpay.en, ORDER_PAYMENT_LABELS.Razorpay.hi)
              : t("UPI", "UPI")}
          </span>
          <span className="mt-0.5 text-xs text-ink-soft">
            {razorpayKeyId
              ? t(ORDER_PAYMENT_HINTS.Razorpay.en, ORDER_PAYMENT_HINTS.Razorpay.hi)
              : t("Pay 10% advance online now", "अभी 10% एडवांस ऑनलाइन दें")}
          </span>
        </button>
        <button
          type="button"
          aria-pressed={payMethod === "Connect"}
          onClick={() => setPayMethod("Connect")}
          className={
            "flex flex-col rounded-2xl border px-4 py-3 text-left transition " +
            (payMethod === "Connect"
              ? "border-maroon bg-cream/45 shadow-soft"
              : "border-cream-3 bg-white hover:bg-cream-2")
          }
        >
          <span className="text-sm font-semibold text-ink">
            {t(ORDER_PAYMENT_LABELS.Connect.en, ORDER_PAYMENT_LABELS.Connect.hi)}
          </span>
          <span className="mt-0.5 text-xs text-ink-soft">
            {t(
              "Confirm now — our team calls to arrange payment",
              "अभी पुष्टि करें — भुगतान के लिए हमारी टीम कॉल करेगी",
            )}
          </span>
        </button>
      </div>

      {online ? (
        <>
          {/* Sub-mode — pay the advance via a UPI ID or by scanning a QR.
              (Manual flow only; Razorpay's modal offers its own methods.) */}
          {!gatewayMode && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-ink">
              {t("Choose how to pay the advance", "एडवांस कैसे दें, चुनें")}
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {(["UPI", "QR"] as const).map((m) => {
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
                        ? "border-maroon bg-cream/45 shadow-soft"
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
          </div>
          )}

          {/* The advance that confirms the booking — fixed at 10%. */}
          <div className="mt-4 rounded-2xl border border-maroon/30 bg-cream/35 p-4">
            <p className="text-sm text-ink">
              {t(
                `Pay a 10% advance of ${money(advanceAmount)} now to confirm your booking.`,
                `अपनी बुकिंग पक्की करने के लिए अभी 10% एडवांस ${money(advanceAmount)} दें।`,
              )}
            </p>
          </div>

          {gatewayMode ? null : payMethod === "QR" ? (
            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={merchant.qrImage || qrSrc}
                alt={t("UPI payment QR", "UPI भुगतान QR")}
                width={176}
                height={176}
                className="h-44 w-44 rounded-xl border border-cream-3 bg-white p-2 object-contain"
              />
              <div className="text-sm text-ink-soft">
                <p>
                  {t(
                    "Scan with any UPI app to pay",
                    "भुगतान के लिए किसी भी UPI ऐप से स्कैन करें",
                  )}
                </p>
                {merchant.qrImage && (
                  <p className="mt-1 text-xs">
                    {t(
                      `Enter ${money(amount)} in your UPI app.`,
                      `अपने UPI ऐप में ${money(amount)} दर्ज करें।`,
                    )}
                  </p>
                )}
                <p className="mt-1 font-semibold text-ink">{merchant.vpa}</p>
                <a
                  href={upiUri}
                  className="mt-3 inline-block rounded-full border border-maroon px-4 py-2 text-xs font-semibold text-maroon transition hover:bg-maroon/5 sm:hidden"
                >
                  {t("Open UPI app", "UPI ऐप खोलें")}
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-ink-soft">
                {t("Pay to this UPI ID", "इस UPI आईडी पर भुगतान करें")}
              </p>
              <div className="mt-2 flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar sm:flex-wrap sm:overflow-visible">
                <span className="shrink-0 whitespace-nowrap rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2 text-sm font-semibold text-ink">
                  {merchant.vpa}
                </span>
                <button
                  type="button"
                  onClick={copyVpa}
                  className="shrink-0 whitespace-nowrap rounded-full border border-maroon px-4 py-2 text-xs font-semibold text-maroon transition hover:bg-maroon/5"
                >
                  {copied ? t("Copied", "कॉपी हो गया") : t("Copy", "कॉपी")}
                </button>
                <a
                  href={upiUri}
                  className="shrink-0 whitespace-nowrap rounded-full bg-maroon px-4 py-2 text-xs font-semibold text-cream transition hover:bg-maroon/90"
                >
                  {t("Open UPI app", "UPI ऐप खोलें")}
                </a>
              </div>
            </div>
          )}

          {/* Transaction ID — the reference the customer's UPI app shows after
              paying. Required before we record the payment and confirm, so the
              team can reconcile the transfer. (Manual flow only — gateway
              payments are verified server-side, nothing to type.) */}
          {!gatewayMode && (
          <div className="mt-4">
            <label htmlFor="upi-txn-id" className="text-sm font-semibold text-ink">
              {t("UPI Transaction ID", "UPI लेनदेन आईडी")}
            </label>
            <input
              id="upi-txn-id"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={txnId}
              onChange={(e) => setTxnId(e.target.value)}
              placeholder={t(
                "12-digit UPI reference / UTR",
                "12-अंकों का UPI रेफ़रेंस / UTR",
              )}
              className="mt-1.5 w-full rounded-xl border border-cream-3 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-maroon focus:ring-2 focus:ring-maroon/30"
            />
            <p className="mt-1.5 text-xs text-ink-soft">
              {t(
                "After paying, enter the reference number your UPI app shows so we can match your payment.",
                "भुगतान के बाद अपने UPI ऐप में दिखने वाला रेफ़रेंस नंबर दर्ज करें ताकि हम आपका भुगतान मिला सकें।",
              )}
            </p>
          </div>
          )}

          {/* Balance preference — how to settle the remaining 90% after the
              advance: in one payment, or split into EMIs (offered when the event
              is far enough out). Track-only: our team collects each instalment on
              its due date. */}
          <div className="mt-4 rounded-2xl border border-cream-3 bg-cream-2/30 p-4">
            <p className="text-sm font-semibold text-ink">
              {t(
                "How would you like to settle the balance?",
                "शेष राशि कैसे चुकाना चाहेंगे?",
              )}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {t(
                `After the ${money(advanceAmount)} advance, settle the ${money(balanceAmount)} balance in full or over easy EMIs.`,
                `${money(advanceAmount)} एडवांस के बाद, ${money(balanceAmount)} शेष राशि एकमुश्त या आसान EMI में चुकाएं।`,
              )}
            </p>
            <div className="mt-3 flex flex-nowrap gap-2 overflow-x-auto no-scrollbar sm:flex-wrap sm:overflow-visible">
              {emiOptions.map((n) => {
                const active = emiSelected === n;
                const label =
                  n === 1
                    ? t("Pay in full", "एकमुश्त")
                    : t(`${n} EMIs`, `${n} EMI`);
                return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setEmiCount(n)}
                    className={
                      "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition " +
                      (active
                        ? "border-maroon bg-maroon text-cream"
                        : "border-cream-3 bg-white text-ink hover:bg-cream-2")
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {emiPlan && (
              <ul className="mt-3 divide-y divide-cream-3 rounded-xl border border-cream-3 bg-white">
                {emiPlan.installments.map((it) => (
                  <li
                    key={it.index}
                    className="flex items-center justify-between px-4 py-2 text-sm"
                  >
                    <span className="text-ink-soft">
                      {t(
                        `EMI ${it.index} · ${it.dueLabel}`,
                        `EMI ${it.index} · ${it.dueLabel}`,
                      )}
                    </span>
                    <span className="font-semibold text-ink">
                      {money(it.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {emiPlan && (
              <p className="mt-2 text-xs text-ink-soft">
                {t(
                  "Our team collects each instalment on its due date — no card is charged automatically.",
                  "हमारी टीम हर किश्त उसकी नियत तारीख पर लेगी — कोई कार्ड अपने आप चार्ज नहीं होगा।",
                )}
              </p>
            )}
          </div>

          {error &&
            (failedPayment ? (
              /* A real payment attempt failed — full panel: what happened, and
                 the two ways forward (retry here, or back to the home page). */
              <div className="mt-4 rounded-2xl border border-maroon bg-maroon/5 p-4">
                <p className="font-display text-base font-semibold text-maroon">
                  ✕ {t("Payment Failed", "भुगतान विफल")}
                </p>
                <p className="mt-1 text-sm text-ink">{error}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={payViaRazorpay}
                    disabled={submitting}
                    className="rounded-full bg-maroon px-5 py-2 text-xs font-semibold text-cream transition hover:bg-maroon/90 disabled:opacity-60"
                  >
                    {t("Try Again", "फिर कोशिश करें")}
                  </button>
                  <Link
                    href="/"
                    className="rounded-full border border-maroon px-5 py-2 text-xs font-semibold text-maroon transition hover:bg-maroon/5"
                  >
                    {t("Back to Bhojpatra Home", "भोजपत्र होम पर वापस जाएं")}
                  </Link>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm font-medium text-maroon">{error}</p>
            ))}
          {notice && !error && (
            <p className="mt-3 text-sm text-ink-soft">{notice}</p>
          )}

          {/* One tap pays/records the advance and confirms the booking — no
              need to scroll down to a separate confirm button. Gateway mode
              opens Razorpay Checkout; the manual flow records the typed UTR. */}
          <button
            type="button"
            onClick={gatewayMode ? payViaRazorpay : markPaid}
            disabled={
              submitting ||
              !contactReady ||
              (!gatewayMode && !isValidTxnId(txnId))
            }
            className="mt-4 rounded-full bg-maroon px-6 py-2.5 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon/90 disabled:opacity-60"
          >
            {submitting
              ? t("Confirming…", "पुष्टि हो रही है…")
              : `${
                  gatewayMode
                    ? t("Pay Securely", "सुरक्षित भुगतान करें")
                    : t("Pay & Confirm", "भुगतान करें और पुष्टि करें")
                } ${money(amount)}`}
          </button>
          {gatewayMode && (
            <p className="mt-2 text-xs text-ink-soft">
              {t(
                "Your booking confirms automatically once the payment succeeds. Secured by Razorpay.",
                "भुगतान सफल होते ही आपकी बुकिंग अपने आप कन्फर्म हो जाएगी। Razorpay द्वारा सुरक्षित।",
              )}
            </p>
          )}
          {!contactReady && (
            <p className="mt-2 text-xs font-medium text-maroon">
              {t(
                "Enter your name, phone and email above to confirm your booking.",
                "अपनी बुकिंग पक्की करने के लिए ऊपर अपना नाम, फ़ोन और ईमेल दर्ज करें।",
              )}
            </p>
          )}
          <p className="mt-2 text-xs text-ink-soft">
            {t(
              "Prefer to pay later? Choose “Bhojpatra connects you” above.",
              "बाद में भुगतान करना चाहते हैं? ऊपर “भोजपत्र आपसे संपर्क करेगा” चुनें।",
            )}
          </p>
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-cream-3 bg-cream-2/40 p-4">
          <p className="text-sm font-semibold text-ink">
            {t(ORDER_PAYMENT_LABELS.Connect.en, ORDER_PAYMENT_LABELS.Connect.hi)}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {t(
              "Confirm below and our team will call you to finalise the menu and arrange the most convenient way to pay — no payment now.",
              "नीचे पुष्टि करें और हमारी टीम मेन्यू तय करने और भुगतान का सबसे सुविधाजनक तरीका तय करने के लिए आपको कॉल करेगी — अभी कोई भुगतान नहीं।",
            )}
          </p>
        </div>
      )}
    </div>
  );
}
