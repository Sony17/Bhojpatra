"use client";

import { useState } from "react";
import Step6AStallWorkspace from "./Step6AStallWorkspace";
import Step6BStallSetup from "./Step6BStallSetup";
import type { SingleStallConfig, VendorMenuSection } from "@/lib/vendorMenus";

export interface SingleStallBuilderData {
  stallConfig: SingleStallConfig;
  menu: VendorMenuSection[];
}

interface SingleStallBuilderProps {
  data: SingleStallBuilderData;
  onChange: (patch: Partial<SingleStallBuilderData>) => void;
  onBackToPreviousService: () => void;
  onFinishStall: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

const STALL_SECTIONS = [
  { id: "6A", label: "Stall Menus", short: "6A. Menus Workspace" },
  { id: "6B", label: "Setup & Cutlery", short: "6B. Setup & Cutlery" },
];

export default function SingleStallBuilder({
  data,
  onChange,
  onBackToPreviousService,
  onFinishStall,
  onSaveDraft,
  saving = false,
}: SingleStallBuilderProps) {
  const [activeSection, setActiveSection] = useState<string>("6A");

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
    <div className="space-y-6">
      {/* Sub-Section Navigation Bar */}
      <div className="rounded-card border border-cream-3 bg-white p-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-cream-2 pb-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-maroon flex items-center gap-1.5">
            <span>🍢</span>
            <span>Single Stall Builder</span>
          </span>
          <span className="text-xs text-ink-soft">
            Section {currentIndex + 1} of {STALL_SECTIONS.length}
          </span>
        </div>

        <div className="flex gap-2">
          {STALL_SECTIONS.map((sec, idx) => {
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

      {activeSection === "6A" && (
        <Step6AStallWorkspace
          stallConfig={data.stallConfig}
          menu={data.menu}
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
