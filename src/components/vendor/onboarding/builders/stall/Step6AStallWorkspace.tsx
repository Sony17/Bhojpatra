"use client";

import { useState } from "react";
import Image from "next/image";
import BuilderSectionHeader from "../common/BuilderSectionHeader";
import BuilderNav from "../common/BuilderNav";
import StallDishModal from "./StallDishModal";
import type {
  VendorMenuSection,
  VendorMenuItem,
  SingleStallConfig,
} from "@/lib/vendorMenus";
import { dummyDishPhoto } from "@/lib/data";
import { Button } from "@/components/ui";

interface Step6AStallWorkspaceProps {
  stallConfig?: SingleStallConfig;
  menu: VendorMenuSection[];
  onChangeStallConfig: (config: SingleStallConfig) => void;
  onChangeMenu: (menu: VendorMenuSection[]) => void;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

export const PLATFORM_STALL_CATEGORIES = [
  { id: "chaat", name: "Chaat Station", icon: "🥘", defaultPrice: 60, defaultPax: 50 },
  { id: "live", name: "Live Tandoor & Grill", icon: "🔥", defaultPrice: 90, defaultPax: 50 },
  { id: "chinese", name: "Indo-Chinese Wok", icon: "🥡", defaultPrice: 75, defaultPax: 50 },
  { id: "south-indian", name: "South Indian Dosa Bar", icon: "🥥", defaultPrice: 70, defaultPax: 50 },
  { id: "pizza", name: "Wood-Fired Pizza", icon: "🍕", defaultPrice: 120, defaultPax: 40 },
  { id: "pasta", name: "Live Pasta Piazza", icon: "🍝", defaultPrice: 110, defaultPax: 40 },
  { id: "pan", name: "Banarasi Paan Counter", icon: "🍃", defaultPrice: 40, defaultPax: 100 },
  { id: "momo", name: "Momo & Dimsum Counter", icon: "🥟", defaultPrice: 70, defaultPax: 50 },
  { id: "waffle", name: "Waffle & Pancake Bar", icon: "🧇", defaultPrice: 80, defaultPax: 50 },
  { id: "dessert", name: "Live Sweets & Dessert", icon: "🍨", defaultPrice: 75, defaultPax: 50 },
  { id: "hi-tea", name: "Evening Hi-Tea & Nasta", icon: "🫖", defaultPrice: 75, defaultPax: 50 },
  { id: "coffee", name: "Barista Coffee & Chai", icon: "☕", defaultPrice: 45, defaultPax: 50 },
  { id: "mocktail", name: "Mocktail & Juice Bar", icon: "🍹", defaultPrice: 65, defaultPax: 50 },
];

export default function Step6AStallWorkspace({
  stallConfig = { categories: ["chaat"] },
  menu,
  onChangeStallConfig,
  onChangeMenu,
  onBack,
  onContinue,
  onSaveDraft,
  saving = false,
}: Step6AStallWorkspaceProps) {
  const selectedCategories = stallConfig.categories || ["chaat"];
  const [activeTab, setActiveTab] = useState<string>(selectedCategories[0] || "chaat");
  const [modalOpen, setModalOpen] = useState(false);
  const [delicacyToEdit, setDelicacyToEdit] = useState<{
    item: VendorMenuItem;
    index: number;
  } | null>(null);
  const [customCatInput, setCustomCatInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const pricingMap = stallConfig.categoryPricing || {};
  const currentPricing = pricingMap[activeTab] || {
    fixedPerPlate:
      PLATFORM_STALL_CATEGORIES.find((c) => c.id === activeTab)?.defaultPrice || 75,
    minPaxGuarantee:
      PLATFORM_STALL_CATEGORIES.find((c) => c.id === activeTab)?.defaultPax || 50,
  };

  const activeCategoryMeta = PLATFORM_STALL_CATEGORIES.find((c) => c.id === activeTab) || {
    id: activeTab,
    name: activeTab.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    icon: "🍢",
  };

  const activeSection = menu.find((s) => s.categoryId === activeTab);
  const delicacies = activeSection?.items || [];

  const handleToggleCategory = (catId: string) => {
    let updated: string[];
    if (selectedCategories.includes(catId)) {
      if (selectedCategories.length === 1) {
        setErrors({ categories: "You must operate at least one stall category." });
        return;
      }
      updated = selectedCategories.filter((c) => c !== catId);
      if (activeTab === catId) {
        setActiveTab(updated[0]);
      }
    } else {
      updated = [...selectedCategories, catId];
    }
    setErrors({});

    // Ensure category pricing exists for new category
    const catMeta = PLATFORM_STALL_CATEGORIES.find((c) => c.id === catId);
    const updatedPricing = { ...pricingMap };
    if (!updatedPricing[catId]) {
      updatedPricing[catId] = {
        fixedPerPlate: catMeta?.defaultPrice || 75,
        minPaxGuarantee: catMeta?.defaultPax || 50,
      };
    }

    onChangeStallConfig({
      ...stallConfig,
      categories: updated,
      categoryPricing: updatedPricing,
    });
  };

  const handleAddCustomCategory = () => {
    const trimmed = customCatInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (!trimmed) return;
    if (selectedCategories.includes(trimmed)) {
      setCustomCatInput("");
      return;
    }

    const updated = [...selectedCategories, trimmed];
    const updatedPricing = {
      ...pricingMap,
      [trimmed]: { fixedPerPlate: 80, minPaxGuarantee: 50 },
    };

    onChangeStallConfig({
      ...stallConfig,
      categories: updated,
      categoryPricing: updatedPricing,
    });
    setActiveTab(trimmed);
    setCustomCatInput("");
  };

  const handlePricingChange = (field: "fixedPerPlate" | "minPaxGuarantee", val: number) => {
    const updatedPricing = {
      ...pricingMap,
      [activeTab]: {
        ...currentPricing,
        [field]: Math.max(0, val || 0),
      },
    };

    onChangeStallConfig({
      ...stallConfig,
      categoryPricing: updatedPricing,
    });

    // Also update perPlate in menu section
    if (field === "fixedPerPlate") {
      const updatedMenu = menu.map((sec) => {
        if (sec.categoryId === activeTab) {
          return { ...sec, perPlate: Math.max(0, val || 0) };
        }
        return sec;
      });
      onChangeMenu(updatedMenu);
    }
  };

  const handleSaveDelicacy = (item: VendorMenuItem, existingIndex?: number) => {
    const updatedMenu = [...menu];
    let secIndex = updatedMenu.findIndex((s) => s.categoryId === activeTab);

    if (secIndex === -1) {
      updatedMenu.push({
        categoryId: activeTab,
        perPlate: currentPricing.fixedPerPlate,
        menuType: "fixed",
        items: [],
      });
      secIndex = updatedMenu.length - 1;
    }

    const items = [...updatedMenu[secIndex].items];
    if (existingIndex !== undefined) {
      items[existingIndex] = item;
    } else {
      items.push(item);
    }

    updatedMenu[secIndex] = {
      ...updatedMenu[secIndex],
      items,
      menuType: "fixed",
      perPlate: currentPricing.fixedPerPlate,
    };

    onChangeMenu(updatedMenu);
  };

  const handleDeleteDelicacy = (index: number) => {
    const updatedMenu = menu.map((sec) => {
      if (sec.categoryId !== activeTab) return sec;
      return {
        ...sec,
        items: sec.items.filter((_, idx) => idx !== index),
      };
    });
    onChangeMenu(updatedMenu);
  };

  const validateAndContinue = () => {
    const newErrors: Record<string, string> = {};

    if (selectedCategories.length === 0) {
      newErrors.categories = "Select at least one stall category.";
    }

    // Check that each selected category has valid pricing and min pax
    for (const cat of selectedCategories) {
      const p = pricingMap[cat];
      if (!p || !p.fixedPerPlate || p.fixedPerPlate < 20) {
        newErrors[`pricing_${cat}`] = `Set a valid per-plate price for ${cat}.`;
      }
      if (!p || !p.minPaxGuarantee || p.minPaxGuarantee < 10) {
        newErrors[`minPax_${cat}`] = `Minimum pax for ${cat} must be at least 10 guests.`;
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onContinue();
    }
  };

  return (
    <div className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs">
      <BuilderSectionHeader
        badge="Section 6A"
        title="Single Stall Menus & Category Workspace"
        description="Select the platform stall categories your kitchen specializes in. Set independent fixed package pricing, guest guarantees, and delicacies for each individual stall."
        tip="Each stall category maintains independent dishes, fixed per-plate pricing, and pax guarantees so hosts can book a single focused counter."
      />

      {/* 13 Platform Categories Selector Ribbon */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-ink">
            Active Stall Categories ({selectedCategories.length} selected)
          </label>
          <span className="text-[11px] text-ink-soft">
            Click to activate / deactivate stalls
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {PLATFORM_STALL_CATEGORIES.map((cat) => {
            const isSelected = selectedCategories.includes(cat.id);

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleToggleCategory(cat.id)}
                className={`flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold transition-all min-h-[38px] ${
                  isSelected
                    ? "border border-maroon bg-maroon text-white shadow-2xs"
                    : "border border-cream-3 bg-cream-1/40 text-ink hover:border-maroon/40 hover:bg-cream-1"
                }`}
              >
                <span aria-hidden="true">{cat.icon}</span>
                <span>{cat.name}</span>
                {isSelected && <span className="ml-1 text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Custom Category Adder */}
        <div className="flex items-center gap-2 pt-1 max-w-sm">
          <input
            type="text"
            value={customCatInput}
            onChange={(e) => setCustomCatInput(e.target.value)}
            placeholder="+ Custom station (e.g. Churros Bar)"
            className="flex-1 rounded-control border border-cream-3 bg-cream-1/30 px-3 py-1.5 text-xs text-ink placeholder:text-ink-soft/60 focus:border-maroon focus:outline-hidden min-h-[38px]"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustomCategory();
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddCustomCategory}
            className="min-h-[38px]"
          >
            Add
          </Button>
        </div>

        {errors.categories && (
          <p className="text-xs text-red-600">{errors.categories}</p>
        )}
      </div>

      {/* Category Switcher Tabs */}
      <div className="mt-8 border-b border-cream-2">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {selectedCategories.map((catId) => {
            const meta = PLATFORM_STALL_CATEGORIES.find((c) => c.id === catId) || {
              id: catId,
              name: catId.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
              icon: "🍢",
            };
            const count =
              menu.find((s) => s.categoryId === catId)?.items.length || 0;
            const isActive = activeTab === catId;

            return (
              <button
                key={catId}
                type="button"
                onClick={() => setActiveTab(catId)}
                className={`flex shrink-0 items-center gap-2 rounded-control px-4 py-2 text-xs font-bold transition-all min-h-[44px] ${
                  isActive
                    ? "border border-maroon bg-maroon text-white shadow-xs"
                    : "border border-cream-3 bg-cream-1/50 text-ink hover:bg-cream-1"
                }`}
              >
                <span>{meta.icon}</span>
                <span>{meta.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-cream-3/60 text-ink-soft"
                  }`}
                >
                  {count} items
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Category Operational Settings Panel */}
      <div className="mt-6 rounded-card border border-cream-3 bg-cream-1/30 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-cream-2 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-control bg-cream-2 text-xl">
              {activeCategoryMeta.icon}
            </span>
            <div>
              <h3 className="font-bold text-ink text-sm">
                {activeCategoryMeta.name} Setup
              </h3>
              <p className="text-[11px] text-ink-soft">
                Independent pricing and guarantee for this single stall
              </p>
            </div>
          </div>
          <span className="rounded-pill bg-cream-2 px-2.5 py-1 text-xs font-bold text-ink">
            Category: {activeTab}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="fixedPerPlate"
              className="block text-xs font-bold uppercase tracking-wider text-ink"
            >
              Fixed Spread Rate (₹/guest) <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-bold text-ink-soft">
                ₹
              </span>
              <input
                id="fixedPerPlate"
                type="number"
                min={20}
                max={5000}
                value={currentPricing.fixedPerPlate || ""}
                onChange={(e) =>
                  handlePricingChange(
                    "fixedPerPlate",
                    parseInt(e.target.value, 10) || 0,
                  )
                }
                className="w-full rounded-control border border-cream-3 bg-white pl-8 pr-3 py-2 text-sm font-bold text-ink focus:border-maroon focus:outline-hidden min-h-[44px]"
              />
            </div>
            {errors[`pricing_${activeTab}`] && (
              <p className="mt-1 text-xs text-red-600">
                {errors[`pricing_${activeTab}`]}
              </p>
            )}
            <p className="mt-1 text-[10px] text-ink-soft">
              Billed when host books this entire station spread.
            </p>
          </div>

          <div>
            <label
              htmlFor="minPaxGuarantee"
              className="block text-xs font-bold uppercase tracking-wider text-ink"
            >
              Minimum Guest Guarantee (Pax){" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <input
                id="minPaxGuarantee"
                type="number"
                min={10}
                max={5000}
                value={currentPricing.minPaxGuarantee || ""}
                onChange={(e) =>
                  handlePricingChange(
                    "minPaxGuarantee",
                    parseInt(e.target.value, 10) || 0,
                  )
                }
                className="w-full rounded-control border border-cream-3 bg-white px-3.5 py-2 text-sm font-bold text-ink focus:border-maroon focus:outline-hidden min-h-[44px]"
              />
            </div>
            {errors[`minPax_${activeTab}`] && (
              <p className="mt-1 text-xs text-red-600">
                {errors[`minPax_${activeTab}`]}
              </p>
            )}
            <p className="mt-1 text-[10px] text-ink-soft">
              Minimum plates required to set up this station.
            </p>
          </div>
        </div>
      </div>

      {/* Active Category Delicacies List */}
      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-ink text-sm">
            Delicacies in {activeCategoryMeta.name} ({delicacies.length})
          </h4>
          <Button
            type="button"
            size="md"
            onClick={() => {
              setDelicacyToEdit(null);
              setModalOpen(true);
            }}
            className="min-h-[44px]"
          >
            + Add Delicacy
          </Button>
        </div>

        {delicacies.length === 0 ? (
          <div className="rounded-card border-2 border-dashed border-cream-3 p-8 text-center bg-cream-1/10">
            <span className="text-2xl" aria-hidden="true">
              🥢
            </span>
            <p className="mt-2 text-xs font-semibold text-ink">
              No items added to {activeCategoryMeta.name} yet
            </p>
            <p className="text-[11px] text-ink-soft mt-0.5">
              Add signature varieties or preparations served at this station.
            </p>
            <div className="mt-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setDelicacyToEdit(null);
                  setModalOpen(true);
                }}
                className="min-h-[38px]"
              >
                + Add First Delicacy
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {delicacies.map((item, idx) => {
              const imgSrc = item.photo || dummyDishPhoto(item.name);

              return (
                <div
                  key={`${item.name}-${idx}`}
                  className="flex items-center gap-3 rounded-card border border-cream-3 bg-white p-3 shadow-xs hover:border-maroon/40 transition-all"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-control bg-cream-2">
                    <Image
                      src={imgSrc}
                      alt={item.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized={Boolean(item.photo?.startsWith("/api/vendor/photo"))}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`flex h-2.5 w-2.5 items-center justify-center rounded-xs border ${
                          item.diet === "veg"
                            ? "border-emerald-600"
                            : "border-red-600"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            item.diet === "veg"
                              ? "bg-emerald-600"
                              : "bg-red-600"
                          }`}
                        />
                      </span>
                      <h5 className="font-bold text-ink text-xs truncate">
                        {item.name}
                      </h5>
                    </div>

                    {item.desc && (
                      <p className="text-[11px] text-ink-soft truncate mt-0.5">
                        {item.desc}
                      </p>
                    )}

                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-maroon">
                        {item.price ? `₹${item.price}/portion` : "Fixed spread"}
                      </span>

                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setDelicacyToEdit({ item, index: idx });
                            setModalOpen(true);
                          }}
                          className="text-xs font-semibold text-ink hover:text-maroon min-h-[32px] px-1"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDelicacy(idx)}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 min-h-[32px] px-1"
                          aria-label={`Delete ${item.name}`}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <StallDishModal
        isOpen={modalOpen}
        categoryName={activeCategoryMeta.name}
        delicacyToEdit={delicacyToEdit}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveDelicacy}
      />

      <BuilderNav
        onBack={onBack}
        onContinue={validateAndContinue}
        onSaveDraft={onSaveDraft}
        saving={saving}
        continueLabel="Continue to Stall Setup & Cutlery →"
      />
    </div>
  );
}
