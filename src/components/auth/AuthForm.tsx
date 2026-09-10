"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n";
import {
  MERGED_DASHBOARD_PATH,
  refreshSession,
  type AccountType,
  type PartnerRole,
} from "@/lib/session";
import { setAdminSession } from "@/lib/adminAuth";
import { makeReferralCode, PARTNER_ROLE_LABEL } from "@/lib/referral";
import { isValidGst, isValidEmail, isValidPhone } from "@/lib/validate";
import { Button, controlClass } from "@/components/ui";
import BadgeApplicationModal, {
  type BadgeApplicationRecord,
} from "./BadgeApplicationModal";

type Mode = "login" | "signup" | "forgot" | "reset";

// Every field uses the shared design-system control styling.
const inputClass = controlClass;

/** Eye / eye-off icon for the password visibility toggle. */
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {off ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.4 5.2A9.6 9.6 0 0 1 12 5c5 0 9 4.5 9 7-.4 1-1.2 2.1-2.3 3.1M6.1 6.1C3.9 7.4 2.4 9.6 2 12c.5 1.4 2 3.2 4 4.4A9.3 9.3 0 0 0 12 19c1 0 1.9-.1 2.8-.4" />
        </>
      ) : (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const { t } = useLang();
  const router = useRouter();
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";
  const isReset = mode === "reset";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("customer");
  // `null` = a partner signup where no lane has been picked yet. We show the
  // partner chooser instead of jamming a 3-way picker above the account fields;
  // each lane then opens its own dedicated, tailored sign-up.
  const [partnerRole, setPartnerRole] = useState<PartnerRole | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [referralCode, setReferralCode] = useState("");
  // Reset flow: the emailed link carries the one-time token + the account email
  // in its query string. Read after mount (see the signup-type effect below) so
  // server and first client render match. `resetReady` guards the invalid-link
  // screen until we've actually looked.
  const [resetToken, setResetToken] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetReady, setResetReady] = useState(false);

  const isVendor = accountType === "vendor";
  const isPartner = accountType === "partner";
  // Venue Owners onboard with in-house catering, so we collect their GST number.
  const isVenuePartner = isPartner && partnerRole === "venue";

  // Vendor Commercial Offerings (pre-selected for quick registration)
  const [selectedOfferings, setSelectedOfferings] = useState<string[]>([
    "catering",
  ]);

  // Vendor Recognition Badges (Task 17: Badges & Recognition)
  const [badgeApplications, setBadgeApplications] = useState<string[]>([]);
  const [expandedBadge, setExpandedBadge] = useState<string | null>(null);
  const [activeBadgeModal, setActiveBadgeModal] = useState<string | null>(null);
  const [badgeDetails, setBadgeDetails] = useState<Record<string, BadgeApplicationRecord>>({});

  function toggleOffering(id: string) {
    setSelectedOfferings((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((k) => k !== id)
          : prev
        : [...prev, id]
    );
  }

  function toggleBadgeApplication(id: string) {
    setActiveBadgeModal(id);
  }

  function handleBadgeSubmit(badgeId: string) {
    setBadgeApplications((prev) => (prev.includes(badgeId) ? prev : [...prev, badgeId]));
    setBadgeDetails((prev) => ({
      ...prev,
      [badgeId]: {
        ...(prev[badgeId] || { badgeId, currentStep: 6 }),
        status: "submitted",
        submittedAt: new Date().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    }));
  }

  function handleUpdateBadgeData(badgeId: string, data: Partial<BadgeApplicationRecord>) {
    setBadgeDetails((prev) => {
      const existing = prev[badgeId] || {
        badgeId,
        status: "in_progress",
        currentStep: 1,
      };
      return {
        ...prev,
        [badgeId]: {
          ...existing,
          ...data,
        },
      };
    });
  }

  function toggleExpandBadge(id: string) {
    setExpandedBadge((prev) => (prev === id ? null : id));
  }

  const OFFERING_OPTIONS = [
    {
      id: "catering",
      icon: "🍲",
      title: t("Feast Booking", "दावत बुकिंग"),
      blurb: t("Multi-course feasts with silver & gold tiers", "मल्टी-कोर्स दावतें"),
    },
    {
      id: "stall",
      icon: "🍢",
      title: t("Specialty Stall", "स्पेशल्टी स्टॉल"),
      blurb: t("Dedicated food stations and event stalls", "फूड स्टेशन और स्टॉल"),
    },
    {
      id: "baina",
      icon: "🎁",
      title: t("Baina Boxes", "बायना बॉक्स"),
      blurb: t("Artisanal sweet gift hampers & boxes", "मिठाई उपहार हैम्पर्स"),
    },
    {
      id: "counters",
      icon: "🍳",
      title: t("Live Counters", "लाइव काउंटर"),
      blurb: t("Interactive live cooking & chat stations", "लाइव कुकिंग काउंटर"),
    },
  ];

  interface BadgeRequirementItem {
    title: string;
    desc?: string;
    exception?: string;
  }

  interface BadgeOptionItem {
    id: string;
    name: string;
    nameHi: string;
    tagline: string;
    taglineHi: string;
    description: string;
    descriptionHi: string;
    icon: string;
    requirements: BadgeRequirementItem[];
    plusPoints?: { title: string; desc?: string }[];
  }

  const BADGE_OPTIONS: BadgeOptionItem[] = [
    {
      id: "verified-caterer",
      name: "Verified Caterer",
      nameHi: "वेरीफाइड कैटरर",
      tagline: "Entry-Level Recognition",
      taglineHi: "प्रवेश-स्तरीय मान्यता",
      description:
        "Entry-level recognition for vendors meeting Bhojpatra's core quality and operational standards.",
      descriptionHi:
        "Bhojpatra के मुख्य गुणवत्ता और परिचालन मानकों को पूरा करने वाले वेंडरों के लिए प्रवेश-स्तरीय मान्यता।",
      icon: "🛡️",
      requirements: [
        {
          title: "Valid FSSAI",
          desc: t(
            "Active Food Safety and Standards Authority of India licence.",
            "सक्रिय भारतीय खाद्य संरक्षा एवं मानक प्राधिकरण लाइसेंस।"
          ),
        },
        {
          title: "GST where applicable",
          desc: t(
            "Valid GSTIN registration based on statutory turnover thresholds.",
            "वैधानिक टर्नओवर सीमा के अनुसार मान्य GSTIN पंजीकरण।"
          ),
        },
        {
          title: "PAN + business/bank details",
          desc: t(
            "Verified commercial PAN and active business bank account for payouts.",
            "सत्यापित व्यावसायिक पैन और भुगतान के लिए सक्रिय बैंक खाता।"
          ),
        },
        {
          title: "Minimum 2 years operating experience",
          exception: t(
            "Exception allowed for a strong established brand/new entity",
            "मजबूत स्थापित ब्रांड या नई इकाई के लिए अपवाद की अनुमति"
          ),
          desc: t(
            "Demonstrated commercial track record in food service or catering.",
            "खाद्य सेवा या कैटरिंग में प्रमाणित व्यावसायिक ट्रैक रिकॉर्ड।"
          ),
        },
        {
          title: "Proper kitchen / food preparation setup",
          desc: t(
            "Dedicated commercial kitchen facility with adequate storage and clean prep stations.",
            "पर्याप्त भंडारण और स्वच्छ तैयारी स्टेशनों के साथ समर्पित व्यावसायिक रसोई सुविधा।"
          ),
        },
        {
          title: "Hygiene & food-safety standards pass",
          desc: t(
            "Sanitized cooking areas, food-grade vessels, pest control, and staff hygiene.",
            "स्वच्छ खाना पकाने के क्षेत्र, खाद्य-ग्रेड बर्तन, कीट नियंत्रण और कर्मचारियों की स्वच्छता।"
          ),
        },
        {
          title: "Menu, pricing and service area clearly defined",
          desc: t(
            "Transparent per-plate menus, package inclusions, and designated delivery radii.",
            "पारदर्शी प्रति-प्लेट मेनू, पैकेज समावेशन और निर्धारित सेवा क्षेत्र।"
          ),
        },
        {
          title: "At least 3–5 genuine event references/orders",
          desc: t(
            "Verifiable client contacts or completed catering event orders.",
            "सत्यापन योग्य ग्राहक संपर्क या पूर्ण किए गए कैटरिंग ऑर्डर।"
          ),
        },
        {
          title: "No serious unresolved customer complaints",
          desc: t(
            "Clean service record without unresolved food quality, safety, or fulfillment escalations.",
            "खाद्य गुणवत्ता, सुरक्षा या सेवा विफलता की किसी अनसुलझी शिकायत के बिना स्वच्छ रिकॉर्ड।"
          ),
        },
        {
          title: "Bhojpatra quality inspection / tasting pass",
          desc: t(
            "Successful kitchen inspection and food tasting evaluation by the Bhojpatra team.",
            "Bhojpatra टीम द्वारा सफल रसोई निरीक्षण और भोजन चखने (tasting) का मूल्यांकन।"
          ),
        },
      ],
    },
    {
      id: "city-icon-caterer",
      name: "City Icon Caterer",
      nameHi: "सिटी आइकन कैटरर",
      tagline: "City-Level Recognition",
      taglineHi: "शहर-स्तरीय मान्यता",
      description:
        "City-level recognition for established caterers with a strong local reputation and consistently professional event execution.",
      descriptionHi:
        "मजबूत स्थानीय प्रतिष्ठा और लगातार पेशेवर कार्यक्रम निष्पादन वाले स्थापित कैटरर्स के लिए शहर-स्तरीय मान्यता।",
      icon: "👑",
      requirements: [
        {
          title: "Minimum 5 years of operating history",
          desc: t(
            "Demonstrated commercial catering presence and established operational track record for at least 5 years.",
            "कम से कम 5 वर्षों का प्रमाणित व्यावसायिक कैटरिंग संचालन और स्थापित ट्रैक रिकॉर्ड।"
          ),
        },
        {
          title: "Recognised reputation in the city/region",
          desc: t(
            "Well-known regional catering standing and strong community trust across the city.",
            "शहर और क्षेत्र में सुस्थापित कैटरिंग प्रतिष्ठा और मजबूत सामुदायिक विश्वास।"
          ),
        },
        {
          title: "Strong customer reviews/references",
          desc: t(
            "Consistently positive ratings and verifiable host testimonials from past grand celebrations.",
            "पिछले बड़े समारोहों से लगातार सकारात्मक रेटिंग और सत्यापन योग्य ग्राहक प्रशंसापत्र।"
          ),
        },
        {
          title: "Consistent food quality",
          desc: t(
            "High taste consistency, authentic culinary mastery, and impeccable food standards.",
            "लगातार उच्च स्वाद गुणवत्ता, प्रामाणिक पाक कला और त्रुटिहीन खाद्य मानक।"
          ),
        },
        {
          title: "Professional event execution",
          desc: t(
            "Punctual buffet deployment, polished presentation, and disciplined on-ground coordination.",
            "समय पर बुफे व्यवस्था, सुरुचिपूर्ण प्रस्तुति और अनुशासित ऑन-ग्राउंड समन्वय।"
          ),
        },
        {
          title: "Good menu depth & presentation",
          desc: t(
            "Rich repertoire of multi-course spreads, seasonal specialties, and elegant food staging.",
            "मल्टी-कोर्स व्यंजनों की विस्तृत श्रृंखला और सुरुचिपूर्ण भोजन प्रस्तुति।"
          ),
        },
        {
          title: "Reliable manpower/logistics",
          desc: t(
            "Experienced banquet captains, uniformed servers, and dependable logistics fleet.",
            "अनुभवी बैंक्वेट कैप्टन, वर्दीधारी सर्वर और विश्वसनीय लॉजिस्टिक्स बेड़ा।"
          ),
        },
        {
          title: "Bhojpatra tasting + operational audit pass",
          desc: t(
            "Comprehensive kitchen hygiene inspection, live banquet audit, and tasting evaluation clearance.",
            "विस्तृत रसोई स्वच्छता निरीक्षण, लाइव बैंक्वेट ऑडिट और टेस्टिंग मूल्यांकन पास।"
          ),
        },
      ],
      plusPoints: [
        {
          title: "Known for a signature cuisine/menu",
          desc: t(
            "Celebrated flagship dishes, heritage specialties, or trademark recipes that draw distinct regional demand.",
            "प्रसिद्ध सिग्नेचर व्यंजन या पारंपरिक रेसिपी जो विशिष्ट मांग आकर्षित करती हैं।"
          ),
        },
        {
          title: "Regularly caters weddings/large celebrations",
          desc: t(
            "Proven track record serving large banquets and grand wedding gatherings exceeding 300+ guests.",
            "300+ मेहमानों वाले बड़े विवाह समारोहों और उत्सवों के आयोजन का नियमित अनुभव।"
          ),
        },
        {
          title: "Strong local brand recall",
          desc: t(
            "Widely recognized brand name trusted by event hosts, wedding planners, and families.",
            "इवेंट आयोजकों, वेडिंग प्लानर्स और परिवारों द्वारा व्यापक रूप से पहचाना जाने वाला नाम।"
          ),
        },
        {
          title: "Notable venues/clients/events served",
          desc: t(
            "Experience operating at prominent lawns, heritage banquets, civic gatherings, or notable client events.",
            "शहर के प्रमुख लॉन, हेरिटेज बैंक्वेट और प्रतिष्ठित कार्यक्रमों में सेवा देने का अनुभव।"
          ),
        },
        {
          title: "Social presence and customer reputation",
          desc: t(
            "Active digital footprint, word-of-mouth acclaim, and positive social media community presence.",
            "सक्रिय डिजिटल उपस्थिति, वर्ड-ऑफ-माउथ प्रतिष्ठा और सकारात्मक सोशल मीडिया समुदाय।"
          ),
        },
        {
          title: "Repeat customers",
          desc: t(
            "High loyalty rate with families and organizations repeatedly booking for consecutive celebrations.",
            "लगातार आयोजनों के लिए परिवारों और संगठनों द्वारा बार-बार बुकिंग का उच्च रिकॉर्ड।"
          ),
        },
      ],
    },
    {
      id: "heritage-caterer",
      name: "Heritage Caterer",
      nameHi: "हेरिटेज कैटरर",
      tagline: "Most Exclusive Recognition",
      taglineHi: "सर्वाधिक विशिष्ट मान्यता",
      description:
        "Our most exclusive recognition for caterers with a long-standing culinary legacy.",
      descriptionHi:
        "लंबे समय से चली आ रही पाक विरासत वाले कैटरर्स के लिए हमारी सबसे विशिष्ट मान्यता।",
      icon: "🏛️",
      requirements: [
        {
          title: "Minimum 15 years continuous legacy",
          desc: t(
            "Established commercial presence and continuous culinary operations for at least 15 years.",
            "कम से कम 15 वर्षों से निरंतर पाक संचालन और स्थापित व्यावसायिक उपस्थिति।"
          ),
        },
        {
          title: "Preferably family-run/legacy food business",
          desc: t(
            "Custodianship rooted in artisanal family enterprise, heritage khansamas, or generational lineage.",
            "पारिवारिक उद्यम, पारंपरिक खानसामा या पीढ़ीगत विरासत में निहित संरक्षण।"
          ),
        },
        {
          title: "Strong connection with local culinary tradition",
          desc: t(
            "Deep grounding in authentic Awadhi, Purvanchali, Bhojpuri, or regional festive gastronomy.",
            "अवधी, पूर्वांचली, भोजपुरी या क्षेत्रीय पारंपरिक भोजन में गहरी जड़ें।"
          ),
        },
        {
          title: "Multiple generations involved OR demonstrable long-standing legacy",
          desc: t(
            "Multi-generational master chefs active in kitchen leadership or documented institutional heritage.",
            "रसोई में सक्रिय बहु-पीढ़ी के मास्टर शेफ या दस्तावेजी ऐतिहासिक विरासत।"
          ),
        },
        {
          title: "Recognised local reputation",
          desc: t(
            "Iconic standing as a culinary institution trusted across communities and generations.",
            "समुदायों और पीढ़ियों में एक प्रतिष्ठित पाक संस्थान के रूप में स्थापित पहचान।"
          ),
        },
        {
          title: "Signature/traditional dishes",
          desc: t(
            "Time-honored recipes, artisanal slow-cooking mastery (dum pukht, sigri), and hallmark preparations.",
            "पारंपरिक व्यंजन विधियां, धीमी आंच पर पकाने की कला और ऐतिहासिक सिग्नेचर व्यंजन।"
          ),
        },
        {
          title: "Consistent quality over the years",
          desc: t(
            "Uncompromising taste benchmarks, authentic spices, and enduring culinary excellence.",
            "वर्षों से लगातार बेजोड़ स्वाद मानक, प्रामाणिक मसाले और स्थायी पाक उत्कृष्टता।"
          ),
        },
        {
          title: "Strong historical/customer references",
          desc: t(
            "Rich archive of landmark civic celebrations, family weddings, and historic host testimonials.",
            "ऐतिहासिक पारिवारिक विवाहों, बड़े समारोहों और ग्राहकों के पुख्ता प्रशंसापत्र।"
          ),
        },
        {
          title: "Bhojpatra tasting + verification process pass",
          desc: t(
            "Exhaustive verification of lineage, on-site legacy kitchen review, and curated tasting audit.",
            "पाक वंश का गहन सत्यापन, पारंपरिक रसोई का प्रत्यक्ष निरीक्षण और टेस्टिंग ऑडिट पास।"
          ),
        },
      ],
    },
  ];

  // Preselect the registration type when arriving from a "Become a Partner" /
  // "List as a Vendor" CTA (e.g. /signup?type=vendor). Read in an effect so the
  // server and first client render match — no Suspense boundary needed.
  useEffect(() => {
    if (!isSignup) return;
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    if (type === "vendor" || type === "partner") setAccountType(type);
    const role = params.get("role");
    if (role === "planner" || role === "individual" || role === "venue") {
      setPartnerRole(role);
    }
  }, [isSignup]);

  // Pull the token + email out of the reset link (/reset-password?token=…&email=…).
  useEffect(() => {
    if (!isReset) return;
    const params = new URLSearchParams(window.location.search);
    setResetToken(params.get("token")?.trim() ?? "");
    setResetEmail((params.get("email")?.trim() ?? "").toLowerCase());
    setResetReady(true);
  }, [isReset]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    // ── Reset password (complete) ────────────────────────────────────────
    if (isReset) {
      const confirm = String(form.get("confirmPassword") ?? "");
      if (password !== confirm) {
        setError(t("Passwords don't match.", "पासवर्ड मेल नहीं खाते।"));
        return;
      }
      setSubmitting(true);
      setError("");
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: resetEmail,
            token: resetToken,
            password,
          }),
        });
        const json = (await res.json().catch(() => null)) as
          | { reset?: boolean; error?: string }
          | null;
        if (!res.ok || !json?.reset) {
          setError(
            json?.error ??
              t(
                "This reset link is invalid or has expired.",
                "यह रीसेट लिंक अमान्य है या समाप्त हो गया है।",
              ),
          );
          return;
        }
        setSubmitted(true);
      } catch {
        setError(
          t(
            "Couldn't reset your password. Please try again.",
            "आपका पासवर्ड रीसेट नहीं हो सका। कृपया पुनः प्रयास करें।",
          ),
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // ── Forgot password ──────────────────────────────────────────────────
    if (isForgot) {
      setSubmitting(true);
      setError("");
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).catch(() => null);
      setSubmitting(false);
      // A non-OK reply here means sending is broken for *everyone* (mail not
      // configured / server error) — never "no such account", so showing it
      // leaks nothing. Anything else confirms, so we don't reveal whether the
      // email is registered.
      if (!res || !res.ok) {
        const json = (await res?.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(
          json?.error ??
            t(
              "Couldn't send the reset email. Please try again later.",
              "रीसेट ईमेल नहीं भेजा जा सका। कृपया बाद में पुनः प्रयास करें।",
            ),
        );
        return;
      }
      setSubmitted(true); // always confirm — don't leak whether the email exists
      return;
    }

    // ── Sign up ──────────────────────────────────────────────────────────
    if (isSignup) {
      const name = fullName.trim();
      const confirm = String(form.get("confirmPassword") ?? "");
      // Validate contact details up front so no account is created with a
      // malformed email or a mobile number that isn't a real 10-digit number.
      if (!isValidEmail(email)) {
        setError(
          t(
            "Please enter a valid email address.",
            "कृपया एक मान्य ईमेल पता दर्ज करें।",
          ),
        );
        return;
      }
      if (!isValidPhone(mobile)) {
        setError(
          t(
            "Please enter a valid 10-digit mobile number.",
            "कृपया एक मान्य 10-अंकों का मोबाइल नंबर दर्ज करें।",
          ),
        );
        return;
      }
      if (password !== confirm) {
        setError(t("Passwords don't match.", "पासवर्ड मेल नहीं खाते।"));
        return;
      }
      if (isVenuePartner) {
        const gst = String(form.get("gst") ?? "");
        if (!isValidGst(gst)) {
          setError(
            t(
              "Please enter a valid 15-digit GST number.",
              "कृपया एक मान्य 15-अंकीय जीएसटी नंबर दर्ज करें।",
            ),
          );
          return;
        }
      }
      // A referral partner gets a unique code they share to attribute bookings.
      const code = isPartner ? makeReferralCode(name) : "";
      const partnerRoles =
        isPartner && partnerRole
          ? [{ type: partnerRole, referralCode: code }]
          : undefined;

      setSubmitting(true);
      setError("");
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            role: accountType,
            ...(partnerRoles ? { partnerRoles } : {}),
          }),
        });
        const json = (await res.json().catch(() => null)) as
          | { user?: { role: AccountType }; error?: string }
          | null;
        if (!res.ok || !json?.user) {
          setError(json?.error ?? t("Couldn't create your account.", "आपका अकाउंट नहीं बन सका।"));
          return;
        }

        // The server set the auth cookie and (for a partner) persisted the
        // referral roles on the user record — refresh the session so the header
        // + dashboards pick up the signed-in user.
        if (isPartner && partnerRole) {
          setReferralCode(code);
          await refreshSession();
          // Record the referral partner so the booking wizard can resolve the
          // code to a name and the admin can see who's referring.
          void fetch("/api/partners", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              name,
              type: partnerRole,
              phone: String(form.get("mobile") ?? ""),
              email,
              gst: String(form.get("gst") ?? ""),
            }),
          }).catch(() => {});
        } else {
          await refreshSession();
        }
        setSubmitted(true);
      } catch {
        setError(t("Couldn't create your account. Please try again.", "आपका अकाउंट नहीं बन सका। कृपया पुनः प्रयास करें।"));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // ── Log in ───────────────────────────────────────────────────────────
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json().catch(() => null)) as
        | { user?: { role: AccountType | "admin"; name?: string }; error?: string }
        | null;
      if (!res.ok || !json?.user) {
        setError(json?.error ?? t("Invalid email or password.", "अमान्य ईमेल या पासवर्ड।"));
        return;
      }
      const user = json.user;
      if (user.role === "admin") {
        setAdminSession({ email });
        router.push("/admin/dashboard");
        return;
      }
      await refreshSession();
      router.push(MERGED_DASHBOARD_PATH);
    } catch {
      setError(t("Couldn't sign in. Please try again.", "साइन इन नहीं हो सका। कृपया पुनः प्रयास करें।"));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Mock success screen (signup only) ──────────────────────────────────
  if (isSignup && submitted) {
    const displayName = fullName.trim();
    return (
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-maroon/10 text-3xl text-maroon">
          ✓
        </div>
        <h1 className="font-display mt-6 text-app-title text-ink sm:text-3xl">
          {isVendor
            ? t("Vendor account created!", "वेंडर अकाउंट बन गया!")
            : isPartner
              ? t("Partner account created!", "पार्टनर अकाउंट बन गया!")
              : t("Account created!", "अकाउंट बन गया!")}
        </h1>
        <p className="mt-3 text-base text-ink-soft">
          {displayName
            ? t(`Welcome, ${displayName}. `, `स्वागत है, ${displayName}। `)
            : ""}
          {isVendor
            ? t(
                "Next, complete your business profile and KYC to start receiving bookings.",
                "आगे, बुकिंग प्राप्त करना शुरू करने के लिए अपनी बिज़नेस प्रोफ़ाइल और केवाईसी पूरी करें।"
              )
            : isVenuePartner
              ? t(
                  "Next, list your venue so customers can find, book and pay for it on Bhojpatra.",
                  "आगे, अपना वेन्यू लिस्ट करें ताकि ग्राहक इसे Bhojpatra पर खोज, बुक और भुगतान कर सकें।"
                )
              : isPartner
                ? t(
                    "Share your referral code below. Every feast booked with it is tagged to you.",
                    "नीचे दिया अपना रेफ़रल कोड साझा करें। इससे बुक हुआ हर भोज आपके नाम टैग होगा।"
                  )
                : t(
                    "You're all set to book your next feast.",
                    "आप अपना अगला भोज बुक करने के लिए तैयार हैं।"
                  )}
        </p>

        <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-cream-2 px-4 py-2 text-sm text-ink">
          {t("Account Type", "अकाउंट प्रकार")}
          <span className="font-semibold text-maroon">
            {isVendor
              ? t("Vendor", "वेंडर")
              : isPartner && partnerRole
                ? PARTNER_ROLE_LABEL[partnerRole]
                : t("Customer", "ग्राहक")}
          </span>
        </span>

        {isVendor && badgeApplications.length > 0 && (
          <div className="mt-4 rounded-card border border-maroon/20 bg-cream/30 p-3 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-maroon">
              {t("Badges Applied with Signup", "साइनअप के साथ आवेदन किए गए बैज")}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {badgeApplications.map((bId) => {
                const b = BADGE_OPTIONS.find((item) => item.id === bId);
                return (
                  <span
                    key={bId}
                    className="inline-flex items-center gap-1 rounded-full bg-maroon text-cream px-2.5 py-1 text-xs font-medium"
                  >
                    <span>{b?.icon}</span>
                    <span>{b?.name}</span>
                    <span className="text-[10px] text-cream/70">✓</span>
                  </span>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-ink-soft">
              {t(
                "Your badge application has been recorded and will be evaluated during your onboarding verification.",
                "आपका बैज आवेदन रिकॉर्ड कर लिया गया है और ऑनबोर्डिंग सत्यापन के दौरान इसका मूल्यांकन किया जाएगा।"
              )}
            </p>
          </div>
        )}

        {isPartner && referralCode && (
          <div className="mt-5 rounded-card border border-maroon/30 bg-cream px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {t("Your Referral Code", "आपका रेफ़रल कोड")}
            </p>
            <p className="font-display mt-1 text-2xl font-bold tracking-wider text-maroon">
              {referralCode}
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          {isVenuePartner ? (
            <Button href="/partner/dashboard?tab=venues" size="lg" fullWidth>
              {t("List your venue", "अपना वेन्यू लिस्ट करें")}
            </Button>
          ) : (
            <Button href={MERGED_DASHBOARD_PATH} size="lg" fullWidth>
              {t("Go to My Dashboard", "मेरे डैशबोर्ड पर जाएं")}
            </Button>
          )}
          {isVendor && (
            <Button href="/vendor/register" variant="secondary" size="lg" fullWidth>
              {t("Complete Vendor Registration", "वेंडर रजिस्ट्रेशन पूरा करें")}
            </Button>
          )}
          {isVenuePartner && (
            <Button href={MERGED_DASHBOARD_PATH} variant="secondary" size="lg" fullWidth>
              {t("Go to My Dashboard", "मेरे डैशबोर्ड पर जाएं")}
            </Button>
          )}
          <Button href="/login" variant="secondary" size="lg" fullWidth>
            {t("Go to Log In", "लॉग इन पर जाएं")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Forgot-password confirmation ───────────────────────────────────────
  if (isForgot && submitted) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-maroon/10 text-3xl text-maroon">
          ✓
        </div>
        <h1 className="font-display mt-6 text-app-title text-ink sm:text-3xl">
          {t("Check your email", "अपना ईमेल देखें")}
        </h1>
        <p className="mt-3 text-base text-ink-soft">
          {t(
            "If an account exists for that email, we've sent a link to reset your password.",
            "यदि उस ईमेल के लिए कोई अकाउंट मौजूद है, तो हमने पासवर्ड रीसेट करने का लिंक भेज दिया है।",
          )}
        </p>
        <div className="mt-8">
          <Button href="/login" variant="secondary" size="lg" fullWidth>
            {t("← Back to log in", "← लॉग इन पर वापस जाएं")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Reset-password success ─────────────────────────────────────────────
  if (isReset && submitted) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-maroon/10 text-3xl text-maroon">
          ✓
        </div>
        <h1 className="font-display mt-6 text-app-title text-ink sm:text-3xl">
          {t("Password updated", "पासवर्ड अपडेट हो गया")}
        </h1>
        <p className="mt-3 text-base text-ink-soft">
          {t(
            "Your password has been changed. You can now log in with your new password.",
            "आपका पासवर्ड बदल दिया गया है। अब आप अपने नए पासवर्ड से लॉग इन कर सकते हैं।",
          )}
        </p>
        <div className="mt-8">
          <Button href="/login" size="lg" fullWidth>
            {t("Go to Log In", "लॉग इन पर जाएं")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Reset link is missing/broken ───────────────────────────────────────
  // Both halves of the link are required — the server matches the token against
  // the account named by `email`, so a link missing either is unusable.
  if (isReset && resetReady && (!resetToken || !resetEmail)) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-maroon/10 text-3xl text-maroon">
          !
        </div>
        <h1 className="font-display mt-6 text-app-title text-ink sm:text-3xl">
          {t("Reset link is invalid", "रीसेट लिंक अमान्य है")}
        </h1>
        <p className="mt-3 text-base text-ink-soft">
          {t(
            "This password-reset link is incomplete or has expired. Request a fresh one to continue.",
            "यह पासवर्ड-रीसेट लिंक अधूरा है या समाप्त हो गया है। जारी रखने के लिए एक नया लिंक अनुरोध करें।",
          )}
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button href="/forgot-password" size="lg" fullWidth>
            {t("Request a new link", "नया लिंक अनुरोध करें")}
          </Button>
          <Button href="/login" variant="secondary" size="lg" fullWidth>
            {t("← Back to log in", "← लॉग इन पर वापस जाएं")}
          </Button>
        </div>
      </div>
    );
  }

  // The three referral partner lanes — used by the chooser below and to tailor
  // each lane's dedicated sign-up header/CTA.
  const partnerLanes: {
    value: PartnerRole;
    icon: string;
    title: string;
    hint: string;
  }[] = [
    {
      value: "planner",
      icon: "📋",
      title: t("Event Planner", "इवेंट प्लानर"),
      hint: t("Refer client bookings", "क्लाइंट बुकिंग रेफ़र करें"),
    },
    {
      value: "individual",
      icon: "🙋",
      title: t("Individual Referrer", "व्यक्तिगत रेफ़रर"),
      hint: t("Refer & earn", "रेफ़र करें और कमाएं"),
    },
    {
      value: "venue",
      icon: "🏛️",
      title: t("Venue Owner", "वेन्यू मालिक"),
      hint: t("Banquet halls & venues", "बैंक्वेट हॉल और वेन्यू"),
    },
  ];

  // Per-lane copy so each partner gets its own dedicated flow rather than one
  // catch-all "Partner Sign Up" form. Null for customer/vendor signups.
  const partnerRoleMeta =
    partnerRole === "planner"
      ? {
          badge: t("Event Planner Sign Up", "इवेंट प्लानर साइन अप"),
          heading: t("Join as an Event Planner", "इवेंट प्लानर के रूप में जुड़ें"),
          lede: t(
            "Refer your client bookings to Bhojpatra and earn on every confirmed feast.",
            "अपनी क्लाइंट बुकिंग Bhojpatra को रेफ़र करें और हर पुष्ट भोज पर कमाएं।",
          ),
          cta: t("Create Planner Account", "प्लानर अकाउंट बनाएं"),
        }
      : partnerRole === "venue"
        ? {
            badge: t("Venue Owner Sign Up", "वेन्यू मालिक साइन अप"),
            heading: t("List your venue on Bhojpatra", "अपना वेन्यू Bhojpatra पर लिस्ट करें"),
            lede: t(
              "Onboard your banquet hall or lawn for in-house catering and earn on every booking.",
              "इन-हाउस कैटरिंग के लिए अपना बैंक्वेट हॉल या लॉन जोड़ें और हर बुकिंग पर कमाएं।",
            ),
            cta: t("Create Venue Account", "वेन्यू अकाउंट बनाएं"),
          }
        : partnerRole === "individual"
          ? {
              badge: t("Individual Referrer Sign Up", "व्यक्तिगत रेफ़रर साइन अप"),
              heading: t("Refer feasts & earn", "भोज रेफ़र करें और कमाएं"),
              lede: t(
                "Share your code, refer a feast, and earn on every confirmed booking — no business needed.",
                "अपना कोड साझा करें, भोज रेफ़र करें, और हर पुष्ट बुकिंग पर कमाएं — किसी व्यवसाय की ज़रूरत नहीं।",
              ),
              cta: t("Create Referrer Account", "रेफ़रर अकाउंट बनाएं"),
            }
          : null;

  // ── Partner chooser ─────────────────────────────────────────────────────
  // A partner signup with no lane picked (via "Become a Partner" / "Refer &
  // earn"). Rather than crowd the account form with a picker, we present the
  // lanes on their own, then hand off to that lane's dedicated flow.
  if (isSignup && isPartner && !partnerRole) {
    return (
      <div>
        <header className="mb-8">
          <span className="mb-3 inline-flex items-center rounded-full border border-maroon/30 bg-cream px-3 py-1 text-xs font-semibold uppercase tracking-wide text-maroon">
            {t("Partner Sign Up", "पार्टनर साइन अप")}
          </span>
          <h1 className="font-display text-app-title text-ink sm:text-3xl lg:text-4xl">
            {t("How do you want to partner?", "आप कैसे जुड़ना चाहते हैं?")}
          </h1>
          <p className="mt-2 text-base text-ink-soft">
            {t(
              "Pick the path that fits you — each one has its own quick sign-up.",
              "अपने लिए सही रास्ता चुनें — हर एक का अपना त्वरित साइन-अप है।",
            )}
          </p>
        </header>

        <div role="list" className="flex flex-col gap-3">
          {partnerLanes.map((lane) => (
            <button
              key={lane.value}
              type="button"
              onClick={() => setPartnerRole(lane.value)}
              className="focus-ring group flex items-center gap-4 rounded-card border border-cream-3 bg-cream/40 px-4 py-4 text-left transition-colors hover:border-maroon/50 hover:bg-cream-2"
            >
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-maroon/15 bg-white text-xl"
              >
                {lane.icon}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-base font-semibold text-ink">
                  {lane.title}
                </span>
                <span className="text-sm text-ink-soft">{lane.hint}</span>
              </span>
              <span
                aria-hidden="true"
                className="text-lg text-maroon transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </button>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-ink-soft">
          {t("Just want to book a feast? ", "बस भोज बुक करना चाहते हैं? ")}
          <button
            type="button"
            onClick={() => setAccountType("customer")}
            className="font-semibold text-maroon hover:underline"
          >
            {t("Sign up as a customer", "ग्राहक के रूप में साइन अप करें")}
          </button>
        </p>
        <p className="mt-2 text-center text-sm text-ink-soft">
          {t("Already have an account? ", "पहले से अकाउंट है? ")}
          <Link href="/login" className="font-semibold text-maroon hover:underline">
            {t("Log in", "लॉग इन")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8">
        {/* With no in-form role picker, arriving from a "List as a Vendor" /
            "Become a Partner" CTA (?type=…) must announce itself clearly — and
            each partner lane names itself so the flow feels dedicated. */}
        {isSignup && (isVendor || (isPartner && partnerRoleMeta)) && (
          <span className="mb-3 inline-flex items-center rounded-full border border-maroon/30 bg-cream px-3 py-1 text-xs font-semibold uppercase tracking-wide text-maroon">
            {isVendor ? t("Vendor Sign Up", "वेंडर साइन अप") : partnerRoleMeta!.badge}
          </span>
        )}
        <h1 className="font-display text-app-title text-ink sm:text-3xl lg:text-4xl">
          {isSignup
            ? isPartner && partnerRoleMeta
              ? partnerRoleMeta.heading
              : t("Create your account", "अपना अकाउंट बनाएं")
            : isForgot
              ? t("Reset your password", "अपना पासवर्ड रीसेट करें")
              : isReset
                ? t("Choose a new password", "नया पासवर्ड चुनें")
                : t("Welcome back", "वापसी पर स्वागत है")}
        </h1>
        <p className="mt-2 text-base text-ink-soft">
          {isSignup
            ? isVendor
              ? t(
                  "Register your catering business on Bhojpatra.",
                  "अपना कैटरिंग बिज़नेस Bhojpatra पर रजिस्टर करें।"
                )
              : isPartner && partnerRoleMeta
                ? partnerRoleMeta.lede
                : t(
                    "Join Bhojpatra to book your next feast.",
                    "अपना अगला भोज बुक करने के लिए Bhojpatra से जुड़ें।"
                  )
            : isForgot
              ? t(
                  "Enter your email and we'll send you a reset link.",
                  "अपना ईमेल दर्ज करें और हम आपको रीसेट लिंक भेजेंगे।"
                )
              : isReset
                ? resetEmail
                  ? t(
                      `Set a new password for ${resetEmail}.`,
                      `${resetEmail} के लिए नया पासवर्ड सेट करें।`
                    )
                  : t(
                      "Set a new password for your account.",
                      "अपने अकाउंट के लिए नया पासवर्ड सेट करें।"
                    )
                : t(
                    "Log in to manage your celebrations.",
                    "अपने समारोह प्रबंधित करने के लिए लॉग इन करें।"
                  )}
        </p>

        {/* Dedicated partner flow: let them switch lanes without losing place. */}
        {isSignup && isPartner && partnerRole && (
          <button
            type="button"
            onClick={() => setPartnerRole(null)}
            className="focus-ring mt-3 inline-flex items-center gap-1 rounded-control text-sm font-medium text-maroon hover:underline"
          >
            {t("← Choose a different partner type", "← अलग पार्टनर प्रकार चुनें")}
          </button>
        )}
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isSignup && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fullName" className="text-sm text-ink-soft">
              {isVendor
                ? t("Owner / Contact Name", "मालिक / संपर्क नाम")
                : t("Full Name", "पूरा नाम")}
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("Enter your full name", "अपना पूरा नाम दर्ज करें")}
              className={inputClass}
            />
          </div>
        )}

        {isSignup && isVendor && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="businessName" className="text-sm text-ink-soft">
              {t("Business Name", "बिज़नेस का नाम")}
            </label>
            <input
              id="businessName"
              name="businessName"
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder={t("e.g. Awadhi Royal Caterers", "उदा. अवधी रॉयल कैटरर्स")}
              className={inputClass}
            />
          </div>
        )}

        {isSignup && isVenuePartner && (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="venueName" className="text-sm text-ink-soft">
                {t("Venue Name", "वेन्यू का नाम")}
              </label>
              <input
                id="venueName"
                name="venueName"
                type="text"
                required
                placeholder={t("e.g. Grand Lawns & Banquet", "उदा. ग्रैंड लॉन्स एंड बैंक्वेट")}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="gst" className="text-sm text-ink-soft">
                {t("GST Number", "GST नंबर")} *
              </label>
              <input
                id="gst"
                name="gst"
                type="text"
                required
                autoCapitalize="characters"
                placeholder={t("15-digit GSTIN", "15 अंकों का GSTIN")}
                className={inputClass}
              />
            </div>
          </>
        )}

        {!isReset && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm text-ink-soft">
              {t("Email Address", "ईमेल पता")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>
        )}

        {isSignup && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="mobile" className="text-sm text-ink-soft">
              {t("Mobile Number", "मोबाइल नंबर")}
            </label>
            <input
              id="mobile"
              name="mobile"
              type="tel"
              required
              inputMode="numeric"
              autoComplete="tel"
              maxLength={13}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/[^\d+]/g, ""))}
              placeholder={t("10-digit mobile number", "10 अंकों का मोबाइल नंबर")}
              className={inputClass}
            />
          </div>
        )}

        {isSignup && isVendor && (
          <>
            {/* ── Vendor Offerings Section (Anchored before Badges) ── */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-ink">
                  {t("Commercial Offerings", "वाणिज्यिक सेवाएं")}
                </label>
                <span className="text-xs text-ink-soft">
                  {t("Select what you provide", "जो सेवाएं आप देते हैं")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {OFFERING_OPTIONS.map((offering) => {
                  const isSelected = selectedOfferings.includes(offering.id);
                  return (
                    <button
                      key={offering.id}
                      type="button"
                      onClick={() => toggleOffering(offering.id)}
                      className={`focus-ring flex flex-col items-start gap-1 rounded-control border p-2.5 text-left transition-all ${
                        isSelected
                          ? "border-maroon bg-cream/40 ring-1 ring-maroon/30 shadow-xs"
                          : "border-cream-3 bg-white/70 hover:border-maroon/30 hover:bg-cream/20"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-lg">{offering.icon}</span>
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] font-bold ${
                            isSelected
                              ? "border-maroon bg-maroon text-cream"
                              : "border-cream-3 bg-white text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-ink leading-tight">
                        {offering.title}
                      </span>
                      <span className="text-[11px] text-ink-soft line-clamp-2 leading-tight">
                        {offering.blurb}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Task 17: Badges & Recognition Section (Directly after Offerings) ── */}
            <div
              id="vendor-badges-section"
              className="flex flex-col gap-3 rounded-card border border-maroon/25 bg-cream/30 p-4"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-maroon">
                    {t("Recognition Program", "मान्यता कार्यक्रम")}
                  </span>
                  <span className="rounded-full bg-maroon/10 px-2.5 py-0.5 text-xs font-bold text-maroon">
                    {badgeApplications.length > 0
                      ? t(
                          `${badgeApplications.length} Applied`,
                          `${badgeApplications.length} आवेदन किए गए`
                        )
                      : t("Optional", "वैकल्पिक")}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-ink">
                  {t("Badges & Recognition", "बैज और पहचान")}
                </h3>
                <p className="text-xs text-ink-soft leading-relaxed">
                  {t(
                    "Apply for Bhojpatra recognition badges to highlight your kitchen's standards, heritage, and verified trust to customers from day one.",
                    "पहले दिन से ही ग्राहकों के सामने अपनी रसोई के मानकों, विरासत और सत्यापित विश्वसनीयता को उजागर करने के लिए Bhojpatra मान्यता बैज के लिए आवेदन करें।"
                  )}
                </p>
              </div>

              {/* 3 Badge Cards */}
              <div className="flex flex-col gap-2.5">
                {BADGE_OPTIONS.map((badge) => {
                  const isApplied = badgeApplications.includes(badge.id);
                  const isExpanded = expandedBadge === badge.id;
                  const appData = badgeDetails[badge.id];
                  const isSubmitted = isApplied || appData?.status === "submitted";
                  const isInProgress = !isSubmitted && appData?.status === "in_progress";

                  return (
                    <div
                      key={badge.id}
                      data-badge-card={badge.id}
                      className={`rounded-control border transition-all ${
                        isSubmitted
                          ? "border-maroon bg-white shadow-sm ring-1 ring-maroon/20"
                          : isInProgress
                            ? "border-maroon/50 bg-white/95 ring-1 ring-maroon/10 shadow-xs"
                            : "border-cream-3 bg-white/80 hover:border-maroon/40 hover:bg-white"
                      } p-3.5`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-maroon/15 bg-cream/40 text-lg">
                            {badge.icon}
                          </span>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-ink">
                                {badge.name}
                              </h4>
                              {isSubmitted ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-maroon/10 px-2 py-0.5 text-[11px] font-semibold text-maroon">
                                  ✓ {t("Application Submitted", "आवेदन जमा")} · {t("Applied", "लागू")}
                                </span>
                              ) : isInProgress ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-cream-2/80 px-2 py-0.5 text-[11px] font-semibold text-maroon">
                                  ⏳ {t("In Progress", "प्रगति पर")}
                                </span>
                              ) : null}
                            </div>
                            <span className="text-xs font-medium text-maroon/90">
                              {badge.tagline}
                            </span>
                            <p className="mt-1 text-xs text-ink-soft leading-relaxed">
                              {badge.description}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <button
                            type="button"
                            data-badge-apply={badge.id}
                            onClick={() => toggleBadgeApplication(badge.id)}
                            className={`focus-ring tap inline-flex min-h-[36px] items-center justify-center rounded-control px-3 text-xs font-semibold transition-all ${
                              isSubmitted
                                ? "bg-maroon text-cream hover:bg-maroon/90"
                                : isInProgress
                                  ? "border border-maroon bg-cream/40 text-maroon hover:bg-cream"
                                  : "border border-maroon/40 bg-cream/20 text-maroon hover:border-maroon hover:bg-cream"
                            }`}
                          >
                            {isSubmitted
                              ? t("✓ Application Submitted", "✓ आवेदन जमा किया")
                              : isInProgress
                                ? t("Continue Application", "आवेदन जारी रखें")
                                : t("Apply", "आवेदन करें")}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Requirements Toggle & Area */}
                      <div className="mt-2.5 border-t border-cream-3/60 pt-2">
                        <button
                          type="button"
                          data-badge-toggle={badge.id}
                          onClick={() => toggleExpandBadge(badge.id)}
                          className="focus-ring inline-flex items-center gap-1 text-xs font-medium text-maroon hover:underline"
                        >
                          <span>
                            {isExpanded
                              ? t("Hide Requirements", "आवश्यकताएं छिपाएं")
                              : t("View Requirements", "आवश्यकताएं देखें")}
                          </span>
                          <span className="text-[10px]">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </button>

                        {isExpanded && (
                          <div
                            data-badge-requirements={badge.id}
                            className="mt-2.5 rounded-control bg-cream/30 p-3 text-xs text-ink"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-semibold text-ink-soft uppercase tracking-wider text-[10.5px]">
                                {t("Requirements", "आवश्यकताएं")}
                              </p>
                              <span className="text-[10.5px] text-ink-soft/80">
                                {badge.requirements.length} {t("mandatory criteria", "अनिवार्य मानदंड")}
                              </span>
                            </div>
                            <ul className="flex flex-col gap-2">
                              {badge.requirements.map((req, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2"
                                >
                                  <span
                                    className="text-maroon/80 font-mono text-xs leading-5 select-none shrink-0"
                                    aria-hidden="true"
                                  >
                                    □
                                  </span>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-ink leading-5">
                                      {req.title}
                                    </span>
                                    {req.exception && (
                                      <div className="text-[11px] text-maroon/90 font-medium mt-0.5 flex flex-wrap items-center gap-1">
                                        <span className="inline-flex items-center rounded bg-cream-2 px-1.5 py-0.5 border border-maroon/20 text-[11px]">
                                          {t("Exception: strong established brand/new entity", "अपवाद: मजबूत स्थापित ब्रांड या नई इकाई")}
                                        </span>
                                        <span className="text-[10.5px] text-ink-soft">
                                          ({t("Exception allowed for a strong established brand/new entity", "मजबूत स्थापित ब्रांड या नई इकाई के लिए अपवाद की अनुमति")})
                                        </span>
                                      </div>
                                    )}
                                    {req.desc && (
                                      <span className="text-[11px] text-ink-soft leading-tight mt-0.5">
                                        {req.desc}
                                      </span>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>

                            {/* Separate Plus Points Section for badges that define it (Task 19) */}
                            {"plusPoints" in badge &&
                              Array.isArray((badge as any).plusPoints) &&
                              (badge as any).plusPoints.length > 0 && (
                                <div
                                  data-badge-plus-points={badge.id}
                                  className="mt-3.5 border-t border-maroon/15 pt-3"
                                >
                                  <div className="flex items-center justify-between mb-1.5">
                                    <p className="font-semibold text-ink uppercase tracking-wider text-[10.5px]">
                                      {t("Plus Points", "प्लस पॉइंट्स")}
                                    </p>
                                    <span className="text-[10px] font-medium text-maroon bg-maroon/10 rounded-full px-2 py-0.5">
                                      {t("Non-mandatory", "गैर-अनिवार्य")}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-ink-soft mb-2 leading-relaxed">
                                    {t(
                                      "Additional strengths that improve candidacy (not mandatory to qualify):",
                                      "अतिरिक्त खूबियां जो उम्मीदवारी को मजबूत बनाती हैं (पात्रता के लिए अनिवार्य नहीं):"
                                    )}
                                  </p>
                                  <ul className="flex flex-col gap-2">
                                    {(badge as any).plusPoints.map(
                                      (point: { title: string; desc?: string }, pIdx: number) => (
                                        <li
                                          key={pIdx}
                                          className="flex items-start gap-2"
                                        >
                                          <span
                                            className="text-maroon/80 font-bold text-xs leading-5 select-none shrink-0"
                                            aria-hidden="true"
                                          >
                                            +
                                          </span>
                                          <div className="flex flex-col">
                                            <span className="font-medium text-ink leading-5">
                                              {point.title}
                                            </span>
                                            {point.desc && (
                                              <span className="text-[11px] text-ink-soft leading-tight mt-0.5">
                                                {point.desc}
                                              </span>
                                            )}
                                          </div>
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {!isForgot && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm text-ink-soft">
              {isReset
                ? t("New Password", "नया पासवर्ड")
                : t("Password", "पासवर्ड")}
            </label>
            {!isSignup && !isReset && (
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-maroon hover:underline"
              >
                {t("Forgot password?", "पासवर्ड भूल गए?")}
              </Link>
            )}
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete={isSignup || isReset ? "new-password" : "current-password"}
              placeholder={
                isSignup || isReset
                  ? t("At least 8 characters", "कम से कम 8 अक्षर")
                  : t("Enter your password", "अपना पासवर्ड दर्ज करें")
              }
              className={`${inputClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t("Hide password", "पासवर्ड छिपाएं")
                  : t("Show password", "पासवर्ड दिखाएं")
              }
              className="focus-ring tap absolute inset-y-0 right-0 flex min-h-12 w-12 items-center justify-center rounded-r-control text-ink-soft transition duration-200 active:scale-95 hover:text-maroon"
            >
              <EyeIcon off={showPassword} />
            </button>
          </div>
        </div>
        )}

        {(isSignup || isReset) && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-sm text-ink-soft">
              {isReset
                ? t("Confirm New Password", "नए पासवर्ड की पुष्टि करें")
                : t("Confirm Password", "पासवर्ड की पुष्टि करें")}
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder={t("Re-enter your password", "अपना पासवर्ड दोबारा दर्ज करें")}
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={
                  showConfirm
                    ? t("Hide password", "पासवर्ड छिपाएं")
                    : t("Show password", "पासवर्ड दिखाएं")
                }
                className="focus-ring tap absolute inset-y-0 right-0 flex min-h-12 w-12 items-center justify-center rounded-r-control text-ink-soft transition duration-200 active:scale-95 hover:text-maroon"
              >
                <EyeIcon off={showConfirm} />
              </button>
            </div>
          </div>
        )}

        {isSignup ? (
          <label className="flex items-start gap-2.5 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="terms"
              required
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-cream-3 text-maroon accent-maroon"
            />
            <span>
              {t("I agree to the", "मैं सहमत हूं")}{" "}
              <Link href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-maroon hover:underline">
                {t("Terms of Service", "सेवा की शर्तें")}
              </Link>{" "}
              {t("and", "और")}{" "}
              <Link href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-maroon hover:underline">
                {t("Privacy Policy", "गोपनीयता नीति")}
              </Link>
              {t(".", "से।")}
            </span>
          </label>
        ) : isForgot || isReset ? null : (
          <label className="flex items-center gap-2.5 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="remember"
              className="h-4 w-4 shrink-0 rounded border-cream-3 text-maroon accent-maroon"
            />
            {t("Remember me", "मुझे याद रखें")}
          </label>
        )}

        {error && (
          <p className="rounded-control border border-maroon bg-maroon/10 px-3 py-2 text-sm font-medium text-maroon">
            {error}
          </p>
        )}

        <Button type="submit" loading={submitting} size="lg" fullWidth className="mt-1">
          {submitting
            ? t("Please wait…", "कृपया प्रतीक्षा करें…")
            : isSignup
              ? isVendor
                ? t("Create Vendor Account", "वेंडर अकाउंट बनाएं")
                : isPartner
                  ? (partnerRoleMeta?.cta ??
                    t("Create Partner Account", "पार्टनर अकाउंट बनाएं"))
                  : t("Create Account", "अकाउंट बनाएं")
              : isForgot
                ? t("Send Reset Link", "रीसेट लिंक भेजें")
                : isReset
                  ? t("Update Password", "पासवर्ड अपडेट करें")
                  : t("Log In", "लॉग इन")}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-soft">
        {isForgot || isReset ? (
          <Link
            href="/login"
            className="font-semibold text-maroon hover:underline"
          >
            {t("← Back to log in", "← लॉग इन पर वापस जाएं")}
          </Link>
        ) : (
          <>
            {isSignup
              ? t("Already have an account? ", "पहले से अकाउंट है? ")
              : t("New to Bhojpatra? ", "Bhojpatra पर नए हैं? ")}
            <Link
              href={isSignup ? "/login" : "/signup"}
              className="font-semibold text-maroon hover:underline"
            >
              {isSignup
                ? t("Log in", "लॉग इन")
                : t("Create an account", "अकाउंट बनाएं")}
            </Link>
          </>
        )}
      </p>

      {/* Buttons (not ?type= links) — a client-side nav to the same route
          wouldn't re-run the mount effect that reads the query string. */}
      {isSignup && (
        <p className="mt-2 text-center text-sm text-ink-soft">
          {accountType === "customer" ? (
            <>
              {t("Here for business? ", "बिज़नेस के लिए आए हैं? ")}
              <button
                type="button"
                onClick={() => setAccountType("vendor")}
                className="font-semibold text-maroon hover:underline"
              >
                {t("List your catering", "अपनी कैटरिंग सूचीबद्ध करें")}
              </button>
              {" · "}
              <button
                type="button"
                onClick={() => setAccountType("partner")}
                className="font-semibold text-maroon hover:underline"
              >
                {t("Refer & earn", "रेफ़र करें और कमाएं")}
              </button>
            </>
          ) : (
            <>
              {t("Just want to book a feast? ", "बस भोज बुक करना चाहते हैं? ")}
              <button
                type="button"
                onClick={() => setAccountType("customer")}
                className="font-semibold text-maroon hover:underline"
              >
                {t("Sign up as a customer", "ग्राहक के रूप में साइन अप करें")}
              </button>
            </>
          )}
        </p>
      )}
      {/* ── Proper Badge Application Modal (Step 1 to 6) ── */}
      {activeBadgeModal && (
        <BadgeApplicationModal
          badgeId={activeBadgeModal}
          isOpen={!!activeBadgeModal}
          onClose={() => setActiveBadgeModal(null)}
          badgeData={
            badgeDetails[activeBadgeModal] || {
              badgeId: activeBadgeModal,
              status: badgeApplications.includes(activeBadgeModal) ? "submitted" : "not_applied",
              currentStep: 1,
            }
          }
          onUpdateData={(data) => handleUpdateBadgeData(activeBadgeModal, data)}
          onSubmitApplication={handleBadgeSubmit}
          vendorAccount={{
            fullName,
            businessName,
            email,
            mobile,
          }}
        />
      )}
    </div>
  );
}
