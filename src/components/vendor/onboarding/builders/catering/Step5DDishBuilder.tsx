"use client";

import { useState } from "react";
import Image from "next/image";
import BuilderNav from "../common/BuilderNav";
import DishModal from "./DishModal";
import type { VendorMenuSection, VendorMenuItem } from "@/lib/vendorMenus";
import { dummyDishPhoto } from "@/lib/data";
import { cn } from "@/components/ui/cn";
import { AddDashed, ContentCard, DietMark, R, StepHeading } from "../../ui";

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

/** Handover course tabs (desktop label / mobile label). */
const COURSES = [
  { id: "welcome", name: "Welcome", short: "Welcome", icon: "🥤" },
  { id: "starters", name: "Starters", short: "Starters", icon: "🍢" },
  { id: "main", name: "Main Course", short: "Main", icon: "🍲" },
  { id: "breads", name: "Breads", short: "Breads", icon: "🫓" },
  { id: "sweets", name: "Sweets", short: "Sweets", icon: "🍬" },
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
  const [notice, setNotice] = useState("");

  const activeSection = sections.find((s) => s.categoryId === activeTab);
  const activeDishes = activeSection?.items || [];


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
        setNotice("You can select up to 4 signature dishes to feature on your card.");
        return;
      }
      onChangeFeatured([...featured, dishName]);
    }
    setNotice("");
  };

  return (
    <div className="animate-in fade-in duration-200">
      <StepHeading
        eyebrow="Feast Builder · Dishes & Photos"
        heading="Build your dishes with authentic photos"
        subtext="Add dishes to each course, set dietary status, attach food photos, and assign them to marketplace tiers."
        mEyebrow="Dishes & Photos"
        mHeading="Dish builder"
        mSubtext={null}
      />

      <ContentCard>
        <div role="tablist" className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {COURSES.map((c) => {
            const n = sections.find((s) => s.categoryId === c.id)?.items.length || 0;
            const active = c.id === activeTab;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(c.id)}
                className={cn(
                  "flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold",
                  active ? "border-maroon bg-maroon text-cream" : "border-cream bg-white text-ink/70",
                )}
              >
                <span>
                  {c.icon} <R d={c.name} m={c.short} />
                </span>
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] font-bold",
                    active ? "bg-cream text-maroon" : "bg-cream/40 text-ink",
                  )}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>

        {activeDishes.length === 0 ? (
          <div className="rounded-control border border-dashed border-cream p-6 text-center text-[13px] text-ink/60">
            No dishes added to this course yet. Click below to add your first delicacy!
          </div>
        ) : (
          <ul className="space-y-2.5">
            {activeDishes.map((dish, idx) => {
              const isSig = featured.includes(dish.name);
              const tiers = dish.tiers?.length ? dish.tiers : ["Silver", "Gold"];
              return (
                <li key={`${dish.name}-${idx}`} className="flex items-start gap-3 rounded-control border border-cream/70 bg-white p-2.5">
                  <Image
                    src={dish.photo || dummyDishPhoto(dish.name)}
                    alt={dish.name}
                    width={64}
                    height={64}
                    unoptimized
                    className="h-16 w-16 shrink-0 rounded-control object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <DietMark diet={dish.diet} />
                      <span className="text-[13px] font-bold text-ink">{dish.name}</span>
                      {isSig && (
                        <span className="rounded-full bg-cream px-1.5 text-[10px] font-bold text-maroon">★ Signature</span>
                      )}
                    </div>
                    {dish.desc && <p className="mt-0.5 line-clamp-2 text-[11px] text-ink/60">{dish.desc}</p>}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {tiers.map((t) => (
                        <span key={t} className="rounded border border-cream px-1.5 text-[10px] font-bold uppercase text-ink/70">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => toggleSignature(dish.name)}
                      title={isSig ? "Signature Dish (Click to remove)" : "Mark as Signature Dish (Featured on card)"}
                      aria-pressed={isSig}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border text-sm",
                        isSig ? "border-maroon bg-maroon text-cream" : "border-cream text-ink/50",
                      )}
                    >
                      ★
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(dish, idx)}
                      title="Edit Dish"
                      aria-label={`Edit ${dish.name}`}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-cream text-ink/70"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDish(idx)}
                      title="Remove Dish"
                      aria-label={`Remove ${dish.name}`}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-cream text-ink/70"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {notice && <p className="mt-2 text-xs font-semibold text-maroon">⚠️ {notice}</p>}
        <AddDashed onClick={handleOpenAddModal}>
          <R d="Add New Dish to this Course" m="Add Dish" />
        </AddDashed>
      </ContentCard>

      <DishModal
        isOpen={modalOpen}
        dishToEdit={dishToEdit}
        defaultCourseId={activeTab}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveDish}
      />

      <BuilderNav onBack={onBack} onContinue={onContinue} onSaveDraft={onSaveDraft} saving={saving} />
    </div>
  );
}
