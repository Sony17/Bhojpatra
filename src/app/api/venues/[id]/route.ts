import { createStore } from "@/lib/store";
import {
  parseVenuePrice,
  formatVenuePrice,
  sanitizeVenueImage,
  isServableVenueImage,
  isVenuePublic,
  type VenueRecord,
} from "@/lib/venues";

import { requireRole } from "@/lib/auth";
import type { PublicUser } from "@/lib/users";

export const dynamic = "force-dynamic";

type StoredVenue = VenueRecord & { ownerUserId?: string };

const store = createStore<StoredVenue>({
  table: "venues",
  idField: "id",
});

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

function isVenueOwner(user: PublicUser, venue: StoredVenue): boolean {
  if (user.role === "admin") return true;
  if (venue.ownerUserId) {
    return venue.ownerUserId === user.id;
  }
  // Legacy fallback: match venue.ownerCode against the partner's verified referral codes
  return Boolean(
    user.partnerRoles?.some((r) => r.referralCode === venue.ownerCode),
  );
}

/** Session-verified venue ownership guard: the caller must be admin or the owning partner.
 *  Returns the venue, or a Response to short-circuit with. */
async function loadOwnedVenue(
  id: string,
  user: PublicUser,
): Promise<StoredVenue | Response> {
  const venue = await store.get(decodeURIComponent(id));
  if (!venue || venue.deleted) {
    return Response.json({ error: "Venue not found." }, { status: 404 });
  }
  if (!isVenueOwner(user, venue)) {
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
  // Public lookup: an unapproved (pending/hidden) or deleted venue is 404 here.
  if (!venue || !isVenuePublic(venue)) {
    return Response.json({ error: "Venue not found." }, { status: 404 });
  }
  // Sanitize the gallery on the way out as well — a stored non-servable URL
  // must never reach a `next/image` and crash the detail page.
  return Response.json({
    venue: {
      ...venue,
      image: sanitizeVenueImage(venue.image),
      ...(venue.images
        ? { images: venue.images.filter((s) => isServableVenueImage(s)) }
        : {}),
    },
  });
}

// PATCH /api/venues/[id] → owner edits venue fields (must be signed-in owner or admin)
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("partner", "admin");
  if (guard instanceof Response) return guard;

  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const loaded = await loadOwnedVenue(id, guard);
  if (loaded instanceof Response) return loaded;

  const next: StoredVenue = { ...loaded };
  // Crucial: ownership fields can NEVER be modified by a client PATCH payload
  next.ownerUserId = loaded.ownerUserId;
  next.ownerCode = loaded.ownerCode;

  if (str(body.name)) next.name = str(body.name)!;
  if (str(body.city)) next.city = str(body.city)!;
  if (body.location !== undefined) next.location = str(body.location) ?? "";
  if (str(body.type)) next.type = str(body.type)!;
  if (body.capacity !== undefined) next.capacity = str(body.capacity) ?? "";
  if (body.image !== undefined && str(body.image)) {
    const image = str(body.image)!;
    // Reject a photo link the site can't serve rather than silently swapping
    // in the default — the owner needs to know their image didn't take.
    if (!isServableVenueImage(image)) {
      return Response.json(
        {
          error:
            "We can't use that photo link. Paste a direct image address from " +
            "Unsplash (right-click the photo → Copy Image Address), or leave " +
            "the field blank for the default photo.",
        },
        { status: 400 },
      );
    }
    next.image = image;
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

// DELETE /api/venues/[id] → owner soft-deletes their venue (signed-in owner or admin)
export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("partner", "admin");
  if (guard instanceof Response) return guard;

  const { id } = await ctx.params;
  const loaded = await loadOwnedVenue(id, guard);
  if (loaded instanceof Response) return loaded;

  await store.upsert({ ...loaded, deleted: true });
  return Response.json({ ok: true });
}
