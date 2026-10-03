"use client";

import { useState } from "react";
import { cn } from "@/components/ui/cn";
import { ContentCard, FieldError, QtyStepper, R, StepHeading, inputCls } from "../../ui";
import BuilderNav from "../common/BuilderNav";

export interface CourseQuotas {
  welcome: number;
  starters: number;
  main: number;
  breads: number;
  sweets: number;
}

export interface PricingQuotasData {
  priceFrom: number; // Silver rate
  goldRate: number; // Gold rate
  goldSpecialization: string;
  silverQuotas: CourseQuotas;
  goldQuotas: CourseQuotas;
}

interface Step5BPricingQuotasProps {
  data: PricingQuotasData;
  onChange: (patch: Partial<PricingQuotasData>) => void;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

/** Handover allowance rows (Welcome Drinks keep their saved quota but aren't shown). */
const COURSES: { key: keyof CourseQuotas; label: string; short: string; unit: string }[] = [
  { key: "starters", label: "Starters Allowance", short: "Starters", unit: "dishes" },
  { key: "main", label: "Main Course", short: "Main Course", unit: "dishes" },
  { key: "breads", label: "Breads", short: "Breads", unit: "breads" },
  { key: "sweets", label: "Sweets & Mithai", short: "Sweets", unit: "sweets" },
];


const SPECIALIZATION_PRESETS = [
  { value: "Awadhi", label: "Awadhi Cuisine (Lucknowi Dum & Kebabs)" },
  { value: "Mughlai", label: "Mughlai Cuisine (Rich Gravies & Royal Dastarkhwan)" },
  { value: "North Indian", label: "North Indian (Paneer, Dal Makhani & Tandoor)" },
  { value: "Tandoori & Grills", label: "Tandoori & Grills (Live Sigdi & Charcoal Skewers)" },
  { value: "Indo-Chinese", label: "Indo-Chinese (Live Wok Tosses & Dimsums)" },
  { value: "South Indian", label: "South Indian (Live Dosa Bar & Traditional Thali)" },
  { value: "Banarasi Chaat", label: "Banarasi Chaat (Live Kashi Street Food)" },
  { value: "Artisanal Sweets", label: "Artisanal Sweets (Heritage Mithai & Halwai Studio)" },
];

export default function Step5BPricingQuotas({
  data,
  onChange,
  onBack,
  onContinue,
  onSaveDraft,
  saving = false,
}: Step5BPricingQuotasProps) {
  // Sequential single-tier onboarding: Silver first; Gold unlocks once Silver is saved.
  const [activeTier, setActiveTier] = useState<"silver" | "gold">("silver");
  const [silverDone, setSilverDone] = useState(false);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customSpecText, setCustomSpecText] = useState("");
  const [error, setError] = useState("");

  const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

  const setSilverQuota = (course: keyof CourseQuotas, val: number) =>
    onChange({ silverQuotas: { ...data.silverQuotas, [course]: Math.max(0, Math.min(24, val)) } });

  const presets = SPECIALIZATION_PRESETS.some((p) => p.value === data.goldSpecialization)
    ? SPECIALIZATION_PRESETS
    : data.goldSpecialization
      ? [...SPECIALIZATION_PRESETS, { value: data.goldSpecialization, label: `${data.goldSpecialization} (Custom Specialization)` }]
      : SPECIALIZATION_PRESETS;

  const applyCustom = () => {
    const t = customSpecText.trim();
    if (!t) return;
    onChange({ goldSpecialization: t });
    setIsAddingCustom(false);
    setCustomSpecText("");
  };

  const saveSilver = () => {
    if (!COURSES.some((c) => data.silverQuotas[c.key] > 0)) {
      setError("Silver must include at least one dish allowance.");
      return;
    }
    setError("");
    setSilverDone(true);
    setActiveTier("gold");
    onSaveDraft?.();
  };

  const saveGold = () => {
    if (!data.goldSpecialization?.trim()) {
      setError("Please select a culinary specialization for the Gold tier.");
      return;
    }
    setError("");
    onContinue();
  };

  const tabBase =
    "flex min-h-[48px] shrink-0 items-center gap-2 rounded-control border-[1.5px] px-3 py-2 text-left text-xs transition-colors";

  return (
    <div className="animate-in fade-in duration-200">
      <StepHeading
        eyebrow="Feast Builder · Tiers & Allowances"
        heading="Configure tier allowances & pricing"
        subtext="Configure course allowances and pricing for Silver (Base) and Gold (Signature) feast tiers."
        mEyebrow="Tiers & Allowances"
        mHeading="Pricing & allowances"
        mSubtext="Configure course allowances and pricing for Silver and Gold tiers."
      />

      <ContentCard>
        {/* Progression tabs */}
        <div className="-mx-1 mb-5 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          <button
            type="button"
            onClick={() => setActiveTier("silver")}
            className={cn(tabBase, activeTier === "silver" ? "border-maroon bg-maroon/5 text-ink" : "border-transparent text-ink/60")}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-maroon text-[11px] font-bold text-cream">
              {silverDone ? "✓" : "1"}
            </span>
            <span>
              <span className="block font-bold">
                <R d="Silver Tier" m={`Silver (Base) · ${fmt(data.priceFrom)}`} />
              </span>
              <span className="hidden text-[11px] sm:block">Bhoj City (Base) · {fmt(data.priceFrom)}</span>
              <span className="block text-[10px] font-semibold text-maroon">{silverDone ? "✓ Completed" : "In Progress"}</span>
            </span>
          </button>
          <span className="hidden text-ink/30 sm:inline" aria-hidden>→</span>
          <button
            type="button"
            disabled={!silverDone}
            onClick={() => setActiveTier("gold")}
            className={cn(
              tabBase,
              activeTier === "gold" ? "border-maroon bg-maroon/5 text-ink" : "border-transparent text-ink/60",
              !silverDone && "opacity-60",
            )}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-maroon text-[11px] font-bold text-maroon">
              2
            </span>
            <span>
              <span className="block font-bold">
                <R d="Gold Tier" m={`Gold (Featured) · ${fmt(data.goldRate)}`} />
              </span>
              <span className="hidden text-[11px] sm:block">Bhoj Signature · {fmt(data.goldRate)}</span>
              <span className="block text-[10px] font-semibold text-maroon">
                {!silverDone ? "🔒 Locked" : activeTier === "gold" ? "In Progress" : "Configured"}
              </span>
            </span>
          </button>
          <span className="hidden text-ink/30 sm:inline" aria-hidden>→</span>
          <div className={cn(tabBase, "border-transparent text-ink/40")} aria-disabled>
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-cream text-[11px] font-bold">3</span>
            <span>
              <span className="block font-bold">Platinum / Coming Soon</span>
              <span className="block text-[10px] font-semibold">Coming Soon</span>
            </span>
          </div>
        </div>

        {activeTier === "silver" ? (
          <div className="rounded-card border border-cream bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-ink">
                  <R d="Silver / Bhoj City (Base Tier)" m="Silver / Bhoj City" />
                </div>
                <div className="text-[11px] text-ink/60">
                  <R d="Standard base platform package. Silver has no specialization." m="Base tier (no specialization)" />
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-maroon">{fmt(data.priceFrom)}</span>
                <span className="text-xs text-ink/60">
                  <R d=" / plate" m=" / p" />
                </span>
              </div>
            </div>
            <div className="mt-4 divide-y divide-cream/50">
              {COURSES.map((c) => (
                <div key={c.key} className="flex items-center justify-between py-2">
                  <span className="text-[13px] font-semibold text-ink">
                    <R d={c.label} m={c.short} />
                  </span>
                  <QtyStepper value={data.silverQuotas[c.key]} onChange={(v) => setSilverQuota(c.key, v)} />
                </div>
              ))}
            </div>
            <p className="mt-3 hidden rounded-control bg-cream/20 p-2.5 text-[11px] text-ink/70 sm:block">
              ℹ️ Base tier covering essential multi-course offerings. Saving unlocks Gold tier.
            </p>
            <FieldError>{error}</FieldError>
            <button
              type="button"
              onClick={saveSilver}
              className="mt-4 min-h-[44px] w-full rounded-full bg-maroon px-5 text-[13px] font-bold text-cream sm:w-auto"
            >
              <R d="Save & Proceed to Gold Tier →" m="Save & Proceed to Gold →" />
            </button>
          </div>
        ) : (
          <div className="rounded-card border-2 border-maroon/40 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-ink">
                  <R d="Gold / Bhoj Signature (Featured Tier)" m="Gold / Bhoj Signature" />
                </div>
                <div className="text-[11px] text-ink/60">
                  <R d="Expanded allowances with your kitchen's certified culinary specialization." m="With culinary specialization" />
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-maroon">{fmt(data.goldRate)}</span>
                <span className="text-xs text-ink/60">
                  <R d=" / plate" m=" / p" />
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-control border border-cream bg-cream/10 p-3">
              <div className="text-[13px] font-bold text-ink">
                <R d="Culinary Specialization Category" m="Specialization Category" />
                <span className="text-maroon"> *</span>
              </div>
              <div className="mb-2 text-[11px] text-ink/60">
                <R d="Select your specialization category and fill your menu accordingly:" m="Select specialization to fill menu:" />
              </div>
              {isAddingCustom ? (
                <div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      autoFocus
                      value={customSpecText}
                      onChange={(ev) => setCustomSpecText(ev.target.value)}
                      onKeyDown={(ev) => ev.key === "Enter" && applyCustom()}
                      placeholder="e.g. Kashmiri Wazwan, Chettinad, Marwari, Bengali Feast..."
                      className={inputCls}
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={applyCustom} className="min-h-[44px] flex-1 rounded-full bg-maroon px-4 text-xs font-bold text-cream sm:flex-none">
                        <R d="Add Specialization" m="Add" />
                      </button>
                      <button type="button" onClick={() => setIsAddingCustom(false)} className="min-h-[44px] flex-1 rounded-full border border-cream px-4 text-xs font-bold text-ink/80 sm:flex-none">
                        Cancel
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 hidden text-[11px] text-ink/50 sm:block">
                    Type your kitchen&apos;s unique regional cuisine or signature culinary craft.
                  </p>
                </div>
              ) : (
                <>
                  <select
                    value={data.goldSpecialization}
                    onChange={(ev) =>
                      ev.target.value === "__custom__"
                        ? setIsAddingCustom(true)
                        : onChange({ goldSpecialization: ev.target.value })
                    }
                    className={inputCls}
                    aria-label="Culinary Specialization Category"
                  >
                    {!presets.some((p) => p.value === data.goldSpecialization) && <option value="">Select specialization</option>}
                    {presets.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                    <option value="__custom__">➕ Add New Specialization...</option>
                  </select>
                  <div className="mt-1.5 flex items-center gap-1 text-[11px] text-ink/50">
                    <R d="Don't see your regional cuisine above?" m="Not listed?" />
                    <button type="button" onClick={() => setIsAddingCustom(true)} className="min-h-[32px] font-bold text-maroon">
                      + Add New Specialization
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 divide-y divide-cream/50">
              {COURSES.map((c) => (
                <div key={c.key} className="flex items-center justify-between py-2.5">
                  <span className="text-[13px] font-semibold text-ink">
                    <R d={c.label} m={c.short} />
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="rounded-full bg-cream/40 px-2 py-0.5 text-[11px] font-semibold text-ink">
                      {data.goldQuotas[c.key]} {c.unit}
                      <span className="hidden sm:inline"> included</span>
                    </span>
                    <span className="w-6 text-center text-base font-bold text-ink">{data.goldQuotas[c.key]}</span>
                  </span>
                </div>
              ))}
            </div>
            <FieldError>{error}</FieldError>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <button type="button" onClick={() => setActiveTier("silver")} className="min-h-[44px] rounded-full border border-cream px-4 text-[13px] font-bold text-ink/80">
                <R d="← Back to Silver (Review/Edit)" m="← Back to Silver" />
              </button>
              <button type="button" onClick={saveGold} className="min-h-[44px] rounded-full bg-maroon px-5 text-[13px] font-bold text-cream">
                Save & Continue →
              </button>
            </div>
          </div>
        )}
      </ContentCard>

      <BuilderNav
        onBack={onBack}
        onContinue={activeTier === "gold" ? saveGold : saveSilver}
        onSaveDraft={onSaveDraft}
        saving={saving}
      />
    </div>
  );
}
