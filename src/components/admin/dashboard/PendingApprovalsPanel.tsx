import Link from "next/link";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import TierBadges from "@/components/admin/shared/TierBadges";
import type { PendingVendorApproval } from "@/lib/admin/types";

/**
 * Pending vendor approvals summary. Read-only: it lists the live queue and links
 * through to the Vendor Approvals console, which is where decisions are actually
 * reviewed and persisted. No approve/reject happens here (that would not save).
 */
interface PendingApprovalsPanelProps {
  approvals: PendingVendorApproval[];
  seeAllHref?: string;
  className?: string;
}

export default function PendingApprovalsPanel({
  approvals,
  seeAllHref,
  className,
}: PendingApprovalsPanelProps) {
  return (
    <WidgetCard
      title="Pending Vendor Approvals"
      className={className}
      action={
        seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-sm font-semibold text-maroon hover:underline"
          >
            See all
          </Link>
        )
      }
    >
      {approvals.length === 0 ? (
        <div className="rounded-card border border-dashed border-cream-3 bg-white/60 p-8 text-center">
          <p className="font-display text-base text-ink">All caught up 🎉</p>
          <p className="mt-1 text-sm text-ink-soft">No pending approvals.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {approvals.map((v) => (
            <li
              key={v.id}
              className="flex flex-col gap-3 rounded-card border border-cream-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink">{v.business}</p>
                  <TierBadges tiers={v.requestedTiers} />
                </div>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {v.owner} · {v.speciality} · {v.city}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Submitted {v.submitted} · {v.id}
                </p>
              </div>
              {seeAllHref && (
                <Link
                  href={seeAllHref}
                  className="shrink-0 text-sm font-semibold text-maroon hover:underline"
                >
                  Review
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
