"use client";

import { useState } from "react";
import type { VendorCustomOffering } from "@/lib/vendorMenus";
import CustomOfferingModal from "../components/CustomOfferingModal";
import { Button } from "@/components/ui";

export interface Step3Data {
  serviceCategories: string[];
  customOfferings: VendorCustomOffering[];
}

interface Step3OfferingsProps {
  data: Step3Data;
  onChange: (updated: Partial<Step3Data>) => void;
  onBack: () => void;
  onFinishStep3: () => void;
  saving?: boolean;
}

interface PrimaryServiceCard {
  id: "full-catering" | "single-stall" | "baina-box";
  title: string;
  hindiTitle: string;
  badge: string;
  icon: string;
  description: string;
  highlights: string[];
}

const PRIMARY_SERVICES: PrimaryServiceCard[] = [
  {
    id: "full-catering",
    title: "Complete Feast Catering",
    hindiTitle: "फुल कैटरिंग एवं दावत",
    badge: "Core Service",
    icon: "🍲",
    description:
      "Full-scale multi-course catering with starters, live counters, main courses, and desserts for weddings and large gatherings.",
    highlights: [
      "Silver, Gold & Platinum package tiers",
      "Per-plate pricing for 50 to 1,000+ guests",
      "Complete course structure & service crew",
    ],
  },
  {
    id: "single-stall",
    title: "Single Stall Speciality",
    hindiTitle: "सिंगल स्टॉल",
    badge: "Food Stalls",
    icon: "🍢",
    description:
      "Dedicated standalone counters (Live Chaat, Kebab Station, Mocktail Bar, Tandoor) booked as standalone highlights or party add-ons.",
    highlights: [
      "Standalone live counter setup",
      "Fixed event fee or minimum pax guarantee",
      "Operates independently alongside other vendors",
    ],
  },
  {
    id: "baina-box",
    title: "Artisanal Baina Boxes",
    hindiTitle: "बैना बॉक्स एवं उपहार",
    badge: "Mithai & Gifting",
    icon: "🎁",
    description:
      "Heirloom sweets, dry fruits, and handcrafted packaging boxes ordered for wedding invitations, tilak ceremonies, and festive gifting.",
    highlights: [
      "½ kg, 1 kg, and artisanal gift box sizes",
      "Pre-order lead times and bulk orders",
      "Custom branding & celebratory card inserts",
    ],
  },
];

const FEAST_COMPONENTS = [
  {
    title: "Live Food Counters",
    icon: "🍳",
    desc: "Chaat, kebabs, pasta, and interactive chef stations made-to-order.",
  },
  {
    title: "Hospitality & Welcome",
    icon: "🍹",
    desc: "Welcome drinks, mocktail bars, fruit counters, and arrival hospitality.",
  },
  {
    title: "Service Crew Essentials",
    icon: "👨‍🍳",
    desc: "Captains, uniformed servers, table attendants, and dish stewards.",
  },
  {
    title: "Tableware & Chinaware",
    icon: "🍽️",
    desc: "Melamine, Standard Chinaware, Premium Gold-rim, or Ultra Royal cutlery tiers.",
  },
];

export default function Step3Offerings({
  data,
  onChange,
  onBack,
  onFinishStep3,
  saving = false,
}: Step3OfferingsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");

  const toggleService = (id: string) => {
    const current = data.serviceCategories || [];
    if (current.includes(id)) {
      if (current.length === 1) {
        setError("You must select at least one primary service offering.");
        return;
      }
      onChange({ serviceCategories: current.filter((c) => c !== id) });
    } else {
      onChange({ serviceCategories: [...current, id] });
    }
    setError("");
  };

  const handleAddCustom = (newOffering: VendorCustomOffering) => {
    onChange({
      customOfferings: [...(data.customOfferings || []), newOffering],
    });
  };

  const handleRemoveCustom = (id: string) => {
    onChange({
      customOfferings: (data.customOfferings || []).filter((o) => o.id !== id),
    });
  };

  const hasFullCatering = data.serviceCategories?.includes("full-catering");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.serviceCategories || data.serviceCategories.length === 0) {
      setError("Please select at least one service category.");
      return;
    }
    setError("");
    onFinishStep3();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-200">
      {/* ── Section A: Primary Services ── */}
      <section className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs space-y-5">
        <div>
          <h3 className="text-base font-bold text-ink sm:text-lg">
            1. Select Your Core Service Lines
          </h3>
          <p className="text-xs text-ink-soft mt-0.5">
            Choose all offerings your team provides on Bhojpatra. You can offer full dawat catering, individual live stalls, or gifting boxes.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PRIMARY_SERVICES.map((svc) => {
            const isSelected = data.serviceCategories?.includes(svc.id);
            return (
              <div
                key={svc.id}
                onClick={() => toggleService(svc.id)}
                className={`relative flex flex-col justify-between rounded-card border-2 p-5 text-left cursor-pointer transition-all ${
                  isSelected
                    ? "border-maroon bg-cream/40 shadow-xs ring-1 ring-maroon/20"
                    : "border-cream-3 bg-white/70 hover:border-cream-4 hover:bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-3xl">{svc.icon}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${
                        isSelected
                          ? "bg-maroon text-cream"
                          : "bg-cream-2 text-ink-soft"
                      }`}
                    >
                      {svc.badge}
                    </span>
                  </div>

                  <h4 className="mt-3 text-base font-bold text-ink">{svc.title}</h4>
                  <p className="text-xs text-ink-soft/70">{svc.hindiTitle}</p>
                  <p className="mt-2 text-xs text-ink-soft leading-relaxed">
                    {svc.description}
                  </p>

                  <ul className="mt-3 space-y-1.5 pt-3 border-t border-cream-2/70 text-[11px] text-ink-soft">
                    {svc.highlights.map((h, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="text-maroon font-bold">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-cream-2/70 flex items-center justify-between text-xs">
                  <span className={isSelected ? "font-semibold text-maroon" : "text-ink-soft"}>
                    {isSelected ? "Active Service" : "Click to Enable"}
                  </span>
                  <div
                    className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? "border-maroon bg-maroon text-white"
                        : "border-cream-3 bg-white"
                    }`}
                  >
                    {isSelected && <span className="text-[11px]">✓</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      </section>

      {/* ── Section B: Feast Sub-Components Preview (if Catering selected) ── */}
      {hasFullCatering && (
        <section className="rounded-card border border-cream-3 bg-cream/30 p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-maroon/10 px-2.5 py-0.5 text-xs font-semibold text-maroon mb-1">
                Feast Sub-Components Included
              </div>
              <h3 className="text-base font-bold text-ink">
                Full Catering Package Capabilities
              </h3>
              <p className="text-xs text-ink-soft mt-0.5">
                Bhojpatra catering packages incorporate these core experiences. Detailed dish selections and courses will be configured in Stage 4 (Menu Builder).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {FEAST_COMPONENTS.map((item, idx) => (
              <div
                key={idx}
                className="rounded-control border border-cream-3 bg-white p-3.5 shadow-xs"
              >
                <div className="text-2xl mb-1">{item.icon}</div>
                <h4 className="text-xs font-bold text-ink">{item.title}</h4>
                <p className="mt-1 text-[11px] text-ink-soft leading-normal">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Section C: Custom Offerings Adder ── */}
      <section className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-ink sm:text-lg">
            2. Custom Stations & Signature Offerings
            </h3>
            <p className="text-xs text-ink-soft mt-0.5">
              Highlight unique cooking stations, artisanal counters, or specialty services that set your brand apart.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setModalOpen(true)}
          >
            + Add Custom Station
          </Button>
        </div>

        {(!data.customOfferings || data.customOfferings.length === 0) ? (
          <div className="rounded-control border border-dashed border-cream-3 p-6 text-center text-xs text-ink-soft bg-cream/20">
            <span className="text-2xl block mb-1">✨</span>
            <p className="font-semibold text-ink">No custom stations added yet</p>
            <p className="mt-0.5 text-ink-soft">
              Click &quot;Add Custom Station&quot; above to declare bespoke stations like Sheermal Counter, Live Sigri, or Artisanal Mocktails.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {data.customOfferings.map((offering) => (
              <div
                key={offering.id}
                className="flex items-start justify-between gap-3 rounded-control border border-cream-3 bg-cream/30 p-3.5"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-2xl">{offering.icon || "🍢"}</span>
                  <div>
                    <h4 className="text-xs font-bold text-ink">{offering.title}</h4>
                    <p className="mt-1 text-[11px] text-ink-soft leading-relaxed">
                      {offering.blurb}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveCustom(offering.id)}
                  className="text-xs text-ink-soft hover:text-red-600 font-bold p-1"
                  aria-label="Remove custom offering"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Custom offering modal */}
      <CustomOfferingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleAddCustom}
      />

      {/* ── Wizard Actions ── */}
      <div className="sticky bottom-0 z-20 flex items-center justify-between rounded-card border border-cream-3 bg-white/95 p-4 shadow-md backdrop-blur-md">
        <Button type="button" variant="secondary" size="lg" onClick={onBack}>
          ← Back to KYC
        </Button>
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? "Saving..." : "Continue to Service Builders →"}
        </Button>
      </div>
    </form>
  );
}
