"use client";

import { useState } from "react";
import type { VendorBainaBox, VendorBoxSize } from "@/lib/vendorMenus";
import PhotoUploadButton from "../common/PhotoUploadButton";
import { BtnBack, BtnNext, FieldError, FormLabel, Sheet } from "../../ui";

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
      <div className="form-group">
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
          className="form-input"
        />
      </div>
      <div className="form-group">
        <FormLabel required htmlFor="box-input-contents">
          Itemized Contents Description
        </FormLabel>
        <textarea
          id="box-input-contents"
          value={contents}
          onChange={(e) => setContents(e.target.value)}
          placeholder="e.g. Kaju Katli, Motichoor Ladoo, Roasted Pistachios..."
          className="form-textarea"
        />
      </div>
      <div className="form-grid-2">
        <div className="form-group">
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
            className="form-input"
          />
        </div>
        <div className="form-group">
          <FormLabel htmlFor="box-input-onekg">1 kg Box Price (₹)</FormLabel>
          <input
            id="box-input-onekg"
            type="number"
            inputMode="numeric"
            min={1}
            value={price1kg ?? ""}
            onChange={(e) => setPrice1kg(e.target.value === "" ? undefined : Number(e.target.value))}
            placeholder="1200"
            className="form-input"
          />
        </div>
      </div>
      <div className="form-group">
        <FormLabel htmlFor="box-input-custom-size">Custom Sizes (e.g. 250 g, 2 kg)</FormLabel>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            id="box-input-custom-size"
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustomSize();
              }
            }}
            placeholder="Size (e.g. 250 g)"
            aria-label="Custom size label"
            className="form-input"
          />
          <input
            type="number"
            inputMode="numeric"
            value={customPrice ?? ""}
            onChange={(e) => setCustomPrice(e.target.value === "" ? undefined : Number(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustomSize();
              }
            }}
            placeholder="₹ Price"
            aria-label="Custom size price"
            className="form-input"
            style={{ maxWidth: 110 }}
          />
          <button
            type="button"
            className="btn-tier-proceed"
            style={{ margin: 0, padding: "6px 14px", fontSize: 12, whiteSpace: "nowrap" }}
            onClick={handleAddCustomSize}
          >
            + Add
          </button>
        </div>
        {customSizes.length > 0 && (
          <div
            className="vendor-items-builder-container"
            style={{
              marginTop: 8,
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              padding: 8,
              background: "var(--color-cream-10)",
              border: "1px dashed var(--color-cream-40)",
              borderRadius: "var(--radius-control)",
            }}
          >
            {customSizes.map((cs, i) => (
              <span key={cs.label} className="item-chip-editable">
                <span>
                  {cs.label}: ₹{cs.price}
                </span>
                <button
                  type="button"
                  className="btn-chip-action remove"
                  title="Remove Size"
                  aria-label={`Remove ${cs.label}`}
                  onClick={() => handleRemoveCustomSize(i)}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="form-group">
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
    </Sheet>
  );
}
