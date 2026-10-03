"use client";

import BuilderSectionHeader from "../common/BuilderSectionHeader";
import BuilderNav from "../common/BuilderNav";
import type { VendorMenuSection } from "@/lib/vendorMenus";
import type { CourseQuotas } from "./Step5BPricingQuotas";

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

const COURSES_INFO = [
  {
    id: "welcome",
    name: "Welcome Drinks",
    icon: "🥤",
    desc: "Arrival refreshments, coolers, punches & mocktails greeting incoming guests.",
    color: "from-blue-500/10 to-blue-500/5 border-blue-200",
    badgeBg: "bg-blue-100 text-blue-800",
  },
  {
    id: "starters",
    name: "Starters & Appetizers",
    icon: "🍢",
    desc: "Hand-passed kebabs, tikkas, crispy bites & chaat appetisers served during gathering.",
    color: "from-amber-500/10 to-amber-500/5 border-amber-200",
    badgeBg: "bg-amber-100 text-amber-800",
  },
  {
    id: "main",
    name: "Main Course",
    icon: "🍲",
    desc: "Handi curries, gravies, slow-dum biryanis, signature dals and vegetable specialties.",
    color: "from-emerald-500/10 to-emerald-500/5 border-emerald-200",
    badgeBg: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "breads",
    name: "Artisan Breads",
    icon: "🫓",
    desc: "Fresh tandoori rotis, naans, paranthas, sheermals and kulchas hot off the chulha.",
    color: "from-orange-500/10 to-orange-500/5 border-orange-200",
    badgeBg: "bg-orange-100 text-orange-800",
  },
  {
    id: "sweets",
    name: "Mithai & Sweets",
    icon: "🍬",
    desc: "Halwai confections, hot jalebi-rabri, kulfis, gulab jamuns and celebratory desserts.",
    color: "from-pink-500/10 to-pink-500/5 border-pink-200",
    badgeBg: "bg-pink-100 text-pink-800",
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
  const getDishCount = (courseId: string) => {
    const sec = sections.find((s) => s.categoryId === courseId);
    return sec?.items.length || 0;
  };

  const totalDishes = COURSES_INFO.reduce(
    (acc, c) => acc + getDishCount(c.id),
    0,
  );

  return (
    <div className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs">
      <BuilderSectionHeader
        badge="Section 5C"
        title="Course Hierarchy & Catalog Overview"
        description="Review the 5 official plated courses for your feast packages. Ensure each course has enough published dishes to satisfy Silver and Gold quotas."
        tip="Hosts pick dishes based on package quotas. Having 1.5× to 2× variety compared to the quota gives hosts exciting choices."
      />

      <div className="mt-6 space-y-6">
        {/* Total Dishes KPI banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-control bg-cream-1/80 border border-cream-2 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-maroon text-white font-bold text-lg">
              🍽️
            </span>
            <div>
              <span className="text-xs uppercase tracking-wider text-ink-soft font-bold">
                Catering Roster Summary
              </span>
              <p className="text-sm font-bold text-ink">
                {totalDishes} Dishes Published across 5 Plated Courses
              </p>
            </div>
          </div>
          <div className="text-xs text-ink-soft">
            <span className="font-semibold text-ink">Next Step:</span> Granular Dish Builder allows adding and editing items.
          </div>
        </div>

        {/* 5 Plated Courses Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COURSES_INFO.map((course) => {
            const count = getDishCount(course.id);
            const silverQ = silverQuotas[course.id as keyof CourseQuotas] ?? 0;
            const goldQ = goldQuotas[course.id as keyof CourseQuotas] ?? 0;
            const maxQuota = Math.max(silverQ, goldQ);
            const isDeficient = count < maxQuota;

            return (
              <div
                key={course.id}
                className={`relative flex flex-col justify-between rounded-card border bg-gradient-to-b ${course.color} p-4.5 transition-all hover:shadow-xs`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-2xl" aria-hidden="true">
                      {course.icon}
                    </span>
                    <span
                      className={`rounded-pill px-2.5 py-0.5 text-xs font-bold ${
                        isDeficient && count > 0
                          ? "bg-amber-100 text-amber-800"
                          : count === 0
                            ? "bg-red-100 text-red-800"
                            : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {count} {count === 1 ? "dish" : "dishes"}
                    </span>
                  </div>

                  <h3 className="mt-3 font-bold text-ink">{course.name}</h3>
                  <p className="mt-1 text-xs text-ink-soft leading-relaxed line-clamp-2">
                    {course.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-cream-3/60 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-ink-soft">
                    <span>Quotas:</span>
                    <span className="font-semibold text-ink">
                      Silver: {silverQ} · Gold: {goldQ}
                    </span>
                  </div>

                  {count === 0 ? (
                    <div className="text-[11px] text-red-600 font-medium">
                      ⚠️ No dishes added yet.
                    </div>
                  ) : isDeficient ? (
                    <div className="text-[11px] text-amber-700 font-medium">
                      ⚠️ Needs at least {maxQuota} dishes to meet quotas.
                    </div>
                  ) : (
                    <div className="text-[11px] text-emerald-700 font-medium">
                      ✓ Quota satisfied ({count} available)
                    </div>
                  )}

                  {onSelectCourseToBuild && (
                    <button
                      type="button"
                      onClick={() => onSelectCourseToBuild(course.id)}
                      className="mt-2 w-full rounded-control border border-cream-3 bg-white/90 py-1.5 text-xs font-semibold text-ink hover:bg-white hover:text-maroon transition-colors min-h-[36px]"
                    >
                      Manage {course.name} Dishes →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BuilderNav
        onBack={onBack}
        onContinue={onContinue}
        onSaveDraft={onSaveDraft}
        saving={saving}
        continueLabel="Continue to Granular Dish Builder →"
      />
    </div>
  );
}
