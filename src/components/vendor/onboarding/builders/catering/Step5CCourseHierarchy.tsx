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
    <div>
      <StepHeading
        eyebrow="Feast Builder · Course Hierarchy"
        heading="Feast course hierarchy"
        subtext="Review the 5 standard courses structured for guest banquet navigation."
        mEyebrow="Course Hierarchy"
        mHeading="Course hierarchy"
        mSubtext={null}
      />

      <ContentCard>
        <div className="items-catalog-grid">
          {COURSES_INFO.map((c) => {
            const n = count(c.id);
            const key = c.id as keyof CourseQuotas;
            // Red accent = the course still has dishes to add vs. its Gold allowance.
            const highlight = n > 0 && n < (goldQuotas[key] ?? 0);
            return (
              <button
                key={c.id}
                type="button"
                className="dish-card"
                onClick={() => onSelectCourseToBuild?.(c.id)}
                aria-label={`${c.name}: ${n} dishes. Open in dish builder`}
                title={`Silver ${silverQuotas[key] ?? 0} · Gold ${goldQuotas[key] ?? 0} picks`}
                style={{
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  font: "inherit",
                  ...(highlight ? { borderColor: "var(--color-red)" } : null),
                }}
              >
                <div className="dish-card-left">
                  <span className="vob-d" style={{ fontSize: 28 }} aria-hidden>
                    {c.icon}
                  </span>
                  <span className="vob-m" aria-hidden>
                    {c.icon}
                  </span>
                  <div>
                    <div className="dish-name">
                      <R d={c.name} m={c.short} />
                    </div>
                    <div className="dish-desc vob-d">{c.desc}</div>
                  </div>
                </div>
                <span
                  className="tab-badge"
                  style={highlight ? { background: "var(--color-red)", color: "var(--color-cream)" } : undefined}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      </ContentCard>

      <BuilderNav onBack={onBack} onContinue={onContinue} onSaveDraft={onSaveDraft} saving={saving} />
    </div>
  );
}
