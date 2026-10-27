"use client";

import { useState } from "react";
import { isValidAadhaar, isValidGst, isValidPan, panOfGstin } from "@/lib/validate";
import {
  IFSC_RE,
  PAYOUT_ACCOUNT_TYPES,
  normalizeAccountNumber,
  normalizeIfsc,
  payoutAccountErrors,
  type VendorPayoutAccount,
} from "@/lib/payoutAccount";
import type { VendorBadgesState } from "@/lib/vendorMenus";
import { VENDOR_GST_RATES, type VendorGstRate } from "@/lib/bookingPricing";
import { CardTitle, ChoiceChip, ContentCard, FieldError, FlowFooter, R, StepHeading } from "../ui";

export interface KycDocState {
  fileName: string;
  status: "idle" | "uploading" | "done" | "error";
  id?: string;
  error?: string;
}

/** The payout form as typed — the confirm field never leaves the wizard. */
export type PayoutForm = Partial<VendorPayoutAccount> & { confirmAccountNumber?: string };

export interface Step2Data {
  gstNumber: string;
  panNumber: string;
  aadhaarNumber: string;
  fssaiNumber: string;
  /** GST charged to customers on food — 18% / 5% / No GST. */
  gstRate?: VendorGstRate;
  payout: PayoutForm;
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

/** Handover: Document Uploads — GST Certificate, PAN, Aadhaar, FSSAI Licence. */
const DOCS = [
  { key: "gst", icon: "📄", label: "GST Certificate" },
  { key: "pan", icon: "💳", label: "PAN Card" },
  { key: "aadhaar", icon: "🪪", label: "Aadhaar Card" },
  { key: "fssai", icon: "🥗", label: "FSSAI Licence" },
];

/** Optional proof for the payout account, uploaded in the payout card. */
const CHEQUE_DOC = { key: "cheque", icon: "🏦", label: "Cancelled Cheque / Passbook" };
/** Optional UPI QR code image the admin can scan to pay. */
const UPI_QR_DOC = { key: "upiQr", icon: "📱", label: "UPI QR Code" };

type IfscLookup = "idle" | "loading" | "found" | "not-found" | "error";

/** "234567890124" → "2345 6789 0124" while typing. */
const groupAadhaar = (digits: string) => digits.replace(/(\d{4})(?=\d)/g, "$1 ");

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
  const [ifscLookup, setIfscLookup] = useState<IfscLookup>("idle");
  const payout = data.payout;

  const setPayout = (patch: PayoutForm) => {
    onChange({ payout: { ...payout, ...patch } });
    const touched = Object.keys(patch).map((k) => `payout.${k}`);
    if (touched.some((k) => errors[k])) {
      setErrors((p) => Object.fromEntries(Object.entries(p).filter(([k]) => !touched.includes(k))));
    }
  };

  // Fill bank name + branch from the IFSC once it's complete. Still editable.
  const lookUpIfsc = async (ifsc: string) => {
    setIfscLookup("loading");
    try {
      const res = await fetch(`/api/vendor/ifsc?code=${ifsc}`);
      if (res.status === 404) {
        setIfscLookup("not-found");
        return;
      }
      const found = (await res.json().catch(() => ({}))) as { bank?: string; branch?: string };
      if (!res.ok || !found.bank) {
        setIfscLookup("error");
        return;
      }
      onChange({
        payout: { ...payout, ifsc, bankName: found.bank, branch: found.branch || payout.branch },
      });
      setIfscLookup("found");
    } catch {
      setIfscLookup("error");
    }
  };

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
    const pan = data.panNumber.trim();
    const aadhaar = data.aadhaarNumber.trim();
    // Either a GSTIN, or PAN + Aadhaar together. Whatever is filled must be valid.
    if (gst && !isValidGst(gst)) e.gstNumber = "Invalid GSTIN format (must be 15 alphanumeric characters).";
    if (pan && !isValidPan(pan)) e.panNumber = "Invalid PAN format (e.g. ABCDE1234F).";
    else if (pan && isValidGst(gst) && panOfGstin(gst) !== pan) e.panNumber = "PAN must match the PAN inside your GSTIN.";
    if (aadhaar && !isValidAadhaar(aadhaar)) e.aadhaarNumber = "Please enter a valid 12-digit Aadhaar number.";
    if (!gst) {
      if (!pan && !aadhaar) e.gstNumber = "Enter your GSTIN, or your PAN and Aadhaar number below.";
      else if (!pan) e.panNumber = "Without a GSTIN, PAN is required.";
      else if (!aadhaar) e.aadhaarNumber = "Without a GSTIN, Aadhaar is required.";
    }
    if (data.gstRate === undefined) e.gstRate = "Choose the GST you charge customers.";
    else if (data.gstRate > 0 && !isValidGst(gst)) e.gstRate = "Without a GSTIN you can't charge GST — choose No GST.";
    if (!fssai) e.fssaiNumber = "FSSAI Licence is required.";
    else if (!/^\d{14}$/.test(fssai)) e.fssaiNumber = "FSSAI licence must be exactly 14 digits.";
    for (const [field, msg] of Object.entries(payoutAccountErrors({ ...payout, confirmAccountNumber: payout.confirmAccountNumber ?? "" }))) {
      if (msg) e[`payout.${field}`] = msg;
    }
    if (Object.values(data.documents).some((d) => d.status === "uploading")) {
      e.documents = "Please wait for your document uploads to finish.";
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    onContinue();
  };

  const renderDocTile = (
    doc: { key: string; icon: string; label: string },
    accept = ".pdf,.png,.jpg,.jpeg",
    hint = "PDF, JPG or PNG",
  ) => {
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
              hint
            )}
          </div>
          <span className="btn-upload-photo">
            {st.status === "done" ? "Replace File" : st.status === "uploading" ? "Uploading..." : "Upload File"}
          </span>
        </div>
        <input
          id={inputId}
          type="file"
          accept={accept}
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
        <p className="field-hint" style={{ display: "block", marginBottom: 12 }}>
          Enter your <strong>GSTIN</strong>, <em>or</em> your <strong>PAN and Aadhaar</strong> if you
          aren&apos;t GST-registered. *
        </p>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label" htmlFor="d-gst">
              <R d="GSTIN (Goods and Services Tax Identification)" m="GSTIN" />
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
                const gstNumber = ev.target.value.toUpperCase();
                // A GSTIN carries its PAN — fill it in while the PAN is empty.
                const pan = panOfGstin(gstNumber);
                onChange(pan && !data.panNumber ? { gstNumber, panNumber: pan } : { gstNumber });
                if (errors.gstNumber) setErrors((p) => ({ ...p, gstNumber: "" }));
              }}
              placeholder="e.g. 09ABCDE1234F1Z5"
              aria-invalid={Boolean(errors.gstNumber) || undefined}
            />
            <FieldError>{errors.gstNumber}</FieldError>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="d-pan">
              <R d="PAN (Permanent Account Number)" m="PAN" />
            </label>
            <input
              id="d-pan"
              type="text"
              autoCapitalize="characters"
              maxLength={10}
              className="form-input"
              style={{ textTransform: "uppercase" }}
              value={data.panNumber}
              onChange={(ev) => {
                onChange({ panNumber: ev.target.value.replace(/\s/g, "").toUpperCase() });
                if (errors.panNumber) setErrors((p) => ({ ...p, panNumber: "" }));
              }}
              placeholder="e.g. ABCDE1234F"
              aria-invalid={Boolean(errors.panNumber) || undefined}
            />
            <FieldError>{errors.panNumber}</FieldError>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="d-aadhaar">
              <R d="Owner's Aadhaar Number (12 Digits)" m="Aadhaar" />
            </label>
            <input
              id="d-aadhaar"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={14}
              className="form-input"
              value={groupAadhaar(data.aadhaarNumber)}
              onChange={(ev) => {
                onChange({ aadhaarNumber: ev.target.value.replace(/\D/g, "").slice(0, 12) });
                if (errors.aadhaarNumber) setErrors((p) => ({ ...p, aadhaarNumber: "" }));
              }}
              placeholder="e.g. 2345 6789 0124"
              aria-invalid={Boolean(errors.aadhaarNumber) || undefined}
            />
            <FieldError>{errors.aadhaarNumber}</FieldError>
            <span className="field-hint">Customers only ever see the last 4 digits.</span>
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

        {/* GST on food — billed on every customer booking and payment. Only a
            GSTIN holder may charge GST; without one it's No GST. */}
        <div className="form-group" style={{ marginTop: 12 }}>
          <span className="form-label" id="d-gst-rate">
            <R d="GST you charge customers on food *" m="GST on food *" />
          </span>
          <div role="group" aria-labelledby="d-gst-rate" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {VENDOR_GST_RATES.map((rate) => (
              <ChoiceChip
                key={rate}
                active={data.gstRate === rate}
                disabled={rate > 0 && !isValidGst(data.gstNumber.trim())}
                onClick={() => {
                  onChange({ gstRate: rate });
                  if (errors.gstRate) setErrors((p) => ({ ...p, gstRate: "" }));
                }}
              >
                {rate === 0 ? "No GST" : `${rate}% GST`}
              </ChoiceChip>
            ))}
          </div>
          <FieldError>{errors.gstRate}</FieldError>
          <span className="field-hint">
            {isValidGst(data.gstNumber.trim())
              ? "Added to the customer's bill once our team has verified your GSTIN (until then: No GST). Service packages and venue fees stay at 18%."
              : "Add a GSTIN above to charge 5% or 18% GST."}
          </span>
        </div>

        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--color-cream-30)" }}>
          <span className="form-label vob-d" style={{ marginBottom: 8, display: "block" }}>
            Document Uploads
          </span>
          <div className="form-grid-2">
            {DOCS.map((d) => renderDocTile(d))}
          </div>
          <FieldError>{errors.documents}</FieldError>
        </div>
      </ContentCard>

      <ContentCard>
        <CardTitle badge="Optional">Payout details</CardTitle>
        <p className="field-hint" style={{ marginBottom: 12 }}>
          Where we pay your event advances and settlements — add a bank account, a UPI ID or your UPI QR
          code (any one is enough, you can also add it later). Only the Bhojpatra team sees it.
        </p>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label" htmlFor="d-holder">
              <R d="Account Holder Name (as per bank)" m="Account holder" />
            </label>
            <input
              id="d-holder"
              type="text"
              autoComplete="off"
              maxLength={100}
              className="form-input"
              value={payout.holderName ?? ""}
              onChange={(ev) => setPayout({ holderName: ev.target.value })}
              placeholder="e.g. Annapurna Caterers"
              aria-invalid={Boolean(errors["payout.holderName"]) || undefined}
            />
            <FieldError>{errors["payout.holderName"]}</FieldError>
          </div>
          <div className="form-group">
            <span className="form-label">
              <R d="Account Type" m="Account type" />
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PAYOUT_ACCOUNT_TYPES.map((t) => (
                <ChoiceChip key={t} active={payout.accountType === t} onClick={() => setPayout({ accountType: t })}>
                  {t}
                </ChoiceChip>
              ))}
            </div>
            <FieldError>{errors["payout.accountType"]}</FieldError>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="d-acct">
              <R d="Bank Account Number" m="Account number" />
            </label>
            <input
              id="d-acct"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={18}
              className="form-input"
              value={payout.accountNumber ?? ""}
              onChange={(ev) => setPayout({ accountNumber: normalizeAccountNumber(ev.target.value) })}
              placeholder="9–18 digits"
              aria-invalid={Boolean(errors["payout.accountNumber"]) || undefined}
            />
            <FieldError>{errors["payout.accountNumber"]}</FieldError>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="d-acct2">
              <R d="Confirm Account Number" m="Confirm account" />
            </label>
            <input
              id="d-acct2"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={18}
              className="form-input"
              value={payout.confirmAccountNumber ?? ""}
              onChange={(ev) => setPayout({ confirmAccountNumber: normalizeAccountNumber(ev.target.value) })}
              onPaste={(ev) => ev.preventDefault()}
              placeholder="Re-enter account number"
              aria-invalid={Boolean(errors["payout.confirmAccountNumber"]) || undefined}
            />
            <FieldError>{errors["payout.confirmAccountNumber"]}</FieldError>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="d-ifsc">
              <R d="IFSC Code" m="IFSC" />
            </label>
            <input
              id="d-ifsc"
              type="text"
              autoCapitalize="characters"
              maxLength={11}
              className="form-input"
              style={{ textTransform: "uppercase" }}
              value={payout.ifsc ?? ""}
              onChange={(ev) => {
                const ifsc = normalizeIfsc(ev.target.value);
                setPayout({ ifsc });
                if (IFSC_RE.test(ifsc) && ifsc !== payout.ifsc) lookUpIfsc(ifsc);
                else setIfscLookup("idle");
              }}
              placeholder="e.g. HDFC0001234"
              aria-invalid={Boolean(errors["payout.ifsc"]) || undefined}
            />
            <FieldError>{errors["payout.ifsc"]}</FieldError>
            <span className="field-hint">
              {ifscLookup === "loading"
                ? "Looking up branch…"
                : ifscLookup === "found"
                  ? "✓ Bank and branch filled in"
                  : ifscLookup === "not-found"
                    ? "We couldn't find this IFSC. Please check it."
                    : "Printed on your cheque book or passbook."}
            </span>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="d-bank">
              Bank Name
            </label>
            <input
              id="d-bank"
              type="text"
              maxLength={100}
              className="form-input"
              value={payout.bankName ?? ""}
              onChange={(ev) => setPayout({ bankName: ev.target.value })}
              placeholder="Filled from IFSC"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="d-branch">
              Branch
            </label>
            <input
              id="d-branch"
              type="text"
              maxLength={120}
              className="form-input"
              value={payout.branch ?? ""}
              onChange={(ev) => setPayout({ branch: ev.target.value })}
              placeholder="Filled from IFSC"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="d-upi">
              <R d="UPI ID" m="UPI ID" />
            </label>
            <input
              id="d-upi"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              maxLength={100}
              className="form-input"
              value={payout.upiId ?? ""}
              onChange={(ev) => setPayout({ upiId: ev.target.value.replace(/\s/g, "") })}
              placeholder="e.g. annapurna@okhdfcbank"
              aria-invalid={Boolean(errors["payout.upiId"]) || undefined}
            />
            <FieldError>{errors["payout.upiId"]}</FieldError>
          </div>
        </div>
        <div className="form-grid-2" style={{ marginTop: 4 }}>
          {renderDocTile(CHEQUE_DOC)}
          {renderDocTile(UPI_QR_DOC, ".png,.jpg,.jpeg", "PNG or JPG of your UPI QR")}
        </div>
      </ContentCard>

      <FlowFooter onBack={onBack} onContinue={handleContinue} saving={saving} />
    </div>
  );
}
