"use client";

import BuilderSectionHeader from "../common/BuilderSectionHeader";
import BuilderNav from "../common/BuilderNav";
import type { VendorEssentialService } from "@/lib/vendorMenus";

interface Step5GServiceCrewProps {
  essentialService?: VendorEssentialService;
  onChangeEssentialService: (service: VendorEssentialService) => void;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

const SERVICE_CREW_TOGGLES = [
  {
    id: "Uniformed Stewards",
    title: "Uniformed Stewards & Servers",
    description: "Well-groomed banquet staff in coordinated Bhojpatra / vendor uniforms providing polite table and buffet assistance.",
    icon: "🧑‍🍳",
  },
  {
    id: "Buffet Tables & Linens",
    title: "Buffet Tables & Premium Linens",
    description: "Commercial stainless chafing station tables dressed with clean table runners, skirting and decorative frills.",
    icon: "🪑",
  },
  {
    id: "Acrylic Food Labels",
    title: "Acrylic Food & Allergen Labels",
    description: "Clear standing acrylic cards with bilingual dish names and green/red vegetarian dietary markers at every food station.",
    icon: "🏷️",
  },
  {
    id: "Handwash Station",
    title: "Mobile Handwash Station",
    description: "Dedicated sanitary water counter with touch-free liquid soap dispensers and disposable paper towels.",
    icon: "🧼",
  },
  {
    id: "Waste Bins",
    title: "Eco-Lined Waste Bins & Segregation",
    description: "Dual wet and dry commercial waste bins placed discreetly to keep dining and lawn premises impeccably clean.",
    icon: "🗑️",
  },
  {
    id: "Hygiene Crew",
    title: "Dedicated Table Clearing & Hygiene Crew",
    description: "Continuous floor rounds collecting used plates, sanitizing tables, and maintaining immaculate hall presentation.",
    icon: "🧹",
  },
];

export default function Step5GServiceCrew({
  essentialService = { perGuest: 0, includes: [] },
  onChangeEssentialService,
  onBack,
  onContinue,
  onSaveDraft,
  saving = false,
}: Step5GServiceCrewProps) {
  const currentIncludes = essentialService.includes || [];

  const toggleInclude = (title: string) => {
    let updated: string[];
    if (currentIncludes.includes(title)) {
      updated = currentIncludes.filter((item) => item !== title);
    } else {
      updated = [...currentIncludes, title];
    }
    onChangeEssentialService({
      ...essentialService,
      includes: updated,
    });
  };

  const handleRateChange = (rate: number) => {
    onChangeEssentialService({
      ...essentialService,
      perGuest: Math.max(0, rate || 0),
    });
  };

  return (
    <div className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs">
      <BuilderSectionHeader
        badge="Section 5G"
        title="Service Crew & Banquet Essentials"
        description="Select standard setup provisions included with your catering contract. Clear service expectations guarantee 5-star host reviews and seamless event execution."
        tip="These items map directly to your Essential Service contract, signaling professional operations to corporate and wedding clients."
      />

      <div className="mt-6 space-y-6">
        {/* Per-Guest Crew Rate (Optional / 0 = Included) */}
        <div className="rounded-card border border-cream-2 bg-cream-1/30 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <label
                htmlFor="crewRate"
                className="block text-xs font-bold uppercase tracking-wider text-ink"
              >
                Service Crew Supplement (₹/guest)
              </label>
              <p className="text-xs text-ink-soft mt-0.5">
                Keep ₹0 if standard crew is bundled into your Silver/Gold package rates.
              </p>
            </div>
            <div className="relative w-36">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-bold text-ink-soft">
                ₹
              </span>
              <input
                id="crewRate"
                type="number"
                min={0}
                max={500}
                value={essentialService.perGuest}
                onChange={(e) =>
                  handleRateChange(parseInt(e.target.value, 10) || 0)
                }
                className="w-full rounded-control border border-cream-3 bg-white pl-8 pr-3 py-2 text-sm font-bold text-ink focus:border-maroon focus:outline-hidden min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Toggles Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
            Standard Provisions Checklist
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SERVICE_CREW_TOGGLES.map((item) => {
              const isChecked = currentIncludes.includes(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => toggleInclude(item.id)}
                  className={`flex items-start gap-3.5 rounded-card border p-4 transition-all cursor-pointer ${
                    isChecked
                      ? "border-maroon bg-cream-1/60 ring-1 ring-maroon/30 shadow-xs"
                      : "border-cream-3 bg-white hover:border-cream-3/80 hover:bg-cream-1/20"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by parent div click
                      className="h-5 w-5 rounded-xs border-cream-3 text-maroon focus:ring-maroon cursor-pointer"
                      aria-label={item.title}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-ink text-sm">
                      <span aria-hidden="true">{item.icon}</span>
                      <span>{item.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft leading-relaxed">
                      {item.description}
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
        onContinue={onContinue}
        onSaveDraft={onSaveDraft}
        saving={saving}
        continueLabel="Continue to Tableware Add-ons →"
      />
    </div>
  );
}
