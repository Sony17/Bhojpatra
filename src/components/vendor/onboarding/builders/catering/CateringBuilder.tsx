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
}

interface CateringBuilderProps {
  data: CateringBuilderData;
  onChange: (patch: Partial<CateringBuilderData>) => void;
  onBackToPreviousService: () => void;
  onFinishCatering: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

const CATERING_SECTIONS = [
  { id: "5A", label: "Feast Basics", short: "5A. Basics" },
  { id: "5B", label: "Pricing & Quotas", short: "5B. Pricing" },
  { id: "5C", label: "Course Hierarchy", short: "5C. Courses" },
  { id: "5D", label: "Granular Dishes", short: "5D. Dishes" },
  { id: "5E", label: "Live Counters", short: "5E. Counters" },
  { id: "5F", label: "Hospitality Extras", short: "5F. Extras" },
  { id: "5G", label: "Service Crew", short: "5G. Crew" },
  { id: "5H", label: "Tableware", short: "5H. Tableware" },
];

export default function CateringBuilder({
  data,
  onChange,
  onBackToPreviousService,
  onFinishCatering,
  onSaveDraft,
  saving = false,
}: CateringBuilderProps) {
  const [activeSection, setActiveSection] = useState<string>("5A");
  const [targetCourseForDishes, setTargetCourseForDishes] = useState<string>("starters");

  const currentIndex = CATERING_SECTIONS.findIndex((s) => s.id === activeSection);

  const handleNextSection = () => {
    if (currentIndex < CATERING_SECTIONS.length - 1) {
      setActiveSection(CATERING_SECTIONS[currentIndex + 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onFinishCatering();
    }
  };

  const handlePrevSection = () => {
    if (currentIndex > 0) {
      setActiveSection(CATERING_SECTIONS[currentIndex - 1].id);
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
    <div className="space-y-6">
      {/* Catering Sub-Section Navigation Bar */}
      <div className="rounded-card border border-cream-3 bg-white p-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-cream-2 pb-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-maroon flex items-center gap-1.5">
            <span>🍲</span>
            <span>Full Catering Builder</span>
          </span>
          <span className="text-xs text-ink-soft">
            Section {currentIndex + 1} of {CATERING_SECTIONS.length}
          </span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {CATERING_SECTIONS.map((sec, idx) => {
            const isActive = sec.id === activeSection;
            const isCompleted = idx < currentIndex;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold transition-all min-h-[36px] ${
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
