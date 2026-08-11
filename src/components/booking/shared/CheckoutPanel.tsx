"use client";

import { useState } from "react";
import PaymentBox from "@/components/booking/shared/PaymentBox";
import { coupons, type Coupon } from "@/lib/data";
import { inr, money, perPlateCost } from "@/lib/money";
import { ADVANCE_RATE } from "@/lib/bookingPricing";
import { type OrderPaymentMethod } from "@/lib/orderPayment";

/* ─── Checkout panel ──────────────────────────────────────────────────────
 * Everything below the order summary on either wizard's Review step: coupon,
 * contact + venue, referral, the grand-total card, how-to-pay, and the confirm
 * / WhatsApp actions. Shared so paying for a Single Stall order is the same
 * screen — same coupon tickets, same advance copy, same CTAs — as paying for a
 * tiered feast. The order summary above it stays flow-specific, since a tier's
 * per-course menu and a stall's course list read differently.
 */
export default function CheckoutPanel({
  t,
  venue,
  setVenue,
  venueFee,
  guests,
  eventDate,
  couponInput,
  setCouponInput,
  applyCoupon,
  applyCouponCode,
  removeCoupon,
  preDiscount,
  appliedCoupon,
  couponError,
  couponDiscount,
  referralCode,
  setReferralCode,
  referrerName,
  selfReferral,
  referralDiscount,
  referralPercent,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerEmail,
  setCustomerEmail,
  knownContact,
  bookingId,
  grandTotal,
  paidAmount,
  payMethod,
  setPayMethod,
  emiCount,
  setEmiCount,
  onPaid,
  confirming,
  confirmError,
  whatsappHref,
}: {
  t: (en: string, hi: string) => string;
  venue: string;
  setVenue: (v: string) => void;
  venueFee: number;
  guests: number;
  eventDate: string;
  couponInput: string;
  setCouponInput: (v: string) => void;
  applyCoupon: () => void;
  applyCouponCode: (code: string) => void;
  removeCoupon: () => void;
  /** Order value the coupon's percentage is computed against (for the ticket
   *  "Save ₹X" previews). */
  preDiscount: number;
  appliedCoupon: Coupon | null;
  couponError: string;
  couponDiscount: number;
  referralCode: string;
  setReferralCode: (v: string) => void;
  referrerName: string;
  selfReferral: boolean;
  referralDiscount: number;
  referralPercent: number;
  customerName: string;
  setCustomerName: (v: string) => void;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  customerEmail: string;
  setCustomerEmail: (v: string) => void;
  /** What we already hold for this guest (account name/email, the number from
   *  their last booking) — read back instead of asked for a second time. */
  knownContact: { name: string; email: string; phone: string };
  bookingId: string;
  grandTotal: number;
  paidAmount: number;
  payMethod: OrderPaymentMethod;
  setPayMethod: (m: OrderPaymentMethod) => void;
  emiCount: number;
  setEmiCount: (n: number) => void;
  onPaid: (amount: number, ref: string) => void;
  confirming: boolean;
  confirmError: string;
  whatsappHref: string;
}) {
  // A contact field counts as "already known" only while it still matches what
  // we have on file — the moment the guest edits it, it's their own input and
  // goes back to being a plain field.
  const eq = (a: string, b: string) =>
    b.trim().length > 0 && a.trim().toLowerCase() === b.trim().toLowerCase();
  const knownName = eq(customerName, knownContact.name);
  const knownEmail = eq(customerEmail, knownContact.email);
  const knownPhone = eq(customerPhone, knownContact.phone);
  const knowSomething = knownName || knownEmail || knownPhone;
  // Opened by "Edit" — reveals every field so a guest can book under a
  // different name, address or number than the one on their account.
  const [editingContact, setEditingContact] = useState(false);
  const showContactField = (known: boolean) => editingContact || !known;

  return (
    <>
    {/* Coupon */}
    <div className="mt-6 rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-maroon/10 text-maroon">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />
            <path d="M9 7v10" strokeDasharray="2 2" />
          </svg>
        </span>
        <h3 className="font-display text-base font-semibold text-ink">
          {t("Apply a coupon", "कूपन लगाएं")}
        </h3>
      </div>

      {appliedCoupon && couponDiscount > 0 ? (
        /* Applied — compact success card with remove */
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-maroon/30 bg-cream-2/40 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-maroon text-white">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                <span className="font-mono font-bold tracking-wide text-maroon">
                  {appliedCoupon.code}
                </span>{" "}
                {t("applied", "लागू")}
              </p>
              <p className="text-xs font-medium text-ink-soft/70">
                {t("You save", "आपकी बचत")} {money(couponDiscount)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={removeCoupon}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-maroon transition hover:bg-maroon/10"
          >
            {t("Remove", "हटाएं")}
          </button>
        </div>
      ) : (
        <>
          {/* Compact single-line input with inline apply */}
          <div className="mt-3 flex items-center gap-2 rounded-full border border-cream-3 bg-cream-2/30 py-1 pl-4 pr-1 transition-colors focus-within:border-maroon focus-within:bg-white">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder={t("Enter code", "कोड दर्ज करें")}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium uppercase tracking-wide text-ink outline-none placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-soft/50"
            />
            <button
              type="button"
              onClick={applyCoupon}
              disabled={!couponInput.trim()}
              className="shrink-0 rounded-full bg-maroon px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("Apply", "लगाएं")}
            </button>
          </div>
          {couponError && (
            <p className="mt-2 pl-1 text-xs font-medium text-maroon">
              {couponError}
            </p>
          )}

          {/* Select-to-apply offer tickets */}
          <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-soft/50">
            {t("Tap to apply", "लगाने के लिए टैप करें")}
          </p>
          <div className="-mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {coupons.map((c) => {
              const save = Math.min((preDiscount * c.percent) / 100, c.cap);
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => applyCouponCode(c.code)}
                  className="group relative flex w-44 shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-dashed border-maroon/40 bg-cream-2/25 p-3 text-left transition hover:border-maroon hover:bg-cream-2/50 hover:shadow-sm"
                >
                  {/* punched ticket notches */}
                  <span className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-cream-3 bg-white" />
                  <span className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-cream-3 bg-white" />
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold tracking-wide text-maroon">
                      {c.code}
                    </span>
                    <span className="rounded-md bg-maroon px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white opacity-90 transition group-hover:opacity-100">
                      {t("Apply", "लगाएं")}
                    </span>
                  </div>
                  <span className="mt-1.5 text-xs font-semibold text-ink">
                    {save > 0
                      ? t(`Save ${money(save)}`, `बचाएं ${money(save)}`)
                      : c.label}
                  </span>
                  {save > 0 && (
                    <span className="mt-0.5 truncate text-[10px] text-ink-soft/60">
                      {c.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>

    {/* Contact — so our team can reach out (required for COD / connect).
        Whatever we already hold (the signed-in account's name and email, the
        number from this customer's last booking) is read back as a single
        confirmation line instead of being typed a second time; only the
        fields we genuinely don't have are asked for. "Edit" reopens all of
        them for a guest booking under different details. */}
    <div className="mt-6 rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-ink">
          {t("Your contact details", "आपकी संपर्क जानकारी")}
        </h3>
        {knowSomething && !editingContact && (
          <button
            type="button"
            onClick={() => setEditingContact(true)}
            className="shrink-0 text-xs font-semibold text-maroon underline-offset-2 hover:underline"
          >
            {t("Edit", "बदलें")}
          </button>
        )}
      </div>

      {knowSomething && !editingContact && (
        <div className="mt-3 rounded-xl border border-cream-3 bg-cream-2/40 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            {t("Booking as", "बुकिंग इनके नाम")}
          </p>
          {knownName && (
            <p className="mt-0.5 text-sm font-semibold text-ink">
              {customerName}
            </p>
          )}
          {knownEmail && <p className="text-sm text-ink-soft">{customerEmail}</p>}
          {knownPhone && <p className="text-sm text-ink-soft">{customerPhone}</p>}
          <p className="mt-1.5 text-[11px] text-ink-soft">
            {t(
              "Already on file from your account — tap Edit if anything changed.",
              "आपके खाते से ली गई जानकारी — कुछ बदला हो तो बदलें पर टैप करें।",
            )}
          </p>
        </div>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {showContactField(knownName) && (
          <div>
            <label className="text-xs font-medium text-ink-soft">
              {t("Full name", "पूरा नाम")}
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t("e.g. Ankit Sharma", "उदा. अंकित शर्मा")}
              autoComplete="name"
              className="mt-1 w-full rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-maroon focus:bg-white placeholder:text-ink-soft/60"
            />
          </div>
        )}
        {showContactField(knownPhone) && (
          <div>
            <label className="text-xs font-medium text-ink-soft">
              {t("Phone number", "फ़ोन नंबर")}
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder={t("10-digit mobile", "10 अंकों का मोबाइल")}
              autoComplete="tel"
              inputMode="tel"
              className="mt-1 w-full rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-maroon focus:bg-white placeholder:text-ink-soft/60"
            />
            {/* When name + email came from the account this is the only thing
                we're asking for — say why, so it doesn't read as busywork. */}
            {!editingContact && knownName && knownEmail && (
              <p className="mt-1 text-[11px] text-ink-soft">
                {t(
                  "The one thing we still need — our team calls this number to confirm your feast.",
                  "बस यही चाहिए — हमारी टीम पुष्टि के लिए इसी नंबर पर कॉल करेगी।",
                )}
              </p>
            )}
          </div>
        )}
        {showContactField(knownEmail) && (
          <div>
            <label className="text-xs font-medium text-ink-soft">
              {t("Email", "ईमेल")}
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder={t("you@example.com", "you@example.com")}
              autoComplete="email"
              inputMode="email"
              className="mt-1 w-full rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-maroon focus:bg-white placeholder:text-ink-soft/60"
            />
          </div>
        )}
        {/* Venue — usually pre-filled from the Hero booking bar or the venue
            catalogue, but editable here so it's captured even when the guest
            reached the wizard without one. Spans the full row. */}
        <div className="sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-medium text-ink-soft">
              {t("Venue", "वेन्यू")}
            </label>
            {/* A catalogue venue (booked from /venues) carries a fee — flag it
                explicitly so the customer can tell a listed Bhojpatra venue
                apart from a free-typed hall name. */}
            {venueFee > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-maroon px-2 py-0.5 text-[11px] font-semibold text-cream">
                <span aria-hidden>🏛</span>{" "}
                {t("Listed venue", "लिस्टेड वेन्यू")} · {money(venueFee)}
              </span>
            )}
          </div>
          <input
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder={t(
              "e.g. Grand Palace Lawn, Gomti Nagar",
              "उदा. ग्रैंड पैलेस लॉन, गोमती नगर",
            )}
            className="mt-1 w-full rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-maroon focus:bg-white placeholder:text-ink-soft/60"
          />
          {venueFee > 0 && (
            <p className="mt-1 text-[11px] text-ink-soft">
              {t(
                "A listed Bhojpatra venue — its booking fee is included in your total below.",
                "एक लिस्टेड Bhojpatra वेन्यू — इसका बुकिंग शुल्क नीचे आपके कुल में शामिल है।",
              )}
            </p>
          )}
        </div>
      </div>
    </div>

    {/* Referral — auto-filled from a partner's share link (?ref=) or typed in.
        A recognised code shows the referrer's name as a tag. */}
    <div className="mt-6 rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
      <h3 className="font-display text-base font-semibold text-ink">
        {t("Referral code", "रेफ़रल कोड")}{" "}
        <span className="text-sm font-normal text-ink-soft">
          ({t("optional", "वैकल्पिक")})
        </span>
      </h3>
      <p className="mt-1 text-sm text-ink-soft">
        {t(
          "Referred by a Bhojpatra partner? Enter their code so they get credit.",
          "किसी Bhojpatra पार्टनर ने रेफ़र किया? उनका कोड दर्ज करें ताकि उन्हें श्रेय मिले।",
        )}
      </p>
      <input
        type="text"
        value={referralCode}
        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
        placeholder="REF-XXXXXX"
        className="mt-3 w-full rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm uppercase tracking-wider text-ink outline-none transition-colors focus:border-maroon focus:bg-white placeholder:text-ink-soft/60 placeholder:normal-case placeholder:tracking-normal sm:max-w-xs"
      />
      {selfReferral ? (
        <p className="mt-2 text-sm font-medium text-maroon">
          {t(
            "This is your own referral code — you can't refer yourself, so it won't be credited.",
            "यह आपका ही रेफ़रल कोड है — आप खुद को रेफ़र नहीं कर सकते, इसलिए इसका श्रेय नहीं मिलेगा।",
          )}
        </p>
      ) : (
        referralCode.trim() &&
        referrerName && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-maroon px-3 py-1 text-xs font-semibold text-cream">
              <span aria-hidden="true">★</span>
              {t("Referred by", "रेफ़र किया")} {referrerName}
            </span>
            {referralDiscount > 0 && (
              <span className="text-sm font-medium text-maroon">
                {t("You save", "आपकी बचत")} {money(referralDiscount)}
                {referralPercent > 0 ? ` (${referralPercent}%)` : ""}
              </span>
            )}
          </div>
        )
      )}
    </div>

    <div className="mt-6 rounded-2xl border border-maroon/30 bg-cream/40 p-5 shadow-soft">
      {guests > 0 && grandTotal > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-soft">
              {t("Per plate (all-in)", "प्रति प्लेट (सब मिलाकर)")}
            </p>
            <p className="text-2xl font-semibold text-maroon">
              ≈ {money(perPlateCost(grandTotal, guests))}
              <span className="text-sm font-medium">
                {" "}
                / {t("plate", "प्लेट")}
              </span>
            </p>
          </div>
          <p className="mt-0.5 text-right text-sm text-ink-soft">
            {t(
              `Grand total ${money(grandTotal)} for ${inr.format(guests)} guests`,
              `${inr.format(guests)} मेहमानों के लिए कुल राशि ${money(grandTotal)}`,
            )}
          </p>
        </>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink-soft">{t("Grand total", "कुल राशि")}</p>
          <p className="text-2xl font-semibold text-maroon">
            {money(grandTotal)}
          </p>
        </div>
      )}
      {paidAmount >= Math.round(grandTotal) ? (
        <p className="mt-1 text-sm font-semibold text-maroon">
          ✓ {t("Paid in full", "पूरा भुगतान हो गया")} · {money(paidAmount)}
        </p>
      ) : paidAmount > 0 ? (
        <p className="mt-1 text-sm font-semibold text-maroon">
          ✓ {t("Advance paid", "एडवांस भुगतान")} · {money(paidAmount)} ·{" "}
          <span className="font-normal text-ink-soft">
            {t("Balance", "शेष")}{" "}
            {money(Math.max(0, Math.round(grandTotal) - paidAmount))}
          </span>
        </p>
      ) : (
        <p className="mt-1 text-sm text-ink-soft">
          {t(
            `Pay a 10% advance (${money(Math.round(grandTotal * ADVANCE_RATE))}) now to confirm your booking — or choose “Bhojpatra connects you” below and our team will reach out to finalise the menu and payment.`,
            `अपनी बुकिंग पक्की करने के लिए अभी 10% एडवांस (${money(Math.round(grandTotal * ADVANCE_RATE))}) दें — या नीचे “भोजपत्र आपसे संपर्क करेगा” चुनें, हमारी टीम मेन्यू और भुगतान तय करने के लिए संपर्क करेगी।`,
          )}
        </p>
      )}
    </div>

    {/* Choose how to pay — pay the 10% advance online (UPI ID / QR) to confirm
        right here, or "Bhojpatra connects you (COD)" to book now and settle
        later. The online path records the advance and confirms in one click. */}
    <PaymentBox
      t={t}
      bookingId={bookingId}
      grandTotal={grandTotal}
      paidAmount={paidAmount}
      onPaid={onPaid}
      customerName={customerName}
      customerPhone={customerPhone}
      customerEmail={customerEmail}
      payMethod={payMethod}
      setPayMethod={setPayMethod}
      eventDate={eventDate}
      emiCount={emiCount}
      setEmiCount={setEmiCount}
    />

    {confirmError && (
      <p role="alert" className="mt-4 text-sm font-medium text-maroon">
        {confirmError}
      </p>
    )}

    <div className="mt-6 flex flex-wrap items-center gap-3">
      {/* The online (UPI) path confirms straight from its "Pay & Confirm"
          button, so this submit only shows for the pay-later Connect flow, or
          as a retry once an advance has already been recorded. */}
      {(payMethod === "Connect" || paidAmount > 0) && (
        <button
          type="submit"
          disabled={confirming}
          className="rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon/90 disabled:opacity-60"
        >
          {confirming
            ? t("Confirming…", "पुष्टि हो रही है…")
            : t("Confirm Booking", "बुकिंग पक्की करें")}
        </button>
      )}
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full border border-maroon px-6 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
      >
        {t("Share on WhatsApp", "WhatsApp पर शेयर करें")}
      </a>
    </div>
    <p className="mt-2 text-xs text-ink-soft">
      {t(
        "We'll confirm your booking and contact you to complete the arrangements.",
        "हम आपकी बुकिंग की पुष्टि करेंगे और व्यवस्था पूरी करने के लिए आपसे संपर्क करेंगे।",
      )}
    </p>
    </>
  );
}
