"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "@/lib/session";
import type {
  LiveVendorRecord,
  VendorBadgesState,
  VendorCustomOffering,
  VendorDietaryOffering,
  VendorMenuSection,
  VendorCounter,
  VendorEssentialService,
  CutleryTierOption,
  SingleStallConfig,
  VendorBainaDetails,
  VendorBainaBox,
  CateringComponentsSelection,
  VendorOnboardingDraft,
} from "@/lib/vendorMenus";
import type { VendorApplicationStage } from "@/lib/vendorOnboarding";
import VendorContextHeader from "./VendorContextHeader";
import Step1IdentityOps from "./steps/Step1IdentityOps";
import Step2KycCompliance from "./steps/Step2KycCompliance";
import Step3Offerings from "./steps/Step3Offerings";
import CateringBuilder from "./builders/catering/CateringBuilder";
import SingleStallBuilder from "./builders/stall/SingleStallBuilder";
import BainaBuilder from "./builders/baina/BainaBuilder";
import type { CourseQuotas } from "./builders/catering/Step5BPricingQuotas";
import { activeCateringSections } from "./builders/catering/CateringBuilder";
import Step8MasterReview, { type ReviewJump } from "./steps/Step8MasterReview";
import Step9Complete from "./steps/Step9Complete";
import StorefrontPreviewModal from "./components/StorefrontPreviewModal";
import { PhaseStepper } from "./OnboardingChrome";
import { ShellSlots } from "./ui";
import { readDraft } from "./draft";
import { isStockVendorImage } from "@/lib/photoLinks";
import "./onboarding.css";

export interface OnboardingState {
  // Step 1: Identity & Operations
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

  // Step 2: KYC & Compliance
  gstNumber: string;
  fssaiNumber: string;
  documents: Record<
    string,
    { fileName: string; status: "idle" | "uploading" | "done" | "error"; id?: string }
  >;
  badges: VendorBadgesState;

  // Step 3: Service Offerings Scope
  serviceCategories: string[];
  customOfferings: VendorCustomOffering[];
  cateringComponents: CateringComponentsSelection;

  // Stage 4 Part 1: Catering Builder (5A–5H)
  packageName: string;
  about: string;
  bestFor: string[];
  minPax: number;
  maxCapacity: number;
  leadHours: number;
  image?: string;
  priceFrom: number;
  goldRate: number;
  goldSpecialization: string;
  silverQuotas: CourseQuotas;
  goldQuotas: CourseQuotas;
  menu: VendorMenuSection[];
  featured: string[];
  counters: VendorCounter[];
  essentialService: VendorEssentialService;
  cutleryTier: CutleryTierOption;

  // Stage 4 Part 2: Single Stall Builder (6A–6B)
  stallConfig: SingleStallConfig;

  // Stage 4 Part 3: Baina Box Builder (7A–7C)
  bainaDetails: VendorBainaDetails;
  bainaBoxes: VendorBainaBox[];

  // Existing vendor ID if editing
  existingVendorId?: string;
}

/** The vendor's own application, as GET/POST /api/vendor/application report it. */
interface ApplicationInfo {
  id: string;
  status: string;
  stage: VendorApplicationStage;
  reviewReason?: string;
}

/** Empty builder defaults — a new vendor starts with NO sample content, so
 *  nothing fake can be saved as their real menu. Only operational settings
 *  (component toggles, quota counts, packaging style) carry a default. */
const EMPTY_STALL: SingleStallConfig = { categories: [], categoryPricing: {}, equipment: [] };

export default function VendorOnboarding() {
  const session = useSession();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [branchIndex, setBranchIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string>("");
  /** 1–3 = Identity/KYC/Offerings, 4 = service builders, 5 = review, 6 = complete. */
  const [maxPhase, setMaxPhase] = useState<number>(0);
  const [catSection, setCatSection] = useState<string>("5A");
  const [stallSection, setStallSection] = useState<string>("6A");
  const [bainaSection, setBainaSection] = useState<string>("7A");
  const [footerSlot, setFooterSlot] = useState<HTMLElement | null>(null);
  const [subnavSlot, setSubnavSlot] = useState<HTMLElement | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  /** The vendor's submitted application (null until they submit). */
  const [application, setApplication] = useState<ApplicationInfo | null>(null);
  /** A verified vendor's live listing — they're offered the dashboard first. */
  const [isLive, setIsLive] = useState(false);
  const [editingLive, setEditingLive] = useState(false);
  const loadedRef = useRef(false);

  const [formData, setFormData] = useState<OnboardingState>({
    ownerName: session?.name || "",
    businessName: "",
    email: session?.email || "",
    phone: "",
    city: "",
    state: "",
    serviceCities: [],
    cuisines: [],
    dietaryOffering: undefined,
    googleRating: undefined,
    googleReviews: undefined,
    gstNumber: "",
    fssaiNumber: "",
    documents: {},
    badges: { applied: [], granted: [], applications: [] },
    serviceCategories: [],
    customOfferings: [],
    cateringComponents: { counters: true, extras: true, essentials: true, addons: true },
    // Catering
    packageName: "",
    about: "",
    bestFor: [],
    minPax: 50,
    maxCapacity: 0,
    leadHours: 48,
    image: undefined,
    priceFrom: 0,
    goldRate: 0,
    goldSpecialization: "",
    silverQuotas: { welcome: 1, starters: 2, main: 3, breads: 1, sweets: 1 },
    goldQuotas: { welcome: 1, starters: 5, main: 5, breads: 2, sweets: 3 },
    menu: [],
    featured: [],
    counters: [],
    essentialService: { perGuest: 0, includes: [] },
    cutleryTier: "essential",
    // Single Stall
    stallConfig: EMPTY_STALL,
    // Baina Box
    bainaDetails: {
      studioName: "",
      story: "",
      minOrderBoxes: 25,
      leadDays: 3,
      packaging: "velvet",
    },
    bainaBoxes: [],
    existingVendorId: undefined,
  });

  // Calculate active builder branches
  const getActiveBranches = useCallback((categories: string[]): ("catering" | "stall" | "baina")[] => {
    const branches: ("catering" | "stall" | "baina")[] = [];
    if (categories.includes("full-catering")) branches.push("catering");
    if (categories.includes("single-stall")) branches.push("stall");
    if (categories.includes("baina-box")) branches.push("baina");
    return branches;
  }, []);

  const activeBranches = getActiveBranches(formData.serviceCategories);
  const currentBranch = activeBranches[branchIndex] || activeBranches[0] || "catering";

  // Load the saved draft (or application prefill) ONCE. A later session
  // refresh must never re-run this and overwrite unsaved edits.
  useEffect(() => {
    if (loadedRef.current || !session) return;
    loadedRef.current = true;
    async function fetchInitial() {
      try {
        const [res, appRes] = await Promise.all([
          fetch("/api/vendor/menu"),
          fetch("/api/vendor/application").catch(() => null),
        ]);
        const appData = appRes?.ok ? await appRes.json().catch(() => null) : null;
        const app = (appData?.application ?? null) as ApplicationInfo | null;
        setApplication(app);
        if (!res.ok) return;
        const data = await res.json();

        const record = data.vendor as LiveVendorRecord | null;
        const prefill = data.prefill || {};
        const draft: VendorOnboardingDraft = record?.onboarding ?? {};

        // Live vendors are offered their dashboard before re-entering the wizard.
        setIsLive(
          app?.stage === "verified" &&
            (record?.moderation === "Approved" || Boolean(record?.approvedSnapshot)),
        );

        // Resume where they left off. A submitted (pending) application lands
        // on the confirmation; otherwise the saved step, capped at Review.
        const savedStep = draft.step ?? 1;
        const resumeStep =
          app?.stage === "pending" ? 6 : Math.min(Math.max(savedStep, 1), 5);
        setCurrentStep(resumeStep);
        setMaxPhase(Math.max(draft.maxPhase ?? 0, Math.min(resumeStep, 5) - 1));

        setFormData((prev) => {
          // Extract quotas from existing menu sections if present
          const existingSilverQuotas = { ...prev.silverQuotas };
          const existingGoldQuotas = { ...prev.goldQuotas };
          if (record?.menu?.length) {
            for (const sec of record.menu) {
              if (sec.tierItems?.Silver !== undefined && sec.categoryId in existingSilverQuotas) {
                existingSilverQuotas[sec.categoryId as keyof CourseQuotas] = sec.tierItems.Silver;
              }
              if (sec.tierItems?.Gold !== undefined && sec.categoryId in existingGoldQuotas) {
                existingGoldQuotas[sec.categoryId as keyof CourseQuotas] = sec.tierItems.Gold;
              }
            }
          }

          return {
            ...prev,
            ownerName: draft.ownerName || session?.name || prev.ownerName,
            businessName: record?.business || prefill.business || prev.businessName,
            email: record?.ownerEmail || session?.email || prev.email,
            // Accounts don't store a phone; signup hands it over via the browser draft.
            phone: draft.phone || prefill.phone || readDraft(session?.email).phone || prev.phone,
            gstNumber: draft.gstNumber || prev.gstNumber,
            fssaiNumber: draft.fssaiNumber || prev.fssaiNumber,
            documents: Object.fromEntries(
              Object.entries(draft.docs ?? {}).map(([k, d]) => [
                k,
                { fileName: d!.fileName, status: "done" as const, id: d!.id },
              ]),
            ),
            goldRate: draft.goldRate || prev.goldRate,
            city: record?.city || prefill.city || prev.city,
            state: record?.state || prefill.state || prev.state,
            serviceCities: record?.serviceCities?.length
              ? record.serviceCities
              : (prefill.serviceCities?.length ? prefill.serviceCities : prev.serviceCities),
            cuisines: record?.cuisines?.length ? record.cuisines : (prefill.cuisines?.length ? prefill.cuisines : prev.cuisines),
            dietaryOffering: record?.dietaryOffering || prefill.dietaryOffering || prev.dietaryOffering,
            googleRating: record?.googleRating || prefill.googleRating || prev.googleRating,
            googleReviews: record?.googleReviews || prefill.googleReviews || prev.googleReviews,
            badges: record?.badges || prev.badges,
            serviceCategories: record?.serviceCategories?.length
              ? record.serviceCategories
              : (prefill.serviceCategories?.length ? prefill.serviceCategories : prev.serviceCategories),
            customOfferings: record?.customOfferings?.length
              ? record.customOfferings
              : (prefill.customOfferings?.length ? prefill.customOfferings : prev.customOfferings),
            cateringComponents: {
              counters: record?.cateringComponents?.counters ?? prefill.cateringComponents?.counters ?? prev.cateringComponents.counters,
              extras: record?.cateringComponents?.extras ?? prefill.cateringComponents?.extras ?? prev.cateringComponents.extras,
              essentials: record?.cateringComponents?.essentials ?? prefill.cateringComponents?.essentials ?? prev.cateringComponents.essentials,
              addons: record?.cateringComponents?.addons ?? prefill.cateringComponents?.addons ?? prev.cateringComponents.addons,
            },
            // Catering
            packageName: record?.packageName || prev.packageName,
            about: record?.about || prefill.about || prev.about,
            bestFor: record?.bestFor?.length ? record.bestFor : prev.bestFor,
            minPax: record?.minPax || prev.minPax,
            maxCapacity: record?.maxCapacity || prefill.maxCapacity || prev.maxCapacity,
            leadHours: record?.leadHours || prev.leadHours,
            // The stock placeholder isn't the vendor's photo — leave the field empty.
            image: record?.image && !isStockVendorImage(record.image) ? record.image : prev.image,
            priceFrom: record?.priceFrom || prev.priceFrom,
            goldSpecialization: record?.goldSpecialization || prev.goldSpecialization,
            silverQuotas: existingSilverQuotas,
            goldQuotas: existingGoldQuotas,
            menu: record?.menu?.length ? record.menu : prev.menu,
            featured: record?.featured?.length ? record.featured : prev.featured,
            counters: record?.counters?.length ? record.counters : (prefill.counters?.length ? prefill.counters : prev.counters),
            essentialService: record?.essentialService || prefill.essentialService || prev.essentialService,
            cutleryTier: record?.cutleryTier || prev.cutleryTier,
            // Stall
            stallConfig: record?.stallConfig || prev.stallConfig,
            // Baina
            bainaDetails: {
              ...prev.bainaDetails,
              studioName: record?.bainaDetails?.studioName || record?.business || prev.bainaDetails.studioName,
              story: record?.bainaDetails?.story || prev.bainaDetails.story,
              minOrderBoxes: record?.bainaDetails?.minOrderBoxes || prev.bainaDetails.minOrderBoxes,
              leadDays: record?.bainaDetails?.leadDays || prev.bainaDetails.leadDays,
              packaging: record?.bainaDetails?.packaging || prev.bainaDetails.packaging,
            },
            bainaBoxes: record?.bainaBoxes?.length ? record.bainaBoxes : (prefill.bainaBoxes?.length ? prefill.bainaBoxes : prev.bainaBoxes),
            existingVendorId: record?.id,
          };
        });
      } catch (err) {
        console.error("Failed to load initial vendor data", err);
      } finally {
        setLoading(false);
      }
    }

    fetchInitial();
  }, [session]);

  // Persist draft to PUT /api/vendor/menu
  const persistDraft = useCallback(
    async (
      overrideData?: Partial<OnboardingState>,
      nav?: { step: number },
    ): Promise<boolean> => {
      const target = { ...formData, ...overrideData };
      const step = nav?.step ?? currentStep;
      setSaving(true);
      setSaveError("");

      try {
        // Reconcile tierItems in menu based on silverQuotas and goldQuotas
        const reconciledMenu = (target.menu || []).map((sec) => {
          const sQ = target.silverQuotas?.[sec.categoryId as keyof CourseQuotas];
          const gQ = target.goldQuotas?.[sec.categoryId as keyof CourseQuotas];
          if (sQ !== undefined || gQ !== undefined) {
            return {
              ...sec,
              tierItems: {
                ...(sec.tierItems || {}),
                ...(sQ !== undefined ? { Silver: sQ } : {}),
                ...(gQ !== undefined ? { Gold: gQ } : {}),
              },
            };
          }
          return sec;
        });

        // Ensure signature dishes are <= 4 and only contain valid dishes
        const allDishNames = new Set(reconciledMenu.flatMap((s) => s.items.map((i) => i.name)));
        const validFeatured = (target.featured || []).filter((name) => allDishNames.has(name)).slice(0, 4);

        // Only a SELECTED service's builder data is sent — anything filled in
        // for a service the vendor later dropped never reaches their listing.
        const has = (id: string) => target.serviceCategories.includes(id);
        const catering = has("full-catering");
        const docs = Object.fromEntries(
          Object.entries(target.documents)
            .filter(([, d]) => d.status === "done" && d.id)
            .map(([k, d]) => [k, { id: d.id, fileName: d.fileName }]),
        );
        const payload = {
          business: target.businessName,
          city: target.city,
          state: target.state,
          cuisines: target.cuisines,
          about: target.about,
          priceFrom: catering ? target.priceFrom || 0 : 0,
          maxCapacity: target.maxCapacity,
          leadHours: target.leadHours,
          minPax: target.minPax,
          serviceCities: target.serviceCities,
          dietaryOffering: target.dietaryOffering,
          googleRating: target.googleRating,
          googleReviews: target.googleReviews,
          serviceCategories: target.serviceCategories,
          // Cover photo: an own upload URL or a pasted https link; null clears a
          // previously pasted link (the server then falls back to an upload / stock).
          image: target.image ?? null,
          customOfferings: target.customOfferings,
          cateringComponents: target.cateringComponents,
          // The stall builder mirrors its platform dishes into menu[], so the
          // menu travels whenever either service is on.
          menu: catering || has("single-stall") ? reconciledMenu : [],
          ...(catering
            ? {
                bestFor: target.bestFor,
                packageName: target.packageName,
                goldSpecialization: target.goldSpecialization,
                cutleryTier: target.cutleryTier,
                featured: validFeatured,
                counters: target.counters,
                essentialService: target.essentialService,
              }
            : {}),
          ...(has("single-stall") ? { stallConfig: target.stallConfig } : {}),
          ...(has("baina-box")
            ? { bainaDetails: target.bainaDetails, bainaBoxes: target.bainaBoxes }
            : {}),
          // Private wizard progress — restores identity/KYC and the step on
          // refresh. Never shown to customers.
          onboarding: {
            ownerName: target.ownerName,
            phone: target.phone,
            gstNumber: target.gstNumber,
            fssaiNumber: target.fssaiNumber,
            docs,
            step: Math.min(step, 5),
            maxPhase: Math.max(maxPhase, Math.min(step, 5) - 1),
            goldRate: target.goldRate,
          },
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

        const saved = await res.json().catch(() => null);
        if (saved?.vendor?.id) {
          setFormData((prev) => (prev.existingVendorId ? prev : { ...prev, existingVendorId: saved.vendor.id }));
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
    [formData, currentStep, maxPhase],
  );

  const top = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const goStep = (step: number) => {
    setCurrentStep(step);
    setMaxPhase((m) => Math.max(m, Math.min(step, 5) - 1));
    top();
  };

  /** Save the draft (recording where the vendor is headed), then navigate. */
  const saveThen = async (next: () => void, step?: number) => {
    if (await persistDraft(undefined, step ? { step } : undefined)) next();
  };

  const handleStep1Continue = () => saveThen(() => goStep(2), 2);
  const handleStep2Continue = () => saveThen(() => goStep(3), 3);

  const handleStep3Finish = () =>
    saveThen(() => {
      const branches = getActiveBranches(formData.serviceCategories);
      setBranchIndex(0);
      setCatSection("5A");
      setStallSection("6A");
      setBainaSection("7A");
      goStep(branches.length > 0 ? 4 : 5);
    }, getActiveBranches(formData.serviceCategories).length > 0 ? 4 : 5);

  const handleFinishBranch = () =>
    saveThen(() => {
      if (branchIndex < activeBranches.length - 1) {
        setBranchIndex(branchIndex + 1);
        top();
      } else {
        goStep(5);
      }
    });

  const handleBackFromBranch = () => {
    if (branchIndex > 0) {
      const prevIdx = branchIndex - 1;
      const prevBranch = activeBranches[prevIdx];
      // land on the last section of the previous builder
      if (prevBranch === "catering") {
        const secs = activeCateringSections(formData.cateringComponents);
        setCatSection(secs[secs.length - 1].id);
      } else if (prevBranch === "stall") setStallSection("6B");
      else if (prevBranch === "baina") setBainaSection("7C");
      setBranchIndex(prevIdx);
      top();
    } else {
      goStep(3);
    }
  };

  const handleBackFromReview = () => {
    if (activeBranches.length === 0) return goStep(3);
    const last = activeBranches.length - 1;
    const b = activeBranches[last];
    if (b === "catering") {
      const secs = activeCateringSections(formData.cateringComponents);
      setCatSection(secs[secs.length - 1].id);
    } else if (b === "stall") setStallSection("6B");
    else setBainaSection("7C");
    setBranchIndex(last);
    goStep(4);
  };

  const handleReviewEdit = (to: ReviewJump) => {
    if (to.step === "details") return goStep(1);
    if (to.step === "offerings") return goStep(3);
    const idx = activeBranches.indexOf(to.step);
    if (idx === -1) return;
    if (to.step === "catering") setCatSection(to.section);
    if (to.step === "stall") setStallSection(to.section);
    if (to.step === "baina") setBainaSection(to.section);
    setBranchIndex(idx);
    goStep(4);
  };

  // Final submit: save the draft, then create / resubmit the ONE application
  // bound to this account. The server re-validates the saved listing.
  const handleSubmit = async () => {
    if (!(await persistDraft(undefined, { step: 5 }))) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/vendor/application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerName: formData.ownerName || session?.name || "",
          phone: formData.phone,
          gstNumber: formData.gstNumber,
          fssaiNumber: formData.fssaiNumber,
          docIds: Object.fromEntries(
            Object.entries(formData.documents)
              .filter(([, d]) => d.status === "done" && d.id)
              .map(([k, d]) => [k, d.id]),
          ),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSaveError(data?.error || "Couldn't submit your application. Please try again.");
        return;
      }
      setApplication(data?.application ?? null);
      goStep(6);
    } catch {
      setSaveError("Network error while submitting. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const jumpToPhase = (idx: number) => {
    // 0 Identity · 1 KYC · 2 Offerings · 3 Service Setup · 4 Review · 5 Go Live
    if (idx > maxPhase || idx === 5) return;
    if (idx === 3) {
      if (!activeBranches.length) return;
      setBranchIndex(0);
    }
    goStep(idx + 1);
  };

  if (loading) {
    return (
      <div className="vob vob-shell">
        <div className="wizard-body" style={{ justifyContent: "center" }}>
          <p className="step-subtext">Loading your vendor registration workspace...</p>
        </div>
      </div>
    );
  }

  // A live vendor re-entering the wizard: offer the dashboard first.
  if (isLive && !editingLive) {
    return (
      <div className="vob vob-shell">
        <div className="wizard-body" style={{ justifyContent: "center" }}>
          <div className="content-card" style={{ textAlign: "center", padding: "40px 20px", maxWidth: 560, margin: "0 auto" }}>
            <h1 className="step-heading" style={{ fontSize: 24 }}>
              You&apos;re live on Bhojpatra
            </h1>
            <p className="step-subtext" style={{ margin: "8px auto 20px auto" }}>
              Your kitchen is verified and visible to customers. Manage bookings and menus from your dashboard. If you
              edit your listing here, your current listing stays live while the changes are reviewed.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <a href="/vendor/dashboard" className="btn-next" style={{ textDecoration: "none" }}>
                Go to Vendor Dashboard →
              </a>
              <button type="button" className="btn-back" onClick={() => setEditingLive(true)}>
                Edit my listing
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const vendorId = formData.existingVendorId
    ? `VEN-${formData.existingVendorId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`
    : "VEN-PENDING";

  const builderTag = (() => {
    if (currentStep !== 4) return "Onboarding";
    if (currentBranch === "catering") return ["5E", "5F", "5G", "5H"].includes(catSection) ? "Feast Extras" : "Feast Builder";
    if (currentBranch === "stall") return "Stall Builder";
    return "Baina Builder";
  })();

  const servicePills = [
    ...(formData.serviceCategories.includes("full-catering") ? ["Feast Booking"] : []),
    ...(formData.serviceCategories.includes("single-stall") ? ["Stall"] : []),
    ...(formData.serviceCategories.includes("baina-box") ? ["Baina Boxes"] : []),
  ];

  const phase = currentStep <= 3 ? currentStep - 1 : currentStep === 4 ? 3 : currentStep === 5 ? 4 : 5;

  return (
    <ShellSlots.Provider value={{ footer: footerSlot, subnav: subnavSlot }}>
    <div className="vob vob-shell">
      <PhaseStepper phase={phase} maxReached={maxPhase} onJump={jumpToPhase} />

      {currentStep > 1 && (
        <VendorContextHeader
          businessName={formData.businessName}
          city={formData.city}
          state={formData.state}
          googleRating={formData.googleRating}
          googleReviews={formData.googleReviews}
          services={servicePills}
          dietaryOffering={formData.dietaryOffering}
          builderTag={builderTag}
          onEditDetails={() => goStep(1)}
          isSaving={saving}
          lastSavedAt={lastSavedAt}
        />
      )}

      {/* Builder breadcrumb pills portal in here (SubnavPills). */}
      <div ref={setSubnavSlot} />

      <div className="wizard-body">
      <article className="step-container active">
      {saveError && (
        <div role="alert" className="vob-save-error">
          <span>⚠️ {saveError}</span>
          <button type="button" onClick={() => setSaveError("")} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {(application?.stage === "changes-requested" || application?.stage === "rejected") && currentStep < 6 && (
        <div role="status" className="vob-save-error">
          <span>
            {application.stage === "changes-requested"
              ? "Changes requested by our review team"
              : "Your application was not approved"}
            {application.reviewReason ? `: ${application.reviewReason}` : "."}
            {application.stage === "changes-requested" ? " Update your details and submit again." : ""}
          </span>
        </div>
      )}

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
            image: formData.image,
            accountId: formData.existingVendorId
              ? `VND-${formData.existingVendorId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`
              : undefined,
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
          onDocChange={(key, doc) =>
            setFormData((prev) => ({ ...prev, documents: { ...prev.documents, [key]: doc } }))
          }
          onBack={() => goStep(1)}
          onContinue={handleStep2Continue}
          saving={saving}
        />
      )}

      {currentStep === 3 && (
        <Step3Offerings
          data={{
            serviceCategories: formData.serviceCategories,
            customOfferings: formData.customOfferings,
            cateringComponents: formData.cateringComponents,
            badges: formData.badges,
          }}
          onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
          onBack={() => goStep(2)}
          onFinishStep3={handleStep3Finish}
          saving={saving}
        />
      )}

      {currentStep === 4 && currentBranch === "catering" && (
        <CateringBuilder
          data={{
            packageName: formData.packageName,
            about: formData.about,
            bestFor: formData.bestFor,
            minPax: formData.minPax,
            maxCapacity: formData.maxCapacity,
            leadHours: formData.leadHours,
            image: formData.image,
            priceFrom: formData.priceFrom,
            goldRate: formData.goldRate,
            goldSpecialization: formData.goldSpecialization,
            silverQuotas: formData.silverQuotas,
            goldQuotas: formData.goldQuotas,
            menu: formData.menu,
            featured: formData.featured,
            counters: formData.counters,
            essentialService: formData.essentialService,
            cutleryTier: formData.cutleryTier,
            cateringComponents: formData.cateringComponents,
          }}
          onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
          onBackToPreviousService={handleBackFromBranch}
          onFinishCatering={handleFinishBranch}
          onSaveDraft={() => persistDraft()}
          saving={saving}
          section={catSection}
          onSectionChange={setCatSection}
        />
      )}

      {currentStep === 4 && currentBranch === "stall" && (
        <SingleStallBuilder
          data={{ stallConfig: formData.stallConfig, menu: formData.menu }}
          dietaryOffering={formData.dietaryOffering}
          onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
          onBackToPreviousService={handleBackFromBranch}
          onFinishStall={handleFinishBranch}
          onSaveDraft={() => persistDraft()}
          saving={saving}
          section={stallSection}
          onSectionChange={setStallSection}
        />
      )}

      {currentStep === 4 && currentBranch === "baina" && (
        <BainaBuilder
          data={{ bainaDetails: formData.bainaDetails, bainaBoxes: formData.bainaBoxes }}
          onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
          onBackToPreviousService={handleBackFromBranch}
          onFinishBaina={handleFinishBranch}
          onSaveDraft={() => persistDraft()}
          saving={saving}
          section={bainaSection}
          onSectionChange={setBainaSection}
        />
      )}

      {currentStep === 5 && isLive && (
        <p className="step-subtext" role="note" style={{ marginBottom: 12 }}>
          ℹ️ You&apos;re live. Submitting sends these changes for review — customers keep seeing your current approved
          listing until they&apos;re approved.
        </p>
      )}

      {currentStep === 5 && (
        <Step8MasterReview
          data={formData}
          onEdit={handleReviewEdit}
          onBack={handleBackFromReview}
          onSubmit={handleSubmit}
          onPreview={() => setPreviewOpen(true)}
          saving={saving}
        />
      )}

      {currentStep === 6 && (
        <Step9Complete vendorId={vendorId} onPreview={() => setPreviewOpen(true)} onBack={() => goStep(5)} />
      )}

      <StorefrontPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} data={formData} />
      </article>
      </div>

      {/* Each step's Back / Continue footer portals in here (FlowFooter). */}
      <div ref={setFooterSlot} className="vob-footer-slot" />
    </div>
    </ShellSlots.Provider>
  );
}
