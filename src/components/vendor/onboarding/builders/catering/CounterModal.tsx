"use client";

import { useState } from "react";
import type { VendorCounter } from "@/lib/vendorMenus";
import { vendorOfferings, addOnMenus } from "@/lib/data";
import { Button } from "@/components/ui";

interface CounterModalProps {
  isOpen: boolean;
  counterToEdit?: VendorCounter | null;
  mode: "counter" | "service";
  onClose: () => void;
  onSave: (counter: VendorCounter) => void;
}

export default function CounterModal({
  isOpen,
  counterToEdit,
  mode,
  onClose,
  onSave,
}: CounterModalProps) {
  if (!isOpen) return null;

  return (
    <CounterModalInner
      key={counterToEdit ? counterToEdit.id : `new-${mode}`}
      counterToEdit={counterToEdit}
      mode={mode}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function CounterModalInner({
  counterToEdit,
  mode,
  onClose,
  onSave,
}: Omit<CounterModalProps, "isOpen">) {
  const availableOfferings = vendorOfferings.filter((o) =>
    mode === "service" ? o.category === "service" : o.category !== "service",
  );

  const defaultOffering = availableOfferings[0];
  const initialId = counterToEdit ? counterToEdit.id : (defaultOffering?.id || "");
  const initialPrice = counterToEdit ? counterToEdit.price : (defaultOffering?.price || 50);
  const defaultItems = counterToEdit
    ? (counterToEdit.items || [])
    : (initialId ? (addOnMenus[initialId] || []).map((m) => m.name) : []);

  const [selectedId, setSelectedId] = useState(initialId);
  const [price, setPrice] = useState<number | undefined>(initialPrice);
  const [selectedItems, setSelectedItems] = useState<string[]>(defaultItems);
  const [extraInput, setExtraInput] = useState("");
  const [extras, setExtras] = useState<string[]>(
    counterToEdit?.extras?.map((e) => e.name) || [],
  );
  const [error, setError] = useState("");

  const currentOffering = availableOfferings.find((o) => o.id === selectedId);
  const platformMenu = selectedId ? addOnMenus[selectedId] || [] : [];

  const handleOfferingChange = (newId: string) => {
    setSelectedId(newId);
    const offering = availableOfferings.find((o) => o.id === newId);
    setPrice(offering?.price || 50);
    const menu = addOnMenus[newId] || [];
    setSelectedItems(menu.map((m) => m.name));
    setExtras([]);
  };

  const toggleItem = (name: string) => {
    if (selectedItems.includes(name)) {
      if (selectedItems.length === 1 && extras.length === 0) {
        setError("Counter must offer at least one item or inclusion.");
        return;
      }
      setSelectedItems(selectedItems.filter((i) => i !== name));
    } else {
      setSelectedItems([...selectedItems, name]);
    }
    setError("");
  };

  const handleAddExtra = () => {
    const trimmed = extraInput.trim();
    if (!trimmed) return;
    if (extras.includes(trimmed) || selectedItems.includes(trimmed)) {
      setError("Item already in spread.");
      return;
    }
    setExtras([...extras, trimmed]);
    setExtraInput("");
    setError("");
  };

  const handleRemoveExtra = (idx: number) => {
    setExtras(extras.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) {
      setError("Please select a counter type.");
      return;
    }

    if (price === undefined || price < 0) {
      setError("Please enter a valid price.");
      return;
    }

    if (selectedItems.length === 0 && extras.length === 0) {
      setError("Please select or add at least one item.");
      return;
    }

    const counterObj: VendorCounter = {
      id: selectedId,
      price,
      items: selectedItems,
      extras: extras.map((name) => ({ name, diet: mode === "service" ? undefined : "veg" })),
    };

    onSave(counterObj);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="counter-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-card border border-cream-3 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-cream-2 pb-3">
          <h3 id="counter-modal-title" className="text-base font-bold text-ink">
            {counterToEdit
              ? `Edit ${mode === "service" ? "Hospitality Extra" : "Live Counter"}`
              : `Add ${mode === "service" ? "Hospitality Extra" : "Live Counter"}`}
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-control bg-red-50 p-2.5 text-xs text-red-700">
              ⚠️ {error}
            </div>
          )}

          {/* Counter/Service Type Selector */}
          <div>
            <label
              htmlFor="counterType"
              className="block text-xs font-bold uppercase tracking-wider text-ink"
            >
              {mode === "service" ? "Offering / Service" : "Live Counter Category"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <select
              id="counterType"
              value={selectedId}
              onChange={(e) => handleOfferingChange(e.target.value)}
              disabled={Boolean(counterToEdit)}
              className="mt-1 w-full rounded-control border border-cream-3 bg-white px-3.5 py-2.5 text-sm text-ink focus:border-maroon focus:outline-hidden min-h-[44px]"
            >
              {availableOfferings.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.icon} {o.name} {o.perPlate ? "(Per Plate)" : "(Flat Event Rate)"}
                </option>
              ))}
            </select>
          </div>

          {/* Pricing */}
          <div>
            <label
              htmlFor="counterPrice"
              className="block text-xs font-bold uppercase tracking-wider text-ink"
            >
              {currentOffering?.perPlate
                ? "Rate per Guest / Plate (₹)"
                : "Flat Event Fee (₹)"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-bold text-ink-soft">
                ₹
              </span>
              <input
                id="counterPrice"
                type="number"
                min={0}
                max={500000}
                value={price ?? ""}
                onChange={(e) =>
                  setPrice(parseInt(e.target.value, 10) || 0)
                }
                className="w-full rounded-control border border-cream-3 bg-cream-1/30 pl-8 pr-3 py-2 text-sm font-semibold text-ink focus:border-maroon focus:outline-hidden min-h-[44px]"
              />
            </div>
            <p className="mt-1 text-[11px] text-ink-soft">
              Platform baseline: ₹{currentOffering?.price}{" "}
              {currentOffering?.perPlate ? "/guest" : " flat"}
            </p>
          </div>

          {/* Included Items Checklist */}
          {platformMenu.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
                Included Delicacies / Inclusions
              </label>
              <div className="space-y-1.5 rounded-control border border-cream-2 bg-cream-1/30 p-3 max-h-48 overflow-y-auto">
                {platformMenu.map((item) => {
                  const isChecked = selectedItems.includes(item.name);
                  return (
                    <label
                      key={item.name}
                      className="flex items-center gap-2 text-xs text-ink cursor-pointer hover:bg-white p-1 rounded-control min-h-[32px]"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleItem(item.name)}
                        className="h-4 w-4 rounded-xs border-cream-3 text-maroon focus:ring-maroon"
                      />
                      <span className="font-medium">{item.name}</span>
                      {item.diet && (
                        <span
                          className={`text-[10px] font-bold ${
                            item.diet === "veg"
                              ? "text-emerald-700"
                              : "text-red-600"
                          }`}
                        >
                          ({item.diet})
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vendor Custom Extra Items */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
              Add Custom Spread Items / Specialties
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={extraInput}
                onChange={(e) => setExtraInput(e.target.value)}
                placeholder="e.g. Special Banarasi Masala, Extra Chutneys"
                className="flex-1 rounded-control border border-cream-3 bg-white px-3 py-2 text-xs text-ink focus:border-maroon focus:outline-hidden min-h-[44px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddExtra();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddExtra}
                className="min-h-[44px]"
              >
                Add
              </Button>
            </div>

            {extras.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {extras.map((ex, i) => (
                  <span
                    key={ex}
                    className="inline-flex items-center gap-1.5 rounded-pill bg-cream-2 px-2.5 py-1 text-xs text-ink"
                  >
                    <span>{ex}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExtra(i)}
                      className="text-ink-soft hover:text-red-600"
                      aria-label={`Remove ${ex}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
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
              {counterToEdit ? "Update Station" : "Add to Package"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
