"use client";

import { useState } from "react";
import Image from "next/image";
import type { VendorCounter } from "@/lib/vendorMenus";
import { vendorOfferings, addOnMenus, addOns } from "@/lib/data";
import { cn } from "@/components/ui/cn";
import { BtnBack, BtnNext, FieldError, FieldHint, FormLabel, Sheet, inputCls } from "../../ui";

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

  return (
    <Sheet
      open
      onClose={onClose}
      title={isExtra ? "Configure Feast Hospitality Extra" : "Configure Live Food Counter"}
      footer={
        <>
          <BtnBack onClick={onClose}>Cancel</BtnBack>
          <BtnNext onClick={save}>{isExtra ? "Save Extra to Catalog" : "Save Counter to Catalog"}</BtnNext>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <FormLabel required htmlFor="counter-input-category">
            {isExtra ? "Extra Service Name / Category" : "Counter Category / Station Name"}
          </FormLabel>
          <select
            id="counter-input-category"
            value={selectedId}
            disabled={Boolean(counterToEdit)}
            onChange={(e) => changeOffering(e.target.value)}
            className={inputCls}
          >
            {free.map((o) => (
              <option key={o.id} value={o.id}>
                {o.icon} {o.name}
              </option>
            ))}
          </select>
          <FieldHint>
            {isExtra
              ? "Choose the hospitality service this extra covers."
              : "Choose the live station category this counter runs."}
          </FieldHint>
        </div>

        {addOn?.image && (
          <div>
            <FormLabel>Cover Photo</FormLabel>
            <Image
              src={addOn.image}
              alt={addOn.name}
              width={480}
              height={200}
              unoptimized
              className="h-28 w-full rounded-control object-cover"
            />
          </div>
        )}

        <div>
          <FormLabel required htmlFor="counter-input-new-item">
            {isExtra ? "Included Items / Service Deliverables" : "Items Served at this Counter"}
          </FormLabel>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {platformMenu.map((m) => {
              const on = items.includes(m.name);
              return (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => togglePlatformItem(m.name)}
                  aria-pressed={on}
                  className={cn(
                    "min-h-[36px] rounded-full border px-3 text-xs font-semibold",
                    on ? "border-maroon bg-maroon text-cream" : "border-cream text-ink/50 line-through",
                  )}
                >
                  {m.name}
                </button>
              );
            })}
            {extras.map((n) => (
              <span key={n} className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-maroon pl-3 text-xs font-semibold text-cream">
                {n}
                <button
                  type="button"
                  aria-label={`Remove ${n}`}
                  onClick={() => setExtras(extras.filter((x) => x !== n))}
                  className="flex h-9 w-9 items-center justify-center"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
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
              className={inputCls}
            />
            <button type="button" onClick={addItem} className="min-h-[44px] shrink-0 rounded-full bg-maroon px-4 text-xs font-bold text-cream">
              + Add Item
            </button>
          </div>
          <FieldHint>
            {isExtra
              ? "List the items, beverages, or services included in this package. Click to edit, or ✕ to remove."
              : "Add the food and beverage items included in this counter. You can edit an item or click ✕ to remove."}
          </FieldHint>
        </div>

        {isExtra && (
          <div>
            <FormLabel htmlFor="extra-select-pricing-type">Pricing Model</FormLabel>
            <select id="extra-select-pricing-type" value={perPlate ? "plate" : "flat"} disabled className={inputCls}>
              <option value="plate">Per Plate / Guest (₹ / plate)</option>
              <option value="flat">Fixed Event Package Cost (Flat ₹)</option>
            </select>
          </div>
        )}

        <div>
          <FormLabel required htmlFor="counter-input-price">
            {isExtra ? (perPlate ? "Price Rate (₹ / plate)" : "Price Rate (Flat ₹)") : "Extra Cost Per Plate (₹ / plate)"}
          </FormLabel>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-ink/60">₹</span>
            <input
              id="counter-input-price"
              type="number"
              inputMode="numeric"
              min={0}
              value={price ?? ""}
              onChange={(e) => setPrice(e.target.value === "" ? undefined : Number(e.target.value))}
              placeholder={isExtra ? "60" : "80"}
              className={inputCls}
            />
            {perPlate && <span className="shrink-0 text-xs text-ink/60">/ plate</span>}
          </div>
          {!isExtra && (
            <FieldHint>Additional per-guest charge added for this counter to the feast booking price.</FieldHint>
          )}
        </div>
        <FieldError>{error}</FieldError>
      </div>
    </Sheet>
  );
}
