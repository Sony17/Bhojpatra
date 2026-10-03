"use client";

import BuilderSectionHeader from "../common/BuilderSectionHeader";
import BuilderNav from "../common/BuilderNav";
import type { BainaPackagingStyle } from "@/lib/vendorMenus";

interface Step7CPackagingProps {
  packaging?: BainaPackagingStyle;
  onChangePackaging: (style: BainaPackagingStyle) => void;
  onBack: () => void;
  onFinishBaina: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

const PACKAGING_STYLES: {
  id: BainaPackagingStyle;
  title: string;
  subtitle: string;
  description: string;
  attributes: string[];
  swatch: string;
  icon: string;
}[] = [
  {
    id: "velvet",
    title: "Royal Velvet Casing",
    subtitle: "Plush Heritage Box",
    description: "Rigid handmade board upholstered in rich jewel-toned micro-velvet (Emerald Green or Deep Crimson) with gold magnetic clasp and embossed crest.",
    attributes: [
      "Magnetic flap closure",
      "Satin ribbon pull tabs",
      "Gold debossed monograms",
      "Food-grade metallic liner cups",
    ],
    swatch: "from-rose-900 via-rose-950 to-neutral-900 text-rose-100",
    icon: "👑",
  },
  {
    id: "gold-foil",
    title: "Golden Foil Embossed",
    subtitle: "Festive Luxury Box",
    description: "Heavy 450 GSM rigid kappa board adorned with 24-karat gold hot-foil stamping featuring traditional Mughal floral jaali patterns.",
    attributes: [
      "Metallic gold hot-foil stamping",
      "Scratch-resistant velvet matte lamination",
      "Individual compartments with clear cover",
      "Festive seal band",
    ],
    swatch: "from-amber-600 via-amber-700 to-yellow-900 text-amber-100",
    icon: "✨",
  },
  {
    id: "eco-kraft",
    title: "Artisanal Eco Kraft",
    subtitle: "Sustainable Botanical",
    description: "100% recycled unbleached kraft paper board wrapped in handmade textured seeded paper, tied with raw jute twines and botanical wax seals.",
    attributes: [
      "100% Biodegradable & Compostable",
      "Handmade seed paper sleeve",
      "Raw jute twine & wax seal motif",
      "Plant-based soybean inks",
    ],
    swatch: "from-stone-700 via-amber-900/80 to-stone-900 text-stone-100",
    icon: "🌱",
  },
  {
    id: "brocade",
    title: "Banarasi Brocade Fabric",
    subtitle: "Varanasi Loom Casing",
    description: "Authentic woven Banarasi silk brocade fabric casing with golden zari threads, inspired by traditional Varanasi bridal heirlooms.",
    attributes: [
      "Authentic woven Banarasi zari fabric",
      "Padded lid with tassel embellishments",
      "Velvet-lined individual cavity trays",
      "Royal bridal keepsake appeal",
    ],
    swatch: "from-purple-900 via-indigo-950 to-neutral-950 text-purple-100",
    icon: "🪡",
  },
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
    <div className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs">
      <BuilderSectionHeader
        badge="Section 7C"
        title="Luxury Gifting Box Packaging Styles"
        description="Choose your studio's signature packaging presentation. Wedding families select gifting vendors based on exterior box aesthetics and artisanal finishes."
        tip="The selected packaging style will be prominently highlighted on your Baina Box showcase and wedding gifting catalog."
      />

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PACKAGING_STYLES.map((style) => {
            const isSelected = packaging === style.id;

            return (
              <div
                key={style.id}
                onClick={() => onChangePackaging(style.id)}
                className={`relative flex flex-col justify-between rounded-card border p-5 transition-all cursor-pointer ${
                  isSelected
                    ? "border-maroon bg-cream-1/50 ring-2 ring-maroon shadow-xs"
                    : "border-cream-3 bg-white hover:border-cream-3/80 hover:bg-cream-1/20"
                }`}
              >
                <div>
                  {/* Swatch Header */}
                  <div
                    className={`rounded-control bg-gradient-to-r ${style.swatch} p-3.5 mb-3 flex items-center justify-between shadow-2xs`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl" aria-hidden="true">
                        {style.icon}
                      </span>
                      <div>
                        <h4 className="font-bold text-xs leading-tight">
                          {style.title}
                        </h4>
                        <span className="text-[10px] opacity-80">
                          {style.subtitle}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? "border-white bg-white text-maroon font-bold text-[9px]"
                          : "border-white/50 bg-white/20"
                      }`}
                    >
                      {isSelected && "✓"}
                    </div>
                  </div>

                  <p className="text-xs text-ink-soft leading-relaxed">
                    {style.description}
                  </p>

                  <ul className="mt-3 space-y-1.5 border-t border-cream-2 pt-3">
                    {style.attributes.map((attr, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2 text-[11px] text-ink"
                      >
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{attr}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 pt-3 flex items-center justify-between border-t border-cream-2 text-xs">
                  <span className="text-ink-soft">
                    {isSelected ? "Selected Signature Style" : "Click to select"}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      isSelected ? "text-maroon font-bold" : "text-ink-soft"
                    }`}
                  >
                    {isSelected ? "Active" : "Select"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BuilderNav
        onBack={onBack}
        onContinue={onFinishBaina}
        onSaveDraft={onSaveDraft}
        saving={saving}
        continueLabel="Complete Baina Box Builder →"
      />
    </div>
  );
}
