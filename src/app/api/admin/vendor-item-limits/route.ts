import { requireRole } from "@/lib/auth";
import { writeSingleton } from "@/lib/store";
import { menuCategories } from "@/lib/data";
import { findVendorById, readVendorItemLimits } from "@/lib/vendorMenus";
import {
  VENDOR_ITEM_LIMITS_KEY,
  normalizeCourseLimits,
  type VendorCourseLimits,
  type VendorItemLimits,
} from "@/lib/vendorItemLimitsData";

// Admin per-vendor dish-quota overrides for the /book wizard: how many dishes
// a guest may pick from one vendor's course on each feast band, raised or
// lowered per vendor / course / band from Vendor Management → vendor → Menu.
// Persisted to the `vendor-item-limits` settings singleton; enforced by
// `assembleMenuCategories`, which lays these over the caterer's own `tierItems`.
// Admin-only both ways — customers get the merged numbers through /api/menu.
export const dynamic = "force-dynamic";

const CATEGORY_IDS = new Set(menuCategories.map((c) => c.id));

export async function GET(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  const limits = await readVendorItemLimits();
  const vendorId = new URL(request.url).searchParams.get("vendor");
  if (vendorId) return Response.json({ limits: limits[vendorId] ?? {} });
  return Response.json({ limits });
}

/** Replace ONE vendor's overrides with the posted set (an empty/blank set
 *  clears them). Whole-entry replace keeps "blank the field" meaning "back to
 *  the default" without a tombstone value. */
export async function POST(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { vendorId, limits: rawLimits } = (body ?? {}) as {
    vendorId?: unknown;
    limits?: unknown;
  };
  if (typeof vendorId !== "string" || !vendorId.trim()) {
    return Response.json({ error: "Provide a vendorId." }, { status: 400 });
  }
  if (!rawLimits || typeof rawLimits !== "object") {
    return Response.json(
      { error: "Provide a limits object (category → tier → count)." },
      { status: 400 },
    );
  }

  try {
    const record = await findVendorById(vendorId);
    if (!record) {
      return Response.json({ error: "Vendor not found." }, { status: 404 });
    }

    // Keep only real courses with at least one in-range number — junk keys and
    // blanks fall away rather than 400ing a save that's otherwise fine.
    const entry: VendorCourseLimits = {};
    for (const [catId, course] of Object.entries(
      rawLimits as Record<string, unknown>,
    )) {
      if (!CATEGORY_IDS.has(catId)) continue;
      const norm = normalizeCourseLimits(course);
      if (norm) entry[catId] = norm;
    }

    // Re-read before writing so one vendor's save never clobbers another's
    // overrides written since this editor loaded.
    const current = await readVendorItemLimits();
    const next: VendorItemLimits = { ...current };
    if (Object.keys(entry).length) next[vendorId] = entry;
    else delete next[vendorId];
    await writeSingleton(VENDOR_ITEM_LIMITS_KEY, { limits: next });

    return Response.json({ ok: true, limits: entry });
  } catch (err) {
    console.error("Failed to persist vendor item limits", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
