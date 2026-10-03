"use client";

import { Fragment } from "react";
import Link from "next/link";
import { cn } from "@/components/ui/cn";

/* ── Top bar (.wizard-header): logo + "Vendor Partner Onboarding V2" + Sign In ── */
export function OnboardingAppBar({ onSignIn }: { onSignIn: () => void }) {
  return (
    <header className="wizard-header">
      <Link href="/" className="wizard-brand" aria-label="Bhojpatra home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bhojpatra-logo.png" alt="Bhojpatra" className="bhojpatra-header-logo" />
        <div className="brand-tagline">Vendor Partner Onboarding V2</div>
      </Link>
      <div className="wizard-header-help">
        <button type="button" className="btn-vendor-signin" onClick={onSignIn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
          </svg>
          <span>Sign In</span>
        </button>
        <Link className="help-link vob-m-flex" href="/contact" aria-label="Partner Helpdesk">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.82.49 3.53 1.34 5L2 22l5.25-1.38c1.45.79 3.08 1.25 4.75 1.25 5.52 0 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
          </svg>
        </Link>
      </div>
    </header>
  );
}

/* ── 6-phase stepper (.wizard-stepper-bar) ────────────────────────────────── */
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
  const pct = Math.round((phase / (PHASES.length - 1)) * 100);
  return (
    <nav className="wizard-stepper-bar" aria-label="Onboarding Steps">
      <div className="stepper-track">
        {PHASES.map((label, idx) => {
          const done = idx < phase;
          const active = idx === phase;
          const reachable = idx <= maxReached && idx < PHASES.length - 1;
          return (
            <Fragment key={label}>
              <div
                className={cn("step-node", active && "active", done && "completed")}
                role="button"
                tabIndex={reachable ? 0 : -1}
                aria-label={label}
                aria-current={active ? "step" : undefined}
                aria-disabled={!reachable || undefined}
                onClick={() => reachable && onJump(idx)}
                onKeyDown={(e) => {
                  if (reachable && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onJump(idx);
                  }
                }}
              >
                <div className="step-bullet">
                  <span className="step-bullet-icon">{done ? "✓" : "•"}</span>
                </div>
                <span>{label}</span>
              </div>
              {idx < PHASES.length - 1 && (
                <div className={cn("stepper-line", done && "completed")}>
                  <div className="stepper-line-fill" style={{ width: done ? "100%" : "0%" }} />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
      <div className="stepper-overall-progress" aria-hidden>
        <div className="stepper-overall-fill" style={{ width: `${pct}%` }} />
      </div>
    </nav>
  );
}
