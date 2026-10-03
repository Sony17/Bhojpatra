"use client";

import BuilderNav from "../common/BuilderNav";
import type { BainaPackagingStyle } from "@/lib/vendorMenus";
import { StepHeading } from "../../ui";

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
    <div>
      <StepHeading
        eyebrow="Baina Builder · Packaging Presentation"
        heading="Select luxury packaging presentation"
        subtext="Choose the signature packaging finish delivered to the wedding invitation hosts."
        mEyebrow="Box Styles"
        mHeading="Box styles"
        mSubtext={null}
      />

      <div className="content-card">
        <div className="form-grid-2" role="radiogroup" aria-label="Packaging style">
          {PACKAGING_STYLES.map((st) => {
            const active = packaging === st.id;
            return (
              <div
                key={st.id}
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                data-package-style={st.id}
                className={`offering-card packaging-card${active ? " active" : ""}`}
                onClick={() => onChangePackaging(st.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChangePackaging(st.id);
                  }
                  if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const i = PACKAGING_STYLES.findIndex((p) => p.id === st.id);
                    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
                    const next = PACKAGING_STYLES[(i + step + PACKAGING_STYLES.length) % PACKAGING_STYLES.length];
                    onChangePackaging(next.id);
                    const group = e.currentTarget.parentElement;
                    requestAnimationFrame(() =>
                      group?.querySelector<HTMLElement>(`[data-package-style="${next.id}"]`)?.focus(),
                    );
                  }
                }}
              >
                <div style={{ fontSize: 24 }} aria-hidden>
                  {st.icon}
                </div>
                <div className="offering-title">{st.title}</div>
                <div className="offering-blurb">{st.blurb}</div>
              </div>
            );
          })}
        </div>
      </div>

      <BuilderNav onBack={onBack} onContinue={onFinishBaina} onSaveDraft={onSaveDraft} saving={saving} />
    </div>
  );
}
