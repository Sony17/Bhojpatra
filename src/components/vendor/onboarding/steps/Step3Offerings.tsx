"use client";

import { useState, type KeyboardEvent } from "react";
import type { RecognitionBadgeKey, VendorBadgesState, VendorCustomOffering } from "@/lib/vendorMenus";
import { cn } from "@/components/ui/cn";
import BadgeApplicationModal, { BADGE_DEFINITIONS, BadgeReqItems } from "../components/BadgeApplicationModal";
import { ContentCard, FlowFooter, R, StepHeading } from "../ui";

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

/** Enter / Space activate a div-based (role=checkbox) card, like a button. */
const onActivateKey = (fn: () => void) => (e: KeyboardEvent<HTMLElement>) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

export default function Step3Offerings({ data, onChange, onBack, onFinishStep3, saving = false }: Step3OfferingsProps) {
  const [error, setError] = useState("");
  const [badgeModal, setBadgeModal] = useState<RecognitionBadgeKey | null>(null);
  const [expanded, setExpanded] = useState<Partial<Record<RecognitionBadgeKey, boolean>>>({});
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
        <div className="offering-cards-grid">
          {SERVICES.map((svc) => {
            const active = selected.includes(svc.id);
            return (
              <div
                key={svc.id}
                className={cn("offering-card", active && "active")}
                data-offering-key={svc.id}
                role="checkbox"
                aria-checked={active}
                aria-label={svc.title}
                tabIndex={0}
                onClick={() => toggleService(svc.id)}
                onKeyDown={(e) => {
                  if (e.target === e.currentTarget) onActivateKey(() => toggleService(svc.id))(e);
                }}
              >
                <div className="offering-header">
                  <span className="offering-icon" aria-hidden>
                    {svc.icon}
                  </span>
                  <div className="offering-checkbox" aria-hidden>
                    {active ? "✓" : ""}
                  </div>
                </div>
                <div className="offering-title">
                  <R d={svc.title} m={svc.mTitle} />
                </div>
                <div className="offering-blurb">
                  <R d={svc.blurb} m={svc.mBlurb} />
                </div>
                <ul className="offering-features vob-d">
                  {svc.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>

                {svc.id === "full-catering" && (
                  <div
                    className="feast-components-section"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <div className="feast-components-header">
                      <div className="feast-components-title">
                        <span aria-hidden>🍲</span> Select Feast Components
                      </div>
                      <div className="feast-components-subtext">
                        <R
                          d="Choose which components you provide for feast bookings:"
                          m="Select which components you provide:"
                        />
                      </div>
                    </div>
                    <div className="feast-components-list">
                      {COMPONENTS.map((c) => {
                        const on = comps[c.key] !== false;
                        return (
                          <div
                            key={c.key}
                            className={cn("feast-component-item", on && "active")}
                            data-component-key={c.key}
                            role="checkbox"
                            aria-checked={on}
                            tabIndex={active ? 0 : -1}
                            onClick={() => toggleComponent(c.key)}
                            onKeyDown={onActivateKey(() => toggleComponent(c.key))}
                          >
                            <div className="component-checkbox" aria-hidden>
                              ✓
                            </div>
                            <div className="component-info">
                              <div className="component-name">{c.name}</div>
                              <div className="component-desc">
                                <R d={c.desc} m={c.mDesc} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {error && (
          <span className="vob-field-error" role="alert">
            ⚠️ {error}
          </span>
        )}

        {/* Bhojpatra Recognition Badges */}
        <div className="mockup-badges-section">
          <div className="badges-section-header">
            <div className="card-title-row" style={{ marginBottom: 4 }}>
              <span className="card-title" style={{ fontSize: 15 }}>
                <span aria-hidden>🛡️</span> Badges &amp; Recognition
              </span>
              <span className="vob-badge">Optional</span>
            </div>
            <p className="field-hint" style={{ marginBottom: 14 }}>
              <R
                d="Apply for Bhojpatra recognition badges to highlight your kitchen's standards, heritage, and verified trust to customers from day one."
                m="Apply for Bhojpatra recognition badges to highlight your kitchen's standards, heritage, and verified trust."
              />
            </p>
          </div>
          <div className="badge-cards-list">
            {BADGE_KEYS.map((key) => {
              const meta = BADGE_DEFINITIONS[key];
              const granted = Boolean(data.badges?.granted?.includes(key));
              const applied = Boolean(data.badges?.applied?.includes(key));
              const isOpen = Boolean(expanded[key]);
              return (
                <div key={key} className={cn("mockup-badge-card", (granted || applied) && "is-submitted")}>
                  <div className="badge-card-main">
                    <div className="badge-card-identity">
                      <div className="badge-avatar-icon" aria-hidden>
                        {meta.icon}
                      </div>
                      <div className="badge-card-info">
                        <div className="badge-card-title-row">
                          <h4 className="badge-card-title">{meta.title}</h4>
                          {granted ? (
                            <span className="badge-status-pill submitted">✓ Badge Granted</span>
                          ) : applied ? (
                            <span className="badge-status-pill submitted">✓ Application Submitted · Applied</span>
                          ) : null}
                        </div>
                        <div className="badge-tagline">{meta.badgeTag}</div>
                        <div className="badge-description">{meta.description}</div>
                      </div>
                    </div>
                    <div className="badge-card-actions">
                      <button
                        type="button"
                        className={cn("btn-badge-action", granted || applied ? "submitted" : "unapplied")}
                        onClick={() => setBadgeModal(key)}
                      >
                        {granted
                          ? "✓ Badge Granted (View)"
                          : applied
                            ? "✓ Application Submitted (View)"
                            : "Apply for Badge"}
                      </button>
                    </div>
                  </div>

                  <div className="badge-requirements-accordion">
                    <button
                      type="button"
                      className="btn-badge-toggle-req"
                      aria-expanded={isOpen}
                      onClick={() => setExpanded((p) => ({ ...p, [key]: !p[key] }))}
                    >
                      <span>{isOpen ? "Hide Requirements ▲" : "View Requirements ▼"}</span>
                    </button>
                    {isOpen && (
                      <div className="badge-req-dropdown">
                        <div
                          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}
                        >
                          <strong
                            style={{
                              fontSize: 11.5,
                              color: "var(--color-black-80)",
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            Requirements
                          </strong>
                          <span style={{ fontSize: 11, color: "var(--color-black-60)" }}>{meta.reqCount[0]}</span>
                        </div>
                        <BadgeReqItems items={meta.criteriaList} />
                        {meta.plusPoints && (
                          <>
                            <div className="badge-plus-points-header">
                              <strong
                                style={{
                                  fontSize: 11.5,
                                  color: "var(--color-black-80)",
                                  textTransform: "uppercase",
                                  letterSpacing: 0.5,
                                }}
                              >
                                Optional Plus Points (6 Criteria)
                              </strong>
                              <span className="vob-badge" style={{ fontSize: 10 }}>
                                Non-Mandatory
                              </span>
                            </div>
                            <div style={{ marginTop: 6 }}>
                              <BadgeReqItems items={meta.plusPoints} plus />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ContentCard>

      <BadgeApplicationModal
        key={badgeModal ?? "closed"}
        badgeKey={badgeModal}
        badgesState={data.badges}
        onClose={() => setBadgeModal(null)}
        onSuccess={(badges) => onChange({ badges })}
      />

      <FlowFooter onBack={onBack} onContinue={handleContinue} saving={saving} />
    </div>
  );
}
