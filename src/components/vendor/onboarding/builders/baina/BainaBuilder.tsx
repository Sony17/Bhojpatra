"use client";

import { useState } from "react";
import Step7ABainaStory from "./Step7ABainaStory";
import Step7BBainaCatalog from "./Step7BBainaCatalog";
import Step7CPackaging from "./Step7CPackaging";
import type { VendorBainaDetails, VendorBainaBox } from "@/lib/vendorMenus";

export interface BainaBuilderData {
  bainaDetails: VendorBainaDetails;
  bainaBoxes: VendorBainaBox[];
}

interface BainaBuilderProps {
  data: BainaBuilderData;
  onChange: (patch: Partial<BainaBuilderData>) => void;
  onBackToPreviousService: () => void;
  onFinishBaina: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

const BAINA_SECTIONS = [
  { id: "7A", label: "Studio Story", short: "7A. Studio Story" },
  { id: "7B", label: "Box Catalog", short: "7B. Box Catalog" },
  { id: "7C", label: "Packaging Styles", short: "7C. Packaging" },
];

export default function BainaBuilder({
  data,
  onChange,
  onBackToPreviousService,
  onFinishBaina,
  onSaveDraft,
  saving = false,
}: BainaBuilderProps) {
  const [activeSection, setActiveSection] = useState<string>("7A");

  const currentIndex = BAINA_SECTIONS.findIndex((s) => s.id === activeSection);

  const handleNextSection = () => {
    if (currentIndex < BAINA_SECTIONS.length - 1) {
      setActiveSection(BAINA_SECTIONS[currentIndex + 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onFinishBaina();
    }
  };

  const handlePrevSection = () => {
    if (currentIndex > 0) {
      setActiveSection(BAINA_SECTIONS[currentIndex - 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onBackToPreviousService();
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Section Navigation Bar */}
      <div className="rounded-card border border-cream-3 bg-white p-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-cream-2 pb-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-maroon flex items-center gap-1.5">
            <span>🎁</span>
            <span>Baina Box Builder</span>
          </span>
          <span className="text-xs text-ink-soft">
            Section {currentIndex + 1} of {BAINA_SECTIONS.length}
          </span>
        </div>

        <div className="flex gap-2">
          {BAINA_SECTIONS.map((sec, idx) => {
            const isActive = sec.id === activeSection;
            const isCompleted = idx < currentIndex;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold transition-all min-h-[36px] ${
                  isActive
                    ? "bg-maroon text-white shadow-2xs"
                    : isCompleted
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                      : "bg-cream-1 text-ink-soft hover:bg-cream-2 hover:text-ink"
                }`}
              >
                <span>{sec.short}</span>
                {isCompleted && <span className="text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {activeSection === "7A" && (
        <Step7ABainaStory
          bainaDetails={data.bainaDetails}
          onChangeBainaDetails={(bainaDetails) => onChange({ bainaDetails })}
          onBack={handlePrevSection}
          onContinue={handleNextSection}
          onSaveDraft={onSaveDraft}
          saving={saving}
        />
      )}

      {activeSection === "7B" && (
        <Step7BBainaCatalog
          boxes={data.bainaBoxes}
          onChangeBoxes={(bainaBoxes) => onChange({ bainaBoxes })}
          onBack={handlePrevSection}
          onContinue={handleNextSection}
          onSaveDraft={onSaveDraft}
          saving={saving}
        />
      )}

      {activeSection === "7C" && (
        <Step7CPackaging
          packaging={data.bainaDetails.packaging}
          onChangePackaging={(packaging) =>
            onChange({
              bainaDetails: {
                ...data.bainaDetails,
                packaging,
              },
            })
          }
          onBack={handlePrevSection}
          onFinishBaina={onFinishBaina}
          onSaveDraft={onSaveDraft}
          saving={saving}
        />
      )}
    </div>
  );
}
