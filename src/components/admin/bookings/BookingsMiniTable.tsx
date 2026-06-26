import DataTable, { type Column } from "@/components/admin/shared/DataTable";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import EmptyState from "@/components/admin/shared/EmptyState";
import { money } from "@/components/admin/shared/money";
import type { AdminBooking } from "@/lib/admin/types";

/**
 * Compact, reusable bookings table for cross-module views (a vendor's bookings,
 * a customer's history). `party` picks whether to show the counterpart name
 * (the customer, or the vendor). Reuses the shared DataTable so behaviour and
 * styling match the main Booking Management table.
 */
interface BookingsMiniTableProps {
  rows: AdminBooking[];
  /** Which counterpart to show as the secondary column. */
  party: "customer" | "vendor";
  bare?: boolean;
  emptyMessage?: string;
}

export default function BookingsMiniTable({
  rows,
  party,
  bare,
  emptyMessage = "No bookings to show yet.",
}: BookingsMiniTableProps) {
  const columns: Column<AdminBooking>[] = [
    {
      key: "booking",
      header: "Booking",
      cell: (b) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{b.occasion}</p>
          <p className="text-xs text-ink-soft">{b.id}</p>
        </div>
      ),
    },
    {
      key: "party",
      header: party === "customer" ? "Customer" : "Vendor",
      cell: (b) => <span className="text-ink-soft">{party === "customer" ? b.customer : b.vendor}</span>,
    },
    { key: "date", header: "Date", cell: (b) => <span className="text-ink-soft">{b.date}</span> },
    {
      key: "amount",
      header: "Amount",
      cell: (b) => <span className="font-display font-semibold text-ink">{money(b.amount)}</span>,
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
    <DataTable
      bare={bare}
      columns={columns}
      rows={rows}
      getRowKey={(b) => b.id}
      minWidthClass="min-w-[560px]"
      empty={<EmptyState title="No bookings" message={emptyMessage} />}
    />
  );
}
