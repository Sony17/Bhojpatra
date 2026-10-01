"use client";

import { useState } from "react";
import { cities as canonicalCities, indianStates, registrationCuisines } from "@/lib/data";
import type { VendorDietaryOffering } from "@/lib/vendorMenus";
import DietaryOfferingSelector from "../components/DietaryOfferingSelector";
import ServiceCitiesChipInput from "../components/ServiceCitiesChipInput";
import { Button } from "@/components/ui";

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
}

interface Step1IdentityOpsProps {
  data: Step1Data;
  onChange: (updated: Partial<Step1Data>) => void;
  onContinue: () => void;
  saving?: boolean;
}

export default function Step1IdentityOps({
  data,
  onChange,
  onContinue,
  saving = false,
}: Step1IdentityOpsProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customCuisine, setCustomCuisine] = useState("");

  const toggleCuisine = (c: string) => {
    const list = data.cuisines || [];
    if (list.includes(c)) {
      onChange({ cuisines: list.filter((item) => item !== c) });
    } else {
      onChange({ cuisines: [...list, c] });
    }
  };

  const addCustomCuisine = () => {
    const trimmed = customCuisine.trim();
    if (!trimmed) return;
    const list = data.cuisines || [];
    if (!list.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      onChange({ cuisines: [...list, trimmed] });
    }
    setCustomCuisine("");
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!data.businessName.trim()) {
      newErrors.businessName = "Business / Catering name is required.";
    }
    if (!data.city.trim()) {
      newErrors.city = "Kitchen city is required.";
    }
    if (!data.state.trim()) {
      newErrors.state = "Operating state is required.";
    }
    if (!data.dietaryOffering) {
      newErrors.dietaryOffering = "You must select a dietary offering to proceed.";
    }
    if (!data.cuisines || data.cuisines.length === 0) {
      newErrors.cuisines = "Please select at least one cuisine specialization.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to first error
      const firstKey = Object.keys(newErrors)[0];
      const el = document.getElementById(`field-${firstKey}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setErrors({});
    onContinue();
  };

  return (
    <form onSubmit={handleContinue} className="space-y-8 animate-in fade-in duration-200">
      {/* ── Section A: Identity & Account Bindings ── */}
      <section className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs space-y-5">
        <div>
          <h3 className="text-base font-bold text-ink sm:text-lg">
            1. Brand & Contact Identity
          </h3>
          <p className="text-xs text-ink-soft mt-0.5">
            Verified contact details from your Bhojpatra account and commercial kitchen brand.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Business / Brand Name */}
          <div id="field-businessName" className="sm:col-span-2">
            <label className="block text-sm font-semibold text-ink mb-1.5">
              Catering Business / Brand Name <span className="text-maroon">*</span>
            </label>
            <input
              type="text"
              required
              value={data.businessName}
              onChange={(e) => {
                onChange({ businessName: e.target.value });
                if (errors.businessName) setErrors((prev) => ({ ...prev, businessName: "" }));
              }}
              placeholder="e.g. Awadhi Royal Caterers & Feasts"
              className="w-full rounded-control border border-cream-3 bg-cream/40 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30 transition-colors"
            />
            {errors.businessName && (
              <p className="mt-1 text-xs text-red-600 font-medium">{errors.businessName}</p>
            )}
          </div>

          {/* Owner Full Name (from authenticated account) */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">
              Owner / Representative Name <span className="text-maroon">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={data.ownerName}
                onChange={(e) => onChange({ ownerName: e.target.value })}
                placeholder="Full name of registered owner"
                className="w-full rounded-control border border-cream-3 bg-cream/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
              />
              <span className="absolute right-3 top-2.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                Verified Account
              </span>
            </div>
          </div>

          {/* Account Email (Immutable handle) */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">
              Account Email
            </label>
            <div className="relative">
              <input
                type="email"
                disabled
                value={data.email}
                className="w-full rounded-control border border-cream-3 bg-cream-2/70 px-3.5 py-2.5 text-sm text-ink-soft cursor-not-allowed outline-none"
              />
              <span className="absolute right-3 top-2.5 rounded-full bg-cream-3 px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
                Locked
              </span>
            </div>
            <p className="mt-1 text-[11px] text-ink-soft">
              Bound to your authenticated Bhojpatra login session.
            </p>
          </div>

          {/* Primary Phone / WhatsApp */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-ink mb-1.5">
              Primary Mobile / WhatsApp Number <span className="text-maroon">*</span>
            </label>
            <div className="flex gap-2">
              <span className="inline-flex items-center rounded-control border border-cream-3 bg-cream-2/70 px-3 text-xs font-semibold text-ink-soft">
                +91 (India)
              </span>
              <input
                type="tel"
                required
                value={data.phone}
                onChange={(e) => onChange({ phone: e.target.value })}
                placeholder="10-digit mobile number for order alerts"
                className="flex-1 rounded-control border border-cream-3 bg-cream/40 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Section B: Mandatory Dietary Offering ── */}
      <section id="field-dietaryOffering" className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs">
        <DietaryOfferingSelector
          value={data.dietaryOffering}
          onChange={(diet) => {
            onChange({ dietaryOffering: diet });
            if (errors.dietaryOffering) setErrors((prev) => ({ ...prev, dietaryOffering: "" }));
          }}
          error={errors.dietaryOffering}
        />
      </section>

      {/* ── Section C: Base Location & Service Coverage ── */}
      <section className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs space-y-5">
        <div>
          <h3 className="text-base font-bold text-ink sm:text-lg">
            2. Kitchen Location & Coverage Scope
          </h3>
          <p className="text-xs text-ink-soft mt-0.5">
            Specify where your base commercial kitchen operates and which cities you serve.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Base Kitchen City */}
          <div id="field-city">
            <label className="block text-sm font-semibold text-ink mb-1.5">
              Primary Kitchen City <span className="text-maroon">*</span>
            </label>
            <input
              type="text"
              list="cities-list"
              required
              value={data.city}
              onChange={(e) => {
                onChange({ city: e.target.value });
                if (errors.city) setErrors((prev) => ({ ...prev, city: "" }));
              }}
              placeholder="e.g. Lucknow"
              className="w-full rounded-control border border-cream-3 bg-cream/40 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
            />
            <datalist id="cities-list">
              {canonicalCities.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
            {errors.city && (
              <p className="mt-1 text-xs text-red-600 font-medium">{errors.city}</p>
            )}
          </div>

          {/* Operating State */}
          <div id="field-state">
            <label className="block text-sm font-semibold text-ink mb-1.5">
              Operating State <span className="text-maroon">*</span>
            </label>
            <select
              required
              value={data.state}
              onChange={(e) => {
                onChange({ state: e.target.value });
                if (errors.state) setErrors((prev) => ({ ...prev, state: "" }));
              }}
              className="w-full rounded-control border border-cream-3 bg-cream/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
            >
              <option value="">Select Indian State / UT</option>
              {indianStates.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors.state && (
              <p className="mt-1 text-xs text-red-600 font-medium">{errors.state}</p>
            )}
          </div>

          {/* Multi-city coverage chip input */}
          <div className="sm:col-span-2">
            <ServiceCitiesChipInput
              value={data.serviceCities || []}
              onChange={(cities) => onChange({ serviceCities: cities })}
              homeCity={data.city}
            />
          </div>
        </div>
      </section>

      {/* ── Section D: Cuisines & Reputation ── */}
      <section id="field-cuisines" className="rounded-card border border-cream-3 bg-white p-5 sm:p-7 shadow-xs space-y-5">
        <div>
          <h3 className="text-base font-bold text-ink sm:text-lg">
            3. Cuisine Specialities & Reputation
          </h3>
          <p className="text-xs text-ink-soft mt-0.5">
            Select the culinary traditions your kitchen specializes in preparing.
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink mb-2">
            Cuisine Specializations <span className="text-maroon">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {registrationCuisines.map((c) => {
              const active = data.cuisines?.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    toggleCuisine(c);
                    if (errors.cuisines) setErrors((prev) => ({ ...prev, cuisines: "" }));
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? "bg-maroon text-cream shadow-xs"
                      : "bg-cream-2/80 text-ink-soft hover:bg-cream-3 hover:text-ink"
                  }`}
                >
                  {active && <span className="mr-1">✓</span>}
                  {c}
                </button>
              );
            })}
          </div>

          {/* Custom Cuisine Add */}
          <div className="mt-3 flex items-center gap-2 max-w-sm">
            <input
              type="text"
              value={customCuisine}
              onChange={(e) => setCustomCuisine(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomCuisine();
                }
              }}
              placeholder="Add other cuisine (e.g. Awadhi, Rajasthani)..."
              className="flex-1 rounded-control border border-cream-3 bg-cream/40 px-3 py-1.5 text-xs text-ink placeholder:text-ink-soft/60 outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
            />
            <button
              type="button"
              onClick={addCustomCuisine}
              className="rounded-control bg-cream-2 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-cream-3 transition-colors"
            >
              + Add
            </button>
          </div>

          {errors.cuisines && (
            <p className="mt-2 text-xs text-red-600 font-medium">{errors.cuisines}</p>
          )}
        </div>

        {/* Reputation numbers (Google rating & review count) */}
        <div className="pt-2 border-t border-cream-2">
          <p className="text-xs font-semibold text-ink uppercase tracking-wider mb-2">
            Public Reputation & Ratings (Optional)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">
                Google / External Rating (e.g. 4.8)
              </label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={data.googleRating ?? ""}
                onChange={(e) =>
                  onChange({
                    googleRating: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="4.8"
                className="w-full rounded-control border border-cream-3 bg-cream/40 px-3.5 py-2 text-sm text-ink outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">
                Verified Review Count
              </label>
              <input
                type="number"
                min="0"
                value={data.googleReviews ?? ""}
                onChange={(e) =>
                  onChange({
                    googleReviews: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="e.g. 340"
                className="w-full rounded-control border border-cream-3 bg-cream/40 px-3.5 py-2 text-sm text-ink outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Wizard Actions ── */}
      <div className="sticky bottom-0 z-20 flex items-center justify-between rounded-card border border-cream-3 bg-white/95 p-4 shadow-md backdrop-blur-md">
        <span className="text-xs text-ink-soft">
          Step 1 saves automatically to your vendor draft
        </span>
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? "Saving..." : "Save & Continue to KYC →"}
        </Button>
      </div>
    </form>
  );
}
