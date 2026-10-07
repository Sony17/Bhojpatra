import { isLinkedPhotoUrl } from "@/lib/photoLinks";
import { requireRole } from "@/lib/auth";
import { findApplicationForOwner } from "@/lib/vendorApplications";
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
  nextModerationState,
  photoIdFromUrl,
  pruneMenuBands,
  saveVendor,
  validateVendorMenuInput,
  type LiveVendorRecord,
  type VendorBainaBox,
} from "@/lib/vendorMenus";
import { effectiveTiers } from "@/lib/tiers";

export const dynamic = "force-dynamic";

/** The signed-in vendor's application (by account, legacy rows by email) —
 *  used to prefill a first-time menu and to grant the verified badge. */
function applicationFor(user: { id: string; email: string }) {
  return findApplicationForOwner(user);
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

    const app = await applicationFor(guard);
    return Response.json({
      vendor: null,
      gallery,
      prefill: app
        ? {
            business: app.business,
            phone: app.phone,
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
            // Tier chips start from the admin's review decision, else the
            // price-derived baseline captured at registration.
            tiers: app.assignedTiers ?? app.requestedTiers,
            // V2 onboarding prefill
            serviceCities: app.serviceCities ?? [],
            dietaryOffering: app.dietaryOffering,
            minPax: app.minPax,
            leadHours: app.leadHours,
            bestFor: app.bestFor ?? [],
            packageName: app.packageName,
            goldSpecialization: app.goldSpecialization,
            cutleryTier: app.cutleryTier,
            customOfferings: app.customOfferings ?? [],
            stallConfig: app.stallConfig,
            bainaDetails: app.bainaDetails,
            cateringComponents: app.cateringComponents,
          }
        // No application yet: the wizard asks for the business name rather
        // than guessing it from the account holder's own name.
        : {},
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
    const app = await applicationFor(guard);
    const now = new Date().toISOString();

    // Card image: their uploaded photo wins (covers a photo uploaded before
    // the first menu save), then whatever the record already had, then stock.
    // A pasted https link (Step 1 cover photo) takes precedence over both.
    const photo = await findPhotoByOwner(guard.id);
    const image = isLinkedPhotoUrl(body.image)
      ? body.image
      : photo
        ? photoUrl(photo)
        : body.image === null
          ? DEFAULT_VENDOR_IMAGE
          : (existing?.image ?? DEFAULT_VENDOR_IMAGE);

    // Dish photos are this vendor's own uploads or pasted https image links —
    // strip any upload reference they don't own (or that no longer exists).
    const ownedDishPhotoIds = new Set(
      (await listPhotosByOwner(guard.id, "dish")).map((p) => p.id),
    );
    const withOwnPhotos = check.value.menu.map((s) => ({
      ...s,
      items: s.items.map((it) => {
        if (!it.photo) return it;
        const photoId = photoIdFromUrl(it.photo);
        // Strip only the disallowed photo — keep the dish's name, diet, any
        // per-delicacy price and the bands it's served on.
        return isLinkedPhotoUrl(it.photo) || (photoId && ownedDishPhotoIds.has(photoId))
          ? it
          : {
              name: it.name,
              diet: it.diet,
              ...(it.price != null ? { price: it.price } : {}),
              ...(it.tiers ? { tiers: it.tiers } : {}),
            };
      }),
    }));

    // Marketplace tiers: the vendor's own dashboard selection wins, then the
    // admin's review decision, then whatever was already on the record.
    const tiers = check.value.tiers ?? app?.assignedTiers ?? existing?.tiers;
    // Reconcile the menu's per-band data against the bands this record actually
    // sells (price-derived when none is set — those vendors still appear on
    // those bands, so their numbers still have to make sense). Drops data for
    // bands they've stopped selling and caps any quota at the dishes really
    // available on that band, so the wizard can never ask for more than exists.
    const menu = pruneMenuBands(
      withOwnPhotos,
      effectiveTiers(tiers, check.value.priceFrom),
    );

    // Baina Box photos ride the same "dish" photo store — strip any reference
    // to a photo this vendor doesn't own.
    const bainaBoxes: VendorBainaBox[] = (check.value.bainaBoxes ?? []).map((b) => {
      if (!b.photo) return b;
      const photoId = photoIdFromUrl(b.photo);
      return isLinkedPhotoUrl(b.photo) || (photoId && ownedDishPhotoIds.has(photoId))
        ? b
        : {
            name: b.name,
            contents: b.contents,
            price: b.price,
            ...(b.price1kg != null ? { price1kg: b.price1kg } : {}),
            ...(b.customSizes ? { customSizes: b.customSizes } : {}),
          };
    });

    // Single-stall dish photos follow the same ownership rule.
    const stallConfig = check.value.stallConfig?.menus
      ? {
          ...check.value.stallConfig,
          menus: Object.fromEntries(
            Object.entries(check.value.stallConfig.menus).map(([cat, items]) => [
              cat,
              items.map((it) => {
                if (!it.photo) return it;
                const photoId = photoIdFromUrl(it.photo);
                if (isLinkedPhotoUrl(it.photo) || (photoId && ownedDishPhotoIds.has(photoId))) return it;
                return {
                  name: it.name,
                  diet: it.diet,
                  ...(it.price != null ? { price: it.price } : {}),
                  ...(it.desc ? { desc: it.desc } : {}),
                };
              }),
            ]),
          ),
        }
      : check.value.stallConfig;

    const verified = app?.status === "Verified";

    const candidate: LiveVendorRecord = {
      ...(existing ?? {}),
      id: existing?.id ?? newVendorId(),
      ownerUserId: guard.id,
      ownerEmail: guard.email,
      image,
      rating: existing?.rating ?? 0,
      reviews: existing?.reviews ?? 0,
      verified,
      // Resolved above (the menu's band data is pruned against it); price-derived
      // bands still fill in on the catalog when none is set.
      tiers,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      ...check.value,
      menu,
      ...(check.value.bainaBoxes ? { bainaBoxes } : {}),
      ...(stallConfig ? { stallConfig } : {}),
      // Badges are managed by /api/vendor/badges (apply) and the admin
      // moderation route (grant) — a menu save never changes them.
      badges: existing ? existing.badges : check.value.badges,
      // Wizard progress: keep what's stored when this save didn't send any
      // (the dashboard menu builder doesn't).
      onboarding: check.value.onboarding ?? existing?.onboarding,
    };

    // Content moderation (see nextModerationState): a Hidden vendor stays
    // hidden; a verified vendor's first save goes live; a save that changes
    // nothing public keeps its state; a real edit to a live vendor re-queues as
    // Pending while the last approved content stays live (approvedSnapshot).
    const record: LiveVendorRecord = {
      ...candidate,
      approvedSnapshot: undefined,
      ...nextModerationState(existing, candidate, verified),
    };

    await saveVendor(record);

    // Clean up dish/box photos no longer referenced by any item or box.
    const referenced = new Set(
      [
        ...menu.flatMap((s) => s.items.map((it) => it.photo)),
        ...bainaBoxes.map((b) => b.photo),
        ...Object.values(stallConfig?.menus ?? {}).flatMap((items) => items.map((it) => it.photo)),
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
