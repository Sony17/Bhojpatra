import Link from "next/link";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import DataTable, { type Column } from "@/components/admin/shared/DataTable";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import EmptyState from "@/components/admin/shared/EmptyState";
import { money } from "@/components/admin/shared/money";
import { ArrowRight } from "@/components/admin/shared/icons";
import type { AdminBookingRow } from "@/lib/admin/types";

/**
 * Recent bookings table. Uses the shared <DataTable> (a real table that sizes
 * columns to content) so Amount and Status never overlap at any zoom level —
 * `bare` drops the table's own card chrome since it sits inside a WidgetCard.
 * The WidgetCard `action` slot is the extension point for booking filters/export.
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
  const columns: Column<AdminBookingRow>[] = [
    {
      key: "customer",
      header: "Customer",
      cell: (b) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{b.customer}</p>
          <p className="text-xs text-ink-soft">
            {b.occasion} · {b.id}
          </p>
        </div>
      ),
    },
    {
      key: "vendor",
      header: "Vendor",
      cell: (b) => <span className="text-ink-soft">{b.vendor}</span>,
    },
    {
      key: "date",
      header: "Date",
      cell: (b) => <span className="text-ink-soft">{b.date}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      cell: (b) => (
        <span className="font-display font-semibold text-ink">
          {money(b.amount)}
        </span>
      ),
      className: "whitespace-nowrap text-right",
      headerClassName: "text-right",
    },
    {
      key: "status",
      header: "Status",
      cell: (b) => <StatusBadge status={b.status} />,
      className: "whitespace-nowrap text-right",
      headerClassName: "text-right",
    },
  ];

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
      <DataTable
        bare
        columns={columns}
        rows={rows}
        getRowKey={(b) => b.id}
        minWidthClass="min-w-[640px]"
        empty={
          <EmptyState
            title="No bookings yet"
            message="New bookings will appear here."
          />
        }
      />
    </WidgetCard>
  );
}
