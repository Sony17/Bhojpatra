"use client";

import type { VendorDietaryOffering } from "@/lib/vendorMenus";

interface DietaryOfferingSelectorProps {
  value?: VendorDietaryOffering;
  onChange: (value: VendorDietaryOffering) => void;
  error?: string;
  disabled?: boolean;
}

interface Option {
  id: VendorDietaryOffering;
  title: string;
  hindiTitle: string;
  badge: string;
  description: string;
  icon: string;
  colorClass: string;
  borderClass: string;
  bgActiveClass: string;
}

const OPTIONS: Option[] = [
  {
    id: "veg",
    title: "Pure Vegetarian",
    hindiTitle: "शुद्ध शाकाहारी",
    badge: "100% Veg Feasts",
    description: "Strictly vegetarian kitchen with no eggs, meat, or seafood.",
    icon: "🌱",
    colorClass: "text-emerald-700",
    borderClass: "border-emerald-600 bg-emerald-50/50",
    bgActiveClass: "bg-emerald-600 text-white",
  },
  {
    id: "non-veg",
    title: "Non-Vegetarian Only",
    hindiTitle: "मांसाहारी केवल",
    badge: "Non-Veg Specialists",
    description: "Dedicated non-vegetarian caterer focusing on Mughlai & meat spreads.",
    icon: "🍗",
    colorClass: "text-amber-800",
    borderClass: "border-amber-700 bg-amber-50/50",
    bgActiveClass: "bg-amber-800 text-white",
  },
  {
    id: "both",
    title: "Veg & Non-Veg (Both)",
    hindiTitle: "शाकाहारी एवं मांसाहारी",
    badge: "Dual Kitchen / Split",
    description: "Equipped to prepare segregated veg and non-veg courses for mixed events.",
    icon: "🍲",
    colorClass: "text-maroon",
    borderClass: "border-maroon bg-cream",
    bgActiveClass: "bg-maroon text-cream",
  },
];

export default function DietaryOfferingSelector({
  value,
  onChange,
  error,
  disabled = false,
}: DietaryOfferingSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-ink">
          Dietary Offering <span className="text-maroon">*</span>
        </label>
        <span className="text-xs text-ink-soft">Required for menu and booking splits</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {OPTIONS.map((opt) => {
          const isSelected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={`relative flex flex-col justify-between rounded-card border-2 p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-maroon/20 ${
                isSelected
                  ? opt.borderClass + " shadow-sm ring-1 ring-maroon/20"
                  : "border-cream-3 bg-white/70 hover:border-cream-4 hover:bg-white"
              } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xl">{opt.icon}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
                      isSelected ? opt.bgActiveClass : "bg-cream-2 text-ink-soft"
                    }`}
                  >
                    {opt.badge}
                  </span>
                </div>
                <div className="mt-3">
                  <h4 className="font-semibold text-ink text-sm sm:text-base">{opt.title}</h4>
                  <p className="text-xs text-ink-soft/70">{opt.hindiTitle}</p>
                </div>
                <p className="mt-2 text-xs text-ink-soft line-clamp-2 leading-relaxed">
                  {opt.description}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-2 pt-2 border-t border-cream-2/70 text-xs">
                <span
                  className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    isSelected
                      ? "border-maroon bg-maroon text-white"
                      : "border-cream-3 bg-white"
                  }`}
                >
                  {isSelected && <span className="text-[10px] leading-none">✓</span>}
                </span>
                <span className={isSelected ? "font-semibold text-ink" : "text-ink-soft"}>
                  {isSelected ? "Selected" : "Click to select"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
