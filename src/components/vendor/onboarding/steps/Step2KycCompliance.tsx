"use client";

import { useState } from "react";
import { isValidGst } from "@/lib/validate";
import type { RecognitionBadgeKey, VendorBadgesState } from "@/lib/vendorMenus";
import BadgeApplicationModal, { BADGE_DEFINITIONS } from "../components/BadgeApplicationModal";
import { Button } from "@/components/ui";

export interface KycDocState {
  fileName: string;
  status: "idle" | "uploading" | "done" | "error";
  id?: string;
  error?: string;
}

export interface Step2Data {
  gstNumber: string;
  fssaiNumber: string;
  documents: Record<string, KycDocState>;
  badges: VendorBadgesState;
}

interface Step2KycComplianceProps {
  data: Step2Data;
  businessName: string;
  email: string;
  onChange: (updated: Partial<Step2Data>) => void;
  onBack: () => void;
  onContinue: () => void;
  saving?: boolean;
}

const REQUIRED_DOCS = [
  { key: "gst", label: "GST Registration Certificate", hint: "PDF or clear photo of Form GST REG-06" },
  { key: "fssai", label: "FSSAI Food Safety License", hint: "Active state / central food license certificate" },
  { key: "ownerId", label: "Owner Photo ID (PAN / Aadhaar)", hint: "Government photo ID of authorized representative" },
  { key: "businessProof", label: "Business Proof / Cancelled Cheque", hint: "For settlement account verification" },
];

export default function Step2KycCompliance({
  data,
  businessName,
  email,
  onChange,
  onBack,
  onContinue,
  saving = false,
}: Step2KycComplianceProps) {
  const [selectedBadgeForModal, setSelectedBadgeForModal] = useState<RecognitionBadgeKey | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFileUpload = async (key: string, file: File) => {
    // 1. Mark uploading
    onChange({
      documents: {
        ...data.documents,
        [key]: { fileName: file.name, status: "uploading" },
      },
    });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("docKey", key);
    formData.append("business", businessName || "Caterer");
    formData.append("email", email);

    try {
      const res = await fetch("/api/vendors/kyc", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok || !result.document?.id) {
        onChange({
          documents: {
            ...data.documents,
            [key]: {
              fileName: file.name,
              status: "error",
              error: result.error || "Upload failed. Please try again.",
            },
          },
        });
        return;
      }

      onChange({
        documents: {
          ...data.documents,
          [key]: { fileName: file.name, status: "done", id: result.document.id },
        },
      });
    } catch {
      onChange({
        documents: {
          ...data.documents,
          [key]: {
            fileName: file.name,
            status: "error",
            error: "Network error during upload.",
          },
        },
      });
    }
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (data.gstNumber.trim() && !isValidGst(data.gstNumber.trim())) {
      newErrors.gstNumber = "Invalid GSTIN format (must be 15 alphanumeric characters).";
    }

    if (data.fssaiNumber.trim() && !/^\d{14}$/.test(data.fssaiNumber.trim())) {
      newErrors.fssaiNumber = "FSSAI license must be exactly 14 digits.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onContinue();
  };

  const badgeKeys: RecognitionBadgeKey[] = ["verified", "icon", "heritage"];

  return (
    <form onSubmit={handleContinue} className="space-y-8 animate-in fade-in duration-200">
      {/* ── Section A: Registration & Tax Numbers ── */}
      <section className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs space-y-5">
        <div>
          <h3 className="text-base font-bold text-ink sm:text-lg">
            1. Statutory Licenses & Tax Identifiers
          </h3>
          <p className="text-xs text-ink-soft mt-0.5">
            Legitimate catering operations require statutory registration for invoicing and client trust.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* GSTIN */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">
              GSTIN (Goods and Services Tax Number)
            </label>
            <input
              type="text"
              maxLength={15}
              value={data.gstNumber}
              onChange={(e) => {
                onChange({ gstNumber: e.target.value.toUpperCase().trim() });
                if (errors.gstNumber) setErrors((prev) => ({ ...prev, gstNumber: "" }));
              }}
              placeholder="e.g. 09AAACH7409R1ZZ"
              className="w-full rounded-control border border-cream-3 bg-cream/40 px-3.5 py-2.5 text-sm font-mono text-ink placeholder:text-ink-soft/60 outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30 uppercase"
            />
            {errors.gstNumber ? (
              <p className="mt-1 text-xs text-red-600 font-medium">{errors.gstNumber}</p>
            ) : (
              <p className="mt-1 text-[11px] text-ink-soft">
                15-character state GSTIN registered to your catering business.
              </p>
            )}
          </div>

          {/* FSSAI */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">
              FSSAI Food Safety License / Registration
            </label>
            <input
              type="text"
              maxLength={14}
              value={data.fssaiNumber}
              onChange={(e) => {
                onChange({ fssaiNumber: e.target.value.trim() });
                if (errors.fssaiNumber) setErrors((prev) => ({ ...prev, fssaiNumber: "" }));
              }}
              placeholder="e.g. 12722055000123"
              className="w-full rounded-control border border-cream-3 bg-cream/40 px-3.5 py-2.5 text-sm font-mono text-ink placeholder:text-ink-soft/60 outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
            />
            {errors.fssaiNumber ? (
              <p className="mt-1 text-xs text-red-600 font-medium">{errors.fssaiNumber}</p>
            ) : (
              <p className="mt-1 text-[11px] text-ink-soft">
                14-digit FSSAI number displayed on food safety audits.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Section B: Document Uploads ── */}
      <section className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs space-y-5">
        <div>
          <h3 className="text-base font-bold text-ink sm:text-lg">
            2. Compliance Document Uploads
          </h3>
          <p className="text-xs text-ink-soft mt-0.5">
            Files are stored securely on Bhojpatra servers and reviewed exclusively by compliance administrators.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {REQUIRED_DOCS.map((doc) => {
            const state = data.documents[doc.key] || { status: "idle", fileName: "" };
            return (
              <div
                key={doc.key}
                className="rounded-control border border-cream-3 bg-cream/30 p-4 flex flex-col justify-between"
              >
                <div>
                  <h4 className="text-sm font-semibold text-ink">{doc.label}</h4>
                  <p className="text-xs text-ink-soft mt-0.5">{doc.hint}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-cream-2/70 flex items-center justify-between gap-2">
                  {state.status === "uploading" ? (
                    <div className="flex items-center gap-2 text-xs text-amber-700">
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                      <span>Uploading {state.fileName}...</span>
                    </div>
                  ) : state.status === "done" ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                      <span>✓ Uploaded:</span>
                      <span className="truncate max-w-[140px] text-ink">{state.fileName}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-ink-soft/70">
                      {state.status === "error" ? (
                        <span className="text-red-600">{state.error}</span>
                      ) : (
                        "No file chosen"
                      )}
                    </span>
                  )}

                  <label className="cursor-pointer shrink-0 rounded-control bg-white px-3 py-1.5 text-xs font-semibold text-ink border border-cream-3 shadow-xs hover:border-maroon hover:text-maroon transition-colors">
                    <span>{state.status === "done" ? "Replace" : "Upload"}</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(doc.key, file);
                      }}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Section C: Recognition Badges ── */}
      <section className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs space-y-5">
        <div>
          <h3 className="text-base font-bold text-ink sm:text-lg">
            3. Bhojpatra Recognition Badges
          </h3>
          <p className="text-xs text-ink-soft mt-0.5">
            Apply for prestigious trust badges to elevate your visibility across customer dawat planning.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {badgeKeys.map((key) => {
            const meta = BADGE_DEFINITIONS[key];
            const isGranted = data.badges.granted?.includes(key);
            const isApplied = data.badges.applied?.includes(key);

            return (
              <div
                key={key}
                className="flex flex-col justify-between rounded-control border border-cream-3 bg-cream/20 p-4 transition-all hover:bg-cream/40"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xl">{meta.icon}</span>
                    {isGranted ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                        ✓ Granted
                      </span>
                    ) : isApplied ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                        ⏳ Under Review
                      </span>
                    ) : (
                      <span className="rounded-full bg-cream-2 px-2.5 py-0.5 text-[11px] font-medium text-ink-soft">
                        Available
                      </span>
                    )}
                  </div>
                  <h4 className="mt-3 text-sm font-bold text-ink">{meta.title}</h4>
                  <p className="text-[11px] text-ink-soft">{meta.badgeTag}</p>
                  <p className="mt-2 text-xs text-ink-soft line-clamp-3 leading-relaxed">
                    {meta.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-cream-2/70">
                  <Button
                    type="button"
                    variant={isGranted ? "secondary" : isApplied ? "secondary" : "secondary"}
                    size="sm"
                    fullWidth
                    onClick={() => setSelectedBadgeForModal(key)}
                  >
                    {isGranted ? "View Badge" : isApplied ? "View Status" : "Apply for Badge"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Badge application modal */}
      {selectedBadgeForModal && (
        <BadgeApplicationModal
          badgeKey={selectedBadgeForModal}
          badgesState={data.badges}
          onClose={() => setSelectedBadgeForModal(null)}
          onSuccess={(updatedBadges) => onChange({ badges: updatedBadges })}
        />
      )}

      {/* ── Wizard Actions ── */}
      <div className="sticky bottom-0 z-20 flex items-center justify-between rounded-card border border-cream-3 bg-white/95 p-4 shadow-md backdrop-blur-md">
        <Button type="button" variant="secondary" size="lg" onClick={onBack}>
          ← Back to Identity
        </Button>
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? "Saving..." : "Save & Continue to Services →"}
        </Button>
      </div>
    </form>
  );
}
