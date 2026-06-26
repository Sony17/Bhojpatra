import Link from "next/link";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import { money } from "@/components/admin/shared/money";
import type { RevenueSummary } from "@/lib/admin/types";

/**
 * Revenue summary widget. Receives a typed RevenueSummary and renders the total
 * plus a breakdown. No hardcoded figures — only the row labels are presentation.
 */
interface RevenueCardProps {
  data: RevenueSummary;
  detailsHref?: string;
  className?: string;
}

export default function RevenueCard({
  data,
  detailsHref,
  className,
}: RevenueCardProps) {
  const rows: { label: string; value: number; accent?: boolean }[] = [
    { label: "Advance Collected", value: data.advance },
    { label: "Settled to Vendors", value: data.settled },
    { label: "Pending / In-flight", value: data.pending, accent: true },
  ];

  return (
    <WidgetCard
      title="Revenue Summary"
      className={className}
      action={
        detailsHref ? (
          <Link
            href={detailsHref}
            className="text-sm font-semibold text-maroon hover:underline"
          >
            Details
          </Link>
        ) : undefined
      }
    >
      <div className="rounded-xl bg-cream-2 p-4">
        <p className="text-sm text-ink-soft">Total Revenue</p>
        <p className="mt-1 font-display text-3xl font-bold text-ink">
          {money(data.total)}
        </p>
      </div>

      <dl className="mt-4 space-y-3">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-baseline justify-between border-b border-cream-3 pb-3 last:border-b-0 last:pb-0"
          >
            <dt className="text-sm text-ink-soft">{r.label}</dt>
            <dd
              className={
                "font-display font-semibold " +
                (r.accent ? "text-maroon" : "text-ink")
              }
            >
              {money(r.value)}
            </dd>
          </div>
        ))}
      </dl>
    </WidgetCard>
  );
}
