"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui";

export type BadgeId = "verified-caterer" | "city-icon-caterer" | "heritage-caterer";

export interface BadgeApplicationRecord {
  badgeId: string;
  status: "not_applied" | "in_progress" | "submitted";
  currentStep: number;
  submittedAt?: string;

  // Verified Caterer fields
  operatingExperience?: string;
  fssaiNumber?: string;
  gstStatus?: string;
  gstin?: string;
  panNumber?: string;
  bankDetailsConfirmed?: boolean;
  kitchenSetup?: string;
  hygieneSafetyConfirmed?: boolean;
  serviceRadiusKm?: string;
  menuPricingDefined?: boolean;
  eventReferences?: string;
  noCustomerComplaintsConfirmed?: boolean;
  qualityInspectionAgreed?: boolean;

  // City Icon Caterer fields
  cityOperatingYears?: string;
  cityRegionReputation?: string;
  customerReviewHighlight?: string;
  foodQualityBenchmark?: string;
  eventExecutionScale?: string;
  menuDepthPresentation?: string;
  manpowerLogisticsCapacity?: string;
  operationalAuditAgreed?: boolean;
  // City Icon 6 Plus Points (Optional)
  hasSignatureCuisine?: boolean;
  signatureCuisineDetails?: string;
  catersLargeWeddings?: boolean;
  weddingCateringScale?: string;
  hasLocalBrandRecall?: boolean;
  brandRecallNotes?: string;
  notableVenuesServed?: boolean;
  notableVenuesDetails?: string;
  hasSocialPresence?: boolean;
  socialPresenceUrl?: string;
  hasRepeatCustomers?: boolean;
  repeatCustomerShare?: string;

  // Heritage Caterer fields (9 criteria)
  legacyYears?: string;
  foundingYear?: string;
  isFamilyRunLegacy?: boolean;
  familyBusinessNotes?: string;
  culinaryTraditionConnection?: string;
  multiGenerationalOrLegacyProof?: string;
  recognizedReputationNotes?: string;
  signatureTraditionalDishes?: string;
  consistentQualityBenchmark?: string;
  historicalReferences?: string;
  verificationProcessAgreed?: boolean;
}

interface BadgeApplicationModalProps {
  badgeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  badgeData: BadgeApplicationRecord;
  onUpdateData: (data: Partial<BadgeApplicationRecord>) => void;
  onSubmitApplication: (badgeId: string) => void;
  vendorAccount: {
    fullName: string;
    businessName: string;
    email: string;
    mobile: string;
  };
}

export default function BadgeApplicationModal({
  badgeId,
  isOpen,
  onClose,
  badgeData,
  onUpdateData,
  onSubmitApplication,
  vendorAccount,
}: BadgeApplicationModalProps) {
  const { t } = useLang();

  // Local active step inside the modal:
  // Step 1: Badge Introduction
  // Step 2: Eligibility / Requirements
  // Step 3: Application Details
  // Step 4: Review
  // Step 5: Submit
  // Step 6: Application Submitted
  const isAlreadySubmitted = badgeData?.status === "submitted";
  const [step, setStep] = useState<number>(isAlreadySubmitted ? 4 : badgeData?.currentStep || 1);
  const [validationError, setValidationError] = useState<string>("");

  // Sync step if badge changes
  useEffect(() => {
    if (isAlreadySubmitted) {
      setStep(4);
    } else if (badgeData?.currentStep) {
      setStep(badgeData.currentStep);
    } else {
      setStep(1);
    }
    setValidationError("");
  }, [badgeId, isAlreadySubmitted, badgeData?.currentStep]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !badgeId) return null;

  // Badge Meta Config
  const isVerified = badgeId === "verified-caterer";
  const isCityIcon = badgeId === "city-icon-caterer";
  const isHeritage = badgeId === "heritage-caterer";

  const badgeMeta = isVerified
    ? {
        name: "Verified Caterer",
        nameHi: "वेरीफाइड कैटरर",
        tagline: "Entry-Level Recognition",
        icon: "🛡️",
        hierarchyRank: 1,
        hierarchyLabel: t("Tier 1: Foundational Entry-Level Recognition", "टियर 1: प्रवेश-स्तरीय मान्यता"),
        shortDesc: t(
          "Entry-level recognition confirming essential kitchen hygiene, statutory compliance, and verifiable event delivery.",
          "बुनियादी रसोई स्वच्छता, वैधानिक अनुपालन और सत्यापन योग्य कार्यक्रम वितरण की पुष्टि करने वाली प्रवेश-स्तरीय मान्यता।"
        ),
      }
    : isCityIcon
    ? {
        name: "City Icon Caterer",
        nameHi: "सिटी आइकन कैटरर",
        tagline: "City-Level Recognition",
        icon: "👑",
        hierarchyRank: 2,
        hierarchyLabel: t("Tier 2: City-Level Recognition (Above Verified, Below Heritage)", "टियर 2: शहर-स्तरीय मान्यता (वेरीफाइड से ऊपर, हेरिटेज से नीचे)"),
        shortDesc: t(
          "City-level recognition for established caterers with a strong local reputation, proven execution scale, and consistent culinary praise.",
          "मजबूत स्थानीय प्रतिष्ठा, प्रमाणित निष्पादन क्षमता और लगातार पाक प्रशंसा वाले स्थापित कैटरर्स के लिए शहर-स्तरीय मान्यता।"
        ),
      }
    : {
        name: "Heritage Caterer",
        nameHi: "हेरिटेज कैटरर",
        tagline: "Most Exclusive Recognition",
        icon: "🏛️",
        hierarchyRank: 3,
        hierarchyLabel: t("Tier 3: Most Exclusive Recognition", "टियर 3: सर्वाधिक विशिष्ट मान्यता"),
        shortDesc: t(
          "Our most exclusive recognition for caterers with a long-standing culinary legacy of 15+ continuous years.",
          "15+ वर्षों की निरंतर पाक विरासत वाले कैटरर्स के लिए हमारी सबसे विशिष्ट मान्यता।"
        ),
      };

  function goToStep(newStep: number) {
    setValidationError("");
    setStep(newStep);
    onUpdateData({ currentStep: newStep, status: isAlreadySubmitted ? "submitted" : "in_progress" });
  }

  function handleNextFromDetails() {
    // Validate minimal prototype fields for the badge
    if (isVerified) {
      if (!badgeData.operatingExperience) {
        setValidationError(t("Please select your operating experience.", "कृपया अपने संचालन अनुभव का चयन करें।"));
        return;
      }
      if (!badgeData.fssaiNumber?.trim()) {
        setValidationError(t("Please enter your FSSAI license number or application status.", "कृपया अपना FSSAI लाइसेंस नंबर या आवेदन स्थिति दर्ज करें।"));
        return;
      }
      if (!badgeData.hygieneSafetyConfirmed) {
        setValidationError(t("Please confirm hygiene & food-safety standards compliance.", "कृपया स्वच्छता और खाद्य सुरक्षा मानकों के अनुपालन की पुष्टि करें।"));
        return;
      }
    } else if (isCityIcon) {
      if (!badgeData.cityOperatingYears) {
        setValidationError(t("Please specify your commercial operating history (minimum 5 years).", "कृपया अपने व्यावसायिक संचालन इतिहास (न्यूनतम 5 वर्ष) का उल्लेख करें।"));
        return;
      }
      if (!badgeData.cityRegionReputation?.trim()) {
        setValidationError(t("Please briefly describe your regional reputation & localities served.", "कृपया अपनी क्षेत्रीय प्रतिष्ठा और सेवा क्षेत्रों का संक्षेप में विवरण दें।"));
        return;
      }
      if (!badgeData.operationalAuditAgreed) {
        setValidationError(t("Please agree to the Bhojpatra tasting and operational audit.", "कृपया Bhojpatra टेस्टिंग और परिचालन ऑडिट के लिए सहमति दें।"));
        return;
      }
    } else if (isHeritage) {
      if (!badgeData.legacyYears) {
        setValidationError(t("Please specify your continuous culinary legacy (minimum 15 years).", "कृपया अपनी निरंतर पाक विरासत (न्यूनतम 15 वर्ष) का उल्लेख करें।"));
        return;
      }
      if (!badgeData.culinaryTraditionConnection?.trim()) {
        setValidationError(t("Please describe your connection with regional culinary traditions.", "कृपया क्षेत्रीय पाक परंपराओं से अपने जुड़ाव का विवरण दें।"));
        return;
      }
      if (!badgeData.verificationProcessAgreed) {
        setValidationError(t("Please agree to the lineage verification & tasting process.", "कृपया वंशावली सत्यापन और टेस्टिंग प्रक्रिया के लिए सहमति दें।"));
        return;
      }
    }

    goToStep(4);
  }

  function handleFinalSubmit() {
    onSubmitApplication(badgeId as string);
    setStep(6);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="badge-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/50 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-card bg-white border border-maroon/25 shadow-xl text-ink my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream-3 bg-cream/20">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-maroon/20 bg-cream/50 text-xl">
              {badgeMeta.icon}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="badge-modal-title" className="text-base sm:text-lg font-bold text-ink">
                  {badgeMeta.name}
                </h2>
                <span className="rounded-full bg-maroon/10 px-2 py-0.5 text-[11px] font-semibold text-maroon">
                  {badgeMeta.tagline}
                </span>
                {isAlreadySubmitted && (
                  <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-bold text-ink">
                    ✓ {t("Submitted", "जमा किया")}
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-soft">{badgeMeta.hierarchyLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close modal", "मोडल बंद करें")}
            className="focus-ring tap flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-cream/40 hover:text-maroon transition-colors"
          >
            <span className="text-lg font-bold">✕</span>
          </button>
        </div>

        {/* ── Stepper Navigation Bar ── */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-cream/30 border-b border-cream-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
            {[
              { num: 1, label: t("Introduction", "परिचय") },
              { num: 2, label: t("Eligibility", "पात्रता") },
              { num: 3, label: t("Details", "विवरण") },
              { num: 4, label: t("Review", "समीक्षा") },
              { num: 5, label: t("Submit", "जमा करें") },
              { num: 6, label: t("Confirmed", "पुष्टि") },
            ].map((s) => {
              const isActive = step === s.num;
              const isPast = step > s.num;
              return (
                <div key={s.num} className="flex items-center gap-1 shrink-0">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                      isActive
                        ? "bg-maroon text-cream ring-2 ring-maroon/20"
                        : isPast
                        ? "bg-cream-2 text-ink"
                        : "bg-white text-ink-soft border border-cream-3"
                    }`}
                  >
                    {isPast ? "✓" : s.num}
                  </span>
                  <span
                    className={`text-[11px] font-medium ${
                      isActive ? "text-maroon font-bold" : isPast ? "text-ink" : "text-ink-soft/70"
                    }`}
                  >
                    {s.label}
                  </span>
                  {s.num < 6 && <span className="text-ink-soft/40 px-0.5">›</span>}
                </div>
              );
            })}
          </div>

          <span className="text-[11px] font-semibold text-maroon shrink-0 ml-2">
            {t(`Step ${step} of 6`, `चरण ${step} / 6`)}
          </span>
        </div>

        {/* ── Modal Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs sm:text-sm">
          
          {/* Reused Vendor Account Context Banner (All Steps) */}
          <div className="rounded-control border border-maroon/15 bg-cream/15 p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <div>
                <span className="font-semibold text-ink">
                  {vendorAccount.businessName.trim() || vendorAccount.fullName.trim() || t("Your Catering Business", "आपकी कैटरिंग सेवा")}
                </span>
                <span className="text-ink-soft text-[11px] ml-1.5">
                  ({vendorAccount.fullName.trim() || t("Account Owner", "अकाउंट ओनर")} · {vendorAccount.mobile || t("Contact Mobile", "मोबाइल")})
                </span>
              </div>
            </div>
            <span className="text-[10.5px] font-medium text-maroon bg-cream/40 px-2 py-0.5 rounded">
              {t("Linked to Signup Profile", "साइनअप प्रोफ़ाइल से लिंक")}
            </span>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              STEP 1: BADGE INTRODUCTION
              ══════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-card border border-maroon/20 bg-cream/20 p-4 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-maroon/30 bg-white text-3xl shadow-xs mx-auto mb-2">
                  {badgeMeta.icon}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-ink">{badgeMeta.name}</h3>
                <p className="text-xs font-semibold uppercase tracking-wider text-maroon mt-0.5">
                  {badgeMeta.tagline}
                </p>
                <p className="mt-2 text-xs sm:text-sm text-ink-soft max-w-lg mx-auto leading-relaxed">
                  {badgeMeta.shortDesc}
                </p>
              </div>

              <div className="rounded-control border border-cream-3 bg-white p-3.5 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                  {t("Badge Purpose & Recognition Scope", "बैज का उद्देश्य और मान्यता दायरा")}
                </h4>
                {isVerified && (
                  <p className="text-xs text-ink-soft leading-relaxed">
                    {t(
                      "Verified Caterer serves as Bhojpatra's foundational verification mark. It certifies to event hosts that your commercial kitchen meets hygiene standards, maintains statutory food licenses (FSSAI/GST), and has completed successful tasting clearance.",
                      "वेरीफाइड कैटरर Bhojpatra के मूलभूत सत्यापन चिह्न के रूप में कार्य करता है। यह आयोजनकर्ताओं को प्रमाणित करता है कि आपकी व्यावसायिक रसोई स्वच्छता मानकों को पूरा करती है।"
                    )}
                  </p>
                )}
                {isCityIcon && (
                  <p className="text-xs text-ink-soft leading-relaxed">
                    {t(
                      "City Icon Caterer represents premier citywide recognition for established culinary brands with at least 5 years of commercial catering excellence, strong public reputation, and proven capability to flawlessly execute high-capacity banquets.",
                      "सिटी आइकन कैटरर कम से कम 5 वर्षों के व्यावसायिक कैटरिंग अनुभव वाले स्थापित ब्रांडों के लिए प्रमुख शहरव्यापी मान्यता का प्रतिनिधित्व करता है।"
                    )}
                  </p>
                )}
                {isHeritage && (
                  <p className="text-xs text-ink-soft leading-relaxed">
                    {t(
                      "Heritage Caterer is our most exclusive, pinnacle recognition honoring generational culinary custodians with 15+ continuous years of heritage. It celebrates authentic traditional recipes, artisanal techniques, and landmark community trust.",
                      "हेरिटेज कैटरर हमारी सबसे विशिष्ट मान्यता है जो 15+ निरंतर वर्षों की विरासत वाले पारंपरिक संरक्षकों को सम्मानित करती है।"
                    )}
                  </p>
                )}
              </div>

              <div className="rounded-control border border-cream-3 bg-cream/10 p-3 flex items-start gap-2.5">
                <span className="text-base text-maroon">💡</span>
                <p className="text-xs text-ink-soft leading-relaxed">
                  {t(
                    "Applying does not charge any fee. Your application details are saved safely and evaluated during your onboarding verification visit by the Bhojpatra culinary team.",
                    "आवेदन करने पर कोई शुल्क नहीं लिया जाता है। आपके विवरण सुरक्षित रूप से सहेजे जाते हैं और ऑनबोर्डिंग सत्यापन के दौरान इनका मूल्यांकन किया जाता है।"
                  )}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button variant="secondary" size="md" onClick={onClose}>
                  {t("Cancel", "रद्द करें")}
                </Button>
                <Button variant="primary" size="md" onClick={() => goToStep(2)}>
                  {t("View Eligibility & Requirements →", "पात्रता और आवश्यकताएं देखें →")}
                </Button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              STEP 2: ELIGIBILITY / REQUIREMENTS
              ══════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-ink">
                  {t("Eligibility & Qualification Criteria", "पात्रता और योग्यता मानदंड")}
                </h3>
                <p className="text-xs text-ink-soft">
                  {t(
                    "Review the qualification criteria below before providing your application details.",
                    "अपने आवेदन विवरण प्रदान करने से पहले नीचे दिए गए पात्रता मानदंडों की समीक्षा करें।"
                  )}
                </p>
              </div>

              {/* Verified Caterer 10 Requirements */}
              {isVerified && (
                <div className="rounded-control border border-maroon/20 bg-white p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-cream-3 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-maroon">
                      {t("Mandatory Requirements (All 10 Required)", "अनिवार्य आवश्यकताएं (सभी 10 आवश्यक)")}
                    </span>
                    <span className="rounded bg-maroon/10 px-2 py-0.5 text-[11px] font-bold text-maroon">
                      10 / 10 Mandatory
                    </span>
                  </div>
                  <ul className="space-y-2 text-xs">
                    {[
                      { title: "Valid FSSAI", desc: t("Active Food Safety and Standards Authority of India licence.", "सक्रिय FSSAI लाइसेंस।") },
                      { title: "GST where applicable", desc: t("Valid GSTIN registration based on statutory turnover thresholds.", "टर्नओवर सीमा के अनुसार मान्य GSTIN पंजीकरण।") },
                      { title: "PAN + business/bank details", desc: t("Verified commercial PAN and active business bank account for payouts.", "सत्यापित पैन और सक्रिय बैंक खाता।") },
                      {
                        title: "Minimum 2 years operating experience",
                        desc: t("Demonstrated commercial track record in food service or catering.", "कैटरिंग या खाद्य सेवा में प्रमाणित व्यावसायिक ट्रैक रिकॉर्ड।"),
                        exception: t("Exception allowed for a strong established brand/new entity", "मजबूत स्थापित ब्रांड या नई इकाई के लिए अपवाद की अनुमति"),
                      },
                      { title: "Proper kitchen / food preparation setup", desc: t("Dedicated commercial kitchen facility with adequate storage and clean prep stations.", "समर्पित व्यावसायिक रसोई सुविधा।") },
                      { title: "Hygiene & food-safety standards pass", desc: t("Sanitized cooking areas, food-grade vessels, pest control, and staff hygiene.", "स्वच्छ खाना पकाने का क्षेत्र और स्वच्छता मानक।") },
                      { title: "Menu, pricing and service area clearly defined", desc: t("Transparent per-plate menus, package inclusions, and designated delivery radii.", "पारदर्शी प्रति-प्लेट मेनू और सेवा क्षेत्र।") },
                      { title: "At least 3–5 genuine event references/orders", desc: t("Verifiable client contacts or completed catering event orders.", "सत्यापन योग्य ग्राहक संपर्क या पूर्ण किए गए ऑर्डर।") },
                      { title: "No serious unresolved customer complaints", desc: t("Clean service record without unresolved food quality, safety, or fulfillment escalations.", "स्वच्छ रिकॉर्ड बिना किसी अनसुलझी शिकायत के।") },
                      { title: "Bhojpatra quality inspection / tasting pass", desc: t("Successful kitchen inspection and food tasting evaluation by the Bhojpatra team.", "Bhojpatra टीम द्वारा रसोई निरीक्षण और टेस्टिंग पास।") },
                    ].map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-maroon font-bold text-xs select-none shrink-0">✓</span>
                        <div>
                          <span className="font-semibold text-ink">{req.title}</span>
                          {req.exception && (
                            <span className="ml-1.5 inline-flex items-center rounded bg-cream-2/70 px-1.5 py-0.2 text-[10.5px] font-medium text-maroon border border-maroon/20">
                              {req.exception}
                            </span>
                          )}
                          <p className="text-[11px] text-ink-soft leading-tight">{req.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* City Icon Caterer 8 Mandatory + 6 Plus Points */}
              {isCityIcon && (
                <div className="space-y-3">
                  <div className="rounded-control border border-maroon/20 bg-white p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-cream-3 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-maroon">
                        {t("Mandatory Requirements (Exactly 8)", "अनिवार्य आवश्यकताएं (बिल्कुल 8)")}
                      </span>
                      <span className="rounded bg-maroon/10 px-2 py-0.5 text-[11px] font-bold text-maroon">
                        8 Mandatory
                      </span>
                    </div>
                    <ul className="space-y-2 text-xs">
                      {[
                        { title: "Minimum 5 years of operating history", desc: t("Established commercial catering operations for at least 5 years.", "कम से कम 5 वर्षों का स्थापित कैटरिंग संचालन।") },
                        { title: "Recognised reputation in the city/region", desc: t("Well-known regional catering standing across the city.", "शहर में प्रसिद्ध क्षेत्रीय कैटरिंग पहचान।") },
                        { title: "Strong customer reviews/references", desc: t("Consistently positive ratings and verifiable host testimonials.", "लगातार सकारात्मक समीक्षाएं और प्रशंसापत्र।") },
                        { title: "Consistent food quality", desc: t("High taste consistency, authentic culinary mastery, and food benchmarks.", "लगातार उच्च स्वाद और खाद्य मानक।") },
                        { title: "Professional event execution", desc: t("Punctual buffet deployment, polished staging, and on-ground coordination.", "समय पर बुफे व्यवस्था और पेशेवर समन्वय।") },
                        { title: "Good menu depth & presentation", desc: t("Rich repertoire of multi-course spreads and elegant food presentation.", "व्यंजनों की समृद्ध श्रृंखला और सुरुचिपूर्ण प्रस्तुति।") },
                        { title: "Reliable manpower/logistics", desc: t("Experienced banquet captains, uniformed staff, and logistics fleet.", "अनुभवी बैंक्वेट कैप्टन और सुसज्जित स्टाफ।") },
                        { title: "Bhojpatra tasting + operational audit pass", desc: t("Kitchen hygiene inspection, live banquet audit, and tasting evaluation clearance.", "रसोई निरीक्षण, लाइव ऑडिट और टेस्टिंग पास।") },
                      ].map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-maroon font-bold text-xs select-none shrink-0">✓</span>
                          <div>
                            <span className="font-semibold text-ink">{req.title}</span>
                            <p className="text-[11px] text-ink-soft leading-tight">{req.desc}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Non-Mandatory Plus Points */}
                  <div className="rounded-control border border-cream-3 bg-cream/20 p-3.5 space-y-2">
                    <div className="flex items-center justify-between border-b border-cream-3 pb-2">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-ink">
                          {t("Plus Points (Optional Strengths)", "प्लस पॉइंट्स (वैकल्पिक खूबियां)")}
                        </span>
                        <p className="text-[11px] text-ink-soft mt-0.5">
                          {t("These 6 additional criteria strengthen your candidacy, but are NOT mandatory to qualify:", "ये 6 अतिरिक्त मानदंड उम्मीदवारी को मजबूत करते हैं, लेकिन अनिवार्य नहीं हैं:")}
                        </p>
                      </div>
                      <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-bold text-ink">
                        {t("Non-Mandatory", "गैर-अनिवार्य")}
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-xs">
                      {[
                        "Known for a signature cuisine/menu",
                        "Regularly caters weddings/large celebrations",
                        "Strong local brand recall",
                        "Notable venues/clients/events served",
                        "Social presence and customer reputation",
                        "Repeat customers",
                      ].map((pt, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="text-maroon font-bold text-xs select-none shrink-0">+</span>
                          <span className="text-ink font-medium">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Heritage Caterer Exactly 9 Criteria */}
              {isHeritage && (
                <div className="rounded-control border border-maroon/20 bg-white p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-cream-3 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-maroon">
                      {t("Legacy Criteria (Exactly 9 Criteria)", "विरासत मानदंड (बिल्कुल 9 मानदंड)")}
                    </span>
                    <span className="rounded bg-maroon/10 px-2 py-0.5 text-[11px] font-bold text-maroon">
                      9 Heritage Criteria
                    </span>
                  </div>
                  <ul className="space-y-2 text-xs">
                    {[
                      { title: "Minimum 15 years continuous legacy", desc: t("Continuous commercial culinary operations for 15+ years.", "15+ वर्षों से निरंतर पाक संचालन।") },
                      { title: "Preferably family-run/legacy food business", desc: t("Custodianship rooted in artisanal family enterprise or lineage.", "पारिवारिक उद्यम या वंश परंपरा में निहित संरक्षण।") },
                      { title: "Strong connection with local culinary tradition", desc: t("Deep grounding in authentic Awadhi, Purvanchali, or regional traditions.", "पारंपरिक क्षेत्रीय व्यंजनों में गहरी जड़ें।") },
                      { title: "Multiple generations involved OR demonstrable long-standing legacy", desc: t("Multi-generational master chefs active or documented institutional legacy.", "बहु-पीढ़ी के मास्टर शेफ या दस्तावेजी ऐतिहासिक विरासत।") },
                      { title: "Recognised local reputation", desc: t("Iconic standing as a culinary institution trusted across generations.", "पीढ़ियों से विश्वसनीय प्रतिष्ठित संस्थान।") },
                      { title: "Signature/traditional dishes", desc: t("Time-honored recipes, artisanal slow cooking (dum pukht), hallmark dishes.", "पारंपरिक व्यंजन विधियां और ऐतिहासिक सिग्नेचर व्यंजन।") },
                      { title: "Consistent quality over the years", desc: t("Uncompromising taste benchmarks and authentic spices over decades.", "दशकों से लगातार प्रामाणिक स्वाद मानक।") },
                      { title: "Strong historical/customer references", desc: t("Rich archive of landmark civic banquets and historic host testimonials.", "ऐतिहासिक आयोजनों और ग्राहकों के पुख्ता प्रशंसापत्र।") },
                      { title: "Bhojpatra tasting + verification process pass", desc: t("Exhaustive verification of lineage, kitchen inspection, and curated tasting audit.", "पाक वंश का सत्यापन और टेस्टिंग ऑडिट पास।") },
                    ].map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-maroon font-bold text-xs select-none shrink-0">🏛️</span>
                        <div>
                          <span className="font-semibold text-ink">{req.title}</span>
                          <p className="text-[11px] text-ink-soft leading-tight">{req.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <Button variant="secondary" size="md" onClick={() => goToStep(1)}>
                  {t("← Back", "← पीछे")}
                </Button>
                <Button variant="primary" size="md" onClick={() => goToStep(3)}>
                  {t("Enter Application Details →", "आवेदन विवरण दर्ज करें →")}
                </Button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              STEP 3: APPLICATION DETAILS
              ══════════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-ink">
                  {t("Structured Application Details", "संरचित आवेदन विवरण")}
                </h3>
                <p className="text-xs text-ink-soft">
                  {t(
                    "Provide your operational benchmarks. Basic contact information is already linked from your signup profile.",
                    "अपने परिचालन मानकों का विवरण दें। बुनियादी संपर्क विवरण आपकी प्रोफ़ाइल से पहले ही जुड़े हुए हैं।"
                  )}
                </p>
              </div>

              {validationError && (
                <div className="rounded-control border border-maroon bg-maroon/10 p-2.5 text-xs font-semibold text-maroon flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{validationError}</span>
                </div>
              )}

              {/* ── Verified Caterer Form ── */}
              {isVerified && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        {t("Years of Operating Experience", "संचालन अनुभव के वर्ष")} *
                      </label>
                      <select
                        value={badgeData.operatingExperience || ""}
                        onChange={(e) => onUpdateData({ operatingExperience: e.target.value })}
                        className="w-full rounded-control border border-cream-3 bg-white p-2 text-xs text-ink focus-ring"
                      >
                        <option value="">{t("Select experience...", "अनुभव चुनें...")}</option>
                        <option value="2-3 years">2 to 3 years (Standard)</option>
                        <option value="3-5 years">3 to 5 years</option>
                        <option value="5+ years">5+ years</option>
                        <option value="brand-exception">Under 2 years (Exception: established brand/new entity)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        {t("FSSAI License Status / Number", "FSSAI लाइसेंस स्थिति / संख्या")} *
                      </label>
                      <input
                        type="text"
                        value={badgeData.fssaiNumber || ""}
                        onChange={(e) => onUpdateData({ fssaiNumber: e.target.value })}
                        placeholder={t("14-digit FSSAI No. or Application Ref", "14 अंकों का FSSAI नंबर")}
                        className="w-full rounded-control border border-cream-3 bg-white p-2 text-xs text-ink focus-ring"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        {t("GST Registration Status", "GST पंजीकरण स्थिति")}
                      </label>
                      <select
                        value={badgeData.gstStatus || "registered"}
                        onChange={(e) => onUpdateData({ gstStatus: e.target.value })}
                        className="w-full rounded-control border border-cream-3 bg-white p-2 text-xs text-ink focus-ring"
                      >
                        <option value="registered">GST Registered (GSTIN Available)</option>
                        <option value="composition">Composition Scheme</option>
                        <option value="exempt">Turnover below statutory threshold / Exempt</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        {t("GSTIN Number (Where Applicable)", "GSTIN नंबर (जहां लागू हो)")}
                      </label>
                      <input
                        type="text"
                        value={badgeData.gstin || ""}
                        onChange={(e) => onUpdateData({ gstin: e.target.value })}
                        placeholder={t("15-digit GSTIN (if registered)", "15 अंकों का GSTIN")}
                        className="w-full rounded-control border border-cream-3 bg-white p-2 text-xs text-ink focus-ring"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      {t("Kitchen & Food Preparation Setup", "रसोई और भोजन तैयारी सेटअप")}
                    </label>
                    <textarea
                      rows={2}
                      value={badgeData.kitchenSetup || ""}
                      onChange={(e) => onUpdateData({ kitchenSetup: e.target.value })}
                      placeholder={t("Describe your commercial kitchen location, prep stations, storage, and refrigeration capacity...", "अपनी व्यावसायिक रसोई का विवरण दें...")}
                      className="w-full rounded-control border border-cream-3 bg-white p-2 text-xs text-ink focus-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      {t("Recent Event References / Completed Orders (3–5 References)", "हाल के कार्यक्रम संदर्भ / पूर्ण किए गए ऑर्डर (3–5 संदर्भ)")}
                    </label>
                    <textarea
                      rows={2}
                      value={badgeData.eventReferences || ""}
                      onChange={(e) => onUpdateData({ eventReferences: e.target.value })}
                      placeholder={t("Host / client names, event types (weddings, birthdays, corporate), dates, and estimated guest sizes...", "ग्राहकों के नाम, आयोजन प्रकार और अनुमानित अतिथि संख्या...")}
                      className="w-full rounded-control border border-cream-3 bg-white p-2 text-xs text-ink focus-ring"
                    />
                  </div>

                  {/* Checkbox Confirmations */}
                  <div className="space-y-2 rounded-control bg-cream/20 p-3 border border-cream-3">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!badgeData.hygieneSafetyConfirmed}
                        onChange={(e) => onUpdateData({ hygieneSafetyConfirmed: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-cream-3 text-maroon accent-maroon"
                      />
                      <span className="text-xs text-ink">
                        <strong>{t("Hygiene & Safety Compliance:", "स्वच्छता और सुरक्षा अनुपालन:")}</strong>{" "}
                        {t("Our food preparation area strictly follows food-grade hygiene, sanitized utensils, and staff food-safety norms.", "हमारी रसोई खाद्य-ग्रेड स्वच्छता और सुरक्षा मानदंडों का पालन करती है।")}
                      </span>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!badgeData.menuPricingDefined}
                        onChange={(e) => onUpdateData({ menuPricingDefined: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-cream-3 text-maroon accent-maroon"
                      />
                      <span className="text-xs text-ink">
                        <strong>{t("Defined Service Area & Pricing:", "निर्धारित सेवा क्षेत्र और मूल्य निर्धारण:")}</strong>{" "}
                        {t("We have transparent per-plate pricing and clear delivery radius boundaries.", "हमारे पास पारदर्शी प्रति-प्लेट मूल्य और स्पष्ट डिलीवरी दायरा है।")}
                      </span>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!badgeData.noCustomerComplaintsConfirmed}
                        onChange={(e) => onUpdateData({ noCustomerComplaintsConfirmed: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-cream-3 text-maroon accent-maroon"
                      />
                      <span className="text-xs text-ink">
                        <strong>{t("Complaint-Free Track Record:", "शिकायत-मुक्त रिकॉर्ड:")}</strong>{" "}
                        {t("We confirm having no serious unresolved customer complaints or food safety violations.", "हम पुष्टि करते हैं कि हमारे पास कोई अनसुलझी शिकायत नहीं है।")}
                      </span>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!badgeData.qualityInspectionAgreed}
                        onChange={(e) => onUpdateData({ qualityInspectionAgreed: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-cream-3 text-maroon accent-maroon"
                      />
                      <span className="text-xs text-ink">
                        <strong>{t("Bhojpatra Quality Tasting Pass Consent:", "Bhojpatra गुणवत्ता निरीक्षण सहमति:")}</strong>{" "}
                        {t("We agree to a kitchen inspection and food tasting session conducted by the Bhojpatra team.", "हम Bhojpatra टीम द्वारा रसोई निरीक्षण और टेस्टिंग के लिए सहमत हैं।")}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* ── City Icon Caterer Form ── */}
              {isCityIcon && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        {t("Commercial History in City (Minimum 5 Years)", "शहर में व्यावसायिक इतिहास (न्यूनतम 5 वर्ष)")} *
                      </label>
                      <select
                        value={badgeData.cityOperatingYears || ""}
                        onChange={(e) => onUpdateData({ cityOperatingYears: e.target.value })}
                        className="w-full rounded-control border border-cream-3 bg-white p-2 text-xs text-ink focus-ring"
                      >
                        <option value="">{t("Select years...", "वर्ष चुनें...")}</option>
                        <option value="5-7 years">5 to 7 years</option>
                        <option value="8-12 years">8 to 12 years</option>
                        <option value="12-15 years">12 to 15 years</option>
                        <option value="15+ years">15+ years</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        {t("Typical Event Execution Scale", "विशिष्ट कार्यक्रम निष्पादन क्षमता")}
                      </label>
                      <select
                        value={badgeData.eventExecutionScale || "300-800"}
                        onChange={(e) => onUpdateData({ eventExecutionScale: e.target.value })}
                        className="w-full rounded-control border border-cream-3 bg-white p-2 text-xs text-ink focus-ring"
                      >
                        <option value="300-800">300 to 800 guests (Standard wedding banquet)</option>
                        <option value="800-1500">800 to 1,500 guests (Large celebrations)</option>
                        <option value="1500+">1,500+ guests (Mega civic/conclave scale)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      {t("City/Region Recognized Reputation & Key Localities Served", "शहर/क्षेत्र में प्रतिष्ठा और प्रमुख सेवा क्षेत्र")} *
                    </label>
                    <textarea
                      rows={2}
                      value={badgeData.cityRegionReputation || ""}
                      onChange={(e) => onUpdateData({ cityRegionReputation: e.target.value })}
                      placeholder={t("e.g. Civil Lines, Georgetown, Naini, Ashok Nagar — trusted caterer for prominent family banquets...", "उदा. प्रमुख इलाके और परिवारों में प्रतिष्ठा...")}
                      className="w-full rounded-control border border-cream-3 bg-white p-2 text-xs text-ink focus-ring"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        {t("Customer Reviews / Ratings Summary", "ग्राहक समीक्षाएं और रेटिंग सारांश")}
                      </label>
                      <input
                        type="text"
                        value={badgeData.customerReviewHighlight || ""}
                        onChange={(e) => onUpdateData({ customerReviewHighlight: e.target.value })}
                        placeholder={t("e.g. 4.8★ rating, 80+ verifiable event testimonials", "उदा. 4.8★ रेटिंग, 80+ प्रशंसापत्र")}
                        className="w-full rounded-control border border-cream-3 bg-white p-2 text-xs text-ink focus-ring"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        {t("Manpower & Logistics Infrastructure", "मैनपावर और लॉजिस्टिक्स अवसंरचना")}
                      </label>
                      <input
                        type="text"
                        value={badgeData.manpowerLogisticsCapacity || ""}
                        onChange={(e) => onUpdateData({ manpowerLogisticsCapacity: e.target.value })}
                        placeholder={t("e.g. 6 banquet captains, 40+ uniformed servers, 2 transport vans", "उदा. 6 कैप्टन, 40+ सर्वर, परिवहन")}
                        className="w-full rounded-control border border-cream-3 bg-white p-2 text-xs text-ink focus-ring"
                      />
                    </div>
                  </div>

                  <div className="rounded-control bg-cream/20 p-3 border border-cream-3">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!badgeData.operationalAuditAgreed}
                        onChange={(e) => onUpdateData({ operationalAuditAgreed: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-cream-3 text-maroon accent-maroon"
                      />
                      <span className="text-xs text-ink">
                        <strong>{t("Tasting + Operational Audit Agreement:", "टेस्टिंग और परिचालन ऑडिट सहमति:")}</strong>{" "}
                        {t("We agree to Bhojpatra's on-site live banquet audit and chef tasting session.", "हम Bhojpatra के लाइव बैंक्वेट ऑडिट और शेफ टेस्टिंग सत्र के लिए सहमत हैं।")}
                      </span>
                    </label>
                  </div>

                  {/* Optional Plus Points Checklist */}
                  <div className="rounded-control border border-cream-3 bg-cream/10 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-cream-3/60 pb-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-ink">
                        {t("Plus Points Checklist (Optional Strengths)", "प्लस पॉइंट्स चेकलिस्ट (वैकल्पिक खूबियां)")}
                      </span>
                      <span className="rounded bg-cream px-2 py-0.5 text-[10px] font-bold text-ink">
                        Optional
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!badgeData.hasSignatureCuisine}
                          onChange={(e) => onUpdateData({ hasSignatureCuisine: e.target.checked })}
                          className="mt-0.5 h-4 w-4 rounded border-cream-3 text-maroon accent-maroon"
                        />
                        <div>
                          <span className="font-semibold text-ink">
                            {t("1. Known for a signature cuisine/menu", "1. सिग्नेचर व्यंजन / मेनू के लिए प्रसिद्ध")}
                          </span>
                          {badgeData.hasSignatureCuisine && (
                            <input
                              type="text"
                              value={badgeData.signatureCuisineDetails || ""}
                              onChange={(e) => onUpdateData({ signatureCuisineDetails: e.target.value })}
                              placeholder={t("e.g. Awadhi Dum Biryani, Shahi Tukda, Banarasi Chaat", "उदा. अवधी बिरयानी, शाही टुकड़ा")}
                              className="mt-1 w-full rounded border border-cream-3 bg-white p-1 text-[11px]"
                            />
                          )}
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!badgeData.catersLargeWeddings}
                          onChange={(e) => onUpdateData({ catersLargeWeddings: e.target.checked })}
                          className="mt-0.5 h-4 w-4 rounded border-cream-3 text-maroon accent-maroon"
                        />
                        <span className="font-semibold text-ink">
                          {t("2. Regularly caters weddings & large celebrations (300+ guests)", "2. बड़े विवाह समारोहों का नियमित आयोजन")}
                        </span>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!badgeData.hasLocalBrandRecall}
                          onChange={(e) => onUpdateData({ hasLocalBrandRecall: e.target.checked })}
                          className="mt-0.5 h-4 w-4 rounded border-cream-3 text-maroon accent-maroon"
                        />
                        <div>
                          <span className="font-semibold text-ink">
                            {t("3. Strong local brand recall in the city", "3. शहर में मजबूत स्थानीय ब्रांड पहचान")}
                          </span>
                          {badgeData.hasLocalBrandRecall && (
                            <input
                              type="text"
                              value={badgeData.brandRecallNotes || ""}
                              onChange={(e) => onUpdateData({ brandRecallNotes: e.target.value })}
                              placeholder={t("Brand history or community recognition notes...", "पहचान या समुदाय में प्रतिष्ठा...")}
                              className="mt-1 w-full rounded border border-cream-3 bg-white p-1 text-[11px]"
                            />
                          )}
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!badgeData.notableVenuesServed}
                          onChange={(e) => onUpdateData({ notableVenuesServed: e.target.checked })}
                          className="mt-0.5 h-4 w-4 rounded border-cream-3 text-maroon accent-maroon"
                        />
                        <div>
                          <span className="font-semibold text-ink">
                            {t("4. Notable venues, heritage lawns, or marquee clients served", "4. प्रमुख वेन्यू, लॉन या प्रतिष्ठित ग्राहक")}
                          </span>
                          {badgeData.notableVenuesServed && (
                            <input
                              type="text"
                              value={badgeData.notableVenuesDetails || ""}
                              onChange={(e) => onUpdateData({ notableVenuesDetails: e.target.value })}
                              placeholder={t("Prominent lawns or corporate clients...", "प्रमुख वेन्यू या क्लाइंट्स...")}
                              className="mt-1 w-full rounded border border-cream-3 bg-white p-1 text-[11px]"
                            />
                          )}
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!badgeData.hasSocialPresence}
                          onChange={(e) => onUpdateData({ hasSocialPresence: e.target.checked })}
                          className="mt-0.5 h-4 w-4 rounded border-cream-3 text-maroon accent-maroon"
                        />
                        <div>
                          <span className="font-semibold text-ink">
                            {t("5. Active social presence & public reputation", "5. सक्रिय सोशल मीडिया और सार्वजनिक प्रतिष्ठा")}
                          </span>
                          {badgeData.hasSocialPresence && (
                            <input
                              type="text"
                              value={badgeData.socialPresenceUrl || ""}
                              onChange={(e) => onUpdateData({ socialPresenceUrl: e.target.value })}
                              placeholder={t("Instagram handle, Google review link, or website...", "इंस्टाग्राम या गूगल रिव्यू लिंक...")}
                              className="mt-1 w-full rounded border border-cream-3 bg-white p-1 text-[11px]"
                            />
                          )}
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!badgeData.hasRepeatCustomers}
                          onChange={(e) => onUpdateData({ hasRepeatCustomers: e.target.checked })}
                          className="mt-0.5 h-4 w-4 rounded border-cream-3 text-maroon accent-maroon"
                        />
                        <span className="font-semibold text-ink">
                          {t("6. High rate of repeat customers across family celebrations", "6. बार-बार बुकिंग करने वाले संतुष्ट ग्राहक")}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Heritage Caterer Form (9 criteria) ── */}
              {isHeritage && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        {t("Continuous Legacy Duration (Minimum 15 Years)", "निरंतर विरासत अवधि (न्यूनतम 15 वर्ष)")} *
                      </label>
                      <select
                        value={badgeData.legacyYears || ""}
                        onChange={(e) => onUpdateData({ legacyYears: e.target.value })}
                        className="w-full rounded-control border border-cream-3 bg-white p-2 text-xs text-ink focus-ring"
                      >
                        <option value="">{t("Select legacy duration...", "विरासत अवधि चुनें...")}</option>
                        <option value="15-20 years">15 to 20 years</option>
                        <option value="20-35 years">20 to 35 years</option>
                        <option value="35-50 years">35 to 50 years</option>
                        <option value="50+ years">50+ years (Half-century heritage)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        {t("Year Established & Generation Active", "स्थापना वर्ष और सक्रिय पीढ़ी")}
                      </label>
                      <input
                        type="text"
                        value={badgeData.foundingYear || ""}
                        onChange={(e) => onUpdateData({ foundingYear: e.target.value })}
                        placeholder={t("e.g. Est. 1978, 3rd Generation Khansamas", "उदा. स्था. 1978, तीसरी पीढ़ी")}
                        className="w-full rounded-control border border-cream-3 bg-white p-2 text-xs text-ink focus-ring"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      {t("Connection with Local/Regional Culinary Traditions", "स्थानीय/क्षेत्रीय पाक परंपराओं से जुड़ाव")} *
                    </label>
                    <textarea
                      rows={2}
                      value={badgeData.culinaryTraditionConnection || ""}
                      onChange={(e) => onUpdateData({ culinaryTraditionConnection: e.target.value })}
                      placeholder={t("e.g. Authentic Awadhi Dum Pukht, Purvanchali traditional banquet cuisine, ancestral sigri slow cooking...", "उदा. पारंपरिक अवधी दम पुख्त, पुश्तैनी पाक कला...")}
                      className="w-full rounded-control border border-cream-3 bg-white p-2 text-xs text-ink focus-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      {t("Generations Involved OR Demonstrable Long-Standing Legacy", "सक्रिय पीढ़ियां या प्रमाणित दीर्घकालिक विरासत")}
                    </label>
                    <textarea
                      rows={2}
                      value={badgeData.multiGenerationalOrLegacyProof || ""}
                      onChange={(e) => onUpdateData({ multiGenerationalOrLegacyProof: e.target.value })}
                      placeholder={t("Explain family culinary lineage, master chef generations, or documented institutional milestones...", "पारिवारिक पाक वंश या दस्तावेजी मील के पत्थर...")}
                      className="w-full rounded-control border border-cream-3 bg-white p-2 text-xs text-ink focus-ring"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        {t("Signature / Hallmark Traditional Dishes", "हस्ताक्षर / पारंपरिक व्यंजन")}
                      </label>
                      <input
                        type="text"
                        value={badgeData.signatureTraditionalDishes || ""}
                        onChange={(e) => onUpdateData({ signatureTraditionalDishes: e.target.value })}
                        placeholder={t("Hallmark heritage recipes...", "पारंपरिक पुश्तैनी रेसिपीज़...")}
                        className="w-full rounded-control border border-cream-3 bg-white p-2 text-xs text-ink focus-ring"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        {t("Historic Event / Host References", "ऐतिहासिक आयोजन / संदर्भ")}
                      </label>
                      <input
                        type="text"
                        value={badgeData.historicalReferences || ""}
                        onChange={(e) => onUpdateData({ historicalReferences: e.target.value })}
                        placeholder={t("Notable multi-generational clients...", "दशकों पुराने ग्राहक संदर्भ...")}
                        className="w-full rounded-control border border-cream-3 bg-white p-2 text-xs text-ink focus-ring"
                      />
                    </div>
                  </div>

                  <div className="rounded-control bg-cream/20 p-3 border border-cream-3">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!badgeData.verificationProcessAgreed}
                        onChange={(e) => onUpdateData({ verificationProcessAgreed: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-cream-3 text-maroon accent-maroon"
                      />
                      <span className="text-xs text-ink">
                        <strong>{t("Lineage Verification & Tasting Consent:", "वंशावली सत्यापन और टेस्टिंग सहमति:")}</strong>{" "}
                        {t("We agree to Bhojpatra's culinary lineage documentation audit and heritage tasting session.", "हम Bhojpatra के वंशावली सत्यापन और टेस्टिंग सत्र के लिए सहमत हैं।")}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <Button variant="secondary" size="md" onClick={() => goToStep(2)}>
                  {t("← Back", "← पीछे")}
                </Button>
                <Button variant="primary" size="md" onClick={handleNextFromDetails}>
                  {t("Review Application →", "आवेदन की समीक्षा करें →")}
                </Button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              STEP 4: REVIEW
              ══════════════════════════════════════════════════════════════ */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-ink">
                    {isAlreadySubmitted
                      ? t("Submitted Application Details (Read-Only)", "जमा किए गए आवेदन विवरण (केवल पढ़ने के लिए)")
                      : t("Review Your Badge Application", "अपने बैज आवेदन की समीक्षा करें")}
                  </h3>
                  <p className="text-xs text-ink-soft">
                    {isAlreadySubmitted
                      ? t("Your application was submitted and is under verification.", "आपका आवेदन जमा हो चुका है और सत्यापन के अधीन है।")
                      : t("Verify all details before final submission.", "अंतिम सबमिशन से पहले सभी विवरणों की पुष्टि करें।")}
                  </p>
                </div>
                {isAlreadySubmitted && (
                  <span className="rounded-full bg-maroon text-cream px-3 py-1 text-xs font-bold">
                    ✓ {t("Application Submitted", "आवेदन जमा")}
                  </span>
                )}
              </div>

              {/* Summary Card */}
              <div className="rounded-card border border-maroon/20 bg-white p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-cream-3 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{badgeMeta.icon}</span>
                    <div>
                      <h4 className="font-bold text-ink text-sm">{badgeMeta.name}</h4>
                      <span className="text-xs font-semibold text-maroon">{badgeMeta.tagline}</span>
                    </div>
                  </div>
                  <span className="text-xs text-ink-soft">
                    {isAlreadySubmitted ? badgeData.submittedAt || "Submitted" : t("Ready for Submission", "जमा करने के लिए तैयार")}
                  </span>
                </div>

                {/* Account Details Block */}
                <div className="bg-cream/20 rounded p-2.5 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-ink-soft block">{t("Registered Business:", "पंजीकृत व्यवसाय:")}</span>
                    <span className="font-semibold text-ink">
                      {vendorAccount.businessName.trim() || vendorAccount.fullName.trim() || "Catering Partner"}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-soft block">{t("Account Contact:", "संपर्क व्यक्ति:")}</span>
                    <span className="font-semibold text-ink">
                      {vendorAccount.fullName.trim() || "Account Owner"} ({vendorAccount.mobile || "Mobile"})
                    </span>
                  </div>
                </div>

                {/* Specific Responses */}
                <div className="space-y-2 text-xs">
                  <h5 className="font-bold uppercase tracking-wider text-ink-soft text-[11px]">
                    {t("Submitted Operational Details", "परिचालन विवरण")}
                  </h5>

                  {isVerified && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-2 rounded bg-cream/10 border border-cream-3/60">
                        <span className="text-ink-soft block">{t("Experience:", "अनुभव:")}</span>
                        <span className="font-medium text-ink">{badgeData.operatingExperience || "—"}</span>
                      </div>
                      <div className="p-2 rounded bg-cream/10 border border-cream-3/60">
                        <span className="text-ink-soft block">{t("FSSAI License:", "FSSAI लाइसेंस:")}</span>
                        <span className="font-medium text-ink">{badgeData.fssaiNumber || "—"}</span>
                      </div>
                      <div className="p-2 rounded bg-cream/10 border border-cream-3/60">
                        <span className="text-ink-soft block">{t("GST Status / GSTIN:", "GST स्थिति:")}</span>
                        <span className="font-medium text-ink">{badgeData.gstin || badgeData.gstStatus || "—"}</span>
                      </div>
                      <div className="p-2 rounded bg-cream/10 border border-cream-3/60">
                        <span className="text-ink-soft block">{t("Hygiene & Safety:", "स्वच्छता और सुरक्षा:")}</span>
                        <span className="font-medium text-ink">{badgeData.hygieneSafetyConfirmed ? "✓ Confirmed" : "—"}</span>
                      </div>
                      {badgeData.kitchenSetup && (
                        <div className="p-2 rounded bg-cream/10 border border-cream-3/60 sm:col-span-2">
                          <span className="text-ink-soft block">{t("Kitchen Setup:", "रसोई सेटअप:")}</span>
                          <span className="font-medium text-ink">{badgeData.kitchenSetup}</span>
                        </div>
                      )}
                      {badgeData.eventReferences && (
                        <div className="p-2 rounded bg-cream/10 border border-cream-3/60 sm:col-span-2">
                          <span className="text-ink-soft block">{t("Event References:", "कार्यक्रम संदर्भ:")}</span>
                          <span className="font-medium text-ink">{badgeData.eventReferences}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {isCityIcon && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="p-2 rounded bg-cream/10 border border-cream-3/60">
                          <span className="text-ink-soft block">{t("Operating Years:", "संचालन वर्ष:")}</span>
                          <span className="font-medium text-ink">{badgeData.cityOperatingYears || "—"}</span>
                        </div>
                        <div className="p-2 rounded bg-cream/10 border border-cream-3/60">
                          <span className="text-ink-soft block">{t("Execution Scale:", "निष्पादन क्षमता:")}</span>
                          <span className="font-medium text-ink">{badgeData.eventExecutionScale || "—"}</span>
                        </div>
                      </div>

                      <div className="p-2 rounded bg-cream/10 border border-cream-3/60">
                        <span className="text-ink-soft block">{t("Reputation & Localities:", "प्रतिष्ठा और इलाके:")}</span>
                        <span className="font-medium text-ink">{badgeData.cityRegionReputation || "—"}</span>
                      </div>

                      {/* Plus points review */}
                      <div className="p-2.5 rounded bg-cream/20 border border-cream-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-ink block mb-1">
                          {t("Selected Plus Points (Optional Strengths)", "चयनित प्लस पॉइंट्स (वैकल्पिक खूबियां)")}
                        </span>
                        <ul className="space-y-1 text-[11px]">
                          {badgeData.hasSignatureCuisine && (
                            <li>• {t("Signature Cuisine:", "सिग्नेचर व्यंजन:")} {badgeData.signatureCuisineDetails || "Yes"}</li>
                          )}
                          {badgeData.catersLargeWeddings && (
                            <li>• {t("Regularly caters grand weddings (300+ guests)", "विवाह समारोहों का अनुभव")}</li>
                          )}
                          {badgeData.hasLocalBrandRecall && (
                            <li>• {t("Strong local brand recall", "मजबूत ब्रांड पहचान")} {badgeData.brandRecallNotes ? `(${badgeData.brandRecallNotes})` : ""}</li>
                          )}
                          {badgeData.notableVenuesServed && (
                            <li>• {t("Notable venues served", "प्रमुख वेन्यू")} {badgeData.notableVenuesDetails ? `(${badgeData.notableVenuesDetails})` : ""}</li>
                          )}
                          {badgeData.hasSocialPresence && (
                            <li>• {t("Social presence", "सोशल मीडिया")} {badgeData.socialPresenceUrl ? `(${badgeData.socialPresenceUrl})` : ""}</li>
                          )}
                          {badgeData.hasRepeatCustomers && (
                            <li>• {t("High repeat customer retention", "बार-बार बुकिंग करने वाले ग्राहक")}</li>
                          )}
                          {!badgeData.hasSignatureCuisine &&
                            !badgeData.catersLargeWeddings &&
                            !badgeData.hasLocalBrandRecall &&
                            !badgeData.notableVenuesServed &&
                            !badgeData.hasSocialPresence &&
                            !badgeData.hasRepeatCustomers && (
                              <li className="text-ink-soft italic">{t("No optional plus points selected.", "कोई वैकल्पिक प्लस पॉइंट नहीं चुना गया।")}</li>
                            )}
                        </ul>
                      </div>
                    </div>
                  )}

                  {isHeritage && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-2 rounded bg-cream/10 border border-cream-3/60">
                        <span className="text-ink-soft block">{t("Continuous Legacy:", "निरंतर विरासत:")}</span>
                        <span className="font-medium text-ink">{badgeData.legacyYears || "—"}</span>
                      </div>
                      <div className="p-2 rounded bg-cream/10 border border-cream-3/60">
                        <span className="text-ink-soft block">{t("Founding & Lineage:", "स्थापना और पीढ़ी:")}</span>
                        <span className="font-medium text-ink">{badgeData.foundingYear || "—"}</span>
                      </div>
                      <div className="p-2 rounded bg-cream/10 border border-cream-3/60 sm:col-span-2">
                        <span className="text-ink-soft block">{t("Culinary Tradition:", "पाक परंपरा:")}</span>
                        <span className="font-medium text-ink">{badgeData.culinaryTraditionConnection || "—"}</span>
                      </div>
                      {badgeData.signatureTraditionalDishes && (
                        <div className="p-2 rounded bg-cream/10 border border-cream-3/60 sm:col-span-2">
                          <span className="text-ink-soft block">{t("Hallmark Traditional Dishes:", "पारंपरिक व्यंजन:")}</span>
                          <span className="font-medium text-ink">{badgeData.signatureTraditionalDishes}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Review Actions */}
              <div className="pt-2 flex items-center justify-between">
                {isAlreadySubmitted ? (
                  <Button variant="secondary" size="md" onClick={onClose} fullWidth>
                    {t("Close Review", "समीक्षा बंद करें")}
                  </Button>
                ) : (
                  <>
                    <Button variant="secondary" size="md" onClick={() => goToStep(3)}>
                      {t("← Edit Information", "← विवरण संपादित करें")}
                    </Button>
                    <Button variant="primary" size="md" onClick={() => goToStep(5)}>
                      {t("Proceed to Submit →", "जमा करने के लिए आगे बढ़ें →")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              STEP 5: SUBMIT (FINAL CONFIRMATION)
              ══════════════════════════════════════════════════════════════ */}
          {step === 5 && !isAlreadySubmitted && (
            <div className="space-y-4">
              <div className="rounded-card border border-maroon/30 bg-cream/20 p-4 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-maroon/10 text-2xl text-maroon mx-auto mb-2">
                  📝
                </span>
                <h3 className="text-base sm:text-lg font-bold text-ink">
                  {t("Confirm & Submit Badge Application", "बैज आवेदन की पुष्टि करें और जमा करें")}
                </h3>
                <p className="text-xs text-ink-soft mt-1 max-w-md mx-auto">
                  {t(
                    `You are applying for the ${badgeMeta.name} recognition badge. This is the final submission step.`,
                    `आप ${badgeMeta.name} मान्यता बैज के लिए आवेदन कर रहे हैं। यह अंतिम सबमिशन चरण है।`
                  )}
                </p>
              </div>

              <div className="rounded-control border border-cream-3 bg-white p-3.5 space-y-2 text-xs">
                <h4 className="font-bold text-ink uppercase tracking-wider text-[11px]">
                  {t("Applicant Declaration & Terms", "आवेदक घोषणा और शर्तें")}
                </h4>
                <p className="text-ink-soft leading-relaxed">
                  {t(
                    "By submitting this application, you declare that the commercial details, operational parameters, and references submitted are accurate and reflect your catering operations. The Bhojpatra culinary verification team will audit these details during your vendor onboarding process.",
                    "इस आवेदन को जमा करके, आप घोषणा करते हैं कि प्रस्तुत विवरण सटीक हैं। Bhojpatra टीम ऑनबोर्डिंग के दौरान इनका ऑडिट करेगी।"
                  )}
                </p>
                <div className="flex items-center gap-2 pt-1 text-maroon font-semibold">
                  <span>🔒</span>
                  <span>{t("Your application details will be saved to your profile and locked for review.", "आपके विवरण प्रोफ़ाइल में सहेजे जाएंगे।")}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Button variant="secondary" size="md" onClick={() => goToStep(4)}>
                  {t("← Back to Review", "← समीक्षा पर वापस जाएं")}
                </Button>
                <Button variant="primary" size="md" onClick={handleFinalSubmit}>
                  {t(`✓ Submit ${badgeMeta.name} Application`, `✓ ${badgeMeta.name} आवेदन जमा करें`)}
                </Button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              STEP 6: APPLICATION SUBMITTED (CONFIRMATION)
              ══════════════════════════════════════════════════════════════ */}
          {step === 6 && (
            <div className="space-y-4 text-center py-2">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-maroon text-cream text-3xl shadow-md mx-auto">
                ✓
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-ink">
                  {t("Application Submitted Successfully!", "आवेदन सफलतापूर्वक जमा किया गया!")}
                </h3>
                <p className="text-xs sm:text-sm text-ink-soft mt-1 max-w-md mx-auto leading-relaxed">
                  {t(
                    `Your official application for the ${badgeMeta.name} badge has been recorded and securely linked to your vendor account.`,
                    `आपके ${badgeMeta.name} बैज का आधिकारिक आवेदन रिकॉर्ड कर लिया गया है।`
                  )}
                </p>
              </div>

              <div className="rounded-control border border-maroon/20 bg-cream/25 p-3 text-left max-w-md mx-auto space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">{badgeMeta.name}</span>
                  <span className="text-maroon font-bold bg-maroon/10 px-2 py-0.5 rounded text-[10.5px]">
                    ✓ {t("Submitted", "जमा")}
                  </span>
                </div>
                <p className="text-[11px] text-ink-soft">
                  {t("Evaluation Status: Pending Bhojpatra Onboarding & Kitchen Inspection Pass.", "मूल्यांकन स्थिति: ऑनबोर्डिंग और रसोई निरीक्षण लंबित।")}
                </p>
              </div>

              <p className="text-xs text-ink-soft max-w-sm mx-auto">
                {t(
                  "You can return to your signup form and finish creating your vendor account. You can review your submitted answers anytime by clicking the badge card.",
                  "आप अपने साइनअप फॉर्म पर वापस लौट सकते हैं। आप बैज कार्ड पर क्लिक करके कभी भी अपने उत्तरों की समीक्षा कर सकते हैं।"
                )}
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <Button variant="secondary" size="md" onClick={() => goToStep(4)}>
                  {t("Review Submitted Details", "जमा विवरण की समीक्षा करें")}
                </Button>
                <Button variant="primary" size="md" onClick={onClose}>
                  {t("Done / Return to Sign Up", "पूर्ण / साइन अप पर लौटें")}
                </Button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
