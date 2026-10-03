"use client";

import { useState } from "react";
import type { RecognitionBadgeKey, VendorBadgesState, VendorCustomOffering } from "@/lib/vendorMenus";
import { cn } from "@/components/ui/cn";
import BadgeApplicationModal, { BADGE_DEFINITIONS } from "../components/BadgeApplicationModal";
import { CardTitle, ContentCard, FlowFooter, Pill, R, StepHeading } from "../ui";

export interface Step3Data {
  serviceCategories: string[];
  customOfferings: VendorCustomOffering[];
  cateringComponents?: {
    counters?: boolean;
    extras?: boolean;
    essentials?: boolean;
    addons?: boolean;
  };
  badges: VendorBadgesState;
}

interface Step3OfferingsProps {
  data: Step3Data;
  onChange: (updated: Partial<Step3Data>) => void;
  onBack: () => void;
  onFinishStep3: () => void;
  saving?: boolean;
}

type ServiceId = "full-catering" | "single-stall" | "baina-box";

const SERVICES: {
  id: ServiceId;
  icon: string;
  title: string;
  mTitle: string;
  blurb: string;
  mBlurb: string;
  bullets: string[];
}[] = [
  {
    id: "full-catering",
    icon: "🍲",
    title: "Feast Booking",
    mTitle: "Feast Booking",
    blurb:
      "Complete multi-course feasts (Silver & Gold) with tiered menus, defined dish allowances, and regional culinary heritage.",
    mBlurb: "Multi-course feasts (Silver & Gold) with tiered menus & allowances.",
    bullets: [
      "Multi-course menu builder",
      "Tier pricing (Silver Base / Gold Featured)",
      "Defined dish allowances per course",
      "Culinary specialization mapping",
    ],
  },
  {
    id: "single-stall",
    icon: "🍢",
    title: "Single Specialty Stall",
    mTitle: "Single Stall",
    blurb:
      "One dedicated food station (Biryani, Chaat, Tandoor, Dosa, Wok) with custom delicacies for any celebration.",
    mBlurb: "Dedicated food station for live parties and events.",
    bullets: [
      "Predefined or custom stall categories",
      "Individual item pricing",
      "Live tawa / sigdi setup",
      "Dedicated stall cutlery",
    ],
  },
  {
    id: "baina-box",
    icon: "🎁",
    title: "Baina Gifting Boxes",
    mTitle: "Baina Boxes",
    blurb:
      "Artisanal sweet hampers and wedding announcement invitation boxes delivered in luxury packaging.",
    mBlurb: "Artisanal sweet gift hampers & invitation boxes.",
    bullets: [
      "Box catalog with sweets contents",
      "½ kg, 1 kg & custom sizes",
      "Luxury packaging finishes",
      "Bulk minimum order rules",
    ],
  },
];

const COMPONENTS: {
  key: "counters" | "extras" | "essentials" | "addons";
  name: string;
  desc: string;
  mDesc: string;
}[] = [
  {
    key: "counters",
    name: "🍳 Live Counters",
    desc: "Interactive live cooking & beverage stations (Chaat, Tandoor, Wok, Pizza, Paan)",
    mDesc: "Interactive live cooking & beverage stations",
  },
  {
    key: "extras",
    name: "✨ Feast Extras",
    desc: "Welcome mocktails, evening hi-tea snacks & theme floral buffet decor",
    mDesc: "Welcome mocktails, hi-tea snacks & theme floral decor",
  },
  {
    key: "essentials",
    name: "🛡️ Essentials",
    desc: "Uniformed banquet stewards, bilingual food labels, handwash setup & waste crews",
    mDesc: "Uniformed banquet stewards, labels & waste crews",
  },
  {
    key: "addons",
    name: "🍽️ Add-ons",
    desc: "Tableware presentation packages (Base Disposables to Royal Gold/Silver)",
    mDesc: "Tableware presentation packages (A–D)",
  },
];

const BADGE_KEYS: RecognitionBadgeKey[] = ["verified", "icon", "heritage"];

export default function Step3Offerings({ data, onChange, onBack, onFinishStep3, saving = false }: Step3OfferingsProps) {
  const [error, setError] = useState("");
  const [badgeModal, setBadgeModal] = useState<RecognitionBadgeKey | null>(null);
  const selected = data.serviceCategories || [];
  const comps = data.cateringComponents || {};

  const toggleService = (id: ServiceId) => {
    onChange({ serviceCategories: selected.includes(id) ? selected.filter((c) => c !== id) : [...selected, id] });
    setError("");
  };

  const toggleComponent = (key: (typeof COMPONENTS)[number]["key"]) => {
    onChange({ cateringComponents: { ...comps, [key]: comps[key] === false } });
  };

  const handleContinue = () => {
    if (!selected.some((s) => SERVICES.some((x) => x.id === s))) {
      setError("Please select at least one service offering to proceed.");
      return;
    }
    onFinishStep3();
  };

  return (
    <div className="animate-in fade-in duration-200">
      <StepHeading
        eyebrow="Commercial Service Offerings"
        heading="What services do you offer?"
        subtext="Select the services that match your business. The onboarding flow will adapt and open dedicated builders for each selection."
        mEyebrow="Commercial Offerings"
        mHeading="What do you offer?"
        mSubtext="Select the services that match your business."
      />

      <ContentCard>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {SERVICES.map((svc) => {
            const active = selected.includes(svc.id);
            return (
              <div
                key={svc.id}
                className={cn(
                  "relative flex flex-col gap-2 rounded-card border-2 p-4 transition-colors",
                  active ? "border-maroon bg-maroon/5" : "border-cream/60 bg-white",
                )}
              >
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleService(svc.id)}
                  className="flex min-h-[44px] items-start gap-3 text-left"
                >
                  <span className="text-2xl" aria-hidden>
                    {svc.icon}
                  </span>
                  <span className="flex-1">
                    <span className="block text-[15px] font-bold text-ink">
                      <R d={svc.title} m={svc.mTitle} />
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-ink/60">
                      <R d={svc.blurb} m={svc.mBlurb} />
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                      active ? "border-maroon bg-maroon text-cream" : "border-cream text-transparent",
                    )}
                    aria-hidden
                  >
                    ✓
                  </span>
                </button>
                <ul className="hidden space-y-1 pl-1 text-xs text-ink/70 sm:block">
                  {svc.bullets.map((b) => (
                    <li key={b} className="flex gap-1.5">
                      <span className="text-maroon">•</span>
                      {b}
                    </li>
                  ))}
                </ul>

                {svc.id === "full-catering" && active && (
                  <div className="mt-2 rounded-control border border-cream bg-white p-3">
                    <div className="text-[13px] font-bold text-ink">🍲 Select Feast Components</div>
                    <div className="mb-2 text-[11px] text-ink/60">
                      <R d="Choose which components you provide for feast bookings:" m="Select which components you provide:" />
                    </div>
                    <div className="space-y-2">
                      {COMPONENTS.map((c) => {
                        const on = comps[c.key] !== false;
                        return (
                          <button
                            key={c.key}
                            type="button"
                            role="checkbox"
                            aria-checked={on}
                            onClick={() => toggleComponent(c.key)}
                            className={cn(
                              "flex min-h-[44px] w-full items-start gap-2.5 rounded-control border p-2 text-left",
                              on ? "border-maroon/40 bg-maroon/5" : "border-cream/60",
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] font-bold",
                                on ? "border-maroon bg-maroon text-cream" : "border-cream text-transparent",
                              )}
                              aria-hidden
                            >
                              ✓
                            </span>
                            <span>
                              <span className="block text-xs font-bold text-ink">{c.name}</span>
                              <span className="block text-[11px] text-ink/60">
                                <R d={c.desc} m={c.mDesc} />
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {error && <p className="mt-3 text-xs font-semibold text-maroon">⚠️ {error}</p>}
      </ContentCard>

      {/* Badges & Recognition (Optional) */}
      <ContentCard>
        <CardTitle badge="Optional">
          <span aria-hidden>🛡️</span> Badges & Recognition
        </CardTitle>
        <p className="-mt-2 mb-4 text-[11px] text-ink/50">
          <R
            d="Apply for Bhojpatra recognition badges to highlight your kitchen's standards, heritage, and verified trust to customers from day one."
            m="Apply for Bhojpatra recognition badges to highlight your kitchen's standards, heritage, and verified trust."
          />
        </p>
        <div className="space-y-2.5">
          {BADGE_KEYS.map((key) => {
            const meta = BADGE_DEFINITIONS[key];
            const granted = data.badges?.granted?.includes(key);
            const applied = data.badges?.applied?.includes(key);
            return (
              <div
                key={key}
                className="flex flex-col gap-3 rounded-control border border-cream/70 bg-cream/10 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden>
                    {meta.icon}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-bold text-ink">{meta.title}</span>
                      <Pill tone="cream">{meta.badgeTag}</Pill>
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink/60">{meta.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBadgeModal(key)}
                  className={cn(
                    "min-h-[44px] shrink-0 rounded-full px-4 text-xs font-bold",
                    granted || applied ? "border border-maroon/40 text-maroon" : "bg-maroon text-cream",
                  )}
                >
                  {granted ? "✓ Granted (View)" : applied ? "✓ Application Submitted (View)" : "Apply for Badge"}
                </button>
              </div>
            );
          })}
        </div>
      </ContentCard>

      <BadgeApplicationModal
        badgeKey={badgeModal}
        badgesState={data.badges}
        onClose={() => setBadgeModal(null)}
        onSuccess={(badges) => onChange({ badges })}
      />

      <FlowFooter onBack={onBack} onContinue={handleContinue} saving={saving} />
    </div>
  );
}
