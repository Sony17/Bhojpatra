"use client";

import type { InvoiceData } from "@/lib/invoice";

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
    <div className="overflow-hidden rounded-2xl border border-cream-3 bg-white shadow-sm">
      {/* Masthead */}
      <div className="bg-maroon px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-2xl font-semibold leading-none text-cream">
              bhojpatra
            </p>
            <p className="mt-1.5 text-[10px] uppercase tracking-[0.22em] text-white/90">
              Premium Catering &amp; Feasts
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold uppercase tracking-wide text-white">
              Tax Invoice
            </p>
            <p className="mt-1 text-xs text-cream">Invoice No. {data.id}</p>
            <p className="text-xs text-cream">Date {data.dateLabel}</p>
          </div>
        </div>
      </div>

      <div className="space-y-7 px-6 py-6 sm:px-8">
        {/* Event details */}
        <Section title="Event Details">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Field label="Occasion" value={data.occasion} />
            <Field label="Package" value={data.packageName} />
            <Field label="Event Date" value={data.eventDate} />
            <Field label="Guests" value={String(data.guests)} />
            <Field label="City" value={data.city} />
            <Field label="Venue" value={data.venue} />
          </dl>
        </Section>

        {/* Charges */}
        <Section title="Charges">
          <div className="overflow-hidden rounded-xl border border-cream-3">
            <div className="flex items-center justify-between bg-cream/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-maroon">
              <span>Description</span>
              <span>Amount</span>
            </div>
            <ul className="divide-y divide-cream-3">
              {data.lines.map((ln, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm text-ink"
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
        <div className="flex items-center justify-between gap-4 rounded-xl bg-maroon px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cream">
              Grand Total
            </p>
            <p className="text-[11px] text-white/85">Total amount for your event</p>
          </div>
          <p className="font-display text-2xl font-semibold tabular-nums text-white sm:text-3xl">
            {money(data.grandTotal)}
          </p>
        </div>

        {/* Paid / balance */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-xl border border-cream-3 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-maroon">
              Amount Paid
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-ink tabular-nums">
              {money(data.paid)}
            </p>
          </div>
          {balance > 0 ? (
            <div className="rounded-xl bg-maroon px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-cream">
                Balance Due
              </p>
              <p className="mt-1 font-display text-lg font-semibold text-white tabular-nums">
                {money(balance)}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-cream-3 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-maroon">
                Balance Due
              </p>
              <p className="mt-1 font-display text-lg font-semibold text-maroon">
                Paid in full
              </p>
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

      {/* Footer band */}
      <div className="border-t border-cream-3 bg-cream/60 px-6 py-4 text-center sm:px-8">
        <p className="font-display text-sm font-semibold text-maroon">
          Thank you for choosing Bhojpatra
        </p>
        <p className="mt-0.5 text-[11px] text-ink-soft">
          Premium Catering &amp; Feasts — computer-generated invoice, no signature
          required.
        </p>
      </div>
    </div>
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
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-maroon">
          {title}
        </p>
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
      <dd
        className={
          "tabular-nums " + (accent ? "text-maroon" : "text-ink")
        }
      >
        {value}
      </dd>
    </div>
  );
}
