"use client";

import { useState } from "react";
import type { VendorBainaBox, VendorBoxSize } from "@/lib/vendorMenus";
import PhotoUploadButton from "../common/PhotoUploadButton";
import { BtnBack, BtnNext, FieldError, FormLabel, Sheet, inputCls } from "../../ui";

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

  const handleSubmit = () => {
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
    <Sheet
      open
      onClose={onClose}
      title="Configure Gifting Box"
      footer={
        <>
          <BtnBack onClick={onClose}>Cancel</BtnBack>
          <BtnNext onClick={handleSubmit}>Save Box</BtnNext>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <FormLabel required htmlFor="box-input-name">
            Hamper Box Name
          </FormLabel>
          <input
            id="box-input-name"
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Royal Shahi Celebration Hamper"
            className={inputCls}
          />
        </div>
        <div>
          <FormLabel required htmlFor="box-input-contents">
            Itemized Contents Description
          </FormLabel>
          <textarea
            id="box-input-contents"
            rows={3}
            value={contents}
            onChange={(e) => setContents(e.target.value)}
            placeholder="e.g. Kaju Katli, Motichoor Ladoo, Roasted Pistachios..."
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FormLabel required htmlFor="box-input-halfkg">
              ½ kg Box Price (₹)
            </FormLabel>
            <input
              id="box-input-halfkg"
              type="number"
              inputMode="numeric"
              min={1}
              value={price ?? ""}
              onChange={(e) => setPrice(e.target.value === "" ? undefined : Number(e.target.value))}
              placeholder="650"
              className={inputCls}
            />
          </div>
          <div>
            <FormLabel htmlFor="box-input-onekg">1 kg Box Price (₹)</FormLabel>
            <input
              id="box-input-onekg"
              type="number"
              inputMode="numeric"
              min={1}
              value={price1kg ?? ""}
              onChange={(e) => setPrice1kg(e.target.value === "" ? undefined : Number(e.target.value))}
              placeholder="1200"
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <FormLabel>Custom Sizes (e.g. 250 g, 2 kg)</FormLabel>
          {customSizes.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {customSizes.map((cs, i) => (
                <span key={cs.label} className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-cream/40 pl-3 text-xs font-semibold text-ink">
                  {cs.label}: ₹{cs.price}
                  <button
                    type="button"
                    aria-label={`Remove ${cs.label}`}
                    onClick={() => handleRemoveCustomSize(i)}
                    className="flex h-9 w-9 items-center justify-center"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Size (e.g. 250 g)"
              aria-label="Custom size label"
              className={inputCls}
            />
            <input
              type="number"
              inputMode="numeric"
              value={customPrice ?? ""}
              onChange={(e) => setCustomPrice(e.target.value === "" ? undefined : Number(e.target.value))}
              placeholder="₹ Price"
              aria-label="Custom size price"
              className={`${inputCls} max-w-[110px]`}
            />
            <button type="button" onClick={handleAddCustomSize} className="min-h-[44px] shrink-0 rounded-full bg-maroon px-3 text-xs font-bold text-cream">
              + Add
            </button>
          </div>
        </div>
        <div>
          <FormLabel>Hamper Photo</FormLabel>
          <PhotoUploadButton
            currentPhoto={photo}
            kind="dish"
            aspectRatio="landscape"
            label="Upload Hamper Photo 📷"
            onPhotoUploaded={setPhoto}
            onPhotoRemoved={() => setPhoto(undefined)}
          />
        </div>
        <FieldError>{error}</FieldError>
      </div>
    </Sheet>
  );
}
