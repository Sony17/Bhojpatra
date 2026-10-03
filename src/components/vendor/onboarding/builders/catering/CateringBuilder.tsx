"use client";

import { useState } from "react";
import Step5AFeastBasics from "./Step5AFeastBasics";
import Step5BPricingQuotas, { type CourseQuotas } from "./Step5BPricingQuotas";
import Step5CCourseHierarchy from "./Step5CCourseHierarchy";
import Step5DDishBuilder from "./Step5DDishBuilder";
import Step5ELiveCounters from "./Step5ELiveCounters";
import Step5FHospitalityExtras from "./Step5FHospitalityExtras";
import Step5GServiceCrew from "./Step5GServiceCrew";
import Step5HTablewareAddons from "./Step5HTablewareAddons";
import { SubnavPills } from "../../ui";
import type {
  VendorMenuSection,
  VendorCounter,
  VendorEssentialService,
  CutleryTierOption,
} from "@/lib/vendorMenus";

export interface CateringBuilderData {
  packageName: string;
  about: string;
  bestFor: string[];
  minPax: number;
  maxCapacity: number;
  leadHours: number;
  image?: string;
  priceFrom: number;
  goldRate: number;
  goldSpecialization: string;
  silverQuotas: CourseQuotas;
  goldQuotas: CourseQuotas;
  menu: VendorMenuSection[];
  featured: string[];
  counters: VendorCounter[];
  essentialService: VendorEssentialService;
  cutleryTier: CutleryTierOption;
  cateringComponents?: {
    counters?: boolean;
    extras?: boolean;
    essentials?: boolean;
    addons?: boolean;
  };
}

interface CateringBuilderProps {
  data: CateringBuilderData;
  onChange: (patch: Partial<CateringBuilderData>) => void;
  onBackToPreviousService: () => void;
  onFinishCatering: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
  /** Controlled section id (5A–5H); lets the shell deep-link from Review. */
  section?: string;
  onSectionChange?: (id: string) => void;
}

/** Handover breadcrumb: desktop label + mobile short label. */
export const CATERING_SECTIONS = [
  { id: "5A", label: "Feast Details", short: "Basics" },
  { id: "5B", label: "Silver & Gold Tiers", short: "Tiers" },
  { id: "5C", label: "Course Hierarchy", short: "Courses" },
  { id: "5D", label: "Dishes & Photos", short: "Dishes" },
  { id: "5E", label: "Live Counters", short: "Live", component: "counters" },
  { id: "5F", label: "Feast Extras", short: "Extras", component: "extras" },
  { id: "5G", label: "Essentials", short: "Essentials", component: "essentials" },
  { id: "5H", label: "Tableware Add-ons", short: "Add-ons", component: "addons" },
] as const;

export function activeCateringSections(components?: CateringBuilderData["cateringComponents"]) {
  return CATERING_SECTIONS.filter(
    (s) => !("component" in s) || components?.[s.component as keyof NonNullable<typeof components>] !== false,
  );
}

export default function CateringBuilder({
  data,
  onChange,
  onBackToPreviousService,
  onFinishCatering,
  onSaveDraft,
  saving = false,
  section,
  onSectionChange,
}: CateringBuilderProps) {
  const [localSection, setLocalSection] = useState<string>("5A");
  const activeSection = section ?? localSection;
  const setActiveSection = (id: string) => {
    setLocalSection(id);
    onSectionChange?.(id);
  };
  const [targetCourseForDishes, setTargetCourseForDishes] = useState<string>("starters");

  const activeSections = activeCateringSections(data.cateringComponents);

  const currentIndex = activeSections.findIndex((s) => s.id === activeSection);
  const safeCurrentIndex = currentIndex === -1 ? 0 : currentIndex;

  const handleNextSection = () => {
    if (safeCurrentIndex < activeSections.length - 1) {
      setActiveSection(activeSections[safeCurrentIndex + 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onFinishCatering();
    }
  };

  const handlePrevSection = () => {
    if (safeCurrentIndex > 0) {
      setActiveSection(activeSections[safeCurrentIndex - 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onBackToPreviousService();
    }
  };

  const handleJumpToCourseDishes = (courseId: string) => {
    setTargetCourseForDishes(courseId);
    setActiveSection("5D");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      <SubnavPills
        items={activeSections.map((s) => ({ id: s.id, label: s.label, short: s.short }))}
        active={activeSection}
        onSelect={(id) => {
          setActiveSection(id);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      {/* Render Current Section */}
      {activeSection === "5A" && (
        <Step5AFeastBasics
          data={{
            packageName: data.packageName,
            about: data.about,
            bestFor: data.bestFor,
            minPax: data.minPax,
            maxCapacity: data.maxCapacity,
            leadHours: data.leadHours,
            image: data.image,
          }}
          onChange={(patch) => onChange(patch)}
          onBack={handlePrevSection}
          onContinue={handleNextSection}
          onSaveDraft={onSaveDraft}
          saving={saving}
        />
      )}

      {activeSection === "5B" && (
        <Step5BPricingQuotas
          data={{
            priceFrom: data.priceFrom,
            goldRate: data.goldRate,
            goldSpecialization: data.goldSpecialization,
            silverQuotas: data.silverQuotas,
            goldQuotas: data.goldQuotas,
          }}
          onChange={(patch) => onChange(patch)}
          onBack={handlePrevSection}
          onContinue={handleNextSection}
          onSaveDraft={onSaveDraft}
          saving={saving}
        />
      )}

      {activeSection === "5C" && (
        <Step5CCourseHierarchy
          sections={data.menu}
          silverQuotas={data.silverQuotas}
          goldQuotas={data.goldQuotas}
          onSelectCourseToBuild={handleJumpToCourseDishes}
          onBack={handlePrevSection}
          onContinue={handleNextSection}
          onSaveDraft={onSaveDraft}
          saving={saving}
        />
      )}

      {activeSection === "5D" && (
        <Step5DDishBuilder
          sections={data.menu}
          featured={data.featured}
          onChangeSections={(menu) => onChange({ menu })}
          onChangeFeatured={(featured) => onChange({ featured })}
          initialCourseId={targetCourseForDishes}
          onBack={handlePrevSection}
          onContinue={handleNextSection}
          onSaveDraft={onSaveDraft}
          saving={saving}
        />
      )}

      {activeSection === "5E" && (
        <Step5ELiveCounters
          counters={data.counters}
          onChangeCounters={(counters) => onChange({ counters })}
          onBack={handlePrevSection}
          onContinue={handleNextSection}
          onSaveDraft={onSaveDraft}
          saving={saving}
        />
      )}

      {activeSection === "5F" && (
        <Step5FHospitalityExtras
          counters={data.counters}
          onChangeCounters={(counters) => onChange({ counters })}
          onBack={handlePrevSection}
          onContinue={handleNextSection}
          onSaveDraft={onSaveDraft}
          saving={saving}
        />
      )}

      {activeSection === "5G" && (
        <Step5GServiceCrew
          essentialService={data.essentialService}
          onChangeEssentialService={(essentialService) =>
            onChange({ essentialService })
          }
          onBack={handlePrevSection}
          onContinue={handleNextSection}
          onSaveDraft={onSaveDraft}
          saving={saving}
        />
      )}

      {activeSection === "5H" && (
        <Step5HTablewareAddons
          cutleryTier={data.cutleryTier}
          onChangeCutleryTier={(cutleryTier) => onChange({ cutleryTier })}
          onBack={handlePrevSection}
          onFinishCatering={onFinishCatering}
          onSaveDraft={onSaveDraft}
          saving={saving}
        />
      )}
    </div>
  );
}
