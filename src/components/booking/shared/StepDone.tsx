import Link from "next/link";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import { inr, money, perPlateCost } from "@/lib/money";
import { cities } from "@/lib/data";
import { type OccasionOption } from "@/lib/occasions";

type City = (typeof cities)[number];

/* ─── Confirmation view ───────────────────────────────────────────────────
 * The success screen both booking flows land on once the order is persisted —
 * booking id, the event at a glance, what's paid vs outstanding, and the
 * follow-up actions (invoice download, WhatsApp share, and My Bookings).
 */
export default function StepDone({
  t,
  bookingId,
  occasion,
  eventDate,
  city,
  venue,
  guests,
  grandTotal,
  paidAmount,
  paymentRef,
  referrerName,
  onDownload,
  whatsappHref,
}: {
  t: (en: string, hi: string) => string;
  bookingId: string;
  occasion: OccasionOption | undefined;
  eventDate: string;
  city: City | undefined;
  venue: string;
  guests: number;
  grandTotal: number;
  paidAmount: number;
  /** The payment reference behind `paidAmount` — the Razorpay payment id for
   *  gateway payments, or the customer's UPI UTR for the manual flow. */
  paymentRef?: string;
  referrerName: string;
  onDownload: () => void;
  whatsappHref: string;
}) {
  const total = Math.round(grandTotal);
  const balance = Math.max(0, total - paidAmount);
  const fullyPaid = paidAmount >= total;

  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-maroon text-3xl text-cream shadow-sm">
        ✓
      </div>
      <h1 className="mt-5 text-3xl text-ink sm:text-4xl">
        {t("Booking Confirmed!", "बुकिंग पक्की!")}
      </h1>
      <p className="font-script mt-3 text-xl text-ink-soft">
        {t("your feast is on its way", "आपका भोज तैयार है")}
      </p>
      <p className="mt-4 inline-block rounded-full bg-cream-2 px-5 py-2 text-sm font-semibold text-maroon">
        {t("Booking ID", "बुकिंग आईडी")}: {bookingId}
      </p>
      {referrerName && (
        <p className="mt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-maroon px-4 py-2 text-sm font-semibold text-cream">
            <span aria-hidden="true">★</span>
            {t("Referred by", "रेफ़र किया")} {referrerName}
          </span>
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-cream-3 bg-white p-5 text-left shadow-sm">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-soft">{t("Occasion", "अवसर")}</dt>
            <dd className="font-semibold text-ink">
              {occasion ? t(occasion.name, occasion.nameHi) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">{t("Date", "तारीख")}</dt>
            <dd className="font-semibold text-ink">{eventDate || "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">{t("City", "शहर")}</dt>
            <dd className="font-semibold text-ink">
              {city ? t(city.name, city.nameHi) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">{t("Venue", "वेन्यू")}</dt>
            <dd className="font-semibold text-ink">{venue || "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">{t("Guests", "मेहमान")}</dt>
            <dd className="font-semibold text-ink">{inr.format(guests)}</dd>
          </div>
          <div>
            {guests > 0 && grandTotal > 0 ? (
              <>
                <dt className="text-ink-soft">{t("Per Plate", "प्रति प्लेट")}</dt>
                <dd className="text-base font-semibold text-maroon">
                  ≈ {money(perPlateCost(grandTotal, guests))} /{" "}
                  {t("plate", "प्लेट")}
                </dd>
                <dd className="text-xs text-ink-soft">
                  {t(
                    `Grand total ${money(grandTotal)}`,
                    `कुल राशि ${money(grandTotal)}`,
                  )}
                </dd>
              </>
            ) : (
              <>
                <dt className="text-ink-soft">{t("Grand Total", "कुल राशि")}</dt>
                <dd className="font-semibold text-ink">{money(grandTotal)}</dd>
              </>
            )}
          </div>
          {paidAmount > 0 && (
            <>
              <div>
                <dt className="text-ink-soft">
                  {fullyPaid ? t("Paid", "भुगतान") : t("Advance Paid", "एडवांस भुगतान")}
                </dt>
                <dd className="font-semibold text-maroon">{money(paidAmount)}</dd>
                {paymentRef && (
                  <dd className="break-all text-xs text-ink-soft">
                    {t("Payment ref", "भुगतान रेफ़रेंस")}: {paymentRef}
                  </dd>
                )}
              </div>
              {!fullyPaid && (
                <div>
                  <dt className="text-ink-soft">{t("Balance Due", "शेष राशि")}</dt>
                  <dd className="font-semibold text-ink">{money(balance)}</dd>
                </div>
              )}
            </>
          )}
        </dl>
      </div>

      <p className="mt-4 text-sm text-ink-soft">
        {paidAmount > 0
          ? fullyPaid
            ? t(
                "Payment received in full and a confirmation has been sent via WhatsApp and email. Our team will reach out to finalise the arrangements.",
                "पूरा भुगतान प्राप्त हुआ और पुष्टि WhatsApp व ईमेल पर भेज दी गई है। व्यवस्था तय करने के लिए हमारी टीम संपर्क करेगी।",
              )
            : t(
                `Your ${money(paidAmount)} advance is received and your date is locked. A confirmation has been sent via WhatsApp and email — our team will collect the ${money(balance)} balance and finalise the arrangements.`,
                `आपका ${money(paidAmount)} एडवांस प्राप्त हुआ और आपकी तारीख पक्की है। पुष्टि WhatsApp व ईमेल पर भेज दी गई है — हमारी टीम ${money(balance)} शेष राशि लेगी और व्यवस्था तय करेगी।`,
              )
          : t(
              "A confirmation has been sent via WhatsApp and email. Our team will reach out to finalise the arrangements and payment.",
              "पुष्टि WhatsApp और ईमेल पर भेज दी गई है। व्यवस्था और भुगतान तय करने के लिए हमारी टीम संपर्क करेगी।",
            )}
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onDownload}
          className="rounded-full border border-maroon px-4 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/5 sm:px-6"
        >
          ⬇ {t("Download Menu", "मेन्यू डाउनलोड")}
        </button>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-maroon px-4 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon/90 sm:px-6"
        >
          {t("Share on WhatsApp", "WhatsApp पर शेयर करें")}
        </a>
        <Link
          href="/bookings"
          className="rounded-full border border-maroon/30 bg-cream-2 px-4 py-3 text-sm font-semibold text-maroon transition hover:bg-cream-3 sm:px-6"
        >
          {t("View My Bookings", "मेरी बुकिंग्स देखें")} →
        </Link>
      </div>

      <div className="mt-4">
        <Link
          href="/"
          className="inline-block text-xs font-semibold text-ink-soft underline-offset-2 hover:text-maroon hover:underline"
        >
          ← {t("Back to Home", "होम पेज पर जाएं")}
        </Link>
      </div>

      {/* Turn a happy booking into word-of-mouth — promote Bhojpatra to friends. */}
      <p className="mt-8 text-sm text-ink-soft">
        {t("Loved planning with us? Tell a friend.", "हमारे साथ प्लानिंग पसंद आई? किसी दोस्त को बताएं।")}
      </p>
      <div className="mt-2 flex justify-center">
        <WhatsAppShareButton
          variant="ghost"
          size="sm"
          label="Share Bhojpatra"
          labelHi="भोजपत्र शेयर करें"
          message="I just booked my celebration on Bhojpatra — verified caterers & venues, all in one place. Plan yours:"
          messageHi="मैंने अभी Bhojpatra पर अपना उत्सव बुक किया — वेरिफाइड कैटरर और वेन्यू, सब एक जगह। आप भी प्लान करें:"
        />
      </div>
    </div>
  );
}
