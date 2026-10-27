"use client";

import { useState, type ReactNode } from "react";
import PaymentBox from "@/components/booking/shared/PaymentBox";
import SellerDetailsCard from "@/components/booking/shared/SellerDetails";
import type { SellerDetails } from "@/lib/sellerDetails";
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
  onBeforePay,
  couponList = coupons,
  confirming,
  confirmError,
  whatsappHref,
  blocker = "",
  stage,
  afterCoupon,
  onProceed,
  paySummary,
  onGateway,
  sellers = [],
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
  onPaid: (amount: number, ref: string, verified?: boolean) => void;
  /** Runs right before any money is taken (see PaymentBox). */
  onBeforePay?: () => Promise<boolean>;
  /** The offer tickets to show — the live coupon list where the flow has it
   *  (Single Stall), else the static seed list. */
  couponList?: Coupon[];
  confirming: boolean;
  confirmError: string;
  whatsappHref: string;
  /** An unmet order rule (see PaymentBox) — blocks both the pay and the
   *  pay-later confirm buttons until the guest fixes it. */
  blocker?: string;
  /** Split checkout: "cart" shows the coupon, details and total, ending in
   *  "Proceed to payment"; "pay" shows the total and how to pay. Omitted, the
   *  whole checkout renders on one screen. */
  stage?: "cart" | "pay";
  /** Rendered straight after the coupon card (e.g. the order breakdown). */
  afterCoupon?: ReactNode;
  /** "Proceed to payment" on the cart stage. */
  onProceed?: () => void;
  /** Beside the contact card on the pay stage (e.g. a booking summary). */
  paySummary?: ReactNode;
  /** Passed to PaymentBox — fires once the Razorpay gateway is live. */
  onGateway?: (live: boolean) => void;
  /** Verified statutory details of every vendor on the order ("Sold by"),
   *  shown on the pay stage. */
  sellers?: SellerDetails[];
}) {
  const showCart = stage !== "pay";
  const showPay = stage !== "cart";
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
  // On the split cart the referral field folds behind one line until wanted.
  const [referralOpen, setReferralOpen] = useState(false);
  // …and the coupon field behind one row with the best offer as a chip.
  const [couponOpen, setCouponOpen] = useState(false);
  const couponApplied = Boolean(appliedCoupon && couponDiscount > 0);
  const bestCoupon = couponList.reduce<Coupon | null>(
    (best, c) =>
      !best ||
      Math.min((preDiscount * c.percent) / 100, c.cap) >
        Math.min((preDiscount * best.percent) / 100, best.cap)
        ? c
        : best,
    null,
  );
  const showReferralField = stage !== "cart" || referralOpen || referralCode.trim() !== "";
  const showContactField = (known: boolean) => editingContact || !known;

  const contactCard = (
    <>
    {/* Contact — so our team can reach out (required for COD / connect).
        Whatever we already hold (the signed-in account's name and email, the
        number from this customer's last booking) is read back as a single
        confirmation line instead of being typed a second time; only the
        fields we genuinely don't have are asked for. "Edit" reopens all of
        them for a guest booking under different details. */}
    <div
      className={
        stage
          ? "flex h-full min-w-0 flex-col rounded-2xl border border-cream-3/80 bg-white p-2.5 shadow-soft sm:p-4"
          : "mt-6 rounded-2xl border border-cream-3 bg-white p-5 shadow-sm"
      }
    >
      <div className={stage ? "flex items-center gap-2 sm:gap-3" : "flex items-start justify-between gap-3"}>
        {stage && (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cream/60 text-maroon sm:h-9 sm:w-9">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" />
            </svg>
          </span>
        )}
        <h3
          className={
            stage
              ? "min-w-0 flex-1 font-sans text-[13px] font-semibold leading-tight text-ink sm:text-[15px]"
              : "font-display text-base font-semibold text-ink"
          }
        >
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
        <div className={stage ? "mt-2 rounded-xl border border-cream-3 bg-cream-2/40 px-2.5 py-2 sm:px-3 sm:py-2.5" : "mt-3 rounded-xl border border-cream-3 bg-cream-2/40 px-4 py-3"}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            {t("Booking as", "बुकिंग इनके नाम")}
          </p>
          {stage ? (
            /* App look: each detail under its own small label. */
            <dl className="mt-1 space-y-1 text-[12px] sm:text-sm">
              {knownName && (
                <div>
                  <dt className="text-[11px] text-ink-soft">{t("Name", "नाम")}</dt>
                  <dd className="font-semibold text-ink">{customerName}</dd>
                </div>
              )}
              {knownEmail && (
                <div>
                  <dt className="text-[11px] text-ink-soft">{t("Email", "ईमेल")}</dt>
                  <dd className="break-all text-ink">{customerEmail}</dd>
                </div>
              )}
              {knownPhone && (
                <div>
                  <dt className="text-[11px] text-ink-soft">{t("Phone", "फ़ोन")}</dt>
                  <dd className="text-ink">{customerPhone}</dd>
                </div>
              )}
            </dl>
          ) : (
            <>
              {knownName && (
                <p className="mt-0.5 text-sm font-semibold text-ink">
                  {customerName}
                </p>
              )}
              {knownEmail && <p className="text-sm text-ink-soft">{customerEmail}</p>}
              {knownPhone && <p className="text-sm text-ink-soft">{customerPhone}</p>}
            </>
          )}
          {!stage && (
            <p className="mt-1.5 text-[11px] text-ink-soft">
              {t(
                "Already on file from your account — tap Edit if anything changed.",
                "आपके खाते से ली गई जानकारी — कुछ बदला हो तो बदलें पर टैप करें।",
              )}
            </p>
          )}
        </div>
      )}

      <div className={stage ? "mt-2 grid flex-1 content-end gap-2" : "mt-3 grid gap-3 sm:grid-cols-2"}>
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
              className={`mt-1 w-full rounded-lg border border-cream-3 bg-cream-2/40 ${stage ? "px-3 py-2" : "px-4 py-2.5"} text-sm text-ink outline-none transition-colors focus:border-maroon focus:bg-white placeholder:text-ink-soft/60`}
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
              className={`mt-1 w-full rounded-lg border border-cream-3 bg-cream-2/40 ${stage ? "px-3 py-2" : "px-4 py-2.5"} text-sm text-ink outline-none transition-colors focus:border-maroon focus:bg-white placeholder:text-ink-soft/60`}
            />
            {/* When name + email came from the account this is the only thing
                we're asking for — say why, so it doesn't read as busywork. */}
            {!editingContact && knownName && knownEmail && (
              <p className="mt-1 text-[11px] text-ink-soft">
                {stage
                  ? t("We'll call to confirm.", "पुष्टि के लिए हम कॉल करेंगे।")
                  : t(
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
              className={`mt-1 w-full rounded-lg border border-cream-3 bg-cream-2/40 ${stage ? "px-3 py-2" : "px-4 py-2.5"} text-sm text-ink outline-none transition-colors focus:border-maroon focus:bg-white placeholder:text-ink-soft/60`}
            />
          </div>
        )}
        {/* Venue — usually pre-filled from the Hero booking bar or the venue
            catalogue, but editable here so it's captured even when the guest
            reached the wizard without one. Spans the full row. */}
        <div className={stage ? "border-t border-cream-3 pt-2" : "sm:col-span-2"}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              className={
                stage
                  ? "inline-flex items-center gap-2 text-sm font-semibold text-ink"
                  : "text-xs font-medium text-ink-soft"
              }
            >
              {stage && (
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-maroon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                </svg>
              )}
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
            className={`mt-1 w-full rounded-lg border border-cream-3 bg-cream-2/40 ${stage ? "px-3 py-2" : "px-4 py-2.5"} text-sm text-ink outline-none transition-colors focus:border-maroon focus:bg-white placeholder:text-ink-soft/60`}
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
    </>
  );
  const referralCard = (
    <>
    {/* Referral — auto-filled from a partner's share link (?ref=) or typed in.
        A recognised code shows the referrer's name as a tag. */}
    <div
      className={
        stage === "cart"
          ? "rounded-b-2xl border border-t-0 border-cream-3/80 bg-white px-2.5 py-2 shadow-soft sm:p-3"
          : "mt-6 rounded-2xl border border-cream-3 bg-white p-5 shadow-sm"
      }
    >
      {stage === "cart" ? (
        <button
          type="button"
          onClick={() => setReferralOpen((v) => !v)}
          aria-expanded={showReferralField}
          className="flex w-full items-center gap-2 text-left sm:gap-3"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream/60 text-maroon sm:h-9 sm:w-9">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM21 19v-1a3.5 3.5 0 0 0-2.6-3.4M15.5 4.2a3 3 0 0 1 0 5.6" />
            </svg>
          </span>
          <span className="min-w-0 flex-1 text-[14px] font-semibold text-ink sm:text-[15px]">
            {t("Have a referral code?", "रेफ़रल कोड है?")}{" "}
            <span className="text-xs font-normal text-ink-soft">({t("optional", "वैकल्पिक")})</span>
          </span>
          <svg viewBox="0 0 24 24" className={"h-4 w-4 shrink-0 text-maroon transition-transform " + (showReferralField ? "rotate-180" : "")} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      ) : (
      <h3 className="font-display text-base font-semibold text-ink">
        {t("Referral code", "रेफ़रल कोड")}{" "}
        <span className="text-sm font-normal text-ink-soft">
          ({t("optional", "वैकल्पिक")})
        </span>
      </h3>
      )}
      {showReferralField && (
      <>
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
      </>
      )}
    </div>
    </>
  );

  return (
    <>
    {showCart && (
    <>
    {/* Coupon */}
    <div
      className={
        stage === "cart"
          ? "mt-1 rounded-t-2xl border border-cream-3/80 bg-white px-2.5 py-2 sm:p-3"
          : stage
            ? "mt-3 rounded-2xl border border-cream-3/80 bg-white p-3 shadow-soft sm:p-4"
            : "mt-6 rounded-2xl border border-cream-3 bg-white p-4 shadow-sm"
      }
    >
      <div className={stage === "cart" ? "flex items-center gap-2" : "flex items-center gap-3"}>
        <span
          className={
            stage === "cart"
              ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream/60 text-maroon sm:h-9 sm:w-9"
              : stage
              ? "flex h-9 w-9 items-center justify-center rounded-full bg-cream/60 text-maroon"
              : "flex h-7 w-7 items-center justify-center rounded-lg bg-maroon/10 text-maroon"
          }
        >
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
        <h3
          className={
            stage
              ? "min-w-0 flex-1 font-sans text-[14px] font-semibold leading-tight text-ink sm:text-[15px]"
              : "font-display text-base font-semibold text-ink"
          }
        >
          {t("Apply a coupon", "कूपन लगाएं")}
        </h3>
        {stage === "cart" && couponApplied && appliedCoupon && (
          <>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cream/60 px-2 py-1 text-[11px] font-semibold text-ink">
              <span aria-hidden="true" className="text-maroon">✓</span>
              {appliedCoupon.code}
              <span className="text-maroon">− {money(couponDiscount)}</span>
            </span>
            <button
              type="button"
              onClick={removeCoupon}
              aria-label={t(`Remove coupon ${appliedCoupon.code}`, `कूपन ${appliedCoupon.code} हटाएं`)}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-maroon hover:bg-cream/50"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </>
        )}
        {stage === "cart" && !couponApplied && (
          <>
            {bestCoupon && (
              <button
                type="button"
                onClick={() => applyCouponCode(bestCoupon.code)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cream/60 px-2.5 py-1 text-[11px] font-semibold text-ink"
              >
                <span aria-hidden="true" className="text-maroon">★</span>
                <span className="font-mono tracking-wide">{bestCoupon.code}</span>
                <span className="text-maroon">
                  {bestCoupon.percent}% {t("off", "छूट")}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setCouponOpen((v) => !v)}
              aria-expanded={couponOpen}
              aria-label={t("More coupons", "और कूपन")}
              className="shrink-0 p-1 text-maroon"
            >
              <svg viewBox="0 0 24 24" className={"h-4 w-4 transition-transform " + (couponOpen ? "rotate-90" : "")} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </>
        )}
      </div>

      {stage === "cart" && couponApplied ? null : appliedCoupon && couponDiscount > 0 ? (
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
      ) : stage === "cart" && !couponOpen ? (
        couponError ? (
          <p className="mt-2 pl-12 text-xs font-medium text-maroon">{couponError}</p>
        ) : null
      ) : (
        <>
          {/* Compact single-line input with inline apply */}
          <div
            className={
              stage
                ? "mt-3 flex items-center gap-2"
                : "mt-3 flex items-center gap-2 rounded-full border border-cream-3 bg-cream-2/30 py-1 pl-4 pr-1 transition-colors focus-within:border-maroon focus-within:bg-white"
            }
          >
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder={t("Enter coupon code", "कूपन कोड दर्ज करें")}
              className={
                (stage
                  ? "rounded-xl border border-cream-3 bg-white px-3.5 py-2.5 focus:border-maroon "
                  : "bg-transparent ") +
                "min-w-0 flex-1 text-sm font-medium uppercase tracking-wide text-ink outline-none placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-soft/50"
              }
            />
            <button
              type="button"
              onClick={applyCoupon}
              disabled={!couponInput.trim()}
              className={
                stage
                  ? "shrink-0 rounded-xl border border-maroon bg-white px-5 py-2.5 text-sm font-semibold text-maroon transition hover:bg-cream/40 disabled:cursor-not-allowed disabled:opacity-40"
                  : "shrink-0 rounded-full bg-maroon px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              }
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
          <p className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-soft/50">
            {t("Tap to apply", "लगाने के लिए टैप करें")}
          </p>
          <div className="-mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {couponList.map((c) => {
              const save = Math.min((preDiscount * c.percent) / 100, c.cap);
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => applyCouponCode(c.code)}
                  className="group relative flex w-36 shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-dashed border-maroon/40 bg-cream-2/25 px-2.5 py-2 text-left transition hover:border-maroon hover:bg-cream-2/50 hover:shadow-sm"
                >
                  {/* punched ticket notches */}
                  <span className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-cream-3 bg-white" />
                  <span className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-cream-3 bg-white" />
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold tracking-wide text-maroon">
                      {c.code}
                    </span>
                    <span className="rounded-md bg-maroon px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white opacity-90 transition group-hover:opacity-100">
                      {t("Apply", "लगाएं")}
                    </span>
                  </div>
                  <span className="mt-1 text-[11px] font-semibold text-ink">
                    {save > 0
                      ? t(`Save ${money(save)}`, `बचाएं ${money(save)}`)
                      : c.label}
                  </span>
                  {save > 0 && (
                    <span className="mt-0.5 text-[10px] leading-tight text-ink-soft/60">
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

    {!stage && contactCard}
    {referralCard}
    {stage && afterCoupon}
    </>
    )}

    {/* The split checkout's cart already itemises the total, and the pay
        step's PaymentBox names the advance — this card would only repeat them. */}
    {!stage && (
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
    )}

    {stage === "cart" && (
      <>
        {blocker && (
          <p role="alert" className="mt-4 text-sm font-medium text-maroon">
            {blocker}
          </p>
        )}
        <button
          type="button"
          onClick={onProceed}
          disabled={Boolean(blocker)}
          className="mt-2 flex w-full items-center justify-between rounded-2xl bg-maroon px-5 py-3 text-base font-semibold text-cream shadow-brand transition hover:bg-maroon/90 disabled:opacity-60"
        >
          <span aria-hidden="true" className="w-5" />
          {t("Proceed to payment", "भुगतान के लिए आगे बढ़ें")}
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </>
    )}

    {showPay && (
    <>
    {stage === "pay" && (
      <div className="mt-3 grid grid-cols-2 items-stretch gap-2 sm:gap-3">
        {contactCard}
        {paySummary}
      </div>
    )}

    {/* Choose how to pay — pay the 10% advance online (UPI ID / QR) to confirm
        right here, or "Bhojpatra connects you (COD)" to book now and settle
        later. The online path records the advance and confirms in one click. */}
    <PaymentBox
      t={t}
      bookingId={bookingId}
      grandTotal={grandTotal}
      paidAmount={paidAmount}
      onPaid={onPaid}
      onBeforePay={onBeforePay}
      customerName={customerName}
      customerPhone={customerPhone}
      customerEmail={customerEmail}
      payMethod={payMethod}
      setPayMethod={setPayMethod}
      eventDate={eventDate}
      emiCount={emiCount}
      setEmiCount={setEmiCount}
      blocker={blocker}
      app={Boolean(stage)}
      onGateway={onGateway}
    />

    {confirmError && (
      <p role="alert" className="mt-4 text-sm font-medium text-maroon">
        {confirmError}
      </p>
    )}

    {(payMethod === "Connect" || paidAmount > 0) && stage && (
      /* The online (UPI) path confirms straight from its own pay button, so
         this submit only shows for the pay-later Connect flow, or as a retry
         once an advance has already been recorded. */
      <button
        type="submit"
        disabled={confirming || Boolean(blocker)}
        className="mt-4 flex w-full items-center justify-center rounded-2xl bg-maroon px-5 py-4 text-base font-semibold text-cream shadow-brand transition hover:bg-maroon/90 disabled:opacity-60"
      >
        {confirming
          ? t("Confirming…", "पुष्टि हो रही है…")
          : t("Confirm Booking", "बुकिंग पक्की करें")}
      </button>
    )}
    {stage ? (
      /* App look: share and the reassurance line side by side. */
      <div className="mt-4 flex flex-col gap-3 min-[400px]:flex-row min-[400px]:items-center">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-maroon px-5 py-2.5 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
        >
          <svg viewBox="0 0 32 32" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M16.04 4C9.93 4 4.98 8.95 4.98 15.06c0 1.95.51 3.86 1.48 5.54L4.9 27.1l6.66-1.74a11 11 0 0 0 5.29 1.35h.01c6.11 0 11.06-4.95 11.06-11.06C27.92 8.95 22.97 4 16.04 4Zm0 20.27h-.01a9.2 9.2 0 0 1-4.68-1.28l-.34-.2-3.95 1.03 1.05-3.85-.22-.35a9.16 9.16 0 0 1-1.41-4.89c0-5.07 4.13-9.2 9.21-9.2 2.46 0 4.77.96 6.51 2.7a9.13 9.13 0 0 1 2.7 6.51c0 5.08-4.13 9.21-9.2 9.21Z" />
          </svg>
          {t("Share on WhatsApp with Bhojpatra", "Bhojpatra के साथ WhatsApp पर शेयर करें")}
        </a>
        <p className="flex items-start gap-2 text-xs text-ink-soft min-[400px]:border-l min-[400px]:border-cream-3 min-[400px]:pl-3">
          <svg viewBox="0 0 24 24" className="mt-px h-4 w-4 shrink-0 text-maroon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM21 19v-1a3.5 3.5 0 0 0-2.6-3.4M15.5 4.2a3 3 0 0 1 0 5.6" />
          </svg>
          {t(
            "We'll confirm your booking and contact you to complete the arrangements.",
            "हम आपकी बुकिंग की पुष्टि करेंगे और व्यवस्था पूरी करने के लिए आपसे संपर्क करेंगे।",
          )}
        </p>
      </div>
    ) : (
    <>
    <div className="mt-6 flex flex-wrap items-center gap-3">
      {/* The online (UPI) path confirms straight from its "Pay & Confirm"
          button, so this submit only shows for the pay-later Connect flow, or
          as a retry once an advance has already been recorded. */}
      {(payMethod === "Connect" || paidAmount > 0) && (
        <button
          type="submit"
          disabled={confirming || Boolean(blocker)}
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
    )}
    <SellerDetailsCard t={t} sellers={sellers} />
    </>
    )}
    </>
  );
}
