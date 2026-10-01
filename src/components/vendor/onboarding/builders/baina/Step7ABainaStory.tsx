"use client";

import { useState } from "react";
import BuilderSectionHeader from "../common/BuilderSectionHeader";
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

const BAINA_OCCASIONS = [
  { id: "Weddings", label: "Wedding Return Gifting", icon: "💍" },
  { id: "Tilak", label: "Tilak & Roka Ceremonies", icon: "🪔" },
  { id: "Diwali", label: "Festive Diwali / Eid Hampers", icon: "✨" },
  { id: "BabyShower", label: "Baby Shower / Annaprashan", icon: "🍼" },
  { id: "Corporate", label: "Corporate Executive Gifting", icon: "🏢" },
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

  const validateAndContinue = () => {
    const newErrors: Record<string, string> = {};

    if (!bainaDetails.studioName?.trim()) {
      newErrors.studioName = "Confectionery / Studio name is required.";
    }

    if (!bainaDetails.story?.trim()) {
      newErrors.story = "Heritage craft story is required.";
    }

    if (!bainaDetails.minOrderBoxes || bainaDetails.minOrderBoxes < 5) {
      newErrors.minOrderBoxes = "Minimum order quantity must be at least 5 boxes.";
    }

    if (!bainaDetails.leadDays || bainaDetails.leadDays < 1) {
      newErrors.leadDays = "Production lead time must be at least 1 day.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onContinue();
    }
  };

  return (
    <div className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs">
      <BuilderSectionHeader
        badge="Section 7A"
        title="Artisan Baina Studio Story"
        description="Introduce your traditional mithai confectionery, gifting atelier, or dry fruit gifting house. Share your generational recipes, purity commitments, and order guarantees."
        tip="Baina gifting boxes are ordered by wedding families in batches of 25–500 boxes. Articulating your pure desi ghee craft inspires high-volume orders."
      />

      <div className="mt-6 space-y-6">
        <div>
          <label
            htmlFor="studioName"
            className="block text-xs font-bold uppercase tracking-wider text-ink"
          >
            Confectionery / Studio Brand Name <span className="text-red-500">*</span>
          </label>
          <input
            id="studioName"
            type="text"
            value={bainaDetails.studioName || ""}
            onChange={(e) =>
              onChangeBainaDetails({
                ...bainaDetails,
                studioName: e.target.value,
              })
            }
            placeholder="e.g. Mithai Mahal Artisans, Royal Awadh Gifting House"
            className="mt-1.5 w-full rounded-control border border-cream-3 bg-cream-1/30 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-maroon focus:outline-hidden min-h-[44px]"
          />
          {errors.studioName && (
            <p className="mt-1 text-xs text-red-600">{errors.studioName}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="story"
            className="block text-xs font-bold uppercase tracking-wider text-ink"
          >
            Heritage Story & Craft Philosophy <span className="text-red-500">*</span>
          </label>
          <textarea
            id="story"
            rows={4}
            value={bainaDetails.story || ""}
            onChange={(e) =>
              onChangeBainaDetails({
                ...bainaDetails,
                story: e.target.value,
              })
            }
            placeholder="Share the craft behind your sweets: 100% bilona cow ghee, slow-reduced khoya, organic nuts, heirloom recipes handed down across generations..."
            className="mt-1.5 w-full rounded-control border border-cream-3 bg-cream-1/30 p-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-maroon focus:outline-hidden"
          />
          {errors.story && (
            <p className="mt-1 text-xs text-red-600">{errors.story}</p>
          )}
        </div>

        {/* Operational Guarantees: Min Order Boxes, Lead Days */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="minOrderBoxes"
              className="block text-xs font-bold uppercase tracking-wider text-ink"
            >
              Minimum Order Guarantee (Boxes) <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <input
                id="minOrderBoxes"
                type="number"
                min={5}
                max={5000}
                value={bainaDetails.minOrderBoxes || ""}
                onChange={(e) =>
                  onChangeBainaDetails({
                    ...bainaDetails,
                    minOrderBoxes: parseInt(e.target.value, 10) || 0,
                  })
                }
                placeholder="25"
                className="w-full rounded-control border border-cream-3 bg-cream-1/30 px-3.5 py-2.5 text-sm text-ink focus:border-maroon focus:outline-hidden min-h-[44px]"
              />
            </div>
            {errors.minOrderBoxes && (
              <p className="mt-1 text-xs text-red-600">{errors.minOrderBoxes}</p>
            )}
            <p className="mt-1 text-[10px] text-ink-soft">
              Smallest batch size accepted for custom packing (default: 25).
            </p>
          </div>

          <div>
            <label
              htmlFor="leadDays"
              className="block text-xs font-bold uppercase tracking-wider text-ink"
            >
              Production Lead Time (Days) <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <input
                id="leadDays"
                type="number"
                min={1}
                max={60}
                value={bainaDetails.leadDays || ""}
                onChange={(e) =>
                  onChangeBainaDetails({
                    ...bainaDetails,
                    leadDays: parseInt(e.target.value, 10) || 0,
                  })
                }
                placeholder="3"
                className="w-full rounded-control border border-cream-3 bg-cream-1/30 px-3.5 py-2.5 text-sm text-ink focus:border-maroon focus:outline-hidden min-h-[44px]"
              />
            </div>
            {errors.leadDays && (
              <p className="mt-1 text-xs text-red-600">{errors.leadDays}</p>
            )}
            <p className="mt-1 text-[10px] text-ink-soft">
              Days needed to prepare, pack, and box fresh confections (default: 3).
            </p>
          </div>
        </div>

        {/* Best For Occasions Showcase */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
            Target Celebrations & Gifting Occasions
          </label>
          <div className="flex flex-wrap gap-2">
            {BAINA_OCCASIONS.map((occ) => (
              <div
                key={occ.id}
                className="inline-flex items-center gap-1.5 rounded-pill border border-cream-3 bg-cream-1/60 px-3.5 py-2 text-xs font-semibold text-ink"
              >
                <span>{occ.icon}</span>
                <span>{occ.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BuilderNav
        onBack={onBack}
        onContinue={validateAndContinue}
        onSaveDraft={onSaveDraft}
        saving={saving}
        continueLabel="Continue to Box Catalog →"
      />
    </div>
  );
}
