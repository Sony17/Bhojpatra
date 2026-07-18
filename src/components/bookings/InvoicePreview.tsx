"use client";

import type { InvoiceData } from "@/lib/invoice";
import BrandIcon from "@/components/BrandIcon";
import { Card } from "@/components/ui";

/**
 * On-screen, branded rendering of an invoice — the visual twin of the PDF in
 * `lib/invoice.ts`. Shared by the View Details modal and the public
 * /bookings/invoice viewer so a shared link looks exactly like the download.
 * Presentational only: it takes invoice data and renders it.
 */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const money = (n: number) => inr.format(Math.round(n));

export default function InvoicePreview({ data }: { data: InvoiceData }) {
  const balance = Math.max(0, Math.round(data.grandTotal) - Math.round(data.paid));

  return (
    <Card padding="none" className="relative overflow-hidden">
      {/* Faint brand pot watermark, behind the content — twin of the PDF and of
          the site-wide mark. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/watermark-pot.png"
          alt=""
          className="h-[82%] w-auto max-w-none select-none opacity-[0.05]"
          loading="lazy"
          decoding="async"
        />
      </div>

      {/* Masthead */}
      <div className="relative z-10 overflow-hidden bg-maroon px-6 py-6 sm:px-8">
        {/* Gilt top edge + engraved double frame */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-cream" />
        <div className="pointer-events-none absolute inset-2 rounded-sm border border-cream/80" />
        <div className="pointer-events-none absolute inset-[9px] rounded-sm border border-cream/30" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BrandIcon className="h-8 w-8 bg-cream" />
              <p className="font-display text-2xl font-semibold leading-none text-cream">
                bhojpatra
              </p>
            </div>
            <p className="mt-1.5 text-[10px] uppercase tracking-[0.24em] text-white/90">
              Premium Catering &amp; Feasts
            </p>
          </div>
          <div className="text-right">
            <p className="inline-block border-b border-cream/80 pb-1 text-sm font-semibold uppercase tracking-wide text-white">
              Tax Invoice
            </p>
            <p className="mt-1.5 text-xs text-cream">Invoice No. {data.id}</p>
            <p className="text-xs text-cream">Date {data.dateLabel}</p>
          </div>
        </div>
      </div>

      {/* Ornamental divider */}
      <Ornament />

      <div className="relative z-10 space-y-7 px-6 pb-6 pt-5 sm:px-8">
        {/* Event details */}
        <Section title="Event Details">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Field label="Occasion" value={data.occasion} />
            <Field label="Package" value={data.packageName} />
            <Field label="Event Date" value={data.eventDate} />
            {data.servingTime && (
              <Field label="Serving" value={data.servingTime} />
            )}
            <Field label="Guests" value={String(data.guests)} />
            <Field label="City" value={data.city} />
            <Field label="Venue" value={data.venue} />
          </dl>
        </Section>

        {/* Bill To — customer contact captured at booking time (hidden for
            older invoices saved before contact was recorded). */}
        {(data.customerName || data.customerPhone || data.customerEmail) && (
          <Section title="Bill To">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {data.customerName && (
                <Field label="Name" value={data.customerName} />
              )}
              {data.customerPhone && (
                <Field label="Phone" value={data.customerPhone} />
              )}
              {data.customerEmail && (
                <Field label="Email" value={data.customerEmail} />
              )}
            </dl>
          </Section>
        )}

        {/* Charges */}
        <Section title="Charges">
          <div className="overflow-hidden rounded-card border border-cream-3">
            <div className="flex items-center justify-between bg-cream/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-maroon">
              <span>Description</span>
              <span>Amount</span>
            </div>
            <ul className="divide-y divide-cream-3">
              {data.lines.map((ln, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm text-ink even:bg-cream/30"
                >
                  <span className="min-w-0">{ln.label}</span>
                  <span className="shrink-0 tabular-nums">{money(ln.amount)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Totals */}
          <dl className="mt-4 ml-auto max-w-xs space-y-1.5 text-sm">
            <TotalRow label="Subtotal" value={money(data.subtotal)} />
            {data.addOnsTotal > 0 && (
              <TotalRow label="Add-ons" value={money(data.addOnsTotal)} />
            )}
            {data.discount > 0 && (
              <TotalRow
                label="Discount"
                value={`- ${money(data.discount)}`}
                accent
              />
            )}
            <TotalRow label="GST (18%)" value={money(data.gst)} />
          </dl>
        </Section>

        {/* Grand total band */}
        <div className="relative flex items-center justify-between gap-4 overflow-hidden rounded-card bg-maroon px-6 py-4">
          <div className="pointer-events-none absolute inset-1.5 rounded-[10px] border border-cream/40" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cream">
              Grand Total
            </p>
            <p className="text-[11px] text-white/85">Total amount for your event</p>
          </div>
          <p className="relative font-display text-2xl font-semibold tabular-nums text-white sm:text-3xl">
            {money(data.grandTotal)}
          </p>
        </div>

        {/* Paid / balance */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-card border border-cream-3 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-maroon">
              Amount Paid
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-ink tabular-nums">
              {money(data.paid)}
            </p>
          </div>
          {balance > 0 ? (
            <div className="rounded-card bg-maroon px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-cream">
                Balance Due
              </p>
              <p className="mt-1 font-display text-lg font-semibold text-white tabular-nums">
                {money(balance)}
              </p>
            </div>
          ) : (
            <div className="relative flex items-center justify-between rounded-card border border-cream-3 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-maroon">
                  Balance Due
                </p>
                <p className="mt-1 font-display text-lg font-semibold text-maroon">
                  Paid in full
                </p>
              </div>
              <Seal />
            </div>
          )}
        </div>

        {/* Menu selections */}
        {data.menu.length > 0 && (
          <Section title="Menu Selections">
            <ul className="space-y-3">
              {data.menu.map((g, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1 h-3 w-1 shrink-0 rounded bg-maroon"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{g.heading}</p>
                    <p className="text-sm text-ink-soft">{g.items}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {/* Footer band with the real brand logo */}
      <div className="relative z-10 border-t border-maroon/30 bg-cream/60 px-6 pb-5 pt-6 text-center sm:px-8">
        <div className="mb-3 flex items-center justify-center" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/bhojpatra-logo.png"
            alt="Bhojpatra"
            className="h-10 w-auto select-none"
            loading="lazy"
            decoding="async"
          />
        </div>
        <p className="font-display text-sm font-semibold text-maroon">
          Thank you for choosing Bhojpatra
        </p>
        <p className="mt-0.5 text-[11px] text-ink-soft">
          Premium Catering &amp; Feasts — computer-generated invoice, no signature
          required.
        </p>
      </div>
    </Card>
  );
}

/** A small maroon diamond ornament (a rotated square). */
function Diamond({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={"inline-block rotate-45 bg-maroon " + (className ?? "")}
    />
  );
}

/** Hairline rule broken by three diamonds — the divider under the masthead. */
function Ornament() {
  return (
    <div
      className="relative z-10 flex items-center justify-center gap-2 pt-6"
      aria-hidden="true"
    >
      <span className="h-px w-16 bg-maroon/50 sm:w-24" />
      <Diamond className="h-1.5 w-1.5" />
      <Diamond className="h-2 w-2" />
      <Diamond className="h-1.5 w-1.5" />
      <span className="h-px w-16 bg-maroon/50 sm:w-24" />
    </div>
  );
}

/** A tilted "B" wax-seal — stamped on the Paid-in-full card. */
function Seal() {
  return (
    <span
      aria-hidden="true"
      className="grid h-11 w-11 -rotate-12 place-items-center rounded-full border-2 border-maroon"
    >
      <span className="grid h-[30px] w-[30px] place-items-center rounded-full border border-maroon/40 font-display text-lg font-semibold leading-none text-maroon">
        B
      </span>
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <Diamond className="h-1.5 w-1.5" />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-maroon">
            {title}
          </p>
        </div>
        <span className="mt-1 block h-0.5 w-8 rounded bg-maroon" />
      </div>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-maroon">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-ink">
        {value || "—"}
      </dd>
    </div>
  );
}

function TotalRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={accent ? "text-maroon" : "text-ink-soft"}>{label}</dt>
      <dd className={"tabular-nums " + (accent ? "text-maroon" : "text-ink")}>
        {value}
      </dd>
    </div>
  );
}
