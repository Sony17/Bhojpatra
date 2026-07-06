import { createStore } from "@/lib/store";
import {
  parseVenuePrice,
  formatVenuePrice,
  sanitizeVenueImage,
  type VenueRecord,
} from "@/lib/venues";

export const dynamic = "force-dynamic";

const store = createStore<VenueRecord>({
  table: "venues",
  idField: "id",
});

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

/** Owner-scoped mutation guard: the caller must pass `ownerCode` matching the
 *  venue's owner. Returns the venue, or a Response to short-circuit with. */
async function loadOwned(
  id: string,
  ownerCode: string | undefined,
): Promise<VenueRecord | Response> {
  const venue = await store.get(decodeURIComponent(id));
  if (!venue || venue.deleted) {
    return Response.json({ error: "Venue not found." }, { status: 404 });
  }
  if (!ownerCode || venue.ownerCode !== ownerCode) {
    return Response.json(
      { error: "This venue belongs to another owner." },
      { status: 403 },
    );
  }
  return venue;
}

// GET /api/venues/[id] (single venue; public)
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const venue = await store.get(decodeURIComponent(id));
  if (!venue || venue.deleted) {
    return Response.json({ error: "Venue not found." }, { status: 404 });
  }
  return Response.json({
    venue: { ...venue, image: sanitizeVenueImage(venue.image) },
  });
}

// PATCH /api/venues/[id] → owner edits venue fields (must pass ownerCode)
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const loaded = await loadOwned(id, str(body.ownerCode));
  if (loaded instanceof Response) return loaded;

  const next: VenueRecord = { ...loaded };
  if (str(body.name)) next.name = str(body.name)!;
  if (str(body.city)) next.city = str(body.city)!;
  if (body.location !== undefined) next.location = str(body.location) ?? "";
  if (str(body.type)) next.type = str(body.type)!;
  if (body.capacity !== undefined) next.capacity = str(body.capacity) ?? "";
  if (body.image !== undefined && str(body.image)) {
    next.image = sanitizeVenueImage(str(body.image));
  }
  if (str(body.ownerName)) next.ownerName = str(body.ownerName);
  if (str(body.phone)) next.phone = str(body.phone);
  if (body.price !== undefined || body.priceFrom !== undefined) {
    const raw =
      typeof body.price === "number"
        ? body.price
        : parseVenuePrice(str(body.price) ?? str(body.priceFrom) ?? "");
    if (Number.isFinite(raw) && raw > 0) {
      next.price = Math.round(raw);
      next.priceFrom = str(body.priceFrom) ?? formatVenuePrice(next.price);
    }
  }

  try {
    await store.upsert(next);
  } catch (err) {
    console.error("Failed to update venue", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
  return Response.json({ venue: next });
}

// DELETE /api/venues/[id]?ownerCode=REF-… → owner soft-deletes their venue
export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const ownerCode =
    new URL(request.url).searchParams.get("ownerCode") ?? undefined;
  const loaded = await loadOwned(id, ownerCode ?? undefined);
  if (loaded instanceof Response) return loaded;

  await store.upsert({ ...loaded, deleted: true });
  return Response.json({ ok: true });
}
