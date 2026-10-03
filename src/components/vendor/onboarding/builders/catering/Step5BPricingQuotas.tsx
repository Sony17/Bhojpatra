"use client";

import { useState } from "react";
import BuilderSectionHeader from "../common/BuilderSectionHeader";
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

const COURSES: { key: keyof CourseQuotas; label: string; icon: string }[] = [
  { key: "welcome", label: "Welcome Drinks", icon: "🥤" },
  { key: "starters", label: "Starters & Appetizers", icon: "🍢" },
  { key: "main", label: "Main Course Dishes", icon: "🍲" },
  { key: "breads", label: "Artisan Breads", icon: "🫓" },
  { key: "sweets", label: "Mithai & Sweets", icon: "🍬" },
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customSpecText, setCustomSpecText] = useState("");

  const handleApplyCustomSpec = () => {
    const trimmed = customSpecText.trim();
    if (!trimmed) return;
    onChange({ goldSpecialization: trimmed });
    setIsAddingCustom(false);
    setCustomSpecText("");
  };

  const handleSilverQuotaChange = (course: keyof CourseQuotas, val: number) => {
    const clamped = Math.max(0, Math.min(24, val || 0));
    onChange({
      silverQuotas: {
        ...data.silverQuotas,
        [course]: clamped,
      },
    });
  };

  const handleGoldQuotaChange = (course: keyof CourseQuotas, val: number) => {
    const clamped = Math.max(0, Math.min(24, val || 0));
    onChange({
      goldQuotas: {
        ...data.goldQuotas,
        [course]: clamped,
      },
    });
  };

  const validateAndContinue = () => {
    const newErrors: Record<string, string> = {};

    if (!data.priceFrom || data.priceFrom < 100) {
      newErrors.priceFrom = "Please enter a valid Silver per-plate base rate (min ₹100).";
    }

    if (!data.goldRate || data.goldRate <= data.priceFrom) {
      newErrors.goldRate = "Gold rate must be higher than the Silver rate.";
    }

    // Validate 0..24 quotas
    for (const c of COURSES) {
      const sVal = data.silverQuotas[c.key];
      if (sVal < 0 || sVal > 24) {
        newErrors[`silver_${c.key}`] = "Quota must be between 0 and 24.";
      }
      const gVal = data.goldQuotas[c.key];
      if (gVal < 0 || gVal > 24) {
        newErrors[`gold_${c.key}`] = "Quota must be between 0 and 24.";
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onContinue();
    }
  };

  return (
    <div className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs">
      <BuilderSectionHeader
        badge="Section 5B"
        title="Pricing & Course Quotas"
        description="Set your per-guest rates and guest selection quotas for Silver and Gold packages. Quotas specify how many delicacies a host picks from each course."
        tip="Quotas must fall within the 0 to 24 dishes range. Setting a quota to 0 excludes that course from the respective feast package."
      />

      <div className="mt-6 space-y-8">
        {/* Tier Cards Container */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* SILVER TIER CARD */}
          <div className="flex flex-col rounded-card border-2 border-slate-300 bg-slate-50/50 p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-400 text-xs font-bold text-white">
                  🥈
                </span>
                <div>
                  <h3 className="font-bold text-ink">Silver Package</h3>
                  <p className="text-[11px] text-ink-soft">Essential classical feast spread</p>
                </div>
              </div>
              <span className="rounded-pill bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                Standard
              </span>
            </div>

            <div className="mt-4 space-y-4 flex-1">
              <div>
                <label
                  htmlFor="silverRate"
                  className="block text-xs font-bold uppercase tracking-wider text-ink"
                >
                  Silver Base Rate (₹/plate) <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-bold text-ink-soft">
                    ₹
                  </span>
                  <input
                    id="silverRate"
                    type="number"
                    min={100}
                    max={10000}
                    value={data.priceFrom || ""}
                    onChange={(e) =>
                      onChange({ priceFrom: parseInt(e.target.value, 10) || 0 })
                    }
                    placeholder="799"
                    className="w-full rounded-control border border-slate-300 bg-white pl-8 pr-3 py-2 text-sm font-semibold text-ink focus:border-maroon focus:outline-hidden min-h-[44px]"
                  />
                </div>
                {errors.priceFrom && (
                  <p className="mt-1 text-xs text-red-600">{errors.priceFrom}</p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-2">
                  Course Selection Quotas (0–24)
                </h4>
                <div className="space-y-2.5 rounded-control border border-slate-200 bg-white p-3">
                  {COURSES.map((c) => (
                    <div
                      key={`silver-${c.key}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-xs text-ink flex items-center gap-1.5 font-medium">
                        <span>{c.icon}</span>
                        <span>{c.label}</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleSilverQuotaChange(
                              c.key,
                              (data.silverQuotas[c.key] || 0) - 1,
                            )
                          }
                          disabled={(data.silverQuotas[c.key] || 0) <= 0}
                          aria-label={`Decrease Silver quota for ${c.label}`}
                          className="flex h-7 w-7 items-center justify-center rounded-control border border-slate-300 bg-white text-xs font-bold text-ink hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={24}
                          value={data.silverQuotas[c.key]}
                          onChange={(e) =>
                            handleSilverQuotaChange(
                              c.key,
                              parseInt(e.target.value, 10),
                            )
                          }
                          aria-label={`Silver quota for ${c.label}`}
                          className="w-12 rounded-control border border-slate-200 bg-slate-50 text-center py-1 text-xs font-bold text-ink focus:border-maroon focus:outline-hidden min-h-[32px]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleSilverQuotaChange(
                              c.key,
                              (data.silverQuotas[c.key] || 0) + 1,
                            )
                          }
                          disabled={(data.silverQuotas[c.key] || 0) >= 24}
                          aria-label={`Increase Silver quota for ${c.label}`}
                          className="flex h-7 w-7 items-center justify-center rounded-control border border-slate-300 bg-white text-xs font-bold text-ink hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          +
                        </button>
                        <span className="text-[10px] text-ink-soft pl-1">picks</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* GOLD TIER CARD */}
          <div className="flex flex-col rounded-card border-2 border-amber-300 bg-amber-50/40 p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-amber-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white shadow-xs">
                  🥇
                </span>
                <div>
                  <h3 className="font-bold text-ink">Gold Package</h3>
                  <p className="text-[11px] text-ink-soft">Lavish premium celebration spread</p>
                </div>
              </div>
              <span className="rounded-pill bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Most Popular
              </span>
            </div>

            <div className="mt-4 space-y-4 flex-1">
              <div>
                <label
                  htmlFor="goldRate"
                  className="block text-xs font-bold uppercase tracking-wider text-ink"
                >
                  Gold Base Rate (₹/plate) <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-bold text-ink-soft">
                    ₹
                  </span>
                  <input
                    id="goldRate"
                    type="number"
                    min={100}
                    max={20000}
                    value={data.goldRate || ""}
                    onChange={(e) =>
                      onChange({ goldRate: parseInt(e.target.value, 10) || 0 })
                    }
                    placeholder="1199"
                    className="w-full rounded-control border border-amber-300 bg-white pl-8 pr-3 py-2 text-sm font-semibold text-ink focus:border-maroon focus:outline-hidden min-h-[44px]"
                  />
                </div>
                {errors.goldRate && (
                  <p className="mt-1 text-xs text-red-600">{errors.goldRate}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="goldSpec"
                  className="block text-xs font-bold uppercase tracking-wider text-ink"
                >
                  Gold Specialization / Signature Delicacy
                </label>
                <select
                  id="goldSpec"
                  value={
                    SPECIALIZATION_PRESETS.some((p) => p.value === data.goldSpecialization)
                      ? data.goldSpecialization
                      : data.goldSpecialization
                      ? data.goldSpecialization
                      : "Awadhi"
                  }
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setIsAddingCustom(true);
                      setCustomSpecText("");
                    } else {
                      onChange({ goldSpecialization: e.target.value });
                    }
                  }}
                  className="mt-1 w-full rounded-control border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-ink focus:border-maroon focus:outline-hidden min-h-[40px]"
                >
                  {SPECIALIZATION_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                  {data.goldSpecialization &&
                    !SPECIALIZATION_PRESETS.some((p) => p.value === data.goldSpecialization) && (
                      <option value={data.goldSpecialization}>
                        {data.goldSpecialization} (Custom Specialization)
                      </option>
                    )}
                  <option value="__custom__">➕ Add New Specialization...</option>
                </select>

                {isAddingCustom ? (
                  <div className="mt-2 rounded-control border border-amber-300 bg-amber-50/70 p-2.5">
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={customSpecText}
                        onChange={(e) => setCustomSpecText(e.target.value)}
                        placeholder="e.g. Kashmiri Wazwan, Chettinad, Marwari..."
                        className="flex-1 rounded-control border border-amber-300 bg-white px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-soft/60 focus:border-maroon focus:outline-hidden min-h-[36px]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleApplyCustomSpec();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleApplyCustomSpec}
                        className="rounded-control bg-maroon px-3 py-1.5 text-xs font-bold text-white hover:bg-maroon-dark transition-colors whitespace-nowrap min-h-[36px]"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCustom(false);
                          setCustomSpecText("");
                        }}
                        className="rounded-control border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-slate-50 transition-colors min-h-[36px]"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-ink-soft">
                      Type your kitchen's unique regional cuisine or signature culinary craft.
                    </p>
                  </div>
                ) : (
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[11px] text-ink-soft">
                      Don't see your regional cuisine above?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCustom(true);
                        setCustomSpecText("");
                      }}
                      className="text-[11px] font-bold text-maroon hover:underline cursor-pointer"
                    >
                      + Add New Specialization
                    </button>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-2">
                  Course Selection Quotas (0–24)
                </h4>
                <div className="space-y-2.5 rounded-control border border-amber-200 bg-white p-3">
                  {COURSES.map((c) => (
                    <div
                      key={`gold-${c.key}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-xs text-ink flex items-center gap-1.5 font-medium">
                        <span>{c.icon}</span>
                        <span>{c.label}</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleGoldQuotaChange(
                              c.key,
                              (data.goldQuotas[c.key] || 0) - 1,
                            )
                          }
                          disabled={(data.goldQuotas[c.key] || 0) <= 0}
                          aria-label={`Decrease Gold quota for ${c.label}`}
                          className="flex h-7 w-7 items-center justify-center rounded-control border border-amber-300 bg-white text-xs font-bold text-ink hover:bg-amber-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={24}
                          value={data.goldQuotas[c.key]}
                          onChange={(e) =>
                            handleGoldQuotaChange(
                              c.key,
                              parseInt(e.target.value, 10),
                            )
                          }
                          aria-label={`Gold quota for ${c.label}`}
                          className="w-12 rounded-control border border-amber-200 bg-amber-50/50 text-center py-1 text-xs font-bold text-ink focus:border-maroon focus:outline-hidden min-h-[32px]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleGoldQuotaChange(
                              c.key,
                              (data.goldQuotas[c.key] || 0) + 1,
                            )
                          }
                          disabled={(data.goldQuotas[c.key] || 0) >= 24}
                          aria-label={`Increase Gold quota for ${c.label}`}
                          className="flex h-7 w-7 items-center justify-center rounded-control border border-amber-300 bg-white text-xs font-bold text-ink hover:bg-amber-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          +
                        </button>
                        <span className="text-[10px] text-ink-soft pl-1">picks</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PLATINUM COMING SOON BANNER */}
        <div className="relative overflow-hidden rounded-card border border-dashed border-purple-300 bg-purple-50/40 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-200 text-lg">
                💎
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-ink">Platinum Royal Tier</h4>
                  <span className="rounded-pill bg-purple-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-2xs">
                    Coming Soon
                  </span>
                </div>
                <p className="text-xs text-ink-soft mt-0.5">
                  Ultra-luxury destination wedding feasts (Ref: ₹1,599/p) will unlock after initial menu verification.
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-xs font-semibold text-purple-700 bg-purple-100/80 px-3 py-1.5 rounded-control">
                Unlocks in Stage 5
              </span>
            </div>
          </div>
        </div>
      </div>

      <BuilderNav
        onBack={onBack}
        onContinue={validateAndContinue}
        onSaveDraft={onSaveDraft}
        saving={saving}
        continueLabel="Continue to Course Hierarchy →"
      />
    </div>
  );
}
