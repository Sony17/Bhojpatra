"use client";

import { useState } from "react";
import type { VendorMenuItem } from "@/lib/vendorMenus";
import PhotoUploadButton from "../common/PhotoUploadButton";
import { BtnBack, BtnNext, FieldError, FormLabel, Sheet } from "../../ui";

interface StallDishModalProps {
  isOpen: boolean;
  categoryName: string;
  delicacyToEdit?: { item: VendorMenuItem; index: number } | null;
  onClose: () => void;
  onSave: (item: VendorMenuItem, index?: number) => void;
}

export default function StallDishModal(props: StallDishModalProps) {
  if (!props.isOpen) return null;
  return (
    <StallDishModalInner
      key={props.delicacyToEdit ? `${props.categoryName}-${props.delicacyToEdit.index}` : `new-${props.categoryName}`}
      {...props}
    />
  );
}

/** Handover: "Configure Stall Menu Item". */
function StallDishModalInner({ delicacyToEdit, onClose, onSave }: StallDishModalProps) {
  const [name, setName] = useState(delicacyToEdit?.item.name || "");
  const [diet, setDiet] = useState<"veg" | "non-veg">(delicacyToEdit?.item.diet || "veg");
  const [price, setPrice] = useState<number | undefined>(delicacyToEdit?.item.price);
  const [desc, setDesc] = useState(delicacyToEdit?.item.desc || "");
  const [photo, setPhoto] = useState<string | undefined>(delicacyToEdit?.item.photo);
  const [error, setError] = useState("");

  const save = () => {
    if (!name.trim()) return setError("Dish Name is required.");
    if (!price || price <= 0) return setError("Dish Cost (₹ / plate) is required.");
    onSave(
      {
        name: name.trim(),
        diet,
        price,
        ...(desc.trim() ? { desc: desc.trim() } : {}),
        ...(photo ? { photo } : {}),
      },
      delicacyToEdit?.index,
    );
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Configure Stall Menu Item"
      footer={
        <>
          <BtnBack onClick={onClose}>Cancel</BtnBack>
          <BtnNext onClick={save}>Save Dish</BtnNext>
        </>
      }
    >
      <div className="form-group">
        <FormLabel required htmlFor="stall-item-input-name">
          Dish Name
        </FormLabel>
        <input
          id="stall-item-input-name"
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Kurkuri Aloo Tikki, Special Suji Golgappa, Masala Dosa"
          className="form-input"
        />
      </div>

      <div className="form-grid-2">
        <div className="form-group">
          <FormLabel htmlFor="stall-item-input-diet">Dietary Type</FormLabel>
          <select
            id="stall-item-input-diet"
            value={diet}
            onChange={(e) => setDiet(e.target.value as "veg" | "non-veg")}
            className="form-select"
          >
            <option value="veg">Vegetarian</option>
            <option value="non-veg">Non-Vegetarian</option>
          </select>
        </div>
        <div className="form-group">
          <FormLabel required htmlFor="stall-item-input-price">
            Dish Cost (₹ / plate)
          </FormLabel>
          <input
            id="stall-item-input-price"
            type="number"
            inputMode="numeric"
            min={0}
            value={price ?? ""}
            onChange={(e) => setPrice(e.target.value === "" ? undefined : Number(e.target.value))}
            placeholder="e.g. 120"
            className="form-input"
          />
        </div>
      </div>

      <div className="form-group">
        <FormLabel htmlFor="stall-item-input-desc">Dish Description</FormLabel>
        <textarea
          id="stall-item-input-desc"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Portion size, ingredients, and preparation style..."
          className="form-textarea"
        />
      </div>

      <div className="form-group">
        <FormLabel>Dish Photo</FormLabel>
        <PhotoUploadButton
          currentPhoto={photo}
          kind="dish"
          aspectRatio="landscape"
          label="Upload Dish Photo 📷"
          onPhotoUploaded={setPhoto}
          onPhotoRemoved={() => setPhoto(undefined)}
        />
      </div>
      <FieldError>{error}</FieldError>
    </Sheet>
  );
}
