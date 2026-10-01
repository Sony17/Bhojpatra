"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "@/lib/session";
import type { LiveVendorRecord, VendorBadgesState, VendorCustomOffering, VendorDietaryOffering } from "@/lib/vendorMenus";
import VendorContextHeader from "./VendorContextHeader";
import Step1IdentityOps from "./steps/Step1IdentityOps";
import Step2KycCompliance from "./steps/Step2KycCompliance";
import Step3Offerings from "./steps/Step3Offerings";
import { Button } from "@/components/ui";

interface OnboardingState {
  // Step 1
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
  // Step 2
  gstNumber: string;
  fssaiNumber: string;
  documents: Record<string, { fileName: string; status: "idle" | "uploading" | "done" | "error"; id?: string }>;
  badges: VendorBadgesState;
  // Step 3
  serviceCategories: string[];
  customOfferings: VendorCustomOffering[];
  // Existing vendor ID if editing
  existingVendorId?: string;
  existingMenu?: LiveVendorRecord["menu"];
}

const STEP_TITLES = [
  "Identity & Operations",
  "KYC & Compliance",
  "Service Offerings",
];

export default function VendorOnboarding() {
  const session = useSession();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string>("");
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const [formData, setFormData] = useState<OnboardingState>({
    ownerName: session?.name || "",
    businessName: "",
    email: session?.email || "",
    phone: "",
    city: "Lucknow",
    state: "Uttar Pradesh",
    serviceCities: ["Lucknow"],
    cuisines: ["North Indian", "Mughlai"],
    dietaryOffering: undefined,
    googleRating: undefined,
    googleReviews: undefined,
    gstNumber: "",
    fssaiNumber: "",
    documents: {},
    badges: { applied: [], granted: [], applications: [] },
    serviceCategories: ["full-catering"],
    customOfferings: [],
    existingVendorId: undefined,
    existingMenu: [],
  });

  // Load existing vendor data or application prefill
  useEffect(() => {
    let active = true;
    async function fetchInitial() {
      try {
        const res = await fetch("/api/vendor/menu");
        if (!res.ok) {
          if (active) setLoading(false);
          return;
        }
        const data = await res.json();
        if (!active) return;

        const record = data.vendor as LiveVendorRecord | null;
        const prefill = data.prefill || {};

        setFormData((prev) => ({
          ...prev,
          ownerName: record?.ownerEmail ? (session?.name || prev.ownerName) : (session?.name || prev.ownerName),
          businessName: record?.business || prefill.business || prev.businessName,
          email: record?.ownerEmail || session?.email || prev.email,
          city: record?.city || prefill.city || prev.city,
          state: record?.state || prefill.state || prev.state,
          serviceCities: record?.serviceCities?.length
            ? record.serviceCities
            : (prefill.serviceCities?.length ? prefill.serviceCities : prev.serviceCities),
          cuisines: record?.cuisines?.length ? record.cuisines : (prefill.cuisines?.length ? prefill.cuisines : prev.cuisines),
          dietaryOffering: record?.dietaryOffering || prefill.dietaryOffering || prev.dietaryOffering,
          googleRating: record?.googleRating || prev.googleRating,
          googleReviews: record?.googleReviews || prev.googleReviews,
          badges: record?.badges || prefill.badges || prev.badges,
          serviceCategories: record?.serviceCategories?.length
            ? record.serviceCategories
            : (prefill.serviceCategories?.length ? prefill.serviceCategories : prev.serviceCategories),
          customOfferings: record?.customOfferings?.length
            ? record.customOfferings
            : (prefill.customOfferings?.length ? prefill.customOfferings : prev.customOfferings),
          existingVendorId: record?.id,
          existingMenu: record?.menu || [],
        }));
      } catch (err) {
        console.error("Failed to load initial vendor data", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchInitial();
    return () => {
      active = false;
    };
  }, [session]);

  // Persist draft to PUT /api/vendor/menu
  const persistDraft = useCallback(
    async (overrideData?: Partial<OnboardingState>): Promise<boolean> => {
      const target = { ...formData, ...overrideData };
      setSaving(true);
      setSaveError("");

      try {
        const payload = {
          business: target.businessName || "New Catering Vendor",
          city: target.city || "Lucknow",
          state: target.state || "Uttar Pradesh",
          cuisines: target.cuisines.length ? target.cuisines : ["North Indian"],
          priceFrom: 500,
          menu: target.existingMenu && target.existingMenu.length ? target.existingMenu : [],
          serviceCities: target.serviceCities,
          dietaryOffering: target.dietaryOffering,
          googleRating: target.googleRating,
          googleReviews: target.googleReviews,
          serviceCategories: target.serviceCategories,
          customOfferings: target.customOfferings,
          badges: target.badges,
        };

        const res = await fetch("/api/vendor/menu", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          setSaveError(errData?.error || "Failed to save draft.");
          return false;
        }

        setLastSavedAt(new Date().toLocaleTimeString());
        return true;
      } catch (err) {
        console.error("Failed to save draft", err);
        setSaveError("Network error while saving draft.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [formData],
  );

  const handleStep1Continue = async () => {
    const ok = await persistDraft();
    if (ok) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleStep2Continue = async () => {
    const ok = await persistDraft();
    if (ok) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleStep3Finish = async () => {
    const ok = await persistDraft();
    if (ok) {
      setIsCompleted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-maroon border-t-transparent" />
        <p className="text-sm text-ink-soft">Loading your vendor registration workspace...</p>
      </div>
    );
  }

  // Completed milestone view
  if (isCompleted) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 py-6 animate-in fade-in duration-200">
        <div className="rounded-card border-2 border-emerald-500/40 bg-emerald-50/60 p-6 sm:p-8 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-3xl text-white shadow-sm">
            ✓
          </div>
          <h2 className="mt-4 text-xl sm:text-2xl font-bold text-ink">
            Registration Steps 1–3 Complete!
          </h2>
          <p className="mt-2 text-sm text-ink-soft max-w-xl mx-auto leading-relaxed">
            Your brand identity, compliance details, and service offerings have been safely validated and saved to Bhojpatra&apos;s live database.
          </p>

          <div className="mt-6 rounded-card border border-cream-3 bg-white p-5 text-left space-y-3 max-w-lg mx-auto text-xs sm:text-sm shadow-xs">
            <div className="flex justify-between border-b border-cream-2 pb-2">
              <span className="text-ink-soft">Business Name:</span>
              <span className="font-bold text-ink">{formData.businessName}</span>
            </div>
            <div className="flex justify-between border-b border-cream-2 pb-2">
              <span className="text-ink-soft">Kitchen Base:</span>
              <span className="font-semibold text-ink">{formData.city}, {formData.state}</span>
            </div>
            <div className="flex justify-between border-b border-cream-2 pb-2">
              <span className="text-ink-soft">Dietary Offering:</span>
              <span className="font-semibold text-maroon uppercase">{formData.dietaryOffering}</span>
            </div>
            <div className="flex justify-between border-b border-cream-2 pb-2">
              <span className="text-ink-soft">Service Coverage:</span>
              <span className="font-semibold text-ink">{formData.serviceCities.join(", ") || "Base city"}</span>
            </div>
            <div className="flex justify-between border-b border-cream-2 pb-2">
              <span className="text-ink-soft">Active Services:</span>
              <span className="font-semibold text-ink">{formData.serviceCategories.join(", ")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Custom Stations:</span>
              <span className="font-semibold text-ink">{formData.customOfferings.length} stations</span>
            </div>
          </div>

          <div className="mt-6 rounded-control bg-cream-2/70 p-4 text-xs text-ink-soft max-w-xl mx-auto text-left leading-relaxed">
            ℹ️ <strong>Stage 3 Complete:</strong> Identity, KYC compliance, and service scope are verified and active. Detailed course pricing, Single Stall menus, and Baina packaging will be configured in Stages 4 & 5.
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button href="/vendor/dashboard" size="lg">
              Go to Vendor Dashboard →
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setIsCompleted(false)}
            >
              Review / Edit Steps 1–3
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-4 sm:py-6">
      {/* Persistent V2 Context Header */}
      <VendorContextHeader
        businessName={formData.businessName}
        ownerName={formData.ownerName}
        city={formData.city}
        state={formData.state}
        dietaryOffering={formData.dietaryOffering}
        serviceCities={formData.serviceCities}
        currentStep={currentStep}
        totalSteps={3}
        stepTitle={STEP_TITLES[currentStep - 1]}
        isSaving={saving}
        lastSavedAt={lastSavedAt}
      />

      {saveError && (
        <div className="mb-4 rounded-control bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center justify-between">
          <span>⚠️ {saveError}</span>
          <button
            type="button"
            onClick={() => setSaveError("")}
            className="text-red-500 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Steps Switcher */}
      {currentStep === 1 && (
        <Step1IdentityOps
          data={{
            ownerName: formData.ownerName,
            businessName: formData.businessName,
            email: formData.email,
            phone: formData.phone,
            city: formData.city,
            state: formData.state,
            serviceCities: formData.serviceCities,
            cuisines: formData.cuisines,
            dietaryOffering: formData.dietaryOffering,
            googleRating: formData.googleRating,
            googleReviews: formData.googleReviews,
          }}
          onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
          onContinue={handleStep1Continue}
          saving={saving}
        />
      )}

      {currentStep === 2 && (
        <Step2KycCompliance
          data={{
            gstNumber: formData.gstNumber,
            fssaiNumber: formData.fssaiNumber,
            documents: formData.documents,
            badges: formData.badges,
          }}
          businessName={formData.businessName}
          email={formData.email}
          onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
          onBack={() => {
            setCurrentStep(1);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onContinue={handleStep2Continue}
          saving={saving}
        />
      )}

      {currentStep === 3 && (
        <Step3Offerings
          data={{
            serviceCategories: formData.serviceCategories,
            customOfferings: formData.customOfferings,
          }}
          onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
          onBack={() => {
            setCurrentStep(2);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onFinishStep3={handleStep3Finish}
          saving={saving}
        />
      )}
    </div>
  );
}
