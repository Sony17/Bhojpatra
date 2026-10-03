"use client";

import { useState } from "react";
import BuilderSectionHeader from "../common/BuilderSectionHeader";
import BuilderNav from "../common/BuilderNav";
import type { SingleStallConfig } from "@/lib/vendorMenus";
import { Button } from "@/components/ui";

interface Step6BStallSetupProps {
  stallConfig?: SingleStallConfig;
  onChangeStallConfig: (config: SingleStallConfig) => void;
  onBack: () => void;
  onFinishStall: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

const EQUIPMENT_OPTIONS = [
  { id: "Charcoal Sigdi", label: "Charcoal Sigdi / Clay Bhatti", icon: "🔥", desc: "Traditional open charcoal live grill for authentic smoke flavor." },
  { id: "Inverted Ulta Tawa", label: "Inverted Ulta Tawa", icon: "🍳", desc: "Convex iron dome tawa for paper-thin Rumali Rotis and crisp Galouti paranthas." },
  { id: "Buffet Warmers", label: "Stainless Buffet Chafing Warmers", icon: "🍲", desc: "Commercial roll-top chafing warmers maintaining steam-hot serving temp." },
  { id: "Live Induction Woks", label: "High-Flame Induction Woks", icon: "🥢", desc: "Rapid stir-fry woks for quick Hakka noodles and live Chinese tossing." },
  { id: "Cast Iron Dosa Plate", label: "Cast Iron Flat Top Tawa", icon: "🥞", desc: "Heavy seasoned griddle plate for crisp dosas, uttapams and tikkis." },
  { id: "Wood-Fired Portable Oven", label: "Portable Pizza / Bake Oven", icon: "🍕", desc: "Stone-deck compact bake oven for fresh blistering pizzas and calzones." },
];

const CUTLERY_OPTIONS = [
  { id: "Biodegradable Bagasse", label: "Eco-Friendly Bagasse Sugarcane", desc: "100% compostable heavy-duty bagasse pulp bowls, plates and wooden sporks.", icon: "🌱" },
  { id: "Areca Palm Leaf", label: "Artisanal Areca Palm Leaf Ware", desc: "Naturally shed pressed areca palm leaf plates with authentic rustic charm.", icon: "🍃" },
  { id: "Premium Melamine", label: "Heavyweight Ceramic Melamine", desc: "Matte-finish durable black/white melamine for high-turnover casual events.", icon: "🍽️" },
  { id: "Standard Chinaware", label: "Standard Glazed Ceramic Chinaware", desc: "Banquet-grade porcelain plates with stainless steel forks and spoons.", icon: "✨" },
];

export default function Step6BStallSetup({
  stallConfig = { categories: [] },
  onChangeStallConfig,
  onBack,
  onFinishStall,
  onSaveDraft,
  saving = false,
}: Step6BStallSetupProps) {
  const currentEquipment = stallConfig.equipment || [];
  const currentCutlery = stallConfig.cutlery || "Biodegradable Bagasse";
  const [customEquipment, setCustomEquipment] = useState("");

  const toggleEquipment = (id: string) => {
    let updated: string[];
    if (currentEquipment.includes(id)) {
      updated = currentEquipment.filter((item) => item !== id);
    } else {
      updated = [...currentEquipment, id];
    }
    onChangeStallConfig({
      ...stallConfig,
      equipment: updated,
    });
  };

  const handleAddCustomEquipment = () => {
    const trimmed = customEquipment.trim();
    if (!trimmed) return;
    if (currentEquipment.includes(trimmed)) {
      setCustomEquipment("");
      return;
    }
    onChangeStallConfig({
      ...stallConfig,
      equipment: [...currentEquipment, trimmed],
    });
    setCustomEquipment("");
  };

  const handleSelectCutlery = (id: string) => {
    onChangeStallConfig({
      ...stallConfig,
      cutlery: id,
    });
  };

  return (
    <div className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs">
      <BuilderSectionHeader
        badge="Section 6B"
        title="Stall Equipment & Service Cutlery"
        description="Declare on-site cooking apparatus required for live stall preparation and choose standard tableware provided with individual stall bookings."
        tip="Venue managers and hosts reference equipment requirements to arrange electrical points, gas lines, or designated outdoor sigdi zones."
      />

      <div className="mt-6 space-y-8">
        {/* On-site Equipment Requirements */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
              On-Site Cooking Equipment ({currentEquipment.length} selected)
            </h3>
            <span className="text-[11px] text-ink-soft">
              Check all apparatus your chefs operate on site
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {EQUIPMENT_OPTIONS.map((item) => {
              const isChecked = currentEquipment.includes(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => toggleEquipment(item.id)}
                  className={`flex items-start gap-3 rounded-card border p-3.5 transition-all cursor-pointer ${
                    isChecked
                      ? "border-maroon bg-cream-1/60 ring-1 ring-maroon/30 shadow-xs"
                      : "border-cream-3 bg-white hover:border-cream-3/80 hover:bg-cream-1/20"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="h-4.5 w-4.5 rounded-xs border-cream-3 text-maroon focus:ring-maroon cursor-pointer"
                      aria-label={item.label}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-ink text-xs">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-ink-soft leading-normal">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Equipment Adder */}
          <div className="flex gap-2 max-w-md pt-1">
            <input
              type="text"
              value={customEquipment}
              onChange={(e) => setCustomEquipment(e.target.value)}
              placeholder="+ Custom apparatus (e.g. 20L Copper Samovar)"
              className="flex-1 rounded-control border border-cream-3 bg-cream-1/30 px-3 py-1.5 text-xs text-ink placeholder:text-ink-soft/60 focus:border-maroon focus:outline-hidden min-h-[44px]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustomEquipment();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddCustomEquipment}
              className="min-h-[44px]"
            >
              Add Apparatus
            </Button>
          </div>
        </div>

        {/* Cutlery & Tableware Selection */}
        <div className="space-y-3 border-t border-cream-2 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
              Stall Cutlery & Disposables Inclusion
            </h3>
            <span className="text-[11px] text-ink-soft">
              Select standard cutlery provided
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CUTLERY_OPTIONS.map((opt) => {
              const isSelected = currentCutlery === opt.id;

              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelectCutlery(opt.id)}
                  className={`flex flex-col justify-between rounded-card border p-4 transition-all cursor-pointer ${
                    isSelected
                      ? "border-maroon bg-cream-1/50 ring-2 ring-maroon shadow-xs"
                      : "border-cream-3 bg-white hover:border-cream-3/80 hover:bg-cream-1/20"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl" aria-hidden="true">
                          {opt.icon}
                        </span>
                        <h4 className="font-bold text-ink text-xs">{opt.label}</h4>
                      </div>
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? "border-maroon bg-maroon text-white"
                            : "border-cream-3 bg-white"
                        }`}
                      >
                        {isSelected && <span className="text-[8px]">●</span>}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-ink-soft leading-relaxed">
                      {opt.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <BuilderNav
        onBack={onBack}
        onContinue={onFinishStall}
        onSaveDraft={onSaveDraft}
        saving={saving}
        continueLabel="Complete Single Stall Builder →"
      />
    </div>
  );
}
