"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLang } from "@/lib/i18n";
import { cities } from "@/lib/data";
import {
  VENUE_TYPES,
  parseVenuePrice,
  formatVenuePrice,
  venueCityName,
  type VenueRecord,
} from "@/lib/venues";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-cream-3 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 outline-none transition-colors focus:border-maroon focus:ring-1 focus:ring-maroon/30";

interface VenueForm {
  id: string;
  name: string;
  type: string;
  city: string;
  location: string;
  capacity: string;
  price: string;
  image: string;
}

const emptyForm: VenueForm = {
  id: "",
  name: "",
  type: VENUE_TYPES[0],
  city: "",
  location: "",
  capacity: "",
  price: "",
  image: "",
};

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
  const [form, setForm] = useState<VenueForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  function startNew() {
    setForm({ ...emptyForm });
    setError("");
    setShowForm(true);
  }

  function startEdit(v: VenueRecord) {
    setForm({
      id: v.id,
      name: v.name,
      type: v.type,
      city: v.city,
      location: v.location,
      capacity: v.capacity,
      price: String(v.price),
      image: v.image,
    });
    setError("");
    setShowForm(true);
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
    const price = parseVenuePrice(form.price);
    if (price <= 0) {
      setError(t("Please enter a valid starting price.", "कृपया सही शुरुआती कीमत दर्ज करें।"));
      return;
    }

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
          priceFrom: formatVenuePrice(price),
          image: form.image.trim() || undefined,
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
      setForm({ ...emptyForm });
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
      <div className="rounded-2xl border border-dashed border-cream-3 bg-white/60 p-12 text-center">
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
      <div className="flex flex-col gap-3 rounded-2xl border border-cream-3 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
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
          <button
            type="button"
            onClick={startNew}
            className="shrink-0 rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
          >
            ＋ {t("Add a venue", "वेन्यू जोड़ें")}
          </button>
        )}
      </div>

      {/* Registration / edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-maroon/30 bg-white p-5 shadow-sm sm:p-6"
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

            <label className="block">
              <span className="text-xs font-medium text-ink-soft">
                {t("Starting price (₹)", "शुरुआती कीमत (₹)")}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                placeholder="85000"
                className={inputClass}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-ink-soft">
                {t("Photo URL", "फ़ोटो URL")}
              </span>
              <input
                type="url"
                value={form.image}
                onChange={(e) => update("image", e.target.value)}
                placeholder="https://…"
                className={inputClass}
              />
              <span className="mt-1 block text-xs text-ink-soft/80">
                {t(
                  "Optional — we'll use a default photo if left blank.",
                  "वैकल्पिक — खाली छोड़ने पर हम डिफ़ॉल्ट फ़ोटो लगाएंगे।",
                )}
              </span>
            </label>
          </div>

          {error && <p className="mt-4 text-sm font-medium text-maroon">{error}</p>}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-maroon px-6 py-2.5 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark disabled:opacity-60"
            >
              {saving
                ? t("Publishing…", "प्रकाशित हो रहा है…")
                : form.id
                  ? t("Save changes", "बदलाव सहेजें")
                  : t("Publish venue", "वेन्यू प्रकाशित करें")}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
              className="rounded-full border border-maroon px-6 py-2.5 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
            >
              {t("Cancel", "रद्द करें")}
            </button>
          </div>
        </form>
      )}

      {/* Published venues */}
      {loading ? (
        <p className="text-sm text-ink-soft">{t("Loading…", "लोड हो रहा है…")}</p>
      ) : venues.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-dashed border-cream-3 bg-white/60 p-12 text-center">
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
              <li
                key={v.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-cream-3 bg-white shadow-sm"
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
                      <button
                        type="button"
                        onClick={() => startEdit(v)}
                        className="rounded-full border border-maroon px-4 py-2 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
                      >
                        {t("Edit", "संपादित करें")}
                      </button>
                      {live && (
                        <Link
                          href={`/venues/${v.id}`}
                          className="rounded-full bg-maroon px-4 py-2 text-sm font-semibold text-cream transition hover:bg-maroon-dark"
                        >
                          {t("View", "देखें")}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
        )
      )}
    </div>
  );
}
