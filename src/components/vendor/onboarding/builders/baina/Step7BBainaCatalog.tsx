"use client";

import { useState } from "react";
import Image from "next/image";
import BuilderSectionHeader from "../common/BuilderSectionHeader";
import BuilderNav from "../common/BuilderNav";
import BainaBoxModal from "./BainaBoxModal";
import type { VendorBainaBox } from "@/lib/vendorMenus";
import { dummyDishPhoto } from "@/lib/data";
import { Button } from "@/components/ui";

interface Step7BBainaCatalogProps {
  boxes: VendorBainaBox[];
  onChangeBoxes: (boxes: VendorBainaBox[]) => void;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

const MAX_BOXES = 5;

export default function Step7BBainaCatalog({
  boxes,
  onChangeBoxes,
  onBack,
  onContinue,
  onSaveDraft,
  saving = false,
}: Step7BBainaCatalogProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [boxToEdit, setBoxToEdit] = useState<{
    box: VendorBainaBox;
    index: number;
  } | null>(null);
  const [error, setError] = useState("");

  const isAtLimit = boxes.length >= MAX_BOXES;

  const handleOpenAdd = () => {
    if (isAtLimit) {
      setError(`Catalog limit reached. You can publish a maximum of ${MAX_BOXES} curated Baina boxes.`);
      return;
    }
    setError("");
    setBoxToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (box: VendorBainaBox, index: number) => {
    setError("");
    setBoxToEdit({ box, index });
    setModalOpen(true);
  };

  const handleSaveBox = (box: VendorBainaBox, existingIndex?: number) => {
    if (existingIndex !== undefined) {
      const updated = [...boxes];
      updated[existingIndex] = box;
      onChangeBoxes(updated);
    } else {
      if (boxes.length >= MAX_BOXES) {
        setError(`Cannot add more than ${MAX_BOXES} boxes.`);
        return;
      }
      onChangeBoxes([...boxes, box]);
    }
    setError("");
  };

  const handleRemoveBox = (index: number) => {
    onChangeBoxes(boxes.filter((_, idx) => idx !== index));
    setError("");
  };

  const validateAndContinue = () => {
    if (boxes.length === 0) {
      setError("Please add at least one Baina box to your catalog.");
      return;
    }
    if (boxes.length > MAX_BOXES) {
      setError(`Maximum limit is ${MAX_BOXES} boxes.`);
      return;
    }
    onContinue();
  };

  return (
    <div className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs">
      <BuilderSectionHeader
        badge="Section 7B"
        title="Curated Baina Box Catalog"
        description="Craft up to 5 signature celebratory sweet and dry fruit gifting boxes. Specify assortment contents, ½ kg base rates, 1 kg upgrades, and custom sizes."
        tip="Platform Rule: Bhojpatra enforces a strict maximum of 5 signature boxes per artisan studio to keep the catalog curated and premium."
      />

      <div className="mt-6 space-y-4">
        {/* Top Control Bar with Limit Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-soft">
              Catalog Capacity:
            </span>
            <span
              className={`rounded-pill px-2.5 py-0.5 text-xs font-bold ${
                isAtLimit
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {boxes.length} of {MAX_BOXES} boxes used
            </span>
            {isAtLimit && (
              <span className="text-[11px] font-semibold text-amber-700">
                (Maximum reached)
              </span>
            )}
          </div>

          <Button
            type="button"
            size="md"
            onClick={handleOpenAdd}
            disabled={isAtLimit}
            className="min-h-[44px] shrink-0"
          >
            + Add Baina Box
          </Button>
        </div>

        {error && (
          <div className="rounded-control bg-red-50 p-2.5 text-xs text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* Catalog Grid */}
        {boxes.length === 0 ? (
          <div className="rounded-card border-2 border-dashed border-cream-3 p-8 text-center bg-cream-1/20">
            <span className="text-3xl" aria-hidden="true">
              🎁
            </span>
            <h4 className="mt-2 text-sm font-bold text-ink">
              No Baina Boxes in Catalog
            </h4>
            <p className="mt-1 text-xs text-ink-soft max-w-md mx-auto">
              Add your signature mithai gifting box. Include items like Kaju Katli, Besan Ladoos, or Roasted Dry Fruits.
            </p>
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleOpenAdd}
                className="min-h-[44px]"
              >
                + Add First Baina Box
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boxes.map((box, idx) => {
              const imgSrc = box.photo || dummyDishPhoto(box.name);

              return (
                <div
                  key={`${box.name}-${idx}`}
                  className="flex flex-col justify-between rounded-card border border-cream-3 bg-white p-4 shadow-xs hover:border-maroon/40 transition-all"
                >
                  <div>
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-control bg-cream-2 mb-3">
                      <Image
                        src={imgSrc}
                        alt={box.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover"
                        unoptimized={Boolean(box.photo?.startsWith("/api/vendor/photo"))}
                      />
                      <div className="absolute top-2 right-2 rounded-pill bg-maroon px-2.5 py-0.5 text-xs font-bold text-white shadow-2xs">
                        ₹{box.price} / ½ kg
                      </div>
                    </div>

                    <h4 className="font-bold text-ink text-sm leading-tight">
                      {box.name}
                    </h4>

                    <p className="mt-1.5 text-xs text-ink-soft line-clamp-3 leading-relaxed">
                      {box.contents}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-soft border-t border-cream-2 pt-2.5">
                      <span className="font-semibold text-ink">Sizes:</span>
                      <span className="rounded-control bg-cream-1 px-1.5 py-0.5 text-ink">
                        ½ kg: ₹{box.price}
                      </span>
                      {box.price1kg && (
                        <span className="rounded-control bg-cream-1 px-1.5 py-0.5 text-ink">
                          1 kg: ₹{box.price1kg}
                        </span>
                      )}
                      {(box.customSizes || []).map((cs, i) => (
                        <span
                          key={i}
                          className="rounded-control bg-cream-1 px-1.5 py-0.5 text-ink"
                        >
                          {cs.label}: ₹{cs.price}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-cream-2 pt-3">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(box, idx)}
                      className="rounded-control border border-cream-3 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-cream-1 min-h-[36px]"
                    >
                      Edit Box
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveBox(idx)}
                      className="rounded-control border border-cream-3 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 min-h-[36px]"
                      title="Remove box"
                      aria-label={`Remove ${box.name}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BainaBoxModal
        isOpen={modalOpen}
        boxToEdit={boxToEdit}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveBox}
      />

      <BuilderNav
        onBack={onBack}
        onContinue={validateAndContinue}
        onSaveDraft={onSaveDraft}
        saving={saving}
        continueLabel="Continue to Packaging Styles →"
      />
    </div>
  );
}
