"use client";

import { useState } from "react";
import { ChoiceChip, FieldError, FormLabel, R, StepHeading } from "../../ui";
import BuilderNav from "../common/BuilderNav";
import type { VendorBainaDetails } from "@/lib/vendorMenus";

interface Step7ABainaStoryProps {
  bainaDetails?: VendorBainaDetails;
  onChangeBainaDetails: (details: VendorBainaDetails) => void;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

/** Handover: Best For (Gifting Occasions). */
const BAINA_OCCASIONS = [
  "Wedding Announcements",
  "Festival Sweets (Diwali/Eid)",
  "Corporate Favours",
  "Family Ceremonies",
];

export default function Step7ABainaStory({
  bainaDetails = {},
  onChangeBainaDetails,
  onBack,
  onContinue,
  onSaveDraft,
  saving = false,
}: Step7ABainaStoryProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const occasions = bainaDetails.occasions || [];
  const set = (patch: Partial<VendorBainaDetails>) => onChangeBainaDetails({ ...bainaDetails, ...patch });

  const validateAndContinue = () => {
    const e: Record<string, string> = {};
    if (!bainaDetails.studioName?.trim()) e.studioName = "Gifting Studio Brand Name is required.";
    if (!bainaDetails.leadDays || bainaDetails.leadDays < 1) e.leadDays = "Production Notice must be at least 1 day.";
    setErrors(e);
    if (!Object.keys(e).length) onContinue();
  };

  return (
    <div>
      <StepHeading
        eyebrow="Baina Builder · Studio Story"
        heading="Artisanal gifting studio & traditions"
        subtext="Define your gifting brand, pure ghee commitment, bulk minimums, and occasion specialties."
        mEyebrow="Gifting Story"
        mHeading="Gifting story"
        mSubtext={null}
      />

      <div className="content-card">
        <div className="form-grid-2">
          <div className="form-group">
            <FormLabel required htmlFor="baina-studio-name">
              <R d="Gifting Studio Brand Name" m="Studio Name" />
            </FormLabel>
            <input
              id="baina-studio-name"
              type="text"
              value={bainaDetails.studioName || ""}
              onChange={(ev) => set({ studioName: ev.target.value })}
              placeholder="e.g. Ram Asrey Royal Baina Studio"
              className="form-input"
            />
            <FieldError>{errors.studioName}</FieldError>
          </div>
          <div className="form-group">
            <FormLabel required htmlFor="baina-lead-days">
              Production Notice (Days)
            </FormLabel>
            <input
              id="baina-lead-days"
              type="number"
              inputMode="numeric"
              min={1}
              value={bainaDetails.leadDays ?? ""}
              onChange={(ev) => set({ leadDays: Number(ev.target.value) })}
              placeholder="3"
              className="form-input"
            />
            <FieldError>{errors.leadDays}</FieldError>
          </div>
        </div>

        <div className="form-group">
          <FormLabel htmlFor="baina-story">Heritage Confectionery Story</FormLabel>
          <textarea
            id="baina-story"
            value={bainaDetails.story || ""}
            onChange={(ev) => set({ story: ev.target.value })}
            placeholder="Heritage Lucknow sweetmakers since 1850, handcrafting artisanal sweet hampers..."
            className="form-textarea"
          />
        </div>

        <div className="form-group">
          <FormLabel>Best For (Gifting Occasions)</FormLabel>
          <div className="chip-grid">
            {BAINA_OCCASIONS.map((o) => (
              <ChoiceChip
                key={o}
                active={occasions.includes(o)}
                onClick={() => set({ occasions: occasions.includes(o) ? occasions.filter((x) => x !== o) : [...occasions, o] })}
              >
                {o}
              </ChoiceChip>
            ))}
          </div>
        </div>
      </div>

      <BuilderNav onBack={onBack} onContinue={validateAndContinue} onSaveDraft={onSaveDraft} saving={saving} />
    </div>
  );
}
