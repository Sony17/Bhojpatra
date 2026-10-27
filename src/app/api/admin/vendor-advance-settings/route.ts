import {
  VENDOR_ADVANCE_SETTINGS_KEY,
  normalizeVendorAdvanceRule,
  vendorAdvanceRuleError,
} from "@/lib/vendorAdvance";
import { writeSingleton } from "@/lib/store";
import { readVendorAdvanceRule } from "@/lib/settlements";
import { requireRole } from "@/lib/auth";

// Admin-set vendor advance rule — how much of a caterer's payout is released
// before the event, as a % of booking value or a flat ₹ amount. Persisted to
// Postgres (Neon) as a settings singleton. Admin-only both ways.
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  return Response.json(await readVendorAdvanceRule());
}

export async function POST(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Reject out-of-range values instead of silently clamping, so a fat-finger
  // (e.g. 300%) surfaces as an error the admin can correct.
  const error = vendorAdvanceRuleError(body);
  if (error) return Response.json({ error }, { status: 400 });

  const rule = normalizeVendorAdvanceRule(body);
  try {
    await writeSingleton(VENDOR_ADVANCE_SETTINGS_KEY, rule);
  } catch (err) {
    console.error("Failed to persist vendor advance settings", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
  return Response.json({ ok: true, ...rule });
}
