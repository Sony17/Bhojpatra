import StatusBadge from "@/components/admin/shared/StatusBadge";
import { sortTiers, type VendorTier } from "@/lib/admin/types";

/**
 * Renders a vendor's tier set as a row of pills (a vendor can sit in several
 * tiers at once). Tiers are shown in canonical Silver → Gold → Platinum order.
 */
export default function TierBadges({ tiers }: { tiers: VendorTier[] }) {
  const ordered = sortTiers(tiers);
  if (ordered.length === 0) return <span className="text-ink-soft">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {ordered.map((tier) => (
        <StatusBadge key={tier} status={tier} />
      ))}
    </div>
  );
}
