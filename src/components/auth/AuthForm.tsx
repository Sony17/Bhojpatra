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
    </div>
  );
}
