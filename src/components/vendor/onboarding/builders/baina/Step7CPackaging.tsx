"use client";

import BuilderNav from "../common/BuilderNav";
import type { BainaPackagingStyle } from "@/lib/vendorMenus";
import { cn } from "@/components/ui/cn";
import { ContentCard, StepHeading } from "../../ui";

interface Step7CPackagingProps {
  packaging?: BainaPackagingStyle;
  onChangePackaging: (style: BainaPackagingStyle) => void;
  onBack: () => void;
  onFinishBaina: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

/** Handover: luxury packaging presentation styles. */
export const PACKAGING_STYLES: { id: BainaPackagingStyle; icon: string; title: string; blurb: string }[] = [
  { id: "velvet", icon: "👑", title: "Royal Velvet Finish", blurb: "Plush maroon velvet wrapped rigid board with gold foil debossing." },
  { id: "gold-foil", icon: "✨", title: "Golden Metallic Foil", blurb: "Shimmering golden metallic finish with intricate traditional motifs." },
  { id: "eco-kraft", icon: "🌿", title: "Eco-Friendly Kraft Board", blurb: "100% biodegradable natural kraft board with jute twine accents." },
  { id: "brocade", icon: "🥻", title: "Banarasi Brocade Silk", blurb: "Woven Banarasi silk fabric outer casing with zardozi borders." },
];

export default function Step7CPackaging({
  packaging = "velvet",
  onChangePackaging,
  onBack,
  onFinishBaina,
  onSaveDraft,
  saving = false,
}: Step7CPackagingProps) {
  return (
    <div className="animate-in fade-in duration-200">
      <StepHeading
        eyebrow="Baina Builder · Packaging Presentation"
        heading="Select luxury packaging presentation"
        subtext="Choose the signature packaging finish delivered to the wedding invitation hosts."
        mEyebrow="Box Styles"
        mHeading="Box styles"
        mSubtext={null}
      />

      <ContentCard>
        <div role="radiogroup" aria-label="Packaging style" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {PACKAGING_STYLES.map((st) => {
            const active = packaging === st.id;
            return (
              <button
                key={st.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChangePackaging(st.id)}
                className={cn(
                  "flex min-h-[64px] items-start gap-3 rounded-card border-2 p-3.5 text-left",
                  active ? "border-maroon bg-maroon/5" : "border-cream/70 bg-white hover:border-maroon/40",
                )}
              >
                <span className="text-2xl" aria-hidden>
                  {st.icon}
                </span>
                <span className="flex-1">
                  <span className="block text-[14px] font-bold text-ink">{st.title}</span>
                  <span className="hidden text-xs text-ink/60 sm:block">{st.blurb}</span>
                </span>
                {active && <span className="text-sm font-bold text-maroon">✓</span>}
              </button>
            );
          })}
        </div>
      </ContentCard>

      <BuilderNav onBack={onBack} onContinue={onFinishBaina} onSaveDraft={onSaveDraft} saving={saving} />
    </div>
  );
}
