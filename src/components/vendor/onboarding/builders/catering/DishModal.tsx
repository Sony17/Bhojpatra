"use client";

import { useState } from "react";
import type { VendorMenuItem } from "@/lib/vendorMenus";
import type { VendorTier } from "@/lib/admin/types";
import PhotoUploadButton from "../common/PhotoUploadButton";
import { BtnBack, BtnNext, FieldError, FormLabel, Sheet, inputCls } from "../../ui";

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
      <div className="space-y-4">
        <div>
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
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FormLabel htmlFor="dish-input-diet">Dietary Type</FormLabel>
            <select
              id="dish-input-diet"
              value={diet}
              onChange={(e) => setDiet(e.target.value as "veg" | "non-veg")}
              className={inputCls}
            >
              <option value="veg">🟢 100% Vegetarian</option>
              <option value="non-veg">🔴 Non-Vegetarian</option>
            </select>
          </div>
          <div>
            <FormLabel htmlFor="dish-input-course">Course Category</FormLabel>
            <select id="dish-input-course" value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputCls}>
              {COURSES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <FormLabel htmlFor="dish-input-desc">Culinary Preparation Description</FormLabel>
          <textarea
            id="dish-input-desc"
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Describe spices, charcoal dum method, or key ingredients..."
            className={inputCls}
          />
        </div>
        <div>
          <FormLabel>Dish Food Photography</FormLabel>
          <PhotoUploadButton
            currentPhoto={photo}
            kind="dish"
            aspectRatio="landscape"
            label="Upload Dish Photo 📷"
            helperText="Authentic food photo shown on dish cards. JPG, PNG or WebP · Max 5 MB"
            onPhotoUploaded={setPhoto}
            onPhotoRemoved={() => setPhoto(undefined)}
          />
        </div>
        <div>
          <FormLabel>Available on Tiers (Check all that apply)</FormLabel>
          <div className="flex flex-wrap gap-2">
            {TIER_OPTIONS.map((t) => (
              <label
                key={t}
                className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-control border border-cream px-3 text-[13px] font-semibold text-ink"
              >
                <input
                  type="checkbox"
                  checked={tiers.includes(t)}
                  onChange={() => toggleTier(t)}
                  className="h-5 w-5 accent-[#b92025]"
                />
                {t}
              </label>
            ))}
          </div>
        </div>
        <FieldError>{error}</FieldError>
      </div>
    </Sheet>
  );
}
