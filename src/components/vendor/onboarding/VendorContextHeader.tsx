"use client";

import type { VendorDietaryOffering } from "@/lib/vendorMenus";

interface VendorContextHeaderProps {
  businessName?: string;
  ownerName?: string;
  city?: string;
  state?: string;
  dietaryOffering?: VendorDietaryOffering;
  serviceCities?: string[];
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  isSaving?: boolean;
  lastSavedAt?: string | null;
}

const DIET_LABELS: Record<VendorDietaryOffering, { label: string; icon: string; cls: string }> = {
  veg: { label: "100% Pure Veg", icon: "🌱", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  "non-veg": { label: "Non-Veg Only", icon: "🍗", cls: "bg-amber-100 text-amber-900 border-amber-300" },
  both: { label: "Veg & Non-Veg", icon: "🍲", cls: "bg-maroon/10 text-maroon border-maroon/30" },
};

export default function VendorContextHeader({
  businessName,
  ownerName,
  city,
  state,
  dietaryOffering,
  serviceCities = [],
  currentStep,
  totalSteps,
  stepTitle,
  isSaving = false,
  lastSavedAt,
}: VendorContextHeaderProps) {
  const dietMeta = dietaryOffering ? DIET_LABELS[dietaryOffering] : null;
  const locationLabel = [city, state].filter(Boolean).join(", ");
  const coverageLabel =
    serviceCities.length > 0
      ? `${serviceCities.length} ${serviceCities.length === 1 ? "City" : "Cities"}`
      : null;

  return (
    <header className="sticky top-0 z-30 mb-6 rounded-card border border-cream-3 bg-white/95 px-4 py-3.5 shadow-xs backdrop-blur-md sm:px-6 sm:py-4 transition-all">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Vendor & Brand Context */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-maroon text-lg font-bold text-cream shadow-xs">
            {businessName ? businessName.charAt(0).toUpperCase() : "B"}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-bold text-ink sm:text-lg">
                {businessName || "Your Catering Brand"}
              </h2>
              {dietMeta && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${dietMeta.cls}`}
                >
                  <span>{dietMeta.icon}</span>
                  <span>{dietMeta.label}</span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-soft">
              {ownerName && (
                <span className="flex items-center gap-1">
                  <span>Owner:</span>
                  <span className="font-medium text-ink">{ownerName}</span>
                </span>
              )}
              {locationLabel && (
                <span className="flex items-center gap-1">
                  <span>📍</span>
                  <span>{locationLabel}</span>
                </span>
              )}
              {coverageLabel && (
                <span className="hidden sm:inline-flex items-center gap-1 text-ink-soft/80">
                  <span>•</span>
                  <span>Serving {coverageLabel}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Step Indicator & Save Status */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-cream-2 sm:border-0">
          <div className="text-left sm:text-right">
            <div className="flex items-center gap-1.5 sm:justify-end">
              <span className="text-[11px] font-bold uppercase tracking-wider text-maroon">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-ink-soft">•</span>
              <span className="text-xs font-semibold text-ink">{stepTitle}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-ink-soft sm:justify-end">
              {isSaving ? (
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <span className="inline-block h-2 w-2 animate-ping rounded-full bg-amber-500" />
                  Saving draft...
                </span>
              ) : lastSavedAt ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <span>✓</span>
                  <span>Draft saved</span>
                </span>
              ) : (
                <span>Auto-saved to cloud</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress line */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-cream-2">
        <div
          className="h-full bg-maroon transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </header>
  );
}
