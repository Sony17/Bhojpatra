"use client";

import { useState } from "react";
import Image from "next/image";
import BuilderNav from "../common/BuilderNav";
import DishModal from "./DishModal";
import type { VendorMenuSection, VendorMenuItem } from "@/lib/vendorMenus";
import { dummyDishPhoto } from "@/lib/data";
import { cn } from "@/components/ui/cn";
import { AddDashed, ContentCard, DietMark, FieldError, R, StepHeading } from "../../ui";

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
    <div>
      <StepHeading
        eyebrow="Feast Builder · Dishes & Photos"
        heading="Build your dishes with authentic photos"
        subtext="Add dishes to each course, set dietary status, attach food photos, and assign them to marketplace tiers."
        mEyebrow="Dishes & Photos"
        mHeading="Dish builder"
        mSubtext={null}
      />

      <ContentCard>
        {/* Course Tabs */}
        <div className="course-tabs-bar" role="tablist" aria-label="Courses">
          {COURSES.map((c) => {
            const n = sections.find((s) => s.categoryId === c.id)?.items.length || 0;
            const active = c.id === activeTab;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={cn("course-tab-btn", active && "active")}
                onClick={() => setActiveTab(c.id)}
              >
                <span>
                  {c.icon} <R d={c.name} m={c.short} />
                </span>{" "}
                <span className="tab-badge">{n}</span>
              </button>
            );
          })}
        </div>

        {/* Dish Cards Container */}
        <div className="dishes-catalog-container items-catalog-grid">
          {activeDishes.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--color-black-60)", fontSize: 13 }}>
              No dishes added to this course yet. Click below to add your first delicacy!
            </div>
          ) : (
            activeDishes.map((dish, idx) => {
              const isSig = featured.includes(dish.name);
              const tiers = dish.tiers?.length ? dish.tiers : ["Silver", "Gold"];
              return (
                <div key={`${dish.name}-${idx}`} className="dish-card">
                  <div className="dish-card-left">
                    <Image
                      src={dish.photo || dummyDishPhoto(dish.name)}
                      alt={dish.name}
                      width={54}
                      height={54}
                      unoptimized
                      className="dish-thumb"
                    />
                    <div className="dish-info">
                      <div className="dish-name-row">
                        <DietMark diet={dish.diet} />
                        <span className="dish-name">{dish.name}</span>
                        {isSig && (
                          <span
                            className="service-pill"
                            style={{ background: "var(--color-cream)", color: "var(--color-red)" }}
                          >
                            ★ Signature
                          </span>
                        )}
                      </div>
                      {dish.desc && <p className="dish-desc">{dish.desc}</p>}
                      <div className="dish-meta-row">
                        {tiers.map((t) => (
                          <span key={t} className={`dish-tier-tag ${t.toLowerCase()}`}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="dish-card-actions">
                    <button
                      type="button"
                      className="btn-icon-action"
                      onClick={() => toggleSignature(dish.name)}
                      title={isSig ? "Signature Dish (Click to remove)" : "Mark as Signature Dish (Featured on card)"}
                      aria-label={isSig ? `Remove ${dish.name} from signature dishes` : `Mark ${dish.name} as signature dish`}
                      aria-pressed={isSig}
                      style={
                        isSig
                          ? { background: "var(--color-red)", color: "var(--color-cream)", borderColor: "var(--color-red)" }
                          : undefined
                      }
                    >
                      ★
                    </button>
                    <button
                      type="button"
                      className="btn-icon-action"
                      onClick={() => handleOpenEditModal(dish, idx)}
                      title="Edit Dish"
                      aria-label={`Edit ${dish.name}`}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="btn-icon-action"
                      onClick={() => handleDeleteDish(idx)}
                      title="Remove Dish"
                      aria-label={`Remove ${dish.name}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {notice && <FieldError>{notice}</FieldError>}

        {/* + Add Dish Button */}
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
