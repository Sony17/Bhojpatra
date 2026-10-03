"use client";

import BuilderNav from "../common/BuilderNav";
import type { VendorEssentialService } from "@/lib/vendorMenus";
import { CardTitle, ChoiceChip, ContentCard, FieldHint, FormLabel, R, StepHeading } from "../../ui";

interface Step5GServiceCrewProps {
  essentialService?: VendorEssentialService;
  onChangeEssentialService: (essentialService: VendorEssentialService) => void;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

/** Handover: Essential Hospitality & Service Inclusions (value, mobile label, legacy ids). */
export const ESSENTIAL_CHIPS: { value: string; short: string; legacy: string[] }[] = [
  { value: "Uniformed Stewards & Service Captain", short: "Stewards", legacy: ["Uniformed Stewards"] },
  { value: "Designer Buffet Tables & Linens", short: "Tables", legacy: ["Buffet Tables & Linens"] },
  { value: "Acrylic Bilingual Food Labels", short: "Labels", legacy: ["Acrylic Food Labels"] },
  { value: "Handwash Station & Sanitizers", short: "Handwash", legacy: ["Handwash Station"] },
  { value: "Dustbins & Waste Management Crew", short: "Dustbins", legacy: ["Waste Bins"] },
  { value: "Continuous Cleaning & Hygiene Crew", short: "Cleaners", legacy: ["Hygiene Crew"] },
];

export function hasEssential(includes: string[], chip: (typeof ESSENTIAL_CHIPS)[number]) {
  return includes.includes(chip.value) || chip.legacy.some((l) => includes.includes(l));
}

export default function Step5GServiceCrew({
  essentialService = { perGuest: 0, includes: [] },
  onChangeEssentialService,
  onBack,
  onContinue,
  onSaveDraft,
  saving = false,
}: Step5GServiceCrewProps) {
  const includes = essentialService.includes || [];

  const toggle = (chip: (typeof ESSENTIAL_CHIPS)[number]) => {
    const on = hasEssential(includes, chip);
    const without = includes.filter((i) => i !== chip.value && !chip.legacy.includes(i));
    onChangeEssentialService({ ...essentialService, includes: on ? without : [...without, chip.value] });
  };

  return (
    <div>
      <StepHeading
        eyebrow="Feast Menu Builder · Service Essentials"
        heading="Configure feast crew & hygiene essentials"
        subtext="Specify standard inclusions for uniformed banquet stewards, buffet setups, bilingual food labels, and waste management."
        mEyebrow="Feast Essentials"
        mHeading="Service Crew"
        mSubtext={null}
      />

      <ContentCard>
        <div>
          <CardTitle>
            <R d="🧑‍🍳 Essential Hospitality & Service Inclusions" m="🧑‍🍳 Service Crew" />
          </CardTitle>
          <div className="review-pills-row">
            {ESSENTIAL_CHIPS.map((chip) => (
              <ChoiceChip key={chip.value} active={hasEssential(includes, chip)} onClick={() => toggle(chip)}>
                <R d={chip.value} m={chip.short} />
              </ChoiceChip>
            ))}
          </div>
        </div>

        <div
          className="form-group"
          style={{ marginTop: 16, paddingTop: 12, borderTop: "1px dashed var(--color-cream-30)", maxWidth: 320 }}
        >
          <FormLabel htmlFor="crewRate">Service Crew Supplement (₹/guest)</FormLabel>
          <input
            id="crewRate"
            type="number"
            inputMode="numeric"
            min={0}
            value={essentialService.perGuest}
            onChange={(e) =>
              onChangeEssentialService({ ...essentialService, perGuest: Math.max(0, parseInt(e.target.value, 10) || 0) })
            }
            className="form-input"
          />
          <FieldHint>Keep ₹0 if standard crew is bundled into your Silver/Gold package rates.</FieldHint>
        </div>
      </ContentCard>

      <BuilderNav onBack={onBack} onContinue={onContinue} onSaveDraft={onSaveDraft} saving={saving} />
    </div>
  );
}
