"use client";

import BuilderNav from "../common/BuilderNav";
import type { CutleryTierOption } from "@/lib/vendorMenus";
import { cn } from "@/components/ui/cn";
import { CardTitle, ContentCard, R, StepHeading } from "../../ui";

interface Step5HTablewareAddonsProps {
  cutleryTier?: CutleryTierOption;
  onChangeCutleryTier: (tier: CutleryTierOption) => void;
  onBack: () => void;
  onFinishCatering: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

/** Handover: Tableware & Cutlery Presentation Add-ons (Packages A–D). */
export const TABLEWARE_PACKAGES: {
  id: CutleryTierOption;
  badge: string;
  name: string;
  mName: string;
  rate: string;
  mRate: string;
  features: string[];
}[] = [
  { id: "essential", badge: "Package A", name: "Eco Disposables", mName: "Eco Disposables (₹0)", rate: "Base Included (₹0)", mRate: "Included (₹0)", features: ["Areca nut leaf plates", "Birchwood spoons/forks", "Paper cups & napkins"] },
  { id: "standard", badge: "Package B", name: "Ceramic & Steel", mName: "Ceramic & Steel (+₹40/p)", rate: "+₹40 / plate", mRate: "+₹40/plate", features: ["Ceramic dinner plates", "Stainless steel cutlery", "Glassware water tumblers"] },
  { id: "premium", badge: "Package C", name: "Bone China Crockery", mName: "Bone China (+₹90/p)", rate: "+₹90 / plate", mRate: "+₹90/plate", features: ["Fine bone china plates", "Premium polished cutlery", "Crystal beverage goblets"] },
  { id: "ultra", badge: "Package D", name: "Royal Gold / Silver", mName: "Luxury Gold/Silver (+₹180/p)", rate: "+₹180 / plate", mRate: "+₹180/plate", features: ["Imported luxury tableware", "Gold / Silver finish cutlery", "Royal banquet styling"] },
];

export default function Step5HTablewareAddons({
  cutleryTier = "essential",
  onChangeCutleryTier,
  onBack,
  onFinishCatering,
  onSaveDraft,
  saving = false,
}: Step5HTablewareAddonsProps) {
  return (
    <div>
      <StepHeading
        eyebrow="Feast Menu Builder · Tableware Add-ons"
        heading="Configure tableware presentation packages"
        subtext="Choose your default crockery, cutlery, and glassware presentation package for feast spreads."
        mEyebrow="Tableware Presentation"
        mHeading="Tableware Add-on"
        mSubtext={null}
      />

      <ContentCard>
        <div>
          <CardTitle>
            <R d="🍽️ Tableware & Cutlery Presentation Add-ons" m="🍽️ Tableware Add-on" />
          </CardTitle>
          <div className="cutlery-tier-grid" role="radiogroup" aria-label="Tableware package">
            {TABLEWARE_PACKAGES.map((pkg) => {
              const active = cutleryTier === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={cn("cutlery-tier-card", active && "active")}
                  onClick={() => onChangeCutleryTier(pkg.id)}
                  style={{ width: "100%", textAlign: "left", font: "inherit", minHeight: 44 }}
                >
                  <div className="cutlery-pkg-badge">{pkg.badge}</div>
                  <div className="cutlery-tier-name">
                    <R d={pkg.name} m={pkg.mName} />
                  </div>
                  <div className="cutlery-rate-hint vob-d">{pkg.rate}</div>
                  <ul className="cutlery-inclusions vob-d">
                    {pkg.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </div>
      </ContentCard>

      <BuilderNav onBack={onBack} onContinue={onFinishCatering} onSaveDraft={onSaveDraft} saving={saving} />
    </div>
  );
}
