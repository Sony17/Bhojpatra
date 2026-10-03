"use client";

import { useState } from "react";
import type { VendorMenuItem } from "@/lib/vendorMenus";
import type { VendorTier } from "@/lib/admin/types";
import PhotoUploadButton from "../common/PhotoUploadButton";
import { Button } from "@/components/ui";

interface DishModalProps {
  isOpen: boolean;
  dishToEdit?: { dish: VendorMenuItem; courseId: string; index: number } | null;
  defaultCourseId?: string;
  onClose: () => void;
  onSave: (dish: VendorMenuItem, targetCourseId: string, index?: number) => void;
}

const COURSES = [
  { id: "welcome", name: "Welcome Drinks" },
  { id: "starters", name: "Starters & Appetizers" },
  { id: "main", name: "Main Course" },
  { id: "breads", name: "Artisan Breads" },
  { id: "sweets", name: "Mithai & Sweets" },
];

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dish-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-card border border-cream-3 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-cream-2 pb-3">
          <h3 id="dish-modal-title" className="text-base font-bold text-ink">
            {dishToEdit ? "Edit Dish" : "Add Dish to Menu"}
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

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-control bg-red-50 p-2.5 text-xs text-red-700">
              ⚠️ {error}
            </div>
          )}

          {/* Dish Name */}
          <div>
            <label
              htmlFor="dishName"
              className="block text-xs font-bold uppercase tracking-wider text-ink"
            >
              Dish Name <span className="text-red-500">*</span>
            </label>
            <input
              id="dishName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Paneer Malai Tikka, Galouti Kebab, Dal Bukhara"
              className="mt-1 w-full rounded-control border border-cream-3 bg-cream-1/30 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-maroon focus:outline-hidden min-h-[44px]"
              autoFocus
            />
          </div>

          {/* Course Assignment */}
          <div>
            <label
              htmlFor="dishCourse"
              className="block text-xs font-bold uppercase tracking-wider text-ink"
            >
              Assigned Course <span className="text-red-500">*</span>
            </label>
            <select
              id="dishCourse"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="mt-1 w-full rounded-control border border-cream-3 bg-white px-3.5 py-2.5 text-sm text-ink focus:border-maroon focus:outline-hidden min-h-[44px]"
            >
              {COURSES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
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

          {/* Tier Availability */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
              Feast Tier Availability
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs text-ink cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={tiers.includes("Silver")}
                  onChange={() => toggleTier("Silver")}
                  className="h-4 w-4 rounded-xs border-cream-3 text-maroon focus:ring-maroon"
                />
                <span className="font-semibold">Silver Tier</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-ink cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={tiers.includes("Gold")}
                  onChange={() => toggleTier("Gold")}
                  className="h-4 w-4 rounded-xs border-cream-3 text-maroon focus:ring-maroon"
                />
                <span className="font-semibold">Gold Tier</span>
              </label>
            </div>
            <p className="mt-1 text-[11px] text-ink-soft">
              Unchecking Silver makes this a Gold-exclusive premium delicacy.
            </p>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="dishDesc"
              className="block text-xs font-bold uppercase tracking-wider text-ink"
            >
              Culinary Description
            </label>
            <textarea
              id="dishDesc"
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. Cottage cheese cubes marinated in saffron yoghurt and charred over charcoal sigdi..."
              className="mt-1 w-full rounded-control border border-cream-3 bg-cream-1/30 p-2.5 text-xs text-ink placeholder:text-ink-soft/60 focus:border-maroon focus:outline-hidden"
            />
          </div>

          {/* Dish Photo */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
              Dish Photo (Optional)
            </label>
            <PhotoUploadButton
              currentPhoto={photo}
              kind="dish"
              aspectRatio="square"
              label="Upload Dish Shot"
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
              {dishToEdit ? "Update Dish" : "Add Dish to Roster"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
