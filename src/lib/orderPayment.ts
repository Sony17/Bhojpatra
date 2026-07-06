// How a guest chooses to settle a booking. Shared between the booking wizard
// (client), the orders API (server) and the admin booking console so the
// payment methods never drift between surfaces.
//
//  • UPI / QR — pay the 10% advance online against the merchant VPA (a real NPCI
//    deep-link / QR; confirmation is customer-driven via "I've paid"). These are
//    the two sub-modes of the single online "UPI" choice shown to the customer.
//  • Connect  — "Bhojpatra connects you (COD)": nothing collected now; our team
//    reaches out to finalise the menu and arrange the most convenient payment.

export type OrderPaymentMethod = "UPI" | "QR" | "Connect";

export const ORDER_PAYMENT_METHODS: OrderPaymentMethod[] = [
  "UPI",
  "QR",
  "Connect",
];

/** UPI and QR settle the advance online at booking time; Connect is paid later. */
export function isOnlineMethod(m: OrderPaymentMethod): boolean {
  return m === "UPI" || m === "QR";
}

/** Bilingual display labels for each method. */
export const ORDER_PAYMENT_LABELS: Record<
  OrderPaymentMethod,
  { en: string; hi: string }
> = {
  UPI: { en: "UPI ID", hi: "UPI आईडी" },
  QR: { en: "Scan QR", hi: "QR स्कैन" },
  Connect: {
    en: "Bhojpatra connects you (COD)",
    hi: "भोजपत्र आपसे संपर्क करेगा (COD)",
  },
};

/** Short one-line helper text shown under each method when it's selected. */
export const ORDER_PAYMENT_HINTS: Record<
  OrderPaymentMethod,
  { en: string; hi: string }
> = {
  UPI: {
    en: "Pay now to any UPI ID",
    hi: "किसी भी UPI आईडी पर अभी भुगतान करें",
  },
  QR: {
    en: "Scan & pay with any UPI app",
    hi: "किसी भी UPI ऐप से स्कैन कर भुगतान करें",
  },
  Connect: {
    en: "Our team calls to arrange payment",
    hi: "भुगतान के लिए हमारी टीम कॉल करेगी",
  },
};

export function isOrderPaymentMethod(v: unknown): v is OrderPaymentMethod {
  return v === "UPI" || v === "QR" || v === "Connect";
}
