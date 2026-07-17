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
  cities,
  menuCategories,
  registrationCuisines,
  type DietType,
} from "@/lib/data";
import type { ModerationStatus, VendorMenuSection } from "@/lib/vendorMenus";
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
}

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

  const publishedDishes = Object.values(sections)
    .filter((s) => s.enabled)
    .reduce((n, s) => n + s.items.length, 0);

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
            items: sections[c.id].items,
            ...(sections[c.id].enabled ? {} : { hidden: true }),
          })),
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

      {/* Course sections */}
      <div className="space-y-4">
        {menuCategories.map((cat) => {
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
            />
          );
        })}
      </div>

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
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors " +
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
