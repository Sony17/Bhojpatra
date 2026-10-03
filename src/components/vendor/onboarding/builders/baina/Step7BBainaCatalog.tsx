"use client";

import { useState } from "react";
import Image from "next/image";
import BuilderNav from "../common/BuilderNav";
import BainaBoxModal from "./BainaBoxModal";
import type { VendorBainaBox } from "@/lib/vendorMenus";
import { dummyDishPhoto } from "@/lib/data";
import { AddDashed, ContentCard, R, StepHeading } from "../../ui";

interface Step7BBainaCatalogProps {
  boxes: VendorBainaBox[];
  onChangeBoxes: (boxes: VendorBainaBox[]) => void;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

const MAX_BOXES = 5;

export default function Step7BBainaCatalog({
  boxes,
  onChangeBoxes,
  onBack,
  onContinue,
  onSaveDraft,
  saving = false,
}: Step7BBainaCatalogProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [boxToEdit, setBoxToEdit] = useState<{
    box: VendorBainaBox;
    index: number;
  } | null>(null);
  const [error, setError] = useState("");

  const isAtLimit = boxes.length >= MAX_BOXES;

  const handleOpenAdd = () => {
    if (isAtLimit) {
      setError(`Catalog limit reached. You can publish a maximum of ${MAX_BOXES} curated Baina boxes.`);
      return;
    }
    setError("");
    setBoxToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (box: VendorBainaBox, index: number) => {
    setError("");
    setBoxToEdit({ box, index });
    setModalOpen(true);
  };

  const handleSaveBox = (box: VendorBainaBox, existingIndex?: number) => {
    if (existingIndex !== undefined) {
      const updated = [...boxes];
      updated[existingIndex] = box;
      onChangeBoxes(updated);
    } else {
      if (boxes.length >= MAX_BOXES) {
        setError(`Cannot add more than ${MAX_BOXES} boxes.`);
        return;
      }
      onChangeBoxes([...boxes, box]);
    }
    setError("");
  };

  const handleRemoveBox = (index: number) => {
    onChangeBoxes(boxes.filter((_, idx) => idx !== index));
    setError("");
  };

  const validateAndContinue = () => {
    if (boxes.length === 0) {
      setError("Please add at least one Baina box to your catalog.");
      return;
    }
    if (boxes.length > MAX_BOXES) {
      setError(`Maximum limit is ${MAX_BOXES} boxes.`);
      return;
    }
    onContinue();
  };

  return (
    <div className="animate-in fade-in duration-200">
      <StepHeading
        eyebrow="Baina Builder · Box Catalog"
        heading="Artisanal gifting box hampers"
        subtext="Manage signature gift boxes with itemized sweet contents, ½ kg base rates, 1 kg rates, and hamper photography."
        mEyebrow="Gift Boxes"
        mHeading="Gift boxes"
        mSubtext={null}
      />

      <ContentCard>
        {boxes.length > 0 && (
          <ul className="space-y-2.5">
            {boxes.map((b, idx) => (
              <li key={`${b.name}-${idx}`} className="flex items-start gap-3 rounded-control border border-cream/70 p-2.5">
                <Image
                  src={b.photo || dummyDishPhoto(b.name)}
                  alt={b.name}
                  width={64}
                  height={64}
                  unoptimized
                  className="h-16 w-16 shrink-0 rounded-control object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-ink">{b.name}</div>
                  <p className="line-clamp-2 text-[11px] text-ink/60">{b.contents}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded border border-cream px-1.5 text-[11px] font-bold text-maroon">½ kg: ₹{b.price}</span>
                    {b.price1kg ? (
                      <span className="rounded border border-cream px-1.5 text-[11px] font-bold text-ink">1 kg: ₹{b.price1kg}</span>
                    ) : null}
                    {(b.customSizes || []).map((cs) => (
                      <span key={cs.label} className="rounded bg-cream/40 px-1.5 text-[10px] font-bold uppercase text-ink">
                        {cs.label}: ₹{cs.price}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                  <button
                    type="button"
                    aria-label={`Edit ${b.name}`}
                    onClick={() => handleOpenEdit(b, idx)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-cream text-ink/70"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${b.name}`}
                    onClick={() => handleRemoveBox(idx)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-cream text-ink/70"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <AddDashed onClick={handleOpenAdd} disabled={isAtLimit}>
          <R d="Add New Gifting Box Hamper" m="Add Box" />
        </AddDashed>
        <p className="mt-2 text-center text-[11px] font-semibold text-ink/50">Maximum 5 selections allowed.</p>
        {error && <p className="mt-2 text-xs font-semibold text-maroon">⚠️ {error}</p>}
      </ContentCard>

      <BainaBoxModal
        isOpen={modalOpen}
        boxToEdit={boxToEdit}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveBox}
      />

      <BuilderNav onBack={onBack} onContinue={validateAndContinue} onSaveDraft={onSaveDraft} saving={saving} />
    </div>
  );
}
