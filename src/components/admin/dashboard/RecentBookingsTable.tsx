import Link from "next/link";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { money } from "@/components/admin/shared/money";
import { ArrowRight } from "@/components/admin/shared/icons";
import type { AdminBookingRow } from "@/lib/admin/types";

/**
 * Recent bookings table. Pure presentation — receives typed rows. Responsive:
 * a 12-column grid on sm+, stacked cards on mobile. The WidgetCard `action`
 * slot is the extension point where booking filters / export will live later.
 */
interface RecentBookingsTableProps {
  rows: AdminBookingRow[];
  seeAllHref?: string;
  className?: string;
}

export default function RecentBookingsTable({
  rows,
  seeAllHref,
  className,
}: RecentBookingsTableProps) {
  return (
    <WidgetCard
      title="Recent Bookings"
      className={className}
      action={
        seeAllHref ? (
          <Link
            href={seeAllHref}
            className="inline-flex items-center gap-1 text-sm font-semibold text-maroon hover:underline"
          >
            See all <ArrowRight className="h-4 w-4" />
          </Link>
        ) : undefined
      }
    >
      {/* Column header (sm+) */}
      <div className="hidden grid-cols-12 gap-3 border-b border-cream-3 px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft sm:grid">
        <span className="col-span-4">Customer</span>
        <span className="col-span-3">Vendor</span>
        <span className="col-span-2">Date</span>
        <span className="col-span-2 text-right">Amount</span>
        <span className="col-span-1 text-right">Status</span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-cream-3 bg-white/60 p-8 text-center">
          <p className="font-display text-base text-ink">No bookings yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            New bookings will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-cream-3">
          {rows.map((b) => (
            <li
              key={b.id}
              className="grid grid-cols-2 gap-3 px-1 py-3 sm:grid-cols-12 sm:items-center"
            >
              <div className="col-span-2 sm:col-span-4">
                <p className="font-medium text-ink">{b.customer}</p>
                <p className="text-xs text-ink-soft">
                  {b.occasion} · {b.id}
                </p>
              </div>
              <span className="text-sm text-ink-soft sm:col-span-3">
                {b.vendor}
              </span>
              <span className="text-sm text-ink-soft sm:col-span-2">
                {b.date}
              </span>
              <span className="font-display text-sm font-semibold text-ink sm:col-span-2 sm:text-right">
                {money(b.amount)}
              </span>
              <span className="justify-self-start sm:col-span-1 sm:justify-self-end">
                <StatusBadge status={b.status} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
