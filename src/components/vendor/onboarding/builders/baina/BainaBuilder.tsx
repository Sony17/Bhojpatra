"use client";

import { useState } from "react";
import { SubnavPills } from "../../ui";
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
  section?: string;
  onSectionChange?: (id: string) => void;
}

/** Handover breadcrumb: Studio Story › Box Catalog › Packaging Styles. */
export const BAINA_SECTIONS = [
  { id: "7A", label: "Studio Story", short: "Story" },
  { id: "7B", label: "Box Catalog", short: "Boxes" },
  { id: "7C", label: "Packaging Styles", short: "Styles" },
];

export default function BainaBuilder({
  data,
  onChange,
  onBackToPreviousService,
  onFinishBaina,
  onSaveDraft,
  saving = false,
  section,
  onSectionChange,
}: BainaBuilderProps) {
  const [localSection, setLocalSection] = useState<string>("7A");
  const activeSection = section ?? localSection;
  const setActiveSection = (id: string) => {
    setLocalSection(id);
    onSectionChange?.(id);
  };

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
    <div>
      <SubnavPills
        items={BAINA_SECTIONS}
        active={activeSection}
        onSelect={(id) => {
          setActiveSection(id);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

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
