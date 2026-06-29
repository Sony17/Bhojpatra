"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n";
import {
  dashboardPath,
  getSession,
  setSession,
  type AccountType,
} from "@/lib/session";
import { setAdminSession, verifyAdmin } from "@/lib/adminAuth";

type Mode = "login" | "signup" | "forgot";

const inputClass =
  "w-full rounded-lg border border-cream-3 bg-cream/40 px-3.5 py-2.5 text-ink placeholder:text-ink-soft/60 outline-none transition-colors focus:border-maroon focus:ring-1 focus:ring-maroon/30";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("customer");
  const [submitted, setSubmitted] = useState(false);
  const [fullName, setFullName] = useState("");

  const isVendor = accountType === "vendor";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSignup) {
      // Mock registration — persist the chosen role so the rest of the app
      // can route this user to the right dashboard, then show a confirmation.
      setSession({ type: accountType, name: fullName.trim() || undefined });
      setSubmitted(true);
      return;
    }
    // Mock login — no backend. The admin signs in through this same form: if the
    // credentials match the admin account, grant the admin session and send them
    // to the control panel instead of a customer/vendor dashboard.
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const admin = verifyAdmin(email, password);
    if (admin) {
      setAdminSession(admin);
      router.push("/admin/dashboard");
      return;
    }

    // Otherwise reuse the persisted role (set at signup) so the header reflects
    // the signed-in user; default to a customer account.
    const existing = getSession();
    setSession(existing ?? { type: "customer" });
    router.push(dashboardPath(existing?.type));
  }

  // ── Mock success screen (signup only) ──────────────────────────────────
  if (isSignup && submitted) {
    const displayName = fullName.trim();
    return (
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-maroon/10 text-3xl text-maroon">
          ✓
        </div>
        <h1 className="font-display mt-6 text-2xl text-ink sm:text-3xl">
          {isVendor
            ? t("Vendor account created!", "वेंडर अकाउंट बन गया!")
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
            : t(
                "You're all set to book your next feast.",
                "आप अपना अगला भोज बुक करने के लिए तैयार हैं।"
              )}
        </p>

        <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-cream-2 px-4 py-2 text-sm text-ink">
          {t("Account Type", "अकाउंट प्रकार")}
          <span className="font-semibold text-maroon">
            {isVendor ? t("Vendor", "वेंडर") : t("Customer", "ग्राहक")}
          </span>
        </span>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={dashboardPath(accountType)}
            className="w-full rounded-lg bg-maroon px-5 py-3 text-base font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark"
          >
            {isVendor
              ? t("Go to Vendor Dashboard", "वेंडर डैशबोर्ड पर जाएं")
              : t("Go to My Dashboard", "मेरे डैशबोर्ड पर जाएं")}
          </Link>
          {isVendor && (
            <Link
              href="/vendor/register"
              className="w-full rounded-lg border border-maroon px-5 py-3 text-base font-semibold text-maroon transition-colors hover:bg-maroon/5"
            >
              {t("Complete Vendor Registration", "वेंडर रजिस्ट्रेशन पूरा करें")}
            </Link>
          )}
          <Link
            href="/login"
            className="w-full rounded-lg border border-maroon px-5 py-3 text-base font-semibold text-maroon transition-colors hover:bg-maroon/5"
          >
            {t("Go to Log In", "लॉग इन पर जाएं")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-2xl text-ink sm:text-3xl lg:text-4xl">
          {isSignup
            ? t("Create your account", "अपना अकाउंट बनाएं")
            : isForgot
              ? t("Reset your password", "अपना पासवर्ड रीसेट करें")
              : t("Welcome back", "वापसी पर स्वागत है")}
        </h1>
        <p className="mt-2 text-base text-ink-soft">
          {isSignup
            ? isVendor
              ? t(
                  "Register your catering business on Bhojpatra.",
                  "अपना कैटरिंग बिज़नेस Bhojpatra पर रजिस्टर करें।"
                )
              : t(
                  "Join Bhojpatra to book your next feast.",
                  "अपना अगला भोज बुक करने के लिए Bhojpatra से जुड़ें।"
                )
            : isForgot
              ? t(
                  "Enter your email and we'll send you a reset link.",
                  "अपना ईमेल दर्ज करें और हम आपको रीसेट लिंक भेजेंगे।"
                )
              : t(
                  "Log in to manage your celebrations.",
                  "अपने समारोह प्रबंधित करने के लिए लॉग इन करें।"
                )}
        </p>
      </header>

      {isSignup && (
        <div className="mb-6">
          <span className="mb-2 block text-sm text-ink-soft">
            {t("I want to register as", "मैं रजिस्टर करना चाहता हूं")}
          </span>
          <div
            role="radiogroup"
            aria-label={t("Registration type", "रजिस्ट्रेशन प्रकार")}
            className="grid grid-cols-2 gap-2 rounded-xl border border-cream-3 bg-cream/40 p-1.5"
          >
            {([
              {
                value: "customer" as const,
                label: t("Customer", "ग्राहक"),
                hint: t("Book feasts", "भोज बुक करें"),
              },
              {
                value: "vendor" as const,
                label: t("Vendor", "वेंडर"),
                hint: t("List catering", "कैटरिंग सूचीबद्ध करें"),
              },
            ]).map((opt) => {
              const active = accountType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setAccountType(opt.value)}
                  className={
                    "flex flex-col items-center rounded-lg px-4 py-2.5 text-center transition-colors " +
                    (active
                      ? "bg-maroon text-cream shadow-sm"
                      : "text-ink-soft hover:bg-cream-2")
                  }
                >
                  <span className="text-sm font-semibold">{opt.label}</span>
                  <span
                    className={
                      "text-xs " + (active ? "text-cream/80" : "text-ink-soft/70")
                    }
                  >
                    {opt.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
              autoComplete="tel"
              placeholder={t("10-digit mobile number", "10 अंकों का मोबाइल नंबर")}
              className={inputClass}
            />
          </div>
        )}

        {!isForgot && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm text-ink-soft">
              {t("Password", "पासवर्ड")}
            </label>
            {!isSignup && (
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-maroon hover:text-maroon-dark"
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
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder={
                isSignup
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
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-soft transition-colors hover:text-maroon"
            >
              <EyeIcon off={showPassword} />
            </button>
          </div>
        </div>
        )}

        {isSignup && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-sm text-ink-soft">
              {t("Confirm Password", "पासवर्ड की पुष्टि करें")}
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
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-soft transition-colors hover:text-maroon"
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
              <Link href="/terms" className="font-medium text-maroon hover:text-maroon-dark">
                {t("Terms of Service", "सेवा की शर्तें")}
              </Link>{" "}
              {t("and", "और")}{" "}
              <Link href="/terms" className="font-medium text-maroon hover:text-maroon-dark">
                {t("Privacy Policy", "गोपनीयता नीति")}
              </Link>
              {t(".", "से।")}
            </span>
          </label>
        ) : isForgot ? null : (
          <label className="flex items-center gap-2.5 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="remember"
              className="h-4 w-4 shrink-0 rounded border-cream-3 text-maroon accent-maroon"
            />
            {t("Remember me", "मुझे याद रखें")}
          </label>
        )}

        <button
          type="submit"
          className="mt-1 w-full rounded-lg bg-maroon px-5 py-3 text-base font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark"
        >
          {isSignup
            ? isVendor
              ? t("Create Vendor Account", "वेंडर अकाउंट बनाएं")
              : t("Create Account", "अकाउंट बनाएं")
            : isForgot
              ? t("Send Reset Link", "रीसेट लिंक भेजें")
              : t("Log In", "लॉग इन")}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-soft">
        {isForgot ? (
          <Link
            href="/login"
            className="font-semibold text-maroon hover:text-maroon-dark"
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
              className="font-semibold text-maroon hover:text-maroon-dark"
            >
              {isSignup
                ? t("Log in", "लॉग इन")
                : t("Create an account", "अकाउंट बनाएं")}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
