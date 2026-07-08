"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import { Field, Toggle, inputClass } from "@/components/admin/shared/FormControls";
import type { ServicePackage } from "@/lib/data";

/**
 * Admin editor for the feast-wide **service packages** the customer chooses in
 * the booking wizard's mandatory "Choose Your Service Package" step. Loads the
 * admin-curated list from `/api/admin/services` (falls back to the seed), lets
 * the admin add / edit / remove packages, and POSTs the whole list back.
 *
 * The include / not-included / best-for lists are edited as one-per-line
 * textareas (split + trimmed on save) — the simplest editor for a string list.
 */

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
        into the order total &mdash; the amount charged is the{" "}
        <strong className="text-ink">Starting price</strong> (&times; guests when
        per-guest). The include / not-included / best-for lists are one item per
        line.
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
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="rounded-full border border-maroon/30 px-4 py-2 text-sm font-semibold text-maroon transition-colors hover:bg-maroon/5"
                >
                  Remove
                </button>
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
                  hint="Charged amount — × guests when per-guest."
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

          <button
            type="button"
            onClick={addRow}
            className="rounded-full border border-maroon/30 px-4 py-2 text-sm font-semibold text-maroon transition-colors hover:bg-maroon/5"
          >
            + Add service package
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-maroon">
          {error}
        </p>
      )}
      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
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
