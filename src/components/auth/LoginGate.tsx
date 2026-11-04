"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n";
import { refreshSession, type AccountType } from "@/lib/session";
import { BackLink, Button, controlClass, useErrorDialog } from "@/components/ui";
import { authFailureSpec } from "@/lib/failureDialogs";

const inputClass = controlClass;

/** Lock glyph — monochrome so it renders in the brand maroon (currentColor). */
function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/**
 * Inline "please log in" gate shown in place of the payment / confirm step for
 * anonymous guests. Booking and payment are only allowed once signed in, so we
 * ask the guest to log in right here instead of navigating away — the
 * in-progress booking stays on screen, and once the login succeeds the parent
 * re-renders (via `useSession`/`useSessionStatus`) and reveals the pay step.
 *
 * `onBack`, when given, renders a link back to the previous (editable) step so
 * a guest who isn't ready to sign in isn't stranded.
 */
export default function LoginGate({ onBack }: { onBack?: () => void }) {
  const { t } = useLang();
  const pathname = usePathname();
  const [returnPath, setReturnPath] = useState(pathname || "/book/stall");
  useEffect(() => {
    const base = pathname || "/book/stall";
    setReturnPath(
      typeof window !== "undefined" ? base + window.location.search : base,
    );
  }, [pathname]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // The last failure was the guest's credentials (vs. network / server) — the
  // only case where "Forgot password?" is the useful next step.
  const [credError, setCredError] = useState(false);
  const { showError } = useErrorDialog();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setSubmitting(true);
    setError("");
    setCredError(false);
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
        // Wrong credentials (4xx) stay inline beside the fields; a server-side
        // failure (5xx) isn't the guest's doing — pop it up with a retry.
        if (res.status >= 500) {
          const msg = t(
            "Something went wrong on our side. Please try again.",
            "हमारी तरफ़ कुछ गड़बड़ हो गई। कृपया फिर कोशिश करें।",
          );
          setError(msg);
          showError(
            authFailureSpec({
              t,
              info: { status: res.status },
              mode: "login",
              retry: () => formRef.current?.requestSubmit(),
            }),
          );
          return;
        }
        setCredError(true);
        setError(
          json?.error ?? t("Invalid email or password.", "अमान्य ईमेल या पासवर्ड।"),
        );
        return;
      }
      const user = json.user;
      // Admins run the console, not customer bookings — don't let an admin
      // login stand in for a booking account (and it isn't a client AccountType).
      if (user.role === "admin") {
        setError(
          t(
            "Please log in with a customer account to book.",
            "बुकिंग के लिए कृपया ग्राहक अकाउंट से लॉग इन करें।",
          ),
        );
        return;
      }
      // The server set the auth cookie; refresh the session so the parent
      // re-renders and reveals the payment + confirm step now that the guest is
      // signed in — the in-progress booking is untouched.
      await refreshSession();
    } catch {
      setError(
        t(
          "Couldn't reach Bhojpatra — check your connection and try again.",
          "भोजपत्र तक नहीं पहुँच सके — कनेक्शन जाँचकर फिर कोशिश करें।",
        ),
      );
      showError(
        authFailureSpec({
          t,
          info: { network: true },
          mode: "login",
          retry: () => formRef.current?.requestSubmit(),
        }),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-card border border-maroon/20 bg-cream/40 p-6 sm:p-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-maroon/10 text-maroon">
        <LockIcon />
      </div>
      <h2 className="mt-4 text-center text-2xl text-ink">
        {t("Log in to continue", "जारी रखने के लिए लॉग इन करें")}
      </h2>
      <p className="mt-2 text-center text-sm text-ink-soft">
        {t(
          "Please log in to review payment and place your booking.",
          "भुगतान की समीक्षा करने और अपनी बुकिंग करने के लिए कृपया लॉग इन करें।",
        )}
      </p>

      <form ref={formRef} onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="gate-email" className="text-sm text-ink-soft">
            {t("Email Address", "ईमेल पता")}
          </label>
          <input
            id="gate-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="gate-password" className="text-sm text-ink-soft">
            {t("Password", "पासवर्ड")}
          </label>
          <input
            id="gate-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder={t("Enter your password", "अपना पासवर्ड दर्ज करें")}
            className={inputClass}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-control border border-maroon bg-maroon/10 px-3 py-2 text-sm font-medium text-maroon"
          >
            {error}
            {credError && (
              <>
                {" "}
                <Link
                  href="/forgot-password"
                  className="font-semibold underline underline-offset-2"
                >
                  {t("Forgot password?", "पासवर्ड भूल गए?")}
                </Link>
              </>
            )}
          </p>
        )}

        <Button type="submit" loading={submitting} size="lg" fullWidth className="mt-1">
          {submitting
            ? t("Please wait…", "कृपया प्रतीक्षा करें…")
            : t("Log In", "लॉग इन")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        {t("New to Bhojpatra? ", "Bhojpatra पर नए हैं? ")}
        {/* Registering from here returns the guest to this booking (`next`),
            where the saved draft is picked back up — it's only carried from
            the gate, so a plain /signup still lands on the dashboard. */}
        <Link
          href={`/signup?next=${encodeURIComponent(returnPath)}`}
          className="font-semibold text-maroon hover:underline"
        >
          {t("Create an account", "अकाउंट बनाएं")}
        </Link>
      </p>

      {onBack && (
        <div className="mt-4 flex justify-center">
          <BackLink onClick={onBack} label={t("Back", "पीछे")} />
        </div>
      )}
    </div>
  );
}
