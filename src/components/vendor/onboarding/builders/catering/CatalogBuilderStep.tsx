"use client";

import { useState } from "react";
import Image from "next/image";
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
  const isCounter = p.mode === "counter";
  const ideaBtnStyle = { width: "100%", textAlign: "left" as const, font: "inherit" };

  return (
    <div>
      <StepHeading
        eyebrow={p.heading.eyebrow}
        heading={p.heading.heading}
        subtext={p.heading.subtext}
        mEyebrow={p.heading.mEyebrow}
        mHeading={p.heading.mHeading}
        mSubtext={null}
      />

      <ContentCard>
        <div className="catalog-builder-header-row">
          <div>
            <div className="catalog-builder-heading">
              <R d={p.catalogTitle} m={p.mCatalogTitle} />
            </div>
            {p.catalogSub && <div className="catalog-builder-subheading vob-d">{p.catalogSub}</div>}
          </div>
          <button
            type="button"
            className="btn-tier-proceed"
            style={{ margin: 0, padding: "8px 16px", fontSize: 12.5 }}
            disabled={allTaken}
            title={allTaken ? "Every available platform station is already in your catalog." : undefined}
            onClick={() => setModal({})}
          >
            <R d={p.addLabel} m={p.mAddLabel} />
          </button>
        </div>

        {/* Vendor's own catalog cards */}
        <div className={isCounter ? "vendor-counter-catalog-grid" : "vendor-extras-catalog-grid"}>
          {mine.length === 0 ? (
            <div className="catalog-empty-placeholder">
              <div style={{ fontSize: 28 }} aria-hidden>
                {isCounter ? "🍳" : "✨"}
              </div>
              <div className="catalog-empty-title">
                {isCounter ? "No Live Food Counters Configured Yet" : "No Feast Extras Configured Yet"}
              </div>
              <div className="catalog-empty-desc">
                {isCounter
                  ? "Click \"＋ Add Live Counter\" above or pick a starter station idea below to build your counter menu."
                  : "Click \"＋ Add Feast Extra\" above or choose a popular service idea below to build your extras catalog."}
              </div>
            </div>
          ) : (
            mine.map((c) => {
              const o = vendorOfferings.find((x) => x.id === c.id);
              const a = addOns.find((x) => x.id === c.id);
              const names = [
                ...(c.items ?? (addOnMenus[c.id] || []).map((m) => m.name)),
                ...(c.extras || []).map((e) => e.name),
              ];
              const price = c.price ?? o?.price ?? 0;
              const title = o?.name ?? c.id;
              return (
                <div key={c.id} className="vendor-catalog-card">
                  <div className="vendor-catalog-card-media">
                    {a?.image ? (
                      <Image
                        src={a.image}
                        alt={title}
                        width={400}
                        height={110}
                        unoptimized
                        className="vendor-catalog-thumb"
                      />
                    ) : (
                      <div
                        className="vendor-catalog-thumb"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}
                        aria-hidden
                      >
                        {o?.icon}
                      </div>
                    )}
                    <span className="vendor-catalog-price-badge">
                      {a?.perPlate === false ? `Flat ₹${money(price)}` : `+₹${money(price)} / plate`}
                    </span>
                  </div>
                  <div className="vendor-catalog-card-content">
                    <div className="vendor-catalog-title-row">
                      <h3 className="vendor-catalog-title">{title}</h3>
                    </div>
                    <div className="vendor-catalog-items-chips">
                      {names.map((n) => (
                        <span key={n} className="vendor-item-pill">
                          {n}
                        </span>
                      ))}
                    </div>
                    <div className="vendor-catalog-actions">
                      <button
                        type="button"
                        className="btn-catalog-action edit"
                        aria-label={`Edit ${title}`}
                        onClick={() => setModal({ edit: c })}
                      >
                        ✎ Edit
                      </button>
                      <button
                        type="button"
                        className="btn-catalog-action remove"
                        aria-label={`Remove ${title}`}
                        onClick={() => p.onChangeCounters(p.counters.filter((x) => x.id !== c.id))}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Starter Ideas / Preset Inspirations */}
        <div
          className="catalog-builder-starter-section"
          style={{ marginTop: 20, paddingTop: 16, borderTop: "1px dashed var(--color-cream-30)" }}
        >
          <div
            className="starter-section-title"
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: "var(--color-black-60)",
              marginBottom: 10,
            }}
          >
            <R d={p.ideasTitle} m={p.mIdeasTitle} />
          </div>

          <div className={isCounter ? "counter-selection-grid" : "feast-extras-grid"}>
            {p.ideas.map((idea) => {
              const added = idea.id ? takenIds.includes(idea.id) : false;
              const unavailable = !idea.id;
              const open = () => {
                if (!idea.id) return;
                if (added) setModal({ edit: p.counters.find((x) => x.id === idea.id) });
                else setModal({ presetId: idea.id, presetPrice: idea.rate });
              };
              const status = added ? (
                <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--color-red)", marginTop: 4 }}>
                  ✓ In your catalog
                </span>
              ) : unavailable ? (
                <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--color-black-40)", marginTop: 4 }}>
                  Coming soon to the platform
                </span>
              ) : null;
              const rate = idea.flat ? (
                <R d={`Flat ₹${money(idea.rate)}`} m={`₹${money(idea.rate)}`} />
              ) : (
                `+₹${idea.rate}/p`
              );

              if (isCounter) {
                const img = idea.id ? addOns.find((x) => x.id === idea.id)?.image : undefined;
                return (
                  <button
                    key={idea.name}
                    type="button"
                    className={cn("counter-item-card", added && "active")}
                    aria-pressed={added}
                    aria-disabled={unavailable || undefined}
                    onClick={open}
                    style={{ ...ideaBtnStyle, ...(unavailable ? { opacity: 0.55, cursor: "not-allowed" } : null) }}
                  >
                    {img && (
                      <Image src={img} alt={idea.name} width={50} height={50} unoptimized className="counter-thumb vob-d" />
                    )}
                    <div className="counter-info">
                      <div className="counter-name-row vob-d-flex">
                        <span className="counter-name">
                          {idea.icon} {idea.name}
                        </span>
                        <span className="counter-price-tag">{rate}</span>
                      </div>
                      <div className="counter-name vob-m">
                        {idea.icon} {idea.mName} ({rate})
                      </div>
                      <p className="counter-desc">
                        <R d={idea.desc} m={idea.mDesc} />
                      </p>
                      {idea.spread && (
                        <div className="counter-spread-chips vob-d-flex">
                          {idea.spread.map((sp) => (
                            <span key={sp} className="spread-chip">
                              {sp}
                            </span>
                          ))}
                        </div>
                      )}
                      {status}
                    </div>
                  </button>
                );
              }

              return (
                <button
                  key={idea.name}
                  type="button"
                  className={cn("feast-extra-card", added && "active")}
                  aria-pressed={added}
                  aria-disabled={unavailable || undefined}
                  onClick={open}
                  style={{ ...ideaBtnStyle, ...(unavailable ? { opacity: 0.55, cursor: "not-allowed" } : null) }}
                >
                  <span className="feast-extra-icon" aria-hidden>
                    {idea.icon}
                  </span>
                  <div className="feast-extra-info">
                    <div className="feast-extra-title-row">
                      <span className="feast-extra-name">
                        <R d={idea.name} m={idea.mName} />
                      </span>
                      <span className="feast-extra-rate">{rate}</span>
                    </div>
                    <div className="feast-extra-desc">
                      <R d={idea.desc} m={idea.mDesc} />
                    </div>
                    {status}
                  </div>
                </button>
              );
            })}
          </div>
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
