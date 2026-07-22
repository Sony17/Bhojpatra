import { requireRole } from "@/lib/auth";
import { readVendorApplications } from "@/lib/vendorApplications";
import {
  findPhotoByOwner,
  listPhotosByOwner,
  photoUrl,
  pruneDishPhotos,
} from "@/lib/vendorPhotos";
import {
  countersFromLabels,
  DEFAULT_VENDOR_IMAGE,
  findVendorByOwner,
  newVendorId,
  photoIdFromUrl,
  saveVendor,
  validateVendorMenuInput,
  type LiveVendorRecord,
  type ModerationStatus,
} from "@/lib/vendorMenus";

export const dynamic = "force-dynamic";

/** The signed-in vendor's approved/pending application, matched by email —
 *  used to prefill a first-time menu and to grant the verified badge. */
async function applicationFor(email: string) {
  const apps = await readVendorApplications();
  const key = email.trim().toLowerCase();
  return apps.find((a) => a.email.trim().toLowerCase() === key) ?? null;
}

// GET /api/vendor/menu → { vendor: LiveVendorRecord | null, prefill? }
// The signed-in vendor's own profile + menu. When they haven't saved one yet,
// `prefill` carries whatever their registration application already told us.
export async function GET() {
  const guard = await requireRole("vendor");
  if (guard instanceof Response) return guard;

  try {
    const gallery = (await listPhotosByOwner(guard.id, "gallery")).map((p) => ({
      id: p.id,
      url: photoUrl(p),
    }));

    const vendor = await findVendorByOwner(guard.id);
    if (vendor) return Response.json({ vendor, gallery });

    const app = await applicationFor(guard.email);
    return Response.json({
      vendor: null,
      gallery,
      prefill: app
        ? {
            business: app.business,
            city: app.city,
            state: app.state,
            cuisines: app.cuisines,
            about: app.speciality,
            maxCapacity: Number(app.maxGuests) || undefined,
            maxEventsPerDay: Number(app.maxEventsPerDay) || undefined,
            googleRating: app.googleRating,
            googleReviews: app.googleReviews,
            // Map the counter/service labels chosen at registration onto the
            // platform offering ids the dashboard toggles (unmatched dropped).
            counters: countersFromLabels(app.counters),
            // Catering categories, boxes and the essential offer declared at
            // registration carry straight over (already stored normalized).
            serviceCategories: app.cateringCategories ?? [],
            bainaBoxes: app.bainaBoxes ?? [],
            essentialService: app.essentialService,
          }
        : { business: guard.name ?? "" },
    });
  } catch (err) {
    console.error("Failed to load vendor menu", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

// PUT /api/vendor/menu → upsert the signed-in vendor's profile + menu.
export async function PUT(request: Request) {
  const guard = await requireRole("vendor");
  if (guard instanceof Response) return guard;

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const check = validateVendorMenuInput(body);
  if (!check.ok) {
    return Response.json({ error: check.error }, { status: 400 });
  }

  try {
    const existing = await findVendorByOwner(guard.id);
    const app = await applicationFor(guard.email);
    const now = new Date().toISOString();

    // Card image: their uploaded photo wins (covers a photo uploaded before
    // the first menu save), then whatever the record already had, then stock.
    const photo = await findPhotoByOwner(guard.id);
    const image = photo
      ? photoUrl(photo)
      : (existing?.image ?? DEFAULT_VENDOR_IMAGE);

    // Dish photos may only reference this vendor's own uploads — strip any
    // reference to a photo they don't own (or that no longer exists).
    const ownedDishPhotoIds = new Set(
      (await listPhotosByOwner(guard.id, "dish")).map((p) => p.id),
    );
    const menu = check.value.menu.map((s) => ({
      ...s,
      items: s.items.map((it) => {
        if (!it.photo) return it;
        const photoId = photoIdFromUrl(it.photo);
        return photoId && ownedDishPhotoIds.has(photoId)
          ? it
          : { name: it.name, diet: it.diet };
      }),
    }));

    // Baina Box photos ride the same "dish" photo store — strip any reference
    // to a photo this vendor doesn't own.
    const bainaBoxes = (check.value.bainaBoxes ?? []).map((b) => {
      if (!b.photo) return b;
      const photoId = photoIdFromUrl(b.photo);
      return photoId && ownedDishPhotoIds.has(photoId)
        ? b
        : { name: b.name, contents: b.contents, price: b.price };
    });

    const verified = app?.status === "Verified";

    // Content moderation: a Hidden vendor stays hidden until an admin restores
    // them. An already-verified vendor's first published menu goes live at once
    // (their KYC is cleared), but any later edit re-queues as Pending so the
    // changed content gets re-reviewed.
    const moderation: ModerationStatus =
      existing?.moderation === "Hidden"
        ? "Hidden"
        : !existing && verified
          ? "Approved"
          : "Pending";

    const record: LiveVendorRecord = {
      id: existing?.id ?? newVendorId(),
      ownerUserId: guard.id,
      ownerEmail: guard.email,
      image,
      rating: existing?.rating ?? 0,
      reviews: existing?.reviews ?? 0,
      verified,
      // Marketplace tiers follow the admin's review decision (falling back to a
      // value already synced onto the record); price-derived bands fill in on
      // the catalog when neither is set.
      tiers: app?.assignedTiers ?? existing?.tiers,
      moderation,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      ...check.value,
      menu,
      ...(check.value.bainaBoxes ? { bainaBoxes } : {}),
    };

    await saveVendor(record);

    // Clean up dish/box photos no longer referenced by any item or box.
    const referenced = new Set(
      [
        ...menu.flatMap((s) => s.items.map((it) => it.photo)),
        ...bainaBoxes.map((b) => b.photo),
      ].flatMap((url) => {
        const id = url ? photoIdFromUrl(url) : null;
        return id ? [id] : [];
      }),
    );
    await pruneDishPhotos(guard.id, referenced);

    return Response.json({ ok: true, vendor: record });
  } catch (err) {
    console.error("Failed to save vendor menu", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
