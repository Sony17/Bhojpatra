"use client";

import { useState } from "react";
import type { VendorBainaBox, VendorBoxSize } from "@/lib/vendorMenus";
import PhotoUploadButton from "../common/PhotoUploadButton";
import { Button } from "@/components/ui";

interface BainaBoxModalProps {
  isOpen: boolean;
  boxToEdit?: { box: VendorBainaBox; index: number } | null;
  onClose: () => void;
  onSave: (box: VendorBainaBox, index?: number) => void;
}

export default function BainaBoxModal({
  isOpen,
  boxToEdit,
  onClose,
  onSave,
}: BainaBoxModalProps) {
  if (!isOpen) return null;

  return (
    <BainaBoxModalInner
      key={boxToEdit ? `box-${boxToEdit.index}` : "new-box"}
      boxToEdit={boxToEdit}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function BainaBoxModalInner({
  boxToEdit,
  onClose,
  onSave,
}: Omit<BainaBoxModalProps, "isOpen">) {
  const [name, setName] = useState(boxToEdit?.box.name || "");
  const [contents, setContents] = useState(boxToEdit?.box.contents || "");
  const [price, setPrice] = useState<number | undefined>(boxToEdit?.box.price);
  const [price1kg, setPrice1kg] = useState<number | undefined>(boxToEdit?.box.price1kg);
  const [customSizes, setCustomSizes] = useState<VendorBoxSize[]>(boxToEdit?.box.customSizes || []);
  const [customLabel, setCustomLabel] = useState("");
  const [customPrice, setCustomPrice] = useState<number | undefined>(undefined);
  const [photo, setPhoto] = useState<string | undefined>(boxToEdit?.box.photo);
  const [error, setError] = useState("");

  const handleAddCustomSize = () => {
    const trimmedLabel = customLabel.trim();
    if (!trimmedLabel || customPrice === undefined || customPrice <= 0) {
      setError("Please provide a size label (e.g. '250 g') and a positive price.");
      return;
    }
    if (customSizes.some((s) => s.label.toLowerCase() === trimmedLabel.toLowerCase())) {
      setError("This size is already added.");
      return;
    }
    setCustomSizes([...customSizes, { label: trimmedLabel, price: customPrice }]);
    setCustomLabel("");
    setCustomPrice(undefined);
    setError("");
  };

  const handleRemoveCustomSize = (index: number) => {
    setCustomSizes(customSizes.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Box name is required.");
      return;
    }
    if (!contents.trim()) {
      setError("Contents description is required.");
      return;
    }
    if (price === undefined || price <= 0) {
      setError("Please enter a valid ½ kg box price.");
      return;
    }

    const boxItem: VendorBainaBox = {
      name: name.trim(),
      contents: contents.trim(),
      price,
      ...(price1kg !== undefined && price1kg > 0 ? { price1kg } : {}),
      ...(customSizes.length ? { customSizes } : {}),
      ...(photo ? { photo } : {}),
    };

    onSave(boxItem, boxToEdit?.index);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="baina-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-card border border-cream-3 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-cream-2 pb-3">
          <h3 id="baina-modal-title" className="text-base font-bold text-ink">
            {boxToEdit ? "Edit Baina Box" : "Add Baina Box to Catalog"}
          </h3>
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

          {/* Box Name */}
          <div>
            <label
              htmlFor="boxName"
              className="block text-xs font-bold uppercase tracking-wider text-ink"
            >
              Box Name <span className="text-red-500">*</span>
            </label>
            <input
              id="boxName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shahi Kaju Katli & Peda Box, Heritage Dry Fruit Assortment"
              className="mt-1 w-full rounded-control border border-cream-3 bg-cream-1/30 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-maroon focus:outline-hidden min-h-[44px]"
              autoFocus
            />
          </div>

          {/* Contents Description */}
          <div>
            <label
              htmlFor="boxContents"
              className="block text-xs font-bold uppercase tracking-wider text-ink"
            >
              Box Contents (Mithai & Treat items){" "}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              id="boxContents"
              rows={2}
              value={contents}
              onChange={(e) => setContents(e.target.value)}
              placeholder="e.g. 8 pcs Kaju Katli, 6 pcs Kesar Peda, 6 pcs Motichoor Laddu, Almond Dry Fruits"
              className="mt-1 w-full rounded-control border border-cream-3 bg-cream-1/30 p-2.5 text-xs text-ink placeholder:text-ink-soft/60 focus:border-maroon focus:outline-hidden"
            />
          </div>

          {/* Standard Sizes: 1/2 kg & 1 kg */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="halfKgPrice"
                className="block text-xs font-bold uppercase tracking-wider text-ink"
              >
                ½ kg Box Rate (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-bold text-ink-soft">
                  ₹
                </span>
                <input
                  id="halfKgPrice"
                  type="number"
                  min={1}
                  max={50000}
                  value={price ?? ""}
                  onChange={(e) =>
                    setPrice(e.target.value ? parseInt(e.target.value, 10) : undefined)
                  }
                  placeholder="450"
                  className="w-full rounded-control border border-cream-3 bg-cream-1/30 pl-8 pr-3 py-2 text-sm font-bold text-ink focus:border-maroon focus:outline-hidden min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="oneKgPrice"
                className="block text-xs font-bold uppercase tracking-wider text-ink"
              >
                1 kg Box Rate (₹) (Optional)
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-bold text-ink-soft">
                  ₹
                </span>
                <input
                  id="oneKgPrice"
                  type="number"
                  min={1}
                  max={100000}
                  value={price1kg ?? ""}
                  onChange={(e) =>
                    setPrice1kg(
                      e.target.value ? parseInt(e.target.value, 10) : undefined,
                    )
                  }
                  placeholder="850"
                  className="w-full rounded-control border border-cream-3 bg-cream-1/30 pl-8 pr-3 py-2 text-sm font-bold text-ink focus:border-maroon focus:outline-hidden min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Custom Extra Sizes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
              Custom Sizes (e.g. 250 g, 2 kg)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Size (e.g. 250 g)"
                className="w-1/2 rounded-control border border-cream-3 bg-white px-3 py-2 text-xs text-ink focus:border-maroon focus:outline-hidden min-h-[40px]"
              />
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-ink-soft font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min={1}
                  value={customPrice ?? ""}
                  onChange={(e) =>
                    setCustomPrice(
                      e.target.value ? parseInt(e.target.value, 10) : undefined,
                    )
                  }
                  placeholder="Price"
                  className="w-full rounded-control border border-cream-3 bg-white pl-6 pr-2 py-2 text-xs text-ink focus:border-maroon focus:outline-hidden min-h-[40px]"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddCustomSize}
                className="min-h-[40px]"
              >
                Add Size
              </Button>
            </div>

            {customSizes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {customSizes.map((cs, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-pill bg-cream-2 px-2.5 py-1 text-xs text-ink"
                  >
                    <span>
                      {cs.label}: ₹{cs.price}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomSize(idx)}
                      className="text-ink-soft hover:text-red-600"
                      aria-label={`Remove ${cs.label}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Box Photo */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
              Box Packaging Photo (Optional)
            </label>
            <PhotoUploadButton
              currentPhoto={photo}
              kind="dish"
              aspectRatio="square"
              label="Upload Box Photo"
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
              {boxToEdit ? "Update Box" : "Add Box to Catalog"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
