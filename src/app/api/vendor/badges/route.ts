import { requireRole } from "@/lib/auth";
import {
  findVendorByOwner,
  saveVendor,
  type RecognitionBadgeKey,
  type VendorBadgeApplication,
  type VendorBadgesState,
} from "@/lib/vendorMenus";

export const dynamic = "force-dynamic";

const VALID_BADGE_KEYS = new Set<RecognitionBadgeKey>([
  "verified",
  "icon",
  "heritage",
]);

function cleanCriteria(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, boolean> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    const k = typeof key === "string" ? key.trim().slice(0, 60) : "";
    if (k && typeof val === "boolean") {
      result[k] = val;
    }
  }
  return result;
}

function cleanDetails(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    const k = typeof key === "string" ? key.trim().slice(0, 60) : "";
    const v = typeof val === "string" ? val.trim().slice(0, 500) : "";
    if (k && v) {
      result[k] = v;
    }
  }
  return result;
}

/**
 * GET /api/vendor/badges
 * Returns the authenticated vendor's badge application and grant state.
 */
export async function GET() {
  const guard = await requireRole("vendor");
  if (guard instanceof Response) return guard;

  try {
    const vendor = await findVendorByOwner(guard.id);
    if (!vendor) {
      return Response.json({ error: "Vendor profile not found." }, { status: 404 });
    }

    return Response.json({
      badges: vendor.badges ?? {
        applied: [],
        granted: [],
        applications: [],
      },
    });
  } catch (err) {
    console.error("Failed to fetch vendor badges", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/vendor/badges
 * Allows a vendor to apply for a recognition badge.
 * Badges are marked as 'applied' and require admin approval before being granted.
 */
export async function POST(request: Request) {
  const guard = await requireRole("vendor");
  if (guard instanceof Response) return guard;

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawKey = typeof body.badgeKey === "string" ? body.badgeKey.trim().toLowerCase() : "";
  if (!VALID_BADGE_KEYS.has(rawKey as RecognitionBadgeKey)) {
    return Response.json(
      {
        error:
          "Invalid badge key. Supported keys are: 'verified', 'icon', 'heritage'.",
      },
      { status: 400 },
    );
  }
  const badgeKey = rawKey as RecognitionBadgeKey;

  try {
    const vendor = await findVendorByOwner(guard.id);
    if (!vendor) {
      return Response.json({ error: "Vendor profile not found." }, { status: 404 });
    }

    const currentBadges: VendorBadgesState = vendor.badges ?? {
      applied: [],
      granted: [],
      applications: [],
    };

    // If already granted, cannot re-apply
    if (currentBadges.granted?.includes(badgeKey)) {
      return Response.json(
        { error: `The '${badgeKey}' badge is already granted to your profile.` },
        { status: 409 },
      );
    }

    // Check for an already pending application
    const existingApps = currentBadges.applications ?? [];
    const hasPending = existingApps.some(
      (a) => a.badgeKey === badgeKey && a.status === "applied",
    );
    if (hasPending) {
      return Response.json(
        { error: `An application for the '${badgeKey}' badge is already pending review.` },
        { status: 409 },
      );
    }

    const newApplication: VendorBadgeApplication = {
      badgeKey,
      appliedAt: new Date().toISOString(),
      status: "applied",
      ...(body.criteria ? { criteria: cleanCriteria(body.criteria) } : {}),
      ...(body.details ? { details: cleanDetails(body.details) } : {}),
    };

    const nextBadges: VendorBadgesState = {
      applied: Array.from(new Set([...(currentBadges.applied ?? []), badgeKey])),
      // Granted badges are NEVER auto-granted by vendor action; preserved strictly as-is
      granted: currentBadges.granted ?? [],
      applications: [...existingApps, newApplication],
    };

    const nextVendor = {
      ...vendor,
      badges: nextBadges,
      updatedAt: new Date().toISOString(),
    };

    await saveVendor(nextVendor);

    return Response.json({ ok: true, badges: nextBadges }, { status: 201 });
  } catch (err) {
    console.error("Failed to submit badge application", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
