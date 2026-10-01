"use client";

import { useState } from "react";
import Image from "next/image";
import BuilderSectionHeader from "../common/BuilderSectionHeader";
import BuilderNav from "../common/BuilderNav";
import DishModal from "./DishModal";
import type { VendorMenuSection, VendorMenuItem } from "@/lib/vendorMenus";
import { dummyDishPhoto } from "@/lib/data";
import { Button } from "@/components/ui";

interface Step5DDishBuilderProps {
  sections: VendorMenuSection[];
  featured: string[];
  onChangeSections: (sections: VendorMenuSection[]) => void;
  onChangeFeatured: (featured: string[]) => void;
  initialCourseId?: string;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

const COURSES = [
  { id: "welcome", name: "Welcome Drinks", icon: "🥤" },
  { id: "starters", name: "Starters", icon: "🍢" },
  { id: "main", name: "Main Course", icon: "🍲" },
  { id: "breads", name: "Breads", icon: "🫓" },
  { id: "sweets", name: "Sweets", icon: "🍬" },
];

export default function Step5DDishBuilder({
  sections,
  featured,
  onChangeSections,
  onChangeFeatured,
  initialCourseId = "starters",
  onBack,
  onContinue,
  onSaveDraft,
  saving = false,
}: Step5DDishBuilderProps) {
  const [activeTab, setActiveTab] = useState(initialCourseId);
  const [modalOpen, setModalOpen] = useState(false);
  const [dishToEdit, setDishToEdit] = useState<{
    dish: VendorMenuItem;
    courseId: string;
    index: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const activeSection = sections.find((s) => s.categoryId === activeTab);
  const activeDishes = activeSection?.items || [];

  const filteredDishes = activeDishes.filter((dish) =>
    dish.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleOpenAddModal = () => {
    setDishToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (dish: VendorMenuItem, index: number) => {
    setDishToEdit({ dish, courseId: activeTab, index });
    setModalOpen(true);
  };

  const handleSaveDish = (
    dish: VendorMenuItem,
    targetCourseId: string,
    existingIndex?: number,
  ) => {
    const updated = [...sections];

    // Ensure target section exists
    let targetSecIndex = updated.findIndex((s) => s.categoryId === targetCourseId);
    if (targetSecIndex === -1) {
      updated.push({
        categoryId: targetCourseId,
        perPlate: 0,
        items: [],
      });
      targetSecIndex = updated.length - 1;
    }

    if (dishToEdit && existingIndex !== undefined) {
      // Editing existing dish
      if (dishToEdit.courseId === targetCourseId) {
        // Same section edit
        const items = [...updated[targetSecIndex].items];
        items[existingIndex] = dish;
        updated[targetSecIndex] = { ...updated[targetSecIndex], items };
      } else {
        // Moved to another section
        const sourceSecIndex = updated.findIndex(
          (s) => s.categoryId === dishToEdit.courseId,
        );
        if (sourceSecIndex !== -1) {
          const sourceItems = updated[sourceSecIndex].items.filter(
            (_, idx) => idx !== existingIndex,
          );
          updated[sourceSecIndex] = {
            ...updated[sourceSecIndex],
            items: sourceItems,
          };
        }
        updated[targetSecIndex] = {
          ...updated[targetSecIndex],
          items: [...updated[targetSecIndex].items, dish],
        };
      }
    } else {
      // Adding new dish
      updated[targetSecIndex] = {
        ...updated[targetSecIndex],
        items: [...updated[targetSecIndex].items, dish],
      };
    }

    onChangeSections(updated);
  };

  const handleDeleteDish = (index: number) => {
    const dishToDelete = activeDishes[index];
    if (!dishToDelete) return;

    const updated = sections.map((sec) => {
      if (sec.categoryId !== activeTab) return sec;
      return {
        ...sec,
        items: sec.items.filter((_, idx) => idx !== index),
      };
    });

    // Also remove from featured if it was a signature dish
    if (featured.includes(dishToDelete.name)) {
      onChangeFeatured(featured.filter((name) => name !== dishToDelete.name));
    }

    onChangeSections(updated);
  };

  const toggleSignature = (dishName: string) => {
    if (featured.includes(dishName)) {
      onChangeFeatured(featured.filter((n) => n !== dishName));
    } else {
      if (featured.length >= 4) {
        alert("You can select up to 4 signature dishes to feature on your card.");
        return;
      }
      onChangeFeatured([...featured, dishName]);
    }
  };

  return (
    <div className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs">
      <BuilderSectionHeader
        badge="Section 5D"
        title="Granular Dish Builder"
        description="Craft each delicacy across your feast courses. Assign dietary markings, tier bands, appetizing descriptions, and signature star status."
        tip="Tagging your top 4 crowd-pleasers with a Star (⭐) highlights them as your vendor signature dishes on search results."
      />

      {/* Course Filter Tabs */}
      <div className="mt-6 border-b border-cream-2">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {COURSES.map((c) => {
            const count =
              sections.find((s) => s.categoryId === c.id)?.items.length || 0;
            const isActive = activeTab === c.id;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveTab(c.id);
                  setSearchQuery("");
                }}
                className={`flex shrink-0 items-center gap-2 rounded-control px-4 py-2.5 text-xs font-bold transition-all min-h-[44px] ${
                  isActive
                    ? "border border-maroon bg-maroon text-white shadow-xs"
                    : "border border-cream-3 bg-cream-1/50 text-ink hover:bg-cream-1"
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-cream-3/60 text-ink-soft"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Course Toolbar */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${COURSES.find((c) => c.id === activeTab)?.name} dishes...`}
            className="w-full rounded-control border border-cream-3 bg-cream-1/30 px-3.5 py-2 text-xs text-ink placeholder:text-ink-soft/60 focus:border-maroon focus:outline-hidden min-h-[44px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-soft hover:text-ink min-h-[24px] min-w-[24px]"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <Button
          type="button"
          size="md"
          onClick={handleOpenAddModal}
          className="min-h-[44px] shrink-0"
        >
          + Add New Dish
        </Button>
      </div>

      {/* Dishes Cards Grid */}
      <div className="mt-6">
        {filteredDishes.length === 0 ? (
          <div className="rounded-card border-2 border-dashed border-cream-3 p-8 text-center bg-cream-1/20">
            <span className="text-3xl" aria-hidden="true">
              🍲
            </span>
            <h4 className="mt-2 text-sm font-bold text-ink">
              No dishes in {COURSES.find((c) => c.id === activeTab)?.name} yet
            </h4>
            <p className="mt-1 text-xs text-ink-soft max-w-md mx-auto">
              Add your signature recipes, tikkas, or traditional items to give hosts an unforgettable selection.
            </p>
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleOpenAddModal}
                className="min-h-[44px]"
              >
                + Add First Dish
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDishes.map((dish, idx) => {
              const isSignature = featured.includes(dish.name);
              const imgSrc = dish.photo || dummyDishPhoto(dish.name);
              const isSilver = !dish.tiers || dish.tiers.includes("Silver");
              const isGold = !dish.tiers || dish.tiers.includes("Gold");

              return (
                <div
                  key={`${dish.name}-${idx}`}
                  className="flex flex-col justify-between rounded-card border border-cream-3 bg-white p-4 shadow-xs transition-all hover:border-maroon/40"
                >
                  <div>
                    {/* Thumbnail & Dietary Badge & Signature Star */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-control bg-cream-2 mb-3">
                      <Image
                        src={imgSrc}
                        alt={dish.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                        unoptimized={Boolean(dish.photo?.startsWith("/api/vendor/photo"))}
                      />
                      {/* Dietary Tag */}
                      <div className="absolute top-2 left-2 flex items-center gap-1 rounded-control bg-white/90 px-2 py-0.5 backdrop-blur-xs shadow-2xs">
                        <span
                          className={`flex h-3 w-3 items-center justify-center rounded-xs border ${
                            dish.diet === "veg"
                              ? "border-emerald-600"
                              : "border-red-600"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              dish.diet === "veg"
                                ? "bg-emerald-600"
                                : "bg-red-600"
                            }`}
                          />
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink">
                          {dish.diet}
                        </span>
                      </div>

                      {/* Signature Star Button */}
                      <button
                        type="button"
                        onClick={() => toggleSignature(dish.name)}
                        className={`absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-xs transition-transform active:scale-90 min-h-[32px] min-w-[32px] ${
                          isSignature
                            ? "bg-amber-400 text-ink shadow-xs"
                            : "bg-white/80 text-ink-soft hover:bg-white hover:text-amber-500"
                        }`}
                        title={
                          isSignature
                            ? "Signature Dish (Click to remove)"
                            : "Mark as Signature Dish (Featured on card)"
                        }
                        aria-label={`Toggle signature status for ${dish.name}`}
                      >
                        ⭐
                      </button>
                    </div>

                    {/* Dish Info */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-ink text-sm leading-tight">
                        {dish.name}
                      </h4>
                    </div>

                    {dish.desc && (
                      <p className="mt-1 text-xs text-ink-soft line-clamp-2 leading-relaxed">
                        {dish.desc}
                      </p>
                    )}

                    {/* Tiers badges */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {isSilver && (
                        <span className="rounded-pill bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          Silver
                        </span>
                      )}
                      {isGold && (
                        <span className="rounded-pill bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          Gold
                        </span>
                      )}
                      {isSignature && (
                        <span className="rounded-pill bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          ★ Signature
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-cream-2 pt-3">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(dish, idx)}
                      className="rounded-control border border-cream-3 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-cream-1 active:scale-95 transition-all min-h-[36px]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDish(idx)}
                      className="rounded-control border border-cream-3 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 active:scale-95 transition-all min-h-[36px]"
                      title="Delete dish"
                      aria-label={`Delete ${dish.name}`}
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

      <DishModal
        isOpen={modalOpen}
        dishToEdit={dishToEdit}
        defaultCourseId={activeTab}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveDish}
      />

      <BuilderNav
        onBack={onBack}
        onContinue={onContinue}
        onSaveDraft={onSaveDraft}
        saving={saving}
        continueLabel="Continue to Live Counters →"
      />
    </div>
  );
}
