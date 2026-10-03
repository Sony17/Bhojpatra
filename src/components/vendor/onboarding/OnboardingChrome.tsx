"use client";

import { useState } from "react";
import { refreshSession } from "@/lib/session";
import { cn } from "@/components/ui/cn";
import { BtnBack, BtnNext, FormLabel, Sheet, inputCls } from "./ui";

/* ── Top bar: logo + "Vendor Partner Onboarding V2" + Sign In ─────────────── */
export function OnboardingAppBar({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="-mx-4 mb-3 flex items-center justify-between gap-3 border-b border-cream/60 bg-white px-4 py-2.5 sm:mx-0 sm:rounded-card sm:border sm:px-5">
      <div className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bhojpatra-logo.png" alt="Bhojpatra" className="h-7 w-auto" />
        <span className="hidden text-[11px] font-bold uppercase tracking-wide text-ink/60 sm:inline">
          Vendor Partner Onboarding V2
        </span>
      </div>
      <button
        type="button"
        onClick={onSignIn}
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-maroon px-4 text-xs font-bold text-maroon"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
        </svg>
        <span>Sign In</span>
      </button>
    </div>
  );
}

/* ── 6-phase stepper ──────────────────────────────────────────────────────── */
export const PHASES = ["Identity", "KYC", "Offerings", "Service Setup", "Review & Submit", "Go Live"] as const;

export function PhaseStepper({
  phase,
  maxReached,
  onJump,
}: {
  /** 0-based active phase */
  phase: number;
  maxReached: number;
  onJump: (idx: number) => void;
}) {
  const pct = (phase / (PHASES.length - 1)) * 100;
  return (
    <nav aria-label="Onboarding Steps" className="mb-4">
      <ol className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
        {PHASES.map((label, idx) => {
          const done = idx < phase;
          const active = idx === phase;
          const reachable = idx <= maxReached && idx < PHASES.length - 1;
          return (
            <li key={label} className="flex shrink-0 items-center gap-1">
              {idx > 0 && <span className={cn("h-px w-3 sm:w-6", done || active ? "bg-maroon" : "bg-cream")} aria-hidden />}
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onJump(idx)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex min-h-[36px] items-center gap-1.5 rounded-full px-1.5 text-xs font-semibold sm:px-2",
                  active ? "text-maroon" : done ? "text-ink" : "text-ink/40",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold",
                    active
                      ? "border-maroon bg-maroon text-cream"
                      : done
                        ? "border-maroon bg-white text-maroon"
                        : "border-cream bg-white text-ink/40",
                  )}
                >
                  {done ? "✓" : idx + 1}
                </span>
                <span className={cn(active ? "inline" : "hidden md:inline")}>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-cream/40" aria-hidden>
        <div className="h-full rounded-full bg-maroon transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </nav>
  );
}

/* ── Existing Vendor Sign In modal ────────────────────────────────────────── */
export function VendorSignInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!credential.trim() || !password) {
      setError("Please enter your registered email or mobile number and password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: credential.trim().toLowerCase(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.user) {
        setError(data.error || "Invalid email or password.");
        return;
      }
      await refreshSession();
      window.location.href = "/vendor/dashboard";
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow="Vendor Portal Access"
      title="Existing Vendor Sign In"
      footer={
        <>
          <BtnBack onClick={onClose}>Cancel</BtnBack>
          <BtnNext onClick={submit} disabled={busy}>
            {busy ? "Signing in..." : "Sign In →"}
          </BtnNext>
        </>
      }
    >
      <p className="mb-4 text-[13px] text-ink/70">
        Sign in to authenticate your existing registered vendor account. Your business identity and profile details
        will be loaded automatically.
      </p>
      <div className="space-y-4">
        <div>
          <FormLabel required htmlFor="signin-credential">
            Registered Email or Mobile Number
          </FormLabel>
          <input
            id="signin-credential"
            type="text"
            autoComplete="username"
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
            placeholder="e.g. vendor@demo-bhojpatra.com or 9800000000"
            className={inputCls}
          />
        </div>
        <div>
          <FormLabel required htmlFor="signin-password">
            Password
          </FormLabel>
          <input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Enter your password"
            className={inputCls}
          />
        </div>
        {error && <p className="text-xs font-semibold text-maroon">⚠️ {error}</p>}
        <p className="text-[11px] text-ink/50">
          🔒 Authentication only · Retrieves your existing vendor profile without collecting profile details again.
        </p>
      </div>
    </Sheet>
  );
}
