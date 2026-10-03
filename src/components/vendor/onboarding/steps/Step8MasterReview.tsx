"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { OnboardingState } from "../VendorOnboarding";
import { vendorOfferings, addOnMenus, addOns } from "@/lib/data";
import { DIET_NAMES } from "../VendorContextHeader";
import { BADGE_DEFINITIONS } from "../components/BadgeApplicationModal";
import { COURSES_INFO } from "../builders/catering/Step5CCourseHierarchy";
import { isExtraOffering, isLiveCounterOffering } from "../builders/catering/CounterModal";
import { ESSENTIAL_CHIPS, hasEssential } from "../builders/catering/Step5GServiceCrew";
import { TABLEWARE_PACKAGES } from "../builders/catering/Step5HTablewareAddons";
import { stallCategoryName, stallDishes } from "../builders/stall/Step6AStallWorkspace";
import { PACKAGING_STYLES } from "../builders/baina/Step7CPackaging";
import { DietMark, FlowFooter, StepHeading } from "../ui";
import type { RecognitionBadgeKey } from "@/lib/vendorMenus";

/** Where an "Edit ✎" link should land. */
export type ReviewJump =
  | { step: "details" | "offerings" }
  | { step: "catering"; section: string }
  | { step: "stall"; section: string }
  | { step: "baina"; section: string };

interface Step8Props {
  data: OnboardingState;
  onEdit: (to: ReviewJump) => void;
  onBack: () => void;
  onSubmit: () => void;
  onPreview: () => void;
  saving?: boolean;
}

function Section({ icon, title, edit, onEdit, children }: { icon: string; title: string; edit: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="review-section-card">
      <div className="review-section-header">
        <div className="review-section-title">
          <span aria-hidden>{icon}</span>
          <span>{title}</span>
        </div>
        <button type="button" className="btn-review-edit" onClick={onEdit}>
          {edit}
        </button>
      </div>
      {children}
    </div>
  );
}

/* Inline styles below are copied from the prototype's renderMasterReview()
   markup, with off-palette values mapped onto the brand tokens. */
const LBL: CSSProperties = { fontSize: 11, color: "var(--color-black-60)" };
const ROW_HEAD: CSSProperties = { fontSize: 12, fontWeight: 700, color: "var(--color-black-80)", display: "flex", alignItems: "center", gap: 4 };
const CATALOG_ROW: CSSProperties = {
  background: "var(--color-cream-10)",
  border: "1px solid var(--color-cream-30)",
  borderRadius: "var(--radius-control)",
  padding: "8px 10px",
  display: "flex",
  gap: 10,
  alignItems: "center",
};
const DASHED_TOP: CSSProperties = { paddingTop: 10, borderTop: "1px dashed var(--color-cream-30)" };
const STALL_PILL: CSSProperties = {
  borderColor: "var(--color-cream)",
  background: "var(--bg-cream-tint)",
  fontWeight: 700,
  color: "var(--color-black)",
  fontSize: 11.5,
};
const NONE_PILL = (
  <span className="review-pill" style={{ color: "var(--color-black-40)" }}>
    None configured
  </span>
);

/** Prototype review copy for each essentials chip (same order as ESSENTIAL_CHIPS). */
const ESSENTIAL_REVIEW_LABEL: Record<string, string> = {
  "Uniformed Stewards & Service Captain": "Uniformed Stewards & Captain",
  "Designer Buffet Tables & Linens": "Designer Buffet Tables & Linens",
  "Acrylic Bilingual Food Labels": "Acrylic Bilingual Food Labels",
  "Handwash Station & Sanitizers": "Handwash & Sanitizers",
  "Dustbins & Waste Management Crew": "Dustbins & Waste Crew",
  "Continuous Cleaning & Hygiene Crew": "Continuous Cleaning Crew",
};

export default function Step8MasterReview({ data, onEdit, onBack, onSubmit, onPreview, saving }: Step8Props) {
  const hasFeast = data.serviceCategories.includes("full-catering");
  const hasStall = data.serviceCategories.includes("single-stall");
  const hasBaina = data.serviceCategories.includes("baina-box");
  const comps = data.cateringComponents || {};
  const totalDishes = data.menu
    .filter((s) => COURSES_INFO.some((c) => c.id === s.categoryId))
    .reduce((n, s) => n + s.items.length, 0);
  const tableware = TABLEWARE_PACKAGES.find((t) => t.id === data.cutleryTier);
  const counterRow = (id: string, price?: number, items?: string[], extras?: { name: string }[]) => {
    const o = vendorOfferings.find((x) => x.id === id);
    const a = addOns.find((x) => x.id === id);
    const p = price ?? o?.price ?? 0;
    const names = [...(items ?? (addOnMenus[id] || []).map((m) => m.name)), ...(extras || []).map((e) => e.name)];
    const catName = o?.name ?? id;
    const photo = a?.image;
    return (
      <div key={id} style={CATALOG_ROW}>
        {photo ? (
          <Image
            src={photo}
            alt={catName}
            width={40}
            height={40}
            unoptimized
            style={{ width: 40, height: 40, borderRadius: 4, objectFit: "cover", flexShrink: 0 }}
          />
        ) : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: "var(--color-black)" }}>{catName}</span>
            <span style={{ fontWeight: 800, fontSize: 11.5, color: "var(--color-red)", whiteSpace: "nowrap" }}>
              {a?.perPlate === false ? `Flat ₹${p.toLocaleString("en-IN")}` : `+₹${p} / plate`}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--color-black-80)", marginTop: 2 }}>{names.join(" · ")}</div>
        </div>
      </div>
    );
  };
  const live = data.counters.filter((c) => isLiveCounterOffering(c.id));
  const extras = data.counters.filter((c) => isExtraOffering(c.id));
  const badgeKeys: RecognitionBadgeKey[] = ["verified", "icon", "heritage"];
  const appliedCount = badgeKeys.filter((k) => data.badges.applied?.includes(k) || data.badges.granted?.includes(k)).length;
  const showComponents = comps.counters !== false || comps.extras !== false || comps.essentials !== false || comps.addons !== false;

  return (
    <div className="animate-in fade-in duration-200">
      <StepHeading
        eyebrow="Consolidated Master Review"
        heading="Review & submit your vendor registration"
        subtext="Review all configured service offerings, menus, and business details before final submission."
        mEyebrow="Review"
        mHeading="Master review"
        mSubtext={null}
      />

      <div className="review-master-container">
        {/* 1. Vendor Identity & Operations Review */}
        <Section icon="🏛️" title="Vendor Identity & Kitchen Operations" edit="Edit Details ✎" onEdit={() => onEdit({ step: "details" })}>
          <div className="form-grid-2">
            <div>
              <p style={LBL}>Registered Business / Brand Name</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: "var(--color-black)" }}>{data.businessName || "—"}</p>
            </div>
            <div>
              <p style={LBL}>Account Holder (From Signup)</p>
              <p style={{ fontSize: 13, fontWeight: 700 }}>
                {data.ownerName}
                {data.phone ? ` · +91 ${data.phone}` : ""}{" "}
                <span
                  className="badge"
                  style={{ background: "var(--color-cream)", color: "var(--color-red)", fontSize: 10, padding: "2px 6px", borderRadius: 9999 }}
                >
                  ✓ Linked
                </span>
              </p>
              {data.email && <p style={{ ...LBL, marginTop: 2 }}>{data.email}</p>}
            </div>
            <div>
              <p style={LBL}>City & State</p>
              <p style={{ fontSize: 13, fontWeight: 700 }}>{[data.city, data.state].filter(Boolean).join(", ") || "—"}</p>
            </div>
            <div>
              <p style={LBL}>Coverage Cities</p>
              <p style={{ fontSize: 12, fontWeight: 600 }}>{data.serviceCities.join(", ") || "—"}</p>
            </div>
          </div>
          <div className="form-grid-2" style={{ marginTop: 10, ...DASHED_TOP }}>
            <div>
              <p style={LBL}>Dietary Offering (Food Classification)</p>
              <p style={{ fontSize: 13, fontWeight: 800, color: "var(--color-black)" }}>
                {data.dietaryOffering ? DIET_NAMES[data.dietaryOffering] : "Not selected"}
              </p>
            </div>
            <div>
              <p style={LBL}>Primary Cuisines</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--color-red)" }}>{data.cuisines.join(" · ") || "—"}</p>
            </div>
          </div>
        </Section>

        {/* 2. Feast Catering Review */}
        {hasFeast && (
          <Section icon="🍲" title={`Feast Booking: ${data.packageName}`} edit="Edit Feast ✎" onEdit={() => onEdit({ step: "catering", section: "5D" })}>
            <div style={{ marginBottom: 14 }}>
              {data.about && <p style={{ fontSize: 12, color: "var(--color-black-80)", lineHeight: 1.4 }}>{data.about}</p>}
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <span className="review-pill">
                  <strong>Best For:</strong> {data.bestFor.join(", ")}
                </span>
                <span className="review-pill">
                  <strong>Guest Range:</strong> {data.minPax}–{data.maxCapacity} Pax
                </span>
                <span className="review-pill">
                  <strong>Lead Notice:</strong> {data.leadHours} Hours
                </span>
                <span className="review-pill" style={{ color: "var(--color-red)" }}>
                  <strong>Starting From:</strong> ₹{data.priceFrom}/plate
                </span>
              </div>
            </div>

            {/* Sequential Tiers Configured */}
            <div className="review-subitem-group" style={DASHED_TOP}>
              <div className="review-subitem-title">Configured Feast Tiers & Specialization</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    fontSize: 12,
                    background: "var(--color-cream-10)",
                    border: "1px solid var(--color-cream-30)",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-control)",
                  }}
                >
                  <strong>Silver Tier (Bhoj City Base)</strong> · ₹{data.priceFrom}/plate
                  <div style={{ color: "var(--color-black-60)", fontSize: 11, marginTop: 2 }}>
                    Allowances: Starters ({data.silverQuotas.starters}), Main ({data.silverQuotas.main}), Breads ({data.silverQuotas.breads}), Sweets (
                    {data.silverQuotas.sweets}) · <em>Standard base package (no specialization)</em>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    background: "var(--bg-cream-tint)",
                    border: "1px solid var(--color-red-25)",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-control)",
                  }}
                >
                  <strong style={{ color: "var(--color-red)" }}>Gold Tier (Bhoj Signature Featured)</strong> · ₹{data.goldRate}/plate
                  <div style={{ color: "var(--color-black-80)", fontSize: 11, marginTop: 2 }}>
                    Specialization: <strong>{data.goldSpecialization || "—"}</strong>
                  </div>
                  <div style={{ color: "var(--color-black-60)", fontSize: 11, marginTop: 2 }}>
                    Allowances: Starters ({data.goldQuotas.starters}), Main ({data.goldQuotas.main}), Breads ({data.goldQuotas.breads}), Sweets (
                    {data.goldQuotas.sweets})
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--color-black-40)", padding: "4px 8px" }}>
                  Platinum Luxury · <em>Coming Soon</em>
                </div>
              </div>
            </div>

            {/* Itemized Courses & Dishes */}
            <div className="review-subitem-group" style={{ marginTop: 12 }}>
              <div className="review-subitem-title">Itemized Menu Courses ({totalDishes} Dishes Published)</div>
              {COURSES_INFO.map((c) => {
                const items = data.menu.find((s) => s.categoryId === c.id)?.items || [];
                return (
                  <div key={c.id} style={{ marginBottom: 8 }}>
                    <div style={ROW_HEAD}>
                      <span aria-hidden>{c.icon}</span> <span>{c.name} ({items.length}):</span>
                    </div>
                    <div className="review-pills-row" style={{ marginTop: 4 }}>
                      {items.map((it) => (
                        <span key={it.name} className="review-pill">
                          <DietMark diet={it.diet} />
                          {it.name}
                          <small style={{ color: "var(--color-black-40)" }}>({(it.tiers?.length ? it.tiers : ["Silver", "Gold"]).join("/")})</small>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Feast Inclusions: Live Counters, Extras, Essentials, Add-ons */}
            {showComponents && (
              <div className="review-subitem-group" style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--color-cream-30)" }}>
                <div className="review-subitem-title">Selected Feast Components</div>

                {comps.counters !== false && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={ROW_HEAD}>
                      <span aria-hidden>🍳</span> <span>Live Counters ({live.length}):</span>
                    </div>
                    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                      {live.length ? live.map((c) => counterRow(c.id, c.price, c.items, c.extras)) : NONE_PILL}
                    </div>
                  </div>
                )}

                {comps.extras !== false && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={ROW_HEAD}>
                      <span aria-hidden>✨</span> <span>Feast Hospitality Extras ({extras.length}):</span>
                    </div>
                    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                      {extras.length ? extras.map((c) => counterRow(c.id, c.price, c.items, c.extras)) : NONE_PILL}
                    </div>
                  </div>
                )}

                {comps.essentials !== false && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={ROW_HEAD}>
                      <span aria-hidden>🧑‍🍳</span> <span>Service Crew & Hygiene Essentials:</span>
                    </div>
                    <div className="review-pills-row" style={{ marginTop: 4 }}>
                      {ESSENTIAL_CHIPS.filter((ch) => hasEssential(data.essentialService.includes || [], ch)).map((ch) => (
                        <span key={ch.value} className="service-pill">
                          ✓ {ESSENTIAL_REVIEW_LABEL[ch.value] ?? ch.value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {comps.addons !== false && (
                  <div>
                    <div style={ROW_HEAD}>
                      <span aria-hidden>🍽️</span> <span>Tableware Presentation Add-on:</span>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12 }}>
                      <span className="review-pill" style={{ borderColor: "var(--color-cream)", fontWeight: 700 }}>
                        {tableware ? `${tableware.badge} · ${tableware.name} (${tableware.rate})` : "Standard Tableware"}
                      </span>
                      {tableware && (
                        <span style={{ fontSize: 11, color: "var(--color-black-60)", marginLeft: 6 }}>{tableware.features.join(", ")}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Section>
        )}

        {/* 3. Single Stall Review */}
        {hasStall && (
          <Section icon="🍢" title="Single Stall: Menus & Stations" edit="Edit Stall Menus ✎" onEdit={() => onEdit({ step: "stall", section: "6A" })}>
            <div className="review-subitem-group">
              <div className="review-subitem-title">Stall Configurations ({data.stallConfig.categories.length} Categories Configured)</div>
              {data.stallConfig.categories.length ? (
                data.stallConfig.categories.map((cat) => {
                  const items = stallDishes(data.stallConfig, data.menu, cat);
                  const pr = data.stallConfig.categoryPricing?.[cat];
                  return (
                    <div
                      key={cat}
                      className="stall-review-cat-card"
                      style={{
                        marginBottom: 12,
                        background: "var(--color-cream-10)",
                        border: "1px solid var(--color-cream-30)",
                        borderRadius: "var(--radius-control)",
                        padding: "12px 14px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--color-black)" }}>📂 {stallCategoryName(cat)} Stall</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-red)" }}>
                          {items.length} dish{items.length === 1 ? "" : "es"}
                        </span>
                      </div>

                      {/* Independent Stall Pricing & Pax Guarantee */}
                      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                        <span className="review-pill" style={STALL_PILL}>
                          🏷️ Fixed Package Rate: ₹{pr?.fixedPerPlate ?? 0} / plate
                        </span>
                        <span className="review-pill" style={STALL_PILL}>
                          👥 Min Guarantee: {pr?.minPaxGuarantee ?? 0} Pax
                        </span>
                      </div>

                      {/* Dishes in this stall */}
                      {items.length > 0 ? (
                        <div className="review-pills-row" style={{ marginTop: 6 }}>
                          {items.map((it) => (
                            <span key={it.name} className="review-pill" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <DietMark diet={it.diet} />
                              <span style={{ fontWeight: 600 }}>{it.name}</span>
                              {it.price ? <strong style={{ color: "var(--color-red)" }}>₹{it.price}/plate</strong> : null}
                              {it.desc ? (
                                <small
                                  style={{
                                    color: "var(--color-black-60)",
                                    maxWidth: 180,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  ({it.desc})
                                </small>
                              ) : null}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--color-black-40)", fontStyle: "italic" }}>No dishes entered yet</span>
                      )}
                    </div>
                  );
                })
              ) : (
                <p style={{ fontSize: 12, color: "var(--color-black-40)" }}>No stall categories selected.</p>
              )}
            </div>

            <div className="review-subitem-group" style={{ paddingTop: 8, borderTop: "1px dashed var(--color-cream-30)" }}>
              <div className="review-subitem-title">On-Site Equipment & Stall Cutlery</div>
              <div className="review-pills-row">
                {(data.stallConfig.equipment || []).map((eq) => (
                  <span key={eq} className="service-pill">
                    {eq}
                  </span>
                ))}
                {data.stallConfig.cutlery && (
                  <span className="review-pill" style={{ fontSize: 11 }}>
                    🍽️ {data.stallConfig.cutlery}
                  </span>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* 4. Baina Review */}
        {hasBaina && (
          <Section
            icon="🎁"
            title={`Baina Gifting: ${data.bainaDetails.studioName || data.businessName}`}
            edit="Edit Baina ✎"
            onEdit={() => onEdit({ step: "baina", section: "7B" })}
          >
            <div style={{ marginBottom: 12 }}>
              {data.bainaDetails.story && <p style={{ fontSize: 12, color: "var(--color-black-80)" }}>{data.bainaDetails.story}</p>}
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <span className="review-pill">
                  <strong>Min Order:</strong> {data.bainaDetails.minOrderBoxes ?? 25} Boxes
                </span>
                <span className="review-pill">
                  <strong>Lead Notice:</strong> {data.bainaDetails.leadDays ?? 3} Days
                </span>
                <span className="review-pill">
                  <strong>Packaging Style:</strong>{" "}
                  {(PACKAGING_STYLES.find((s) => s.id === data.bainaDetails.packaging)?.title ?? "—").toUpperCase()}
                </span>
              </div>
            </div>

            <div className="review-subitem-group">
              <div className="review-subitem-title">Artisanal Gifting Box Catalog ({data.bainaBoxes.length} Hampers)</div>
              {data.bainaBoxes.map((b) => (
                <div key={b.name} style={{ marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid var(--color-cream-10)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{b.name}</div>
                  <p style={{ fontSize: 11, color: "var(--color-black-60)" }}>{b.contents}</p>
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <span className="review-pill">½ kg: ₹{b.price}</span>
                    {b.price1kg ? <span className="review-pill">1 kg: ₹{b.price1kg}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 5. Custom Commercial Offerings Review */}
        {data.customOfferings.length > 0 && (
          <Section icon="✨" title={`Custom Service Offerings (${data.customOfferings.length})`} edit="Edit Offerings ✎" onEdit={() => onEdit({ step: "offerings" })}>
            <div className="form-grid-2">
              {data.customOfferings.map((c) => (
                <div key={c.id} style={CATALOG_ROW}>
                  <div>
                    <div style={LBL}>Custom Service Offering</div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{c.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--color-black-60)", marginTop: 2 }}>{c.blurb}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 6. Bhojpatra Badges & Recognition Review */}
        <Section icon="🛡️" title={`Bhojpatra Recognition Badges (${appliedCount} Applied)`} edit="Manage Badges ✎" onEdit={() => onEdit({ step: "offerings" })}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {badgeKeys.map((k) => {
              const meta = BADGE_DEFINITIONS[k];
              const granted = data.badges.granted?.includes(k);
              const applied = data.badges.applied?.includes(k);
              return (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    background: "var(--color-cream-10)",
                    border: "1px solid var(--color-cream-30)",
                    borderRadius: "var(--radius-control)",
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }} aria-hidden>
                      {meta.icon}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-black)" }}>{meta.title}</div>
                      <div style={{ fontSize: 11.5, color: "var(--color-black-60)" }}>{meta.badgeTag}</div>
                    </div>
                  </div>
                  <div>
                    {granted ? (
                      <span className="badge-status-pill submitted">✓ Granted</span>
                    ) : applied ? (
                      <span className="badge-status-pill submitted">✓ Submitted (In Review)</span>
                    ) : (
                      <span style={{ fontSize: 11.5, color: "var(--color-black-40)" }}>Not Applied (Optional)</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button type="button" className="btn-back" onClick={onPreview}>
            Preview Storefront 👁️
          </button>
        </div>
      </div>

      <FlowFooter onBack={onBack} onContinue={onSubmit} saving={saving} />
    </div>
  );
}
