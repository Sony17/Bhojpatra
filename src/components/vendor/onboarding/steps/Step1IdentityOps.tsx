"use client";

import { useState, type ReactNode } from "react";
import { indianStates } from "@/lib/data";
import type { VendorDietaryOffering } from "@/lib/vendorMenus";
import DietaryOfferingSelector from "../components/DietaryOfferingSelector";
import { ChipAddInput, ChoiceChip, ContentCard, FieldError, FlowFooter, R, StepHeading } from "../ui";

export interface Step1Data {
  ownerName: string;
  businessName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  serviceCities: string[];
  cuisines: string[];
  dietaryOffering?: VendorDietaryOffering;
  googleRating?: number;
  googleReviews?: number;
  accountId?: string;
}

interface Step1IdentityOpsProps {
  data: Step1Data;
  onChange: (updated: Partial<Step1Data>) => void;
  onContinue: () => void;
  onSignIn: () => void;
  saving?: boolean;
}

/** Handover: Primary Kitchen City options. */
export const KITCHEN_CITIES = [
  "Lucknow", "Kanpur", "Varanasi", "Prayagraj", "Ayodhya", "Gorakhpur", "Noida", "Ghaziabad", "Agra",
  "Delhi NCR", "Mumbai", "Bengaluru", "Hyderabad", "Kolkata", "Chennai", "Pune", "Ahmedabad", "Jaipur",
  "Chandigarh", "Indore", "Bhopal", "Patna", "Dehradun",
];

/** Handover: Primary Culinary Specialties & Cuisines chips. */
const CUISINE_CHIPS = [
  "Awadhi", "Mughlai", "North Indian", "Tandoori & Grills", "Indo-Chinese", "South Indian",
  "Artisanal Sweets", "Banarasi Chaat",
];

/** Handover: Serviceable Coverage Cities chips (all shown on phone too — full parity with desktop). */
const COVERAGE_CHIPS = [
  "Lucknow", "Kanpur", "Ayodhya", "Varanasi", "Prayagraj", "Gorakhpur", "Agra", "Delhi NCR", "Noida",
  "Mumbai", "Bengaluru", "Hyderabad", "Kolkata", "Jaipur", "Pune",
];

function withExtras(base: string[], selected: string[]) {
  const extra = selected.filter((s) => !base.some((b) => b.toLowerCase() === s.toLowerCase()));
  return [...base, ...extra];
}

export default function Step1IdentityOps({
  data,
  onChange,
  onContinue,
  onSignIn,
  saving = false,
}: Step1IdentityOpsProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customCuisine, setCustomCuisine] = useState("");
  const [customCity, setCustomCity] = useState("");
  // Values carried over from signup render read-only. A value the signup did
  // not capture (business name / mobile) is asked here once, inline.
  const [editingBiz, setEditingBiz] = useState(!data.businessName);
  const [editingPhone, setEditingPhone] = useState(!data.phone);

  const toggle = (key: "cuisines" | "serviceCities", value: string) => {
    const list = data[key] || [];
    onChange({ [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] });
    if (errors[key]) setErrors((p) => ({ ...p, [key]: "" }));
  };

  const addCustom = (key: "cuisines" | "serviceCities", raw: string, reset: () => void) => {
    const v = raw.trim();
    if (!v) return;
    const list = data[key] || [];
    if (!list.some((i) => i.toLowerCase() === v.toLowerCase())) onChange({ [key]: [...list, v] });
    reset();
  };

  const handleContinue = () => {
    const e: Record<string, string> = {};
    if (!data.dietaryOffering) e.dietaryOffering = "Please select your kitchen's dietary offering before proceeding.";
    if (!data.businessName.trim()) e.businessName = "Registered Business Name is required.";
    if (!data.city.trim()) e.city = "Primary Kitchen City is required.";
    if (!data.state.trim()) e.state = "State is required.";
    if (!data.serviceCities?.length) e.serviceCities = "Select at least one serviceable coverage city.";
    if (!data.cuisines?.length) e.cuisines = "Select at least one cuisine.";
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) {
      if (first === "businessName") setEditingBiz(true);
      document.getElementById(`field-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    onContinue();
  };

  const editBiz = (v: string) => {
    onChange({ businessName: v });
    if (errors.businessName) setErrors((p) => ({ ...p, businessName: "" }));
  };
  const editPhone = (v: string) => onChange({ phone: v });

  const cityOptions = withExtras(KITCHEN_CITIES, data.city ? [data.city] : []);
  const cuisineChips = withExtras(CUISINE_CHIPS, data.cuisines || []);
  const coverageChips = withExtras(COVERAGE_CHIPS, data.serviceCities || []);

  /* Editable account values (business name / WhatsApp mobile). */
  const bizInput = (compact: boolean, id?: string) => (
    <input
      id={id}
      type="text"
      className="form-input"
      value={data.businessName}
      autoComplete="off"
      onChange={(e) => editBiz(e.target.value)}
      placeholder="e.g. Royal Awadh Caterers"
      aria-label="Registered Business Name"
      style={compact ? { maxWidth: "60%", padding: "6px 10px" } : { padding: "6px 10px" }}
    />
  );
  const phoneInput = (compact: boolean, id?: string) => (
    <div className="input-with-prefix" style={compact ? { maxWidth: "60%" } : undefined}>
      <span className="input-prefix" style={{ padding: "6px 8px", whiteSpace: "nowrap", flexShrink: 0 }}>
        +91
      </span>
      <input
        id={id}
        type="tel"
        className="form-input"
        value={data.phone}
        autoComplete="off"
        onChange={(e) => editPhone(e.target.value)}
        placeholder="10-digit mobile number"
        aria-label="Registered WhatsApp Mobile"
        style={{ padding: "6px 10px" }}
      />
    </div>
  );
  const editLink = (onClick: () => void, label: string) => (
    <button
      type="button"
      className="btn-badge-toggle-req"
      onClick={onClick}
      aria-label={`Edit ${label}`}
      style={{ fontSize: 11, minHeight: 24 }}
    >
      Edit ✎
    </button>
  );
  const phoneDisplay = data.phone ? `+91 ${data.phone}` : "—";

  return (
    <div className="animate-in fade-in duration-200">
      <StepHeading
        eyebrow="Vendor Identity & Operations"
        heading="Your catering business identity"
        subtext="Enter your business identity once. It will be reused across all your feast packages, stalls, and gifting storefronts."
        mEyebrow="Vendor Identity"
        mHeading="Business details"
        mSubtext="Collected once and reflected everywhere."
      />

      <ContentCard>
        {/* Existing Vendor Direct Sign In Banner */}
        <div className="existing-vendor-signin-banner">
          <div className="signin-banner-text">
            <strong>
              <R d="Already registered as a Bhojpatra Vendor?" m="Registered Vendor?" />
            </strong>
            <span>
              <R
                d="Directly sign in to access your vendor dashboard, active pipeline, and kitchen orders."
                m="Sign in directly to your vendor dashboard."
              />
            </span>
          </div>
          <button type="button" className="btn-banner-signin" onClick={onSignIn}>
            <R d="Sign In to Dashboard →" m="Sign In →" />
          </button>
        </div>

        {/* Mandatory Dietary Offering */}
        <DietaryOfferingSelector
          id="field-dietaryOffering"
          value={data.dietaryOffering}
          onChange={(diet) => {
            onChange({ dietaryOffering: diet });
            if (errors.dietaryOffering) setErrors((p) => ({ ...p, dietaryOffering: "" }));
          }}
          error={errors.dietaryOffering}
        />

        <div id="field-businessName">
          {/* Verified Vendor Account Details — desktop */}
          <div className="vendor-account-reused-card vob-d-flex" style={{ flexDirection: "column" }}>
            <div className="account-reused-header">
              <div className="account-reused-title">
                <span className="account-verified-icon">✓</span>
                <span>Verified Vendor Account Details</span>
                <span className="vob-badge">Reused from Signup</span>
              </div>
              {data.accountId && (
                <span style={{ fontSize: 11.5, color: "var(--color-black-60)" }}>
                  Account ID: <strong>{data.accountId}</strong>
                </span>
              )}
            </div>
            <div className="account-reused-grid">
              <AccountItem label="Primary Account Holder" value={data.ownerName || "—"} />
              <AccountItem
                label="Registered Business Name"
                labelFor="d-biz-name"
                value={
                  editingBiz ? (
                    bizInput(false, "d-biz-name")
                  ) : (
                    <>
                      {data.businessName} {editLink(() => setEditingBiz(true), "Registered Business Name")}
                    </>
                  )
                }
              />
              <AccountItem
                label="Registered WhatsApp Mobile"
                labelFor="d-phone"
                value={
                  editingPhone ? (
                    phoneInput(false, "d-phone")
                  ) : (
                    <>
                      {phoneDisplay} {editLink(() => setEditingPhone(true), "Registered WhatsApp Mobile")}
                    </>
                  )
                }
              />
              <AccountItem label="Registered Account Email" value={data.email || "—"} />
            </div>
            <FieldError>{errors.businessName}</FieldError>
            <div className="account-reused-hint">
              ℹ️ Linked directly to your active Bhojpatra vendor login. These credentials are automatically preserved
              and never requested again.
            </div>
          </div>

          {/* Verified Vendor Account Details — phone */}
          <div
            className="vendor-account-reused-card mobile-reused-card vob-m-flex"
            style={{ flexDirection: "column" }}
          >
            <div className="account-reused-header">
              <div className="account-reused-title">
                <span className="account-verified-icon">✓</span>
                <span style={{ fontSize: 12, fontWeight: 800 }}>Signup Details Linked</span>
              </div>
              <span className="vob-badge" style={{ fontSize: 10 }}>
                Reused
              </span>
            </div>
            <div className="mobile-account-list">
              <MobileRow label="Owner:" value={data.ownerName || "—"} />
              <MobileRow
                label="Business:"
                labelFor="m-biz-name"
                editing={editingBiz}
                input={bizInput(true, "m-biz-name")}
                value={data.businessName}
                onEdit={() => setEditingBiz(true)}
              />
              <MobileRow
                label="Mobile:"
                labelFor="m-phone"
                editing={editingPhone}
                input={phoneInput(true, "m-phone")}
                value={phoneDisplay}
                onEdit={() => setEditingPhone(true)}
              />
              <MobileRow label="Email:" value={data.email || "—"} />
            </div>
            <FieldError>{errors.businessName}</FieldError>
            <div className="account-reused-hint" style={{ fontSize: 11 }}>
              ℹ️ Reused from active signup account. No re-entry required.
            </div>
          </div>
        </div>

        <div className="card-title-row vob-d-flex">
          <span className="card-title">Commercial Kitchen Operations</span>
        </div>

        <div className="form-grid-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="form-group" id="field-city">
            <label className="form-label" htmlFor="d-city">
              <R d="Primary Kitchen City" m="City" /> <span className="required">*</span>
            </label>
            <select
              id="d-city"
              className="form-select"
              value={data.city}
              onChange={(e) => onChange({ city: e.target.value })}
            >
              {!data.city && <option value="">Select city</option>}
              {cityOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <FieldError>{errors.city}</FieldError>
          </div>

          <div className="form-group" id="field-state">
            <label className="form-label" htmlFor="d-state">
              State <span className="required">*</span>
            </label>
            <select
              id="d-state"
              className="form-select"
              value={data.state}
              onChange={(e) => onChange({ state: e.target.value })}
            >
              {!data.state && <option value="">Select state</option>}
              {indianStates.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <FieldError>{errors.state}</FieldError>
          </div>
        </div>

        {/* Cuisines Multi-Select */}
        <div className="form-group" id="field-cuisines" style={{ marginTop: 10 }}>
          <span className="form-label">
            <R d="Primary Culinary Specialties & Cuisines" m="Cuisines" />
          </span>
          <div className="chip-grid" data-chip-type="cuisine">
            {cuisineChips.map((c) => (
              <ChoiceChip key={c} active={data.cuisines.includes(c)} onClick={() => toggle("cuisines", c)}>
                {c}
              </ChoiceChip>
            ))}
            <span className="vob-d">
              <ChipAddInput
                id="input-custom-cuisine"
                value={customCuisine}
                onChange={setCustomCuisine}
                onAdd={() => addCustom("cuisines", customCuisine, () => setCustomCuisine(""))}
                placeholder="+ Custom cuisine"
              />
            </span>
            <span className="vob-m">
              <ChipAddInput
                id="m-input-custom-cuisine"
                value={customCuisine}
                onChange={setCustomCuisine}
                onAdd={() => addCustom("cuisines", customCuisine, () => setCustomCuisine(""))}
                placeholder="+ Custom"
              />
            </span>
          </div>
          <FieldError>{errors.cuisines}</FieldError>
        </div>

        {/* Serviceable Cities Multi-Select */}
        <div className="form-group full-width" id="field-serviceCities" style={{ marginTop: 10 }}>
          <span className="form-label">
            <R d="Serviceable Coverage Cities" m="Coverage Cities" /> <span className="required">*</span>{" "}
            <span className="form-label-sub vob-d">Where can your team travel to cater?</span>
          </span>
          <div className="chip-grid" data-chip-type="city">
            {coverageChips.map((c) => {
              const active = data.serviceCities.includes(c);
              return (
                <ChoiceChip
                  key={c}
                  active={active}
                  onClick={() => toggle("serviceCities", c)}
                >
                  {c}
                </ChoiceChip>
              );
            })}
            <span className="vob-d">
              <ChipAddInput
                id="input-custom-city"
                value={customCity}
                onChange={setCustomCity}
                onAdd={() => addCustom("serviceCities", customCity, () => setCustomCity(""))}
                placeholder="+ Other city"
              />
            </span>
            <span className="vob-m">
              <ChipAddInput
                id="m-input-custom-city"
                value={customCity}
                onChange={setCustomCity}
                onAdd={() => addCustom("serviceCities", customCity, () => setCustomCity(""))}
                placeholder="+ City"
              />
            </span>
          </div>
          <span className="field-hint vob-d">
            Customers in these regional cities will see your kitchen listing in search results.
          </span>
          <FieldError>{errors.serviceCities}</FieldError>
        </div>

        {/* Google Reviews & Reputation */}
        <div
          className="form-grid-2"
          style={{ marginTop: 10, paddingTop: 12, borderTop: "1px dashed var(--color-cream-30)" }}
        >
          <div className="form-group">
            <label className="form-label" htmlFor="d-google-rating">
              Google Rating
            </label>
            <input
              id="d-google-rating"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="1"
              max="5"
              className="form-input"
              value={data.googleRating ?? ""}
              onChange={(e) => onChange({ googleRating: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="e.g. 4.8"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="d-google-reviews">
              Total Google Reviews Count
            </label>
            <input
              id="d-google-reviews"
              type="number"
              inputMode="numeric"
              min="0"
              className="form-input"
              value={data.googleReviews ?? ""}
              onChange={(e) => onChange({ googleReviews: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="e.g. 142"
            />
          </div>
        </div>
      </ContentCard>

      <FlowFooter onContinue={handleContinue} saving={saving} hideBack />
    </div>
  );
}

function AccountItem({ label, value, labelFor }: { label: string; value: ReactNode; labelFor?: string }) {
  return (
    <div className="account-field-item">
      {labelFor ? (
        <label className="account-field-label" htmlFor={labelFor}>
          {label}
        </label>
      ) : (
        <span className="account-field-label">{label}</span>
      )}
      <span className="account-field-val">{value}</span>
    </div>
  );
}

function MobileRow({
  label,
  value,
  labelFor,
  editing,
  input,
  onEdit,
}: {
  label: string;
  value: string;
  labelFor?: string;
  editing?: boolean;
  input?: ReactNode;
  onEdit?: () => void;
}) {
  return (
    <div className="mobile-account-row" style={{ gap: 8 }}>
      {labelFor ? (
        <label className="account-field-label" htmlFor={labelFor}>
          {label}
        </label>
      ) : (
        <span className="account-field-label">{label}</span>
      )}
      {editing && input ? (
        input
      ) : (
        <strong className="account-field-val" style={{ textAlign: "right" }}>
          {value || "—"}
          {onEdit && (
            <>
              {" "}
              <button
                type="button"
                className="btn-badge-toggle-req"
                onClick={onEdit}
                aria-label={`Edit ${label.replace(":", "")}`}
                style={{ fontSize: 11, minHeight: 24 }}
              >
                ✎
              </button>
            </>
          )}
        </strong>
      )}
    </div>
  );
}
