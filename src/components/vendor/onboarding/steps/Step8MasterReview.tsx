"use client";

import type { ReactNode } from "react";
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
    <section className="mb-4 rounded-card border border-cream/60 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3 border-b border-cream/50 pb-2.5">
        <h3 className="[font-family:inherit] normal-case flex items-center gap-2 text-[15px] font-bold text-ink">
          <span aria-hidden>{icon}</span>
          <span>{title}</span>
        </h3>
        <button
          type="button"
          onClick={onEdit}
          className="min-h-[36px] shrink-0 rounded-full border border-maroon/25 bg-maroon/5 px-3 text-[11px] font-bold text-maroon"
        >
          {edit}
        </button>
      </div>
      {children}
    </section>
  );
}

const Stat = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="rounded-control bg-cream/15 px-3 py-2">
    <div className="text-[10px] font-bold uppercase tracking-wide text-ink/50">{label}</div>
    <div className="text-[13px] font-bold text-ink">{value || "—"}</div>
  </div>
);
const RPill = ({ children, red }: { children: ReactNode; red?: boolean }) => (
  <span className={`inline-flex items-center gap-1 rounded-md border border-cream/70 bg-cream/15 px-2 py-0.5 text-[11px] font-semibold ${red ? "text-maroon" : "text-ink/80"}`}>
    {children}
  </span>
);
const SubTitle = ({ children }: { children: ReactNode }) => (
  <div className="mb-2 mt-3 text-[11px] font-bold uppercase tracking-wide text-ink/60">{children}</div>
);

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
    return (
      <div key={id} className="flex items-start gap-2 rounded-control border border-cream/60 bg-cream/10 px-3 py-2">
        <span aria-hidden>{o?.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-bold text-ink">{o?.name ?? id}</span>
            <span className="whitespace-nowrap text-[11px] font-bold text-maroon">
              {a?.perPlate === false ? `Flat ₹${p.toLocaleString("en-IN")}` : `+₹${p} / plate`}
            </span>
          </div>
          <div className="text-[11px] text-ink/60">{names.join(" · ")}</div>
        </div>
      </div>
    );
  };
  const live = data.counters.filter((c) => isLiveCounterOffering(c.id));
  const extras = data.counters.filter((c) => isExtraOffering(c.id));
  const badgeKeys: RecognitionBadgeKey[] = ["verified", "icon", "heritage"];
  const appliedCount = badgeKeys.filter((k) => data.badges.applied?.includes(k) || data.badges.granted?.includes(k)).length;

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

      {/* 1. Identity */}
      <Section icon="🏛️" title="Vendor Identity & Kitchen Operations" edit="Edit Details ✎" onEdit={() => onEdit({ step: "details" })}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Stat label="Registered Business / Brand Name" value={data.businessName} />
          <Stat
            label="Account Holder (From Signup)"
            value={
              <span>
                {data.ownerName} {data.phone ? `· +91 ${data.phone}` : ""} <span className="text-[10px] text-maroon">✓ Linked</span>
              </span>
            }
          />
          <Stat label="City & State" value={[data.city, data.state].filter(Boolean).join(", ")} />
          <Stat label="Coverage Cities" value={data.serviceCities.join(", ")} />
          <Stat label="Dietary Offering (Food Classification)" value={data.dietaryOffering ? DIET_NAMES[data.dietaryOffering] : ""} />
          <Stat label="Primary Cuisines" value={data.cuisines.join(", ")} />
        </div>
      </Section>

      {/* 2. Feast */}
      {hasFeast && (
        <Section icon="🍲" title={`Feast Booking: ${data.packageName}`} edit="Edit Feast ✎" onEdit={() => onEdit({ step: "catering", section: "5D" })}>
          {data.about && <p className="text-xs leading-relaxed text-ink/80">{data.about}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <RPill>
              <strong>Best For:</strong> {data.bestFor.join(", ")}
            </RPill>
            <RPill>
              <strong>Guest Range:</strong> {data.minPax}–{data.maxCapacity} Pax
            </RPill>
            <RPill>
              <strong>Lead Notice:</strong> {data.leadHours} Hours
            </RPill>
            <RPill red>
              <strong>Starting From:</strong> ₹{data.priceFrom}/plate
            </RPill>
          </div>

          <SubTitle>Configured Feast Tiers & Specialization</SubTitle>
          <div className="space-y-2">
            <div className="rounded-control border border-cream/60 bg-cream/10 px-3 py-2 text-xs">
              <strong>Silver Tier (Bhoj City Base)</strong> · ₹{data.priceFrom}/plate
              <div className="mt-0.5 text-[11px] text-ink/60">
                Allowances: Starters ({data.silverQuotas.starters}), Main ({data.silverQuotas.main}), Breads ({data.silverQuotas.breads}), Sweets ({data.silverQuotas.sweets})
              </div>
              <div className="text-[11px] text-ink/60">Standard base package (no specialization)</div>
            </div>
            <div className="rounded-control border border-maroon/40 bg-maroon/5 px-3 py-2 text-xs">
              <strong className="text-maroon">Gold Tier (Bhoj Signature Featured)</strong> · ₹{data.goldRate}/plate
              <div className="mt-0.5 text-[11px] text-ink/80">
                Specialization: <strong>{data.goldSpecialization || "—"}</strong>
              </div>
              <div className="text-[11px] text-ink/60">
                Allowances: Starters ({data.goldQuotas.starters}), Main ({data.goldQuotas.main}), Breads ({data.goldQuotas.breads}), Sweets ({data.goldQuotas.sweets})
              </div>
            </div>
            <div className="px-1 text-[11px] text-ink/40">
              Platinum Luxury · <em>Coming Soon</em>
            </div>
          </div>

          <SubTitle>Itemized Menu Courses ({totalDishes} Dishes Published)</SubTitle>
          <div className="space-y-2">
            {COURSES_INFO.map((c) => {
              const items = data.menu.find((s) => s.categoryId === c.id)?.items || [];
              return (
                <div key={c.id}>
                  <div className="text-xs font-bold text-ink/80">
                    {c.icon} {c.name} ({items.length}):
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {items.map((it) => (
                      <RPill key={it.name}>
                        <DietMark diet={it.diet} />
                        {it.name}
                        <small className="text-ink/40">({(it.tiers?.length ? it.tiers : ["Silver", "Gold"]).join("/")})</small>
                      </RPill>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {(comps.counters !== false || comps.extras !== false || comps.essentials !== false || comps.addons !== false) && (
            <div className="mt-3 border-t border-dashed border-cream pt-3">
              <SubTitle>Selected Feast Components</SubTitle>
              {comps.counters !== false && (
                <div className="mb-3">
                  <div className="mb-1 text-xs font-bold text-ink/80">🍳 Live Counters ({live.length}):</div>
                  <div className="space-y-1.5">
                    {live.length ? live.map((c) => counterRow(c.id, c.price, c.items, c.extras)) : <RPill>None configured</RPill>}
                  </div>
                </div>
              )}
              {comps.extras !== false && (
                <div className="mb-3">
                  <div className="mb-1 text-xs font-bold text-ink/80">✨ Feast Hospitality Extras ({extras.length}):</div>
                  <div className="space-y-1.5">
                    {extras.length ? extras.map((c) => counterRow(c.id, c.price, c.items, c.extras)) : <RPill>None configured</RPill>}
                  </div>
                </div>
              )}
              {comps.essentials !== false && (
                <div className="mb-3">
                  <div className="mb-1 text-xs font-bold text-ink/80">🧑‍🍳 Service Crew & Hygiene Essentials:</div>
                  <div className="flex flex-wrap gap-1">
                    {ESSENTIAL_CHIPS.filter((ch) => hasEssential(data.essentialService.includes || [], ch)).map((ch) => (
                      <RPill key={ch.value}>✓ {ch.value}</RPill>
                    ))}
                  </div>
                </div>
              )}
              {comps.addons !== false && (
                <div>
                  <div className="mb-1 text-xs font-bold text-ink/80">🍽️ Tableware Presentation Add-on:</div>
                  <RPill>
                    <strong>
                      {tableware ? `${tableware.badge} · ${tableware.name} (${tableware.rate})` : "Standard Tableware"}
                    </strong>
                  </RPill>
                </div>
              )}
            </div>
          )}
        </Section>
      )}

      {/* 3. Stall */}
      {hasStall && (
        <Section icon="🍢" title="Single Stall: Menus & Stations" edit="Edit Stall Menus ✎" onEdit={() => onEdit({ step: "stall", section: "6A" })}>
          <SubTitle>Stall Configurations ({data.stallConfig.categories.length} Categories Configured)</SubTitle>
          {data.stallConfig.categories.length ? (
            <div className="space-y-2">
              {data.stallConfig.categories.map((cat) => {
                const items = stallDishes(data.stallConfig, data.menu, cat);
                const pr = data.stallConfig.categoryPricing?.[cat];
                return (
                  <div key={cat} className="rounded-control border border-cream/60 bg-cream/10 px-3 py-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-xs font-bold text-ink">📂 {stallCategoryName(cat)} Stall</span>
                      <span className="text-[11px] font-bold text-maroon">
                        ₹{pr?.fixedPerPlate ?? 0}/plate · Min {pr?.minPaxGuarantee ?? 0} Pax
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {items.length ? (
                        items.map((it) => (
                          <RPill key={it.name}>
                            <DietMark diet={it.diet} />
                            {it.name}
                            {it.price ? <small className="text-maroon">₹{it.price}</small> : null}
                          </RPill>
                        ))
                      ) : (
                        <span className="text-[11px] text-ink/40">No dishes entered yet</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-ink/40">No stall categories selected.</p>
          )}
          <SubTitle>On-Site Equipment & Stall Cutlery</SubTitle>
          <div className="flex flex-wrap gap-1">
            {(data.stallConfig.equipment || []).map((eq) => (
              <RPill key={eq}>{eq}</RPill>
            ))}
            {data.stallConfig.cutlery && <RPill>🍽️ {data.stallConfig.cutlery}</RPill>}
          </div>
        </Section>
      )}

      {/* 4. Baina */}
      {hasBaina && (
        <Section
          icon="🎁"
          title={`Baina Gifting: ${data.bainaDetails.studioName || data.businessName}`}
          edit="Edit Baina ✎"
          onEdit={() => onEdit({ step: "baina", section: "7B" })}
        >
          {data.bainaDetails.story && <p className="text-xs text-ink/80">{data.bainaDetails.story}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <RPill>
              <strong>Min Order:</strong> {data.bainaDetails.minOrderBoxes ?? 25} Boxes
            </RPill>
            <RPill>
              <strong>Lead Notice:</strong> {data.bainaDetails.leadDays ?? 3} Days
            </RPill>
            <RPill>
              <strong>Packaging Style:</strong> {PACKAGING_STYLES.find((s) => s.id === data.bainaDetails.packaging)?.title ?? "—"}
            </RPill>
          </div>
          <SubTitle>Artisanal Gifting Box Catalog ({data.bainaBoxes.length} Hampers)</SubTitle>
          <div className="space-y-2">
            {data.bainaBoxes.map((b) => (
              <div key={b.name} className="border-b border-cream/40 pb-2">
                <div className="text-xs font-bold text-ink">{b.name}</div>
                <p className="text-[11px] text-ink/60">{b.contents}</p>
                <div className="mt-1 flex gap-1">
                  <RPill>½ kg: ₹{b.price}</RPill>
                  {b.price1kg ? <RPill>1 kg: ₹{b.price1kg}</RPill> : null}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 5. Custom offerings (only when the vendor has any from earlier drafts) */}
      {data.customOfferings.length > 0 && (
        <Section icon="✨" title={`Custom Service Offerings (${data.customOfferings.length})`} edit="Edit Offerings ✎" onEdit={() => onEdit({ step: "offerings" })}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.customOfferings.map((c) => (
              <Stat key={c.id} label="Custom Service Offering" value={<span>{c.title}<span className="block text-[11px] font-normal text-ink/60">{c.blurb}</span></span>} />
            ))}
          </div>
        </Section>
      )}

      {/* 6. Badges */}
      <Section icon="🛡️" title={`Bhojpatra Recognition Badges (${appliedCount} Applied)`} edit="Manage Badges ✎" onEdit={() => onEdit({ step: "offerings" })}>
        <div className="space-y-2">
          {badgeKeys.map((k) => {
            const meta = BADGE_DEFINITIONS[k];
            const granted = data.badges.granted?.includes(k);
            const applied = data.badges.applied?.includes(k);
            return (
              <div key={k} className="flex items-center justify-between gap-3 rounded-control border border-cream/60 bg-cream/10 px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl" aria-hidden>
                    {meta.icon}
                  </span>
                  <div>
                    <div className="text-[13px] font-bold text-ink">{meta.title}</div>
                    <div className="text-[11px] text-ink/60">{meta.badgeTag}</div>
                  </div>
                </div>
                <span className="text-right text-[11px] font-semibold">
                  {granted ? (
                    <span className="text-maroon">✓ Granted</span>
                  ) : applied ? (
                    <span className="text-maroon">✓ Submitted (In Review)</span>
                  ) : (
                    <span className="text-ink/40">Not Applied (Optional)</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <div className="mb-2 flex justify-center">
        <button type="button" onClick={onPreview} className="min-h-[44px] rounded-full border border-cream px-5 text-[13px] font-bold text-ink/80">
          Preview Storefront 👁️
        </button>
      </div>

      <FlowFooter onBack={onBack} onContinue={onSubmit} saving={saving} />
    </div>
  );
}
