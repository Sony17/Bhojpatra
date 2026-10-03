"use client";

import BuilderNav from "../common/BuilderNav";
import type { VendorMenuSection } from "@/lib/vendorMenus";
import type { CourseQuotas } from "./Step5BPricingQuotas";
import { ContentCard, R, StepHeading } from "../../ui";

interface Step5CCourseHierarchyProps {
  sections: VendorMenuSection[];
  silverQuotas: CourseQuotas;
  goldQuotas: CourseQuotas;
  onSelectCourseToBuild?: (courseId: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

/** Handover: the 5 platform-standard courses. */
export const COURSES_INFO = [
  {
    id: "welcome",
    name: "Welcome Drinks",
    short: "Welcome Drinks",
    icon: "🥤",
    desc: "Arrival sherbets, coolers, and traditional welcome refreshments.",
  },
  {
    id: "starters",
    name: "Starters & Kebabs",
    short: "Starters",
    icon: "🍢",
    desc: "Passed hot appetisers, tikkas, kebabs, and live charcoal grill items.",
  },
  {
    id: "main",
    name: "Main Course",
    short: "Main Course",
    icon: "🍲",
    desc: "Heritage slow-cooked curries, paneer delicacies, dal makhani, and dum biryani.",
  },
  {
    id: "breads",
    name: "Breads & Rice",
    short: "Breads",
    icon: "🫓",
    desc: "Tandoori rotis, flaky parathas, saffron sheermal, and aromatic rice.",
  },
  {
    id: "sweets",
    name: "Sweets & Mithai",
    short: "Sweets",
    icon: "🍬",
    desc: "Shahi tukda, kulfi falooda, halwai sweets, and dessert studio delicacies.",
  },
];

export default function Step5CCourseHierarchy({
  sections,
  silverQuotas,
  goldQuotas,
  onSelectCourseToBuild,
  onBack,
  onContinue,
  onSaveDraft,
  saving = false,
}: Step5CCourseHierarchyProps) {
  const count = (id: string) => sections.find((s) => s.categoryId === id)?.items.length || 0;

  return (
    <div className="animate-in fade-in duration-200">
      <StepHeading
        eyebrow="Feast Builder · Course Hierarchy"
        heading="Feast course hierarchy"
        subtext="Review the 5 standard courses structured for guest banquet navigation."
        mEyebrow="Course Hierarchy"
        mHeading="Course hierarchy"
        mSubtext={null}
      />

      <ContentCard>
        <ul className="divide-y divide-cream/50">
          {COURSES_INFO.map((c) => {
            const n = count(c.id);
            const key = c.id as keyof CourseQuotas;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelectCourseToBuild?.(c.id)}
                  className="flex min-h-[56px] w-full items-center gap-3 py-3 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-cream/30 text-xl" aria-hidden>
                    {c.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-ink">
                      <R d={c.name} m={c.short} />
                    </span>
                    <span className="hidden text-xs text-ink/60 sm:block">{c.desc}</span>
                    <span className="hidden text-[11px] text-ink/40 sm:block">
                      Silver {silverQuotas[key] ?? 0} · Gold {goldQuotas[key] ?? 0} picks
                    </span>
                  </span>
                  <span
                    className="flex h-7 min-w-7 items-center justify-center rounded-full bg-maroon px-2 text-xs font-bold text-cream"
                    title={`${n} dishes`}
                  >
                    {n}
                  </span>
                  <span className="text-ink/30" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </ContentCard>

      <BuilderNav onBack={onBack} onContinue={onContinue} onSaveDraft={onSaveDraft} saving={saving} />
    </div>
  );
}
