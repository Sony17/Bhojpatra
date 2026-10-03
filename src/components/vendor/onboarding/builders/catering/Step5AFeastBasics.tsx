"use client";

import { useState } from "react";
import BuilderSectionHeader from "../common/BuilderSectionHeader";
import BuilderNav from "../common/BuilderNav";
import PhotoUploadButton from "../common/PhotoUploadButton";

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

const BEST_FOR_OPTIONS = [
  { id: "Weddings", label: "Weddings", icon: "💍" },
  { id: "Receptions", label: "Receptions", icon: "🥂" },
  { id: "Engagements", label: "Engagements", icon: "💐" },
  { id: "Birthdays", label: "Birthdays", icon: "🎂" },
  { id: "Pujas", label: "Pujas", icon: "🪔" },
  { id: "Corporate", label: "Corporate", icon: "🏢" },
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
    const newErrors: Record<string, string> = {};

    if (!data.packageName.trim()) {
      newErrors.packageName = "Package display name is required.";
    }

    if (!data.about.trim()) {
      newErrors.about = "Culinary description is required.";
    }

    if (!data.minPax || data.minPax < 10) {
      newErrors.minPax = "Minimum guest guarantee must be at least 10.";
    }

    if (data.maxCapacity && data.minPax && data.maxCapacity < data.minPax) {
      newErrors.maxCapacity = "Max capacity cannot be less than minimum guests.";
    }

    if (!data.leadHours || data.leadHours < 1) {
      newErrors.leadHours = "Please enter valid advance lead hours.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onContinue();
    }
  };

  return (
    <div className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs">
      <BuilderSectionHeader
        badge="Section 5A"
        title="Feast Basics & Specialization"
        description="Define your signature multi-course feast package details, guest count boundaries, and ideal event occasions."
        tip="A rich package name and crisp culinary story build immense trust with hosts planning large celebrations."
      />

      <div className="mt-6 space-y-6">
        {/* Package Name & Hero Image */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div>
              <label
                htmlFor="packageName"
                className="block text-xs font-bold uppercase tracking-wider text-ink"
              >
                Package Display Name <span className="text-red-500">*</span>
              </label>
              <input
                id="packageName"
                type="text"
                value={data.packageName}
                onChange={(e) => onChange({ packageName: e.target.value })}
                placeholder="e.g. Royal Awadhi Dawat, Imperial Punjabi Feast"
                className="mt-1.5 w-full rounded-control border border-cream-3 bg-cream-1/30 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-maroon focus:outline-hidden focus:ring-1 focus:ring-maroon min-h-[44px]"
              />
              {errors.packageName && (
                <p className="mt-1 text-xs text-red-600">{errors.packageName}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="about"
                className="block text-xs font-bold uppercase tracking-wider text-ink"
              >
                Culinary Description & Craft Narrative{" "}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                id="about"
                rows={4}
                value={data.about}
                onChange={(e) => onChange({ about: e.target.value })}
                placeholder="Describe your kitchen's cooking philosophy, heritage recipes, slow-dum preparations, or master chef credentials..."
                className="mt-1.5 w-full rounded-control border border-cream-3 bg-cream-1/30 p-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-maroon focus:outline-hidden focus:ring-1 focus:ring-maroon"
              />
              {errors.about && (
                <p className="mt-1 text-xs text-red-600">{errors.about}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
              Hero Cover Image
            </label>
            <PhotoUploadButton
              currentPhoto={data.image}
              kind="card"
              aspectRatio="landscape"
              label="Select Hero Photo"
              helperText="Featured on your package card · Max 5 MB"
              onPhotoUploaded={(url) => onChange({ image: url })}
              onPhotoRemoved={() => onChange({ image: undefined })}
            />
          </div>
        </div>

        {/* Best For Occasion Chips */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
            Best For Occasion Specialization
          </label>
          <div className="flex flex-wrap gap-2">
            {BEST_FOR_OPTIONS.map((opt) => {
              const active = (data.bestFor || []).includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleBestFor(opt.id)}
                  className={`inline-flex items-center gap-1.5 rounded-pill px-3.5 py-2 text-xs font-semibold transition-all min-h-[44px] ${
                    active
                      ? "border border-maroon bg-maroon text-white shadow-xs"
                      : "border border-cream-3 bg-cream-1/50 text-ink hover:border-maroon/40 hover:bg-cream-1"
                  }`}
                >
                  <span aria-hidden="true">{opt.icon}</span>
                  <span>{opt.label}</span>
                  {active && <span className="ml-1 text-[10px]">✓</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-ink-soft">
            Select celebrations where your kitchen executes exceptionally well.
          </p>
        </div>

        {/* Operational Constraints: Min Pax, Max Pax, Lead Hours */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
          <div>
            <label
              htmlFor="minPax"
              className="block text-xs font-bold uppercase tracking-wider text-ink"
            >
              Min Guests (Pax) <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <input
                id="minPax"
                type="number"
                min={10}
                max={5000}
                value={data.minPax || ""}
                onChange={(e) =>
                  onChange({ minPax: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full rounded-control border border-cream-3 bg-cream-1/30 px-3.5 py-2.5 text-sm text-ink focus:border-maroon focus:outline-hidden focus:ring-1 focus:ring-maroon min-h-[44px]"
                placeholder="50"
              />
            </div>
            {errors.minPax && (
              <p className="mt-1 text-xs text-red-600">{errors.minPax}</p>
            )}
            <p className="mt-1 text-[10px] text-ink-soft">
              Smallest headcount accepted.
            </p>
          </div>

          <div>
            <label
              htmlFor="maxCapacity"
              className="block text-xs font-bold uppercase tracking-wider text-ink"
            >
              Max Guests (Capacity)
            </label>
            <div className="relative mt-1.5">
              <input
                id="maxCapacity"
                type="number"
                min={20}
                max={10000}
                value={data.maxCapacity || ""}
                onChange={(e) =>
                  onChange({ maxCapacity: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full rounded-control border border-cream-3 bg-cream-1/30 px-3.5 py-2.5 text-sm text-ink focus:border-maroon focus:outline-hidden focus:ring-1 focus:ring-maroon min-h-[44px]"
                placeholder="1000"
              />
            </div>
            {errors.maxCapacity && (
              <p className="mt-1 text-xs text-red-600">{errors.maxCapacity}</p>
            )}
            <p className="mt-1 text-[10px] text-ink-soft">
              Largest event your crew can manage.
            </p>
          </div>

          <div>
            <label
              htmlFor="leadHours"
              className="block text-xs font-bold uppercase tracking-wider text-ink"
            >
              Advance Lead Time (Hours) <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <input
                id="leadHours"
                type="number"
                min={1}
                max={720}
                value={data.leadHours || ""}
                onChange={(e) =>
                  onChange({ leadHours: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full rounded-control border border-cream-3 bg-cream-1/30 px-3.5 py-2.5 text-sm text-ink focus:border-maroon focus:outline-hidden focus:ring-1 focus:ring-maroon min-h-[44px]"
                placeholder="48"
              />
            </div>
            {errors.leadHours && (
              <p className="mt-1 text-xs text-red-600">{errors.leadHours}</p>
            )}
            <p className="mt-1 text-[10px] text-ink-soft">
              Hours notice required before booking date.
            </p>
          </div>
        </div>
      </div>

      <BuilderNav
        onBack={onBack}
        onContinue={validateAndContinue}
        onSaveDraft={onSaveDraft}
        saving={saving}
        isFirstSection={true}
        continueLabel="Continue to Pricing & Quotas →"
      />
    </div>
  );
}
