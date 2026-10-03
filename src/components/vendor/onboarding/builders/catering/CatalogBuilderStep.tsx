"use client";

import { useState } from "react";
import BuilderNav from "../common/BuilderNav";
import CounterModal from "./CounterModal";
import type { VendorCounter } from "@/lib/vendorMenus";
import { vendorOfferings, addOnMenus, addOns } from "@/lib/data";
import { cn } from "@/components/ui/cn";
import { ContentCard, R, StepHeading } from "../../ui";

export interface CatalogIdea {
  /** Platform offering id; undefined = not yet listable on the platform. */
  id?: string;
  icon: string;
  name: string;
  mName: string;
  rate: number;
  flat?: boolean;
  desc: string;
  mDesc: string;
  spread?: string[];
}

interface CatalogBuilderStepProps {
  mode: "counter" | "service";
  counters: VendorCounter[];
  belongs: (id: string) => boolean;
  onChangeCounters: (counters: VendorCounter[]) => void;
  heading: { eyebrow: string; heading: string; subtext: string; mEyebrow: string; mHeading: string };
  catalogTitle: string;
  mCatalogTitle: string;
  catalogSub?: string;
  addLabel: string;
  mAddLabel: string;
  ideasTitle: string;
  mIdeasTitle: string;
  ideas: CatalogIdea[];
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

const money = (n: number) => n.toLocaleString("en-IN");

export default function CatalogBuilderStep(p: CatalogBuilderStepProps) {
  const [modal, setModal] = useState<{ edit?: VendorCounter; presetId?: string; presetPrice?: number } | null>(null);
  const mine = p.counters.filter((c) => p.belongs(c.id));
  const takenIds = p.counters.map((c) => c.id);

  const save = (c: VendorCounter) => {
    const idx = p.counters.findIndex((x) => x.id === c.id);
    if (idx === -1) p.onChangeCounters([...p.counters, c]);
    else p.onChangeCounters(p.counters.map((x, i) => (i === idx ? c : x)));
  };

  const allTaken = vendorOfferings.filter((o) => p.belongs(o.id)).every((o) => takenIds.includes(o.id));

  return (
    <div className="animate-in fade-in duration-200">
      <StepHeading
        eyebrow={p.heading.eyebrow}
        heading={p.heading.heading}
        subtext={p.heading.subtext}
        mEyebrow={p.heading.mEyebrow}
        mHeading={p.heading.mHeading}
        mSubtext={null}
      />

      <ContentCard>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[15px] font-bold text-ink">
              <R d={p.catalogTitle} m={p.mCatalogTitle} />
            </div>
            {p.catalogSub && <div className="hidden text-xs text-ink/60 sm:block">{p.catalogSub}</div>}
          </div>
          <button
            type="button"
            disabled={allTaken}
            onClick={() => setModal({})}
            className="min-h-[44px] shrink-0 rounded-full bg-maroon px-4 text-xs font-bold text-cream disabled:opacity-40"
          >
            <R d={p.addLabel} m={p.mAddLabel} />
          </button>
        </div>

        {mine.length > 0 && (
          <ul className="mb-5 space-y-2">
            {mine.map((c) => {
              const o = vendorOfferings.find((x) => x.id === c.id);
              const a = addOns.find((x) => x.id === c.id);
              const names = [
                ...(c.items ?? (addOnMenus[c.id] || []).map((m) => m.name)),
                ...(c.extras || []).map((e) => e.name),
              ];
              const price = c.price ?? o?.price ?? 0;
              return (
                <li key={c.id} className="flex items-center gap-3 rounded-control border border-cream/70 bg-cream/10 p-2.5">
                  <span className="text-xl" aria-hidden>
                    {o?.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[13px] font-bold text-ink">{o?.name ?? c.id}</span>
                      <span className="text-xs font-bold text-maroon">
                        {a?.perPlate === false ? `Flat ₹${money(price)}` : `+₹${money(price)} / plate`}
                      </span>
                    </div>
                    <div className="truncate text-[11px] text-ink/60">{names.join(" · ")}</div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Edit ${o?.name}`}
                    onClick={() => setModal({ edit: c })}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cream text-ink/70"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${o?.name}`}
                    onClick={() => p.onChangeCounters(p.counters.filter((x) => x.id !== c.id))}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cream text-ink/70"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mb-2 text-xs font-bold text-ink/70">
          <R d={p.ideasTitle} m={p.mIdeasTitle} />
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {p.ideas.map((idea) => {
            const added = idea.id ? takenIds.includes(idea.id) : false;
            const unavailable = !idea.id;
            return (
              <button
                key={idea.name}
                type="button"
                disabled={added || unavailable}
                onClick={() => idea.id && setModal({ presetId: idea.id, presetPrice: idea.rate })}
                className={cn(
                  "flex min-h-[56px] flex-col gap-1 rounded-control border p-3 text-left transition-colors",
                  added ? "border-maroon bg-maroon/5" : "border-cream/70 bg-white hover:border-maroon/40",
                  unavailable && "opacity-50",
                )}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-bold text-ink">
                    {idea.icon} <R d={idea.name} m={idea.mName} />
                  </span>
                  <span className="shrink-0 text-xs font-bold text-maroon">
                    {idea.flat ? <R d={`Flat ₹${money(idea.rate)}`} m={`₹${money(idea.rate)}`} /> : `+₹${idea.rate}/p`}
                  </span>
                </span>
                <span className="text-[11px] text-ink/60">
                  <R d={idea.desc} m={idea.mDesc} />
                </span>
                {idea.spread && (
                  <span className="hidden flex-wrap gap-1 sm:flex">
                    {idea.spread.map((s) => (
                      <span key={s} className="rounded-full bg-cream/40 px-2 text-[10px] font-semibold text-ink">
                        {s}
                      </span>
                    ))}
                  </span>
                )}
                {added && <span className="text-[10px] font-bold text-maroon">✓ In your catalog</span>}
                {unavailable && <span className="text-[10px] font-bold text-ink/50">Coming soon to the platform</span>}
              </button>
            );
          })}
        </div>
      </ContentCard>

      <CounterModal
        isOpen={modal !== null}
        mode={p.mode}
        counterToEdit={modal?.edit ?? null}
        presetId={modal?.presetId}
        presetPrice={modal?.presetPrice}
        takenIds={takenIds}
        onClose={() => setModal(null)}
        onSave={save}
      />

      <BuilderNav onBack={p.onBack} onContinue={p.onContinue} onSaveDraft={p.onSaveDraft} saving={p.saving} />
    </div>
  );
}
