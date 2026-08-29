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
import type { SupportTicketRecord } from "@/lib/supportTickets";

export interface AlertField {
  label: string;
  value: string;
}

export interface AlertLink {
  label: string;
  url: string;
}

/** A titled sub-table rendered after the main field list (e.g. the menu). */
export interface AlertGroup {
  title: string;
  rows: AlertField[];
}

/** A file attached to the email. `content` is the base64-encoded bytes. */
export interface EmailAttachment {
  filename: string;
  content: string;
}

const DEFAULT_TO = "ankit23690@gmail.com,sohni2012@gmail.com";
const DEFAULT_FROM = "Bhojpatra <onboarding@resend.dev>";

/**
 * Owner-alert on/off switch, one flag per event. Flip any to `false` to silence
 * that alert — the underlying submission still succeeds and persists, it just
 * won't email the owners. `order` (new booking) and `payment` are the core
 * "main" events; the rest are secondary and safe to turn off.
 */
export const ALERT_ENABLED = {
  order: true, //             new booking / order        (main)
  payment: true, //           payment received           (main)
  lead: true, //              lead / callback request
  enquiry: true, //           contact-form enquiry
  supportTicket: true, //     support ticket raised from My Bookings
  vendorApplication: true, // vendor KYC application
  partner: true, //           referral partner signup
  venue: true, //             venue listing
} as const;

/** Comma-separated recipients from ALERT_EMAIL_TO, defaulting to both owners. */
function recipients(): string[] {
  return (process.env.ALERT_EMAIL_TO ?? DEFAULT_TO)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Absolute canonical origin for links in outbound transactional emails.
 *
 * Trusted resolution order (NEW-SEC-008):
 * 1. SITE_URL
 * 2. NEXT_PUBLIC_SITE_URL
 * 3. VERCEL_PROJECT_PRODUCTION_URL
 * 4. VERCEL_URL
 *
 * In non-production environments (NODE_ENV !== "production"), falls back safely
 * to http://localhost:3000 for local developer workflows.
 * In production, returns "" if no trusted canonical origin is configured, preventing
 * reliance on untrusted client Host / forwarded headers.
 */
export function siteBaseUrl(): string {
  const explicit = (
    process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL
  )?.trim();
  if (explicit) {
    let url = explicit.replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    return url;
  }

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProd) {
    const host = vercelProd.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    return `https://${host}`;
  }

  const vercelPreview = process.env.VERCEL_URL?.trim();
  if (vercelPreview) {
    const host = vercelPreview.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    return `https://${host}`;
  }

  // Safe development/testing fallback restricted strictly to localhost
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

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

/** Render fields as `<tr>` rows for a 2-column label/value table. Labels sit at
 *  the top so a value that wraps to several lines (e.g. a course's dishes) stays
 *  aligned with its heading. */
function fieldRows(fields: AlertField[]): string {
  return fields
    .map(
      (f) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#000;font-weight:bold;white-space:nowrap;vertical-align:top">${esc(
          f.label,
        )}</td><td style="padding:4px 0;color:#000">${esc(f.value)}</td></tr>`,
    )
    .join("");
}

/** Whether outbound mail is configured at all. A global fact about the
 *  deployment — it says nothing about any particular account, so callers can
 *  surface it to users without leaking whether an email is registered. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Send a formatted email via Resend. Best-effort — never throws, so callers
 * can `await` it right after persisting without risking the request.
 * Defaults to the owner alert list; pass `to` for customer confirmations.
 *
 * Returns `true` only when Resend accepted the message. Callers that merely
 * notify the owners can keep ignoring it; anything where the email *is* the
 * feature (password reset) must check it, or a misconfigured deploy fails
 * completely silently.
 */
export async function sendAlert(opts: {
  subject: string;
  heading: string;
  fields: AlertField[];
  /** Optional lead paragraph rendered between the heading and the field table. */
  intro?: string;
  link?: AlertLink | null;
  /** Override recipients (e.g. the booking customer). Defaults to ALERT_EMAIL_TO. */
  to?: string | string[];
  /** Titled sub-tables rendered after the main fields (e.g. the chosen menu). */
  groups?: AlertGroup[];
  /** Files to attach, e.g. the invoice PDF. `content` is base64-encoded bytes. */
  attachments?: EmailAttachment[];
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`Alert email skipped (RESEND_API_KEY unset): ${opts.subject}`);
    return false;
  }

  const to = opts.to
    ? (Array.isArray(opts.to) ? opts.to : [opts.to])
        .map((s) => s.trim())
        .filter(Boolean)
    : recipients();
  if (!to.length) {
    console.info(`Alert email skipped (no recipients): ${opts.subject}`);
    return false;
  }
  const from = process.env.ALERT_EMAIL_FROM ?? DEFAULT_FROM;

  const textLines = [opts.heading];
  if (opts.intro) textLines.push("", opts.intro);
  if (opts.fields.length) textLines.push("", ...opts.fields.map((f) => `${f.label}: ${f.value}`));
  for (const g of opts.groups ?? []) {
    if (g.rows.length) {
      textLines.push("", g.title, ...g.rows.map((f) => `${f.label}: ${f.value}`));
    }
  }
  if (opts.link) textLines.push("", `${opts.link.label}: ${opts.link.url}`);
  const text = textLines.join("\n");

  const rows = fieldRows(opts.fields);
  const groupsHtml = (opts.groups ?? [])
    .filter((g) => g.rows.length)
    .map(
      (g) =>
        `<h3 style="color:#B92025;font-size:15px;margin:24px 0 8px">${esc(
          g.title,
        )}</h3><table style="border-collapse:collapse;font-size:14px">${fieldRows(
          g.rows,
        )}</table>`,
    )
    .join("");
  const linkHtml = opts.link
    ? `<p style="margin:24px 0 0"><a href="${esc(
        opts.link.url,
      )}" style="display:inline-block;background:#B92025;color:#FFFFFF;text-decoration:none;padding:10px 20px;border-radius:6px">${esc(
        opts.link.label,
      )}</a></p>`
    : "";
  const introHtml = opts.intro
    ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#000000">${esc(
        opts.intro,
      )}</p>`
    : "";
  const tableHtml = opts.fields.length
    ? `<table style="border-collapse:collapse;font-size:14px">${rows}</table>`
    : "";
  const html = `<div style="font-family:'Open Sans',Arial,sans-serif;color:#000000;max-width:560px">
    <h2 style="color:#B92025;margin:0 0 16px">${esc(opts.heading)}</h2>
    ${introHtml}
    ${tableHtml}
    ${groupsHtml}
    ${linkHtml}
  </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: opts.subject,
        text,
        html,
        ...(opts.attachments?.length ? { attachments: opts.attachments } : {}),
      }),
    });
    if (!res.ok) {
      console.error(
        `Resend send failed (${res.status}): ${await res.text().catch(() => "")}`,
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend request errored", err);
    return false;
  }
}

/* ── Per-event formatters ────────────────────────────────────────────────── */
// Each builds the summary rows for one kind of submission and hands off to
// sendAlert, so the route handlers stay a single call.

function orderSummaryFields(order: StoredOrder): AlertField[] {
  return [
    { label: "Booking", value: order.id },
    { label: "Occasion", value: order.occasion },
    { label: "Date", value: order.date || "—" },
    { label: "Guests", value: String(order.guests) },
    { label: "City", value: order.city },
    ...(order.venue ? [{ label: "Venue", value: order.venue }] : []),
    { label: "Vendors", value: order.vendor || "—" },
    { label: "Total", value: inr(order.amount) },
    { label: "Paid", value: inr(order.paid) },
    { label: "Payment", value: order.paymentMethod },
    { label: "Status", value: order.status },
  ];
}

export async function sendOrderAlert(
  order: StoredOrder,
  invoiceUrl: string | null,
): Promise<void> {
  if (!ALERT_ENABLED.order) return;
  await sendAlert({
    subject: `New Bhojpatra order — ${order.id}`,
    heading: `New order ${order.id}`,
    fields: [
      { label: "Customer", value: order.customer },
      { label: "Phone", value: order.phone || "—" },
      { label: "Email", value: order.email || "—" },
      ...orderSummaryFields(order).filter((f) => f.label !== "Booking"),
      ...(order.referrerName
        ? [{ label: "Referred by", value: order.referrerName }]
        : []),
    ],
    link: invoiceUrl ? { label: "View full order & invoice", url: invoiceUrl } : null,
  });
}

/** Confirmation email to the signed-in customer after a new booking is created. */
export async function sendBookingConfirmation(
  order: StoredOrder,
  customerEmail: string,
  invoiceUrl: string | null,
): Promise<void> {
  const email = customerEmail.trim().toLowerCase();
  if (!email) return;

  const base = siteBaseUrl();
  await sendAlert({
    to: email,
    subject: `Your Bhojpatra booking is confirmed — ${order.id}`,
    heading: `Booking confirmed — ${order.id}`,
    fields: [
      { label: "Name", value: order.customer },
      ...orderSummaryFields(order).filter((f) => f.label !== "Booking"),
    ],
    link:
      invoiceUrl
        ? { label: "View invoice", url: invoiceUrl }
        : base
          ? { label: "View my bookings", url: `${base}/bookings` }
          : null,
  });
}

export async function sendPaymentAlert(payment: StoredPayment): Promise<void> {
  if (!ALERT_ENABLED.payment) return;
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
  if (!ALERT_ENABLED.lead) return;
  const isCallback = lead.source === "support-callback";
  const isVenue = lead.source === "venue-enquiry";
  // Both of these key on a `cb:` / `venue:` +phone sentinel rather than a real
  // address, so neither shows an "Email" row.
  const phoneKeyed = isCallback || isVenue;
  await sendAlert({
    subject: isCallback
      ? `Callback requested — +91 ${lead.phone}`
      : isVenue
        ? `Venue enquiry (${lead.topic || "follow-up"}) — +91 ${lead.phone}`
        : `New lead — ${lead.email || lead.phone}`,
    heading: isCallback
      ? "Callback requested (call within 10 mins)"
      : isVenue
        ? "Venue enquiry — customer wants to be contacted"
        : "New lead / enquiry",
    fields: [
      ...(phoneKeyed ? [] : [{ label: "Email", value: lead.email || "—" }]),
      { label: "Phone", value: lead.phone || "—" },
      { label: "Source", value: lead.source },
      ...(lead.topic ? [{ label: "Topic", value: lead.topic }] : []),
      ...(lead.note ? [{ label: "Details", value: lead.note }] : []),
    ],
  });
}

export async function sendEnquiryAlert(record: EnquiryRecord): Promise<void> {
  if (!ALERT_ENABLED.enquiry) return;
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

export async function sendSupportTicketAlert(
  record: SupportTicketRecord,
): Promise<void> {
  if (!ALERT_ENABLED.supportTicket) return;
  const base = siteBaseUrl();
  await sendAlert({
    subject: `Support ticket — ${record.subject} — ${record.customer}`,
    heading: `New support ticket (${record.id} · ${record.priority})`,
    fields: [
      { label: "Customer", value: record.customer },
      { label: "Email", value: record.email },
      { label: "Category", value: record.category },
      ...(record.bookingId
        ? [{ label: "Booking", value: record.bookingId }]
        : []),
      { label: "Subject", value: record.subject },
      { label: "Message", value: record.message },
    ],
    link: base ? { label: "Open Support", url: `${base}/admin/support` } : null,
  });
}

export async function sendVendorApplicationAlert(
  record: VendorApplicationRecord,
): Promise<void> {
  if (!ALERT_ENABLED.vendorApplication) return;
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
  if (!ALERT_ENABLED.partner) return;
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

/**
 * Password-reset link sent to the account holder who requested it. Best-effort
 * like every other send — a mail hiccup never breaks the reset-token write that
 * just succeeded. `resetUrl` already carries the (raw) token + email in its
 * query string; it expires in an hour on the server side.
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
): Promise<boolean> {
  const to = email.trim().toLowerCase();
  if (!to) return false;
  return sendAlert({
    to,
    subject: "Reset your Bhojpatra password",
    heading: "Reset your password",
    intro:
      "We received a request to reset the password for your Bhojpatra account. " +
      "Click the button below to choose a new one. This link expires in 1 hour. " +
      "If you didn't request this, you can safely ignore this email — your password won't change.",
    fields: [],
    link: { label: "Reset my password", url: resetUrl },
  });
}

export async function sendVenueAlert(venue: VenueRecord): Promise<void> {
  if (!ALERT_ENABLED.venue) return;
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
