import { requireRole } from "@/lib/auth";
import {
  findVendorById,
  saveVendor,
  type ModerationStatus,
} from "@/lib/vendorMenus";

export const dynamic = "force-dynamic";

const STATUSES: ModerationStatus[] = ["Pending", "Approved", "Hidden"];

// PATCH /api/vendors/moderation/[id] → { status } — set a live vendor's
// moderation status. "Hidden" takes their menu and listing off every customer
// surface; "Approved" restores/clears the review flag.
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const status = body.status;
  if (!STATUSES.includes(status as ModerationStatus)) {
    return Response.json({ error: "Unknown status." }, { status: 400 });
  }

  try {
    const record = await findVendorById(id);
    if (!record || !record.ownerUserId) {
      return Response.json({ error: "Vendor not found." }, { status: 404 });
    }
    await saveVendor({
      ...record,
      moderation: status as ModerationStatus,
      updatedAt: new Date().toISOString(),
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Failed to set moderation status", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
