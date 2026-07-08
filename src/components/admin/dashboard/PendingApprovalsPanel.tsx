"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import TierBadges from "@/components/admin/shared/TierBadges";
import type { PendingVendorApproval } from "@/lib/admin/types";

/**
 * Pending vendor approvals panel. Receives the typed queue as props and seeds
 * local state for mock Approve/Reject interactions. When the API lands, swap the
 * local mutation for a call + refetch — the props contract is unchanged.
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
  const [items, setItems] = useState<PendingVendorApproval[]>(approvals);
  const [toast, setToast] = useState<string | null>(null);

  const resolve = (id: string, verb: "approved" | "rejected") => {
    setItems((prev) => prev.filter((a) => a.id !== id));
    setToast(`Vendor ${verb}`);
  };

  return (
    <WidgetCard
      title="Pending Vendor Approvals"
      className={className}
      action={
        <>
          {toast && (
            <span
              role="status"
              className="inline-flex items-center gap-1.5 rounded-full bg-cream-2 px-3 py-1 text-xs font-medium text-ink"
            >
              <span aria-hidden="true" className="text-maroon">
                ✓
              </span>
              {toast}
            </span>
          )}
          {seeAllHref && (
            <Link
              href={seeAllHref}
              className="text-sm font-semibold text-maroon hover:underline"
            >
              See all
            </Link>
          )}
        </>
      }
    >
      {items.length === 0 ? (
        <div className="rounded-card border border-dashed border-cream-3 bg-white/60 p-8 text-center">
          <p className="font-display text-base text-ink">All caught up 🎉</p>
          <p className="mt-1 text-sm text-ink-soft">No pending approvals.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((v) => (
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
              <div className="flex shrink-0 gap-2.5">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => resolve(v.id, "approved")}
                >
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => resolve(v.id, "rejected")}
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
