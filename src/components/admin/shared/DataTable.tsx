import type { ReactNode } from "react";

/**
 * Generic, reusable data table for admin list pages (vendors now; customers,
 * bookings, coupons, payments later). Column config drives rendering; cells
 * return ReactNode so callers compose badges/links/money freely. Horizontally
 * scrolls on small screens (Zoho-style) rather than reflowing per column.
 */
export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Extra classes for the body cell (e.g. alignment, width). */
  className?: string;
  /** Extra classes for the header cell. */
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Shown in place of the table body when there are no rows. */
  empty?: ReactNode;
  /** Min table width before horizontal scroll kicks in. */
  minWidthClass?: string;
  /** Drop the card chrome (border/bg/shadow) when nested inside a WidgetCard. */
  bare?: boolean;
}

export default function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  empty,
  minWidthClass = "min-w-[760px]",
  bare = false,
}: DataTableProps<T>) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  const wrapperClass = bare
    ? "overflow-x-auto"
    : "overflow-x-auto rounded-2xl border border-cream-3 bg-white shadow-sm";

  return (
    <div className={wrapperClass}>
      <table className={"w-full border-collapse text-left " + minWidthClass}>
        <thead>
          <tr className="border-b border-cream-3 bg-cream-2">
            {columns.map((c) => (
              <th
                key={c.key}
                className={
                  "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft " +
                  (c.headerClassName ?? "")
                }
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-cream-3">
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? "button" : undefined}
              className={
                "transition-colors " +
                (onRowClick
                  ? "cursor-pointer hover:bg-cream-2/50 focus:outline-none focus-visible:bg-cream-2"
                  : "")
              }
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={"px-4 py-3 align-middle text-sm " + (c.className ?? "")}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
