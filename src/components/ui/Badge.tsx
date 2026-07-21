import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * Status / label pill. Promotes admin's StatusBadge tone system app-wide.
 * Two ways to use it:
 *   <Badge status="Confirmed" />           // keyed → picks the right tone
 *   <Badge tone="solid">Popular</Badge>    // explicit tone + custom content
 *
 * Semantic meaning is carried by red vs black vs cream emphasis — never a new
 * hue (no green/amber), per the brand rules.
 */
export type BadgeTone = "solid" | "outline" | "soft" | "muted";

const TONES: Record<BadgeTone, string> = {
  solid: "bg-maroon text-cream",
  outline: "border border-maroon text-maroon",
  soft: "bg-cream-2 text-ink",
  muted: "bg-cream-2 text-ink-soft",
};

// Status → tone map (same coverage as the original admin StatusBadge).
const STATUS_TONE: Record<string, BadgeTone> = {
  Confirmed: "solid",
  Verified: "solid",
  Accepted: "solid",
  Settled: "solid",
  Active: "solid",
  Paid: "solid",
  Pending: "outline",
  New: "outline",
  Scheduled: "outline",
  "Advance Received": "outline",
  Open: "outline",
  Requested: "outline",
  "In Progress": "soft",
  Processing: "soft",
  Processed: "soft",
  Resolved: "solid",
  Approved: "solid",
  // Priority
  High: "solid",
  Medium: "outline",
  Low: "soft",
  Completed: "soft",
  Silver: "soft",
  Gold: "outline",
  Platinum: "solid",
  Cancelled: "muted",
  Declined: "muted",
  Rejected: "muted",
  Expired: "muted",
  Suspended: "muted",
  Refunded: "muted",
  Inactive: "muted",
};

export default function Badge({
  status,
  tone,
  children,
  className,
}: {
  status?: string;
  tone?: BadgeTone;
  children?: ReactNode;
  className?: string;
}) {
  const resolved: BadgeTone = tone ?? (status ? STATUS_TONE[status] ?? "soft" : "soft");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-caption font-semibold",
        TONES[resolved],
        className,
      )}
    >
      {children ?? status}
    </span>
  );
}

/** Back-compat alias matching the old admin StatusBadge signature. */
export function StatusBadge({ status }: { status: string }) {
  return <Badge status={status} />;
}
