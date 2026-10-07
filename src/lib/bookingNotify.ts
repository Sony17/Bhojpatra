// Booking notifications — who hears about an order, and when.
//
// An order is announced ONCE, at the moment it becomes real: placed as a
// pay-later (Connect) order, or the first time money (or a manual transfer
// claim) lands against a checkout. A checkout that's merely been opened
// (`awaitingPayment`) tells nobody — the customer may still walk away. The
// customer hears again when the order flips Pending → Confirmed.
//
// Email delivery is best-effort (a mail outage must never fail a booking or a
// payment), but every miss is logged with console.error so it shows up in the
// server logs — `sendAlert` itself logs the provider status on a rejected send.

import type { StoredOrder } from "@/app/api/bookings/route";
import {
  sendBookingConfirmation,
  sendOrderAlert,
  sendVendorNewOrderEmail,
  siteBaseUrl,
} from "@/lib/email";
import { encodeInvoice } from "@/lib/invoice";
import { findVendorById } from "@/lib/vendorMenus";

/** Public invoice link for the order, built from the stored invoice (with the
 *  live paid figure) on our own origin — never a client-supplied URL. */
export function invoiceUrlFor(order: StoredOrder): string | null {
  const base = siteBaseUrl();
  if (!base || !order.invoice) return null;
  try {
    const token = encodeInvoice({ ...order.invoice, paid: order.paid });
    return token.length <= 8192 ? `${base}/bookings/invoice?d=${token}` : null;
  } catch {
    return null;
  }
}

function logMiss(what: string, orderId: string, ok: boolean) {
  if (!ok) console.error(`[email] ${what} for ${orderId} was not delivered`);
}

/** The order is now real: alert the owners, acknowledge the customer (in
 *  wording that matches its status) and tell each booked vendor. */
export async function notifyOrderPlaced(
  order: StoredOrder,
  customerEmail?: string,
): Promise<void> {
  const invoiceUrl = invoiceUrlFor(order);
  const to = (customerEmail || order.email || "").trim();
  try {
    await Promise.all([
      sendOrderAlert(order, invoiceUrl),
      to
        ? sendBookingConfirmation(order, to, invoiceUrl).then((ok) =>
            logMiss("customer booking email", order.id, ok),
          )
        : Promise.resolve(),
      ...(order.vendors ?? []).map(async (v) => {
        const vendor = v?.id ? await findVendorById(v.id) : null;
        if (!vendor?.ownerEmail) return;
        const ok = await sendVendorNewOrderEmail(
          order,
          vendor.ownerEmail,
          vendor.business,
        );
        logMiss(`vendor new-order email (${vendor.id})`, order.id, ok);
      }),
    ]);
  } catch (err) {
    console.error(`[email] booking notifications failed for ${order.id}`, err);
  }
}

/** Pending → Confirmed: the customer gets the real confirmation. */
export async function notifyOrderConfirmed(order: StoredOrder): Promise<void> {
  const to = (order.email || "").trim();
  if (!to) return;
  try {
    const ok = await sendBookingConfirmation(order, to, invoiceUrlFor(order));
    logMiss("customer confirmation email", order.id, ok);
  } catch (err) {
    console.error(`[email] confirmation failed for ${order.id}`, err);
  }
}
