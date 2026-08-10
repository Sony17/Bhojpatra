"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLang } from "@/lib/i18n";
import { cities } from "@/lib/data";
import { Button, Card, controlClass } from "@/components/ui";
import {
  VENUE_TYPES,
  VENUE_SPACE_CATALOG,
  VENUE_MAX_IMAGES,
  VENUE_LAWN_PREMIUM,
  VENUE_ROOM_RATE,
  DEFAULT_VENUE_IMAGE,
  parseVenuePrice,
  formatVenuePrice,
  isServableVenueImage,
  venueCityName,
  clampUnits,
  VENUE_DEFAULT_ROOMS,
  VENUE_MAX_UNITS,
  VENUE_MAX_SPACE_UNITS,
  type VenueRecord,
  type VenueSpaceKey,
} from "@/lib/venues";

const inputClass = "mt-1.5 " + controlClass;

/** One row of the "Spaces & pricing" fieldset — offered on/off, its fee, and
 *  how many the venue has (2 lawns list separately; 10 rooms cap the counter). */
interface SpaceForm {
  key: VenueSpaceKey;
  on: boolean;
  price: string;
  units: string;
}

interface VenueForm {
  id: string;
  name: string;
  type: string;
  city: string;
  location: string;
  capacity: string;
  spaces: SpaceForm[];
  images: string[];
}

/** A fresh blank form — a factory so resets never share nested arrays. */
function freshForm(): VenueForm {
  return {
    id: "",
    name: "",
    type: VENUE_TYPES[0],
    city: "",
    location: "",
    capacity: "",
    spaces: VENUE_SPACE_CATALOG.map((c) => ({
      key: c.key,
      on: c.key === "banquet",
      price: "",
      units: c.key === "rooms" ? String(VENUE_DEFAULT_ROOMS) : "1",
    })),
    images: [],
  };
}

/**
 * "My Venue" — where a Venue-Owner partner publishes the venues they list on
 * Bhojpatra. Each published venue goes live on /venues, becomes selectable and
 * bookable, and its bookings are credited back to this partner's code.
 */
export default function VenuePanel({
  code,
  name,
}: {
  code: string;
  name?: string;
}) {
  const { t, lang } = useLang();
  const [venues, setVenues] = useState<VenueRecord[]>([]);
  // Only show the loading state when there's actually a code to fetch against.
  const [loading, setLoading] = useState<boolean>(() => Boolean(code));
  const [form, setForm] = useState<VenueForm>(freshForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");

  // Load this owner's published venues.
  useEffect(() => {
    if (!code) return;
    let active = true;
    fetch(`/api/venues?owner=${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        setVenues((data?.venues ?? []) as VenueRecord[]);
      })
      .catch(() => {
        /* offline — show the empty state */
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [code]);

  function update<K extends keyof VenueForm>(key: K, value: VenueForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setSpace(
    key: VenueSpaceKey,
    patch: Partial<Pick<SpaceForm, "on" | "price" | "units">>,
  ) {
    setForm((prev) => ({
      ...prev,
      spaces: prev.spaces.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    }));
  }

  function addImages(urls: string[]) {
    setForm((prev) => ({
      ...prev,
      images: [...new Set([...prev.images, ...urls])].slice(0, VENUE_MAX_IMAGES),
    }));
  }

  function removeImage(url: string) {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((u) => u !== url),
    }));
  }

  /** Move a photo to the front — the first photo is the listing's cover. */
  function makeCover(url: string) {
    setForm((prev) => ({
      ...prev,
      images: [url, ...prev.images.filter((u) => u !== url)],
    }));
  }

  function startNew() {
    setForm(freshForm());
    setError("");
    setLinkDraft("");
    setShowForm(true);
  }

  function startEdit(v: VenueRecord) {
    // Legacy records (saved before per-space pricing) mirror the derived trio
    // customers already see, so an untouched save keeps parity.
    const legacyDerived: Partial<Record<VenueSpaceKey, number>> = {
      banquet: v.price,
      lawn: Math.round(v.price * VENUE_LAWN_PREMIUM),
      rooms: Math.max(2000, Math.round((v.price * VENUE_ROOM_RATE) / 500) * 500),
    };
    setForm({
      id: v.id,
      name: v.name,
      type: v.type,
      city: v.city,
      location: v.location,
      capacity: v.capacity,
      spaces: VENUE_SPACE_CATALOG.map((c) => {
        const saved = v.spaces?.find((s) => s.key === c.key);
        const price = v.spaces?.length ? saved?.price : legacyDerived[c.key];
        return {
          key: c.key,
          on: price != null,
          price: price != null ? String(price) : "",
          units: String(
            saved?.units ?? (c.key === "rooms" ? VENUE_DEFAULT_ROOMS : 1),
          ),
        };
      }),
      images: (v.images?.length ? v.images : [v.image]).filter(
        (src) => src && src !== DEFAULT_VENUE_IMAGE,
      ),
    });
    setError("");
    setLinkDraft("");
    setShowForm(true);
  }

  /** Upload picked files one by one; each returns a same-origin photo URL. */
  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-picking the same file after a remove
    if (!files.length) return;
    setError("");
    const room = VENUE_MAX_IMAGES - form.images.length;
    if (room <= 0) {
      setError(
        t(
          `You can add up to ${VENUE_MAX_IMAGES} photos.`,
          `आप ${VENUE_MAX_IMAGES} फ़ोटो तक जोड़ सकते हैं।`,
        ),
      );
      return;
    }
    setUploading(true);
    try {
      for (const file of files.slice(0, room)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/venues/photo", { method: "POST", body: fd });
        const data = (await res.json().catch(() => null)) as
          | { url?: string; error?: string }
          | null;
        if (!res.ok || !data?.url) {
          setError(
            data?.error ??
              t("Couldn't upload that photo. Try again.", "फ़ोटो अपलोड नहीं हुई। फिर कोशिश करें।"),
          );
          break;
        }
        addImages([data.url]);
      }
    } finally {
      setUploading(false);
    }
  }

  /** Add a pasted image link — validated against the hosts the site can serve. */
  function addLink() {
    const url = linkDraft.trim();
    if (!url) return;
    if (form.images.length >= VENUE_MAX_IMAGES) {
      setError(
        t(
          `You can add up to ${VENUE_MAX_IMAGES} photos.`,
          `आप ${VENUE_MAX_IMAGES} फ़ोटो तक जोड़ सकते हैं।`,
        ),
      );
      return;
    }
    if (!isServableVenueImage(url)) {
      setError(
        t(
          "We can't use that photo link. Paste a direct image address from Unsplash (right-click the photo → Copy Image Address), or upload the photo instead.",
          "यह फ़ोटो लिंक काम नहीं करेगा। Unsplash से सीधी इमेज लिंक पेस्ट करें (फ़ोटो पर राइट-क्लिक → Copy Image Address), या फ़ोटो अपलोड करें।",
        ),
      );
      return;
    }
    setError("");
    addImages([url]);
    setLinkDraft("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError(t("Please enter a venue name.", "कृपया वेन्यू का नाम दर्ज करें।"));
      return;
    }
    if (!form.city) {
      setError(t("Please choose a city.", "कृपया एक शहर चुनें।"));
      return;
    }
    // At least one bookable (non-rooms) space with a valid fee; every ticked
    // space needs a price. The cheapest bookable fee becomes the headline.
    const chosen = form.spaces.filter((s) => s.on);
    const bookableChosen = chosen.filter((s) => s.key !== "rooms");
    if (!bookableChosen.length) {
      setError(
        t(
          "Offer at least one bookable space (hall, lawn…).",
          "कम से कम एक बुक करने योग्य स्थान चुनें (हॉल, लॉन…)।",
        ),
      );
      return;
    }
    if (chosen.some((s) => parseVenuePrice(s.price) <= 0)) {
      setError(
        t(
          "Enter a valid price for every space you offer.",
          "हर चुने हुए स्थान की सही कीमत दर्ज करें।",
        ),
      );
      return;
    }
    const price = Math.min(...bookableChosen.map((s) => parseVenuePrice(s.price)));

    setSaving(true);
    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id || undefined,
          ownerCode: code,
          ownerName: name,
          name: form.name.trim(),
          type: form.type,
          city: form.city,
          location: form.location.trim(),
          capacity: form.capacity.trim(),
          price,
          spaces: chosen.map((s) => ({
            key: s.key,
            price: parseVenuePrice(s.price),
            units: clampUnits(
              s.units,
              s.key === "rooms" ? VENUE_MAX_UNITS : VENUE_MAX_SPACE_UNITS,
            ),
          })),
          images: form.images,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { venue?: VenueRecord; error?: string }
        | null;
      if (!res.ok || !data?.venue) {
        setError(
          data?.error ??
            t("Couldn't publish the venue. Try again.", "वेन्यू प्रकाशित नहीं हुआ। फिर कोशिश करें।"),
        );
        return;
      }
      // Upsert into the local list (newest first), then close the form.
      setVenues((prev) => {
        const rest = prev.filter((v) => v.id !== data.venue!.id);
        return [data.venue!, ...rest];
      });
      setShowForm(false);
      setForm(freshForm());
    } catch {
      setError(
        t("Couldn't publish the venue. Try again.", "वेन्यू प्रकाशित नहीं हुआ। फिर कोशिश करें।"),
      );
    } finally {
      setSaving(false);
    }
  }

  const cityOptions = useMemo(() => cities, []);

  if (!code) {
    return (
      <div className="rounded-card border border-dashed border-cream-3 bg-white/60 p-12 text-center">
        <p className="font-display text-lg text-ink">
          {t("Venue listing unavailable", "वेन्यू लिस्टिंग उपलब्ध नहीं")}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {t(
            "Your venue-owner code is still being set up. Refresh in a moment.",
            "आपका वेन्यू-ओनर कोड अभी सेट हो रहा है। थोड़ी देर में रीफ्रेश करें।",
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro + add button */}
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">
            {t("My Venues", "मेरे वेन्यू")}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {t(
              "Submit a venue to list it on Bhojpatra — once our team approves it, customers can select, book and pay for it.",
              "Bhojpatra पर लिस्ट करने के लिए वेन्यू सबमिट करें — हमारी टीम के मंज़ूर करते ही ग्राहक इसे चुन, बुक और भुगतान कर सकते हैं।",
            )}
          </p>
        </div>
        {!showForm && (
          <Button type="button" onClick={startNew} className="shrink-0">
            ＋ {t("Add a venue", "वेन्यू जोड़ें")}
          </Button>
        )}
      </Card>

      {/* Registration / edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-card border border-maroon/30 bg-white p-5 shadow-card sm:p-6"
        >
          <h3 className="font-display text-base font-semibold text-ink">
            {form.id
              ? t("Edit venue", "वेन्यू संपादित करें")
              : t("Publish a new venue", "नया वेन्यू प्रकाशित करें")}
          </h3>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-ink-soft">
                {t("Venue name", "वेन्यू का नाम")}
              </span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder={t("e.g. Royal Palace Banquet", "जैसे रॉयल पैलेस बैंक्वेट")}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-ink-soft">
                {t("Venue type", "वेन्यू प्रकार")}
              </span>
              <select
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
                className={inputClass}
              >
                {VENUE_TYPES.map((vt) => (
                  <option key={vt} value={vt}>
                    {vt}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-ink-soft">
                {t("City", "शहर")}
              </span>
              <select
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className={inputClass}
              >
                <option value="">{t("Select city", "शहर चुनें")}</option>
                {cityOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === "hi" ? c.nameHi : c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-ink-soft">
                {t("Locality / area", "इलाका / क्षेत्र")}
              </span>
              <input
                type="text"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder={t("e.g. Gomti Nagar", "जैसे गोमती नगर")}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-ink-soft">
                {t("Guest capacity", "मेहमान क्षमता")}
              </span>
              <input
                type="text"
                value={form.capacity}
                onChange={(e) => update("capacity", e.target.value)}
                placeholder={t("e.g. 300–600 Guests", "जैसे 300–600 मेहमान")}
                className={inputClass}
              />
            </label>

            {/* Spaces & pricing — tick what the venue offers; each space gets
                its own fee and the cheapest becomes the "starts at" price. */}
            {/* `min-w-0`: a grid item defaults to `min-width: auto`, so without
                it the widest row here (label + count + price) forces the whole
                column wider than the card on a phone. */}
            <fieldset className="block min-w-0 sm:col-span-2">
              <legend className="text-xs font-medium text-ink-soft">
                {t("Spaces & pricing (₹)", "स्थान और कीमतें (₹)")}
              </legend>
              <div className="mt-1.5 space-y-2">
                {form.spaces.map((s) => {
                  const cat = VENUE_SPACE_CATALOG.find((c) => c.key === s.key)!;
                  return (
                    <div
                      key={s.key}
                      className={
                        "flex items-center gap-2 rounded-control border p-2.5 transition-colors sm:gap-3 " +
                        (s.on ? "border-maroon/40 bg-cream-2/40" : "border-cream-3")
                      }
                    >
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 sm:gap-2.5">
                        <input
                          type="checkbox"
                          checked={s.on}
                          onChange={(e) => setSpace(s.key, { on: e.target.checked })}
                          className="h-4 w-4 shrink-0 accent-maroon"
                        />
                        <span aria-hidden="true" className="text-base leading-none">
                          {cat.icon}
                        </span>
                        <span className="min-w-0 text-sm text-ink">
                          {lang === "hi" ? cat.hi : cat.en}
                          {cat.subject && (
                            <span className="block text-xs text-ink-soft">
                              {t(
                                "Per room / night — confirmed on request",
                                "प्रति कमरा / रात — अनुरोध पर कन्फर्म",
                              )}
                            </span>
                          )}
                        </span>
                      </label>
                      {/* How many of this space you have. Two lawns list to
                          customers as "Open Lawn 1" and "Open Lawn 2", each
                          bookable on its own; rooms cap the room counter. */}
                      <div className="w-14 shrink-0">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={s.units}
                          onChange={(e) => setSpace(s.key, { units: e.target.value })}
                          placeholder={s.key === "rooms" ? "10" : "1"}
                          disabled={!s.on}
                          aria-label={t(
                            `How many ${cat.en}`,
                            `कितने ${cat.hi}`,
                          )}
                          className={controlClass + " text-center"}
                        />
                      </div>
                      <div className="w-24 shrink-0 sm:w-28">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={s.price}
                          onChange={(e) => setSpace(s.key, { price: e.target.value })}
                          placeholder={s.key === "rooms" ? "4500" : "85000"}
                          disabled={!s.on}
                          aria-label={t(
                            `Price for ${cat.en} (₹)`,
                            `${cat.hi} की कीमत (₹)`,
                          )}
                          className={controlClass}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <span className="mt-1 block text-xs text-ink-soft/80">
                {t(
                  "Middle box = how many you have (2 lawns list as “Open Lawn 1” and “Open Lawn 2”). The cheapest space becomes your “starts at” price on the venue card.",
                  "बीच का बॉक्स = आपके पास कितने हैं (2 लॉन “खुला लॉन 1” और “खुला लॉन 2” के रूप में दिखेंगे)। सबसे सस्ती कीमत वेन्यू कार्ड पर आपकी “से शुरू” कीमत बनेगी।",
                )}
              </span>
            </fieldset>

            {/* Photos — upload files and/or paste direct image links; the
                first photo is the cover shown on cards. */}
            <div className="block sm:col-span-2">
              <span className="text-xs font-medium text-ink-soft">
                {t("Photos", "फ़ोटो")}
              </span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {form.images.map((url, i) => (
                  <div
                    key={url}
                    className="relative h-20 w-24 shrink-0 overflow-hidden rounded-control border border-cream-3 bg-cream-2"
                  >
                    <Image src={url} alt="" fill sizes="96px" className="object-cover" />
                    {i === 0 ? (
                      <span className="absolute bottom-0.5 left-0.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-maroon">
                        {t("Cover", "कवर")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => makeCover(url)}
                        className="focus-ring absolute bottom-0.5 left-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                      >
                        {t("Make cover", "कवर बनाएं")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      aria-label={t("Remove photo", "फ़ोटो हटाएं")}
                      className="focus-ring absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-maroon text-cream shadow-card"
                    >
                      <span aria-hidden="true" className="text-xs leading-none">
                        ×
                      </span>
                    </button>
                  </div>
                ))}
                {form.images.length < VENUE_MAX_IMAGES && (
                  <label
                    className={
                      "flex h-20 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-control border border-dashed border-cream-3 text-maroon transition-colors hover:bg-cream-2 focus-within:ring-2 focus-within:ring-maroon/45 focus-within:ring-offset-2 focus-within:ring-offset-white " +
                      (uploading ? "pointer-events-none opacity-60" : "")
                    }
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="sr-only"
                      onChange={onPickFiles}
                      disabled={uploading}
                    />
                    <span aria-hidden="true" className="text-lg leading-none">
                      {uploading ? "…" : "+"}
                    </span>
                    <span className="text-[10px] font-medium">
                      {uploading
                        ? t("Uploading", "अपलोड हो रही है")
                        : t("Upload", "अपलोड करें")}
                    </span>
                  </label>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="url"
                  value={linkDraft}
                  onChange={(e) => setLinkDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addLink();
                    }
                  }}
                  placeholder="https://…"
                  className={controlClass}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addLink}
                  className="shrink-0"
                >
                  {t("Add link", "लिंक जोड़ें")}
                </Button>
              </div>
              <span className="mt-1 block text-xs text-ink-soft/80">
                {t(
                  `Optional — up to ${VENUE_MAX_IMAGES} photos; the first is the cover. Upload JPG/PNG/WebP (≤5 MB each) or paste a direct image address (e.g. Unsplash: right-click the photo → Copy Image Address). We'll use a default photo if left blank.`,
                  `वैकल्पिक — ${VENUE_MAX_IMAGES} फ़ोटो तक; पहली कवर होगी। JPG/PNG/WebP अपलोड करें (हर एक ≤5 MB) या सीधी इमेज लिंक पेस्ट करें (जैसे Unsplash: फ़ोटो पर राइट-क्लिक → Copy Image Address)। खाली छोड़ने पर हम डिफ़ॉल्ट फ़ोटो लगाएंगे।`,
                )}
              </span>
            </div>
          </div>

          {error && <p className="mt-4 text-sm font-medium text-maroon">{error}</p>}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={saving}>
              {saving
                ? t("Publishing…", "प्रकाशित हो रहा है…")
                : form.id
                  ? t("Save changes", "बदलाव सहेजें")
                  : t("Publish venue", "वेन्यू प्रकाशित करें")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
            >
              {t("Cancel", "रद्द करें")}
            </Button>
          </div>
        </form>
      )}

      {/* Published venues */}
      {loading ? (
        <p className="text-sm text-ink-soft">{t("Loading…", "लोड हो रहा है…")}</p>
      ) : venues.length === 0 && !showForm ? (
        <div className="rounded-card border border-dashed border-cream-3 bg-white/60 p-12 text-center">
          <p className="font-display text-lg text-ink">
            {t("No venues yet", "अभी कोई वेन्यू नहीं")}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {t(
              "Add your first venue — it goes live on the Venues page once our team approves it.",
              "अपना पहला वेन्यू जोड़ें — हमारी टीम के मंज़ूर करते ही यह वेन्यू पेज पर लाइव हो जाता है।",
            )}
          </p>
        </div>
      ) : (
        venues.length > 0 && (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {venues.map((v) => {
              const live = v.status !== "Pending" && v.status !== "Hidden";
              return (
              <Card
                as="li"
                key={v.id}
                padding="none"
                className="flex flex-col overflow-hidden"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-2">
                  <Image
                    src={v.image}
                    alt={v.name}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-maroon shadow-sm backdrop-blur-sm">
                    {v.type}
                  </span>
                  <span
                    className={
                      "absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm " +
                      (v.status === "Pending"
                        ? "bg-maroon text-cream"
                        : v.status === "Hidden"
                          ? "bg-black/75 text-white"
                          : "bg-white/90 text-maroon")
                    }
                  >
                    {v.status === "Pending"
                      ? t("Pending review", "समीक्षा बाकी")
                      : v.status === "Hidden"
                        ? t("Not visible", "अदृश्य")
                        : t("Live", "लाइव")}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-lg font-semibold text-ink">
                    {v.name}
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
                    <span aria-hidden="true">📍</span>
                    {[v.location, venueCityName(v.city)].filter(Boolean).join(", ")}
                  </p>
                  {v.capacity && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
                      <span aria-hidden="true">👥</span>
                      {v.capacity}
                    </p>
                  )}
                  <div className="mt-4 flex items-end justify-between border-t border-cream-3 pt-4">
                    <div>
                      <p className="text-xs text-ink-soft">{t("Starts at", "से शुरू")}</p>
                      <p className="font-display text-lg font-semibold text-maroon">
                        {v.priceFrom || formatVenuePrice(v.price)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => startEdit(v)}
                      >
                        {t("Edit", "संपादित करें")}
                      </Button>
                      {live && (
                        <Button href={`/venues/${v.id}`} size="sm">
                          {t("View", "देखें")}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
              );
            })}
          </ul>
        )
      )}
    </div>
  );
}
