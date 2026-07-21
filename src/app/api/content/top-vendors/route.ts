/**
 * Admin-curated "Top 5" pins for the /book menu-builder vendor ribbon —
 * persisted as a single row in the `settings` store.
 *
 * GET is public (harmless ordering metadata; the admin UI reads it to show
 * each vendor's slot); PUT/DELETE require an admin (the "Push to Top 5"
 * action in Vendor Management). The menu API applies the pins server-side in
 * `assembleMenuCategories`.
 */
import { readSingleton, writeSingleton, deleteSingleton } from "@/lib/store";
import {
  DEFAULT_TOP_VENDORS,
  TOP_VENDORS_KEY,
  reconcileTopVendors,
  type TopVendors,
} from "@/lib/topVendorsData";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/content/top-vendors → { topVendors } — the reconciled pin list.
export async function GET() {
  const stored = await readSingleton<TopVendors>(TOP_VENDORS_KEY);
  return Response.json({ topVendors: reconcileTopVendors(stored) });
}

// PUT /api/content/top-vendors { pins } → persist the admin's pin list.
export async function PUT(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid pin list." }, { status: 400 });
  }

  const topVendors = reconcileTopVendors(body as Partial<TopVendors>);
  try {
    await writeSingleton(TOP_VENDORS_KEY, topVendors);
  } catch (err) {
    console.error("Failed to save top vendors", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
  return Response.json({ ok: true, topVendors });
}

// DELETE /api/content/top-vendors → clear every pin.
export async function DELETE() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  try {
    await deleteSingleton(TOP_VENDORS_KEY);
  } catch (err) {
    console.error("Failed to reset top vendors", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
  return Response.json({ ok: true, topVendors: DEFAULT_TOP_VENDORS });
}
