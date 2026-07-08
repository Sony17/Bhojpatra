"use client";

import { useEffect, useState } from "react";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import { Field, inputClass } from "@/components/admin/shared/FormControls";
import {
  DEFAULT_REFERRAL_RATES,
  MAX_REFERRAL_PERCENT,
  REFERRAL_RATE_ROLES,
  type ReferralRateRole,
  type ReferralRates,
} from "@/lib/referralRates";
import { PARTNER_ROLE_LABEL } from "@/lib/referral";

type RateField = "customerPercent" | "referrerPercent";

/**
 * Admin editor for the referral percentages set per partner type (Individual
 * Referrer, Event Planner). Two knobs each: the discount the CUSTOMER gets when
 * they book with the code, and the reward the REFERRER earns on confirmed
 * referred value. Loads + saves `/api/admin/referral-settings`. `onSaved` lets
 * the parent console refresh its live reward column after a save.
 */
export default function ReferralRatesCard({
  onSaved,
}: {
  onSaved?: (rates: ReferralRates) => void;
}) {
  const [rates, setRates] = useState<ReferralRates>(DEFAULT_REFERRAL_RATES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/referral-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ReferralRates | null) => {
        if (active && d) setRates(d);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const set = (role: ReferralRateRole, field: RateField, value: string) => {
    const n = value === "" ? 0 : Math.max(0, Math.round(Number(value)));
    setRates((r) => ({
      ...r,
      [role]: { ...r[role], [field]: Number.isFinite(n) ? n : 0 },
    }));
    setSaved(false);
    setError("");
  };

  const save = async () => {
    setError("");
    const over = REFERRAL_RATE_ROLES.some((role) =>
      (["customerPercent", "referrerPercent"] as RateField[]).some(
        (f) => rates[role][f] > MAX_REFERRAL_PERCENT,
      ),
    );
    if (over) {
      setError(`Percentages must be between 0 and ${MAX_REFERRAL_PERCENT}.`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/referral-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rates),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error || "Could not save changes.");
      setSaved(true);
      onSaved?.(rates);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <WidgetCard title="Referral Rewards">
      <p className="mb-5 text-sm text-ink-soft">
        Set the referral percentages for each partner type. The{" "}
        <span className="font-semibold text-ink">customer discount</span> comes
        off the customer’s pre-tax bill when they book with the code; the{" "}
        <span className="font-semibold text-ink">referrer reward</span> is what
        the partner earns on their confirmed referred value. Leave a value at 0
        to disable it. Venue Owners aren’t included here.
      </p>

      {loading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : (
        <div className="space-y-5">
          {REFERRAL_RATE_ROLES.map((role) => (
            <div
              key={role}
              className="rounded-xl border border-cream-3 bg-cream/30 p-4"
            >
              <p className="mb-3 font-display text-base font-semibold text-ink">
                {PARTNER_ROLE_LABEL[role]}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Customer discount %"
                  hint="Off the customer’s pre-tax bill."
                >
                  <PercentInput
                    value={rates[role].customerPercent}
                    onChange={(v) => set(role, "customerPercent", v)}
                    ariaLabel={`${PARTNER_ROLE_LABEL[role]} customer discount percent`}
                  />
                </Field>
                <Field
                  label="Referrer reward %"
                  hint="Of confirmed referred value."
                >
                  <PercentInput
                    value={rates[role].referrerPercent}
                    onChange={(v) => set(role, "referrerPercent", v)}
                    ariaLabel={`${PARTNER_ROLE_LABEL[role]} referrer reward percent`}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-maroon">
          {error}
        </p>
      )}
      <div className="mt-5 flex items-center gap-4">
        <button
          type="button"
          disabled={saving || loading}
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
    </WidgetCard>
  );
}

/** A whole-number percent input with a trailing “%”, capped at the max. */
function PercentInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: number;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_REFERRAL_PERCENT}
        step={1}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass + " pr-8"}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm font-medium text-ink-soft"
      >
        %
      </span>
    </div>
  );
}
