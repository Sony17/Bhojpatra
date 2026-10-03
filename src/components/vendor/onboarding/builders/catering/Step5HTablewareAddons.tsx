"use client";

import BuilderSectionHeader from "../common/BuilderSectionHeader";
import BuilderNav from "../common/BuilderNav";
import type { CutleryTierOption } from "@/lib/vendorMenus";

interface Step5HTablewareAddonsProps {
  cutleryTier?: CutleryTierOption;
  onChangeCutleryTier: (tier: CutleryTierOption) => void;
  onBack: () => void;
  onFinishCatering: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

const TABLEWARE_PACKAGES: {
  id: CutleryTierOption;
  label: string;
  name: string;
  price: string;
  desc: string;
  features: string[];
  icon: string;
}[] = [
  {
    id: "essential",
    label: "Package A",
    name: "Essential Disposables",
    price: "+₹0/p (Included)",
    desc: "Heavy-gauge bagasse sugarcane pulp plates, wooden cutlery, 3-ply napkins and paper tumblers.",
    features: [
      "100% Biodegradable & Compostable",
      "Sturdy 280 GSM Bagasse Compartment Plates",
      "Birchwood Spoons & Forks",
      "Zero cleaning/breakage liabilities",
    ],
    icon: "🌱",
  },
  {
    id: "standard",
    label: "Package B",
    name: "Standard Ceramic & Steel",
    price: "+₹40/p",
    desc: "Glazed white ceramic dinner plates, stainless steel cutlery, water glasses and dessert bowls.",
    features: [
      "High-fired durable hotel-grade ceramic",
      "Stainless steel 304 food-grade cutlery",
      "Glass water tumblers",
      "Standard banquet setup",
    ],
    icon: "🍽️",
  },
  {
    id: "premium",
    label: "Package C",
    name: "Premium Bone China",
    price: "+₹90/p",
    desc: "Translucent lightweight fine bone china with ornate platinum rims, heavy mirror-finish cutlery and crystal glassware.",
    features: [
      "Fine bone china with metallic detailing",
      "Heavy mirror-finish forged cutlery",
      "Crystal stemware for beverages & mocktails",
      "Linen cloth dinner napkins",
    ],
    icon: "✨",
  },
  {
    id: "ultra",
    label: "Package D",
    name: "Ultra Luxury Gold/Silver",
    price: "+₹180/p",
    desc: "Opulent brass, kansa, or 24K gold/silver-plated thali sets with regal bowls and authentic royal handwash lotas.",
    features: [
      "Authentic brass / kansa / gold-plated thalis",
      "Individual royal katoris and sweet cups",
      "Carved brass water goblets",
      "Unmatched royal heritage presentation",
    ],
    icon: "👑",
  },
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
    <div className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs">
      <BuilderSectionHeader
        badge="Section 5H"
        title="Tableware & Crockery Tiers"
        description="Select your default crockery and dining setup package. Bhojpatra standardizes tableware across 4 official tiers so hosts clearly understand table presentation."
        tip="Hosts can choose to upgrade tableware during checkout, and the per-guest uplift will be added to your booking total automatically."
      />

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TABLEWARE_PACKAGES.map((pkg) => {
            const isSelected = cutleryTier === pkg.id;

            return (
              <div
                key={pkg.id}
                onClick={() => onChangeCutleryTier(pkg.id)}
                className={`relative flex flex-col justify-between rounded-card border p-5 transition-all cursor-pointer ${
                  isSelected
                    ? "border-maroon bg-cream-1/50 ring-2 ring-maroon shadow-xs"
                    : "border-cream-3 bg-white hover:border-cream-3/80 hover:bg-cream-1/20"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream-2 text-xl">
                        {pkg.icon}
                      </span>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                          {pkg.label}
                        </span>
                        <h4 className="font-bold text-ink text-sm leading-tight">
                          {pkg.name}
                        </h4>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`rounded-pill px-2.5 py-1 text-xs font-bold ${
                          isSelected
                            ? "bg-maroon text-white"
                            : "bg-cream-2 text-ink"
                        }`}
                      >
                        {pkg.price}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-ink-soft leading-relaxed">
                    {pkg.desc}
                  </p>

                  <ul className="mt-3 space-y-1.5 border-t border-cream-2 pt-3">
                    {pkg.features.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-[11px] text-ink"
                      >
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 pt-3 flex items-center justify-between border-t border-cream-2 text-xs">
                  <span className="text-ink-soft">
                    {isSelected ? "Selected Tableware Tier" : "Click to select"}
                  </span>
                  <div
                    className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? "border-maroon bg-maroon text-white"
                        : "border-cream-3 bg-white"
                    }`}
                  >
                    {isSelected && <span className="text-[10px]">●</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BuilderNav
        onBack={onBack}
        onContinue={onFinishCatering}
        onSaveDraft={onSaveDraft}
        saving={saving}
        continueLabel="Complete Catering Builder →"
      />
    </div>
  );
}
