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
    <div className="animate-in fade-in duration-200">
      <StepHeading
        eyebrow="Feast Menu Builder · Tableware Add-ons"
        heading="Configure tableware presentation packages"
        subtext="Choose your default crockery, cutlery, and glassware presentation package for feast spreads."
        mEyebrow="Tableware Presentation"
        mHeading="Tableware Add-on"
        mSubtext={null}
      />

      <ContentCard>
        <CardTitle>
          <R d="🍽️ Tableware & Cutlery Presentation Add-ons" m="🍽️ Tableware Add-on" />
        </CardTitle>
        <div role="radiogroup" aria-label="Tableware package" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {TABLEWARE_PACKAGES.map((pkg) => {
            const active = cutleryTier === pkg.id;
            return (
              <button
                key={pkg.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChangeCutleryTier(pkg.id)}
                className={cn(
                  "flex min-h-[56px] flex-col gap-1 rounded-card border-2 p-3 text-left transition-colors",
                  active ? "border-maroon bg-maroon/5" : "border-cream/70 bg-white hover:border-maroon/40",
                )}
              >
                <span className="flex items-center justify-between">
                  <span className="rounded-full bg-maroon px-2 py-0.5 text-[10px] font-bold uppercase text-cream">{pkg.badge}</span>
                  {active && <span className="text-sm font-bold text-maroon">✓</span>}
                </span>
                <span className="text-[14px] font-bold text-ink">
                  <R d={pkg.name} m={pkg.mName} />
                </span>
                <span className="hidden text-xs font-semibold text-maroon sm:block">{pkg.rate}</span>
                <ul className="mt-1 hidden space-y-0.5 text-[11px] text-ink/70 sm:block">
                  {pkg.features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </ContentCard>

      <BuilderNav onBack={onBack} onContinue={onFinishCatering} onSaveDraft={onSaveDraft} saving={saving} />
    </div>
  );
}
