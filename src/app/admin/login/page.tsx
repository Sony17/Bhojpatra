"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAdminSession,
  setAdminSession,
  verifyAdmin,
} from "@/lib/adminAuth";

const inputClass =
  "w-full rounded-lg border border-cream-3 bg-cream/40 px-3.5 py-2.5 text-ink placeholder:text-ink-soft/60 outline-none transition-colors focus:border-maroon focus:ring-1 focus:ring-maroon/30";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in → skip straight to the dashboard.
  useEffect(() => {
    if (getAdminSession()) router.replace("/admin/dashboard");
  }, [router]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const session = verifyAdmin(email, password);
    if (!session) {
      setError("Invalid email or password.");
      return;
    }
    setAdminSession(session);
    router.replace("/admin/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-beige px-4 py-12 text-ink">
      <div className="w-full max-w-sm rounded-2xl border border-cream-3 bg-white p-7 shadow-sm sm:p-8">
        <header className="mb-7 text-center">
          <span className="font-display text-2xl text-maroon">bhojpatra</span>
          <h1 className="mt-3 text-xl font-semibold text-ink">Admin Login</h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            Sign in to access the control panel.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm text-ink-soft">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm text-ink-soft">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Enter your password"
                className={`${inputClass} pr-16`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-sm font-medium text-maroon hover:text-maroon-dark"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-maroon/30 bg-maroon/5 px-3 py-2 text-sm text-maroon">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-1 w-full rounded-lg bg-maroon px-5 py-3 text-base font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark"
          >
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}
