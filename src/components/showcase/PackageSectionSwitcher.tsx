"use client";

/**
 * A segmented switch that flips the package section between two designs:
 *  • "Recent"   — the current live section (<Packages/>), unchanged.
 *  • "Finalise" — the new all-in-one differentiated section.
 * Both carry the full menu, footnote and every tier detail; the switch just
 * lets you compare presentations side by side on /finalise.
 */

import { useState } from "react";
import Packages from "@/components/sections/Packages";
import FinalisedPackages from "@/components/showcase/FinalisedPackages";
import { useLang } from "@/lib/i18n";

type View = "finalise" | "recent";

export default function PackageSectionSwitcher() {
  const { t } = useLang();
  const [view, setView] = useState<View>("finalise");

  const tab = (v: View, label: string, sub: string) => {
    const active = view === v;
    return (
      <button
        key={v}
        type="button"
        onClick={() => setView(v)}
        aria-pressed={active}
        className={`flex flex-col items-center rounded-full px-6 py-2 text-sm font-semibold transition-all duration-300 ${
          active ? "bg-maroon text-cream shadow-sm" : "text-maroon hover:bg-cream/60"
        }`}
      >
        <span className="font-display leading-none">{label}</span>
        <span className={`mt-0.5 text-[10px] font-normal ${active ? "text-cream/80" : "text-ink-soft"}`}>
          {sub}
        </span>
      </button>
    );
  };

  return (
    <div>
      {/* Segmented control */}
      <div className="flex justify-center px-5 pt-4">
        <div className="inline-flex items-center gap-1 rounded-full border border-maroon/20 bg-cream/40 p-1">
          {tab("recent", t("Recent", "मौजूदा"), t("current design", "अभी वाला"))}
          {tab("finalise", t("Finalise", "फ़ाइनल"), t("new design", "नया"))}
        </div>
      </div>

      {view === "recent" ? <Packages /> : <FinalisedPackages />}
    </div>
  );
}
