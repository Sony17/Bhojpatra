"use client";

/**
 * "My Menu" tab of the vendor dashboard — the menu the signed-in caterer
 * publishes to customers. Every course they enable here (with its dishes and
 * per-plate uplift) appears live in the /book wizard's "Build Your Menu" step,
 * and the business itself appears on the /vendors catalog once at least one
 * dish is published.
 *
 * Reads/writes `/api/vendor/menu` (cookie-authenticated, vendor role).
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  addOnMenu,
  cateringCategories,
  indianStates,
  isLiveStallCategory,
  menuCategories,
  packageCategoryItems,
  registrationCuisines,
  servicePackages,
  vendorOfferings,
  type DietType,
  type MenuCategory,
} from "@/lib/data";
import {
  DEFAULT_MENU_TYPE,
  menuTypeOf,
  type ModerationStatus,
  type SingleStallMenuType,
  type VendorBainaBox,
  type VendorCounter,
  type VendorCounterExtra,
  type VendorEssentialService,
  type VendorMenuSection,
} from "@/lib/vendorMenus";
import { TIER_ORDER, sortTiers, type VendorTier } from "@/lib/admin/types";
import { dishOnTier, effectiveTiers } from "@/lib/tiers";
import { money } from "@/lib/money";
import { useLocations } from "@/lib/locations";
import { useLang } from "@/lib/i18n";
import { Button, Card } from "@/components/ui";

const GALLERY_MAX = 8;

/** Sentinel option value for "my city isn't listed" — swaps the City select for
 *  a free-text box. Never a real city name, so it can't collide with one. */
const OTHER_CITY = "__other__";

const inputClass =
  "w-full rounded-lg border border-cream-3 bg-cream/40 px-3.5 py-2.5 text-ink outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30";

interface DraftItem {
  name: string;
  diet: DietType;
  /** Same-origin dish photo URL, set after a per-dish upload. */
  photo?: string;
  /** Per-delicacy price (₹, as a form string) — collected from Single Stall
   *  vendors on their plated dishes. Blank for vendors who don't sell Single
   *  Stall. */
  price?: string;
  /** Feast bands this dish is served on. Absent = every band the vendor sells
   *  (the default a new dish is born with), so the band chips only ever record
   *  a deliberate restriction. */
  tiers?: VendorTier[];
}

interface GalleryPhoto {
  id: string;
  url: string;
}

interface DraftSection {
  enabled: boolean;
  perPlate: string;
  items: DraftItem[];
  /** How many dishes a guest picks from this course, per feast band (form
   *  strings). Blank = use the platform's number for that band; "0" = the
   *  vendor doesn't serve this course on that band at all. */
  tierItems: Partial<Record<VendorTier, string>>;
  /** This course's per-plate rate on each band (form strings). Blank = charge
   *  the flat `perPlate` above, so pricing a band apart is opt-in. */
  tierPerPlate: Partial<Record<VendorTier, string>>;
  /** How this course sells as a Single Stall: a set spread every guest gets
   *  ("fixed"), or a build-your-own where they pick delicacies ("varied"). */
  menuType: SingleStallMenuType;
}

interface VendorPayload {
  business: string;
  city: string;
  state: string;
  cuisines: string[];
  about?: string;
  priceFrom: number;
  maxCapacity?: number;
  maxEventsPerDay?: number;
  googleRating?: number;
  googleReviews?: number;
  menu: VendorMenuSection[];
  featured?: string[];
  counters?: VendorCounter[];
  serviceCategories?: string[];
  bainaBoxes?: VendorBainaBox[];
  essentialService?: VendorEssentialService;
  tiers?: VendorTier[];
}

interface DraftBoxSize {
  /** Size label (e.g. "250 g", "2 kg"). */
  label: string;
  price: string;
}

interface DraftBox {
  name: string;
  contents: string;
  /** ½ kg box price (₹) — the base booking size. */
  price: string;
  /** 1 kg box price (₹), optional — blank when the vendor sells ½ kg only. */
  price1kg: string;
  /** Extra vendor-defined sizes beyond ½ kg / 1 kg (max 4). */
  customSizes: DraftBoxSize[];
  /** Same-origin box photo URL, set after an upload. */
  photo?: string;
}

/** Max extra custom sizes per box (matches the server-side cap). */
const MAX_BOX_CUSTOM_SIZES = 4;

/** Max items a vendor may add to one counter (matches the server-side cap). */
const MAX_COUNTER_EXTRAS = 12;

/** Signature dishes are all-or-nothing: a vendor features exactly this many, or
 *  none (matches the server-side `FEATURED_COUNT`). */
const FEATURED_COUNT = 4;

/** The platform Essential tier's checklist — suggestion chips for the vendor's
 *  own Essential Service offer (they can add their own items too). */
const ESSENTIAL_SUGGESTIONS: string[] =
  servicePackages.find((p) => p.id === "essential")?.includes ?? [];

/** Per-plate band each marketplace tier covers (mirrors `tierForPrice`) —
 *  shown on the tier chips so vendors know where they belong. */
const TIER_BAND_HINTS: Record<VendorTier, string> = {
  Silver: "< ₹1000",
  Gold: "₹1000–1499",
  Platinum: "₹1500+",
};

/** The non-band segments in the order the segment bar shows them — the three
 *  feast bands lead, then the categories a caterer names for itself (single
 *  stall, baina box) before the platform's own two. `full-catering` is absent
 *  on purpose: the Silver/Gold/Platinum chips are its buttons. */
const SEGMENT_CATEGORY_IDS = [
  "single-stall",
  "baina-box",
  "live-stall",
  "essential",
];

/** Segment rows, top to bottom: the feast menu first, then the rest in the
 *  same order as the chips above them. */
const SEGMENT_ROW_IDS = ["full-catering", ...SEGMENT_CATEGORY_IDS];

/** The platform's dish count for a course on each feast band — shown as the
 *  placeholder in a course's per-band row, so a blank field visibly reads as
 *  "use whatever Bhojpatra sets" rather than "none". */
const platformItemsFor = (catId: string): Partial<Record<VendorTier, number>> =>
  Object.fromEntries(
    TIER_ORDER.flatMap((tier) => {
      const n = packageCategoryItems[tier.toLowerCase()]?.[catId];
      return n === undefined ? [] : [[tier, n]];
    }),
  );

const emptySections = (): Record<string, DraftSection> =>
  Object.fromEntries(
    menuCategories.map((c) => [
      c.id,
      {
        enabled: false,
        perPlate: "",
        items: [] as DraftItem[],
        tierItems: {} as Partial<Record<VendorTier, string>>,
        tierPerPlate: {} as Partial<Record<VendorTier, string>>,
        menuType: DEFAULT_MENU_TYPE,
      },
    ]),
  );

/** Popular dishes per course, distilled from the curated seed vendors — shown
 *  as tap-to-add suggestion chips so names stay consistent across caterers
 *  ("Golgappa / Pani Puri" instead of five spellings). Freeform still works. */
const DISH_SUGGESTIONS: Record<string, DraftItem[]> = Object.fromEntries(
  menuCategories.map((c) => {
    const seen = new Map<string, DietType>();
    for (const v of c.vendors)
      for (const it of v.items) if (!seen.has(it.name)) seen.set(it.name, it.diet);
    return [c.id, Array.from(seen, ([name, diet]) => ({ name, diet }))];
  }),
);

export default function MenuBuilder() {
  const { t, lang } = useLang();
  // Serviceable cities the admin has opened (seed list until they load), so a
  // newly added city shows up here without a code change.
  const locations = useLocations();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  /** Whether a saved (live) profile exists on the server yet. */
  const [isLive, setIsLive] = useState(false);

  const [business, setBusiness] = useState("");
  const [city, setCity] = useState("");
  /** True once the vendor picks "Other" — the City select becomes a text box. */
  const [cityOther, setCityOther] = useState(false);
  const [stateName, setStateName] = useState("");
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [cuisineDraft, setCuisineDraft] = useState("");
  const [about, setAbout] = useState("");
  const [priceFrom, setPriceFrom] = useState("999");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [maxEventsPerDay, setMaxEventsPerDay] = useState("");
  // Self-declared Google reputation — shown as a "Google" badge on the card.
  const [googleRating, setGoogleRating] = useState("");
  const [googleReviews, setGoogleReviews] = useState("");
  const [sections, setSections] = useState<Record<string, DraftSection>>(
    emptySections,
  );
  // Signature dishes — the (up to four) dish names the vendor is famous for,
  // shown as tags on their catalog card. Names reference their own live dishes.
  const [featured, setFeatured] = useState<string[]>([]);
  // Live counters & services the vendor offers: offering id → own-price string
  // (a present key = offered; an empty value = charge the platform default).
  const [counters, setCounters] = useState<Record<string, string>>({});
  // What each declared counter actually serves: offering id → the set-menu item
  // names ticked, seeded to the counter's full platform list when it's switched
  // on so a vendor who ignores the picker still offers everything.
  const [counterItems, setCounterItems] = useState<Record<string, string[]>>(
    {},
  );
  // The vendor's own additions to a counter, beyond the platform list.
  const [counterExtras, setCounterExtras] = useState<
    Record<string, VendorCounterExtra[]>
  >({});
  // Counters the vendor has paused: offering id → true. The rate, the ticked
  // spread and their own extras all stay saved; the counter simply drops off
  // every customer surface until it's un-paused.
  const [counterHidden, setCounterHidden] = useState<Record<string, boolean>>(
    {},
  );
  // Draft "add your own" row per counter — the typed name and its veg/non-veg
  // mark, cleared back into `counterExtras` when the vendor adds it.
  const [extraDraft, setExtraDraft] = useState<Record<string, string>>({});
  const [extraDiet, setExtraDiet] = useState<Record<string, DietType>>({});
  // Catering categories served — the same offering types customers browse on
  // the frontend (full catering, single stall, live stall, baina box, …).
  const [serviceCats, setServiceCats] = useState<string[]>([]);
  /** Which category's menu is expanded. One at a time keeps the page short on
   *  a phone; `null` = every menu collapsed to its pricing summary. */
  const [openCat, setOpenCat] = useState<string | null>(null);
  /** Marketplace tier bands the vendor places themselves in (empty = auto). */
  const [tiers, setTiers] = useState<VendorTier[]>([]);
  // Baina Box menu — the vendor's own boxes (baina-box category).
  const [boxes, setBoxes] = useState<DraftBox[]>([]);
  const [boxPhotoError, setBoxPhotoError] = useState("");
  // Essential Service offer — per-guest rate + what's included.
  const [essentialRate, setEssentialRate] = useState("");
  const [essentialIncludes, setEssentialIncludes] = useState<string[]>([]);
  const [essentialDraft, setEssentialDraft] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Card photo — uploaded via POST /api/vendor/photo, shown to customers on
  // the wizard and catalog cards. Empty until the vendor uploads one (the
  // server falls back to a stock photo).
  const [image, setImage] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Gallery — up to GALLERY_MAX photos on the public profile page.
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryError, setGalleryError] = useState("");
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Moderation status of the published profile (takedown model).
  const [moderation, setModeration] = useState<ModerationStatus | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/vendor/menu")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(
        (d: {
          vendor:
            | (VendorPayload & {
                verified: boolean;
                image?: string;
                moderation?: ModerationStatus;
              })
            | null;
          gallery?: GalleryPhoto[];
          prefill?: Partial<VendorPayload>;
        }) => {
          if (!live) return;
          const src = d.vendor ?? d.prefill;
          if (src) {
            setBusiness(src.business ?? "");
            setCity(src.city ?? "");
            setStateName(src.state ?? "");
            setCuisines(src.cuisines ?? []);
            setAbout(src.about ?? "");
            if (src.priceFrom) setPriceFrom(String(src.priceFrom));
            if (src.maxCapacity) setMaxCapacity(String(src.maxCapacity));
            if (src.maxEventsPerDay)
              setMaxEventsPerDay(String(src.maxEventsPerDay));
            if (src.googleRating) setGoogleRating(String(src.googleRating));
            if (src.googleReviews !== undefined)
              setGoogleReviews(String(src.googleReviews));
            // Counters carry over from a saved profile or, first time in, from
            // whatever the registration application already declared.
            if (src.counters) {
              setCounters(
                Object.fromEntries(
                  src.counters.map((c) => [
                    c.id,
                    c.price != null ? String(c.price) : "",
                  ]),
                ),
              );
              // No saved narrowing means the counter's whole platform set menu
              // — expand it here so the picker opens fully ticked. A saved
              // empty list is a real answer ("only my own items"), so it's
              // kept as-is rather than re-expanded.
              setCounterItems(
                Object.fromEntries(
                  src.counters.map((c) => [
                    c.id,
                    c.items ?? addOnMenu(c.id).map((m) => m.name),
                  ]),
                ),
              );
              setCounterExtras(
                Object.fromEntries(
                  src.counters
                    .filter((c) => c.extras?.length)
                    .map((c) => [c.id, c.extras!]),
                ),
              );
              // Paused counters — everything they typed is still here, it just
              // doesn't reach customers until they un-pause it.
              setCounterHidden(
                Object.fromEntries(
                  src.counters.filter((c) => c.hidden).map((c) => [c.id, true]),
                ),
              );
            }
            // Categories likewise carry over from the saved profile or, first
            // time in, from the registration application.
            if (src.serviceCategories) setServiceCats(src.serviceCategories);
            // Signature dishes carry over from the saved profile (a first-time
            // application has none). Reconciled against live dishes on render.
            if (src.featured) setFeatured(src.featured);
            // Tiers: saved selection, or the review/price-derived prefill.
            // Records written before the segment bar can carry bands without
            // the Full Catering declaration those bands now imply — reconcile
            // on the way in, so a lit Silver/Gold/Platinum chip always has its
            // plated menu underneath it (and an already-published course list
            // never becomes unreachable).
            if (src.tiers?.length) {
              setTiers(src.tiers);
              setServiceCats((prev) =>
                prev.includes("full-catering")
                  ? prev
                  : [...prev, "full-catering"],
              );
            }
            if (src.bainaBoxes) {
              setBoxes(
                src.bainaBoxes.map((b) => ({
                  name: b.name,
                  contents: b.contents,
                  price: String(b.price),
                  price1kg: b.price1kg != null ? String(b.price1kg) : "",
                  customSizes: (b.customSizes ?? []).map((s) => ({
                    label: s.label,
                    price: String(s.price),
                  })),
                  ...(b.photo ? { photo: b.photo } : {}),
                })),
              );
            }
            if (src.essentialService) {
              if (src.essentialService.perGuest > 0)
                setEssentialRate(String(src.essentialService.perGuest));
              setEssentialIncludes(src.essentialService.includes);
            }
          }
          if (d.gallery) setGallery(d.gallery);
          if (d.vendor) {
            setIsLive(true);
            setModeration(d.vendor.moderation ?? "Pending");
            // Only reflect an uploaded photo — the stock fallback stays as the
            // "add a photo" empty state in the uploader.
            if (d.vendor.image?.startsWith("/api/vendor/photo/")) {
              setImage(d.vendor.image);
            }
            setSections(() => {
              const next = emptySections();
              for (const s of d.vendor!.menu) {
                if (!next[s.categoryId]) continue;
                next[s.categoryId] = {
                  enabled: !s.hidden,
                  perPlate: String(s.perPlate),
                  items: s.items.map((it) => ({
                    name: it.name,
                    diet: it.diet,
                    ...(it.photo ? { photo: it.photo } : {}),
                    ...(it.price != null ? { price: String(it.price) } : {}),
                    ...(it.tiers?.length ? { tiers: it.tiers } : {}),
                  })),
                  tierItems: Object.fromEntries(
                    TIER_ORDER.flatMap((tier) => {
                      const n = s.tierItems?.[tier];
                      return n === undefined ? [] : [[tier, String(n)]];
                    }),
                  ),
                  tierPerPlate: Object.fromEntries(
                    TIER_ORDER.flatMap((tier) => {
                      const n = s.tierPerPlate?.[tier];
                      return n === undefined ? [] : [[tier, String(n)]];
                    }),
                  ),
                  menuType: menuTypeOf(s),
                };
              }
              return next;
            });
          }
          setLoading(false);
        },
      )
      .catch(() => {
        if (!live) return;
        setLoadError(true);
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const updateSection = (catId: string, patch: Partial<DraftSection>) => {
    setSections((prev) => ({ ...prev, [catId]: { ...prev[catId], ...patch } }));
    setSaved(false);
  };

  const addItem = (catId: string, item: DraftItem) => {
    const name = item.name.trim();
    if (!name) return;
    const cur = sections[catId];
    if (cur.items.length >= 24) return;
    if (cur.items.some((i) => i.name.toLowerCase() === name.toLowerCase())) return;
    updateSection(catId, { items: [...cur.items, { name, diet: item.diet }] });
  };

  /** Set (or clear, on a blank) this course's dish count for one feast band. */
  const setTierItems = (catId: string, tier: VendorTier, value: string) => {
    const next = { ...sections[catId].tierItems };
    if (value.trim() === "") delete next[tier];
    else next[tier] = value;
    updateSection(catId, { tierItems: next });
  };

  /** Set (or clear, on a blank) this course's per-plate rate for one band. */
  const setTierPerPlate = (catId: string, tier: VendorTier, value: string) => {
    const next = { ...sections[catId].tierPerPlate };
    if (value.trim() === "") delete next[tier];
    else next[tier] = value;
    updateSection(catId, { tierPerPlate: next });
  };

  const removeItem = (catId: string, index: number) => {
    updateSection(catId, {
      items: sections[catId].items.filter((_, i) => i !== index),
    });
  };

  const toggleItemDiet = (catId: string, index: number) => {
    updateSection(catId, {
      items: sections[catId].items.map((it, i) =>
        i === index
          ? { ...it, diet: it.diet === "veg" ? "non-veg" : "veg" }
          : it,
      ),
    });
  };

  const setItemPrice = (catId: string, index: number, value: string) => {
    updateSection(catId, {
      items: sections[catId].items.map((it, i) =>
        i === index ? { ...it, price: value } : it,
      ),
    });
  };

  /** Serve / stop serving one dish on one band. A dish with no list is on every
   *  band, so the first tap turns "all" into "all but this one"; ticking the
   *  last band back on drops the list again, keeping "everywhere" implicit
   *  (and so still correct if the vendor's bands change later). Un-ticking the
   *  final band is ignored — a dish served nowhere is a deleted dish. */
  const toggleItemTier = (catId: string, index: number, tier: VendorTier) => {
    const bands = sortTiers(effectiveTiers(tiers, Number(priceFrom) || 0));
    updateSection(catId, {
      items: sections[catId].items.map((it, i) => {
        if (i !== index) return it;
        const on = it.tiers?.length ? it.tiers : bands;
        const next = on.includes(tier)
          ? on.filter((x) => x !== tier)
          : sortTiers([...on, tier]);
        if (next.length === 0) return it;
        const { tiers: _all, ...rest } = it;
        return next.length === bands.length ? rest : { ...rest, tiers: next };
      }),
    });
  };

  // A vendor who sells the Single Stall category can price each delicacy
  // individually — the plated-course dishes gain an optional per-dish ₹ field;
  // a blank one falls back to the course per-plate rate.
  const offersSingleStall = serviceCats.includes("single-stall");

  // The two halves of the course list: plated courses feed Full Catering and
  // Single Stall, live stations (Live Counters, Chaat, Chinese, South Indian)
  // feed the Live Stall category.
  const platedCats = menuCategories.filter((c) => !isLiveStallCategory(c.id));
  const liveCats = menuCategories.filter((c) => isLiveStallCategory(c.id));

  // Only the segments the vendor ticked get an editor — in segment-bar order.
  const visibleCats = SEGMENT_ROW_IDS.flatMap((id) => {
    if (!serviceCats.includes(id)) return [];
    const c = cateringCategories.find((cat) => cat.id === id);
    return c ? [c] : [];
  });

  const publishedDishes = Object.values(sections)
    .filter((s) => s.enabled)
    .reduce((n, s) => n + s.items.length, 0);

  // Signature-dish pool: every dish in an enabled course (the dishes that go
  // live), de-duplicated by name in menu order. A vendor may only feature these.
  const featurablePool = Array.from(
    new Set(
      menuCategories
        .filter((c) => sections[c.id]?.enabled)
        .flatMap((c) => sections[c.id].items.map((it) => it.name)),
    ),
  );
  const featurableSet = new Set(featurablePool);
  // Keep only chosen names that still map to a live dish (a dish may have been
  // removed or its course paused since it was picked).
  const validFeatured = featured.filter((n) => featurableSet.has(n));

  const toggleFeatured = (name: string) => {
    setFeatured((prev) => {
      const cur = prev.filter((n) => featurableSet.has(n));
      if (cur.includes(name)) return cur.filter((n) => n !== name);
      if (cur.length >= FEATURED_COUNT) return cur; // cap: never more than four
      return [...cur, name];
    });
    setSaved(false);
  };

  const onPhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setPhotoError("");
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/vendor/photo", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setPhotoError(
          data.error ??
            t("Upload failed. Try again.", "अपलोड विफल। पुनः प्रयास करें।"),
        );
      } else {
        setImage(data.url);
      }
    } catch {
      setPhotoError(t("Upload failed. Try again.", "अपलोड विफल। पुनः प्रयास करें।"));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onGalleryPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setGalleryError("");
    setUploadingGallery(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "gallery");
      const res = await fetch("/api/vendor/photo", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setGalleryError(
          data.error ?? t("Upload failed. Try again.", "अपलोड विफल। पुनः प्रयास करें।"),
        );
      } else {
        const id = data.url.split("/").pop()!;
        setGallery((g) => [...g, { id, url: data.url! }]);
      }
    } catch {
      setGalleryError(t("Upload failed. Try again.", "अपलोड विफल। पुनः प्रयास करें।"));
    } finally {
      setUploadingGallery(false);
    }
  };

  const removeGalleryPhoto = async (photo: GalleryPhoto) => {
    setGalleryError("");
    // Optimistic remove; restore on failure.
    setGallery((g) => g.filter((p) => p.id !== photo.id));
    try {
      const res = await fetch(`/api/vendor/photo/${photo.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    } catch {
      setGallery((g) => [...g, photo]);
      setGalleryError(
        t("Couldn't remove the photo. Try again.", "फ़ोटो हटाई नहीं जा सकी। पुनः प्रयास करें।"),
      );
    }
  };

  /** Upload a dish photo and attach it to the item. Returns an error string
   *  for the section to surface, or null on success. */
  const uploadDishPhoto = async (
    catId: string,
    index: number,
    file: File,
  ): Promise<string | null> => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "dish");
      const res = await fetch("/api/vendor/photo", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        return data.error ?? t("Upload failed. Try again.", "अपलोड विफल। पुनः प्रयास करें।");
      }
      updateSection(catId, {
        items: sections[catId].items.map((it, i) =>
          i === index ? { ...it, photo: data.url } : it,
        ),
      });
      return null;
    } catch {
      return t("Upload failed. Try again.", "अपलोड विफल। पुनः प्रयास करें।");
    }
  };

  // Toggle a live counter / service on or off. Turning it on seeds the vendor's
  // price with the platform default so it's editable but never blank, and ticks
  // the counter's whole set menu — trimming it is the opt-in, not the chore.
  const toggleCounter = (id: string, defaultPrice: number) => {
    const turningOn = !(id in counters);
    setCounters((prev) => {
      const next = { ...prev };
      if (turningOn) next[id] = String(defaultPrice);
      else delete next[id];
      return next;
    });
    if (turningOn) {
      setCounterItems((prev) => ({
        ...prev,
        [id]: prev[id]?.length ? prev[id] : addOnMenu(id).map((m) => m.name),
      }));
    }
    setSaved(false);
  };

  const setCounterPrice = (id: string, value: string) => {
    setCounters((prev) => ({ ...prev, [id]: value }));
    setSaved(false);
  };

  /** Pause / un-pause a declared counter. Unlike unticking it, everything the
   *  vendor set (rate, spread, their own extras) stays exactly as typed. */
  const toggleCounterHidden = (id: string) => {
    setCounterHidden((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
    setSaved(false);
  };

  /** Tick / untick one item of a counter's set menu. The last item can't be
   *  dropped unless the vendor has added their own — a counter that serves
   *  nothing is just a counter you don't run, so untick the counter instead. */
  const toggleCounterItem = (id: string, name: string) => {
    setCounterItems((prev) => {
      const current = prev[id] ?? addOnMenu(id).map((m) => m.name);
      const next = current.includes(name)
        ? current.filter((n) => n !== name)
        : [...current, name];
      if (!next.length && !counterExtras[id]?.length) return prev;
      return { ...prev, [id]: next };
    });
    setSaved(false);
  };

  /** Restore every item on a counter's set menu (the vendor's own stay put). */
  const selectAllCounterItems = (id: string) => {
    setCounterItems((prev) => ({
      ...prev,
      [id]: addOnMenu(id).map((m) => m.name),
    }));
    setSaved(false);
  };

  /** Commit the "add your own" draft for a counter. Blank names and anything
   *  already on the list (platform or vendor-added) are ignored. */
  const addCounterExtra = (id: string, isService: boolean) => {
    const name = (extraDraft[id] ?? "").trim();
    if (!name) return;
    const taken = new Set([
      ...addOnMenu(id).map((m) => m.name.toLowerCase()),
      ...(counterExtras[id] ?? []).map((e) => e.name.toLowerCase()),
    ]);
    if (taken.has(name.toLowerCase())) {
      setExtraDraft((prev) => ({ ...prev, [id]: "" }));
      return;
    }
    if ((counterExtras[id]?.length ?? 0) >= MAX_COUNTER_EXTRAS) return;
    setCounterExtras((prev) => ({
      ...prev,
      [id]: [
        ...(prev[id] ?? []),
        // Services list inclusions, which carry no veg / non-veg mark.
        { name, ...(isService ? {} : { diet: extraDiet[id] ?? "veg" }) },
      ],
    }));
    setExtraDraft((prev) => ({ ...prev, [id]: "" }));
    setSaved(false);
  };

  /** Drop one of the vendor's own items — unless it's the last thing the
   *  counter serves (no platform items ticked either), which would leave an
   *  empty counter on their public profile. */
  const removeCounterExtra = (id: string, name: string) => {
    setCounterExtras((prev) => {
      const next = (prev[id] ?? []).filter((e) => e.name !== name);
      if (!next.length && !counterItems[id]?.length) return prev;
      const copy = { ...prev };
      if (next.length) copy[id] = next;
      else delete copy[id];
      return copy;
    });
    setSaved(false);
  };

  const toggleServiceCat = (id: string) => {
    const turningOn = !serviceCats.includes(id);
    setServiceCats((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
    // Declaring a category is only half the job — open its menu straight away
    // so the vendor lands on the dishes and prices they now have to fill in.
    if (turningOn) setOpenCat(id);
    setSaved(false);
  };

  /** The Silver/Gold/Platinum chips are the Full Catering segment's buttons:
   *  the bands they tick are their catalog placement, and having any band at
   *  all is what declares the category (and reveals its plated menu). Dropping
   *  the last band withdraws Full Catering — the saved courses stay put, they
   *  just stop being offered. */
  const toggleTier = (tier: VendorTier) => {
    const next = tiers.includes(tier)
      ? tiers.filter((v) => v !== tier)
      : [...tiers, tier];
    setTiers(next);
    if (next.length) {
      if (!serviceCats.includes("full-catering")) {
        ensureServiceCat("full-catering");
        setOpenCat("full-catering");
      }
    } else {
      setServiceCats((prev) => prev.filter((c) => c !== "full-catering"));
    }
    setSaved(false);
  };

  /** Auto-declare a catering category once its builder gains content, so the
   *  declaration and the menu can't drift apart (never auto-unticks). */
  const ensureServiceCat = (id: string) => {
    setServiceCats((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const addBox = () => {
    setBoxes((prev) =>
      prev.length >= 12
        ? prev
        : [
            ...prev,
            { name: "", contents: "", price: "", price1kg: "", customSizes: [] },
          ],
    );
    ensureServiceCat("baina-box");
    setSaved(false);
  };

  const updateBox = (index: number, patch: Partial<DraftBox>) => {
    setBoxes((prev) =>
      prev.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    );
    setSaved(false);
  };

  const removeBox = (index: number) => {
    setBoxes((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const addBoxSize = (boxIndex: number) => {
    setBoxes((prev) =>
      prev.map((b, i) =>
        i === boxIndex && b.customSizes.length < MAX_BOX_CUSTOM_SIZES
          ? { ...b, customSizes: [...b.customSizes, { label: "", price: "" }] }
          : b,
      ),
    );
    setSaved(false);
  };

  const updateBoxSize = (
    boxIndex: number,
    sizeIndex: number,
    patch: Partial<DraftBoxSize>,
  ) => {
    setBoxes((prev) =>
      prev.map((b, i) =>
        i === boxIndex
          ? {
              ...b,
              customSizes: b.customSizes.map((s, j) =>
                j === sizeIndex ? { ...s, ...patch } : s,
              ),
            }
          : b,
      ),
    );
    setSaved(false);
  };

  const removeBoxSize = (boxIndex: number, sizeIndex: number) => {
    setBoxes((prev) =>
      prev.map((b, i) =>
        i === boxIndex
          ? {
              ...b,
              customSizes: b.customSizes.filter((_, j) => j !== sizeIndex),
            }
          : b,
      ),
    );
    setSaved(false);
  };

  /** Upload a box photo (same "dish" photo store as menu items — orphans are
   *  pruned on save) and pin it to the box row. */
  const uploadBoxPhoto = async (index: number, file: File) => {
    setBoxPhotoError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "dish");
      const res = await fetch("/api/vendor/photo", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setBoxPhotoError(
          data.error ?? t("Upload failed. Try again.", "अपलोड विफल। पुनः प्रयास करें।"),
        );
        return;
      }
      updateBox(index, { photo: data.url });
    } catch {
      setBoxPhotoError(t("Upload failed. Try again.", "अपलोड विफल। पुनः प्रयास करें।"));
    }
  };

  const toggleEssentialInclude = (item: string) => {
    setEssentialIncludes((prev) => {
      if (prev.includes(item)) return prev.filter((x) => x !== item);
      ensureServiceCat("essential");
      return [...prev, item];
    });
    setSaved(false);
  };

  const addEssentialCustom = () => {
    const value = essentialDraft.trim();
    if (!value) return;
    setEssentialIncludes((prev) =>
      prev.some((x) => x.toLowerCase() === value.toLowerCase())
        ? prev
        : [...prev, value],
    );
    setEssentialDraft("");
    ensureServiceCat("essential");
    setSaved(false);
  };

  // Add a cuisine the vendor typed in — a preset match just lights up that chip
  // instead of duplicating it.
  const addCustomCuisine = () => {
    const name = cuisineDraft.trim();
    if (!name) return;
    const match = registrationCuisines.find(
      (c) => c.toLowerCase() === name.toLowerCase(),
    );
    const value = match ?? name;
    setCuisines((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setCuisineDraft("");
    setSaved(false);
  };

  const onEssentialRate = (value: string) => {
    setEssentialRate(value);
    if (value.trim()) ensureServiceCat("essential");
    setSaved(false);
  };

  const onSave = async () => {
    setSaveError("");
    if (business.trim().length < 2) {
      setSaveError(t("Enter your business name.", "अपने बिज़नेस का नाम दर्ज करें।"));
      return;
    }
    if (!city.trim()) {
      setSaveError(t("Enter your city.", "अपना शहर दर्ज करें।"));
      return;
    }
    // Signature dishes are all-or-nothing — exactly four, or none.
    if (validFeatured.length !== 0 && validFeatured.length !== FEATURED_COUNT) {
      setSaveError(
        t(
          `Pick exactly ${FEATURED_COUNT} signature dishes to feature, or none.`,
          `फ़ीचर करने के लिए ठीक ${FEATURED_COUNT} सिग्नेचर डिश चुनें, या कोई नहीं।`,
        ),
      );
      return;
    }
    setSaving(true);
    try {
      const payload: VendorPayload = {
        business: business.trim(),
        city: city.trim(),
        state: stateName.trim(),
        cuisines,
        about: about.trim(),
        priceFrom: Number(priceFrom) || 0,
        maxCapacity: Number(maxCapacity) || undefined,
        maxEventsPerDay: Number(maxEventsPerDay) || undefined,
        googleRating: Number(googleRating) || undefined,
        googleReviews: Number(googleReviews) || undefined,
        // Disabled courses with saved dishes go up as hidden — paused, not
        // deleted — so re-enabling later brings the dishes straight back.
        menu: menuCategories
          .filter(
            (c) => sections[c.id]?.enabled || sections[c.id]?.items.length > 0,
          )
          .map((c) => ({
            categoryId: c.id,
            perPlate: Number(sections[c.id].perPlate) || 0,
            // Carry the per-delicacy price as a number; drop it when blank/zero
            // so non-Single-Stall dishes stay priceless.
            items: sections[c.id].items.map((it) => ({
              name: it.name,
              diet: it.diet,
              ...(it.photo ? { photo: it.photo } : {}),
              ...(Number(it.price) > 0 ? { price: Number(it.price) } : {}),
              // Bands this dish is served on — only sent when it's a real
              // restriction (the server drops any list covering every band).
              ...(it.tiers?.length ? { tiers: it.tiers } : {}),
            })),
            ...(sections[c.id].enabled ? {} : { hidden: true }),
            // Per-band dish counts, blanks dropped so those bands keep the
            // platform's number. "0" is kept — it means "not on that band".
            ...(() => {
              const t = Object.fromEntries(
                TIER_ORDER.flatMap((tier) => {
                  const raw = sections[c.id].tierItems[tier];
                  return raw === undefined || raw.trim() === ""
                    ? []
                    : [[tier, Number(raw)]];
                }),
              );
              return Object.keys(t).length ? { tierItems: t } : {};
            })(),
            // Per-band per-plate rates, same rule: a blank band bills the flat
            // rate above, so only bands priced apart travel.
            ...(() => {
              const t = Object.fromEntries(
                TIER_ORDER.flatMap((tier) => {
                  const raw = sections[c.id].tierPerPlate[tier];
                  return raw === undefined || Number(raw) <= 0
                    ? []
                    : [[tier, Number(raw)]];
                }),
              );
              return Object.keys(t).length ? { tierPerPlate: t } : {};
            })(),
            // Single Stall menu style. Only "varied" travels — "fixed" is the
            // platform default, so an untouched course stays a set menu.
            ...(sections[c.id].menuType === "varied"
              ? { menuType: "varied" as const }
              : {}),
          })),
        // Signature dishes — reconciled to live dishes; empty means "none".
        featured: validFeatured,
        // Only send offerings the vendor still recognises; an own-price is
        // optional (blank falls back to the platform default server-side).
        // `items` rides along only when the set menu was actually trimmed, or
        // when the vendor added their own (which has to pin down the platform
        // picks too) — an untouched counter stays "the whole platform list".
        counters: vendorOfferings
          .filter((o) => o.id in counters)
          .map((o) => {
            const price = Number(counters[o.id]);
            const setMenu = addOnMenu(o.id);
            const picked = (counterItems[o.id] ?? []).filter((name) =>
              setMenu.some((m) => m.name === name),
            );
            const extras = counterExtras[o.id] ?? [];
            // Send the pick only when it differs from "all of ours" — an empty
            // pick alongside own items means they serve only their own.
            const pin =
              picked.length + extras.length > 0 &&
              (picked.length < setMenu.length || extras.length > 0);
            return {
              id: o.id,
              ...(price > 0 ? { price } : {}),
              ...(counterHidden[o.id] ? { hidden: true } : {}),
              ...(pin ? { items: picked } : {}),
              ...(extras.length ? { extras } : {}),
            };
          }),
        serviceCategories: serviceCats,
        // Deselecting every tier falls back server-side to the assigned /
        // existing bands (and ultimately the price-derived default).
        tiers,
        // Blank box rows are dropped client-side; a named box without a price
        // is left in so the server's clearer validation error surfaces.
        bainaBoxes: boxes
          .filter((b) => b.name.trim() || b.contents.trim())
          .map((b) => {
            // Blank size rows are dropped; a half-filled one is left in so
            // the server's clearer validation error surfaces.
            const customSizes = b.customSizes
              .filter((s) => s.label.trim() || s.price.trim())
              .map((s) => ({
                label: s.label.trim(),
                price: Number(s.price) || 0,
              }));
            return {
              name: b.name.trim(),
              contents: b.contents.trim(),
              price: Number(b.price) || 0,
              ...(Number(b.price1kg) > 0
                ? { price1kg: Number(b.price1kg) }
                : {}),
              ...(customSizes.length ? { customSizes } : {}),
              ...(b.photo ? { photo: b.photo } : {}),
            };
          }),
        essentialService: {
          perGuest: Number(essentialRate) || 0,
          includes: essentialIncludes,
        },
      };
      const res = await fetch("/api/vendor/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSaveError(
          data.error ?? t("Could not save. Try again.", "सहेज नहीं सके। पुनः प्रयास करें।"),
        );
      } else {
        setIsLive(true);
        // A fresh save re-queues Approved content for review (Hidden stays
        // Hidden until an admin restores it) — mirror the server's transition.
        setModeration((m) => (m === "Hidden" ? "Hidden" : "Pending"));
        setSaved(true);
      }
    } catch {
      setSaveError(t("Could not save. Try again.", "सहेज नहीं सके। पुनः प्रयास करें।"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card padding="none" className="p-12 text-center">
        <p className="text-sm text-ink-soft">{t("Loading your menu…", "आपका मेन्यू लोड हो रहा है…")}</p>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card padding="none" className="p-12 text-center">
        <p className="font-display text-lg text-ink">
          {t("Couldn't load your menu", "आपका मेन्यू लोड नहीं हो सका")}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {t("Refresh the page to try again.", "पुनः प्रयास के लिए पेज रीफ़्रेश करें।")}
        </p>
      </Card>
    );
  }

  /** Baina Box menu — the box offerings customers browse from the home
   *  "Baina Box" section. Adding a box auto-declares the category. */
  const bainaBoxPanel = (
    <>
      <p className="text-xs text-ink-soft">
        {t(
          "Sweet, bhaji & gifting boxes booked in ½ kg, 1 kg or your own custom sizes — shown to customers browsing Baina Boxes.",
          "½ किलो, 1 किलो या आपके अपने कस्टम साइज़ में बुक होने वाले मिठाई, भाजी और गिफ्ट बॉक्स — बैना बॉक्स ब्राउज़ करने वाले ग्राहकों को दिखते हैं।",
        )}
      </p>
      <div className="mt-3 space-y-3">
        {boxes.map((b, i) => (
          <div
            key={i}
            className="rounded-xl border border-cream-3 bg-cream/30 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">
                {t("Box", "बॉक्स")} {i + 1}
              </p>
              <button
                type="button"
                onClick={() => removeBox(i)}
                aria-label={t(`Remove box ${i + 1}`, `बॉक्स ${i + 1} हटाएं`)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-maroon/10 hover:text-maroon"
              >
                ×
              </button>
            </div>
            <div className="mt-3 flex gap-3">
              {/* Box photo — uploaded to the shared dish-photo store; shown
                  on the customer-facing box card. */}
              <label
                className="relative flex h-[6.5rem] w-[6.5rem] shrink-0 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-dashed border-cream-3 bg-cream/40 text-center transition-colors hover:border-maroon"
                aria-label={t(
                  `Box ${i + 1} photo`,
                  `बॉक्स ${i + 1} फ़ोटो`,
                )}
              >
                {b.photo ? (
                  <Image
                    src={b.photo}
                    alt=""
                    fill
                    sizes="104px"
                    className="object-cover"
                  />
                ) : (
                  <>
                    <span aria-hidden="true" className="text-xl text-maroon">
                      ⬆
                    </span>
                    <span className="px-1 text-[11px] leading-tight text-ink-soft">
                      {t("Add photo", "फ़ोटो जोड़ें")}
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadBoxPhoto(i, file);
                    e.target.value = "";
                  }}
                />
              </label>
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={b.name}
                  onChange={(e) => updateBox(i, { name: e.target.value })}
                  placeholder={t("e.g. Royal Mithai Box", "उदा. रॉयल मिठाई बॉक्स")}
                  aria-label={t("Box name", "बॉक्स का नाम")}
                  className={inputClass + " sm:col-span-2"}
                />
                <input
                  type="number"
                  min={0}
                  value={b.price}
                  onChange={(e) => updateBox(i, { price: e.target.value })}
                  placeholder={t("½ kg box price (₹)", "½ किलो बॉक्स मूल्य (₹)")}
                  aria-label={t("½ kg box price", "½ किलो बॉक्स मूल्य")}
                  className={inputClass}
                />
                <input
                  type="number"
                  min={0}
                  value={b.price1kg}
                  onChange={(e) => updateBox(i, { price1kg: e.target.value })}
                  placeholder={t(
                    "1 kg box price (₹, optional)",
                    "1 किलो बॉक्स मूल्य (₹, वैकल्पिक)",
                  )}
                  aria-label={t("1 kg box price", "1 किलो बॉक्स मूल्य")}
                  className={inputClass}
                />
                {/* Extra vendor-defined sizes (250 g, 2 kg, …), each with
                    its own price. */}
                {b.customSizes.map((s, si) => (
                  <div
                    key={si}
                    className="flex items-center gap-3 sm:col-span-2"
                  >
                    <input
                      type="text"
                      value={s.label}
                      onChange={(e) =>
                        updateBoxSize(i, si, { label: e.target.value })
                      }
                      placeholder={t(
                        "Size — e.g. 250 g, 2 kg",
                        "साइज़ — उदा. 250 ग्राम, 2 किलो",
                      )}
                      aria-label={t("Custom size", "कस्टम साइज़")}
                      className={inputClass + " flex-1"}
                    />
                    <input
                      type="number"
                      min={0}
                      value={s.price}
                      onChange={(e) =>
                        updateBoxSize(i, si, { price: e.target.value })
                      }
                      placeholder={t("Price (₹)", "मूल्य (₹)")}
                      aria-label={t(
                        "Custom size price",
                        "कस्टम साइज़ मूल्य",
                      )}
                      className={inputClass + " w-32 flex-none sm:w-40"}
                    />
                    <button
                      type="button"
                      onClick={() => removeBoxSize(i, si)}
                      aria-label={t(
                        "Remove custom size",
                        "कस्टम साइज़ हटाएं",
                      )}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-maroon/10 hover:text-maroon"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {b.customSizes.length < MAX_BOX_CUSTOM_SIZES && (
                  <button
                    type="button"
                    onClick={() => addBoxSize(i)}
                    className="justify-self-start text-left text-xs font-semibold text-maroon hover:underline sm:col-span-2"
                  >
                    + {t("Add custom size (250 g, 2 kg…)", "कस्टम साइज़ जोड़ें (250 ग्राम, 2 किलो…)")}
                  </button>
                )}
                <input
                  type="text"
                  value={b.contents}
                  onChange={(e) => updateBox(i, { contents: e.target.value })}
                  placeholder={t(
                    "Contents, comma separated — e.g. Kaju Katli, Motichoor Ladoo, Dry Fruits",
                    "सामग्री, अल्पविराम से अलग — उदा. काजू कतली, मोतीचूर लड्डू, ड्राई फ्रूट्स",
                  )}
                  aria-label={t("Box contents", "बॉक्स सामग्री")}
                  className={inputClass + " sm:col-span-2"}
                />
              </div>
            </div>
          </div>
        ))}
        {boxPhotoError && (
          <p role="alert" className="text-xs font-semibold text-maroon">
            {boxPhotoError}
          </p>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={addBox}
          disabled={boxes.length >= 12}
        >
          + {t("Add Box", "बॉक्स जोड़ें")}
        </Button>
      </div>
    </>
  );

  /** Essential Service — the vendor's own take on the service-only tier
   *  customers see on /service-packages. Rate + what's included. */
  const essentialPanel = (
    <>
      <p className="text-xs text-ink-soft">
        {t(
          "Serving crew, buffet setup & essentials at your own per-guest rate — for single stalls and small functions.",
          "सिंगल स्टॉल और छोटे आयोजनों के लिए आपकी अपनी प्रति-मेहमान दर पर सर्विस स्टाफ, बुफे सेटअप और ज़रूरी सामान।",
        )}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-ink-soft">₹</span>
        <input
          type="number"
          min={0}
          value={essentialRate}
          onChange={(e) => onEssentialRate(e.target.value)}
          placeholder="40"
          aria-label={t("Per-guest rate", "प्रति-मेहमान दर")}
          className="w-24 rounded-lg border border-cream-3 bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
        />
        <span className="text-sm text-ink-soft">
          / {t("guest", "मेहमान")}
        </span>
      </div>
      <span className="mb-2 mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {t("What you include", "आप क्या शामिल करते हैं")}
      </span>
      <div className="flex flex-wrap gap-2">
        {Array.from(
          new Set([...ESSENTIAL_SUGGESTIONS, ...essentialIncludes]),
        ).map((item) => (
          <Chip
            key={item}
            label={item}
            active={essentialIncludes.includes(item)}
            onClick={() => toggleEssentialInclude(item)}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={essentialDraft}
          onChange={(e) => setEssentialDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addEssentialCustom();
            }
          }}
          placeholder={t("Add your own item…", "अपना आइटम जोड़ें…")}
          className={inputClass + " max-w-xs"}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={addEssentialCustom}
          disabled={!essentialDraft.trim()}
        >
          + {t("Add", "जोड़ें")}
        </Button>
      </div>
    </>
  );

  /* ── Catering-category panels ──────────────────────────────────────────
     Each category row carries its own menu, collapsed to a one-line pricing
     summary until the vendor opens it. */

  /** Live courses + cheapest per-plate rate across a set of courses. */
  const courseStats = (cats: MenuCategory[]) => {
    const on = cats.filter((c) => sections[c.id]?.enabled);
    const rates = on
      .map((c) => Number(sections[c.id].perPlate))
      .filter((n) => n > 0);
    return {
      courses: on.length,
      dishes: on.reduce((n, c) => n + sections[c.id].items.length, 0),
      from: rates.length ? Math.min(...rates) : 0,
    };
  };

  /** The pricing line shown on a collapsed category — so a vendor can read
   *  their rates without opening a single menu. */
  const categorySummary = (id: string): string => {
    switch (id) {
      case "full-catering":
      case "live-stall": {
        const s = courseStats(id === "live-stall" ? liveCats : platedCats);
        // The feast row leads with the bands it's ticked into — that's what
        // Silver/Gold/Platinum mean once the chips are collapsed out of sight.
        const bands =
          id === "full-catering"
            ? `${TIER_ORDER.filter((x) => tiers.includes(x)).join(" · ")} · `
            : "";
        if (!s.courses)
          return bands + t("No courses live yet", "अभी कोई कोर्स लाइव नहीं");
        return bands + t(
          `${s.courses} ${s.courses === 1 ? "course" : "courses"} live · ${s.dishes} dishes${s.from ? ` · from ${money(s.from)}/plate` : ""}`,
          `${s.courses} कोर्स लाइव · ${s.dishes} डिश${s.from ? ` · ${money(s.from)}/प्लेट से` : ""}`,
        );
      }
      case "single-stall": {
        const priced = platedCats
          .flatMap((c) => (sections[c.id]?.enabled ? sections[c.id].items : []))
          .map((it) => Number(it.price))
          .filter((n) => n > 0);
        if (!priced.length)
          return t("No per-dish prices yet", "अभी प्रति-डिश मूल्य नहीं");
        return t(
          `${priced.length} dishes priced · from ${money(Math.min(...priced))}/plate`,
          `${priced.length} डिश की कीमत तय · ${money(Math.min(...priced))}/प्लेट से`,
        );
      }
      case "baina-box": {
        const named = boxes.filter((b) => b.name.trim());
        if (!named.length) return t("No boxes yet", "अभी कोई बॉक्स नहीं");
        const prices = named.map((b) => Number(b.price)).filter((n) => n > 0);
        return t(
          `${named.length} ${named.length === 1 ? "box" : "boxes"}${prices.length ? ` · from ${money(Math.min(...prices))}` : ""}`,
          `${named.length} बॉक्स${prices.length ? ` · ${money(Math.min(...prices))} से` : ""}`,
        );
      }
      case "essential": {
        const rate = Number(essentialRate);
        if (!rate) return t("Rate not set yet", "अभी दर तय नहीं");
        return t(
          `${money(rate)}/guest · ${essentialIncludes.length} included`,
          `${money(rate)}/मेहमान · ${essentialIncludes.length} शामिल`,
        );
      }
      default:
        return "";
    }
  };

  /** Feast bands every course editor asks about — the vendor's own selection,
   *  falling back to the price-derived bands the catalog would place them in. */
  const courseBands = sortTiers(effectiveTiers(tiers, Number(priceFrom) || 0));

  /** The course editors for one half of the menu. */
  const renderCourses = (cats: MenuCategory[], priceable: boolean) =>
    cats.map((cat) => {
      const s = sections[cat.id];
      return (
        <CategorySection
          key={cat.id}
          icon={cat.icon}
          name={lang === "hi" ? cat.nameHi : cat.name}
          blurb={lang === "hi" ? cat.blurbHi : cat.blurb}
          suggestions={DISH_SUGGESTIONS[cat.id] ?? []}
          section={s}
          onToggle={() => updateSection(cat.id, { enabled: !s.enabled })}
          onPerPlate={(v) => updateSection(cat.id, { perPlate: v })}
          onAddItem={(item) => addItem(cat.id, item)}
          onRemoveItem={(i) => removeItem(cat.id, i)}
          onToggleDiet={(i) => toggleItemDiet(cat.id, i)}
          onUploadItemPhoto={(i, file) => uploadDishPhoto(cat.id, i, file)}
          priceable={priceable}
          onItemPrice={(i, v) => setItemPrice(cat.id, i, v)}
          onMenuType={(v) => updateSection(cat.id, { menuType: v })}
          // The bands the caterer is actually browsed in — their own picks, or
          // the price-derived ones when they've picked none. Without the
          // fallback, a caterer who never ticked a band still appeared on those
          // bands but had no way to say what they serve there.
          bands={courseBands}
          bandsDerived={tiers.length === 0}
          platformItems={platformItemsFor(cat.id)}
          onTierItems={(tier, v) => setTierItems(cat.id, tier, v)}
          onTierPerPlate={(tier, v) => setTierPerPlate(cat.id, tier, v)}
          onToggleItemTier={(i, tier) => toggleItemTier(cat.id, i, tier)}
        />
      );
    });

  const panelNote = (text: string) => (
    <p className="text-xs text-ink-soft">{text}</p>
  );

  return (
    <div className="space-y-6">
      {/* Status band */}
      <Card padding="none" className="p-5 sm:p-6">
        <div className="flex flex-nowrap items-center gap-3 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible">
          <h2 className="shrink-0 whitespace-nowrap font-display text-lg font-semibold text-ink">
            {t("Menu Builder", "मेन्यू बिल्डर")}
          </h2>
          {moderation === "Hidden" ? (
            <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-cream-2 px-3 py-1 text-xs font-semibold text-ink-soft">
              {t("Hidden by Bhojpatra", "भोजपत्र द्वारा छिपाया गया")}
            </span>
          ) : isLive && publishedDishes > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-maroon px-3 py-1 text-xs font-semibold text-cream">
              ● {t("Live for customers", "ग्राहकों के लिए लाइव")}
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-cream-3 bg-cream-2 px-3 py-1 text-xs font-semibold text-ink-soft">
              {t("Not published yet", "अभी प्रकाशित नहीं")}
            </span>
          )}
          {moderation === "Pending" && isLive && publishedDishes > 0 && (
            <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-maroon px-3 py-1 text-xs font-semibold text-maroon">
              {t("Pending review", "समीक्षा लंबित")}
            </span>
          )}
        </div>
        {moderation === "Hidden" && (
          <p className="mt-2 text-sm font-medium text-maroon">
            {t(
              "Our team has temporarily hidden your menu from customers. Please contact support to resolve this — edits stay saved and go live once restored.",
              "हमारी टीम ने आपका मेन्यू अस्थायी रूप से ग्राहकों से छिपा दिया है। कृपया समाधान हेतु सपोर्ट से संपर्क करें — आपके बदलाव सहेजे रहेंगे और बहाल होते ही लाइव हो जाएंगे।",
            )}
          </p>
        )}
        <p className="mt-1 text-sm text-ink-soft">
          {t(
            "Choose the courses you serve, add your dishes and per-plate pricing. Everything you publish here appears to customers in the booking wizard and the vendor catalog.",
            "जो कोर्स आप परोसते हैं उन्हें चुनें, अपनी डिश और प्रति-प्लेट मूल्य जोड़ें। यहाँ प्रकाशित सब कुछ ग्राहकों को बुकिंग विज़ार्ड और वेंडर कैटलॉग में दिखता है।",
          )}
        </p>
      </Card>

      {/* Business basics */}
      <Card padding="none" className="p-5 sm:p-6">
        <h3 className="font-display text-base font-semibold text-ink">
          {t("Business Details", "बिज़नेस विवरण")}
        </h3>

        {/* Card photo */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-xl border border-cream-3 bg-cream-2">
            {image ? (
              <Image
                src={image}
                alt={t("Your card photo", "आपकी कार्ड फ़ोटो")}
                fill
                sizes="144px"
                className="object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-full w-full items-center justify-center text-2xl"
              >
                📷
              </span>
            )}
          </div>
          <div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onPhotoPick}
              className="sr-only"
              aria-label={t("Upload card photo", "कार्ड फ़ोटो अपलोड करें")}
            />
            <Button
              variant="secondary"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto
                ? t("Uploading…", "अपलोड हो रहा है…")
                : image
                  ? t("Change Photo", "फ़ोटो बदलें")
                  : t("Upload Photo", "फ़ोटो अपलोड करें")}
            </Button>
            <p className="mt-1.5 text-xs text-ink-soft">
              {t(
                "Shown on your card in the booking wizard and catalog. JPG, PNG or WebP, up to 5 MB.",
                "बुकिंग विज़ार्ड और कैटलॉग में आपके कार्ड पर दिखती है। JPG, PNG या WebP, अधिकतम 5 MB।",
              )}
            </p>
            {photoError && (
              <p role="alert" className="mt-1 text-xs font-semibold text-maroon">
                {photoError}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("Business Name", "बिज़नेस का नाम")}>
            <input
              type="text"
              value={business}
              onChange={(e) => {
                setBusiness(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </Field>
          <Field label={t("Base Price (₹ / plate)", "आधार मूल्य (₹ / प्लेट)")}>
            <input
              type="number"
              min={0}
              value={priceFrom}
              onChange={(e) => {
                setPriceFrom(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </Field>
          <Field label={t("City", "शहर")}>
            {/* The booking wizard matches caterers to the customer's event city
                by this exact name, so the serviceable list comes first — but a
                city we don't list yet can be typed in via "Other". A previously
                saved / application-prefilled city outside the list is kept as
                an extra option so nothing silently changes. */}
            {cityOther ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setSaved(false);
                  }}
                  placeholder={t("Type your city", "अपना शहर लिखें")}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => {
                    setCityOther(false);
                    setCity("");
                    setSaved(false);
                  }}
                  className="shrink-0 text-xs font-semibold text-maroon underline underline-offset-2"
                >
                  {t("Pick from list", "सूची से चुनें")}
                </button>
              </div>
            ) : (
              <select
                value={city}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next === OTHER_CITY) {
                    setCityOther(true);
                    setCity("");
                  } else {
                    setCity(next);
                  }
                  setSaved(false);
                }}
                className={inputClass}
              >
                <option value="" disabled>
                  {t("Select your city…", "अपना शहर चुनें…")}
                </option>
                {city && !locations.some((c) => c.name === city) && (
                  <option value={city}>{city}</option>
                )}
                {locations.map((c) => (
                  <option key={c.id} value={c.name}>
                    {t(c.name, c.nameHi)}
                  </option>
                ))}
                <option value={OTHER_CITY}>
                  {t("Other — add my city", "अन्य — मेरा शहर जोड़ें")}
                </option>
              </select>
            )}
            <span className="mt-1 block text-xs text-ink-soft">
              {t(
                "Customers booking an event in this city will see your menu.",
                "इस शहर में इवेंट बुक करने वाले ग्राहक आपका मेन्यू देखेंगे।",
              )}
            </span>
          </Field>
          <Field label={t("State", "राज्य")}>
            {/* Same deal as City — the catalog's State filter matches on this
                exact string, so free text ("Uttarpradesh") would hide the
                vendor. Any previously saved off-list value is kept as an extra
                option so nothing silently changes. */}
            <select
              value={stateName}
              onChange={(e) => {
                setStateName(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            >
              <option value="" disabled>
                {t("Select your state…", "अपना राज्य चुनें…")}
              </option>
              {stateName && !indianStates.includes(stateName) && (
                <option value={stateName}>{stateName}</option>
              )}
              {indianStates.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("Max Capacity (guests / event)", "अधिकतम क्षमता (मेहमान / इवेंट)")}>
            <input
              type="number"
              min={0}
              value={maxCapacity}
              onChange={(e) => {
                setMaxCapacity(e.target.value);
                setSaved(false);
              }}
              placeholder="2000"
              className={inputClass}
            />
          </Field>
          <Field label={t("Max Events / Day", "अधिकतम इवेंट / दिन")}>
            <input
              type="number"
              min={0}
              value={maxEventsPerDay}
              onChange={(e) => {
                setMaxEventsPerDay(e.target.value);
                setSaved(false);
              }}
              placeholder="3"
              className={inputClass}
            />
          </Field>
          <Field label={t("Google Rating (0–5)", "गूगल रेटिंग (0–5)")}>
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={googleRating}
              onChange={(e) => {
                setGoogleRating(e.target.value);
                setSaved(false);
              }}
              placeholder="4.6"
              className={inputClass}
            />
            <span className="mt-1 block text-xs text-ink-soft">
              {t(
                "Shown as a Google badge on your card. Leave blank to hide it.",
                "आपके कार्ड पर गूगल बैज के रूप में दिखता है। छिपाने के लिए खाली छोड़ें।",
              )}
            </span>
          </Field>
          <Field label={t("Google Reviews (count)", "गूगल रिव्यू (संख्या)")}>
            <input
              type="number"
              min={0}
              value={googleReviews}
              onChange={(e) => {
                setGoogleReviews(e.target.value);
                setSaved(false);
              }}
              placeholder="230"
              className={inputClass}
            />
          </Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {t("Cuisines", "व्यंजन शैलियाँ")}
            </span>
            <div className="-mx-5 flex flex-nowrap items-center gap-2 overflow-x-auto px-5 no-scrollbar sm:-mx-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
              {Array.from(
                new Set([...registrationCuisines, ...cuisines]),
              ).map((c) => (
                <Chip
                  key={c}
                  label={c}
                  active={cuisines.includes(c)}
                  onClick={() => {
                    setCuisines((prev) =>
                      prev.includes(c)
                        ? prev.filter((v) => v !== c)
                        : [...prev, c],
                    );
                    setSaved(false);
                  }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={cuisineDraft}
                onChange={(e) => setCuisineDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomCuisine();
                  }
                }}
                placeholder={t("Add another cuisine…", "एक और व्यंजन शैली जोड़ें…")}
                className={inputClass + " max-w-xs"}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={addCustomCuisine}
                disabled={!cuisineDraft.trim()}
              >
                + {t("Add", "जोड़ें")}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Gallery */}
      <Card padding="none" className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-ink">
              {t("Photo Gallery", "फ़ोटो गैलरी")} ({gallery.length}/{GALLERY_MAX})
            </h3>
            <p className="mt-0.5 text-xs text-ink-soft">
              {t(
                "Shown on your public page — your counters, plating and past events.",
                "आपके सार्वजनिक पेज पर दिखती है — आपके काउंटर, प्लेटिंग और पिछले इवेंट।",
              )}
            </p>
          </div>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onGalleryPick}
            className="sr-only"
            aria-label={t("Add gallery photo", "गैलरी फ़ोटो जोड़ें")}
          />
          <Button
            variant="secondary"
            onClick={() => galleryInputRef.current?.click()}
            disabled={uploadingGallery || gallery.length >= GALLERY_MAX}
          >
            {uploadingGallery
              ? t("Uploading…", "अपलोड हो रहा है…")
              : `+ ${t("Add Photo", "फ़ोटो जोड़ें")}`}
          </Button>
        </div>
        {gallery.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">
            {t(
              "No gallery photos yet. Caterers with real event photos win more bookings.",
              "अभी कोई गैलरी फ़ोटो नहीं। असली इवेंट फ़ोटो वाले कैटरर अधिक बुकिंग पाते हैं।",
            )}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {gallery.map((p) => (
              <div
                key={p.id}
                className="group/photo relative aspect-[4/3] overflow-hidden rounded-xl border border-cream-3 bg-cream-2"
              >
                <Image src={p.url} alt="" fill sizes="200px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => removeGalleryPhoto(p)}
                  aria-label={t("Remove photo", "फ़ोटो हटाएं")}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition hover:bg-maroon hover:text-cream"
                >
                  <span aria-hidden="true" className="leading-none">×</span>
                </button>
              </div>
            ))}
          </div>
        )}
        {galleryError && (
          <p role="alert" className="mt-2 text-xs font-semibold text-maroon">
            {galleryError}
          </p>
        )}
      </Card>

      {/* What the caterer sells, as one row of segment buttons — the three
          feast bands (Silver/Gold/Platinum, which together are Full Catering)
          plus the service categories. A segment's menu editor only exists once
          its button is ticked, so the form is exactly as long as what they
          actually offer. */}
      <Card padding="none" className="p-5 sm:p-6">
        <h3 className="font-display text-base font-semibold text-ink">
          {t("What You Sell", "आप क्या बेचते हैं")}
        </h3>
        <p className="mt-0.5 text-xs text-ink-soft">
          {t(
            "Tick every segment you serve — each one opens its own menu below, and customers browse and book by these.",
            "जो भी सेगमेंट आप देते हैं उन्हें टिक करें — हर एक का अपना मेन्यू नीचे खुलेगा, और ग्राहक इन्हीं से ब्राउज़ व बुक करते हैं।",
          )}
        </p>
        <div className="-mx-5 mt-4 flex flex-nowrap items-center gap-2 overflow-x-auto px-5 no-scrollbar sm:-mx-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
          {TIER_ORDER.map((tier) => (
            <Chip
              key={tier}
              label={`${tier} · ${TIER_BAND_HINTS[tier]}`}
              active={tiers.includes(tier)}
              onClick={() => toggleTier(tier)}
            />
          ))}
          {SEGMENT_CATEGORY_IDS.map((id) => {
            const c = cateringCategories.find((cat) => cat.id === id);
            if (!c) return null;
            return (
              <Chip
                key={c.id}
                label={`${c.icon} ${lang === "hi" ? c.nameHi : c.name}`}
                active={serviceCats.includes(c.id)}
                onClick={() => toggleServiceCat(c.id)}
              />
            );
          })}
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          {t(
            "Silver, Gold and Platinum are your feast bands — they share one plated menu and decide where your card sits in the catalog. Leave all three off and we place you by your prices.",
            "सिल्वर, गोल्ड और प्लैटिनम आपके फ़ीस्ट बैंड हैं — इनका प्लेटेड मेन्यू एक ही रहता है और इसी से कैटलॉग में आपके कार्ड की जगह तय होती है। तीनों खाली छोड़ने पर आपकी कीमतों से जगह तय होगी।",
          )}
        </p>
        {visibleCats.length === 0 && (
          <p className="mt-4 rounded-lg border border-dashed border-cream-3 bg-cream/40 px-3.5 py-3 text-xs text-ink-soft">
            {t(
              "Nothing ticked yet — pick a segment above and its menu appears here.",
              "अभी कुछ टिक नहीं है — ऊपर कोई सेगमेंट चुनें, उसका मेन्यू यहाँ दिखेगा।",
            )}
          </p>
        )}
        <div className="mt-4 space-y-3">
          {visibleCats.map((c) => {
            const open = openCat === c.id;
            return (
              <div
                key={c.id}
                className="overflow-hidden rounded-xl border border-maroon bg-maroon-soft/30 transition-colors"
              >
                <div className="flex items-start gap-3 px-3.5 py-2.5">
                  <button
                    type="button"
                    onClick={() => setOpenCat(open ? null : c.id)}
                    aria-expanded={open}
                    aria-controls={`cat-menu-${c.id}`}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <span aria-hidden="true" className="text-xl">{c.icon}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">
                        {lang === "hi" ? c.nameHi : c.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-soft">
                        {lang === "hi" ? c.blurbHi : c.blurb}
                      </span>
                      <span className="mt-1 block text-xs font-semibold text-maroon">
                        {categorySummary(c.id)}
                      </span>
                    </span>
                  </button>
                  {/* Ticking lives entirely in the segment bar above — this row
                      exists because the segment is on, so it only opens and
                      closes. */}
                  <button
                    type="button"
                    onClick={() => setOpenCat(open ? null : c.id)}
                    aria-expanded={open}
                    aria-controls={`cat-menu-${c.id}`}
                    className="shrink-0 whitespace-nowrap rounded-full px-1.5 text-[11px] font-semibold text-maroon transition hover:underline"
                  >
                    {open
                      ? t("Hide menu", "मेन्यू छिपाएं")
                      : t("Menu", "मेन्यू")}{" "}
                    <span aria-hidden="true">{open ? "▲" : "▼"}</span>
                  </button>
                </div>

                {open && (
                  <div
                    id={`cat-menu-${c.id}`}
                    className="space-y-3 border-t border-cream-3 bg-white px-3.5 py-4"
                  >
                    {/* Plated courses power both Full Catering feasts and
                        Single Stall bookings — the same dishes, priced two
                        ways: a per-plate course rate for feasts, an optional
                        per-delicacy rate for single stalls. */}
                    {c.id === "full-catering" && (
                      <>
                        {panelNote(
                          t(
                            "Plated courses served in your Silver–Platinum feast packages. Set a per-plate rate per course, then add its dishes.",
                            "आपके सिल्वर–प्लैटिनम फ़ीस्ट पैकेज में परोसे जाने वाले प्लेटेड कोर्स। हर कोर्स की प्रति-प्लेट दर तय करें, फिर उसकी डिश जोड़ें।",
                          ),
                        )}
                        {renderCourses(platedCats, offersSingleStall)}
                      </>
                    )}
                    {c.id === "single-stall" && (
                      <>
                        {panelNote(
                          t(
                            "Single Stall sells the same plated courses. For each course, choose a fixed menu — your whole spread, served as-is at the course's per-plate rate, with nothing for the customer to change — or a varied menu, where they pick delicacies and you price each one.",
                            "सिंगल स्टॉल वही प्लेटेड कोर्स बेचता है। हर कोर्स के लिए चुनें — तय मेन्यू, यानी आपका पूरा स्प्रेड कोर्स की प्रति-प्लेट दर पर वैसा ही परोसा जाए और ग्राहक कुछ न बदले; या चयन वाला मेन्यू, जिसमें ग्राहक डिश चुनते हैं और आप हर डिश की कीमत तय करते हैं।",
                          ),
                        )}
                        {renderCourses(platedCats, true)}
                      </>
                    )}
                    {c.id === "live-stall" && (
                      <>
                        {panelNote(
                          t(
                            "Live stations cooked in front of guests — Live Counters, Chaat, Chinese and South Indian. These power the Live Stall step of a booking and the Gold & Platinum feasts.",
                            "मेहमानों के सामने बनने वाले लाइव स्टेशन — लाइव काउंटर, चाट, चाइनीज़ और साउथ इंडियन। ये बुकिंग के लाइव स्टॉल चरण और गोल्ड व प्लैटिनम भोज में लगते हैं।",
                          ),
                        )}
                        {renderCourses(liveCats, false)}
                      </>
                    )}
                    {c.id === "baina-box" && bainaBoxPanel}
                    {c.id === "essential" && essentialPanel}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Signature dishes — the up-to-four "famous for" tags shown on the
          vendor's catalog card. The pool is the vendor's own live dishes, so a
          dish must exist in an active course before it can be featured. */}
      <Card padding="none" className="p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-base font-semibold text-ink">
            <span aria-hidden="true">⭐</span>{" "}
            {t("Signature Dishes", "सिग्नेचर डिश")}
          </h3>
          <span
            className={
              "text-xs font-semibold " +
              (validFeatured.length === FEATURED_COUNT
                ? "text-maroon"
                : "text-ink-soft")
            }
          >
            {validFeatured.length}/{FEATURED_COUNT}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-ink-soft">
          {t(
            "Pick exactly four dishes you're famous for — they show as tags on your brand card in the vendor catalogue.",
            "ठीक चार डिश चुनें जिनके लिए आप मशहूर हैं — ये वेंडर कैटलॉग में आपके ब्रांड कार्ड पर टैग के रूप में दिखेंगी।",
          )}
        </p>
        {featurablePool.length < FEATURED_COUNT ? (
          <p className="mt-4 rounded-lg border border-cream-3 bg-cream/40 px-3.5 py-3 text-xs text-ink-soft">
            {t(
              "Add at least four dishes to an active course above, then come back to choose your signature ones.",
              "ऊपर किसी सक्रिय कोर्स में कम से कम चार डिश जोड़ें, फिर अपनी सिग्नेचर डिश चुनने के लिए यहाँ लौटें।",
            )}
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {featurablePool.map((name) => {
                const on = validFeatured.includes(name);
                const capped = !on && validFeatured.length >= FEATURED_COUNT;
                return (
                  <Chip
                    key={name}
                    label={name}
                    active={on}
                    disabled={capped}
                    onClick={() => toggleFeatured(name)}
                  />
                );
              })}
            </div>
            <p className="mt-3 text-xs text-ink-soft">
              {validFeatured.length === FEATURED_COUNT
                ? t(
                    "Great — these four are featured on your card.",
                    "बढ़िया — ये चार आपके कार्ड पर फ़ीचर होंगी।",
                  )
                : validFeatured.length === 0
                  ? t(
                      "Tap four dishes to feature them (optional).",
                      "चार डिश टैप करके फ़ीचर करें (वैकल्पिक)।",
                    )
                  : t(
                      `${FEATURED_COUNT - validFeatured.length} more to go — feature exactly four, or none.`,
                      `${FEATURED_COUNT - validFeatured.length} और — ठीक चार फ़ीचर करें, या कोई नहीं।`,
                    )}
            </p>
          </>
        )}
      </Card>

      {/* Live counters & services — the same extras the /book wizard sells, so a
          vendor can advertise every counter/service they run at their own rate. */}
      <Card padding="none" className="p-5 sm:p-6">
        <h3 className="font-display text-base font-semibold text-ink">
          {t("Live Counters & Services", "लाइव काउंटर और सेवाएं")}
        </h3>
        <p className="mt-0.5 text-xs text-ink-soft">
          {t(
            "Tick everything you offer, set your own rate, then trim each counter's list to exactly what you serve. Shown on your public profile.",
            "जो भी आप देते हैं उसे चुनें, अपना रेट डालें, फिर हर काउंटर की सूची में से वही रखें जो आप परोसते हैं। आपके सार्वजनिक प्रोफ़ाइल पर दिखेगा।",
          )}
        </p>
        {(["counter", "service"] as const).map((group) => {
          const items = vendorOfferings.filter((o) => o.category === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="mt-4">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {group === "counter"
                  ? t("Live counters", "लाइव काउंटर")
                  : t("Services", "सेवाएं")}
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((o) => {
                  const on = o.id in counters;
                  // What this offering can serve (platform set menu) vs what
                  // the vendor has ticked. Services list inclusions, counters
                  // list dishes — same picker either way.
                  const setMenu = addOnMenu(o.id);
                  const picked = counterItems[o.id] ?? [];
                  const extras = counterExtras[o.id] ?? [];
                  const isService = o.category === "service";
                  const extrasFull = extras.length >= MAX_COUNTER_EXTRAS;
                  const paused = on && Boolean(counterHidden[o.id]);
                  // What this add-on actually costs right now: the vendor's own
                  // rate once they've typed one, otherwise the platform's. Shown
                  // on every row, ticked or not, so no add-on is ever priceless.
                  const rate = on
                    ? Number(counters[o.id]) > 0
                      ? Number(counters[o.id])
                      : o.price
                    : o.price;
                  const unit = o.perPlate
                    ? t("per plate", "प्रति प्लेट")
                    : t("flat fee", "एकमुश्त शुल्क");
                  return (
                    <div
                      key={o.id}
                      className={
                        "rounded-xl border transition-colors " +
                        (paused
                          ? "border-dashed border-maroon/40 bg-cream/40"
                          : on
                            ? "border-maroon bg-maroon-soft/30"
                            : "border-cream-3 bg-cream/40")
                      }
                    >
                      <div className="flex items-center gap-3 px-3.5 py-2.5">
                        <button
                          type="button"
                          onClick={() => toggleCounter(o.id, o.price)}
                          aria-pressed={on}
                          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                        >
                          <span aria-hidden="true" className="text-xl">{o.icon}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-ink">
                              {lang === "hi" ? o.nameHi : o.name}
                            </span>
                            <span className="block text-xs text-ink-soft">
                              {on
                                ? `${money(rate)} · ${unit}`
                                : `${t("from", "से")} ${money(o.price)} · ${unit}`}
                            </span>
                          </span>
                        </button>
                        {on && (
                          <div className="flex shrink-0 items-center gap-1">
                            <span className="text-sm text-ink-soft">₹</span>
                            <input
                              type="number"
                              min={0}
                              value={counters[o.id]}
                              onChange={(e) => setCounterPrice(o.id, e.target.value)}
                              placeholder={String(o.price)}
                              aria-label={`${o.name} ${t("price", "मूल्य")}`}
                              className="w-20 rounded-lg border border-cream-3 bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
                            />
                          </div>
                        )}
                      </div>

                      {/* Pause instead of untick — keeps the rate and the whole
                          spread saved while taking the add-on off every
                          customer surface. */}
                      {on && (
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-cream-3 px-3.5 py-2">
                          <span className="text-[11px] text-ink-soft">
                            {paused
                              ? t(
                                  "Hidden from customers — saved, not shown.",
                                  "ग्राहकों से छिपा — सहेजा है, दिख नहीं रहा।",
                                )
                              : t(
                                  "Live on your profile and in bookings.",
                                  "आपके प्रोफ़ाइल और बुकिंग में लाइव।",
                                )}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleCounterHidden(o.id)}
                            aria-pressed={paused}
                            className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-maroon transition hover:bg-maroon/5"
                          >
                            {paused ? t("Show", "दिखाएं") : t("Hide", "छिपाएं")}
                          </button>
                        </div>
                      )}

                      {/* The counter's own list — every item the /book wizard
                          can show under this counter, so a vendor declares the
                          exact spread instead of inheriting all of it. */}
                      {on && setMenu.length > 0 && (
                        <div className="border-t border-cream-3 px-3.5 pb-3 pt-2.5">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                              {isService
                                ? t("What you include", "आप क्या शामिल करते हैं")
                                : t("What you serve", "आप क्या परोसते हैं")}
                              {" · "}
                              {picked.length}/{setMenu.length}
                              {extras.length > 0 &&
                                ` + ${extras.length} ${t("yours", "आपके")}`}
                            </span>
                            {picked.length < setMenu.length && (
                              <button
                                type="button"
                                onClick={() => selectAllCounterItems(o.id)}
                                className="text-[11px] font-semibold text-maroon underline underline-offset-2"
                              >
                                {t("Select all", "सभी चुनें")}
                              </button>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {setMenu.map((m) => {
                              const itemOn = picked.includes(m.name);
                              return (
                                <button
                                  key={m.name}
                                  type="button"
                                  aria-pressed={itemOn}
                                  onClick={() => toggleCounterItem(o.id, m.name)}
                                  className={
                                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors " +
                                    (itemOn
                                      ? "border-maroon bg-maroon text-cream"
                                      : "border-cream-3 bg-white text-ink-soft")
                                  }
                                >
                                  {/* Veg / non-veg mark, in brand ink vs red —
                                      the same distinction the menu step draws. */}
                                  {m.diet && (
                                    <span
                                      aria-hidden="true"
                                      className={
                                        "grid h-3 w-3 shrink-0 place-items-center rounded-sm border " +
                                        (itemOn
                                          ? "border-cream"
                                          : m.diet === "veg"
                                            ? "border-ink"
                                            : "border-maroon")
                                      }
                                    >
                                      <span
                                        className={
                                          "block h-1 w-1 rounded-full " +
                                          (itemOn
                                            ? "bg-cream"
                                            : m.diet === "veg"
                                              ? "bg-ink"
                                              : "bg-maroon")
                                        }
                                      />
                                    </span>
                                  )}
                                  {lang === "hi" ? m.nameHi : m.name}
                                </button>
                              );
                            })}
                            {/* The vendor's own items sit in the same row as
                                the platform ones — customers read one list, so
                                the builder shows one list. Tap × to drop. */}
                            {extras.map((e) => (
                              <span
                                key={e.name}
                                className="inline-flex items-center gap-1.5 rounded-full border border-maroon bg-maroon px-2.5 py-1 text-[11px] font-medium text-cream"
                              >
                                {e.diet && (
                                  <span
                                    aria-hidden="true"
                                    className="grid h-3 w-3 shrink-0 place-items-center rounded-sm border border-cream"
                                  >
                                    <span className="block h-1 w-1 rounded-full bg-cream" />
                                  </span>
                                )}
                                {e.name}
                                <button
                                  type="button"
                                  onClick={() => removeCounterExtra(o.id, e.name)}
                                  aria-label={`${t("Remove", "हटाएं")} ${e.name}`}
                                  className="-mr-0.5 text-sm leading-none text-cream"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>

                          {/* Add your own — anything this vendor serves on the
                              counter that the platform list never named. */}
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            <input
                              type="text"
                              value={extraDraft[o.id] ?? ""}
                              onChange={(ev) =>
                                setExtraDraft((prev) => ({
                                  ...prev,
                                  [o.id]: ev.target.value,
                                }))
                              }
                              onKeyDown={(ev) => {
                                if (ev.key !== "Enter") return;
                                ev.preventDefault();
                                addCounterExtra(o.id, isService);
                              }}
                              disabled={extrasFull}
                              maxLength={80}
                              placeholder={
                                extrasFull
                                  ? t(
                                      `Limit ${MAX_COUNTER_EXTRAS} reached`,
                                      `अधिकतम ${MAX_COUNTER_EXTRAS} तक`,
                                    )
                                  : isService
                                    ? t("Add your own inclusion", "अपना आइटम जोड़ें")
                                    : t("Add your own dish", "अपनी डिश जोड़ें")
                              }
                              aria-label={`${o.name} — ${t("add your own item", "अपना आइटम जोड़ें")}`}
                              className="min-w-0 flex-1 rounded-lg border border-cream-3 bg-white px-2.5 py-1.5 text-[11px] text-ink outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30 disabled:opacity-50"
                            />
                            {/* Counters carry a veg / non-veg mark; service
                                inclusions don't, so the toggle stays hidden. */}
                            {!isService &&
                              (["veg", "non-veg"] as const).map((d) => {
                                const dietOn = (extraDiet[o.id] ?? "veg") === d;
                                return (
                                  <button
                                    key={d}
                                    type="button"
                                    aria-pressed={dietOn}
                                    disabled={extrasFull}
                                    onClick={() =>
                                      setExtraDiet((prev) => ({
                                        ...prev,
                                        [o.id]: d,
                                      }))
                                    }
                                    className={
                                      "rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50 " +
                                      (dietOn
                                        ? "border-maroon bg-maroon text-cream"
                                        : "border-cream-3 bg-white text-ink-soft")
                                    }
                                  >
                                    {d === "veg"
                                      ? t("Veg", "शाकाहारी")
                                      : t("Non-veg", "मांसाहारी")}
                                  </button>
                                );
                              })}
                            <button
                              type="button"
                              onClick={() => addCounterExtra(o.id, isService)}
                              disabled={
                                extrasFull || !(extraDraft[o.id] ?? "").trim()
                              }
                              className="rounded-lg border border-maroon bg-white px-3 py-1.5 text-[11px] font-semibold text-maroon transition-colors hover:bg-maroon hover:text-cream disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-maroon"
                            >
                              {t("Add", "जोड़ें")}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Card>

      {/* Save bar */}
      <Card padding="none" className="flex flex-wrap items-center gap-4 p-5">
        <Button
          variant="primary"
          onClick={onSave}
          disabled={saving}
        >
          {saving
            ? t("Publishing…", "प्रकाशित हो रहा है…")
            : t("Save & Publish Menu", "मेन्यू सहेजें और प्रकाशित करें")}
        </Button>
        <span className="text-sm text-ink-soft">
          {publishedDishes}{" "}
          {t("dishes across", "डिश,")}{" "}
          {Object.values(sections).filter((x) => x.enabled).length}{" "}
          {t("courses", "कोर्स में")}
        </span>
        {saved && (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 rounded-full bg-cream-2 px-3.5 py-1.5 text-sm font-medium text-ink"
          >
            <span aria-hidden="true" className="text-maroon">✓</span>
            {t(
              "Published — customers can now see your menu.",
              "प्रकाशित — ग्राहक अब आपका मेन्यू देख सकते हैं।",
            )}
          </span>
        )}
        {saveError && (
          <span role="alert" className="text-sm font-semibold text-maroon">
            {saveError}
          </span>
        )}
      </Card>
    </div>
  );
}

/* ── One course/category editor ─────────────────────────────────────────── */

function CategorySection({
  icon,
  name,
  blurb,
  suggestions,
  section,
  onToggle,
  onPerPlate,
  onAddItem,
  onRemoveItem,
  onToggleDiet,
  onUploadItemPhoto,
  priceable = false,
  onItemPrice,
  onMenuType,
  bands,
  bandsDerived,
  platformItems,
  onTierItems,
  onTierPerPlate,
  onToggleItemTier,
}: {
  icon: string;
  name: string;
  blurb: string;
  suggestions: DraftItem[];
  section: DraftSection;
  onToggle: () => void;
  onPerPlate: (v: string) => void;
  onAddItem: (item: DraftItem) => void;
  onRemoveItem: (index: number) => void;
  onToggleDiet: (index: number) => void;
  onUploadItemPhoto: (index: number, file: File) => Promise<string | null>;
  /** Single Stall vendors choose a menu style here, and a varied one prices
   *  each dish — shows the fixed/varied switch and the per-dish ₹ fields. */
  priceable?: boolean;
  onItemPrice?: (index: number, value: string) => void;
  onMenuType?: (value: SingleStallMenuType) => void;
  /** Feast bands the vendor sells — the per-band row is drawn for these only,
   *  so a Silver-only caterer isn't asked about Platinum. */
  bands: VendorTier[];
  /** True when those bands came from the vendor's prices rather than their own
   *  choice — said out loud, so the numbers don't look like someone else's. */
  bandsDerived: boolean;
  /** Platform dish counts for this course, per band — shown as the placeholder
   *  so a blank field visibly means "use ours". */
  platformItems: Partial<Record<VendorTier, number>>;
  onTierItems: (tier: VendorTier, value: string) => void;
  onTierPerPlate: (tier: VendorTier, value: string) => void;
  onToggleItemTier: (index: number, tier: VendorTier) => void;
}) {
  const { t } = useLang();
  const [draftName, setDraftName] = useState("");
  const [draftDiet, setDraftDiet] = useState<DietType>("veg");
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  /** A served course opens by default; collapsing leaves just its rate and
   *  dish count on the header, so a long menu stays scannable. */
  const [collapsed, setCollapsed] = useState(false);

  /** Per-dish ₹ fields only make sense on a varied Single Stall — a fixed menu
   *  charges one per-plate rate for the whole spread. */
  const perDishPricing = priceable && section.menuType === "varied";

  // Per-dish photo picker: one hidden input, retargeted to the dish whose
  // camera button was tapped.
  const dishPhotoInputRef = useRef<HTMLInputElement>(null);
  const [photoTarget, setPhotoTarget] = useState<number | null>(null);
  const [dishPhotoError, setDishPhotoError] = useState("");
  const [uploadingDish, setUploadingDish] = useState(false);

  const onDishPhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || photoTarget === null) return;
    setDishPhotoError("");
    setUploadingDish(true);
    const err = await onUploadItemPhoto(photoTarget, file);
    if (err) setDishPhotoError(err);
    setUploadingDish(false);
    setPhotoTarget(null);
  };

  const SUGGESTIONS_COLLAPSED = 10;
  const remaining = suggestions.filter(
    (s) =>
      !section.items.some((i) => i.name.toLowerCase() === s.name.toLowerCase()),
  );
  const visibleSuggestions = showAllSuggestions
    ? remaining
    : remaining.slice(0, SUGGESTIONS_COLLAPSED);

  const submitDraft = () => {
    if (!draftName.trim()) return;
    onAddItem({ name: draftName, diet: draftDiet });
    setDraftName("");
  };

  return (
    <div
      className={
        "rounded-card border bg-white p-5 shadow-card transition sm:p-6 " +
        (section.enabled ? "border-maroon" : "border-cream-3")
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream text-lg">
            <span aria-hidden="true">{icon}</span>
          </span>
          <div>
            <h3 className="font-display text-base font-semibold text-ink">{name}</h3>
            <p className="text-xs text-ink-soft">{blurb}</p>
            {/* Rate + dish count stay on the header, so a collapsed course
                still shows what it costs. */}
            {section.enabled && (
              <p className="mt-0.5 text-xs font-semibold text-maroon">
                {Number(section.perPlate) > 0
                  ? `${money(Number(section.perPlate))} / ${t("plate", "प्लेट")}`
                  : t("No rate set", "दर तय नहीं")}
                {" · "}
                {section.items.length}{" "}
                {t(section.items.length === 1 ? "dish" : "dishes", "डिश")}
                {/* Single Stall style rides the header too, so a collapsed
                    course still shows whether customers can customise it. */}
                {priceable && (
                  <>
                    {" · "}
                    {section.menuType === "varied"
                      ? t("varied menu", "चयन वाला मेन्यू")
                      : t("fixed menu", "तय मेन्यू")}
                  </>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {section.enabled && (
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              aria-expanded={!collapsed}
              className="whitespace-nowrap rounded-full px-2 py-1.5 text-xs font-semibold text-maroon transition hover:bg-maroon/5"
            >
              {collapsed ? t("Show", "दिखाएं") : t("Hide", "छिपाएं")}{" "}
              <span aria-hidden="true">{collapsed ? "▼" : "▲"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              // Turning a course back on always reveals its dishes.
              if (!section.enabled) setCollapsed(false);
              onToggle();
            }}
            aria-pressed={section.enabled}
            className={
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors " +
              (section.enabled
                ? "bg-maroon text-cream"
                : "bg-cream-2 text-ink-soft hover:bg-cream-3")
            }
          >
            {section.enabled
              ? `✓ ${t("Serving", "परोसा जा रहा")}`
              : t("I serve this", "मैं यह परोसता हूँ")}
          </button>
        </div>
      </div>

      {!section.enabled && section.items.length > 0 && (
        <p className="mt-3 text-xs text-ink-soft">
          {t(
            `${section.items.length} saved ${section.items.length === 1 ? "dish is" : "dishes are"} paused — hidden from customers until you turn this course back on.`,
            `${section.items.length} सहेजी गई डिश रुकी हुई हैं — जब तक आप यह कोर्स फिर चालू नहीं करते, ग्राहकों से छिपी रहेंगी।`,
          )}
        </p>
      )}

      {section.enabled && !collapsed && (
        <div className="mt-5 space-y-4">
          <div className="max-w-xs">
            <Field
              label={t(
                "Per-plate add-on (₹, on top of package base)",
                "प्रति-प्लेट ऐड-ऑन (₹, पैकेज बेस के ऊपर)",
              )}
            >
              <input
                type="number"
                min={0}
                value={section.perPlate}
                onChange={(e) => onPerPlate(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          {/* Single Stall menu style — the one decision that says whether a
              customer may customise this stall. Fixed (the default) serves the
              whole spread at the per-plate rate above; varied hands them the
              dish picker and bills per delicacy. Only shown to caterers who
              actually sell Single Stall; the feast bands always run on the
              per-band dish count below, whichever style is picked. */}
          {priceable && onMenuType && (
            <fieldset className="rounded-xl border border-cream-3 bg-cream/40 p-3.5">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {t("Single Stall menu", "सिंगल स्टॉल मेन्यू")}
              </legend>
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                {(
                  [
                    {
                      value: "fixed" as const,
                      label: t("Fixed menu", "तय मेन्यू"),
                      hint: t(
                        "Every dish below is served. Customers can't change it, and you charge the per-plate rate above for the whole spread.",
                        "नीचे की हर डिश परोसी जाएगी। ग्राहक इसे बदल नहीं सकते, और पूरे स्प्रेड के लिए आप ऊपर वाली प्रति-प्लेट दर लेते हैं।",
                      ),
                    },
                    {
                      value: "varied" as const,
                      label: t("Varied menu", "चयन वाला मेन्यू"),
                      hint: t(
                        "Customers pick the delicacies they want and pay for each. Set a price per dish below.",
                        "ग्राहक अपनी पसंद की डिश चुनते हैं और हर डिश का भुगतान करते हैं। नीचे हर डिश की कीमत डालें।",
                      ),
                    },
                  ] satisfies {
                    value: SingleStallMenuType;
                    label: string;
                    hint: string;
                  }[]
                ).map((opt) => {
                  const on = section.menuType === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={
                        "flex cursor-pointer items-start gap-2.5 rounded-lg border bg-white p-3 transition " +
                        (on
                          ? "border-maroon ring-1 ring-maroon/30"
                          : "border-cream-3 hover:border-maroon")
                      }
                    >
                      <input
                        type="radio"
                        name={`menu-type-${name}`}
                        value={opt.value}
                        checked={on}
                        onChange={() => onMenuType(opt.value)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-maroon"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">
                          {opt.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-soft">
                          {opt.hint}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* Per-band row — the caterer's own answer to "how many starters does
              Silver get, and what does that cost?". A blank count keeps the
              platform number for that band and a blank rate bills the flat rate
              above; 0 dishes takes this course off the band entirely. Only the
              bands they're actually browsed in are shown. */}
          {bands.length > 0 && (
            <div className="rounded-xl border border-cream-3 bg-cream/40 p-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {t("Your bands", "आपके बैंड")}
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {t(
                  "How many dishes a guest picks from this course on each band, and what you charge there. Leave the count blank to use ours and the rate blank to charge your flat rate; put 0 dishes to drop this course from a band.",
                  "हर बैंड पर ग्राहक इस कोर्स से कितनी डिश चुनेगा, और वहाँ आप क्या लेते हैं। हमारी संख्या के लिए गिनती खाली छोड़ें और अपनी सामान्य दर के लिए रेट खाली छोड़ें; किसी बैंड से यह कोर्स हटाने के लिए 0 डिश डालें।",
                )}
              </p>
              {/* Bands nobody picked are our guess from their prices — say so,
                  or the numbers read as someone else's decision. */}
              {bandsDerived && (
                <p className="mt-1.5 text-xs text-ink-soft">
                  {t(
                    "You haven't chosen your bands, so we place you by your prices. Pick them under Segments to change this.",
                    "आपने अपने बैंड नहीं चुने हैं, इसलिए हम आपकी कीमतों के आधार पर तय करते हैं। बदलने के लिए सेगमेंट में चुनें।",
                  )}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-3">
                {bands.map((tier) => {
                  const raw = section.tierItems[tier] ?? "";
                  const off = raw.trim() !== "" && Number(raw) === 0;
                  // Dishes this band can actually be offered — a dish kept off
                  // the band doesn't count towards filling its quota.
                  const available = section.items.filter((it) =>
                    dishOnTier(it, tier),
                  ).length;
                  const asked = raw.trim() === ""
                    ? (platformItems[tier] ?? 1)
                    : Number(raw);
                  const short = !off && asked > available;
                  return (
                    <div
                      key={tier}
                      className={
                        "flex min-w-0 flex-col gap-1.5 rounded-lg border bg-white px-2.5 py-2 " +
                        (short ? "border-maroon" : "border-cream-3")
                      }
                    >
                      <span
                        className={
                          "text-xs font-semibold " +
                          (off ? "text-ink-soft line-through" : "text-ink")
                        }
                      >
                        {tier}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={24}
                          value={raw}
                          onChange={(e) => onTierItems(tier, e.target.value)}
                          placeholder={String(platformItems[tier] ?? 1)}
                          aria-label={t(
                            `${tier} dishes from ${name}`,
                            `${name} से ${tier} डिश`,
                          )}
                          className="w-14 rounded-md border border-cream-3 bg-cream/40 px-2 py-1 text-sm text-ink outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
                        />
                        <span className="text-[11px] text-ink-soft">
                          {t("dishes", "डिश")}
                        </span>
                        <span aria-hidden="true" className="text-ink-soft/60">
                          ·
                        </span>
                        <span className="text-[11px] text-ink-soft">₹</span>
                        <input
                          type="number"
                          min={0}
                          value={section.tierPerPlate[tier] ?? ""}
                          onChange={(e) => onTierPerPlate(tier, e.target.value)}
                          placeholder={section.perPlate || "0"}
                          disabled={off}
                          aria-label={t(
                            `${tier} per-plate rate for ${name}`,
                            `${name} के लिए ${tier} प्रति-प्लेट दर`,
                          )}
                          className="w-16 rounded-md border border-cream-3 bg-cream/40 px-2 py-1 text-sm text-ink outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30 disabled:opacity-40"
                        />
                        <span className="text-[11px] text-ink-soft">
                          /{t("plate", "प्लेट")}
                        </span>
                      </div>
                      {/* A count nobody can fill leaves the guest stuck at
                          "4 of 6 picked" with nothing left to tap, so it's
                          flagged on the exact band it applies to. */}
                      {short && (
                        <span className="text-[11px] font-semibold text-maroon">
                          {t(
                            `Only ${available} dish${available === 1 ? "" : "es"} on ${tier} — add more or we'll serve ${available}.`,
                            `${tier} पर सिर्फ़ ${available} डिश हैं — और जोड़ें, वरना ${available} ही परोसी जाएँगी।`,
                          )}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {bands.some(
                (tier) =>
                  (section.tierItems[tier] ?? "").trim() !== "" &&
                  Number(section.tierItems[tier]) === 0,
              ) && (
                <p className="mt-2 text-xs font-semibold text-maroon">
                  {t(
                    "Bands set to 0 won't show this course — customers on those bands won't see you here.",
                    "0 वाले बैंड पर यह कोर्स नहीं दिखेगा — उन बैंड के ग्राहक आपको यहाँ नहीं देखेंगे।",
                  )}
                </p>
              )}
            </div>
          )}

          {/* Dishes */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {t("Dishes", "डिश")} ({section.items.length}/24)
            </p>
            {priceable && (
              <p className="mb-2 text-xs text-ink-soft">
                {perDishPricing
                  ? t(
                      "Your Single Stall is a varied menu — set a ₹ price per plate for any delicacy (optional; blank uses this course's per-plate rate).",
                      "आपका सिंगल स्टॉल चयन वाला मेन्यू है — किसी भी डिश के लिए प्रति-प्लेट ₹ मूल्य डालें (वैकल्पिक; खाली रहने पर इस कोर्स की प्रति-प्लेट दर लगेगी)।",
                    )
                  : t(
                      "Your Single Stall is a fixed menu — every dish here is served to every guest at the per-plate rate above, so there's nothing to price individually.",
                      "आपका सिंगल स्टॉल तय मेन्यू है — यहाँ की हर डिश हर मेहमान को ऊपर वाली प्रति-प्लेट दर पर परोसी जाएगी, इसलिए अलग कीमत डालने की ज़रूरत नहीं।",
                    )}
              </p>
            )}
            {bands.length > 1 && section.items.length > 0 && (
              <p className="mb-2 text-xs text-ink-soft">
                {t(
                  `Every dish is served on all your bands (${bands.map((b) => b.charAt(0)).join(" · ")}). Tap a letter to keep a dish off that band — a premium delicacy can stay Platinum-only.`,
                  `हर डिश आपके सभी बैंड (${bands.map((b) => b.charAt(0)).join(" · ")}) पर परोसी जाती है। किसी बैंड से हटाने के लिए उस अक्षर पर टैप करें — कोई ख़ास डिश सिर्फ़ प्लैटिनम पर रखी जा सकती है।`,
                )}
              </p>
            )}
            {section.items.length === 0 ? (
              <p className="text-sm text-ink-soft">
                {t(
                  "No dishes yet — add your first below. Courses without dishes stay hidden from customers.",
                  "अभी कोई डिश नहीं — नीचे पहली डिश जोड़ें। बिना डिश वाले कोर्स ग्राहकों से छिपे रहते हैं।",
                )}
              </p>
            ) : (
              <>
              <input
                ref={dishPhotoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onDishPhotoPick}
                className="sr-only"
                aria-label={t("Upload dish photo", "डिश फ़ोटो अपलोड करें")}
              />
              <ul className="flex flex-wrap gap-2">
                {section.items.map((it, i) => (
                  <li
                    key={`${it.name}-${i}`}
                    className="flex items-center gap-2 rounded-full border border-cream-3 bg-cream/40 py-1.5 pl-1.5 pr-1.5 text-sm text-ink"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoTarget(i);
                        dishPhotoInputRef.current?.click();
                      }}
                      disabled={uploadingDish}
                      title={
                        it.photo
                          ? t("Change dish photo", "डिश फ़ोटो बदलें")
                          : t("Add dish photo", "डिश फ़ोटो जोड़ें")
                      }
                      aria-label={
                        it.photo
                          ? t(`Change photo for ${it.name}`, `${it.name} की फ़ोटो बदलें`)
                          : t(`Add photo for ${it.name}`, `${it.name} की फ़ोटो जोड़ें`)
                      }
                      className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cream-3 bg-white text-xs transition hover:border-maroon disabled:cursor-not-allowed"
                    >
                      {it.photo ? (
                        <Image src={it.photo} alt="" fill sizes="28px" className="object-cover" />
                      ) : (
                        <span aria-hidden="true">
                          {uploadingDish && photoTarget === i ? "…" : "📷"}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleDiet(i)}
                      title={
                        it.diet === "veg"
                          ? t("Veg — tap to mark Non-Veg", "वेज — नॉन-वेज करने हेतु टैप करें")
                          : t("Non-Veg — tap to mark Veg", "नॉन-वेज — वेज करने हेतु टैप करें")
                      }
                      aria-label={
                        it.diet === "veg"
                          ? t(`${it.name}: Veg`, `${it.name}: वेज`)
                          : t(`${it.name}: Non-Veg`, `${it.name}: नॉन-वेज`)
                      }
                      className="flex h-5 w-5 items-center justify-center rounded border border-cream-3 bg-white"
                    >
                      <span
                        aria-hidden="true"
                        className={
                          "inline-block h-2.5 w-2.5 rounded-sm border " +
                          (it.diet === "veg" ? "border-ink" : "border-maroon bg-maroon")
                        }
                      />
                    </button>
                    {it.name}
                    {perDishPricing && (
                      <span className="flex items-center gap-0.5">
                        <span className="text-xs text-ink-soft">₹</span>
                        <input
                          type="number"
                          min={0}
                          value={it.price ?? ""}
                          onChange={(e) => onItemPrice?.(i, e.target.value)}
                          placeholder={t("price", "मूल्य")}
                          aria-label={t(
                            `Single Stall price for ${it.name}`,
                            `${it.name} के लिए सिंगल स्टॉल मूल्य`,
                          )}
                          className="w-16 rounded-full border border-cream-3 bg-white px-2 py-1 text-xs text-ink outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
                        />
                      </span>
                    )}
                    {/* Which bands serve this dish. A capped count alone can't
                        say "my raan is Platinum only" — without this, a Silver
                        guest picks a premium delicacy at the Silver rate. Every
                        dish starts on every band; tap a letter to take it off
                        one. Pointless for a single-band caterer, so hidden. */}
                    {bands.length > 1 && (
                      <span
                        role="group"
                        aria-label={t(
                          `Bands serving ${it.name}`,
                          `${it.name} किन बैंड पर`,
                        )}
                        className="flex items-center gap-0.5"
                      >
                        {bands.map((tier) => {
                          const on = dishOnTier(it, tier);
                          return (
                            <button
                              key={tier}
                              type="button"
                              onClick={() => onToggleItemTier(i, tier)}
                              aria-pressed={on}
                              title={t(
                                on
                                  ? `Served on ${tier} — tap to remove`
                                  : `Not on ${tier} — tap to serve`,
                                on
                                  ? `${tier} पर परोसा जाता है — हटाने हेतु टैप करें`
                                  : `${tier} पर नहीं — जोड़ने हेतु टैप करें`,
                              )}
                              aria-label={t(
                                `${it.name} on ${tier}`,
                                `${it.name} — ${tier}`,
                              )}
                              className={
                                "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold transition " +
                                (on
                                  ? "border-maroon bg-maroon text-cream"
                                  : "border-cream-3 bg-white text-ink-soft hover:border-maroon")
                              }
                            >
                              {tier.charAt(0)}
                            </button>
                          );
                        })}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveItem(i)}
                      aria-label={t(`Remove ${it.name}`, `${it.name} हटाएं`)}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-ink-soft transition hover:bg-cream-2 hover:text-maroon"
                    >
                      <span aria-hidden="true" className="leading-none">×</span>
                    </button>
                  </li>
                ))}
              </ul>
              </>
            )}
            {dishPhotoError && (
              <p role="alert" className="mt-2 text-xs font-semibold text-maroon">
                {dishPhotoError}
              </p>
            )}
          </div>

          {/* Popular picks — tap to add */}
          {remaining.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {t("Popular picks — tap to add", "लोकप्रिय विकल्प — जोड़ने के लिए टैप करें")}
              </p>
              <div className="-mx-5 flex flex-nowrap items-center gap-2 overflow-x-auto px-5 no-scrollbar sm:-mx-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
                {visibleSuggestions.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => onAddItem(s)}
                    disabled={section.items.length >= 24}
                    className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-cream-3 bg-white px-3.5 py-1.5 text-sm text-ink-soft transition hover:border-maroon hover:text-maroon disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span
                      aria-hidden="true"
                      className={
                        "inline-block h-2.5 w-2.5 rounded-sm border " +
                        (s.diet === "veg" ? "border-ink" : "border-maroon bg-maroon")
                      }
                    />
                    + {s.name}
                  </button>
                ))}
                {remaining.length > SUGGESTIONS_COLLAPSED && (
                  <button
                    type="button"
                    onClick={() => setShowAllSuggestions((v) => !v)}
                    className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
                  >
                    {showAllSuggestions
                      ? t("Show fewer", "कम दिखाएं")
                      : t(
                          `+ ${remaining.length - SUGGESTIONS_COLLAPSED} more`,
                          `+ ${remaining.length - SUGGESTIONS_COLLAPSED} और`,
                        )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Add a dish */}
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitDraft();
                }
              }}
              placeholder={t("Dish name, e.g. Paneer Tikka", "डिश का नाम, जैसे पनीर टिक्का")}
              className={inputClass + " max-w-xs"}
            />
            {/* Veg and Non-Veg both stand on the row as their own button — a
                single flip-flop label never says whether it's showing what the
                dish IS or what tapping would make it. */}
            <div
              role="radiogroup"
              aria-label={t("Dish type", "डिश का प्रकार")}
              className="flex items-center gap-2"
            >
              {(["veg", "non-veg"] as DietType[]).map((diet) => {
                const on = draftDiet === diet;
                return (
                  <button
                    key={diet}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setDraftDiet(diet)}
                    className={
                      "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition " +
                      (on
                        ? "border-maroon bg-maroon text-cream"
                        : "border-cream-3 bg-white text-ink-soft hover:border-maroon")
                    }
                  >
                    <span
                      aria-hidden="true"
                      className={
                        "inline-block h-2.5 w-2.5 rounded-sm border " +
                        (diet === "veg"
                          ? on
                            ? "border-cream"
                            : "border-ink"
                          : on
                            ? "border-cream bg-cream"
                            : "border-maroon bg-maroon")
                      }
                    />
                    {diet === "veg" ? t("Veg", "वेज") : t("Non-Veg", "नॉन-वेज")}
                  </button>
                );
              })}
            </div>
            <Button
              variant="secondary"
              onClick={submitDraft}
              disabled={!draftName.trim() || section.items.length >= 24}
            >
              + {t("Add Dish", "डिश जोड़ें")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
  disabled = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={
        "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 " +
        (active
          ? "bg-maroon text-cream"
          : "bg-cream-2 text-ink-soft hover:bg-cream-3")
      }
    >
      {label}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </span>
      {children}
    </label>
  );
}
