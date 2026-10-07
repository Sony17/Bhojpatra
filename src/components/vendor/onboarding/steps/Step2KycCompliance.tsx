"use client";

import { useState } from "react";
import { isValidGst } from "@/lib/validate";
import type { VendorBadgesState } from "@/lib/vendorMenus";
import { ContentCard, FieldError, FlowFooter, R, StepHeading } from "../ui";

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
  /** Set one document against the LATEST documents map — uploads finish out of
   *  order, so a map captured when one started would drop the other's result. */
  onDocChange: (key: string, doc: KycDocState) => void;
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
  onDocChange,
  onBack,
  onContinue,
  saving = false,
}: Step2KycComplianceProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setDoc = onDocChange;

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
    if (Object.values(data.documents).some((d) => d.status === "uploading")) {
      e.documents = "Please wait for your document uploads to finish.";
    }
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
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label" htmlFor="d-gst">
              <R d="GSTIN (Goods and Services Tax Identification) *" m="GSTIN *" />
            </label>
            <input
              id="d-gst"
              type="text"
              autoCapitalize="characters"
              maxLength={15}
              className="form-input"
              style={{ textTransform: "uppercase" }}
              value={data.gstNumber}
              onChange={(ev) => {
                onChange({ gstNumber: ev.target.value.toUpperCase() });
                if (errors.gstNumber) setErrors((p) => ({ ...p, gstNumber: "" }));
              }}
              placeholder="e.g. 09ABCDE1234F1Z5"
              aria-invalid={Boolean(errors.gstNumber) || undefined}
            />
            <FieldError>{errors.gstNumber}</FieldError>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="d-fssai">
              <R d="FSSAI Food Safety Licence (14 Digits) *" m="FSSAI Licence *" />
            </label>
            <input
              id="d-fssai"
              type="text"
              inputMode="numeric"
              maxLength={14}
              className="form-input"
              value={data.fssaiNumber}
              onChange={(ev) => {
                onChange({ fssaiNumber: ev.target.value.replace(/\D/g, "") });
                if (errors.fssaiNumber) setErrors((p) => ({ ...p, fssaiNumber: "" }));
              }}
              placeholder="e.g. 10000000000000"
              aria-invalid={Boolean(errors.fssaiNumber) || undefined}
            />
            <FieldError>{errors.fssaiNumber}</FieldError>
          </div>
        </div>

        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--color-cream-30)" }}>
          <span className="form-label vob-d" style={{ marginBottom: 8, display: "block" }}>
            Document Uploads
          </span>
          <div className="form-grid-2">
            {DOCS.map((doc) => {
              const st = data.documents[doc.key] || { status: "idle", fileName: "" };
              const inputId = `kyc-doc-${doc.key}`;
              return (
                <label key={doc.key} className="photo-uploader-box" htmlFor={inputId} style={{ cursor: "pointer", position: "relative" }}>
                  <span style={{ fontSize: 28 }} aria-hidden>
                    {doc.icon}
                  </span>
                  <div className="photo-upload-meta" style={{ minWidth: 0 }}>
                    <div className="photo-upload-title">{doc.label}</div>
                    <div
                      className="photo-upload-desc"
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: st.status === "error" ? "var(--color-red)" : undefined,
                      }}
                    >
                      {st.status === "uploading" ? (
                        `Uploading ${st.fileName}...`
                      ) : st.status === "done" ? (
                        <R d={`${st.fileName} (Uploaded ✓)`} m="Uploaded ✓" />
                      ) : st.status === "error" ? (
                        `⚠️ ${st.error}`
                      ) : (
                        "PDF, JPG or PNG"
                      )}
                    </div>
                    <span className="btn-upload-photo">
                      {st.status === "done" ? "Replace File" : st.status === "uploading" ? "Uploading..." : "Upload File"}
                    </span>
                  </div>
                  <input
                    id={inputId}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    aria-label={`Upload ${doc.label}`}
                    disabled={st.status === "uploading"}
                    style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", pointerEvents: "none" }}
                    onChange={(ev) => {
                      const f = ev.target.files?.[0];
                      if (f) upload(doc.key, f);
                      ev.target.value = "";
                    }}
                  />
                </label>
              );
            })}
          </div>
          <FieldError>{errors.documents}</FieldError>
        </div>
      </ContentCard>

      <FlowFooter onBack={onBack} onContinue={handleContinue} saving={saving} />
    </div>
  );
}
