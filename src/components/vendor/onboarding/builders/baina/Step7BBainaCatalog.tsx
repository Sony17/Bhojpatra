"use client";

import { useState } from "react";
import Image from "next/image";
import BuilderNav from "../common/BuilderNav";
import BainaBoxModal from "./BainaBoxModal";
import type { VendorBainaBox } from "@/lib/vendorMenus";
import { dummyDishPhoto } from "@/lib/data";
import { AddDashed, R, StepHeading } from "../../ui";

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
      // The "Maximum 5 selections allowed." notice is already shown below the button.
      setError("");
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
    <div>
      <StepHeading
        eyebrow="Baina Builder · Box Catalog"
        heading="Artisanal gifting box hampers"
        subtext="Manage signature gift boxes with itemized sweet contents, ½ kg base rates, 1 kg rates, and hamper photography."
        mEyebrow="Gift Boxes"
        mHeading="Gift boxes"
        mSubtext={null}
      />

      <div className="content-card">
        <div className="baina-box-catalog-container items-catalog-grid">
          {boxes.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--color-black-60)", fontSize: 13 }}>
              No gifting boxes added yet. Click below to add your first box hamper (up to 5).
            </div>
          ) : (
            boxes.map((b, idx) => (
              <div key={`${b.name}-${idx}`} className="dish-card selected">
                <div className="dish-card-left">
                  <Image
                    src={b.photo || dummyDishPhoto(b.name)}
                    alt={b.name}
                    width={54}
                    height={54}
                    unoptimized
                    className="dish-thumb"
                  />
                  <div className="dish-info">
                    <div className="dish-name-row" style={{ flexWrap: "wrap" }}>
                      <span className="dish-name">{b.name}</span>
                      <span
                        className="service-pill"
                        style={{ fontSize: 10, background: "var(--color-cream)", color: "var(--color-red)", fontWeight: 700 }}
                      >
                        Box {idx + 1} of {MAX_BOXES}
                      </span>
                    </div>
                    <p className="dish-desc">{b.contents}</p>
                    <div className="dish-meta-row" style={{ marginTop: 5, flexWrap: "wrap" }}>
                      <span className="review-pill" style={{ fontWeight: 700, color: "var(--color-red)" }}>
                        ½ kg: ₹{b.price}
                      </span>
                      {b.price1kg ? (
                        <span className="review-pill" style={{ fontWeight: 700 }}>
                          1 kg: ₹{b.price1kg}
                        </span>
                      ) : null}
                      {(b.customSizes || []).map((cs) => (
                        <span key={cs.label} className="service-pill">
                          {cs.label}: ₹{cs.price}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="dish-card-actions">
                  <button
                    type="button"
                    className="btn-icon-action"
                    title="Edit Box"
                    aria-label={`Edit ${b.name}`}
                    onClick={() => handleOpenEdit(b, idx)}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="btn-icon-action"
                    title="Remove Box"
                    aria-label={`Remove ${b.name}`}
                    onClick={() => handleRemoveBox(idx)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <AddDashed onClick={handleOpenAdd} disabled={isAtLimit}>
          <R d="Add New Gifting Box Hamper" m="Add Box" />
        </AddDashed>
        {isAtLimit && (
          <div className="box-selection-limit-notice" role="status" aria-live="polite">
            Maximum 5 selections allowed.
          </div>
        )}
        {error && (
          <span className="vob-field-error" role="alert">
            ⚠️ {error}
          </span>
        )}
      </div>

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
