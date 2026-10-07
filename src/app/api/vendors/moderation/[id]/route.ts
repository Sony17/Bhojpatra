import { requireRole } from "@/lib/auth";
import {
  applyBadgeDecision,
  findVendorById,
  saveVendor,
  type BadgeDecision,
  type ModerationStatus,
  type RecognitionBadgeKey,
} from "@/lib/vendorMenus";
import { findApplicationForOwner } from "@/lib/vendorApplications";

export const dynamic = "force-dynamic";

const STATUSES: ModerationStatus[] = ["Pending", "Approved", "Hidden"];
const BADGE_KEYS: RecognitionBadgeKey[] = ["verified", "icon", "heritage"];
const BADGE_DECISIONS: BadgeDecision[] = ["grant", "reject", "revoke"];

// PATCH /api/vendors/moderation/[id] →
//   { status }                  set a live vendor's moderation status. "Hidden"
//                               takes their menu and listing off every customer
//                               surface; "Approved" publishes the current
//                               content — only once their KYC application is
//                               Verified.
//   { badge: { key, decision } } grant / reject / revoke a recognition badge
//                               (the only path that can grant one).
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

  const badge = (body.badge ?? null) as Record<string, unknown> | null;
  const status = body.status;
  if (badge) {
    if (
      !BADGE_KEYS.includes(badge.key as RecognitionBadgeKey) ||
      !BADGE_DECISIONS.includes(badge.decision as BadgeDecision)
    ) {
      return Response.json({ error: "Unknown badge decision." }, { status: 400 });
    }
  } else if (!STATUSES.includes(status as ModerationStatus)) {
    return Response.json({ error: "Unknown status." }, { status: 400 });
  }

  try {
    const record = await findVendorById(id);
    if (!record || !record.ownerUserId) {
      return Response.json({ error: "Vendor not found." }, { status: 404 });
    }

    if (badge) {
      const badges = applyBadgeDecision(
        record.badges,
        badge.key as RecognitionBadgeKey,
        badge.decision as BadgeDecision,
      );
      await saveVendor({ ...record, badges, updatedAt: new Date().toISOString() });
      return Response.json({ ok: true, badges });
    }

    if (status === "Approved") {
      const app = await findApplicationForOwner({
        id: record.ownerUserId,
        email: record.ownerEmail ?? "",
      });
      if (app?.status !== "Verified") {
        return Response.json(
          {
            error: app
              ? `KYC application ${app.id} is ${app.changesRequested ? "awaiting vendor changes" : app.status}. Approve it in Vendor Approvals before publishing this menu.`
              : "This vendor hasn't submitted their KYC application yet, so their menu can't be published.",
          },
          { status: 409 },
        );
      }
    }

    await saveVendor({
      ...record,
      moderation: status as ModerationStatus,
      // Approving publishes the current content and Hiding takes everything
      // down, so neither keeps the previously approved snapshot.
      ...(status === "Pending" ? {} : { approvedSnapshot: undefined }),
      ...(status === "Approved" ? { verified: true } : {}),
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
