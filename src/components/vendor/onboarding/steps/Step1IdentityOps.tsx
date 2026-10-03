"use client";

import { useState } from "react";
import { indianStates } from "@/lib/data";
import type { VendorDietaryOffering } from "@/lib/vendorMenus";
import DietaryOfferingSelector from "../components/DietaryOfferingSelector";
import {
  CardTitle,
  ChipAddInput,
  ChoiceChip,
  ContentCard,
  FieldError,
  FieldHint,
  FlowFooter,
  FormLabel,
  Pill,
  R,
  StepHeading,
  inputCls,
} from "../ui";

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

/** Handover: Serviceable Coverage Cities chips (mobile shows the first 12). */
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
      document.getElementById(`field-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    onContinue();
  };

  const cityOptions = withExtras(KITCHEN_CITIES, data.city ? [data.city] : []);
  const cuisineChips = withExtras(CUISINE_CHIPS, data.cuisines || []);
  const coverageChips = withExtras(COVERAGE_CHIPS, data.serviceCities || []);

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

      {/* Already registered banner */}
      <div className="mb-5 flex flex-col gap-3 rounded-card border border-maroon/25 bg-maroon/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[13px] text-ink">
          <strong className="hidden sm:inline">Already registered as a Bhojpatra Vendor? </strong>
          <strong className="sm:hidden">Registered Vendor? </strong>
          <R
            d="Directly sign in to access your vendor dashboard, active pipeline, and kitchen orders."
            m="Sign in directly to your vendor dashboard."
          />
        </div>
        <button
          type="button"
          onClick={onSignIn}
          className="min-h-[44px] shrink-0 rounded-full bg-maroon px-4 text-xs font-bold text-cream"
        >
          <R d="Sign In to Dashboard →" m="Sign In →" />
        </button>
      </div>

      {/* Kitchen Dietary Offering — mandatory gate */}
      <ContentCard id="field-dietaryOffering">
        <DietaryOfferingSelector
          value={data.dietaryOffering}
          onChange={(diet) => {
            onChange({ dietaryOffering: diet });
            if (errors.dietaryOffering) setErrors((p) => ({ ...p, dietaryOffering: "" }));
          }}
          error={errors.dietaryOffering}
        />
      </ContentCard>

      {/* Verified Vendor Account Details — reused from signup */}
      <ContentCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[15px] font-bold text-ink">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-maroon text-xs text-cream">✓</span>
            <R d="Verified Vendor Account Details" m="Signup Details Linked" />
            <Pill tone="cream">
              <R d="Reused from Signup" m="Reused" />
            </Pill>
          </div>
          {data.accountId && (
            <span className="hidden text-xs font-semibold text-ink/60 sm:inline">Account ID: {data.accountId}</span>
          )}
        </div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AccountField label="Primary Account Holder" mLabel="Owner:" value={data.ownerName} />
          <AccountField
            id="field-businessName"
            label="Registered Business Name"
            mLabel="Business:"
            value={data.businessName}
            editable
            placeholder="e.g. Royal Awadh Caterers"
            onEdit={(v) => {
              onChange({ businessName: v });
              if (errors.businessName) setErrors((p) => ({ ...p, businessName: "" }));
            }}
            error={errors.businessName}
          />
          <AccountField
            id="field-phone"
            label="Registered WhatsApp Mobile"
            mLabel="Mobile:"
            value={data.phone}
            prefix="+91"
            editable
            type="tel"
            placeholder="10-digit mobile number"
            onEdit={(v) => {
              onChange({ phone: v });
              if (errors.phone) setErrors((p) => ({ ...p, phone: "" }));
            }}
            error={errors.phone}
          />
          <AccountField label="Registered Account Email" mLabel="Email:" value={data.email} />
        </dl>
        <p className="mt-4 rounded-control bg-cream/20 p-3 text-[11px] text-ink/70">
          <R
            d="ℹ️ Linked directly to your active Bhojpatra vendor login. These credentials are automatically preserved and never requested again."
            m="ℹ️ Reused from active signup account. No re-entry required."
          />
        </p>
      </ContentCard>

      {/* Commercial Kitchen Operations */}
      <ContentCard>
        <div className="hidden sm:block">
          <CardTitle>Commercial Kitchen Operations</CardTitle>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div id="field-city">
            <FormLabel required htmlFor="d-city">
              <R d="Primary Kitchen City" m="City" />
            </FormLabel>
            <select
              id="d-city"
              value={data.city}
              onChange={(e) => onChange({ city: e.target.value })}
              className={inputCls}
            >
              {!data.city && <option value="">Select city</option>}
              {cityOptions.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <FieldError>{errors.city}</FieldError>
          </div>
          <div id="field-state">
            <FormLabel required htmlFor="d-state">
              State
            </FormLabel>
            <select
              id="d-state"
              value={data.state}
              onChange={(e) => onChange({ state: e.target.value })}
              className={inputCls}
            >
              {!data.state && <option value="">Select state</option>}
              {indianStates.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <FieldError>{errors.state}</FieldError>
          </div>
        </div>

        <div id="field-cuisines" className="mt-5">
          <FormLabel>
            <R d="Primary Culinary Specialties & Cuisines" m="Cuisines" />
          </FormLabel>
          <div className="flex flex-wrap items-center gap-2">
            {cuisineChips.map((c) => (
              <ChoiceChip key={c} active={data.cuisines.includes(c)} onClick={() => toggle("cuisines", c)}>
                {c}
              </ChoiceChip>
            ))}
            <ChipAddInput
              id="input-custom-cuisine"
              value={customCuisine}
              onChange={setCustomCuisine}
              onAdd={() => addCustom("cuisines", customCuisine, () => setCustomCuisine(""))}
              placeholder="+ Custom cuisine"
            />
          </div>
          <FieldError>{errors.cuisines}</FieldError>
        </div>

        <div id="field-serviceCities" className="mt-5">
          <FormLabel required sub="Where can your team travel to cater?">
            <R d="Serviceable Coverage Cities" m="Coverage Cities" />
          </FormLabel>
          <div className="flex flex-wrap items-center gap-2">
            {coverageChips.map((c) => (
              <ChoiceChip
                key={c}
                active={data.serviceCities.includes(c)}
                onClick={() => toggle("serviceCities", c)}
              >
                {c}
              </ChoiceChip>
            ))}
            <ChipAddInput
              id="input-custom-city"
              value={customCity}
              onChange={setCustomCity}
              onAdd={() => addCustom("serviceCities", customCity, () => setCustomCity(""))}
              placeholder="+ Other city"
            />
          </div>
          <FieldHint className="hidden sm:block">
            Customers in these regional cities will see your kitchen listing in search results.
          </FieldHint>
          <FieldError>{errors.serviceCities}</FieldError>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <FormLabel htmlFor="d-google-rating">Google Rating</FormLabel>
            <input
              id="d-google-rating"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="1"
              max="5"
              value={data.googleRating ?? ""}
              onChange={(e) => onChange({ googleRating: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="e.g. 4.8"
              className={inputCls}
            />
          </div>
          <div>
            <FormLabel htmlFor="d-google-reviews">Total Google Reviews Count</FormLabel>
            <input
              id="d-google-reviews"
              type="number"
              inputMode="numeric"
              min="0"
              value={data.googleReviews ?? ""}
              onChange={(e) => onChange({ googleReviews: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="e.g. 142"
              className={inputCls}
            />
          </div>
        </div>
      </ContentCard>

      <FlowFooter onContinue={handleContinue} saving={saving} hideBack />
    </div>
  );
}

function AccountField({
  id,
  label,
  mLabel,
  value,
  editable,
  onEdit,
  placeholder,
  prefix,
  type = "text",
  error,
}: {
  id?: string;
  label: string;
  mLabel: string;
  value: string;
  editable?: boolean;
  onEdit?: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  type?: string;
  error?: string;
}) {
  // Values carried over from signup render read-only. A value the signup did
  // not capture (business name / mobile) is asked here once, inline.
  const [editing, setEditing] = useState(editable && !value);
  return (
    <div id={id} className="rounded-control border border-cream/60 bg-cream/10 px-3 py-2">
      <dt className="text-[11px] font-semibold text-ink/50">
        <R d={label} m={mLabel} />
      </dt>
      <dd className="mt-0.5 text-sm font-bold text-ink">
        {editing && onEdit ? (
          <div className="flex items-center gap-2">
            {prefix && <span className="text-xs font-semibold text-ink/60">{prefix}</span>}
            <input
              type={type}
              value={value}
              autoComplete="off"
              onChange={(e) => onEdit(e.target.value)}
              placeholder={placeholder}
              aria-label={label}
              className="min-h-[40px] w-full rounded-control border border-cream bg-white px-2.5 text-sm font-normal text-ink outline-none focus:border-maroon"
            />
          </div>
        ) : (
          <span className="flex items-center justify-between gap-2">
            <span className="truncate">
              {prefix && value ? `${prefix} ` : ""}
              {value || "—"}
            </span>
            {editable && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="min-h-[32px] shrink-0 px-1 text-[11px] font-bold text-maroon"
              >
                Edit ✎
              </button>
            )}
          </span>
        )}
        <FieldError>{error}</FieldError>
      </dd>
    </div>
  );
}
