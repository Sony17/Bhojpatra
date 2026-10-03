"use client";

import { useState } from "react";
import Image from "next/image";
import BuilderNav from "../common/BuilderNav";
import StallDishModal from "./StallDishModal";
import type { VendorMenuSection, VendorMenuItem, SingleStallConfig } from "@/lib/vendorMenus";
import { dummyDishPhoto } from "@/lib/data";
import { cn } from "@/components/ui/cn";
import { AddDashed, ContentCard, DietMark, FieldHint, FormLabel, Pill, R, StepHeading, inputCls } from "../../ui";

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

/** Handover: PREDEFINED_STALL_CATEGORIES. `menuId` = the platform menu category the
 *  stall's dishes are mirrored into for the customer stall-booking flow. */
export const PLATFORM_STALL_CATEGORIES: { id: string; name: string; icon: string; desc: string; menuId?: string }[] = [
  { id: "chaat", name: "Chaat", icon: "🥘", desc: "Live pani puri, aloo tikki, dahi bhalla & papdi", menuId: "chaat" },
  { id: "juices", name: "Juices & Shakes", icon: "🥤", desc: "Freshly squeezed fruit juices, shakes & coolers" },
  { id: "beverages", name: "Beverages & Chai", icon: "☕", desc: "Kulhad chai, filter coffee, artisan mocktails" },
  { id: "south-indian", name: "South Indian", icon: "🥥", desc: "Crispy dosas, idlis, vadas with sambar & chutneys", menuId: "south-indian" },
  { id: "north-indian", name: "North Indian & Mughlai", icon: "🍛", desc: "Curries, rolls, kebabs, tandoor specials & naans" },
  { id: "chinese", name: "Chinese & Pan-Asian", icon: "🍜", desc: "Hakka noodles, dim sums, momos & Manchurian", menuId: "chinese" },
  { id: "snacks", name: "Snacks & Fast Food", icon: "🥪", desc: "Sandwiches, burgers, fries, kathi rolls" },
  { id: "desserts", name: "Desserts & Sweets", icon: "🍬", desc: "Hot jalebi, gulab jamun, rabri, kulfi" },
  { id: "ice-cream", name: "Ice Cream & Kulfi", icon: "🍨", desc: "Artisanal rolled scoops, matka kulfi & sundaes" },
  { id: "street-food", name: "Street Food Specials", icon: "🍢", desc: "Pav bhaji, chole bhature, dabeli, momos" },
  { id: "live-grills", name: "Live Grills & Barbecue", icon: "🔥", desc: "Smoked paneer skewers, tikkas & charcoal kebabs", menuId: "live" },
  { id: "breakfast", name: "Breakfast Counter", icon: "🥞", desc: "Poori sabzi, parathas, poha, upma & chole kulche" },
  { id: "regional", name: "Regional / Specialty", icon: "🏺", desc: "Awadhi, Rajasthani, Gujarati or hyperlocal specials" },
];

/** Older stall ids saved before the V2 category list. */
const LEGACY_NAMES: Record<string, string> = {
  live: "Live Tandoor & Grill",
  pizza: "Wood-Fired Pizza",
  pasta: "Live Pasta Piazza",
  pan: "Banarasi Paan Counter",
  momo: "Momo & Dimsum Counter",
  waffle: "Waffle & Pancake Bar",
  dessert: "Live Sweets & Dessert",
  "hi-tea": "Evening Hi-Tea & Nasta",
  coffee: "Barista Coffee & Chai",
  mocktail: "Mocktail & Juice Bar",
};
const LEGACY_MENU_IDS = new Set(["live", "pizza", "pasta"]);

export function stallCategoryName(id: string) {
  return PLATFORM_STALL_CATEGORIES.find((c) => c.id === id)?.name ?? LEGACY_NAMES[id] ?? id;
}
export function stallMenuId(id: string) {
  return PLATFORM_STALL_CATEGORIES.find((c) => c.id === id)?.menuId ?? (LEGACY_MENU_IDS.has(id) ? id : undefined);
}
/** Dishes of one stall: V2 `stallConfig.menus`, else the mirrored `menu[]` section. */
export function stallDishes(cfg: SingleStallConfig | undefined, menu: VendorMenuSection[], id: string) {
  const own = cfg?.menus?.[id];
  if (own) return own;
  const mid = stallMenuId(id);
  return mid ? menu.find((s) => s.categoryId === mid)?.items ?? [] : [];
}

export default function Step6AStallWorkspace({
  stallConfig = { categories: [] },
  menu,
  onChangeStallConfig,
  onChangeMenu,
  onBack,
  onContinue,
  onSaveDraft,
  saving = false,
}: Step6AStallWorkspaceProps) {
  const selected = stallConfig.categories || [];
  const [activeCat, setActiveCat] = useState<string>(selected[0] || "");
  const [modal, setModal] = useState<{ item: VendorMenuItem; index: number } | null | "new">(null);
  const [customCat, setCustomCat] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const current = selected.includes(activeCat) ? activeCat : selected[0] || "";
  const pricingMap = stallConfig.categoryPricing || {};
  const pricing = pricingMap[current] || { fixedPerPlate: 0, minPaxGuarantee: 50 };
  const dishes = current ? stallDishes(stallConfig, menu, current) : [];
  const currentName = current ? stallCategoryName(current) : "";

  const customCats = selected.filter((id) => !PLATFORM_STALL_CATEGORIES.some((c) => c.id === id));
  const chips = [...PLATFORM_STALL_CATEGORIES.map((c) => ({ id: c.id, name: c.name, icon: c.icon })), ...customCats.map((id) => ({ id, name: stallCategoryName(id), icon: "✨" }))];

  /** Write a stall's dishes to stallConfig.menus and mirror platform ones into menu[]. */
  const writeDishes = (catId: string, items: VendorMenuItem[], cfg: SingleStallConfig = stallConfig) => {
    onChangeStallConfig({ ...cfg, menus: { ...(cfg.menus || {}), [catId]: items } });
    const mid = stallMenuId(catId);
    if (!mid) return;
    const perPlate = (cfg.categoryPricing || {})[catId]?.fixedPerPlate || 0;
    const idx = menu.findIndex((s) => s.categoryId === mid);
    if (idx === -1) onChangeMenu([...menu, { categoryId: mid, perPlate, items }]);
    else onChangeMenu(menu.map((s, i) => (i === idx ? { ...s, items, perPlate: perPlate || s.perPlate } : s)));
  };

  const toggleCategory = (id: string) => {
    if (selected.includes(id)) {
      const next = selected.filter((c) => c !== id);
      onChangeStallConfig({ ...stallConfig, categories: next });
      if (current === id) setActiveCat(next[0] || "");
    } else {
      onChangeStallConfig({
        ...stallConfig,
        categories: [...selected, id],
        categoryPricing: { ...pricingMap, [id]: pricingMap[id] || { fixedPerPlate: 0, minPaxGuarantee: 50 } },
      });
      setActiveCat(id);
    }
    setErrors({});
  };

  const addCustomCategory = () => {
    const name = customCat.trim().slice(0, 50);
    if (!name) return;
    const exists = chips.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      if (!selected.includes(exists.id)) toggleCategory(exists.id);
      setCustomCat("");
      return;
    }
    onChangeStallConfig({
      ...stallConfig,
      categories: [...selected, name],
      categoryPricing: { ...pricingMap, [name]: { fixedPerPlate: 0, minPaxGuarantee: 50 } },
    });
    setActiveCat(name);
    setCustomCat("");
  };

  const setPricing = (field: "fixedPerPlate" | "minPaxGuarantee", val: number) => {
    const nextCfg: SingleStallConfig = {
      ...stallConfig,
      categoryPricing: { ...pricingMap, [current]: { ...pricing, [field]: Math.max(0, val || 0) } },
    };
    onChangeStallConfig(nextCfg);
    const mid = stallMenuId(current);
    if (field === "fixedPerPlate" && mid) {
      onChangeMenu(menu.map((s) => (s.categoryId === mid ? { ...s, perPlate: Math.max(0, val || 0) } : s)));
    }
  };

  const saveDish = (item: VendorMenuItem, index?: number) => {
    const list = [...dishes];
    if (index !== undefined) list[index] = item;
    else list.push(item);
    writeDishes(current, list);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selected.length) e.categories = "Please select at least one stall category to continue.";
    for (const cat of selected) {
      if (!stallDishes(stallConfig, menu, cat).length) {
        e.dishes = `Please add at least 1 dish to the ${stallCategoryName(cat)} stall before proceeding.`;
        setActiveCat(cat);
        break;
      }
      const p = pricingMap[cat];
      if (!p?.fixedPerPlate || p.fixedPerPlate <= 0) {
        e.pricing = `Set the Fixed Per-Plate Rate for the ${stallCategoryName(cat)} stall.`;
        setActiveCat(cat);
        break;
      }
      if (!p?.minPaxGuarantee || p.minPaxGuarantee < 10) {
        e.pricing = `Minimum Guest Guarantee for the ${stallCategoryName(cat)} stall must be at least 10.`;
        setActiveCat(cat);
        break;
      }
    }
    setErrors(e);
    if (!Object.keys(e).length) onContinue();
  };

  return (
    <div className="animate-in fade-in duration-200">
      <StepHeading
        eyebrow="Single Stall · Menus & Stations"
        heading="Build your stall menus"
        subtext="Select the stall categories you can serve, then build dishes and configure stall pricing & capacity for each stall."
        mEyebrow="Single Stall Menus"
        mHeading="Build stall menus"
        mSubtext="Select categories, build dishes, and configure independent stall pricing & pax for each stall."
      />

      {/* Categories */}
      <ContentCard>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h3 className="[font-family:inherit] normal-case text-[15px] font-bold text-ink">
            📂 <R d="Choose your stall categories" m="Choose Categories" />
          </h3>
          <Pill tone="cream">
            {selected.length} <R d={selected.length === 1 ? "category selected" : "categories selected"} m="categories" />
          </Pill>
        </div>
        <p className="mb-3 hidden text-xs text-ink/60 sm:block">
          Select all stall categories you can deploy. Each selected category becomes an active stall with its own menu
          and pricing.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {chips.map((c) => {
            const on = selected.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleCategory(c.id)}
                className={cn(
                  "flex min-h-[48px] items-center gap-2 rounded-control border-2 px-2.5 text-left text-xs font-bold",
                  on ? "border-maroon bg-maroon/5 text-ink" : "border-cream/70 bg-white text-ink/70",
                )}
              >
                <span className="text-lg" aria-hidden>
                  {c.icon}
                </span>
                <span className="flex-1 leading-tight">{c.name}</span>
                {on && <span className="text-maroon">✓</span>}
              </button>
            );
          })}
        </div>
        {errors.categories && <p className="mt-2 text-xs font-semibold text-maroon">⚠️ {errors.categories}</p>}

        <div className="mt-4 rounded-control border border-dashed border-cream bg-cream/10 p-3">
          <div className="mb-2 text-xs font-bold text-ink">
            ✨ <R d="Need a Custom Stall Category?" m="Add Custom Category" />
          </div>
          <div className="flex gap-2">
            <input
              id="custom-stall-cat-input"
              type="text"
              value={customCat}
              onChange={(e) => setCustomCat(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomCategory();
                }
              }}
              placeholder="Enter custom category name (e.g. Mocktail Bar, Regional Mithai)"
              className={inputCls}
              aria-label="Custom stall category name"
            />
            <button type="button" onClick={addCustomCategory} className="min-h-[44px] shrink-0 rounded-full bg-maroon px-4 text-xs font-bold text-cream">
              <R d="＋ Add Category" m="Add" />
            </button>
          </div>
        </div>
      </ContentCard>

      {/* Active stall configuration */}
      {selected.length > 0 && (
        <ContentCard>
          <FormLabel>Select stall to configure:</FormLabel>
          <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            {selected.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveCat(id)}
                className={cn(
                  "min-h-[40px] shrink-0 rounded-full border px-3 text-xs font-semibold",
                  id === current ? "border-maroon bg-maroon text-cream" : "border-cream text-ink/70",
                )}
              >
                {stallCategoryName(id)} ({stallDishes(stallConfig, menu, id).length})
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-control bg-cream/20 p-2.5 text-xs">
            <span className="text-ink/60">
              <R d="Currently configuring:" m="Configuring:" />
            </span>
            <strong className="text-ink">{currentName}</strong>
            <span className="hidden sm:inline">
              <Pill tone="red">Active Configuration</Pill>
            </span>
          </div>

          {/* Dishes */}
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <h4 className="[font-family:inherit] normal-case text-[14px] font-bold text-ink">🍽️ Your Dishes</h4>
              <p className="hidden text-xs text-ink/60 sm:block">
                Add each food item prepared at this stall with dish-level per-plate pricing and dietary markers.
              </p>
            </div>
            <button type="button" onClick={() => setModal("new")} className="min-h-[40px] shrink-0 rounded-full bg-maroon px-3 text-xs font-bold text-cream">
              ＋ Add Dish
            </button>
          </div>
          {dishes.length === 0 ? (
            <p className="rounded-control border border-dashed border-maroon/40 p-4 text-center text-xs font-semibold text-maroon">
              ⚠️ <R d="Please add at least 1 dish to this stall before proceeding." m="Add at least 1 dish to this stall." />
            </p>
          ) : (
            <ul className="space-y-2">
              {dishes.map((d, idx) => (
                <li key={`${d.name}-${idx}`} className="flex items-center gap-3 rounded-control border border-cream/70 p-2.5">
                  <Image
                    src={d.photo || dummyDishPhoto(d.name)}
                    alt={d.name}
                    width={56}
                    height={56}
                    unoptimized
                    className="h-14 w-14 shrink-0 rounded-control object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <DietMark diet={d.diet} />
                      <span className="text-[13px] font-bold text-ink">{d.name}</span>
                      {d.price ? <span className="text-xs font-bold text-maroon">₹{d.price}</span> : null}
                    </div>
                    {d.desc && <p className="line-clamp-1 text-[11px] text-ink/60">{d.desc}</p>}
                  </div>
                  <button
                    type="button"
                    aria-label={`Edit ${d.name}`}
                    onClick={() => setModal({ item: d, index: idx })}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cream text-ink/70"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${d.name}`}
                    onClick={() => writeDishes(current, dishes.filter((_, i) => i !== idx))}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cream text-ink/70"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          <AddDashed onClick={() => setModal("new")}>Add Dish to Stall</AddDashed>
          {errors.dishes && <p className="mt-2 text-xs font-semibold text-maroon">⚠️ {errors.dishes}</p>}

          {/* Pricing */}
          <div className="mt-6 rounded-card border border-cream bg-white p-4">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h4 className="[font-family:inherit] normal-case text-[14px] font-bold text-ink">
                🏷️ <R d="Stall Pricing & Pax Guarantee" m="Stall Pricing & Pax" />
              </h4>
              <Pill tone="outline">
                <R d="Independent per stall" m="Per Stall" />
              </Pill>
            </div>
            <p className="mb-3 text-xs text-ink/60">
              <R
                d={`Set the commercial rate and minimum guest guarantee required to book the ${currentName} stall. Data is stored independently for each stall.`}
                m="Independent commercial package rate & minimums for this stall."
              />
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormLabel required htmlFor="stall-fixed-rate">
                  Fixed Per-Plate Rate (₹)
                </FormLabel>
                <input
                  id="stall-fixed-rate"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={pricing.fixedPerPlate || ""}
                  onChange={(e) => setPricing("fixedPerPlate", Number(e.target.value))}
                  placeholder="e.g. 150"
                  className={inputCls}
                />
                <FieldHint className="hidden sm:block">Fixed package price per guest covering this stall&apos;s spread.</FieldHint>
              </div>
              <div>
                <FormLabel required htmlFor="stall-min-pax">
                  <R d="Minimum Guest Guarantee (Min Pax)" m="Min Pax Guarantee" />
                </FormLabel>
                <input
                  id="stall-min-pax"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={pricing.minPaxGuarantee || ""}
                  onChange={(e) => setPricing("minPaxGuarantee", Number(e.target.value))}
                  placeholder="e.g. 50"
                  className={inputCls}
                />
                <FieldHint className="hidden sm:block">Minimum guest headcount required to deploy this stall (default 50).</FieldHint>
              </div>
            </div>
            {errors.pricing && <p className="mt-2 text-xs font-semibold text-maroon">⚠️ {errors.pricing}</p>}
          </div>
        </ContentCard>
      )}

      <StallDishModal
        isOpen={modal !== null}
        categoryName={currentName}
        delicacyToEdit={modal === "new" ? null : modal}
        onClose={() => setModal(null)}
        onSave={saveDish}
      />

      <BuilderNav
        backLabel="← Back to Offerings"
        mBackLabel="← Back"
        continueLabel="Continue to Setup & Cutlery →"
        mContinueLabel="Next: Setup & Cutlery →"
        onBack={onBack}
        onContinue={validate}
        onSaveDraft={onSaveDraft}
        saving={saving}
      />
    </div>
  );
}
