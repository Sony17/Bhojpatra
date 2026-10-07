import { requireRole } from "@/lib/auth";
import { listSeedVendorRecords, saveVendor } from "@/lib/vendorMenus";

const CHUNK = 10;

export const dynamic = "force-dynamic";

// Platform seed stalls — the demo vendors (no owner account) that fill every
// menu course before real vendors sign up. One switch takes all of them off
// every customer surface for launch; the curated SAMPLE catalog listings
// follow the same switch (see `seedStallsHidden`). The rows stay in the
// database, so this is reversible from the same button.

function summary(seeds: { moderation?: string }[]) {
  const hidden = seeds.filter((r) => r.moderation === "Hidden").length;
  return { total: seeds.length, hidden };
}

// GET /api/vendors/moderation/seeds → { total, hidden }
export async function GET() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  try {
    return Response.json(summary(await listSeedVendorRecords()));
  } catch (err) {
    console.error("Failed to count seed stalls", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

// POST /api/vendors/moderation/seeds { hidden: true | false }
export async function POST(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body.hidden !== "boolean") {
    return Response.json({ error: "hidden must be true or false." }, { status: 400 });
  }
  const hidden = body.hidden;

  try {
    const now = new Date().toISOString();
    const seeds = await listSeedVendorRecords();
    const next = seeds
      .filter((r) => (r.moderation === "Hidden") !== hidden)
      .map((r) => ({
        ...r,
        // Seeds are platform content: restoring publishes them straight back.
        moderation: hidden ? ("Hidden" as const) : ("Approved" as const),
        approvedSnapshot: undefined,
        updatedAt: now,
      }));
    // ~80 rows: save in parallel chunks so the button answers in a few
    // seconds rather than one Neon round-trip per row.
    for (let i = 0; i < next.length; i += CHUNK) {
      await Promise.all(next.slice(i, i + CHUNK).map((r) => saveVendor(r)));
    }
    return Response.json({
      ok: true,
      changed: next.length,
      ...summary(await listSeedVendorRecords()),
    });
  } catch (err) {
    console.error("Failed to update seed stalls", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
