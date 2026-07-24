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
  cateringCategories,
  cities,
  isLiveStallCategory,
  menuCategories,
  registrationCuisines,
  servicePackages,
  vendorOfferings,
  type DietType,
} from "@/lib/data";
import type {
  ModerationStatus,
  VendorBainaBox,
  VendorCounter,
  VendorEssentialService,
  VendorMenuSection,
} from "@/lib/vendorMenus";
import { TIER_ORDER, type VendorTier } from "@/lib/admin/types";
import { money } from "@/lib/money";
import { useLang } from "@/lib/i18n";
import { Button, Card } from "@/components/ui";

const GALLERY_MAX = 8;

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
}

interface GalleryPhoto {
  id: string;
  url: string;
}

interface DraftSection {
  enabled: boolean;
  perPlate: string;
  items: DraftItem[];
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

const emptySections = (): Record<string, DraftSection> =>
  Object.fromEntries(
    menuCategories.map((c) => [
      c.id,
      { enabled: false, perPlate: "", items: [] as DraftItem[] },
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

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  /** Whether a saved (live) profile exists on the server yet. */
  const [isLive, setIsLive] = useState(false);

  const [business, setBusiness] = useState("");
  const [city, setCity] = useState("");
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
  // Catering categories served — the same offering types customers browse on
  // the frontend (full catering, single stall, live stall, baina box, …).
  const [serviceCats, setServiceCats] = useState<string[]>([]);
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
            }
            // Categories likewise carry over from the saved profile or, first
            // time in, from the registration application.
            if (src.serviceCategories) setServiceCats(src.serviceCategories);
            // Signature dishes carry over from the saved profile (a first-time
            // application has none). Reconciled against live dishes on render.
            if (src.featured) setFeatured(src.featured);
            // Tiers: saved selection, or the review/price-derived prefill.
            if (src.tiers?.length) setTiers(src.tiers);
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
                  })),
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

  // A vendor who sells the Single Stall category can price each delicacy
  // individually — the plated-course dishes gain an optional per-dish ₹ field;
  // a blank one falls back to the course per-plate rate.
  const offersSingleStall = serviceCats.includes("single-stall");

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
  // price with the platform default so it's editable but never blank.
  const toggleCounter = (id: string, defaultPrice: number) => {
    setCounters((prev) => {
      const next = { ...prev };
      if (id in next) delete next[id];
      else next[id] = String(defaultPrice);
      return next;
    });
    setSaved(false);
  };

  const setCounterPrice = (id: string, value: string) => {
    setCounters((prev) => ({ ...prev, [id]: value }));
    setSaved(false);
  };

  const toggleServiceCat = (id: string) => {
    setServiceCats((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
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
            })),
            ...(sections[c.id].enabled ? {} : { hidden: true }),
          })),
        // Signature dishes — reconciled to live dishes; empty means "none".
        featured: validFeatured,
        // Only send offerings the vendor still recognises; an own-price is
        // optional (blank falls back to the platform default server-side).
        counters: vendorOfferings
          .filter((o) => o.id in counters)
          .map((o) => {
            const price = Number(counters[o.id]);
            return { id: o.id, ...(price > 0 ? { price } : {}) };
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
            {/* Platform cities only — the booking wizard matches caterers to
                the customer's event city by this exact name. A previously
                saved / application-prefilled city outside the list is kept as
                an extra option so nothing silently changes. */}
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            >
              <option value="" disabled>
                {t("Select your city…", "अपना शहर चुनें…")}
              </option>
              {city && !cities.some((c) => c.name === city) && (
                <option value={city}>{city}</option>
              )}
              {cities.map((c) => (
                <option key={c.id} value={c.name}>
                  {t(c.name, c.nameHi)}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-ink-soft">
              {t(
                "Customers booking an event in this city will see your menu.",
                "इस शहर में इवेंट बुक करने वाले ग्राहक आपका मेन्यू देखेंगे।",
              )}
            </span>
          </Field>
          <Field label={t("State", "राज्य")}>
            <input
              type="text"
              value={stateName}
              onChange={(e) => {
                setStateName(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
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

          {/* Marketplace tiers — self-placement into the Silver/Gold/Platinum
              bands. Drives the /vendors catalog card and the tier lens the
              /book wizard applies per course — including the Single Stall
              flow's tier picker. */}
          <div className="sm:col-span-2 lg:col-span-3">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {t("Marketplace Tiers", "मार्केटप्लेस टियर")}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {TIER_ORDER.map((tier) => (
                <Chip
                  key={tier}
                  label={`${tier} · ${TIER_BAND_HINTS[tier]}`}
                  active={tiers.includes(tier)}
                  onClick={() => {
                    setTiers((prev) =>
                      prev.includes(tier)
                        ? prev.filter((v) => v !== tier)
                        : [...prev, tier],
                    );
                    setSaved(false);
                  }}
                />
              ))}
            </div>
            <span className="mt-1.5 block text-xs text-ink-soft">
              {t(
                "Pick every band you serve. This places your card in the vendor catalog and decides which tier shows your stalls in the Single Stall booking flow. Leave all off to be placed automatically by your prices.",
                "जिन बैंड में आप सेवा देते हैं वे सभी चुनें। इसी से वेंडर कैटलॉग में आपका कार्ड और Single Stall बुकिंग में आपके स्टॉल का टियर तय होता है। सभी खाली छोड़ने पर आपकी कीमतों से अपने-आप तय होगा।",
              )}
            </span>
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

      {/* Catering categories — the same offering types the customer frontend
          sells (feast packages, single stall, live stall, baina box, essential
          service), declared here so the backend entry mirrors the storefront. */}
      <Card padding="none" className="p-5 sm:p-6">
        <h3 className="font-display text-base font-semibold text-ink">
          {t("Catering Categories", "कैटरिंग श्रेणियां")}
        </h3>
        <p className="mt-0.5 text-xs text-ink-soft">
          {t(
            "Pick everything you offer — customers browse and book by these categories.",
            "जो भी आप देते हैं उसे चुनें — ग्राहक इन्हीं श्रेणियों से ब्राउज़ और बुक करते हैं।",
          )}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {cateringCategories.map((c) => {
            const on = serviceCats.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleServiceCat(c.id)}
                className={
                  "flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors " +
                  (on
                    ? "border-maroon bg-maroon-soft/30"
                    : "border-cream-3 bg-cream/40 hover:border-maroon")
                }
              >
                <span aria-hidden="true" className="text-xl">{c.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">
                    {lang === "hi" ? c.nameHi : c.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    {lang === "hi" ? c.blurbHi : c.blurb}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={
                    "ml-auto shrink-0 text-base " +
                    (on ? "text-maroon" : "text-cream-3")
                  }
                >
                  ✓
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Course sections, grouped by the catering category they feed. Plated
          courses power the Full Catering packages and Single Stall bookings;
          live stations power the /book wizard's dedicated Live Stall step
          (and the richer feast tiers). Same dish data as before — the split
          mirrors the customer-facing booking flow. */}
      {[
        {
          key: "plated",
          icon: "🍲",
          title: t(
            "Full Catering & Single Stall Menu",
            "फुल कैटरिंग और सिंगल स्टॉल मेन्यू",
          ),
          sub: t(
            "Plated courses — served in your Silver–Platinum feast packages and single-stall bookings.",
            "प्लेटेड कोर्स — आपके सिल्वर–प्लैटिनम फ़ीस्ट पैकेज और सिंगल स्टॉल बुकिंग में परोसे जाते हैं।",
          ),
          cats: menuCategories.filter((c) => !isLiveStallCategory(c.id)),
        },
        {
          key: "live",
          icon: "🍳",
          title: t("Live Stall Menu", "लाइव स्टॉल मेन्यू"),
          sub: t(
            "Live stations cooked in front of guests — the Live Stall step of a booking, also part of Gold & Platinum feasts.",
            "मेहमानों के सामने बनने वाले लाइव स्टेशन — बुकिंग का लाइव स्टॉल चरण, गोल्ड और प्लैटिनम भोज का हिस्सा भी।",
          ),
          cats: menuCategories.filter((c) => isLiveStallCategory(c.id)),
        },
      ].map((group) => (
        <div key={group.key} className="space-y-4">
          <div className="flex items-start gap-3 pt-2">
            <span aria-hidden="true" className="text-xl">
              {group.icon}
            </span>
            <div>
              <h3 className="font-display text-base font-semibold text-ink">
                {group.title}
              </h3>
              <p className="mt-0.5 text-xs text-ink-soft">{group.sub}</p>
            </div>
          </div>
          {group.cats.map((cat) => {
            const s = sections[cat.id];
            return (
              <CategorySection
                key={cat.id}
                icon={cat.icon}
                name={lang === "hi" ? cat.nameHi : cat.name}
                blurb={lang === "hi" ? cat.blurbHi : cat.blurb}
                suggestions={DISH_SUGGESTIONS[cat.id] ?? []}
                section={s}
                onToggle={() =>
                  updateSection(cat.id, { enabled: !s.enabled })
                }
                onPerPlate={(v) => updateSection(cat.id, { perPlate: v })}
                onAddItem={(item) => addItem(cat.id, item)}
                onRemoveItem={(i) => removeItem(cat.id, i)}
                onToggleDiet={(i) => toggleItemDiet(cat.id, i)}
                onUploadItemPhoto={(i, file) => uploadDishPhoto(cat.id, i, file)}
                // Single Stall vendors price each plated delicacy individually;
                // live-stall dishes bill as counters, so no per-dish field.
                priceable={group.key === "plated" && offersSingleStall}
                onItemPrice={(i, v) => setItemPrice(cat.id, i, v)}
              />
            );
          })}
        </div>
      ))}

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

      {/* Baina Box menu — the box offerings customers browse from the home
          "Baina Box" section. Adding a box auto-declares the category. */}
      <Card padding="none" className="p-5 sm:p-6">
        <h3 className="font-display text-base font-semibold text-ink">
          <span aria-hidden="true">🎁</span>{" "}
          {t("Baina Box Menu", "बैना बॉक्स मेन्यू")}
        </h3>
        <p className="mt-0.5 text-xs text-ink-soft">
          {t(
            "Sweet, bhaji & gifting boxes booked in ½ kg, 1 kg or your own custom sizes — shown to customers browsing Baina Boxes.",
            "½ किलो, 1 किलो या आपके अपने कस्टम साइज़ में बुक होने वाले मिठाई, भाजी और गिफ्ट बॉक्स — बैना बॉक्स ब्राउज़ करने वाले ग्राहकों को दिखते हैं।",
          )}
        </p>
        <div className="mt-4 space-y-3">
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
      </Card>

      {/* Essential Service — the vendor's own take on the service-only tier
          customers see on /service-packages. Rate + what's included. */}
      <Card padding="none" className="p-5 sm:p-6">
        <h3 className="font-display text-base font-semibold text-ink">
          <span aria-hidden="true">🍽️</span>{" "}
          {t("Essential Service", "एसेंशियल सर्विस")}
        </h3>
        <p className="mt-0.5 text-xs text-ink-soft">
          {t(
            "Serving crew, buffet setup & essentials at your own per-guest rate — for single stalls and small functions.",
            "सिंगल स्टॉल और छोटे आयोजनों के लिए आपकी अपनी प्रति-मेहमान दर पर सर्विस स्टाफ, बुफे सेटअप और ज़रूरी सामान।",
          )}
        </p>
        <div className="mt-4 flex items-center gap-2">
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
      </Card>

      {/* Live counters & services — the same extras the /book wizard sells, so a
          vendor can advertise every counter/service they run at their own rate. */}
      <Card padding="none" className="p-5 sm:p-6">
        <h3 className="font-display text-base font-semibold text-ink">
          {t("Live Counters & Services", "लाइव काउंटर और सेवाएं")}
        </h3>
        <p className="mt-0.5 text-xs text-ink-soft">
          {t(
            "Tick everything you offer, then set your own rate. Shown on your public profile.",
            "जो भी आप देते हैं उसे चुनें, फिर अपना रेट डालें। आपके सार्वजनिक प्रोफ़ाइल पर दिखेगा।",
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
                  return (
                    <div
                      key={o.id}
                      className={
                        "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors " +
                        (on
                          ? "border-maroon bg-maroon-soft/30"
                          : "border-cream-3 bg-cream/40")
                      }
                    >
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
                              ? o.perPlate
                                ? t("per plate", "प्रति प्लेट")
                                : t("flat fee", "एकमुश्त शुल्क")
                              : `${t("from", "से")} ${money(o.price)}`}
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
  /** Single Stall vendors price each dish — shows a per-dish ₹ field. */
  priceable?: boolean;
  onItemPrice?: (index: number, value: string) => void;
}) {
  const { t } = useLang();
  const [draftName, setDraftName] = useState("");
  const [draftDiet, setDraftDiet] = useState<DietType>("veg");
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

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
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
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

      {!section.enabled && section.items.length > 0 && (
        <p className="mt-3 text-xs text-ink-soft">
          {t(
            `${section.items.length} saved ${section.items.length === 1 ? "dish is" : "dishes are"} paused — hidden from customers until you turn this course back on.`,
            `${section.items.length} सहेजी गई डिश रुकी हुई हैं — जब तक आप यह कोर्स फिर चालू नहीं करते, ग्राहकों से छिपी रहेंगी।`,
          )}
        </p>
      )}

      {section.enabled && (
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

          {/* Dishes */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {t("Dishes", "डिश")} ({section.items.length}/24)
            </p>
            {priceable && (
              <p className="mb-2 text-xs text-ink-soft">
                {t(
                  "You offer Single Stall — set a ₹ price per plate for any delicacy (optional; blank uses this course's per-plate rate).",
                  "आप सिंगल स्टॉल देते हैं — किसी भी डिश के लिए प्रति-प्लेट ₹ मूल्य डालें (वैकल्पिक; खाली रहने पर इस कोर्स की प्रति-प्लेट दर लगेगी)।",
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
                    {priceable && (
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
            <button
              type="button"
              onClick={() => setDraftDiet(draftDiet === "veg" ? "non-veg" : "veg")}
              aria-pressed={draftDiet === "non-veg"}
              className={
                "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition " +
                (draftDiet === "veg"
                  ? "border-cream-3 bg-white text-ink"
                  : "border-maroon bg-white text-maroon")
              }
            >
              <span
                aria-hidden="true"
                className={
                  "inline-block h-2.5 w-2.5 rounded-sm border " +
                  (draftDiet === "veg" ? "border-ink" : "border-maroon bg-maroon")
                }
              />
              {draftDiet === "veg" ? t("Veg", "वेज") : t("Non-Veg", "नॉन-वेज")}
            </button>
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
