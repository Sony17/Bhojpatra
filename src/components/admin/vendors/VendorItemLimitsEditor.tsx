"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import { inputClass } from "@/components/admin/shared/FormControls";
import { packageCategoryItems } from "@/lib/data";
import {
  MAX_COURSE_QUOTA,
  normalizeCourseQuota,
} from "@/lib/vendorItemLimitsData";
import type { AdminVendorItemLimits } from "@/lib/admin/vendors";
import type { VendorTier } from "@/lib/admin/types";

/** Editable cell values as typed: category id → band → raw input string
 *  ("" = no override, follow the default). */
type Draft = Record<string, Partial<Record<VendorTier, string>>>;

function draftFrom(limits: AdminVendorItemLimits): Draft {
  const d: Draft = {};
  for (const c of limits.courses) {
    const row: Partial<Record<VendorTier, string>> = {};
    for (const band of limits.bands) {
      const n = c.adminQuota[band];
      if (n !== undefined) row[band] = String(n);
    }
    d[c.categoryId] = row;
  }
  return d;
}

/**
 * Per-vendor selection-limit editor (Vendor Management → vendor → Menu tab).
 * One number per course × package tier: how many dishes a customer may pick
 * from THIS caterer in the /book wizard. Blank follows the default — the
 * caterer's own dashboard quota when they set one, else the platform standard
 * (shown as the field's placeholder). 0 removes the course from this caterer
 * on that tier. Saves replace the vendor's whole override set, so clearing a
 * field really does return that band to its default.
 */
export default function VendorItemLimitsEditor({
  vendorId,
  limits,
}: {
  vendorId: string;
  limits: AdminVendorItemLimits;
}) {
  const initial = useMemo(() => draftFrom(limits), [limits]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [baseline, setBaseline] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  const setCell = (catId: string, band: VendorTier, value: string) => {
    // Digits only — a quota is a whole count of dishes.
    const clean = value.replace(/[^0-9]/g, "");
    setDraft((d) => ({ ...d, [catId]: { ...d[catId], [band]: clean } }));
    setNotice(null);
  };

  /** The number a blank field falls back to: the caterer's own quota, else the
   *  platform's package standard, else the wizard's final fallback of 1. */
  const defaultFor = (catId: string, band: VendorTier): number => {
    const course = limits.courses.find((c) => c.categoryId === catId);
    return (
      course?.vendorQuota[band] ??
      packageCategoryItems[band.toLowerCase()]?.[catId] ??
      1
    );
  };

  const save = async () => {
    const payload: Record<string, Partial<Record<VendorTier, number>>> = {};
    for (const c of limits.courses) {
      const row: Partial<Record<VendorTier, number>> = {};
      for (const band of limits.bands) {
        const raw = draft[c.categoryId]?.[band]?.trim();
        if (!raw) continue;
        const n = normalizeCourseQuota(Number(raw));
        if (n !== null) row[band] = n;
      }
      if (Object.keys(row).length) payload[c.categoryId] = row;
    }

    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/vendor-item-limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId, limits: payload }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        limits?: Record<string, Partial<Record<VendorTier, number>>>;
      } | null;
      if (!res.ok) {
        setNotice({
          ok: false,
          text: data?.error ?? "Something went wrong. Please try again.",
        });
        return;
      }
      // Rehydrate from the server's normalized answer so the fields show
      // exactly what was stored (clamped values included).
      const saved: Draft = {};
      for (const c of limits.courses) {
        const row: Partial<Record<VendorTier, string>> = {};
        for (const band of limits.bands) {
          const n = data?.limits?.[c.categoryId]?.[band];
          if (n !== undefined) row[band] = String(n);
        }
        saved[c.categoryId] = row;
      }
      setDraft(saved);
      setBaseline(saved);
      setNotice({ ok: true, text: "Selection limits saved." });
    } catch {
      setNotice({
        ok: false,
        text: "Something went wrong. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  /** Blank every field — with blank meaning "follow the default", saving after
   *  this is how an admin hands a vendor back to the platform/caterer numbers. */
  const clearAll = () => {
    setDraft(
      Object.fromEntries(limits.courses.map((c) => [c.categoryId, {}])),
    );
    setNotice(null);
  };

  return (
    <WidgetCard title="Selection Limits">
      <p className="text-sm text-ink-soft">
        How many dishes a customer may pick from this caterer per course, on
        each package tier of the booking flow. Blank follows the default — the
        caterer&apos;s own setting, else the platform standard (shown in the
        empty field). 0 removes the course from this caterer on that tier.
        Numbers above the dishes the caterer serves are capped in the wizard.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead>
            <tr className="border-b border-cream-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <th className="py-2 pr-4">Course</th>
              {limits.bands.map((band) => (
                <th key={band} className="py-2 pr-4">
                  {band}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {limits.courses.map((c) => (
              <tr key={c.categoryId} className="border-b border-cream-3">
                <td className="py-3 pr-4 align-top">
                  <span className="font-medium text-ink">
                    {c.icon} {c.name}
                  </span>
                </td>
                {limits.bands.map((band) => (
                  <td key={band} className="py-3 pr-4 align-top">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      aria-label={`${c.name} — ${band} selection limit`}
                      className={inputClass + " w-20"}
                      placeholder={String(defaultFor(c.categoryId, band))}
                      value={draft[c.categoryId]?.[band] ?? ""}
                      onChange={(e) =>
                        setCell(c.categoryId, band, e.target.value)
                      }
                    />
                    <p className="mt-1 text-xs text-ink-soft">
                      default {defaultFor(c.categoryId, band)} ·{" "}
                      {c.dishCount[band] ?? 0} dishes
                    </p>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={save} disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save Limits"}
        </Button>
        <Button variant="secondary" onClick={clearAll} disabled={saving}>
          Clear All
        </Button>
        {notice && (
          <p
            className={
              "text-sm " + (notice.ok ? "text-ink-soft" : "text-maroon")
            }
            role="status"
          >
            {notice.text}
          </p>
        )}
        <p className="ml-auto text-xs text-ink-soft">
          Limits are whole numbers, 0–{MAX_COURSE_QUOTA}.
        </p>
      </div>
    </WidgetCard>
  );
}
