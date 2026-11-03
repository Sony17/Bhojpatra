"use client";

import { useState } from "react";
import Image from "next/image";
import BuilderNav from "../common/BuilderNav";
import PhotoUploadButton from "../common/PhotoUploadButton";
import {
  defaultNewDishDiet,
  type SingleStallConfig,
  type VendorDietaryOffering,
  type VendorMenuItem,
  type VendorMenuSection,
} from "@/lib/vendorMenus";
import { dummyDishPhoto } from "@/lib/data";
import { PLATFORM_STALL_CATEGORIES } from "@/lib/stallTypes";
import { mirrorStallMenu, stallCategoryName, stallDishes } from "./Step6AStallWorkspace";
import { EQUIPMENT_OPTIONS } from "./Step6BStallSetup";
import { DIET_NAMES } from "../../VendorContextHeader";
import { ChipAddInput, ChoiceChip, FieldError, FieldHint, FormLabel, R, StepHeading, inputCls } from "../../ui";

interface QuickStallConfigureProps {
  stallConfig?: SingleStallConfig;
  menu: VendorMenuSection[];
  /** Pure-veg kitchen: only vegetarian dishes may be added. */
  dietaryOffering?: VendorDietaryOffering;
  onChangeStallConfig: (config: SingleStallConfig) => void;
  onChangeMenu: (menu: VendorMenuSection[]) => void;
  onBack: () => void;
  onFinish: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

type ItemDraft = {
  name: string;
  diet: "veg" | "non-veg";
  price: string;
  desc: string;
  photo: string | undefined;
};

function blankItem(offering?: VendorDietaryOffering): ItemDraft {
  return {
    name: "",
    diet: defaultNewDishDiet(offering),
    price: "",
    desc: "",
    photo: undefined,
  };
}

/**
 * QUICK CONFIGURE — the compact, single-card Single Stall step shown when a
 * vendor opted into ONLY Single Stall (no Feast / Baina branches). Same data
 * (stallConfig + mirrored menu[]), same validations and autosave as the
 * two-section workspace (6A Menus › 6B Live & Cutlery) — just folded into one
 * phone-first column: stall-type dropdown, inline dish form, mandatory
 * pricing, and the stall-setup checklist with "Selected" pills.
 */
export default function QuickStallConfigure({
  stallConfig = { categories: [] },
  menu,
  dietaryOffering,
  onChangeStallConfig,
  onChangeMenu,
  onBack,
  onFinish,
  onSaveDraft,
  saving = false,
}: QuickStallConfigureProps) {
  const vegOnly = dietaryOffering === "veg";
  const selected = stallConfig.categories || [];
  const [activeCat, setActiveCat] = useState<string>(selected[0] || "");
  const current = selected.includes(activeCat) ? activeCat : selected[0] || "";
  const currentName = current ? stallCategoryName(current) : "";

  const pricingMap = stallConfig.categoryPricing || {};
  const pricing = pricingMap[current] || { fixedPerPlate: 0, minPaxGuarantee: 50 };
  const dishes = current ? stallDishes(stallConfig, menu, current) : [];
  const equipment = stallConfig.equipment || [];
  const equipmentRows = [...EQUIPMENT_OPTIONS, ...equipment.filter((e) => !EQUIPMENT_OPTIONS.includes(e))];

  // Inline "Configure Stall Menu Item" form (replaces the dish modal here).
  const [item, setItem] = useState<ItemDraft>(() => blankItem(dietaryOffering));
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [itemError, setItemError] = useState("");
  const [customType, setCustomType] = useState("");
  const [customEquip, setCustomEquip] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** Apply a stall-config change and keep the published menu[] in step with it. */
  const commit = (cfg: SingleStallConfig) => {
    onChangeStallConfig(cfg);
    onChangeMenu(mirrorStallMenu(cfg, menu));
  };

  const writeDishes = (catId: string, items: VendorMenuItem[]) => {
    commit({ ...stallConfig, menus: { ...(stallConfig.menus || {}), [catId]: items } });
  };

  const resetItemForm = () => {
    setItem(blankItem(dietaryOffering));
    setEditIndex(null);
    setItemError("");
  };

  /** Dropdown pick: select (add) a stall type, or switch to an already-selected one. */
  const pickType = (id: string) => {
    if (!id) return;
    if (!selected.includes(id)) {
      commit({
        ...stallConfig,
        categories: [...selected, id],
        categoryPricing: { ...pricingMap, [id]: pricingMap[id] || { fixedPerPlate: 0, minPaxGuarantee: 50 } },
      });
    }
    setActiveCat(id);
    setErrors({});
    resetItemForm();
  };

  const removeType = (id: string) => {
    const next = selected.filter((c) => c !== id);
    commit({ ...stallConfig, categories: next });
    if (current === id) setActiveCat(next[0] || "");
    setErrors({});
    resetItemForm();
  };

  const addCustomType = () => {
    const name = customType.trim().slice(0, 50);
    if (!name) return;
    const existing =
      PLATFORM_STALL_CATEGORIES.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id ??
      selected.find((c) => stallCategoryName(c).toLowerCase() === name.toLowerCase());
    pickType(existing ?? name);
    setCustomType("");
  };

  /** Same rules as StallDishModal: name, uniqueness, veg-only kitchen, price. */
  const saveItem = () => {
    const name = item.name.trim();
    if (!name) return setItemError("Dish Name is required.");
    const key = name.toLowerCase();
    const clash = dishes.some((d, i) => i !== editIndex && d.name.trim().toLowerCase() === key);
    if (clash) return setItemError(`"${name}" is already on this stall's menu.`);
    if (vegOnly && item.diet !== "veg") return setItemError("Your kitchen is Pure Vegetarian — only veg dishes can be added.");
    const price = Number(item.price);
    if (!price || price <= 0) return setItemError("Item Price (₹ / plate) is required.");
    const diet =
      editIndex !== null
        ? item.diet
        : defaultNewDishDiet(dietaryOffering);
    const saved: VendorMenuItem = {
      name,
      diet,
      price,
      ...(item.desc.trim() ? { desc: item.desc.trim() } : {}),
      ...(item.photo ? { photo: item.photo } : {}),
    };
    const list = [...dishes];
    if (editIndex !== null) list[editIndex] = saved;
    else list.push(saved);
    writeDishes(current, list);
    resetItemForm();
  };

  const startEdit = (d: VendorMenuItem, idx: number) => {
    setItem({ name: d.name, diet: d.diet === "non-veg" ? "non-veg" : "veg", price: d.price ? String(d.price) : "", desc: d.desc || "", photo: d.photo });
    setEditIndex(idx);
    setItemError("");
  };

  const setPricing = (field: "fixedPerPlate" | "minPaxGuarantee", val: number) => {
    commit({
      ...stallConfig,
      categoryPricing: { ...pricingMap, [current]: { ...pricing, [field]: Math.max(0, val || 0) } },
    });
  };

  const toggleEquipment = (eq: string) =>
    onChangeStallConfig({
      ...stallConfig,
      equipment: equipment.includes(eq) ? equipment.filter((e) => e !== eq) : [...equipment, eq],
    });

  const addCustomEquip = () => {
    const v = customEquip.trim();
    if (v && !equipment.includes(v)) onChangeStallConfig({ ...stallConfig, equipment: [...equipment, v] });
    setCustomEquip("");
  };

  /** Same gate as the two-section workspace: ≥1 stall, each with ≥1 dish and valid pricing. */
  const validate = () => {
    const e: Record<string, string> = {};
    if (!selected.length) e.categories = "Please select your stall type to continue.";
    for (const cat of selected) {
      if (!stallDishes(stallConfig, menu, cat).length) {
        e.dishes = `Please add at least 1 menu item to the ${stallCategoryName(cat)} stall before proceeding.`;
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
    if (!Object.keys(e).length) onFinish();
  };

  return (
    <div className="quick-stall-configure">
      <StepHeading
        eyebrow="Single Stall · Quick Configure"
        heading="Configure your stall"
        subtext="Pick your stall type, add your menu items, and confirm your stall setup — all in one place."
        mEyebrow="Single Stall"
        mHeading="Configure your stall"
        mSubtext={null}
      />

      <div className="content-card quick-stall-card" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="quick-stall-banner">
          Quick Configure: <span style={{ color: "var(--color-red)" }}>Single Stall</span>
        </div>

        {/* ── Select Stall Type ── */}
        <div className="form-group">
          <FormLabel required htmlFor="quick-stall-type">
            Select Stall Type
          </FormLabel>
          <select
            id="quick-stall-type"
            className="form-select"
            value={current}
            onChange={(e) => pickType(e.target.value)}
            style={{ background: "var(--color-cream-10)", fontWeight: 600 }}
          >
            <option value="" disabled>
              Choose your stall type…
            </option>
            {PLATFORM_STALL_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name} Stall
              </option>
            ))}
            {selected
              .filter((id) => !PLATFORM_STALL_CATEGORIES.some((c) => c.id === id))
              .map((id) => (
                <option key={id} value={id}>
                  ✨ {stallCategoryName(id)} Stall
                </option>
              ))}
          </select>
          <FieldHint className="vob-d">Each selected type runs as its own stall with an independent menu and pricing.</FieldHint>
        </div>

        {errors.categories && (
          <span className="vob-field-error" role="alert">
            ⚠️ {errors.categories}
          </span>
        )}

        {/* Selected stalls (multi-stall vendors switch / remove here) */}
        {selected.length > 0 && (
          <div className="review-pills-row" style={{ alignItems: "center", marginBottom: 8 }}>
            {selected.map((id) => {
              const count = stallDishes(stallConfig, menu, id).length;
              return (
                <ChoiceChip key={id} active={id === current} onClick={() => pickType(id)}>
                  {stallCategoryName(id)} · {count}
                  <span
                    role="button"
                    aria-label={`Remove ${stallCategoryName(id)} stall`}
                    style={{ marginLeft: 4, fontWeight: 800, cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeType(id);
                    }}
                  >
                    ✕
                  </span>
                </ChoiceChip>
              );
            })}
            <ChipAddInput value={customType} onChange={setCustomType} onAdd={addCustomType} placeholder="+ Custom stall type" />
          </div>
        )}
        {selected.length === 0 && (
          <div className="review-pills-row" style={{ alignItems: "center", marginBottom: 8 }}>
            <ChipAddInput value={customType} onChange={setCustomType} onAdd={addCustomType} placeholder="+ Custom stall type" />
          </div>
        )}

        {current && (
          <>
            <div className="stall-menu-section-divider" />

            {/* ── Configure Stall Menu Item ── */}
            <h3 className="quick-stall-section-title">
              Configure Stall Menu Item{" "}
              {selected.length > 1 && <span style={{ color: "var(--color-red)", fontWeight: 700 }}>— {currentName}</span>}
            </h3>

            <div className="form-group">
              <FormLabel required htmlFor="quick-item-name">
                Dish or Item Name
              </FormLabel>
              <input
                id="quick-item-name"
                type="text"
                className={inputCls}
                value={item.name}
                onChange={(e) => setItem({ ...item, name: e.target.value })}
                placeholder="e.g. Kurkuri Aloo Tikki"
              />
            </div>

            {dietaryOffering && (
              <FieldHint className="vob-d quick-stall-kitchen-diet">
                Kitchen: {DIET_NAMES[dietaryOffering]}
              </FieldHint>
            )}

            <div className="form-group">
              <FormLabel htmlFor="quick-item-desc">Description</FormLabel>
              <textarea
                id="quick-item-desc"
                className="form-textarea"
                rows={2}
                value={item.desc}
                onChange={(e) => setItem({ ...item, desc: e.target.value })}
                placeholder="Portion size, ingredients, and preparation style..."
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <FormLabel required htmlFor="quick-item-price">
                  <R d="Set Item Price (₹ / plate)" m="Item Price (₹)" />
                </FormLabel>
                <input
                  id="quick-item-price"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className={inputCls}
                  value={item.price}
                  onChange={(e) => setItem({ ...item, price: e.target.value })}
                  placeholder="e.g. 120"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <FormLabel>Dish Photo</FormLabel>
                <PhotoUploadButton
                  currentPhoto={item.photo}
                  kind="dish"
                  aspectRatio="landscape"
                  label="Upload Photo 📷"
                  onPhotoUploaded={(url) => setItem((prev) => ({ ...prev, photo: url }))}
                  onPhotoRemoved={() => setItem((prev) => ({ ...prev, photo: undefined }))}
                />
              </div>
            </div>

            <FieldError>{itemError}</FieldError>

            <div className="quick-stall-actions">
              <button type="button" className="btn-next" onClick={saveItem}>
                {editIndex !== null ? "Save Item ✓" : "＋ Add Item to Menu"}
              </button>
              {editIndex !== null && (
                <button type="button" className="btn-back" onClick={resetItemForm}>
                  Cancel Edit
                </button>
              )}
            </div>

            {errors.dishes && dishes.length === 0 && (
              <span className="vob-field-error" role="alert" style={{ marginTop: 10 }}>
                ⚠️ {errors.dishes}
              </span>
            )}

            {/* Added items — compact rows */}
            {dishes.length > 0 && (
              <div className="quick-stall-dish-list">
                {dishes.map((d, idx) => (
                  <div
                    key={`${d.name}-${idx}`}
                    className={`quick-stall-dish-row${editIndex === idx ? " is-editing" : ""}`}
                  >
                    <div className="stall-item-photo-wrapper quick-stall-dish-photo">
                      <Image src={d.photo || dummyDishPhoto(d.name)} alt={d.name} width={34} height={34} unoptimized />
                      <span
                        className={`fssai-icon ${d.diet === "non-veg" ? "nonveg" : "veg"} stall-item-diet-badge`}
                        title={d.diet === "non-veg" ? "Non-Vegetarian" : "100% Vegetarian"}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-black)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {d.name}
                      </div>
                      {d.desc && (
                        <div style={{ fontSize: 11, color: "var(--color-black-60)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {d.desc}
                        </div>
                      )}
                    </div>
                    {d.price ? (
                      <span style={{ fontSize: 12, fontWeight: 800, color: "var(--color-red)", whiteSpace: "nowrap" }}>₹{d.price}</span>
                    ) : null}
                    <button type="button" className="btn-item-action btn-item-edit" aria-label={`Edit ${d.name}`} onClick={() => startEdit(d, idx)}>
                      ✎
                    </button>
                    <button
                      type="button"
                      className="btn-item-action btn-item-delete"
                      aria-label={`Delete ${d.name}`}
                      onClick={() => {
                        writeDishes(current, dishes.filter((_, i) => i !== idx));
                        if (editIndex === idx) resetItemForm();
                      }}
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ── Select Your Stall Setup ── */}
            <div className="stall-setup-panel">
              <div className="stall-setup-panel__head">
                <div>
                  <h4 className="stall-setup-panel__title">
                    🏷️ Select Your Stall Setup <span style={{ color: "var(--color-red)" }}>*</span>
                  </h4>
                  <p className="stall-setup-panel__intro vob-d">Package rate & minimum pax for this stall.</p>
                </div>
                <span className="stall-pricing-independent-pill">
                  <R d="Per Stall" m="Per Stall" />
                </span>
              </div>

              <div className="form-grid-2 stall-setup-pricing-grid">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <FormLabel required htmlFor="quick-stall-rate">
                    <R d="Fixed Per-Plate Rate (₹)" m="Per-Plate Rate (₹)" />
                  </FormLabel>
                  <input
                    id="quick-stall-rate"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={pricing.fixedPerPlate || ""}
                    onChange={(e) => setPricing("fixedPerPlate", Number(e.target.value))}
                    placeholder="e.g. 150"
                    className={inputCls}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <FormLabel required htmlFor="quick-stall-pax">
                    <R d="Minimum Guest Guarantee" m="Min Pax" />
                  </FormLabel>
                  <input
                    id="quick-stall-pax"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={pricing.minPaxGuarantee || ""}
                    onChange={(e) => setPricing("minPaxGuarantee", Number(e.target.value))}
                    placeholder="e.g. 50"
                    className={inputCls}
                  />
                </div>
              </div>
              {errors.pricing && (
                <span className="vob-field-error" role="alert">
                  ⚠️ {errors.pricing}
                </span>
              )}

              <div className="stall-setup-rows stall-setup-rows--two-col">
                {equipmentRows.map((eq) => {
                  const on = equipment.includes(eq);
                  return (
                    <div key={eq} className="stall-setup-row">
                      <span className="stall-setup-row__label">{eq}</span>
                      <ChoiceChip className="stall-setup-chip" active={on} onClick={() => toggleEquipment(eq)}>
                        <span className="stall-setup-chip-text">{on ? "Selected" : "Select"}</span>
                      </ChoiceChip>
                    </div>
                  );
                })}
                <div className="stall-setup-custom-row" style={{ gridColumn: "1 / -1" }}>
                  <ChipAddInput value={customEquip} onChange={setCustomEquip} onAdd={addCustomEquip} placeholder="+ Other equipment" />
                </div>
              </div>

              <div className="form-group stall-setup-cutlery">
                <FormLabel htmlFor="quick-stall-cutlery">
                  <R d="Stall Tableware & Disposables Inclusions" m="Tableware & Disposables" />
                </FormLabel>
                <input
                  id="quick-stall-cutlery"
                  type="text"
                  maxLength={60}
                  value={stallConfig.cutlery || ""}
                  onChange={(e) => onChangeStallConfig({ ...stallConfig, cutlery: e.target.value })}
                  placeholder="Eco-friendly Areca nut plates, birchwood spoons & napkins"
                  className="form-input"
                />
              </div>
            </div>
          </>
        )}

        {/* In-card action bar (the sticky footer below mirrors it) */}
        <div
          className="wizard-actions-bar"
          style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
        >
          <button type="button" className="btn-back" onClick={onBack} disabled={saving}>
            ← Back
          </button>
          <button type="button" className="btn-next" onClick={validate} disabled={saving}>
            <R d="Continue to Review →" m="Continue to Review →" />
          </button>
        </div>
      </div>

      <BuilderNav
        onBack={onBack}
        onContinue={validate}
        onSaveDraft={onSaveDraft}
        saving={saving}
        continueLabel="Continue to Review →"
        mContinueLabel="Review →"
      />
    </div>
  );
}
