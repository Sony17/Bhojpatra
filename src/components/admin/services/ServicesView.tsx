"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import { Field, Toggle, inputClass } from "@/components/admin/shared/FormControls";
import { Button } from "@/components/ui";
import type { ServicePackage } from "@/lib/data";

/**
 * Admin editor for the feast-wide **service packages** the customer chooses in
 * the booking wizard's mandatory "Choose Your Service Package" step. Loads the
 * admin-curated list from `/api/admin/services` (falls back to the seed), lets
 * the admin add / edit / remove packages, and POSTs the whole list back.
 *
 * The include / not-included / best-for lists are edited as one-per-line
 * textareas (split + trimmed on save) — the simplest editor for a string list.
 *
 * Each package also carries a **price by guests** table (guest range → ₹), so
 * the charge varies with head-count; the server sorts it and drops overlaps.
 */

// One editable guest band; blank "To" = open-ended.
interface TierDraft {
  min: string;
  max: string;
  price: string;
}

// Editing shape: list fields are newline-joined text, prices are input text.
interface Draft {
  id: string;
  badge: string;
  name: string;
  nameHi: string;
  subtitle: string;
  subtitleHi: string;
  icon: string;
  includes: string;
  notIncluded: string;
  bestFor: string;
  priceMin: string;
  priceMax: string;
  perPlate: boolean;
  openTop: boolean;
  tiers: TierDraft[];
}

const toDraft = (s: ServicePackage): Draft => ({
  id: s.id,
  badge: s.badge,
  name: s.name,
  nameHi: s.nameHi,
  subtitle: s.subtitle,
  subtitleHi: s.subtitleHi,
  icon: s.icon,
  includes: s.includes.join("\n"),
  notIncluded: s.notIncluded.join("\n"),
  bestFor: s.bestFor.join("\n"),
  priceMin: String(s.priceMin),
  priceMax: String(s.priceMax),
  perPlate: s.perPlate,
  openTop: s.openTop === true,
  tiers: (s.guestTiers ?? []).map((t) => ({
    min: String(t.minGuests),
    max: t.maxGuests === null ? "" : String(t.maxGuests),
    price: String(t.price),
  })),
});

const lines = (v: string) =>
  v
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

// Draft → the payload row the API normalises further.
const toPayload = (d: Draft) => ({
  id: d.id || undefined,
  badge: d.badge.trim(),
  name: d.name.trim(),
  nameHi: d.nameHi.trim(),
  subtitle: d.subtitle.trim(),
  subtitleHi: d.subtitleHi.trim(),
  icon: d.icon.trim(),
  includes: lines(d.includes),
  notIncluded: lines(d.notIncluded),
  bestFor: lines(d.bestFor),
  priceMin: num(d.priceMin),
  priceMax: num(d.priceMax),
  perPlate: d.perPlate,
  openTop: d.openTop,
  guestTiers: d.tiers
    .filter((t) => t.min.trim() !== "" && t.price.trim() !== "")
    .map((t) => ({
      minGuests: num(t.min),
      maxGuests: t.max.trim() === "" ? null : num(t.max),
      price: num(t.price),
    })),
});

const BLANK: Draft = {
  id: "",
  badge: "",
  name: "",
  nameHi: "",
  subtitle: "",
  subtitleHi: "",
  icon: "🍽️",
  includes: "",
  notIncluded: "",
  bestFor: "",
  priceMin: "0",
  priceMax: "0",
  perPlate: true,
  openTop: false,
  tiers: [],
};

const textareaClass = inputClass + " min-h-[7rem] resize-y";

export default function ServicesView() {
  const [rows, setRows] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/services")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { services?: ServicePackage[] } | null) => {
        if (active && Array.isArray(d?.services)) setRows(d.services.map(toDraft));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const update = <K extends keyof Draft>(i: number, key: K, value: Draft[K]) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
    setSaved(false);
    setError("");
  };
  const addRow = () => {
    setRows((rs) => [...rs, { ...BLANK, badge: `Package ${rs.length + 1}` }]);
    setSaved(false);
  };
  const updateTier = (i: number, ti: number, key: keyof TierDraft, value: string) =>
    update(
      i,
      "tiers",
      rows[i].tiers.map((t, idx) => (idx === ti ? { ...t, [key]: value } : t)),
    );
  // A new band starts right after the last one's "To", so the table stays
  // contiguous without the admin doing the arithmetic.
  const addTier = (i: number) => {
    const last = rows[i].tiers[rows[i].tiers.length - 1];
    const nextMin = last ? (last.max.trim() ? num(last.max) + 1 : num(last.min) + 1) : 1;
    update(i, "tiers", [...rows[i].tiers, { min: String(nextMin), max: "", price: "" }]);
  };
  const removeTier = (i: number, ti: number) =>
    update(
      i,
      "tiers",
      rows[i].tiers.filter((_, idx) => idx !== ti),
    );

  const removeRow = (i: number) => {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
    setSaved(false);
  };

  const save = async () => {
    setError("");
    const cleaned = rows.filter((r) => r.name.trim());
    if (!cleaned.length) {
      setError("Add at least one service package.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services: cleaned.map(toPayload) }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        error?: string;
        services?: ServicePackage[];
      };
      if (!res.ok) throw new Error(d.error || "Could not save changes.");
      if (Array.isArray(d.services)) setRows(d.services.map(toDraft));
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Service Packages"
        subtitle="the feast-wide service tiers customers choose at checkout"
      />
      <p className="max-w-3xl text-sm text-ink-soft">
        These are the packages shown in the booking wizard&rsquo;s mandatory
        &ldquo;Choose Your Service Package&rdquo; step. Each is payable and folds
        into the order total. The amount charged comes from the package&rsquo;s{" "}
        <strong className="text-ink">Price by guests</strong>{" "}
        table for the
        order&rsquo;s head-count (&times; guests when per-guest); a head-count no
        band covers falls back to the{" "}
        <strong className="text-ink">Starting price</strong>. The include /
        not-included / best-for lists are one item per line.
      </p>

      {loading ? (
        <p className="text-sm text-ink-soft">Loading&hellip;</p>
      ) : (
        <div className="space-y-5">
          {rows.map((row, i) => (
            <WidgetCard
              key={i}
              title={row.name.trim() || `Package ${i + 1}`}
              action={
                <Button variant="secondary" size="sm" onClick={() => removeRow(i)}>
                  Remove
                </Button>
              }
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Badge">
                  <input
                    className={inputClass}
                    value={row.badge}
                    placeholder="Package A"
                    onChange={(e) => update(i, "badge", e.target.value)}
                  />
                </Field>
                <Field label="Icon (emoji)">
                  <input
                    className={inputClass}
                    value={row.icon}
                    placeholder="🍽️"
                    onChange={(e) => update(i, "icon", e.target.value)}
                  />
                </Field>
                <Field label="Name (English)">
                  <input
                    className={inputClass}
                    value={row.name}
                    placeholder="Premium Service"
                    onChange={(e) => update(i, "name", e.target.value)}
                  />
                </Field>
                <Field label="Name (Hindi)">
                  <input
                    className={inputClass}
                    value={row.nameHi}
                    placeholder="प्रीमियम सर्विस"
                    onChange={(e) => update(i, "nameHi", e.target.value)}
                  />
                </Field>
                <Field label="Subtitle (English)">
                  <input
                    className={inputClass}
                    value={row.subtitle}
                    placeholder="For Weddings & Receptions"
                    onChange={(e) => update(i, "subtitle", e.target.value)}
                  />
                </Field>
                <Field label="Subtitle (Hindi)">
                  <input
                    className={inputClass}
                    value={row.subtitleHi}
                    placeholder="शादियों और रिसेप्शन के लिए"
                    onChange={(e) => update(i, "subtitleHi", e.target.value)}
                  />
                </Field>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                <Field
                  label="Starting price (₹)"
                  hint="Fallback when no guest band below matches."
                >
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={row.priceMin}
                    onChange={(e) => update(i, "priceMin", e.target.value)}
                  />
                </Field>
                <Field label="Upper band (₹)" hint="Display only.">
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={row.priceMax}
                    onChange={(e) => update(i, "priceMax", e.target.value)}
                  />
                </Field>
                <label className="flex items-center gap-2.5 pb-2.5">
                  <Toggle
                    checked={row.perPlate}
                    onChange={(v) => update(i, "perPlate", v)}
                    label="Per guest"
                  />
                  <span className="text-sm text-ink">Per&nbsp;guest</span>
                </label>
                <label className="flex items-center gap-2.5 pb-2.5">
                  <Toggle
                    checked={row.openTop}
                    onChange={(v) => update(i, "openTop", v)}
                    label="Open-ended top"
                  />
                  <span className="text-sm text-ink">Show&nbsp;&ldquo;+&rdquo;</span>
                </label>
              </div>

              <div className="mt-5">
                <p className="text-sm font-semibold text-ink">Price by guests</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  One row per head-count band. Price is in ₹,{" "}
                  {row.perPlate ? "per guest" : "flat for the event"}. Leave
                  &ldquo;To&rdquo; empty on the last row for &ldquo;and above&rdquo;.
                </p>
                {row.tiers.length > 0 && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[26rem] text-left text-sm">
                      <thead>
                        <tr className="text-xs uppercase tracking-wider text-ink-soft">
                          <th className="pb-2 pr-3 font-semibold">From (guests)</th>
                          <th className="pb-2 pr-3 font-semibold">To (guests)</th>
                          <th className="pb-2 pr-3 font-semibold">
                            Price (₹{row.perPlate ? " / guest" : ""})
                          </th>
                          <th className="pb-2" aria-label="Actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {row.tiers.map((tier, ti) => (
                          <tr key={ti}>
                            <td className="pb-2 pr-3">
                              <input
                                type="number"
                                min={0}
                                aria-label="From guests"
                                className={inputClass}
                                value={tier.min}
                                onChange={(e) => updateTier(i, ti, "min", e.target.value)}
                              />
                            </td>
                            <td className="pb-2 pr-3">
                              <input
                                type="number"
                                min={0}
                                aria-label="To guests"
                                placeholder="and above"
                                className={inputClass}
                                value={tier.max}
                                onChange={(e) => updateTier(i, ti, "max", e.target.value)}
                              />
                            </td>
                            <td className="pb-2 pr-3">
                              <input
                                type="number"
                                min={0}
                                aria-label="Price"
                                className={inputClass}
                                value={tier.price}
                                onChange={(e) => updateTier(i, ti, "price", e.target.value)}
                              />
                            </td>
                            <td className="pb-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => removeTier(i, ti)}
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => addTier(i)}
                >
                  + Add guest band
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Field label="Includes (one per line)">
                  <textarea
                    className={textareaClass}
                    value={row.includes}
                    placeholder={"Ceramic Crockery\nUniformed Service Staff"}
                    onChange={(e) => update(i, "includes", e.target.value)}
                  />
                </Field>
                <Field label="Not included (one per line)">
                  <textarea
                    className={textareaClass}
                    value={row.notIncluded}
                    placeholder={"No LED Counter\nNo Decoration"}
                    onChange={(e) => update(i, "notIncluded", e.target.value)}
                  />
                </Field>
                <Field label="Best for (one per line)">
                  <textarea
                    className={textareaClass}
                    value={row.bestFor}
                    placeholder={"Weddings\nReceptions"}
                    onChange={(e) => update(i, "bestFor", e.target.value)}
                  />
                </Field>
              </div>
            </WidgetCard>
          ))}

          <Button variant="secondary" size="sm" onClick={addRow}>
            + Add service package
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-maroon">
          {error}
        </p>
      )}
      <div className="flex items-center gap-4">
        <Button variant="primary" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        {saved && (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 rounded-full bg-cream-2 px-3.5 py-1.5 text-sm font-medium text-ink"
          >
            <span aria-hidden="true" className="text-maroon">
              ✓
            </span>{" "}
            Saved
          </span>
        )}
      </div>
    </div>
  );
}
