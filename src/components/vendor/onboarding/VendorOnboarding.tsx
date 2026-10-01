"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Button } from "@/components/ui";

interface OnboardingState {
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

const STEP_TITLES = [
  "Identity & Operations",
  "KYC & Compliance",
  "Service Offerings",
  "Specialized Service Builders",
];

export default function VendorOnboarding() {
  const session = useSession();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [branchIndex, setBranchIndex] = useState<number>(0);
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
      const branches = getActiveBranches(formData.serviceCategories);
      if (branches.length > 0) {
        setBranchIndex(0);
        setCurrentStep(4);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setIsCompleted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handleFinishBranch = async () => {
    const ok = await persistDraft();
    if (ok) {
      if (branchIndex < activeBranches.length - 1) {
        setBranchIndex(branchIndex + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setIsCompleted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handleBackFromBranch = () => {
    if (branchIndex > 0) {
      setBranchIndex(branchIndex - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setCurrentStep(3);
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

  // ── Stage 4 Milestone Completed View ──
  if (isCompleted) {
    const totalDishes = (formData.menu || []).reduce(
      (acc, sec) => acc + (sec.items?.length || 0),
      0,
    );

    return (
      <div className="mx-auto max-w-4xl space-y-6 py-6 animate-in fade-in duration-200">
        <div className="rounded-card border-2 border-emerald-500/40 bg-emerald-50/60 p-6 sm:p-8 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-3xl text-white shadow-sm">
            ✓
          </div>
          <h2 className="mt-4 text-xl sm:text-2xl font-bold text-ink">
            Stage 4 Complete: Specialized Service Builders Configured!
          </h2>
          <p className="mt-2 text-sm text-ink-soft max-w-2xl mx-auto leading-relaxed">
            Your brand identity, KYC compliance, and detailed service builder configurations have been successfully validated and persisted to Bhojpatra&apos;s live database.
          </p>

          {/* Detailed Recap Cards */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 text-left text-xs sm:text-sm">
            {/* Identity & Operations Recap */}
            <div className="rounded-card border border-cream-3 bg-white p-4.5 space-y-2.5 shadow-2xs">
              <h4 className="font-bold text-ink flex items-center gap-1.5 border-b border-cream-2 pb-2">
                <span>🏢</span>
                <span>Brand & Operations</span>
              </h4>
              <div className="flex justify-between">
                <span className="text-ink-soft">Business Name:</span>
                <span className="font-bold text-ink">{formData.businessName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Kitchen Base:</span>
                <span className="font-semibold text-ink">{formData.city}, {formData.state}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Dietary Offering:</span>
                <span className="font-semibold text-maroon uppercase">{formData.dietaryOffering}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Service Coverage:</span>
                <span className="font-semibold text-ink">{formData.serviceCities.join(", ") || "Base city"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Compliance:</span>
                <span className="font-semibold text-emerald-700">GST & FSSAI Declared</span>
              </div>
            </div>

            {/* Service Scope Recap */}
            <div className="rounded-card border border-cream-3 bg-white p-4.5 space-y-2.5 shadow-2xs">
              <h4 className="font-bold text-ink flex items-center gap-1.5 border-b border-cream-2 pb-2">
                <span>📦</span>
                <span>Active Service Builders</span>
              </h4>
              {formData.serviceCategories.includes("full-catering") && (
                <div className="space-y-1">
                  <div className="flex justify-between font-semibold text-ink">
                    <span>🍲 Full Catering Package:</span>
                    <span className="text-maroon">Silver ₹{formData.priceFrom} / Gold ₹{formData.goldRate}</span>
                  </div>
                  <p className="text-[11px] text-ink-soft">
                    {totalDishes} dishes published across 5 plated courses · {formData.counters.length} counters & extras · Tableware {formData.cutleryTier}
                  </p>
                </div>
              )}
              {formData.serviceCategories.includes("single-stall") && (
                <div className="space-y-1 pt-1 border-t border-cream-2/60">
                  <div className="flex justify-between font-semibold text-ink">
                    <span>🍢 Single Stall Workspace:</span>
                    <span className="text-maroon">{(formData.stallConfig.categories || []).length} categories</span>
                  </div>
                  <p className="text-[11px] text-ink-soft">
                    Equipment: {(formData.stallConfig.equipment || []).join(", ") || "Standard"} · Cutlery: {formData.stallConfig.cutlery}
                  </p>
                </div>
              )}
              {formData.serviceCategories.includes("baina-box") && (
                <div className="space-y-1 pt-1 border-t border-cream-2/60">
                  <div className="flex justify-between font-semibold text-ink">
                    <span>🎁 Baina Box Atelier:</span>
                    <span className="text-maroon">{(formData.bainaBoxes || []).length} curated boxes</span>
                  </div>
                  <p className="text-[11px] text-ink-soft">
                    Min guarantee: {formData.bainaDetails.minOrderBoxes} boxes · Lead: {formData.bainaDetails.leadDays} days · Style: {formData.bainaDetails.packaging}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-control bg-cream-2/70 p-4 text-xs text-ink-soft max-w-xl mx-auto text-left leading-relaxed">
            ℹ️ <strong>Stage 4 Complete:</strong> Specialized service builders are saved. In Stage 5, the Master Review, Public Storefront Preview, and Final Jury Tasting application will be unlocked.
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button href="/vendor/dashboard" size="lg" className="min-h-[44px]">
              Go to Vendor Dashboard →
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => {
                setIsCompleted(false);
                setCurrentStep(4);
                setBranchIndex(0);
              }}
              className="min-h-[44px]"
            >
              Review / Edit Service Builders
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => {
                setIsCompleted(false);
                setCurrentStep(1);
              }}
              className="min-h-[44px] text-ink-soft"
            >
              Edit Steps 1–3
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Determine header step title
  let headerStepTitle = STEP_TITLES[currentStep - 1];
  if (currentStep === 4) {
    if (currentBranch === "catering") {
      headerStepTitle = `Full Catering Builder (${branchIndex + 1}/${activeBranches.length})`;
    } else if (currentBranch === "stall") {
      headerStepTitle = `Single Stall Builder (${branchIndex + 1}/${activeBranches.length})`;
    } else if (currentBranch === "baina") {
      headerStepTitle = `Baina Box Builder (${branchIndex + 1}/${activeBranches.length})`;
    }
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
        totalSteps={4}
        stepTitle={headerStepTitle}
        isSaving={saving}
        lastSavedAt={lastSavedAt}
      />

      {saveError && (
        <div className="mb-4 rounded-control bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center justify-between">
          <span>⚠️ {saveError}</span>
          <button
            type="button"
            onClick={() => setSaveError("")}
            className="text-red-500 font-bold ml-2 min-h-[32px] min-w-[32px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Step 1: Identity & Operations */}
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
              ? `VND-${formData.existingVendorId.slice(-6).toUpperCase()}`
              : formData.email
                ? `VND-${Math.abs(formData.email.split("").reduce((acc, c) => (acc << 5) - acc + c.charCodeAt(0), 0)).toString().slice(-6).padStart(6, "0")}`
                : "VND-884291",
          }}
          onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
          onContinue={handleStep1Continue}
          saving={saving}
        />
      )}

      {/* Step 2: KYC & Compliance */}
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

      {/* Step 3: Service Offerings Scope */}
      {currentStep === 3 && (
        <Step3Offerings
          data={{
            serviceCategories: formData.serviceCategories,
            customOfferings: formData.customOfferings,
            cateringComponents: formData.cateringComponents,
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

      {/* Step 4: Specialized Service Builders */}
      {currentStep === 4 && (
        <>
          {currentBranch === "catering" && (
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
            />
          )}

          {currentBranch === "stall" && (
            <SingleStallBuilder
              data={{
                stallConfig: formData.stallConfig,
                menu: formData.menu,
              }}
              onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
              onBackToPreviousService={handleBackFromBranch}
              onFinishStall={handleFinishBranch}
              onSaveDraft={() => persistDraft()}
              saving={saving}
            />
          )}

          {currentBranch === "baina" && (
            <BainaBuilder
              data={{
                bainaDetails: formData.bainaDetails,
                bainaBoxes: formData.bainaBoxes,
              }}
              onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
              onBackToPreviousService={handleBackFromBranch}
              onFinishBaina={handleFinishBranch}
              onSaveDraft={() => persistDraft()}
              saving={saving}
            />
          )}
        </>
      )}
    </div>
  );
}
