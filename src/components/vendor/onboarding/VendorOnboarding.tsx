"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
} from "@/lib/vendorMenus";
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

const DEFAULT_MENU_SECTIONS: VendorMenuSection[] = [
  {
    categoryId: "welcome",
    perPlate: 40,
    items: [
      { name: "Masala Jaljeera Cooler", diet: "veg", desc: "Refreshing cumin and mint cooler" },
      { name: "Aam Panna", diet: "veg", desc: "Tangy raw mango roasted aperitif" },
      { name: "Rose Sharbat", diet: "veg", desc: "Fragrant rose petal nectar with basil seeds" },
    ],
    tierItems: { Silver: 1, Gold: 2 },
  },
  {
    categoryId: "starters",
    perPlate: 70,
    items: [
      { name: "Paneer Malai Tikka", diet: "veg", desc: "Charcoal grilled cottage cheese in rich cream" },
      { name: "Hara Bhara Kebab", diet: "veg", desc: "Crispy spinach and green pea patties with spiced dip" },
      { name: "Tandoori Stuffed Mushroom", diet: "veg", desc: "Button mushrooms filled with spiced paneer" },
      { name: "Crispy Corn Fritters", diet: "veg", desc: "Sweet golden corn tossed in lemon pepper" },
    ],
    tierItems: { Silver: 2, Gold: 5 },
  },
  {
    categoryId: "main",
    perPlate: 120,
    items: [
      { name: "Paneer Butter Masala", diet: "veg", desc: "Silky tomato butter gravy with soft paneer cubes" },
      { name: "Dal Makhani Handi", diet: "veg", desc: "Black lentils slow-simmered overnight with white butter" },
      { name: "Awadhi Veg Dum Biryani", diet: "veg", desc: "Aromatic long-grain basmati with saffron and vegetables" },
      { name: "Mix Veg Handi", diet: "veg", desc: "Seasonal garden vegetables in whole ground masala" },
    ],
    tierItems: { Silver: 3, Gold: 5 },
  },
  {
    categoryId: "breads",
    perPlate: 35,
    items: [
      { name: "Butter Naan", diet: "veg", desc: "Layered tandoori bread brushed with melted butter" },
      { name: "Tandoori Roti", diet: "veg", desc: "Traditional whole wheat roti baked crisp in clay oven" },
      { name: "Lachha Parantha", diet: "veg", desc: "Multi-layered flaky spiral whole wheat bread" },
    ],
    tierItems: { Silver: 1, Gold: 2 },
  },
  {
    categoryId: "sweets",
    perPlate: 80,
    items: [
      { name: "Hot Gulab Jamun", diet: "veg", desc: "Soft khoya dumplings soaked in warm cardamom syrup" },
      { name: "Live Jalebi with Rabri", diet: "veg", desc: "Crisp golden jalebis paired with thick chilled rabri" },
      { name: "Kesar Rasmalai", diet: "veg", desc: "Chilled cottage cheese discs steeped in saffron milk" },
    ],
    tierItems: { Silver: 1, Gold: 3 },
  },
];

const DEFAULT_BAINA_BOXES: VendorBainaBox[] = [
  {
    name: "Royal Heritage Mithai Box",
    contents: "Kaju Katli, Kesar Peda, Motichoor Laddu & Roasted Cashews",
    price: 450,
    price1kg: 850,
  },
  {
    name: "Artisan Dry Fruit & Sweets Casket",
    contents: "Mamra Almonds, Kashmiri Walnuts, Pistachios & Anjeer Barfi",
    price: 650,
    price1kg: 1200,
  },
];



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
  const router = useRouter();
  const [footerSlot, setFooterSlot] = useState<HTMLElement | null>(null);
  const [subnavSlot, setSubnavSlot] = useState<HTMLElement | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

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
    cateringComponents: { counters: true, extras: true, essentials: true, addons: true },
    // Catering
    packageName: "Royal Awadhi Feast",
    about: "",
    bestFor: ["Weddings", "Receptions"],
    minPax: 50,
    maxCapacity: 1000,
    leadHours: 48,
    image: undefined,
    priceFrom: 799,
    goldRate: 1199,
    goldSpecialization: "Dum Pukht Specialist",
    silverQuotas: { welcome: 1, starters: 2, main: 3, breads: 1, sweets: 1 },
    goldQuotas: { welcome: 1, starters: 5, main: 5, breads: 2, sweets: 3 },
    menu: DEFAULT_MENU_SECTIONS,
    featured: ["Paneer Malai Tikka", "Paneer Butter Masala", "Awadhi Veg Dum Biryani", "Live Jalebi with Rabri"],
    counters: [
      { id: "chaat", price: 60, items: ["Golgappa / Pani Puri", "Aloo Tikki Chaat", "Papdi Chaat"] },
      { id: "pan", price: 40, items: ["Banarasi Meetha Paan", "Saada Paan"] },
    ],
    essentialService: {
      perGuest: 0,
      includes: ["Uniformed Stewards", "Buffet Tables & Linens", "Acrylic Food Labels", "Waste Bins"],
    },
    cutleryTier: "essential",
    // Single Stall
    stallConfig: {
      categories: ["chaat"],
      categoryPricing: {
        chaat: { fixedPerPlate: 60, minPaxGuarantee: 50 },
      },
      equipment: ["Charcoal Sigdi", "Buffet Warmers"],
      cutlery: "Biodegradable Bagasse",
    },
    // Baina Box
    bainaDetails: {
      studioName: "",
      story: "",
      minOrderBoxes: 25,
      leadDays: 3,
      packaging: "velvet",
    },
    bainaBoxes: DEFAULT_BAINA_BOXES,
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
            ownerName: session?.name || prev.ownerName,
            businessName: record?.business || prefill.business || prev.businessName,
            email: record?.ownerEmail || session?.email || prev.email,
            phone: prev.phone || prefill.phone || "",
            city: record?.city || prefill.city || prev.city,
            state: record?.state || prefill.state || prev.state,
            serviceCities: record?.serviceCities?.length
              ? record.serviceCities
              : (prefill.serviceCities?.length ? prefill.serviceCities : prev.serviceCities),
            cuisines: record?.cuisines?.length ? record.cuisines : (prefill.cuisines?.length ? prefill.cuisines : prev.cuisines),
            dietaryOffering: record?.dietaryOffering || prefill.dietaryOffering || prev.dietaryOffering,
            googleRating: record?.googleRating || prefill.googleRating || prev.googleRating,
            googleReviews: record?.googleReviews || prefill.googleReviews || prev.googleReviews,
            badges: record?.badges || prefill.badges || prev.badges,
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
            image: record?.image || prev.image,
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

        const payload = {
          business: target.businessName || "New Catering Vendor",
          city: target.city || "Lucknow",
          state: target.state || "Uttar Pradesh",
          cuisines: target.cuisines.length ? target.cuisines : ["North Indian"],
          about: target.about,
          priceFrom: target.priceFrom || 799,
          maxCapacity: target.maxCapacity,
          leadHours: target.leadHours,
          minPax: target.minPax,
          bestFor: target.bestFor,
          packageName: target.packageName,
          goldSpecialization: target.goldSpecialization,
          cutleryTier: target.cutleryTier,
          serviceCities: target.serviceCities,
          dietaryOffering: target.dietaryOffering,
          googleRating: target.googleRating,
          googleReviews: target.googleReviews,
          serviceCategories: target.serviceCategories,
          customOfferings: target.customOfferings,
          badges: target.badges,
          featured: validFeatured,
          counters: target.counters,
          essentialService: target.essentialService,
          stallConfig: target.stallConfig,
          bainaDetails: target.bainaDetails,
          bainaBoxes: target.bainaBoxes,
          cateringComponents: target.cateringComponents,
          menu: reconciledMenu,
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
    [formData],
  );

  const top = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const goStep = (step: number) => {
    setCurrentStep(step);
    setMaxPhase((m) => Math.max(m, Math.min(step, 5) - 1));
    top();
  };

  const saveThen = async (next: () => void) => {
    if (await persistDraft()) next();
  };

  const handleStep1Continue = () => saveThen(() => goStep(2));
  const handleStep2Continue = () => saveThen(() => goStep(3));

  const handleStep3Finish = () =>
    saveThen(() => {
      const branches = getActiveBranches(formData.serviceCategories);
      setBranchIndex(0);
      setCatSection("5A");
      setStallSection("6A");
      setBainaSection("7A");
      goStep(branches.length > 0 ? 4 : 5);
    });

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

  const handleSubmit = () => saveThen(() => goStep(6));

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
            accountId: formData.existingVendorId
              ? `VND-${formData.existingVendorId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`
              : undefined,
          }}
          onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
          onContinue={handleStep1Continue}
          onSignIn={() => router.push("/vendor/dashboard")}
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
