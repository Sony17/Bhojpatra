"use client";

import { useState } from "react";
import { SubnavPills } from "../../ui";
import Step6AStallWorkspace from "./Step6AStallWorkspace";
import Step6BStallSetup from "./Step6BStallSetup";
import type { SingleStallConfig, VendorDietaryOffering, VendorMenuSection } from "@/lib/vendorMenus";

export interface SingleStallBuilderData {
  stallConfig: SingleStallConfig;
  menu: VendorMenuSection[];
}

interface SingleStallBuilderProps {
  data: SingleStallBuilderData;
  /** The kitchen's dietary offering — a pure-veg kitchen can only add veg dishes. */
  dietaryOffering?: VendorDietaryOffering;
  onChange: (patch: Partial<SingleStallBuilderData>) => void;
  onBackToPreviousService: () => void;
  onFinishStall: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
  section?: string;
  onSectionChange?: (id: string) => void;
}

/** Handover breadcrumb: Menus › Live & Cutlery. */
export const STALL_SECTIONS = [
  { id: "6A", label: "Menus", short: "Menus" },
  { id: "6B", label: "Live & Cutlery", short: "Live" },
];

export default function SingleStallBuilder({
  data,
  dietaryOffering,
  onChange,
  onBackToPreviousService,
  onFinishStall,
  onSaveDraft,
  saving = false,
  section,
  onSectionChange,
}: SingleStallBuilderProps) {
  const [localSection, setLocalSection] = useState<string>("6A");
  const activeSection = section ?? localSection;
  const setActiveSection = (id: string) => {
    setLocalSection(id);
    onSectionChange?.(id);
  };

  const currentIndex = STALL_SECTIONS.findIndex((s) => s.id === activeSection);

  const handleNextSection = () => {
    if (currentIndex < STALL_SECTIONS.length - 1) {
      setActiveSection(STALL_SECTIONS[currentIndex + 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onFinishStall();
    }
  };

  const handlePrevSection = () => {
    if (currentIndex > 0) {
      setActiveSection(STALL_SECTIONS[currentIndex - 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onBackToPreviousService();
    }
  };

  return (
    <div>
      <SubnavPills
        items={STALL_SECTIONS}
        active={activeSection}
        onSelect={(id) => {
          setActiveSection(id);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      {activeSection === "6A" && (
        <Step6AStallWorkspace
          stallConfig={data.stallConfig}
          menu={data.menu}
          dietaryOffering={dietaryOffering}
          onChangeStallConfig={(stallConfig) => onChange({ stallConfig })}
          onChangeMenu={(menu) => onChange({ menu })}
          onBack={handlePrevSection}
          onContinue={handleNextSection}
          onSaveDraft={onSaveDraft}
          saving={saving}
        />
      )}

      {activeSection === "6B" && (
        <Step6BStallSetup
          stallConfig={data.stallConfig}
          onChangeStallConfig={(stallConfig) => onChange({ stallConfig })}
          onBack={handlePrevSection}
          onFinishStall={onFinishStall}
          onSaveDraft={onSaveDraft}
          saving={saving}
        />
      )}
    </div>
  );
}
