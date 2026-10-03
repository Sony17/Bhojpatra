"use client";

import { useState } from "react";
import BuilderSectionHeader from "../common/BuilderSectionHeader";
import BuilderNav from "../common/BuilderNav";
import CounterModal from "./CounterModal";
import type { VendorCounter } from "@/lib/vendorMenus";
import { vendorOfferings } from "@/lib/data";
import { Button } from "@/components/ui";

interface Step5ELiveCountersProps {
  counters: VendorCounter[];
  onChangeCounters: (counters: VendorCounter[]) => void;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

export default function Step5ELiveCounters({
  counters,
  onChangeCounters,
  onBack,
  onContinue,
  onSaveDraft,
  saving = false,
}: Step5ELiveCountersProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [counterToEdit, setCounterToEdit] = useState<VendorCounter | null>(null);

  // Filter only food/live cooking counters (category !== "service")
  const liveFoodCounters = counters.filter((c) => {
    const offering = vendorOfferings.find((o) => o.id === c.id);
    return !offering || offering.category !== "service";
  });

  const handleOpenAdd = () => {
    setCounterToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (counter: VendorCounter) => {
    setCounterToEdit(counter);
    setModalOpen(true);
  };

  const handleSaveCounter = (counter: VendorCounter) => {
    const existingIndex = counters.findIndex((c) => c.id === counter.id);
    if (existingIndex !== -1) {
      const updated = [...counters];
      updated[existingIndex] = counter;
      onChangeCounters(updated);
    } else {
      onChangeCounters([...counters, counter]);
    }
  };

  const handleRemoveCounter = (id: string) => {
    onChangeCounters(counters.filter((c) => c.id !== id));
  };

  return (
    <div className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs">
      <BuilderSectionHeader
        badge="Section 5E"
        title="Live Food Cooking Counters"
        description="Configure interactive cooking stations prepared hot and fresh in front of guests (e.g. Chaat street-food, Live Tandoor, Wood-fired Pizza, Indo-Chinese Wok, Live Jalebi & Desserts)."
        tip="Live stations can be priced as an optional add-on per plate or bundled into high-tier catering packages."
      />

      <div className="mt-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-ink-soft">
            You currently have{" "}
            <strong className="text-ink">{liveFoodCounters.length} live cooking stations</strong>{" "}
            configured.
          </p>
          <Button
            type="button"
            size="md"
            onClick={handleOpenAdd}
            className="min-h-[44px] shrink-0"
          >
            + Add Live Counter
          </Button>
        </div>

        {liveFoodCounters.length === 0 ? (
          <div className="rounded-card border-2 border-dashed border-cream-3 p-8 text-center bg-cream-1/20">
            <span className="text-3xl" aria-hidden="true">
              🔥
            </span>
            <h4 className="mt-2 text-sm font-bold text-ink">
              No live cooking counters configured
            </h4>
            <p className="mt-1 text-xs text-ink-soft max-w-md mx-auto">
              Live stations create dramatic visual excitement at Indian weddings and receptions. Add counters like Chaat, Live Tandoor, or Fresh Paan.
            </p>
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleOpenAdd}
                className="min-h-[44px]"
              >
                + Add First Live Station
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {liveFoodCounters.map((counter) => {
              const offering = vendorOfferings.find((o) => o.id === counter.id);
              const name = offering?.name || counter.id;
              const icon = offering?.icon || "🍳";
              const price = counter.price ?? offering?.price ?? 0;
              const itemsCount =
                (counter.items?.length || 0) + (counter.extras?.length || 0);

              return (
                <div
                  key={counter.id}
                  className="flex flex-col justify-between rounded-card border border-cream-3 bg-white p-4 shadow-xs transition-all hover:border-maroon/40"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-control bg-cream-2 text-xl">
                          {icon}
                        </span>
                        <div>
                          <h4 className="font-bold text-ink text-sm">{name}</h4>
                          <span className="text-xs font-semibold text-maroon">
                            +₹{price}/plate
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-ink-soft">
                      <span className="font-medium text-ink">
                        {itemsCount} items in spread:
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(counter.items || []).slice(0, 3).map((item) => (
                          <span
                            key={item}
                            className="rounded-control bg-cream-1 px-2 py-0.5 text-[11px] text-ink"
                          >
                            {item}
                          </span>
                        ))}
                        {(counter.extras || []).slice(0, 2).map((extra) => (
                          <span
                            key={extra.name}
                            className="rounded-control bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] text-amber-900"
                          >
                            ★ {extra.name}
                          </span>
                        ))}
                        {itemsCount > 5 && (
                          <span className="text-[10px] text-ink-soft self-center">
                            +{itemsCount - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-cream-2 pt-3">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(counter)}
                      className="rounded-control border border-cream-3 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-cream-1 min-h-[36px]"
                    >
                      Edit Station
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveCounter(counter.id)}
                      className="rounded-control border border-cream-3 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 min-h-[36px]"
                      title="Remove counter"
                      aria-label={`Remove ${name} counter`}
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

      <CounterModal
        isOpen={modalOpen}
        counterToEdit={counterToEdit}
        mode="counter"
        onClose={() => setModalOpen(false)}
        onSave={handleSaveCounter}
      />

      <BuilderNav
        onBack={onBack}
        onContinue={onContinue}
        onSaveDraft={onSaveDraft}
        saving={saving}
        continueLabel="Continue to Hospitality Extras →"
      />
    </div>
  );
}
