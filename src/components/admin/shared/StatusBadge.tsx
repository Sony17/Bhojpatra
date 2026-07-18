/**
 * Generalised status pill, keyed by the status string, using only brand tokens.
 * Covers booking, verification and tier statuses so it's reusable across the
 * whole admin panel.
 */
const SOLID = "bg-maroon text-cream";
const OUTLINE = "border border-maroon text-maroon";
const SOFT = "bg-cream-2 text-ink";
const MUTED = "bg-cream-2 text-ink-soft";

const TONE: Record<string, string> = {
  // Positive / confirmed
  Confirmed: SOLID,
  Verified: SOLID,
  Accepted: SOLID,
  Settled: SOLID,
  Active: SOLID,
  // In-progress / awaiting action
  Pending: OUTLINE,
  New: OUTLINE,
  Scheduled: OUTLINE,
  "Advance Received": OUTLINE,
  Open: OUTLINE,
  Requested: OUTLINE,
  "In Progress": SOFT,
  Processing: SOFT,
  Processed: SOFT,
  Resolved: SOLID,
  Approved: SOLID,
  // Priority
  High: SOLID,
  Medium: OUTLINE,
  Low: SOFT,
  // Neutral / done
  Completed: SOFT,
  // Tiers
  Silver: SOFT,
  Gold: OUTLINE,
  Platinum: SOLID,
  // Negative / closed
  Cancelled: MUTED,
  Declined: MUTED,
  Rejected: MUTED,
  Expired: MUTED,
  Suspended: MUTED,
  Refunded: MUTED,
  Inactive: MUTED,
};

export default function StatusBadge({ status }: { status: string }) {
  const cls = TONE[status] ?? SOFT;
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold " +
        cls
      }
    >
      {status}
    </span>
  );
}
