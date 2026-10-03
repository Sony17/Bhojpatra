"use client";

import { useState } from "react";
import type { VendorMenuItem } from "@/lib/vendorMenus";
import type { VendorTier } from "@/lib/admin/types";
import PhotoUploadButton from "../common/PhotoUploadButton";
import { BtnBack, BtnNext, FieldError, FormLabel, Sheet } from "../../ui";

interface DishModalProps {
  isOpen: boolean;
  dishToEdit?: { dish: VendorMenuItem; courseId: string; index: number } | null;
  defaultCourseId?: string;
  onClose: () => void;
  onSave: (dish: VendorMenuItem, targetCourseId: string, index?: number) => void;
}

const COURSES = [
  { id: "welcome", name: "Welcome Drinks" },
  { id: "starters", name: "Starters & Kebabs" },
  { id: "main", name: "Main Course" },
  { id: "breads", name: "Breads & Rice" },
  { id: "sweets", name: "Sweets & Mithai" },
];

const TIER_OPTIONS: VendorTier[] = ["Silver", "Gold", "Platinum"];

export default function DishModal({
  isOpen,
  dishToEdit,
  defaultCourseId = "starters",
  onClose,
  onSave,
}: DishModalProps) {
  if (!isOpen) return null;

  return (
    <DishModalInner
      key={dishToEdit ? `${dishToEdit.courseId}-${dishToEdit.index}` : `new-${defaultCourseId}`}
      dishToEdit={dishToEdit}
      defaultCourseId={defaultCourseId}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function DishModalInner({
  dishToEdit,
  defaultCourseId = "starters",
  onClose,
  onSave,
}: Omit<DishModalProps, "isOpen">) {
  const [name, setName] = useState(dishToEdit?.dish.name || "");
  const [courseId, setCourseId] = useState(dishToEdit?.courseId || defaultCourseId);
  const [diet, setDiet] = useState<"veg" | "non-veg">(dishToEdit?.dish.diet || "veg");
  const [tiers, setTiers] = useState<VendorTier[]>(dishToEdit?.dish.tiers || ["Silver", "Gold"]);
  const [desc, setDesc] = useState(dishToEdit?.dish.desc || "");
  const [photo, setPhoto] = useState<string | undefined>(dishToEdit?.dish.photo);
  const [error, setError] = useState("");

  const toggleTier = (t: VendorTier) => {
    if (tiers.includes(t)) {
      if (tiers.length === 1) {
        setError("Dish must be available on at least one tier.");
        return;
      }
      setTiers(tiers.filter((item) => item !== t));
    } else {
      setTiers([...tiers, t]);
    }
    setError("");
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError("Dish name is required.");
      return;
    }

    const dishItem: VendorMenuItem = {
      name: name.trim(),
      diet,
      ...(photo ? { photo } : {}),
      ...(desc.trim() ? { desc: desc.trim() } : {}),
      ...(tiers.length ? { tiers } : {}),
    };

    onSave(dishItem, courseId, dishToEdit?.index);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Configure Dish Details"
      footer={
        <>
          <BtnBack onClick={onClose}>Cancel</BtnBack>
          <BtnNext onClick={handleSave}>Save Dish to Menu</BtnNext>
        </>
      }
    >
      <div className="form-group">
        <FormLabel required htmlFor="dish-input-name">
          Dish Name
        </FormLabel>
        <input
          id="dish-input-name"
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Galouti Kebab with Mini Paratha"
          className="form-input"
        />
      </div>

      <div className="form-grid-2">
        <div className="form-group">
          <FormLabel htmlFor="dish-input-diet">Dietary Type</FormLabel>
          <select
            id="dish-input-diet"
            value={diet}
            onChange={(e) => setDiet(e.target.value as "veg" | "non-veg")}
            className="form-select"
          >
            <option value="veg">100% Vegetarian</option>
            <option value="non-veg">Non-Vegetarian</option>
          </select>
        </div>
        <div className="form-group">
          <FormLabel htmlFor="dish-input-course">Course Category</FormLabel>
          <select id="dish-input-course" value={courseId} onChange={(e) => setCourseId(e.target.value)} className="form-select">
            {COURSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <FormLabel htmlFor="dish-input-desc">Culinary Preparation Description</FormLabel>
        <textarea
          id="dish-input-desc"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Describe spices, charcoal dum method, or key ingredients..."
          className="form-textarea"
        />
      </div>

      <div className="form-group">
        <FormLabel>Dish Food Photography</FormLabel>
        <PhotoUploadButton
          currentPhoto={photo}
          kind="dish"
          aspectRatio="landscape"
          title="Dish Photo"
          label={photo ? "Change Photo 📷" : "Upload Photo 📷"}
          helperText="Authentic food photo shown on dish cards. JPG, PNG or WebP · Max 5 MB"
          onPhotoUploaded={setPhoto}
          onPhotoRemoved={() => setPhoto(undefined)}
        />
      </div>

      <div
        className="form-group"
        style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--color-cream-30)" }}
      >
        <span className="form-label">Available on Tiers (Check all that apply)</span>
        <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" }}>
          {TIER_OPTIONS.map((t) => (
            <label
              key={t}
              style={{
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 4,
                minHeight: 44,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={tiers.includes(t)}
                onChange={() => toggleTier(t)}
                style={{ width: 18, height: 18, accentColor: "var(--color-red)" }}
              />{" "}
              {t}
            </label>
          ))}
        </div>
      </div>
      <FieldError>{error}</FieldError>
    </Sheet>
  );
}
