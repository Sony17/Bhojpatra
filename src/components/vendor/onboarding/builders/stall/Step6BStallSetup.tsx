"use client";

import { useState } from "react";
import BuilderNav from "../common/BuilderNav";
import type { SingleStallConfig } from "@/lib/vendorMenus";
import { ChipAddInput, ChoiceChip, ContentCard, FieldHint, FormLabel, R, StepHeading, inputCls } from "../../ui";

interface Step6BStallSetupProps {
  stallConfig?: SingleStallConfig;
  onChangeStallConfig: (config: SingleStallConfig) => void;
  onBack: () => void;
  onFinishStall: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

/** Handover: Live Cooking Equipment Included. */
const EQUIPMENT_OPTIONS = [
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
    <div className="animate-in fade-in duration-200">
      <StepHeading
        eyebrow="Stall Builder · Setup & Cutlery"
        heading="On-site equipment & stall cutlery"
        subtext="Specify live cooking equipment and tableware inclusions accompanying your stall."
        mEyebrow="Stall Setup"
        mHeading="Stall setup & cutlery"
        mSubtext={null}
      />

      <ContentCard>
        <FormLabel>Live Cooking Equipment Included</FormLabel>
        <div className="flex flex-wrap items-center gap-2">
          {options.map((eq) => (
            <ChoiceChip key={eq} active={equipment.includes(eq)} onClick={() => toggle(eq)}>
              {eq}
            </ChoiceChip>
          ))}
          <ChipAddInput value={custom} onChange={setCustom} onAdd={addCustom} placeholder="+ Other equipment" />
        </div>

        <div className="mt-5">
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
            className={inputCls}
          />
          <FieldHint>Shown to guests on the stall listing (max 60 characters).</FieldHint>
        </div>
      </ContentCard>

      <BuilderNav backLabel="← Back to Menus" onBack={onBack} onContinue={onFinishStall} onSaveDraft={onSaveDraft} saving={saving} />
    </div>
  );
}
