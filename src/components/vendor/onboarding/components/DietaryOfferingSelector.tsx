"use client";

import type { VendorDietaryOffering } from "@/lib/vendorMenus";
import { cn } from "@/components/ui/cn";
import { R } from "../ui";

interface DietaryOfferingSelectorProps {
  value?: VendorDietaryOffering;
  onChange: (value: VendorDietaryOffering) => void;
  error?: string;
  disabled?: boolean;
}

const OPTIONS: { id: VendorDietaryOffering; icon: string; title: string; sub: string; mSub: string }[] = [
  {
    id: "veg",
    icon: "🟢",
    title: "Pure Vegetarian",
    sub: "100% vegetarian kitchen with strictly no meat or egg handling.",
    mSub: "100% vegetarian kitchen",
  },
  {
    id: "non-veg",
    icon: "🔴",
    title: "Non-Vegetarian Only",
    sub: "Specialized non-vegetarian kitchen focusing on authentic meat preparations.",
    mSub: "Specialized non-veg kitchen",
  },
  {
    id: "both",
    icon: "⚖️",
    title: "Both Veg & Non-Veg",
    sub: "Strictly separate preparation areas, dedicated fryers, and color-coded utensils.",
    mSub: "Separated prep zones",
  },
];

/** Handover: "Kitchen Dietary Offering *" — mandatory initial gate on Step 1. */
export default function DietaryOfferingSelector({ value, onChange, error, disabled }: DietaryOfferingSelectorProps) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[15px] font-bold text-ink">
        Kitchen Dietary Offering <span className="text-maroon">*</span>
      </div>
      <p className="mt-1 hidden text-[11px] text-ink/50 sm:block">
        Choose your kitchen&apos;s core dietary classification. This determines your catalog classification across all
        services.
      </p>
      <div role="radiogroup" aria-label="Kitchen Dietary Offering" className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {OPTIONS.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(o.id)}
              className={cn(
                "flex min-h-[56px] items-start gap-3 rounded-control border-2 p-3 text-left transition-colors",
                active ? "border-maroon bg-maroon/5" : "border-cream/70 bg-white hover:border-maroon/40",
                error && !value && "border-maroon/60",
              )}
            >
              <span className="text-lg leading-none" aria-hidden>
                {o.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-ink">{o.title}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-ink/60">
                  <R d={o.sub} m={o.mSub} />
                </span>
              </span>
              {active && <span className="ml-auto text-sm font-bold text-maroon">✓</span>}
            </button>
          );
        })}
      </div>
      {error && !value && (
        <p className="mt-3 text-xs font-semibold text-maroon">
          ⚠️ <R d="Please select your kitchen's dietary offering before proceeding." m="Please select dietary offering before proceeding." />
        </p>
      )}
    </div>
  );
}
