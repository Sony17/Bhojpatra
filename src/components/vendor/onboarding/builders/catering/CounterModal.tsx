"use client";

import { useState } from "react";
import Image from "next/image";
import type { VendorCounter } from "@/lib/vendorMenus";
import { vendorOfferings, addOnMenus, addOns } from "@/lib/data";
import { cn } from "@/components/ui/cn";
import { BtnBack, BtnNext, FieldError, FormLabel, Sheet } from "../../ui";

/** Platform offerings shown under "Feast Extras" (5F); everything else that
 *  isn't a whole-event service is a Live Counter (5E). Staff / tableware live
 *  in Essentials (5G) and Tableware Add-ons (5H). */
export const EXTRA_OFFERING_IDS = ["mocktail", "hi-tea", "coffee", "decor"];
const ESSENTIAL_IDS = ["staff", "tableware"];

export function isExtraOffering(id: string) {
  return EXTRA_OFFERING_IDS.includes(id);
}
export function isLiveCounterOffering(id: string) {
  return !EXTRA_OFFERING_IDS.includes(id) && !ESSENTIAL_IDS.includes(id);
}

interface CounterModalProps {
  isOpen: boolean;
  counterToEdit?: VendorCounter | null;
  /** counter = Live Food Counter (5E), service = Feast Hospitality Extra (5F). */
  mode: "counter" | "service";
  /** Pre-select a platform offering (from a "Popular Ideas" card). */
  presetId?: string;
  presetPrice?: number;
  /** Offerings already in the catalog (can't be added twice). */
  takenIds?: string[];
  onClose: () => void;
  onSave: (counter: VendorCounter) => void;
}

export default function CounterModal(props: CounterModalProps) {
  if (!props.isOpen) return null;
  return (
    <CounterModalInner
      key={props.counterToEdit ? props.counterToEdit.id : `new-${props.mode}-${props.presetId ?? ""}`}
      {...props}
    />
  );
}

function CounterModalInner({
  counterToEdit,
  mode,
  presetId,
  presetPrice,
  takenIds = [],
  onClose,
  onSave,
}: CounterModalProps) {
  const isExtra = mode === "service";
  const options = vendorOfferings.filter((o) => (isExtra ? isExtraOffering(o.id) : isLiveCounterOffering(o.id)));
  const free = options.filter((o) => o.id === counterToEdit?.id || !takenIds.includes(o.id));

  const initialId = counterToEdit?.id || presetId || free[0]?.id || "";
  const initialOffering = options.find((o) => o.id === initialId);

  const [selectedId, setSelectedId] = useState(initialId);
  const [price, setPrice] = useState<number | undefined>(
    counterToEdit?.price ?? presetPrice ?? initialOffering?.price,
  );
  const [items, setItems] = useState<string[]>(
    counterToEdit ? counterToEdit.items ?? (addOnMenus[initialId] || []).map((m) => m.name) : (addOnMenus[initialId] || []).map((m) => m.name),
  );
  const [extras, setExtras] = useState<string[]>(counterToEdit?.extras?.map((e) => e.name) || []);
  const [newItem, setNewItem] = useState("");
  const [error, setError] = useState("");

  const platformMenu = addOnMenus[selectedId] || [];
  const addOn = addOns.find((a) => a.id === selectedId);
  const perPlate = addOn?.perPlate !== false;

  const changeOffering = (id: string) => {
    setSelectedId(id);
    setPrice(options.find((o) => o.id === id)?.price);
    setItems((addOnMenus[id] || []).map((m) => m.name));
    setExtras([]);
  };

  const togglePlatformItem = (name: string) =>
    setItems((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]));

  const addItem = () => {
    const v = newItem.trim();
    if (!v) return;
    if (items.includes(v) || extras.includes(v)) {
      setError("Item already added.");
      return;
    }
    if (platformMenu.some((m) => m.name === v)) setItems([...items, v]);
    else setExtras([...extras, v]);
    setNewItem("");
    setError("");
  };

  const save = () => {
    if (!selectedId) return setError(isExtra ? "Please choose an extra service." : "Please choose a counter station.");
    if (price === undefined || Number.isNaN(price) || price < 0) return setError("Please enter a valid price.");
    if (!items.length && !extras.length) return setError("Add at least one item served.");
    onSave({
      id: selectedId,
      price,
      items,
      extras: extras.map((name) => ({ name, ...(isExtra ? {} : { diet: "veg" as const }) })),
    });
    onClose();
  };

  const selectedOffering = options.find((o) => o.id === selectedId);
  const rupeeStyle = {
    position: "absolute" as const,
    left: 10,
    top: "50%",
    transform: "translateY(-50%)",
    fontWeight: 700,
    color: "var(--color-black-60)",
  };
  const priceInput = (placeholder: string) => (
    <input
      id="counter-input-price"
      type="number"
      inputMode="numeric"
      min={0}
      step={5}
      value={price ?? ""}
      onChange={(e) => setPrice(e.target.value === "" ? undefined : Number(e.target.value))}
      placeholder={placeholder}
      className="form-input"
      style={{ paddingLeft: 24 }}
    />
  );

  return (
    <Sheet
      open
      onClose={onClose}
      title={
        counterToEdit
          ? isExtra
            ? "Edit Feast Hospitality Extra"
            : "Edit Live Food Counter"
          : isExtra
            ? "Configure Feast Hospitality Extra"
            : "Configure Live Food Counter"
      }
      footer={
        <>
          <BtnBack onClick={onClose}>Cancel</BtnBack>
          <BtnNext onClick={save}>{isExtra ? "Save Extra to Catalog" : "Save Counter to Catalog"}</BtnNext>
        </>
      }
    >
      {/* 1. Category / Name — mapped to a platform offering id */}
      <div className="form-group">
        <FormLabel required htmlFor="counter-input-category">
          {isExtra ? "Extra Service Name / Category" : "Counter Category / Station Name"}
        </FormLabel>
        <select
          id="counter-input-category"
          value={selectedId}
          disabled={Boolean(counterToEdit)}
          onChange={(e) => changeOffering(e.target.value)}
          className="form-select"
        >
          {free.map((o) => (
            <option key={o.id} value={o.id}>
              {o.icon} {o.name}
            </option>
          ))}
        </select>
        <span className="field-hint">
          {isExtra
            ? "Choose the hospitality service this extra covers from the Bhojpatra platform catalog."
            : "Choose the live station category this counter runs from the Bhojpatra platform catalog."}
        </span>
      </div>

      {/* 2. Cover Photo — platform photography for the chosen station */}
      <div className="form-group">
        <span className="form-label">Cover Photo</span>
        <div className="photo-uploader-box" style={{ marginTop: 4 }}>
          {addOn?.image ? (
            <Image
              src={addOn.image}
              alt={`${addOn.name} cover`}
              width={90}
              height={70}
              unoptimized
              className="photo-preview-thumb"
            />
          ) : (
            <div
              className="photo-preview-thumb"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}
              aria-hidden
            >
              {selectedOffering?.icon ?? "📷"}
            </div>
          )}
          <div className="photo-upload-meta" style={{ flex: 1 }}>
            <div className="photo-upload-title">{selectedOffering?.name ?? "Cover Photo"}</div>
            <div className="photo-upload-desc">
              Authentic Bhojpatra food photography for this {isExtra ? "service" : "station"} — shown on your catalog card.
            </div>
          </div>
        </div>
      </div>

      {/* 3. Items Served */}
      <div className="form-group">
        <FormLabel required htmlFor="counter-input-new-item">
          {isExtra ? "Included Items / Service Deliverables" : "Items Served at this Counter"}
        </FormLabel>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            id="counter-input-new-item"
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
            placeholder={
              isExtra ? "e.g. Virgin Mojito, Fresh Lime Soda, Fruit Punch" : "e.g. Golgappa, Aloo Tikki, Papdi Chaat"
            }
            className="form-input"
          />
          <button
            type="button"
            className="btn-tier-proceed"
            style={{ margin: 0, padding: "6px 14px", fontSize: 12, whiteSpace: "nowrap" }}
            onClick={addItem}
          >
            + Add Item
          </button>
        </div>
        <div
          className="vendor-items-builder-container"
          style={{
            marginTop: 8,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            minHeight: 36,
            padding: 8,
            background: "var(--color-cream-10)",
            border: "1px dashed var(--color-cream-40)",
            borderRadius: "var(--radius-control)",
          }}
        >
          {platformMenu.length === 0 && extras.length === 0 && (
            <span style={{ fontSize: 11.5, color: "var(--color-black-40)", alignSelf: "center" }}>
              No items added yet. Type an item above and click &quot;+ Add Item&quot;.
            </span>
          )}
          {platformMenu.map((m) => {
            const on = items.includes(m.name);
            return (
              <span
                key={m.name}
                className="item-chip-editable"
                style={on ? undefined : { opacity: 0.5, textDecoration: "line-through" }}
              >
                <span>{m.name}</span>
                <button
                  type="button"
                  className={cn("btn-chip-action", on ? "remove" : "edit")}
                  onClick={() => togglePlatformItem(m.name)}
                  aria-pressed={on}
                  aria-label={on ? `Remove ${m.name}` : `Add ${m.name} back`}
                  title={on ? "Remove Item" : "Add Item back"}
                >
                  {on ? "✕" : "＋"}
                </button>
              </span>
            );
          })}
          {extras.map((n) => (
            <span key={n} className="item-chip-editable">
              <span>{n}</span>
              <button
                type="button"
                className="btn-chip-action edit"
                aria-label={`Edit ${n}`}
                title="Edit Item"
                onClick={() => {
                  setExtras(extras.filter((x) => x !== n));
                  setNewItem(n);
                }}
              >
                ✎
              </button>
              <button
                type="button"
                className="btn-chip-action remove"
                aria-label={`Remove ${n}`}
                title="Remove Item"
                onClick={() => setExtras(extras.filter((x) => x !== n))}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <span className="field-hint">
          {isExtra
            ? "List the items, beverages, or services included in this package. Click to edit, or ✕ to remove."
            : "Add the food and beverage items included in this counter. You can edit an item or click ✕ to remove."}
        </span>
      </div>

      {/* 4. Pricing */}
      {isExtra ? (
        <div className="form-grid-2">
          <div className="form-group">
            <FormLabel htmlFor="extra-select-pricing-type">Pricing Model</FormLabel>
            <select
              id="extra-select-pricing-type"
              value={perPlate ? "per-plate" : "fixed"}
              disabled
              className="form-select"
            >
              <option value="per-plate">Per Plate / Guest (₹ / plate)</option>
              <option value="fixed">Fixed Event Package Cost (Flat ₹)</option>
            </select>
          </div>
          <div className="form-group">
            <FormLabel required htmlFor="counter-input-price">
              {perPlate ? "Price Rate (₹ / plate)" : "Price Rate (Flat ₹)"}
            </FormLabel>
            <div style={{ position: "relative" }}>
              <span style={rupeeStyle}>₹</span>
              {priceInput("60")}
            </div>
          </div>
        </div>
      ) : (
        <div className="form-group">
          <FormLabel required htmlFor="counter-input-price">
            Extra Cost Per Plate (₹ / plate)
          </FormLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <span style={rupeeStyle}>₹</span>
              {priceInput("80")}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-black-60)", whiteSpace: "nowrap" }}>
              / plate
            </span>
          </div>
          <span className="field-hint">Additional per-guest charge added for this counter to the feast booking price.</span>
        </div>
      )}
      <FieldError>{error}</FieldError>
    </Sheet>
  );
}
