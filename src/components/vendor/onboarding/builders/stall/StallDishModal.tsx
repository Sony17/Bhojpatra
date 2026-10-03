"use client";

import { useState } from "react";
import type { VendorMenuItem } from "@/lib/vendorMenus";
import PhotoUploadButton from "../common/PhotoUploadButton";
import { Button } from "@/components/ui";

interface StallDishModalProps {
  isOpen: boolean;
  categoryName: string;
  delicacyToEdit?: { item: VendorMenuItem; index: number } | null;
  onClose: () => void;
  onSave: (item: VendorMenuItem, index?: number) => void;
}

export default function StallDishModal({
  isOpen,
  categoryName,
  delicacyToEdit,
  onClose,
  onSave,
}: StallDishModalProps) {
  if (!isOpen) return null;

  return (
    <StallDishModalInner
      key={delicacyToEdit ? `${categoryName}-${delicacyToEdit.index}` : `new-${categoryName}`}
      categoryName={categoryName}
      delicacyToEdit={delicacyToEdit}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function StallDishModalInner({
  categoryName,
  delicacyToEdit,
  onClose,
  onSave,
}: Omit<StallDishModalProps, "isOpen">) {
  const [name, setName] = useState(delicacyToEdit?.item.name || "");
  const [diet, setDiet] = useState<"veg" | "non-veg">(delicacyToEdit?.item.diet || "veg");
  const [price, setPrice] = useState<number | undefined>(delicacyToEdit?.item.price);
  const [desc, setDesc] = useState(delicacyToEdit?.item.desc || "");
  const [photo, setPhoto] = useState<string | undefined>(delicacyToEdit?.item.photo);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Delicacy name is required.");
      return;
    }

    const item: VendorMenuItem = {
      name: name.trim(),
      diet,
      ...(price !== undefined && price > 0 ? { price } : {}),
      ...(desc.trim() ? { desc: desc.trim() } : {}),
      ...(photo ? { photo } : {}),
    };

    onSave(item, delicacyToEdit?.index);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stall-dish-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-card border border-cream-3 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-cream-2 pb-3">
          <div>
            <h3 id="stall-dish-modal-title" className="text-base font-bold text-ink">
              {delicacyToEdit ? "Edit Delicacy" : "Add Stall Delicacy"}
            </h3>
            <p className="text-xs text-ink-soft">
              Station: <strong className="text-maroon">{categoryName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-control text-ink-soft hover:bg-cream-2 hover:text-ink min-h-[44px] min-w-[44px]"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-control bg-red-50 p-2.5 text-xs text-red-700">
              ⚠️ {error}
            </div>
          )}

          {/* Dish Name */}
          <div>
            <label
              htmlFor="delicacyName"
              className="block text-xs font-bold uppercase tracking-wider text-ink"
            >
              Delicacy / Dish Name <span className="text-red-500">*</span>
            </label>
            <input
              id="delicacyName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dahi Puchka Shots, Galouti on Ulta Tawa Parantha"
              className="mt-1 w-full rounded-control border border-cream-3 bg-cream-1/30 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-maroon focus:outline-hidden min-h-[44px]"
              autoFocus
            />
          </div>

          {/* Dietary Classification */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
              Dietary Classification <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDiet("veg")}
                className={`flex items-center justify-center gap-2 rounded-control border px-3 py-2 text-xs font-bold transition-all min-h-[44px] ${
                  diet === "veg"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600"
                    : "border-cream-3 bg-white text-ink-soft hover:bg-cream-1"
                }`}
              >
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-xs border border-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                </span>
                <span>Vegetarian</span>
              </button>

              <button
                type="button"
                onClick={() => setDiet("non-veg")}
                className={`flex items-center justify-center gap-2 rounded-control border px-3 py-2 text-xs font-bold transition-all min-h-[44px] ${
                  diet === "non-veg"
                    ? "border-red-600 bg-red-50 text-red-800 ring-1 ring-red-600"
                    : "border-cream-3 bg-white text-ink-soft hover:bg-cream-1"
                }`}
              >
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-xs border border-red-600">
                  <span className="h-2 w-2 rounded-full bg-red-600" />
                </span>
                <span>Non-Vegetarian</span>
              </button>
            </div>
          </div>

          {/* Optional Individual Portion Price */}
          <div>
            <label
              htmlFor="delicacyPrice"
              className="block text-xs font-bold uppercase tracking-wider text-ink"
            >
              Portion / Delicacy Price (₹) (Optional)
            </label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-bold text-ink-soft">
                ₹
              </span>
              <input
                id="delicacyPrice"
                type="number"
                min={0}
                value={price ?? ""}
                onChange={(e) =>
                  setPrice(e.target.value ? parseInt(e.target.value, 10) : undefined)
                }
                placeholder="Defaults to stall per-plate rate"
                className="w-full rounded-control border border-cream-3 bg-cream-1/30 pl-8 pr-3 py-2 text-sm text-ink focus:border-maroon focus:outline-hidden min-h-[44px]"
              />
            </div>
            <p className="mt-1 text-[11px] text-ink-soft">
              Leave blank to bundle into this stall&apos;s fixed per-guest package rate.
            </p>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="delicacyDesc"
              className="block text-xs font-bold uppercase tracking-wider text-ink"
            >
              Preparation Details
            </label>
            <textarea
              id="delicacyDesc"
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. Crisp puris filled with spiced potato and chilled mint-jaljeera water..."
              className="mt-1 w-full rounded-control border border-cream-3 bg-cream-1/30 p-2.5 text-xs text-ink placeholder:text-ink-soft/60 focus:border-maroon focus:outline-hidden"
            />
          </div>

          {/* Photo */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
              Delicacy Photo (Optional)
            </label>
            <PhotoUploadButton
              currentPhoto={photo}
              kind="dish"
              aspectRatio="square"
              label="Upload Delicacy Photo"
              onPhotoUploaded={(url) => setPhoto(url)}
              onPhotoRemoved={() => setPhoto(undefined)}
            />
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-cream-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button type="submit" size="md" className="min-h-[44px]">
              {delicacyToEdit ? "Update Delicacy" : "Add to Stall Menu"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
