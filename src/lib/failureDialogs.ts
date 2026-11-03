import type { ErrorDialogSpec } from "@/components/ui/ErrorDialog";
import type { RazorpayCheckoutError } from "@/lib/razorpayCheckout";
import { money } from "@/lib/money";
import { WHATSAPP_NUMBER } from "@/lib/referral";

/**
 * Builds the bilingual content of the shared ErrorDialog for each critical
 * customer failure. Pure data — no React — so every surface (the wizards'
 * handlers, PaymentBox, LoginGate, StepDone) words the same failure the same
 * way, and the guarantees ("you haven't been charged", "your payment is safe")
 * are stated in exactly one place, only where the code can back them up:
 *
 *  • "Not charged" is only said when the failure happens BEFORE money can move
 *    (order creation, the payment window never opening, a pay-later order).
 *  • "Payment is safe" is only said once the payment is recorded server-side
 *    (paidAmount > 0) or the gateway's own callback fired and only our confirm
 *    call was lost (the webhook records it).
 *
 * The server's own English sentence is kept as `detail` when it is more
 * specific than our generic title/body — those are the only English-only bits.
 */
type T = (en: string, hi: string) => string;

/** What we know about a failed API call. */
export type FailureInfo = {
  /** No HTTP answer at all (offline, DNS, dropped connection). */
  network?: boolean;
  status?: number;
  /** The server's machine code, e.g. SLOT_TAKEN. */
  code?: string;
  /** The server's human sentence. */
  message?: string;
};

export const networkFailure: FailureInfo = { network: true };

/** A WhatsApp chat with the Bhojpatra team, pre-filled with what went wrong. */
export function supportHref(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

const isServerSide = (i: FailureInfo) => (i.status ?? 0) >= 500;
const isSession = (i: FailureInfo) => i.status === 401;

/* ─── Placing / confirming the booking (POST /api/bookings) ─────────────── */

export type BookingFailureArgs = {
  t: T;
  info: FailureInfo;
  bookingId: string;
  /** "pay" — checkout was about to open; "place" — pay-later submit / retry. */
  intent: "pay" | "place";
  /** A payment already recorded on this order (paidAmount > 0). */
  paid?: { amount: number; ref: string } | null;
  retry?: () => void;
  /** Jump the guest to the brief field that fixes the problem. */
  editField?: (field: "date" | "guests") => void;
  /** Reload prices / roster. */
  reload?: () => void;
  /** Abandon this order id and begin a fresh booking. */
  startNew?: () => void;
  /** Re-check the session so the wizard falls back to the log-in screen. */
  relogin?: () => void;
  /** Where to pick a different stall. */
  brandsHref?: string;
};

export function bookingFailureSpec(a: BookingFailureArgs): ErrorDialogSpec {
  const { t, info, bookingId, intent, paid } = a;
  const support = (extra = "") =>
    supportHref(
      `Hi Bhojpatra, I need help with booking ${bookingId}.${extra}`,
    );
  const contact = {
    label: t("Contact support", "सहायता से संपर्क करें"),
    href: support(paid ? ` My payment of ${money(paid.amount)} (ref ${paid.ref}) went through but the booking didn't save.` : ""),
    newTab: true,
    variant: "secondary" as const,
  };
  const reference = { label: t("Booking ID", "बुकिंग आईडी"), value: bookingId };

  // Money already moved — whatever failed, say the payment is safe first.
  if (paid) {
    return {
      title: t("Your payment is safe — we couldn't save the booking", "आपका भुगतान सुरक्षित है — बुकिंग सेव नहीं हो सकी"),
      message: t(
        "Your payment reached us, but saving your booking details didn't go through. Please don't pay again.",
        "आपका भुगतान हमें मिल गया है, लेकिन बुकिंग की जानकारी सेव नहीं हो पाई। कृपया दोबारा भुगतान न करें।",
      ),
      detail: info.message,
      reassurance: t(
        `${money(paid.amount)} is recorded against ${bookingId} (payment ref ${paid.ref}). Tap Try again, or message us and we'll finish it for you.`,
        `${money(paid.amount)} ${bookingId} के नाम दर्ज है (भुगतान रेफ़रेंस ${paid.ref})। फिर कोशिश करें दबाएँ, या हमें संदेश करें — हम इसे पूरा कर देंगे।`,
      ),
      reference: { label: t("Payment ref", "भुगतान रेफ़रेंस"), value: paid.ref },
      actions: [
        ...(a.retry ? [{ label: t("Try again", "फिर कोशिश करें"), onClick: a.retry }] : []),
        contact,
      ],
    };
  }

  const notCharged =
    intent === "pay"
      ? t("You haven't been charged — payment hasn't started.", "आपसे कोई राशि नहीं ली गई — भुगतान शुरू नहीं हुआ।")
      : t("No payment was taken.", "कोई भुगतान नहीं लिया गया।");
  const retryAction = a.retry
    ? { label: t("Try again", "फिर कोशिश करें"), onClick: a.retry }
    : { label: t("OK, I'll try again", "ठीक है, फिर कोशिश करूँगा") };

  if (info.network) {
    return {
      title: t("Can't reach Bhojpatra", "भोजपत्र से कनेक्ट नहीं हो पा रहा"),
      message: t(
        "Your internet connection seems to have dropped, so we couldn't confirm your booking. Your selections are still on this page — check your connection and try again. Trying again never creates a duplicate booking.",
        "आपका इंटरनेट कनेक्शन टूटता लग रहा है, इसलिए हम आपकी बुकिंग की पुष्टि नहीं कर सके। आपकी चुनी हुई चीज़ें इसी पेज पर हैं — कनेक्शन जाँचकर फिर कोशिश करें। दोबारा कोशिश करने से दोहरी बुकिंग नहीं बनती।",
      ),
      reassurance: notCharged,
      reference,
      actions: [retryAction, contact],
    };
  }

  if (isSession(info)) {
    return {
      title: t("Your session has expired", "आपका सेशन समाप्त हो गया"),
      message: t(
        "For your security you were signed out. Log in again to carry on — everything you've picked on this page is kept.",
        "आपकी सुरक्षा के लिए आपको साइन आउट कर दिया गया। जारी रखने के लिए फिर से लॉग इन करें — इस पेज पर चुनी गई सारी चीज़ें सुरक्षित हैं।",
      ),
      reassurance: notCharged,
      actions: [
        {
          label: t("Log in again", "फिर से लॉग इन करें"),
          onClick: a.relogin,
        },
      ],
    };
  }

  switch (info.code) {
    case "SLOT_TAKEN":
      return {
        title: t("That date isn't available", "यह तारीख़ उपलब्ध नहीं है"),
        message: t(
          "This stall can no longer take your order on the date and meal you picked — someone may have just booked it, or the vendor is closed that day. Pick another date or another stall.",
          "यह स्टॉल आपकी चुनी तारीख़ और भोजन के लिए अब ऑर्डर नहीं ले सकता — शायद किसी ने अभी बुक कर लिया, या वेंडर उस दिन बंद है। कोई और तारीख़ या दूसरा स्टॉल चुनें।",
        ),
        detail: info.message,
        reassurance: notCharged,
        actions: [
          ...(a.editField
            ? [{ label: t("Change date", "तारीख़ बदलें"), onClick: () => a.editField?.("date") }]
            : []),
          ...(a.brandsHref
            ? [{ label: t("Choose another stall", "दूसरा स्टॉल चुनें"), href: a.brandsHref, variant: "secondary" as const }]
            : []),
        ],
      };
    case "LEAD_TIME":
      return {
        title: t("Please pick a later date", "कृपया बाद की तारीख़ चुनें"),
        message: t(
          "This stall needs more notice than your event date allows. Move the date further out and try again.",
          "इस स्टॉल को आपकी इवेंट तारीख़ से ज़्यादा पहले सूचना चाहिए। तारीख़ आगे बढ़ाकर फिर कोशिश करें।",
        ),
        detail: info.message,
        reassurance: notCharged,
        actions: [
          ...(a.editField
            ? [{ label: t("Change date", "तारीख़ बदलें"), onClick: () => a.editField?.("date") }]
            : [{ label: t("OK", "ठीक है") }]),
        ],
      };
    case "MIN_GUESTS":
      return {
        title: t("This stall needs more guests", "इस स्टॉल के लिए और मेहमान चाहिए"),
        message: t(
          "This stall takes orders of a minimum number of guests. Raise your guest count and try again.",
          "इस स्टॉल का मेहमानों की न्यूनतम संख्या का नियम है। मेहमान बढ़ाकर फिर कोशिश करें।",
        ),
        detail: info.message,
        reassurance: notCharged,
        actions: [
          ...(a.editField
            ? [{ label: t("Change guests", "मेहमान बदलें"), onClick: () => a.editField?.("guests") }]
            : [{ label: t("OK", "ठीक है") }]),
        ],
      };
    case "PRICE_CHANGED":
      return {
        title: t("The price has changed", "कीमत बदल गई है"),
        message: t(
          "This stall's prices changed after you built your order. Reload to see the latest total, then review it before confirming.",
          "आपका ऑर्डर बनाने के बाद इस स्टॉल की कीमतें बदल गईं। नया कुल देखने के लिए रीलोड करें, फिर पुष्टि से पहले जाँच लें।",
        ),
        reassurance: notCharged,
        actions: [
          {
            label: t("Reload latest prices", "नई कीमतें रीलोड करें"),
            onClick: a.reload,
          },
        ],
      };
    case "COUPON_INVALID":
      return {
        title: t("Your coupon couldn't be applied", "आपका कूपन लागू नहीं हो सका"),
        message: t(
          "That coupon isn't valid for this order any more, so we've taken it off. Your total now shows the price without it.",
          "यह कूपन अब इस ऑर्डर के लिए मान्य नहीं है, इसलिए हमने इसे हटा दिया है। आपका कुल अब बिना कूपन की कीमत दिखा रहा है।",
        ),
        detail: info.message,
        reassurance: notCharged,
        actions: [{ label: t("Review my total", "मेरा कुल देखें") }],
      };
    case "BOOKING_CLOSED":
    case "BOOKING_LOCKED":
      return {
        title: t("This booking can't be changed", "इस बुकिंग में बदलाव नहीं हो सकता"),
        message: t(
          "This booking is already closed or has a payment against it, so it can't be edited here. You can see it in My Bookings, or start a new booking.",
          "यह बुकिंग बंद हो चुकी है या इस पर भुगतान हो चुका है, इसलिए यहाँ बदली नहीं जा सकती। इसे मेरी बुकिंग में देखें, या नई बुकिंग शुरू करें।",
        ),
        detail: info.message,
        reference,
        actions: [
          { label: t("View my bookings", "मेरी बुकिंग देखें"), href: "/bookings" },
          ...(a.startNew
            ? [{ label: t("Start a new booking", "नई बुकिंग शुरू करें"), onClick: a.startNew, variant: "secondary" as const }]
            : []),
          contact,
        ],
      };
  }

  if (isServerSide(info)) {
    return {
      title: t("Something went wrong on our side", "हमारी तरफ़ से कुछ गड़बड़ हो गई"),
      message: t(
        "We couldn't place your booking just now — it's us, not you. Wait a moment and try again; if it keeps happening, message us.",
        "हम अभी आपकी बुकिंग नहीं कर पाए — यह हमारी तरफ़ की दिक्कत है, आपकी नहीं। थोड़ा रुककर फिर कोशिश करें; बार-बार हो तो हमें संदेश करें।",
      ),
      reassurance: notCharged,
      reference,
      actions: [retryAction, contact],
    };
  }

  // Other 4xx — something in the order itself needs fixing.
  return {
    title: t("We couldn't place your booking", "हम आपकी बुकिंग नहीं कर सके"),
    message: t(
      "Something in your order needs a quick look. Check the details below and try again.",
      "आपके ऑर्डर में कुछ जाँचने लायक है। नीचे दी गई जानकारी देखकर फिर कोशिश करें।",
    ),
    detail: info.message,
    reassurance: notCharged,
    reference,
    actions: [retryAction, contact],
  };
}

/* ─── Razorpay checkout (PaymentBox) ────────────────────────────────────── */

export type PaymentFailureArgs = {
  t: T;
  err: RazorpayCheckoutError;
  bookingId: string;
  retry?: () => void;
  /** Switch to "Bhojpatra connects you" (book now, pay later). */
  payLater?: () => void;
  relogin?: () => void;
};

export function paymentFailureSpec(a: PaymentFailureArgs): ErrorDialogSpec {
  const { t, err, bookingId } = a;
  const info = err.info ?? {};
  const contactHref = (extra = "") =>
    supportHref(`Hi Bhojpatra, I need help with the payment for booking ${bookingId}.${extra}`);
  const contact = (extra = "", primary = false) => ({
    label: t("Contact support", "सहायता से संपर्क करें"),
    href: contactHref(extra),
    newTab: true,
    variant: (primary ? "primary" : "secondary") as "primary" | "secondary",
  });
  const retry = a.retry
    ? { label: t("Try again", "फिर कोशिश करें"), onClick: a.retry }
    : null;
  const payLater = a.payLater
    ? {
        label: t("Pay later — let our team call me", "बाद में भुगतान — हमारी टीम कॉल करे"),
        onClick: a.payLater,
        variant: "secondary" as const,
      }
    : null;
  const reference = { label: t("Booking ID", "बुकिंग आईडी"), value: bookingId };
  const notCharged = t(
    "You haven't been charged — the payment window never opened.",
    "आपसे कोई राशि नहीं ली गई — भुगतान विंडो खुली ही नहीं।",
  );

  // Paid, but our confirm call failed or was refused.
  if (err.code === "verify") {
    const payRef = info.paymentId;
    const recoverable = info.network || (info.status ?? 0) >= 500;
    return {
      title: t("Payment received — confirmation pending", "भुगतान मिल गया — पुष्टि बाकी है"),
      message: t(
        "Your payment went through, but we couldn't confirm it on this screen. Please don't pay again.",
        "आपका भुगतान हो गया, लेकिन हम इस स्क्रीन पर उसकी पुष्टि नहीं कर सके। कृपया दोबारा भुगतान न करें।",
      ),
      reassurance: recoverable
        ? t(
            "Your payment is safe and will be recorded automatically in a few minutes. If your booking hasn't confirmed by then, message us with the references below.",
            "आपका भुगतान सुरक्षित है और कुछ मिनटों में अपने आप दर्ज हो जाएगा। तब तक बुकिंग कन्फर्म न हो तो नीचे दिए रेफ़रेंस के साथ हमें संदेश करें।",
          )
        : t(
            "We couldn't match it automatically, so our team will check it by hand. Message us with the references below and we'll sort it out.",
            "हम इसे अपने आप नहीं मिला सके, इसलिए हमारी टीम इसे हाथ से जाँचेगी। नीचे दिए रेफ़रेंस के साथ हमें संदेश करें, हम इसे सुलझा देंगे।",
          ),
      reference: payRef
        ? { label: t("Payment ref", "भुगतान रेफ़रेंस"), value: payRef }
        : reference,
      actions: [
        contact(payRef ? ` Payment ref: ${payRef}.` : "", true),
        { label: t("View my bookings", "मेरी बुकिंग देखें"), href: "/bookings", variant: "secondary" },
      ],
    };
  }

  // The payment window couldn't even load.
  if (err.code === "unavailable") {
    return {
      title: t("Couldn't open the payment window", "भुगतान विंडो नहीं खुल सकी"),
      message: t(
        "The secure payment window didn't load. Check your internet connection, switch off any ad-blocker or VPN for this site, and try again.",
        "सुरक्षित भुगतान विंडो लोड नहीं हुई। अपना इंटरनेट जाँचें, इस साइट के लिए ऐड-ब्लॉकर या VPN बंद करें और फिर कोशिश करें।",
      ),
      reassurance: notCharged,
      reference,
      actions: [...(retry ? [retry] : []), ...(payLater ? [payLater] : []), contact()],
    };
  }

  // A failure while creating the order — gateway never opened.
  if (info.stage === "order") {
    if (info.network) {
      return {
        title: t("Can't reach Bhojpatra", "भोजपत्र से कनेक्ट नहीं हो पा रहा"),
        message: t(
          "Your connection dropped before the payment could start. Check it and try again.",
          "भुगतान शुरू होने से पहले आपका कनेक्शन टूट गया। इसे जाँचकर फिर कोशिश करें।",
        ),
        reassurance: notCharged,
        reference,
        actions: [...(retry ? [retry] : []), ...(payLater ? [payLater] : []), contact()],
      };
    }
    if (isSession(info)) {
      return {
        title: t("Your session has expired", "आपका सेशन समाप्त हो गया"),
        message: t(
          "Log in again to pay — everything you've picked on this page is kept.",
          "भुगतान के लिए फिर से लॉग इन करें — इस पेज पर चुनी गई सारी चीज़ें सुरक्षित हैं।",
        ),
        reassurance: notCharged,
        actions: [{ label: t("Log in again", "फिर से लॉग इन करें"), onClick: a.relogin }],
      };
    }
    if (info.status === 503) {
      return {
        title: t("Online payment is unavailable right now", "ऑनलाइन भुगतान अभी उपलब्ध नहीं है"),
        message: t(
          "Card / UPI payment is temporarily switched off. You can still book now and let our team arrange the advance with you.",
          "कार्ड / UPI भुगतान अभी अस्थायी रूप से बंद है। आप अभी बुक कर सकते हैं और एडवांस की व्यवस्था हमारी टीम आपके साथ करेगी।",
        ),
        reassurance: notCharged,
        reference,
        actions: [...(payLater ? [{ ...payLater, variant: "primary" as const }] : []), ...(retry ? [{ ...retry, variant: "secondary" as const }] : []), contact()],
      };
    }
    if (info.status === 409 || info.status === 400) {
      return {
        title: t("This booking can't be paid for right now", "इस बुकिंग का भुगतान अभी नहीं हो सकता"),
        message: t(
          "The payment couldn't start for this booking. Details are below — if it isn't clear, message us.",
          "इस बुकिंग के लिए भुगतान शुरू नहीं हो सका। विवरण नीचे है — स्पष्ट न हो तो हमें संदेश करें।",
        ),
        detail: err.message,
        reassurance: notCharged,
        reference,
        actions: [contact("", true), ...(payLater ? [payLater] : [])],
      };
    }
    return {
      title: t("Couldn't start the payment", "भुगतान शुरू नहीं हो सका"),
      message: t(
        "Something went wrong on our side before the payment started. Wait a moment and try again.",
        "भुगतान शुरू होने से पहले हमारी तरफ़ कुछ गड़बड़ हो गई। थोड़ा रुककर फिर कोशिश करें।",
      ),
      reassurance: notCharged,
      reference,
      actions: [...(retry ? [retry] : []), ...(payLater ? [payLater] : []), contact()],
    };
  }

  // A payment attempt failed inside the gateway window and it was closed.
  return {
    title: t("The payment didn't go through", "भुगतान पूरा नहीं हुआ"),
    message: t(
      "Your bank or the payment app declined the attempt. You can try again, use a different method, or pay later.",
      "आपके बैंक या पेमेंट ऐप ने यह कोशिश स्वीकार नहीं की। आप फिर कोशिश कर सकते हैं, दूसरा तरीका चुन सकते हैं, या बाद में भुगतान कर सकते हैं।",
    ),
    detail: err.message,
    reassurance: t(
      "No payment has been recorded on Bhojpatra. If your bank shows a deduction, it is normally reversed automatically within 5–7 working days — message us if it isn't.",
      "भोजपत्र पर कोई भुगतान दर्ज नहीं हुआ है। अगर आपके बैंक में राशि कटी दिखे तो वह आमतौर पर 5–7 कार्यदिवस में अपने आप लौट आती है — न लौटे तो हमें संदेश करें।",
    ),
    reference,
    actions: [...(retry ? [retry] : []), ...(payLater ? [payLater] : []), contact()],
  };
}

/* ─── Manual UPI / UTR submit (PaymentBox) ──────────────────────────────── */

export function upiRecordFailureSpec(a: {
  t: T;
  info: FailureInfo;
  bookingId: string;
  txnId: string;
  retry?: () => void;
  relogin?: () => void;
}): ErrorDialogSpec {
  const { t, info, bookingId, txnId } = a;
  const contact = {
    label: t("Contact support", "सहायता से संपर्क करें"),
    href: supportHref(
      `Hi Bhojpatra, I paid by UPI for booking ${bookingId} (transaction ID ${txnId}) but it didn't save on the website.`,
    ),
    newTab: true,
    variant: "secondary" as const,
  };
  const reference = { label: t("UPI transaction ID", "UPI लेनदेन आईडी"), value: txnId };
  const dontPayAgain = t(
    "If you've already sent the money, please don't pay again. Saving the same transaction ID twice never double-counts it.",
    "अगर आपने पैसे भेज दिए हैं तो कृपया दोबारा न भेजें। वही लेनदेन आईडी दोबारा सेव करने से दोहरी गिनती नहीं होती।",
  );
  const retry = a.retry
    ? { label: t("Try again", "फिर कोशिश करें"), onClick: a.retry }
    : { label: t("OK", "ठीक है") };

  if (isSession(info)) {
    return {
      title: t("Your session has expired", "आपका सेशन समाप्त हो गया"),
      message: t(
        "Log in again, then submit your transaction ID — it's kept on this screen.",
        "फिर से लॉग इन करें, फिर अपनी लेनदेन आईडी जमा करें — वह इसी स्क्रीन पर सुरक्षित है।",
      ),
      reassurance: dontPayAgain,
      reference,
      actions: [{ label: t("Log in again", "फिर से लॉग इन करें"), onClick: a.relogin }],
    };
  }
  if (info.status === 409) {
    return {
      title: t("We couldn't attach this payment to the booking", "हम यह भुगतान बुकिंग से नहीं जोड़ सके"),
      message: t(
        "The reason is below. Check the transaction ID in your UPI app's payment history, or message us and we'll match it by hand.",
        "कारण नीचे दिया है। अपने UPI ऐप की भुगतान हिस्ट्री में लेनदेन आईडी जाँचें, या हमें संदेश करें — हम हाथ से मिला देंगे।",
      ),
      detail: info.message,
      reference,
      actions: [{ label: t("Check the ID", "आईडी जाँचें") }, contact],
    };
  }
  if (info.network || isServerSide(info)) {
    return {
      title: t("Couldn't save your UPI payment details", "आपके UPI भुगतान की जानकारी सेव नहीं हो सकी"),
      message: info.network
        ? t(
            "Your connection dropped while we were saving your transaction ID. Check it and try again.",
            "आपकी लेनदेन आईडी सेव करते समय कनेक्शन टूट गया। इसे जाँचकर फिर कोशिश करें।",
          )
        : t(
            "Something went wrong on our side while saving your transaction ID. Wait a moment and try again.",
            "आपकी लेनदेन आईडी सेव करते समय हमारी तरफ़ कुछ गड़बड़ हो गई। थोड़ा रुककर फिर कोशिश करें।",
          ),
      reassurance: dontPayAgain,
      reference,
      actions: [retry, contact],
    };
  }
  return {
    title: t("We couldn't record your payment", "हम आपका भुगतान दर्ज नहीं कर सके"),
    message: t(
      "Your payment details were refused. See below, then try again or message us.",
      "आपके भुगतान की जानकारी स्वीकार नहीं हुई। नीचे देखें, फिर कोशिश करें या हमें संदेश करें।",
    ),
    detail: info.message,
    reassurance: dontPayAgain,
    reference,
    actions: [retry, contact],
  };
}

/* ─── Sign-in / sign-up ─────────────────────────────────────────────────── */

export function authFailureSpec(a: {
  t: T;
  info: FailureInfo;
  mode: "login" | "signup";
  retry?: () => void;
  loginHref?: string;
}): ErrorDialogSpec {
  const { t, info, mode } = a;
  const retry = a.retry
    ? { label: t("Try again", "फिर कोशिश करें"), onClick: a.retry }
    : { label: t("OK", "ठीक है") };
  const contact = {
    label: t("Contact support", "सहायता से संपर्क करें"),
    href: supportHref("Hi Bhojpatra, I can't sign in / create my account on the website."),
    newTab: true,
    variant: "secondary" as const,
  };
  if (info.status === 409 && mode === "signup") {
    return {
      title: t("You already have an account", "आपका अकाउंट पहले से है"),
      message: t(
        "This email is already registered. Log in with it instead — or use a different email to create a new account.",
        "यह ईमेल पहले से रजिस्टर है। इसके बजाय इसी से लॉग इन करें — या नया अकाउंट बनाने के लिए दूसरा ईमेल इस्तेमाल करें।",
      ),
      detail: info.message,
      actions: [
        { label: t("Go to log in", "लॉग इन पर जाएँ"), href: a.loginHref ?? "/login" },
        { label: t("Use a different email", "दूसरा ईमेल इस्तेमाल करें"), variant: "secondary" },
      ],
    };
  }
  return {
    title:
      mode === "login"
        ? t("Couldn't sign you in", "साइन इन नहीं हो सका")
        : t("Couldn't create your account", "आपका अकाउंट नहीं बन सका"),
    message: info.network
      ? t(
          "We couldn't reach Bhojpatra — check your internet connection and try again. Your details stay filled in on this page.",
          "हम भोजपत्र तक नहीं पहुँच सके — अपना इंटरनेट जाँचें और फिर कोशिश करें। आपकी भरी हुई जानकारी इसी पेज पर रहेगी।",
        )
      : t(
          "Something went wrong on our side. Wait a moment and try again; if it keeps happening, message us.",
          "हमारी तरफ़ कुछ गड़बड़ हो गई। थोड़ा रुककर फिर कोशिश करें; बार-बार हो तो हमें संदेश करें।",
        ),
    actions: [retry, contact],
  };
}

/* ─── Data that failed to load ──────────────────────────────────────────── */

export function menuLoadFailureSpec(a: { t: T; retry: () => void }): ErrorDialogSpec {
  const { t } = a;
  return {
    title: t("Couldn't load the latest stall menus", "ताज़ा स्टॉल मेन्यू लोड नहीं हो सके"),
    message: t(
      "We're showing the last saved list, so some stalls, dishes or prices may be out of date. Try again to get the latest before you book.",
      "हम आख़िरी सेव की गई सूची दिखा रहे हैं, इसलिए कुछ स्टॉल, डिश या कीमतें पुरानी हो सकती हैं। बुक करने से पहले ताज़ा सूची पाने के लिए फिर कोशिश करें।",
    ),
    tone: "notice",
    actions: [
      { label: t("Try again", "फिर कोशिश करें"), onClick: a.retry },
      { label: t("Continue with saved list", "सेव की गई सूची के साथ जारी रखें"), variant: "secondary" },
    ],
  };
}

export function paymentSettingsFailureSpec(a: {
  t: T;
  retry: () => void;
  payLater?: () => void;
}): ErrorDialogSpec {
  const { t } = a;
  return {
    title: t("Couldn't load payment options", "भुगतान विकल्प लोड नहीं हो सके"),
    message: t(
      "We couldn't fetch our latest payment details, so online payment is paused to make sure your money goes to the right place. Try again, or book now and let our team arrange the advance.",
      "हम अपनी ताज़ा भुगतान जानकारी नहीं ला सके, इसलिए आपका पैसा सही जगह पहुँचे यह पक्का करने के लिए ऑनलाइन भुगतान रोका गया है। फिर कोशिश करें, या अभी बुक करें और एडवांस की व्यवस्था हमारी टीम करेगी।",
    ),
    reassurance: t("You haven't been charged.", "आपसे कोई राशि नहीं ली गई।"),
    actions: [
      { label: t("Try again", "फिर कोशिश करें"), onClick: a.retry },
      ...(a.payLater
        ? [{ label: t("Pay later — let our team call me", "बाद में भुगतान — हमारी टीम कॉल करे"), onClick: a.payLater, variant: "secondary" as const }]
        : []),
    ],
  };
}

/** The post-payment status read failed — the payment itself is recorded. */
export function statusCheckFailureSpec(a: {
  t: T;
  bookingId: string;
  paid: number;
  ref: string;
  verified: boolean;
}): ErrorDialogSpec {
  const { t, bookingId, paid, ref, verified } = a;
  return {
    title: t("Booking saved — status will update shortly", "बुकिंग सेव हो गई — स्टेटस जल्द अपडेट होगा"),
    message: t(
      "We couldn't refresh your booking's latest status just now, so it shows as received. Check My Bookings in a few minutes.",
      "हम अभी आपकी बुकिंग का ताज़ा स्टेटस नहीं ला सके, इसलिए वह 'प्राप्त' दिख रही है। कुछ मिनट बाद मेरी बुकिंग देखें।",
    ),
    reassurance: verified
      ? t(
          `Your ${money(paid)} payment is safe and recorded (ref ${ref}).`,
          `आपका ${money(paid)} का भुगतान सुरक्षित और दर्ज है (रेफ़रेंस ${ref})।`,
        )
      : t(
          "Your UPI transaction ID is saved and our team will match it with the bank.",
          "आपकी UPI लेनदेन आईडी सेव है और हमारी टीम उसे बैंक से मिलाएगी।",
        ),
    reference: { label: t("Booking ID", "बुकिंग आईडी"), value: bookingId },
    tone: "notice",
    actions: [
      { label: t("View my bookings", "मेरी बुकिंग देखें"), href: "/bookings" },
      {
        label: t("Contact support", "सहायता से संपर्क करें"),
        href: supportHref(`Hi Bhojpatra, please confirm the status of booking ${bookingId} (payment ref ${ref}).`),
        newTab: true,
        variant: "secondary",
      },
    ],
  };
}

/** The invoice / menu PDF couldn't be generated. */
export function downloadFailureSpec(a: {
  t: T;
  bookingId: string;
  retry: () => void;
}): ErrorDialogSpec {
  const { t, bookingId } = a;
  return {
    title: t("Couldn't create your PDF", "आपकी PDF नहीं बन सकी"),
    message: t(
      "The download didn't work this time. Your booking itself is safe — try again, or find it any time in My Bookings.",
      "इस बार डाउनलोड नहीं हो पाया। आपकी बुकिंग सुरक्षित है — फिर कोशिश करें, या कभी भी मेरी बुकिंग में देखें।",
    ),
    reference: { label: t("Booking ID", "बुकिंग आईडी"), value: bookingId },
    tone: "notice",
    actions: [
      { label: t("Try again", "फिर कोशिश करें"), onClick: a.retry },
      { label: t("View my bookings", "मेरी बुकिंग देखें"), href: "/bookings", variant: "secondary" },
    ],
  };
}
