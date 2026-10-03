"use client";

import { useState } from "react";
import { cn } from "@/components/ui/cn";
import { ContentCard, FieldError, QtyStepper, R, StepHeading } from "../../ui";
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

  const goldUnlocked = silverDone;

  return (
    <div>
      <StepHeading
        eyebrow="Feast Builder · Tiers & Allowances"
        heading="Configure tier allowances & pricing"
        subtext="Configure course allowances and pricing for Silver (Base) and Gold (Signature) feast tiers."
        mEyebrow="Tiers & Allowances"
        mHeading="Pricing & allowances"
        mSubtext="Configure course allowances and pricing for Silver and Gold tiers."
      />

      <ContentCard>
        {/* Tier Progression Nav Bar (only 1 active at a time) */}
        <div className="tier-progression-bar">
          <button
            type="button"
            className={cn("tier-prog-tab", activeTier === "silver" && "active", silverDone && "completed")}
            aria-current={activeTier === "silver" ? "step" : undefined}
            onClick={() => setActiveTier("silver")}
          >
            <div className="tab-step-num">1</div>
            <div className="tab-label">
              <span>
                <R d="Silver Tier" m={`Silver (Base) · ${fmt(data.priceFrom)}`} />
              </span>
              <span className="tab-tag base vob-d">Bhoj City (Base) · {fmt(data.priceFrom)}</span>
            </div>
            <span className="tab-status">{silverDone ? "✓ Completed" : "In Progress"}</span>
          </button>
          <span className="prog-arrow" aria-hidden>
            →
          </span>
          <button
            type="button"
            className={cn("tier-prog-tab", activeTier === "gold" && "active", !goldUnlocked && "locked")}
            aria-current={activeTier === "gold" ? "step" : undefined}
            aria-disabled={!goldUnlocked || undefined}
            title={!goldUnlocked ? "Please configure and save Silver tier first." : undefined}
            onClick={() => goldUnlocked && setActiveTier("gold")}
          >
            <div className="tab-step-num">2</div>
            <div className="tab-label">
              <span>
                <R d="Gold Tier" m={`Gold (Featured) · ${fmt(data.goldRate)}`} />
              </span>
              <span className="tab-tag featured vob-d">Bhoj Signature · {fmt(data.goldRate)}</span>
            </div>
            <span className="tab-status">
              {!goldUnlocked ? "🔒 Locked" : activeTier === "gold" ? "In Progress" : "Configured"}
            </span>
          </button>
          <span className="prog-arrow" aria-hidden>
            →
          </span>
          <button
            type="button"
            className="tier-prog-tab coming-soon"
            aria-disabled
            title="Platinum tier onboarding is coming soon."
          >
            <div className="tab-step-num">3</div>
            <div className="tab-label">
              <span>Platinum / Coming Soon</span>
            </div>
            <span className="tab-status">Coming Soon</span>
          </button>
        </div>

        {activeTier === "silver" ? (
          /* PANEL 1: SILVER TIER (BASE TIER) */
          <div className="tier-panel tier-panel-silver active">
            <div className="tier-card">
              <div className="tier-header">
                <div>
                  <span className="tier-badge-label" style={{ color: "var(--color-black-80)", fontSize: 14 }}>
                    <R d="Silver / Bhoj City (Base Tier)" m="Silver / Bhoj City" />
                  </span>
                  <div style={{ fontSize: 11, color: "var(--color-black-60)", marginTop: 2 }}>
                    <R d="Standard base platform package. Silver has no specialization." m="Base tier (no specialization)" />
                  </div>
                </div>
                <div className="tier-price-row">
                  <span className="tier-price">{fmt(data.priceFrom)}</span>
                  <span className="tier-unit">
                    <R d="/ plate" m="/ p" />
                  </span>
                </div>
              </div>

              <div className="quota-list" style={{ marginTop: 14 }}>
                {COURSES.map((c) => (
                  <div key={c.key} className="quota-row">
                    <span className="quota-label">
                      <R d={c.label} m={c.short} />
                    </span>
                    <QtyStepper value={data.silverQuotas[c.key]} onChange={(v) => setSilverQuota(c.key, v)} />
                  </div>
                ))}
              </div>

              <FieldError>{error}</FieldError>

              <div className="tier-action-bar">
                <div className="tier-notice-box vob-d" style={{ marginTop: 0, flex: 1, fontSize: 11 }}>
                  ℹ️ Base tier covering essential multi-course offerings. Saving unlocks Gold tier.
                </div>
                <button type="button" className="btn-tier-proceed" onClick={saveSilver}>
                  <R d="Save & Proceed to Gold Tier →" m="Save & Proceed to Gold →" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* PANEL 2: GOLD TIER (FEATURED WITH SPECIALIZATION) */
          <div className="tier-panel tier-panel-gold active">
            <div className="tier-card featured featured-gold">
              <div className="tier-header">
                <div>
                  <span className="tier-badge-label" style={{ color: "var(--color-red)", fontSize: 14 }}>
                    <R d="Gold / Bhoj Signature (Featured Tier)" m="Gold / Bhoj Signature" />
                  </span>
                  <div style={{ fontSize: 11, color: "var(--color-black-60)", marginTop: 2 }}>
                    <R
                      d="Expanded allowances with your kitchen's certified culinary specialization."
                      m="With culinary specialization"
                    />
                  </div>
                </div>
                <div className="tier-price-row">
                  <span className="tier-price" style={{ color: "var(--color-red)" }}>
                    {fmt(data.goldRate)}
                  </span>
                  <span className="tier-unit">
                    <R d="/ plate" m="/ p" />
                  </span>
                </div>
              </div>

              {/* Specialization Selector for Gold Tier */}
              <div className="specialization-box">
                <div className="specialization-title">
                  <R d="Culinary Specialization Category" m="Specialization Category" />{" "}
                  <span className="required">*</span>
                </div>
                <div className="specialization-subtext">
                  <R d="Select your specialization category and fill your menu accordingly:" m="Select specialization to fill menu:" />
                </div>
                <select
                  value={isAddingCustom ? "__custom__" : data.goldSpecialization}
                  onChange={(ev) => {
                    if (ev.target.value === "__custom__") {
                      setCustomSpecText("");
                      setIsAddingCustom(true);
                    } else {
                      setIsAddingCustom(false);
                      onChange({ goldSpecialization: ev.target.value });
                    }
                  }}
                  className="form-select"
                  aria-label="Culinary Specialization Category"
                >
                  {!presets.some((p) => p.value === data.goldSpecialization) && !isAddingCustom && (
                    <option value="">Select specialization</option>
                  )}
                  {presets.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                  <option value="__custom__">➕ Add New Specialization...</option>
                </select>

                {isAddingCustom ? (
                  <div className="custom-spec-wrapper" style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="text"
                        autoFocus
                        value={customSpecText}
                        onChange={(ev) => setCustomSpecText(ev.target.value)}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter") {
                            ev.preventDefault();
                            applyCustom();
                          }
                        }}
                        placeholder="e.g. Kashmiri Wazwan, Chettinad, Marwari, Bengali Feast..."
                        aria-label="New specialization"
                        className="form-input custom-spec-input"
                        style={{ flex: "1 1 220px" }}
                      />
                      <button
                        type="button"
                        className="btn-tier-proceed"
                        style={{ padding: "7px 14px", fontSize: 12, whiteSpace: "nowrap" }}
                        onClick={applyCustom}
                      >
                        <R d="Add Specialization" m="Add" />
                      </button>
                      <button
                        type="button"
                        className="btn-tier-back"
                        style={{ padding: "7px 12px", fontSize: 12 }}
                        onClick={() => setIsAddingCustom(false)}
                      >
                        Cancel
                      </button>
                    </div>
                    <span className="field-hint vob-d" style={{ marginTop: 4, display: "block" }}>
                      Type your kitchen&apos;s unique regional cuisine or signature culinary craft.
                    </span>
                  </div>
                ) : (
                  <div
                    className="spec-footer-action"
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}
                  >
                    <span className="field-hint">
                      <R d="Don't see your regional cuisine above?" m="Not listed?" />
                    </span>
                    <button
                      type="button"
                      className="btn-link-spec"
                      onClick={() => {
                        setCustomSpecText("");
                        setIsAddingCustom(true);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--color-red)",
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      + Add New Specialization
                    </button>
                  </div>
                )}
              </div>

              <div className="quota-list" style={{ marginTop: 14 }}>
                {COURSES.map((c) => (
                  <div key={c.key} className="quota-row">
                    <span className="quota-label">
                      <R d={c.label} m={c.short} />
                    </span>
                    <span className="quota-badge-readonly">
                      <span className="stepper-val">{data.goldQuotas[c.key]}</span> {c.unit}
                      <span className="vob-d"> included</span>
                    </span>
                  </div>
                ))}
              </div>

              <FieldError>{error}</FieldError>

              <div className="tier-action-bar">
                <button type="button" className="btn-tier-back" onClick={() => setActiveTier("silver")}>
                  <R d="← Back to Silver (Review/Edit)" m="← Back to Silver" />
                </button>
                <button type="button" className="btn-tier-proceed" onClick={saveGold}>
                  Save & Continue →
                </button>
              </div>
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
