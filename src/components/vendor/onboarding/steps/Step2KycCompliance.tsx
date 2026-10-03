"use client";

import { useState } from "react";
import { isValidGst } from "@/lib/validate";
import type { VendorBadgesState } from "@/lib/vendorMenus";
import { ContentCard, FieldError, FlowFooter, FormLabel, StepHeading, inputCls } from "../ui";

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

/** Handover: Document Uploads — GST Certificate, FSSAI Licence. */
const DOCS = [
  { key: "gst", icon: "📄", label: "GST Certificate" },
  { key: "fssai", icon: "🥗", label: "FSSAI Licence" },
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setDoc = (key: string, doc: KycDocState) => onChange({ documents: { ...data.documents, [key]: doc } });

  const upload = async (key: string, file: File) => {
    setDoc(key, { fileName: file.name, status: "uploading" });
    const fd = new FormData();
    fd.append("file", file);
    fd.append("docKey", key);
    fd.append("business", businessName || "Caterer");
    fd.append("email", email);
    try {
      const res = await fetch("/api/vendors/kyc", { method: "POST", body: fd });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.document?.id) {
        setDoc(key, { fileName: file.name, status: "error", error: result.error || "Upload failed. Please try again." });
        return;
      }
      setDoc(key, { fileName: file.name, status: "done", id: result.document.id });
    } catch {
      setDoc(key, { fileName: file.name, status: "error", error: "Network error during upload." });
    }
  };

  const handleContinue = () => {
    const e: Record<string, string> = {};
    const gst = data.gstNumber.trim();
    const fssai = data.fssaiNumber.trim();
    if (!gst) e.gstNumber = "GSTIN is required.";
    else if (!isValidGst(gst)) e.gstNumber = "Invalid GSTIN format (must be 15 alphanumeric characters).";
    if (!fssai) e.fssaiNumber = "FSSAI Licence is required.";
    else if (!/^\d{14}$/.test(fssai)) e.fssaiNumber = "FSSAI licence must be exactly 14 digits.";
    setErrors(e);
    if (Object.keys(e).length) return;
    onContinue();
  };

  return (
    <div className="animate-in fade-in duration-200">
      <StepHeading
        eyebrow="Compliance & Statutory KYC"
        heading="Statutory KYC verification"
        subtext="Submit your statutory business credentials to complete onboarding and activate commercial listings on Bhojpatra."
        mEyebrow="Statutory KYC"
        mHeading="Compliance"
        mSubtext={null}
      />

      <ContentCard>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FormLabel required htmlFor="d-gst">
              <span className="hidden sm:inline">GSTIN (Goods and Services Tax Identification)</span>
              <span className="sm:hidden">GSTIN</span>
            </FormLabel>
            <input
              id="d-gst"
              type="text"
              autoCapitalize="characters"
              maxLength={15}
              value={data.gstNumber}
              onChange={(ev) => {
                onChange({ gstNumber: ev.target.value.toUpperCase() });
                if (errors.gstNumber) setErrors((p) => ({ ...p, gstNumber: "" }));
              }}
              placeholder="e.g. 09ABCDE1234F1Z5"
              className={`${inputCls} font-mono uppercase`}
            />
            <FieldError>{errors.gstNumber}</FieldError>
          </div>
          <div>
            <FormLabel required htmlFor="d-fssai">
              <span className="hidden sm:inline">FSSAI Food Safety Licence (14 Digits)</span>
              <span className="sm:hidden">FSSAI Licence</span>
            </FormLabel>
            <input
              id="d-fssai"
              type="text"
              inputMode="numeric"
              maxLength={14}
              value={data.fssaiNumber}
              onChange={(ev) => {
                onChange({ fssaiNumber: ev.target.value.replace(/\D/g, "") });
                if (errors.fssaiNumber) setErrors((p) => ({ ...p, fssaiNumber: "" }));
              }}
              placeholder="e.g. 10000000000000"
              className={`${inputCls} font-mono`}
            />
            <FieldError>{errors.fssaiNumber}</FieldError>
          </div>
        </div>

        <div className="mt-5">
          <FormLabel>Document Uploads</FormLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DOCS.map((doc) => {
              const st = data.documents[doc.key] || { status: "idle", fileName: "" };
              return (
                <label
                  key={doc.key}
                  className="flex min-h-[64px] cursor-pointer items-center gap-3 rounded-control border-2 border-dashed border-cream bg-cream/10 p-3 hover:border-maroon/40"
                >
                  <span className="text-2xl" aria-hidden>
                    {doc.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-ink">{doc.label}</span>
                    <span className="block truncate text-[11px] text-ink/60">
                      {st.status === "uploading"
                        ? `Uploading ${st.fileName}...`
                        : st.status === "done"
                          ? `${st.fileName} (Uploaded ✓)`
                          : st.status === "error"
                            ? `⚠️ ${st.error}`
                            : "Tap to upload PDF, JPG or PNG"}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border border-maroon px-3 py-1.5 text-[11px] font-bold text-maroon">
                    {st.status === "done" ? "Replace" : "Upload"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="sr-only"
                    onChange={(ev) => {
                      const f = ev.target.files?.[0];
                      if (f) upload(doc.key, f);
                    }}
                  />
                </label>
              );
            })}
          </div>
        </div>
      </ContentCard>

      <FlowFooter onBack={onBack} onContinue={handleContinue} saving={saving} />
    </div>
  );
}
