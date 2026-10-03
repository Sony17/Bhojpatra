"use client";

import { useState } from "react";
import { refreshSession, useSessionStatus } from "@/lib/session";
import VendorOnboarding from "./VendorOnboarding";
import PublicShell from "@/components/app/PublicShell";
import { Button } from "@/components/ui";

export default function RegistrationGateway() {
  const session = useSessionStatus();
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");

  // Form states for signup / login
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAuthError("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: "vendor",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.user) {
        setAuthError(data.error || "Failed to create vendor account.");
        return;
      }

      await refreshSession();
    } catch {
      setAuthError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAuthError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.user) {
        setAuthError(data.error || "Invalid email or password.");
        return;
      }

      await refreshSession();
    } catch {
      setAuthError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpgradeCustomerToVendor = async () => {
    setSubmitting(true);
    setAuthError("");

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "vendor" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Failed to upgrade account.");
        return;
      }

      await refreshSession();
    } catch {
      setAuthError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Session is still loading
  if (session === undefined) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-maroon border-t-transparent" />
        <p className="text-sm text-ink-soft">Loading registration gateway...</p>
      </div>
    );
  }

  // 2. Authenticated as a Vendor -> Render the V2 Onboarding Flow directly!
  if (session && session.type === "vendor") {
    return (
      <PublicShell footer={false} chat={false} mainClassName="vob-main">
        <VendorOnboarding />
      </PublicShell>
    );
  }

  // 3. Authenticated as a Customer
  if (session && session.type === "customer") {
    return (
      <PublicShell>
        <div className="mx-auto max-w-xl py-12 px-4 sm:px-6">
          <div className="rounded-card border border-cream-3 bg-white p-6 sm:p-8 shadow-md text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-maroon/10 text-2xl text-maroon">
              👨‍🍳
            </div>
            <h2 className="mt-4 text-xl sm:text-2xl font-bold text-ink">
              Register as a Catering Vendor
            </h2>
            <p className="mt-2 text-sm text-ink-soft leading-relaxed">
              You are signed in as <strong className="text-ink">{session.name || "Customer"}</strong> ({session.email}).
              You can register your catering business with this existing Bhojpatra account.
            </p>
  
            <div className="mt-6 rounded-control bg-cream-2/70 p-4 text-left text-xs text-ink-soft space-y-1.5">
              <p className="font-semibold text-ink">Benefits of registering:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Direct booking leads for weddings, corporate galas & private dawats</li>
                <li>Free verified listing in the Bhojpatra catering catalog</li>
                <li>Protected milestone advance payments</li>
              </ul>
            </div>
  
            {authError && (
              <p className="mt-4 text-xs text-maroon font-medium">{authError}</p>
            )}
  
            <div className="mt-6 flex flex-col gap-3">
              <Button
                type="button"
                size="lg"
                disabled={submitting}
                onClick={handleUpgradeCustomerToVendor}
                fullWidth
              >
                {submitting ? "Setting up vendor account..." : "Continue with this Account →"}
              </Button>
              <Button
                href="/api/auth/logout"
                variant="secondary"
                size="sm"
                fullWidth
              >
                Use a different email
              </Button>
            </div>
          </div>
        </div>
      </PublicShell>
    );
  }

  // 4. Signed-out visitor -> Render the Vendor Registration Gateway
  return (
    <PublicShell>
      <div className="mx-auto max-w-4xl py-8 px-4 sm:px-6 animate-in fade-in duration-200">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left Column: Value Proposition & Social Proof */}
          <div className="md:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-maroon/20 bg-maroon/5 px-3 py-1 text-xs font-semibold text-maroon">
              <span>✨</span>
              <span>Bhojpatra Vendor Partner Network</span>
            </div>
  
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink leading-tight">
              Grow your catering business with verified high-value bookings.
            </h1>
  
            <p className="text-sm text-ink-soft leading-relaxed">
              Join premier Awadhi, North Indian, and regional caterers serving weddings, corporate galas, and festive dawats across India.
            </p>
  
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream/30 text-xs font-bold text-ink">
                  ✓
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-ink">Zero Listing Fees</h4>
                  <p className="text-xs text-ink-soft">
                    Free to onboard and list. Build your digital menu, stalls, and Baina boxes.
                  </p>
                </div>
              </div>
  
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream/30 text-xs font-bold text-ink">
                  ✓
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-ink">Guaranteed Milestones</h4>
                  <p className="text-xs text-ink-soft">
                    Advance deposits secured via Razorpay escrow with timely kitchen settlements.
                  </p>
                </div>
              </div>
  
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream/30 text-xs font-bold text-ink">
                  ✓
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-ink">Diet-Split Smart Menus</h4>
                  <p className="text-xs text-ink-soft">
                    Automatic vegetarian and non-vegetarian guest headcount split calculations.
                  </p>
                </div>
              </div>
            </div>
          </div>
  
          {/* Right Column: Seamless Auth Form */}
          <div className="md:col-span-6">
            <div className="rounded-card border border-cream-3 bg-white p-6 sm:p-8 shadow-md">
              {/* Tabs */}
              <div className="flex rounded-control bg-cream-2/70 p-1 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signup");
                    setAuthError("");
                  }}
                  className={`flex-1 rounded-sm py-2 text-xs font-bold transition-all ${
                    authMode === "signup"
                      ? "bg-white text-maroon shadow-xs"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Create Vendor Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError("");
                  }}
                  className={`flex-1 rounded-sm py-2 text-xs font-bold transition-all ${
                    authMode === "login"
                      ? "bg-white text-maroon shadow-xs"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Sign In to Existing
                </button>
              </div>
  
              {authError && (
                <div className="mb-4 rounded-control bg-maroon/5 border border-maroon/30 p-3 text-xs text-maroon">
                  {authError}
                </div>
              )}
  
              {authMode === "signup" ? (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Full Name <span className="text-maroon">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Master Chef Kabir"
                      className="w-full rounded-control border border-cream-3 bg-cream/40 px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
                    />
                  </div>
  
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Mobile / WhatsApp <span className="text-maroon">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full rounded-control border border-cream-3 bg-cream/40 px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
                    />
                  </div>
  
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Email Address <span className="text-maroon">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="chef@example.com"
                      className="w-full rounded-control border border-cream-3 bg-cream/40 px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
                    />
                  </div>
  
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Set Account Password <span className="text-maroon">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full rounded-control border border-cream-3 bg-cream/40 px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
                    />
                  </div>
  
                  <div className="pt-2">
                    <Button type="submit" size="lg" fullWidth disabled={submitting}>
                      {submitting ? "Creating Account..." : "Create Account & Start Onboarding →"}
                    </Button>
                  </div>
  
                  <p className="text-[11px] text-ink-soft text-center leading-normal">
                    By registering, you agree to Bhojpatra&apos;s Vendor Terms of Service and Privacy Policy.
                  </p>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Email Address <span className="text-maroon">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your-email@example.com"
                      className="w-full rounded-control border border-cream-3 bg-cream/40 px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
                    />
                  </div>
  
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Password <span className="text-maroon">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-control border border-cream-3 bg-cream/40 px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
                    />
                  </div>
  
                  <div className="pt-2">
                    <Button type="submit" size="lg" fullWidth disabled={submitting}>
                      {submitting ? "Signing in..." : "Sign In & Continue Onboarding →"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
