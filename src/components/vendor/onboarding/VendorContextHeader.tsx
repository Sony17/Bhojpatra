"use client";

import type { VendorDietaryOffering } from "@/lib/vendorMenus";

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
 * Persistent Vendor Context Header (.vendor-context-header) — shown on every
 * screen after Step 1. Identity is captured once and reflected here;
 * "Edit Details ✎" jumps back to Step 1.
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
}: VendorContextHeaderProps) {
  const name = businessName || "Vendor Partner";
  return (
    <aside className="vendor-context-header">
      <div className="vendor-context-main">
        <div className="vendor-context-avatar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="Bhojpatra Emblem" className="bhojpatra-official-emblem" />
        </div>
        <div className="vendor-context-text">
          <div className="vendor-context-name-row">
            <span className="vendor-context-biz-name">{name}</span>
            {city && (
              <span className="vendor-context-city-badge">
                <span className="vob-d">{[city, state].filter(Boolean).join(", ")}</span>
                <span className="vob-m">{city}</span>
              </span>
            )}
            {googleRating ? (
              <span className="vendor-context-rating-badge vob-d-flex">
                <span className="star">★</span> {googleRating} ({googleReviews ?? 0} reviews)
              </span>
            ) : null}
          </div>
          <div className="vendor-context-sub-row vob-d-flex">
            <span>Registered Services:</span>
            <div className="vendor-context-services">
              {services.map((s) => (
                <span key={s} className="service-pill">
                  {s}
                </span>
              ))}
              {dietaryOffering && (
                <span className="service-pill vob-diet-pill">{DIET_NAMES[dietaryOffering]}</span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="vendor-context-actions">
        <span className="active-builder-tag vob-d-flex">{builderTag}</span>
        <div className="vendor-context-services vob-m-flex">
          {services.map((s) => (
            <span key={s} className="service-pill">
              {s}
            </span>
          ))}
        </div>
        <button type="button" className="btn-edit-vendor-context" onClick={onEditDetails}>
          <span className="vob-d">Edit Details ✎</span>
          <span className="vob-m">Edit ✎</span>
        </button>
      </div>
    </aside>
  );
}
