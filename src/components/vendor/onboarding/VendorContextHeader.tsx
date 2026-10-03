"use client";

import type { VendorDietaryOffering } from "@/lib/vendorMenus";

/** Short state codes for the "Lucknow, UP" badge. */
const STATE_CODES: Record<string, string> = {
  "Andhra Pradesh": "AP", "Arunachal Pradesh": "AR", Assam: "AS", Bihar: "BR", Chhattisgarh: "CG",
  Delhi: "DL", Goa: "GA", Gujarat: "GJ", Haryana: "HR", "Himachal Pradesh": "HP", "Jammu and Kashmir": "JK",
  Jharkhand: "JH", Karnataka: "KA", Kerala: "KL", Ladakh: "LA", "Madhya Pradesh": "MP", Maharashtra: "MH",
  Manipur: "MN", Meghalaya: "ML", Mizoram: "MZ", Nagaland: "NL", Odisha: "OD", Puducherry: "PY", Punjab: "PB",
  Rajasthan: "RJ", Sikkim: "SK", "Tamil Nadu": "TN", Telangana: "TS", Tripura: "TR", "Uttar Pradesh": "UP",
  Uttarakhand: "UK", "West Bengal": "WB", Chandigarh: "CH",
};

export const DIET_NAMES: Record<VendorDietaryOffering, string> = {
  veg: "Pure Veg",
  "non-veg": "Non-Veg Only",
  both: "Both Veg & Non-Veg",
};

interface VendorContextHeaderProps {
  businessName?: string;
  city?: string;
  state?: string;
  googleRating?: number;
  googleReviews?: number;
  services: string[];
  dietaryOffering?: VendorDietaryOffering;
  builderTag: string;
  onEditDetails: () => void;
  isSaving?: boolean;
  lastSavedAt?: string | null;
}

/**
 * Persistent Vendor Context Header (handover: shown on every screen after
 * Step 1). Identity is captured once and reflected here; "Edit Details ✎"
 * jumps back to Step 1.
 */
export default function VendorContextHeader({
  businessName,
  city,
  state,
  googleRating,
  googleReviews,
  services,
  dietaryOffering,
  builderTag,
  onEditDetails,
  isSaving,
  lastSavedAt,
}: VendorContextHeaderProps) {
  const code = state ? STATE_CODES[state] || state : "";
  return (
    <div className="-mx-4 mb-4 border-b-2 border-cream bg-gradient-to-br from-white to-cream/20 px-4 py-2.5 sm:mx-0 sm:rounded-card sm:border sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-maroon font-display text-lg text-cream"
          >
            भ
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="truncate text-sm font-bold text-ink sm:text-base">
                {businessName || "Vendor Partner"}
              </span>
              {city && (
                <span className="rounded-full bg-cream/40 px-2 py-0.5 text-[11px] font-semibold text-ink">
                  <span className="hidden sm:inline">{code ? `${city}, ${code}` : city}</span>
                  <span className="sm:hidden">{city}</span>
                </span>
              )}
              {googleRating ? (
                <span className="hidden text-[11px] font-semibold text-ink/70 sm:inline">
                  <span className="text-maroon">★</span> {googleRating} ({googleReviews ?? 0} reviews)
                </span>
              ) : null}
            </div>
            <div className="mt-1 hidden flex-wrap items-center gap-1.5 sm:flex">
              <span className="text-[11px] font-semibold text-ink/50">Registered Services:</span>
              {services.map((s) => (
                <span key={s} className="rounded bg-cream/40 px-1.5 py-px text-[10px] font-bold uppercase text-ink">
                  {s}
                </span>
              ))}
              {dietaryOffering && (
                <span className="rounded border border-ink/40 px-1.5 py-px text-[10px] font-bold uppercase text-ink">
                  {DIET_NAMES[dietaryOffering]}
                </span>
              )}
              <span className="rounded-full bg-maroon px-2 py-px text-[10px] font-bold uppercase text-cream">
                {builderTag}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-[11px] text-ink/50 lg:inline" aria-live="polite">
            {isSaving ? "Saving draft..." : lastSavedAt ? "✓ Draft saved" : ""}
          </span>
          <button
            type="button"
            onClick={onEditDetails}
            className="min-h-[36px] rounded-full border border-maroon/30 bg-maroon/5 px-3 text-[11px] font-bold text-maroon"
          >
            <span className="hidden sm:inline">Edit Details ✎</span>
            <span className="sm:hidden">Edit ✎</span>
          </button>
        </div>
      </div>
    </div>
  );
}
