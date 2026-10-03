"use client";

import type { VendorDietaryOffering } from "@/lib/vendorMenus";
import { cn } from "@/components/ui/cn";
import { DietMark, R } from "../ui";

interface DietaryOfferingSelectorProps {
  value?: VendorDietaryOffering;
  onChange: (value: VendorDietaryOffering) => void;
  error?: string;
  disabled?: boolean;
  /** DOM id of the section (scroll target for validation). */
  id?: string;
}

const OPTIONS: { id: VendorDietaryOffering; title: string; sub: string; mSub: string }[] = [
  {
    id: "veg",
    title: "Pure Vegetarian",
    sub: "100% vegetarian kitchen with strictly no meat or egg handling.",
    mSub: "100% vegetarian kitchen",
  },
  {
    id: "non-veg",
    title: "Non-Vegetarian Only",
    sub: "Specialized non-vegetarian kitchen focusing on authentic meat preparations.",
    mSub: "Specialized non-veg kitchen",
  },
  {
    id: "both",
    title: "Both Veg & Non-Veg",
    sub: "Strictly separate preparation areas, dedicated fryers, and color-coded utensils.",
    mSub: "Separated prep zones",
  },
];

/** Prototype emoji marks (🟢 / 🔴) swapped for the brand FSSAI marks (veg = black, non-veg = red). */
function DietIcon({ id }: { id: VendorDietaryOffering }) {
  if (id === "both") return <span style={{ fontSize: 24, lineHeight: 1 }} aria-hidden>⚖️</span>;
  // Scaled up to the prototype's 24px emoji footprint.
  return (
    <span style={{ display: "inline-flex", height: 24, alignItems: "center", transform: "scale(1.5)", transformOrigin: "left center" }}>
      <DietMark diet={id} />
    </span>
  );
}

/** Handover `.diet-selection-section` — "Kitchen Dietary Offering *", mandatory gate on Step 1. */
export default function DietaryOfferingSelector({ value, onChange, error, disabled, id }: DietaryOfferingSelectorProps) {
  return (
    <div
      className={cn("diet-selection-section", error && !value && "pulse-error")}
      id={id}
      style={{ marginBottom: 22, paddingBottom: 18, borderBottom: "1px solid var(--color-cream-30)" }}
    >
      <div className="card-title-row vob-d-flex" style={{ marginBottom: 6 }}>
        <span className="card-title">
          Kitchen Dietary Offering <span className="required">*</span>
        </span>
      </div>
      <span className="form-label vob-m-flex" style={{ marginBottom: 6, gap: 4 }}>
        Kitchen Dietary Offering <span className="required">*</span>
      </span>
      <p className="field-hint vob-d" style={{ marginBottom: 12 }}>
        Choose your kitchen&apos;s core dietary classification. This determines your catalog classification across all
        services.
      </p>
      <div className="diet-choice-grid" role="radiogroup" aria-label="Kitchen Dietary Offering">
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
              className={cn("diet-choice-card", active && "active")}
              data-diet-value={o.id}
              style={{ textAlign: "left", font: "inherit", color: "inherit" }}
            >
              <div className="diet-card-top">
                <DietIcon id={o.id} />
                <div className="diet-choice-radio" />
              </div>
              <div className="diet-choice-label">{o.title}</div>
              <div className="diet-choice-sub">
                <R d={o.sub} m={o.mSub} />
              </div>
            </button>
          );
        })}
      </div>
      {error && !value && (
        <div
          className="diet-validation-error"
          role="alert"
          style={{ marginTop: 10, fontSize: 12, color: "var(--color-red)", fontWeight: 700 }}
        >
          ⚠️{" "}
          <R
            d="Please select your kitchen's dietary offering before proceeding."
            m="Please select dietary offering before proceeding."
          />
        </div>
      )}
    </div>
  );
}
