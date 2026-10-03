"use client";

import { useState, useSyncExternalStore, type KeyboardEvent } from "react";
import Image from "next/image";
import BuilderNav from "../common/BuilderNav";
import StallDishModal from "./StallDishModal";
import type { VendorMenuSection, VendorMenuItem, SingleStallConfig } from "@/lib/vendorMenus";
import { dummyDishPhoto } from "@/lib/data";
import { FieldHint, FormLabel, R, StepHeading, inputCls } from "../../ui";

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

/** Phone breakpoint (matches onboarding.css `max-width: 639px`) — for copy that
 *  can't be swapped with <R> (input placeholders). */
const PHONE_MQ = "(max-width: 639px)";
function useIsPhone() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(PHONE_MQ);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(PHONE_MQ).matches,
    () => false,
  );
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

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
  const chips = [
    ...PLATFORM_STALL_CATEGORIES.map((c) => ({ id: c.id, name: c.name, icon: c.icon, desc: c.desc, isCustom: false })),
    ...customCats.map((id) => ({ id, name: stallCategoryName(id), icon: "✨", desc: "Custom vendor category", isCustom: true })),
  ];
  const isPhone = useIsPhone();

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

  const onCardKey = (e: KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleCategory(id);
    }
  };

  return (
    <div>
      <StepHeading
        eyebrow="Single Stall · Menus & Stations"
        heading="Build your stall menus"
        subtext="Select the stall categories you can serve, then build dishes and configure stall pricing & capacity for each stall."
        mEyebrow="Single Stall Menus"
        mHeading="Build stall menus"
        mSubtext="Select categories, build dishes, and configure independent stall pricing & pax for each stall."
      />

      <div className="content-card stall-menus-unified-card">
        {/* TOP SECTION: Category Selection */}
        <div className="stall-menu-section-block stall-categories-selection-block">
          <div className="stall-section-header-row">
            <div>
              <h3 className="stall-section-title">
                <span>📂</span> <R d="Choose your stall categories" m="Choose Categories" />
              </h3>
              <p className="stall-section-desc vob-d">
                Select all stall categories you can deploy. Each selected category becomes an active stall with its own
                menu and pricing.
              </p>
            </div>
            <span className="stall-cat-selected-pill">
              {selected.length} {plural(selected.length, "category", "categories")} selected
            </span>
          </div>

          {errors.categories && (
            <div className="stall-cat-validation-error alert-box alert-error" role="alert" style={{ marginTop: 12, marginBottom: 12 }}>
              <span className="vob-field-error" style={{ marginTop: 0 }}>
                <R
                  d="⚠️ Please select at least one stall category to continue."
                  m="⚠️ Select at least one category to continue."
                />
              </span>
            </div>
          )}

          <div className="stall-categories-grid" style={{ marginTop: 12 }}>
            {chips.map((cat) => {
              const on = selected.includes(cat.id);
              const count = on ? stallDishes(stallConfig, menu, cat.id).length : 0;
              return (
                <div
                  key={cat.id}
                  role="checkbox"
                  aria-checked={on}
                  tabIndex={0}
                  className={`stall-category-card${on ? " selected" : ""}`}
                  onClick={() => toggleCategory(cat.id)}
                  onKeyDown={(e) => onCardKey(e, cat.id)}
                >
                  <div className="stall-cat-checkbox">{on ? "✓" : ""}</div>
                  <div className="stall-cat-icon">{cat.icon}</div>
                  <div className="stall-cat-info" style={{ flex: 1 }}>
                    <div className="stall-cat-name">{cat.name}</div>
                    <div className="stall-cat-desc">{cat.desc}</div>
                    {on && (
                      <span
                        className="stall-cat-count-badge"
                        style={{ display: "inline-block", marginTop: 4, fontSize: 10.5, fontWeight: 700, color: "var(--color-red)" }}
                      >
                        {count} {plural(count, "dish", "dishes")} added
                      </span>
                    )}
                  </div>
                  {cat.isCustom && (
                    <button
                      type="button"
                      className="btn-remove-custom-cat"
                      title="Delete custom category"
                      aria-label={`Delete custom category ${cat.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCategory(cat.id);
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Custom Stall Category Adder */}
          <div
            className="custom-stall-cat-adder"
            style={{
              marginTop: 16,
              padding: "12px 14px",
              border: "1px dashed var(--color-gold)",
              borderRadius: "var(--radius-card)",
              background: "var(--color-cream-10)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-black)" }}>
                <R d="✨ Need a Custom Stall Category?" m="✨ Add Custom Category" />
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="custom-stall-cat-input"
                type="text"
                className="form-input"
                style={{ flex: 1, fontSize: 12 }}
                value={customCat}
                onChange={(e) => setCustomCat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomCategory();
                  }
                }}
                placeholder={isPhone ? "Category Name" : "Enter custom category name (e.g. Mocktail Bar, Regional Mithai)"}
                aria-label="Custom stall category name"
              />
              <button
                type="button"
                className="btn-sm btn-primary"
                onClick={addCustomCategory}
                style={{
                  background: "var(--color-red)",
                  color: "var(--color-white)",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  minHeight: 44,
                }}
              >
                <R d="＋ Add Category" m="Add" />
              </button>
            </div>
          </div>
        </div>

        <div className="stall-menu-section-divider" />

        {/* Active Stall Configuration */}
        {selected.length > 0 && current && (
          <div className="stall-menu-section-block stall-active-config-block">
            <div className="stall-menu-cat-switcher-wrapper">
              <div className="stall-switcher-label">Select stall to configure:</div>
              <div className="stall-menu-cat-switcher" role="tablist" aria-label="Stalls">
                {selected.map((id) => {
                  const count = stallDishes(stallConfig, menu, id).length;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={id === current}
                      className={`stall-menu-cat-tab${id === current ? " active" : ""}`}
                      onClick={() => setActiveCat(id)}
                    >
                      <span>{stallCategoryName(id)}</span>
                      <span className={`stall-cat-tab-badge ${count > 0 ? "has-items" : "empty"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="stall-current-configuring-strip">
              <div className="stall-current-meta">
                <span className="stall-current-prefix">
                  <R d="Currently configuring:" m="Configuring:" />
                </span>
                <span className="stall-current-name">{currentName}</span>
              </div>
              <span className="stall-current-badge vob-d">Active Configuration</span>
            </div>

            {errors.dishes && dishes.length === 0 && (
              <div className="stall-menu-validation-error alert-box alert-error" role="alert" style={{ marginTop: 12, marginBottom: 12 }}>
                <span className="vob-field-error" style={{ marginTop: 0 }}>
                  <R
                    d="⚠️ Please add at least 1 dish to this stall before proceeding."
                    m="⚠️ Add at least 1 dish to this stall."
                  />
                </span>
              </div>
            )}

            {/* PART 1: DISHES */}
            <div className="stall-dishes-section" style={{ marginTop: 16 }}>
              <div className="stall-section-header-row" style={{ marginBottom: 12 }}>
                <div>
                  <h4 className="stall-subsection-title">
                    <span>🍽️</span> Your Dishes
                  </h4>
                  <p className="stall-section-desc vob-d">
                    Add each food item prepared at this stall with dish-level per-plate pricing and dietary markers.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-sm btn-primary"
                  onClick={() => setModal("new")}
                  style={{
                    background: "var(--color-red)",
                    color: "var(--color-white)",
                    border: "none",
                    padding: "7px 14px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                    minHeight: 36,
                  }}
                >
                  <span>＋</span> Add Dish
                </button>
              </div>

              <div className="stall-category-items-grid">
                {dishes.length === 0 ? (
                  <div
                    className="stall-menu-empty-state"
                    style={{
                      gridColumn: "1 / -1",
                      textAlign: "center",
                      padding: "28px 16px",
                      background: "var(--color-cream-10)",
                      border: "1.5px dashed var(--color-cream-60)",
                      borderRadius: "var(--radius-card)",
                    }}
                  >
                    <div style={{ fontSize: 30, marginBottom: 6 }}>🍽️</div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-black)", marginBottom: 4 }}>
                      No dishes added to {currentName} yet
                    </h4>
                    <p style={{ fontSize: 11.5, color: "var(--color-black-60)", maxWidth: 360, margin: "0 auto 12px" }}>
                      Add at least 1 food item with photo, dietary marker, and per-plate pricing to complete this stall menu.
                    </p>
                    <button
                      type="button"
                      className="btn-sm btn-primary"
                      onClick={() => setModal("new")}
                      style={{
                        background: "var(--color-red)",
                        color: "var(--color-white)",
                        border: "none",
                        padding: "7px 16px",
                        borderRadius: 6,
                        fontWeight: 700,
                        cursor: "pointer",
                        minHeight: 36,
                      }}
                    >
                      ＋ Add First Dish
                    </button>
                  </div>
                ) : (
                  dishes.map((d, idx) => (
                    <div key={`${d.name}-${idx}`} className="stall-menu-item-card">
                      <div className="stall-item-photo-wrapper">
                        <Image src={d.photo || dummyDishPhoto(d.name)} alt={d.name} width={64} height={64} unoptimized />
                        <span
                          className={`fssai-icon ${d.diet === "non-veg" ? "nonveg" : "veg"} stall-item-diet-badge`}
                          title={d.diet === "non-veg" ? "Non-Vegetarian" : "100% Vegetarian"}
                        />
                      </div>
                      <div className="stall-item-details">
                        <div className="stall-item-name-row">
                          <h4 className="stall-item-name">{d.name}</h4>
                          {d.price ? (
                            <span className="stall-item-price">
                              ₹{d.price}{" "}
                              <small style={{ fontSize: 10, fontWeight: 600, color: "var(--color-black-60)" }}>/ plate</small>
                            </span>
                          ) : null}
                        </div>
                        {d.desc && <p className="stall-item-desc">{d.desc}</p>}
                        <div className="stall-item-actions">
                          <button
                            type="button"
                            className="btn-item-action btn-item-edit"
                            aria-label={`Edit ${d.name}`}
                            onClick={() => setModal({ item: d, index: idx })}
                          >
                            Edit ✎
                          </button>
                          <button
                            type="button"
                            className="btn-item-action btn-item-delete"
                            aria-label={`Delete ${d.name}`}
                            onClick={() => writeDishes(current, dishes.filter((_, i) => i !== idx))}
                          >
                            Delete 🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button type="button" className="btn-add-item-dashed" style={{ marginTop: 12 }} onClick={() => setModal("new")}>
                <span>＋</span> Add Dish to <span className="active-cat-name-label">{currentName || "Stall"}</span>
              </button>
            </div>

            {/* PART 2: STALL PRICING & PAX */}
            <div
              className="stall-pricing-pax-card"
              style={{
                marginTop: 24,
                padding: "18px 20px",
                border: "1.5px solid var(--color-gold)",
                borderRadius: "var(--radius-card)",
                background: "var(--bg-cream-tint)",
              }}
            >
              <div
                className="stall-pricing-header-row"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 12 }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🏷️</span>
                    <h4 style={{ fontSize: 14, fontWeight: 800, color: "var(--color-black-90)", margin: 0 }}>
                      <R d="Stall Pricing & Pax Guarantee" m="Stall Pricing & Pax" />
                    </h4>
                  </div>
                  <p style={{ fontSize: 11.5, color: "var(--color-black-60)", margin: "4px 0 0 0" }}>
                    <R
                      d={
                        <>
                          Set the commercial rate and minimum guest guarantee required to book the{" "}
                          <strong style={{ color: "var(--color-black-90)" }}>{currentName}</strong> stall. Data is stored
                          independently for each stall.
                        </>
                      }
                      m="Independent commercial package rate & minimums for this stall."
                    />
                  </p>
                </div>
                <span className="stall-pricing-independent-pill">
                  <R d="Independent per stall" m="Per Stall" />
                </span>
              </div>

              <div className="form-grid-2" style={{ marginTop: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <FormLabel required htmlFor="stall-fixed-rate">
                    Fixed Per-Plate Rate (₹)
                  </FormLabel>
                  <div style={{ position: "relative" }}>
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        left: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontWeight: 700,
                        color: "var(--color-black-60)",
                      }}
                    >
                      ₹
                    </span>
                    <input
                      id="stall-fixed-rate"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={pricing.fixedPerPlate || ""}
                      onChange={(e) => setPricing("fixedPerPlate", Number(e.target.value))}
                      placeholder="e.g. 150"
                      className={inputCls}
                      style={{ paddingLeft: 24 }}
                    />
                  </div>
                  <FieldHint className="vob-d">Fixed package price per guest covering this stall&apos;s spread.</FieldHint>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <FormLabel required htmlFor="stall-min-pax">
                    <R d="Minimum Guest Guarantee (Min Pax)" m="Min Pax Guarantee" />
                  </FormLabel>
                  <input
                    id="stall-min-pax"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={pricing.minPaxGuarantee || ""}
                    onChange={(e) => setPricing("minPaxGuarantee", Number(e.target.value))}
                    placeholder="e.g. 50"
                    className={inputCls}
                  />
                  <FieldHint className="vob-d">Minimum guest headcount required to deploy this stall (default 50).</FieldHint>
                </div>
              </div>
              {errors.pricing && (
                <span className="vob-field-error" role="alert">
                  ⚠️ {errors.pricing}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Wizard Action Bar */}
        <div
          className="wizard-actions-bar"
          style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
        >
          <button type="button" className="btn-back" onClick={onBack} disabled={saving}>
            <R d="← Back to Offerings" m="← Back" />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="button" className="btn-next" onClick={validate} disabled={saving}>
              <R d="Continue to Setup & Cutlery →" m="Next: Setup & Cutlery →" />
            </button>
          </div>
        </div>
      </div>

      <StallDishModal
        isOpen={modal !== null}
        categoryName={currentName}
        delicacyToEdit={modal === "new" ? null : modal}
        onClose={() => setModal(null)}
        onSave={saveDish}
      />

      <BuilderNav onBack={onBack} onContinue={validate} onSaveDraft={onSaveDraft} saving={saving} />
    </div>
  );
}
