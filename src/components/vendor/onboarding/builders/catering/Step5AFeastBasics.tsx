"use client";

import { useState } from "react";
import BuilderNav from "../common/BuilderNav";
import PhotoUploadButton from "../common/PhotoUploadButton";
import { ChoiceChip, ContentCard, FieldError, FieldHint, FormLabel, R, StepHeading } from "../../ui";

export interface FeastBasicsData {
  packageName: string;
  about: string;
  bestFor: string[];
  minPax: number;
  maxCapacity: number;
  leadHours: number;
  image?: string;
}

interface Step5AFeastBasicsProps {
  data: FeastBasicsData;
  onChange: (patch: Partial<FeastBasicsData>) => void;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

/** Handover: Best For (Occasions displayed on package card). Mobile shows the first 3. */
const BEST_FOR_OPTIONS = [
  "Weddings",
  "Receptions",
  "Engagements",
  "Birthday Celebrations",
  "Family Pujas & Gatherings",
  "Corporate Galas",
];

/** Handover: Minimum Preparation Notice. */
const LEAD_OPTIONS = [
  { hours: 24, label: "24 hours notice" },
  { hours: 48, label: "48 hours notice (Standard for feasts)" },
  { hours: 72, label: "72 hours notice (3 days)" },
  { hours: 168, label: "7 days notice (Large weddings only)" },
];

export default function Step5AFeastBasics({
  data,
  onChange,
  onBack,
  onContinue,
  onSaveDraft,
  saving = false,
}: Step5AFeastBasicsProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleBestFor = (tag: string) => {
    const set = new Set(data.bestFor || []);
    if (set.has(tag)) {
      set.delete(tag);
    } else {
      set.add(tag);
    }
    onChange({ bestFor: Array.from(set) });
  };

  const validateAndContinue = () => {
    const e: Record<string, string> = {};
    if (!data.packageName.trim()) e.packageName = "Package / Feast Display Name is required.";
    if (!data.bestFor?.length) e.bestFor = "Select at least one occasion.";
    if (!data.minPax || data.minPax < 10) e.minPax = "Minimum guests must be at least 10.";
    if (data.maxCapacity && data.minPax && data.maxCapacity < data.minPax)
      e.maxCapacity = "Maximum capacity cannot be less than minimum guests.";
    setErrors(e);
    if (!Object.keys(e).length) onContinue();
  };

  const leadOptions = LEAD_OPTIONS.some((o) => o.hours === data.leadHours)
    ? LEAD_OPTIONS
    : [...LEAD_OPTIONS, { hours: data.leadHours, label: `${data.leadHours} hours notice` }];

  return (
    <div>
      <StepHeading
        eyebrow="Feast Builder · Feast Details"
        heading="Configure your signature feast booking"
        subtext="Define the package details customers see when browsing your feast offering."
        mEyebrow="Feast Details"
        mHeading="Package info"
        mSubtext={null}
      />

      <ContentCard>
        <div className="form-grid-2">
          <div className="form-group">
            <FormLabel required htmlFor="cat-pkg-name">
              <R d="Package / Feast Display Name" m="Package Name" />
            </FormLabel>
            <input
              id="cat-pkg-name"
              type="text"
              value={data.packageName}
              onChange={(ev) => onChange({ packageName: ev.target.value })}
              placeholder="e.g. Royal Awadh Wedding Feast"
              className="form-input"
            />
            <FieldHint className="vob-d">e.g. Royal Awadh Wedding Feast, Shahi Dastarkhwan</FieldHint>
            <FieldError>{errors.packageName}</FieldError>
          </div>

          <div className="form-group">
            <FormLabel required htmlFor="cat-lead-hours">
              Minimum Preparation Notice
            </FormLabel>
            <select
              id="cat-lead-hours"
              value={data.leadHours}
              onChange={(ev) => onChange({ leadHours: Number(ev.target.value) })}
              className="form-select"
            >
              {leadOptions.map((o) => (
                <option key={o.hours} value={o.hours}>
                  {o.label}
                </option>
              ))}
            </select>
            <FieldHint className="vob-d">Minimum advance notice you require before accepting a booking.</FieldHint>
          </div>
        </div>

        <div className="form-group">
          <FormLabel htmlFor="cat-pkg-desc">Culinary Heritage Story & Description</FormLabel>
          <textarea
            id="cat-pkg-desc"
            value={data.about}
            onChange={(ev) => onChange({ about: ev.target.value })}
            placeholder="Heritage multi-course feast slow-cooked on charcoal dum, celebrating centuries of Lucknow's Nawabi culinary art."
            className="form-textarea"
          />
        </div>

        <div className="form-group" style={{ marginTop: 10 }}>
          <FormLabel required>
            <R d="Best For (Occasions displayed on package card)" m="Best For" />
          </FormLabel>
          <div className="chip-grid">
            {BEST_FOR_OPTIONS.map((tag) => (
              <ChoiceChip key={tag} active={(data.bestFor || []).includes(tag)} onClick={() => toggleBestFor(tag)}>
                {tag}
              </ChoiceChip>
            ))}
          </div>
          <FieldError>{errors.bestFor}</FieldError>
        </div>

        <div
          className="form-grid-2"
          style={{ marginTop: 10, paddingTop: 12, borderTop: "1px dashed var(--color-cream-30)" }}
        >
          <div className="form-group">
            <FormLabel htmlFor="cat-min-pax">
              <R d="Minimum Guests (Min Pax Guarantee)" m="Min Guests" />
            </FormLabel>
            <input
              id="cat-min-pax"
              type="number"
              inputMode="numeric"
              min={10}
              value={data.minPax || ""}
              onChange={(ev) => onChange({ minPax: Number(ev.target.value) })}
              placeholder="50"
              className="form-input"
            />
            <FieldError>{errors.minPax}</FieldError>
          </div>
          <div className="form-group">
            <FormLabel htmlFor="cat-max-pax">
              <R d="Maximum Guest Capacity" m="Max Capacity" />
            </FormLabel>
            <input
              id="cat-max-pax"
              type="number"
              inputMode="numeric"
              value={data.maxCapacity || ""}
              onChange={(ev) => onChange({ maxCapacity: Number(ev.target.value) })}
              placeholder="1500"
              className="form-input"
            />
            <FieldError>{errors.maxCapacity}</FieldError>
          </div>
        </div>

        <div style={{ marginTop: 10, paddingTop: 12, borderTop: "1px dashed var(--color-cream-30)" }}>
          <label className="form-label vob-d" style={{ marginBottom: 8, display: "block" }}>
            Package Hero Food Photo
          </label>
          <PhotoUploadButton
            currentPhoto={data.image}
            kind="card"
            aspectRatio="landscape"
            title={<R d="Feast Cover Photography" m="Feast Cover Photo" />}
            label="Change Photo 📷"
            helperText="Authentic royal feast spread photo shown on your catalog card & detail page."
            onPhotoUploaded={(url) => onChange({ image: url })}
            onPhotoRemoved={() => onChange({ image: undefined })}
          />
        </div>
      </ContentCard>

      <BuilderNav onBack={onBack} onContinue={validateAndContinue} onSaveDraft={onSaveDraft} saving={saving} />
    </div>
  );
}
