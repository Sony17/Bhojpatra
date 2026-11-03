"use client";

import { useState } from "react";
import BuilderNav from "../common/BuilderNav";
import type { SingleStallConfig } from "@/lib/vendorMenus";
import { ChipAddInput, ChoiceChip, FormLabel, R, StepHeading } from "../../ui";

interface Step6BStallSetupProps {
  stallConfig?: SingleStallConfig;
  onChangeStallConfig: (config: SingleStallConfig) => void;
  onBack: () => void;
  onFinishStall: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

/** Handover: Live Cooking Equipment Included (also the Quick Configure setup rows). */
export const EQUIPMENT_OPTIONS = [
  "Live Charcoal Sigdi / Tandoor",
  "Inverted Ulta Tawa Griddle",
  "Copper Degchis & Chafers",
  "Commercial Gas Burner",
];

export default function Step6BStallSetup({
  stallConfig = { categories: [] },
  onChangeStallConfig,
  onBack,
  onFinishStall,
  onSaveDraft,
  saving = false,
}: Step6BStallSetupProps) {
  const equipment = stallConfig.equipment || [];
  const [custom, setCustom] = useState("");
  const options = [...EQUIPMENT_OPTIONS, ...equipment.filter((e) => !EQUIPMENT_OPTIONS.includes(e))];

  const toggle = (eq: string) =>
    onChangeStallConfig({
      ...stallConfig,
      equipment: equipment.includes(eq) ? equipment.filter((e) => e !== eq) : [...equipment, eq],
    });

  const addCustom = () => {
    const v = custom.trim();
    if (v && !equipment.includes(v)) onChangeStallConfig({ ...stallConfig, equipment: [...equipment, v] });
    setCustom("");
  };

  return (
    <div className="stall-setup-compact">
      <StepHeading
        eyebrow="Stall Builder · Setup & Cutlery"
        heading="On-site equipment & stall cutlery"
        subtext="Specify live cooking equipment and tableware inclusions accompanying your stall."
        mEyebrow="Stall Setup"
        mHeading="Stall setup & cutlery"
        mSubtext={null}
      />

      <div className="content-card">
        <div className="form-group stall-setup-equipment-block">
          <FormLabel>Live Cooking Equipment Included</FormLabel>
          <div className="stall-setup-rows stall-setup-rows--two-col">
            {options.map((eq) => {
              const on = equipment.includes(eq);
              return (
                <div key={eq} className="stall-setup-row">
                  <span className="stall-setup-row__label">{eq}</span>
                  <ChoiceChip className="stall-setup-chip" active={on} onClick={() => toggle(eq)}>
                    <span className="stall-setup-chip-text">{on ? "Selected" : "Select"}</span>
                  </ChoiceChip>
                </div>
              );
            })}
            <div className="stall-setup-custom-row" style={{ gridColumn: "1 / -1" }}>
              <ChipAddInput value={custom} onChange={setCustom} onAdd={addCustom} placeholder="+ Other equipment" />
            </div>
          </div>
        </div>

        <div className="form-group stall-setup-cutlery">
          <FormLabel htmlFor="stall-cutlery">
            <R d="Stall Tableware & Disposables Inclusions" m="Tableware & Disposables" />
          </FormLabel>
          <input
            id="stall-cutlery"
            type="text"
            maxLength={60}
            value={stallConfig.cutlery || ""}
            onChange={(e) => onChangeStallConfig({ ...stallConfig, cutlery: e.target.value })}
            placeholder="Eco-friendly Areca nut plates, birchwood spoons & napkins"
            className="form-input"
          />
        </div>

        {/* Wizard Action Bar */}
        <div
          className="wizard-actions-bar"
          style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
        >
          <button type="button" className="btn-back" onClick={onBack} disabled={saving}>
            ← Back to Menus
          </button>
          <button type="button" className="btn-next" onClick={onFinishStall} disabled={saving}>
            Continue →
          </button>
        </div>
      </div>

      <BuilderNav onBack={onBack} onContinue={onFinishStall} onSaveDraft={onSaveDraft} saving={saving} />
    </div>
  );
}
