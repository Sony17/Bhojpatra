import { requireRole } from "@/lib/auth";
import { parseListQuery } from "@/lib/validate";
import { deriveSettlements } from "@/lib/settlements";
import { isRazorpayXConfigured } from "@/lib/razorpay";
import { syncProcessingPayouts } from "@/lib/vendorPayouts";

// Settlement rows are derived from the live bookings (and persisted Settled
// statuses) on every read — never prerender or cache this handler.
export const dynamic = "force-dynamic";

// GET /api/settlements → admin list of vendor payouts, newest period first.
// Backward-compatible `{ settlements }`; adds a `Paginated` envelope when
// filtered.
export async function GET(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  // RazorpayX payouts still in flight are re-synced first.
  const payoutsEnabled = isRazorpayXConfigured();
  if (payoutsEnabled) await syncProcessingPayouts();
  const settlements = await deriveSettlements();

  const { q, status, page, pageSize, hasQuery } = parseListQuery(request.url);
  if (!hasQuery) return Response.json({ settlements, payoutsEnabled });

  const needle = q.trim().toLowerCase();
  const filtered = settlements.filter((s) => {
    const matchesQ =
      !needle ||
      s.id.toLowerCase().includes(needle) ||
      s.vendor.toLowerCase().includes(needle) ||
      s.period.toLowerCase().includes(needle);
    const matchesStatus = status === "All" || s.status === status;
    return matchesQ && matchesStatus;
  });
  const start = (page - 1) * pageSize;
  return Response.json({
    settlements,
    payoutsEnabled,
    data: filtered.slice(start, start + pageSize),
    page,
    pageSize,
    total: filtered.length,
  });
}
