// Lightweight, dependency-free alert emails via Resend's REST API.
//
// Every customer-facing submission (booking, payment, lead, vendor application,
// partner signup, venue listing) sends a summary to the owners. Sending is
// best-effort and lazy in the same spirit as the Neon client (see store.ts): if
// `RESEND_API_KEY` is unset or the request fails, we log and move on so a mail
// hiccup never breaks the write that just succeeded.

import type { StoredOrder } from "@/app/api/bookings/route";
import type { StoredPayment } from "@/app/api/payments/route";
import type { Lead } from "@/app/api/leads/route";
import type { PartnerRecord } from "@/app/api/partners/route";
import type { VendorApplicationRecord } from "@/lib/vendorApplications";
import type { VenueRecord } from "@/lib/venues";
import type { EnquiryRecord } from "@/lib/enquiries";

export interface AlertField {
  label: string;
  value: string;
}

export interface AlertLink {
  label: string;
  url: string;
}

const DEFAULT_TO = "ankit23690@gmail.com,sohni2012@gmail.com";
const DEFAULT_FROM = "Bhojpatra <onboarding@resend.dev>";

/** Comma-separated recipients from ALERT_EMAIL_TO, defaulting to both owners. */
function recipients(): string[] {
  return (process.env.ALERT_EMAIL_TO ?? DEFAULT_TO)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Absolute origin for links in emails, or "" when it can't be determined. */
export function siteBaseUrl(): string {
  const explicit = process.env.SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;
  return "";
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const inr = (n: number): string => `₹${Math.round(n).toLocaleString("en-IN")}`;

/**
 * Send a formatted alert to the owners. Best-effort — never throws, so callers
 * can `await` it right after persisting without risking the request.
 */
export async function sendAlert(opts: {
  subject: string;
  heading: string;
  fields: AlertField[];
  link?: AlertLink | null;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`Alert email skipped (RESEND_API_KEY unset): ${opts.subject}`);
    return;
  }

  const to = recipients();
  const from = process.env.ALERT_EMAIL_FROM ?? DEFAULT_FROM;

  const textLines = [opts.heading, "", ...opts.fields.map((f) => `${f.label}: ${f.value}`)];
  if (opts.link) textLines.push("", `${opts.link.label}: ${opts.link.url}`);
  const text = textLines.join("\n");

  const rows = opts.fields
    .map(
      (f) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#000;font-weight:bold;white-space:nowrap">${esc(
          f.label,
        )}</td><td style="padding:4px 0;color:#000">${esc(f.value)}</td></tr>`,
    )
    .join("");
  const linkHtml = opts.link
    ? `<p style="margin:24px 0 0"><a href="${esc(
        opts.link.url,
      )}" style="display:inline-block;background:#B92025;color:#FFFFFF;text-decoration:none;padding:10px 20px;border-radius:6px">${esc(
        opts.link.label,
      )}</a></p>`
    : "";
  const html = `<div style="font-family:'Open Sans',Arial,sans-serif;color:#000000;max-width:560px">
    <h2 style="color:#B92025;margin:0 0 16px">${esc(opts.heading)}</h2>
    <table style="border-collapse:collapse;font-size:14px">${rows}</table>
    ${linkHtml}
  </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject: opts.subject, text, html }),
    });
    if (!res.ok) {
      console.error(
        `Resend send failed (${res.status}): ${await res.text().catch(() => "")}`,
      );
    }
  } catch (err) {
    console.error("Resend request errored", err);
  }
}

/* ── Per-event formatters ────────────────────────────────────────────────── */
// Each builds the summary rows for one kind of submission and hands off to
// sendAlert, so the route handlers stay a single call.

export async function sendOrderAlert(
  order: StoredOrder,
  invoiceUrl: string | null,
): Promise<void> {
  await sendAlert({
    subject: `New Bhojpatra order — ${order.id}`,
    heading: `New order ${order.id}`,
    fields: [
      { label: "Customer", value: order.customer },
      { label: "Phone", value: order.phone || "—" },
      { label: "Occasion", value: order.occasion },
      { label: "Date", value: order.date || "—" },
      { label: "Guests", value: String(order.guests) },
      { label: "City", value: order.city },
      { label: "Total", value: inr(order.amount) },
      { label: "Paid", value: inr(order.paid) },
      { label: "Payment", value: order.paymentMethod },
      { label: "Status", value: order.status },
      ...(order.referrerName
        ? [{ label: "Referred by", value: order.referrerName }]
        : []),
    ],
    link: invoiceUrl ? { label: "View full order & invoice", url: invoiceUrl } : null,
  });
}

export async function sendPaymentAlert(payment: StoredPayment): Promise<void> {
  await sendAlert({
    subject: `Payment received — ${payment.bookingId}`,
    heading: `Payment received for ${payment.bookingId}`,
    fields: [
      { label: "Booking", value: payment.bookingId },
      { label: "Customer", value: payment.customer },
      { label: "Amount", value: inr(payment.amount) },
      { label: "Method", value: payment.method },
      { label: "Type", value: payment.type },
      { label: "Txn ref", value: payment.txnRef },
    ],
  });
}

export async function sendLeadAlert(lead: Lead): Promise<void> {
  const isCallback = lead.source === "support-callback";
  await sendAlert({
    subject: isCallback
      ? `Callback requested — +91 ${lead.phone}`
      : `New lead — ${lead.email || lead.phone}`,
    heading: isCallback ? "Callback requested (call within 10 mins)" : "New lead / enquiry",
    fields: [
      // A callback's `email` is a `cb:`+phone sentinel, not a real address.
      ...(isCallback ? [] : [{ label: "Email", value: lead.email || "—" }]),
      { label: "Phone", value: lead.phone || "—" },
      { label: "Source", value: lead.source },
      ...(lead.topic ? [{ label: "Topic", value: lead.topic }] : []),
      ...(lead.note ? [{ label: "Details", value: lead.note }] : []),
    ],
  });
}

export async function sendEnquiryAlert(record: EnquiryRecord): Promise<void> {
  const base = siteBaseUrl();
  await sendAlert({
    subject: `New enquiry — ${record.subject} — ${record.name}`,
    heading: `New contact enquiry (${record.id})`,
    fields: [
      { label: "Name", value: record.name },
      { label: "Email", value: record.email },
      { label: "Phone", value: `+91 ${record.phone}` },
      { label: "Subject", value: record.subject },
      { label: "Message", value: record.message },
    ],
    link: base ? { label: "Open Enquiries", url: `${base}/admin/enquiries` } : null,
  });
}

export async function sendVendorApplicationAlert(
  record: VendorApplicationRecord,
): Promise<void> {
  await sendAlert({
    subject: `New vendor application — ${record.business}`,
    heading: `New vendor application (${record.id})`,
    fields: [
      { label: "Business", value: record.business },
      { label: "Owner", value: record.owner },
      { label: "Email", value: record.email },
      { label: "Phone", value: record.phone },
      { label: "City", value: record.city || "—" },
      { label: "Cuisines", value: record.cuisines.join(", ") || "—" },
      { label: "GST", value: record.gstNumber || "—" },
      { label: "FSSAI", value: record.fssaiNumber || "—" },
    ],
  });
}

export async function sendPartnerAlert(partner: PartnerRecord): Promise<void> {
  await sendAlert({
    subject: `New partner signup — ${partner.name}`,
    heading: `New ${partner.type} partner (${partner.code})`,
    fields: [
      { label: "Name", value: partner.name },
      { label: "Type", value: partner.type },
      { label: "Business", value: partner.businessName || "—" },
      { label: "Phone", value: partner.phone || "—" },
      { label: "Email", value: partner.email || "—" },
      { label: "City", value: partner.city || "—" },
      { label: "Code", value: partner.code },
    ],
  });
}

export async function sendVenueAlert(venue: VenueRecord): Promise<void> {
  await sendAlert({
    subject: `New venue listed — ${venue.name}`,
    heading: `New venue published (${venue.id})`,
    fields: [
      { label: "Venue", value: venue.name },
      { label: "City", value: venue.city },
      { label: "Type", value: venue.type },
      { label: "From", value: venue.priceFrom },
      { label: "Owner", value: venue.ownerName || "—" },
      { label: "Owner code", value: venue.ownerCode },
      { label: "Phone", value: venue.phone || "—" },
    ],
  });
}
