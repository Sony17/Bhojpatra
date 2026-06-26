"use client";

import { useState } from "react";
import Link from "next/link";
import {
  cities,
  indianStates,
  registrationCuisines,
  registrationCounters,
} from "@/lib/data";

const WHATSAPP = "https://wa.me/919918359017";

const inputClass =
  "w-full rounded-lg border border-cream-3 bg-cream/40 px-3.5 py-2.5 text-ink placeholder:text-ink-soft/60 outline-none transition-colors focus:border-maroon focus:ring-1 focus:ring-maroon/30";

const labelClass = "text-sm text-ink-soft";

/* ── Types ───────────────────────────────────────────────────────────── */

interface MenuPackage {
  name: string;
  dishes: string;
  price: string;
}

type DocKey = "gst" | "fssai" | "ownerId" | "businessProof";

interface DocConfig {
  key: DocKey;
  label: string;
  hint: string;
}

const DOCS: DocConfig[] = [
  { key: "gst", label: "GST Certificate", hint: "PDF, JPG or PNG" },
  { key: "fssai", label: "FSSAI Licence", hint: "PDF, JPG or PNG" },
  { key: "ownerId", label: "Owner ID Proof", hint: "Aadhaar, PAN or Passport" },
  { key: "businessProof", label: "Business Proof", hint: "Registration / Shop Act" },
];

const STEPS = [
  "Business",
  "KYC & Documents",
  "Menu & Pricing",
  "Photos & Coverage",
  "Review",
] as const;

/* ── Eye icon (mirrors AuthForm) ─────────────────────────────────────── */

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

/* ── Chip ────────────────────────────────────────────────────────────── */

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "rounded-full px-4 py-2 text-sm transition-colors " +
        (active
          ? "bg-maroon text-cream"
          : "bg-cream-2 text-ink-soft hover:bg-cream-3")
      }
    >
      {label}
    </button>
  );
}

/* ── Deterministic vendor id (no Math.random / Date.now) ─────────────── */

function deriveVendorId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1000000;
  }
  return `VND-${String(hash).padStart(6, "0")}`;
}

export default function VendorRegister() {
  const [step, setStep] = useState<number>(0);
  const [submitted, setSubmitted] = useState<boolean>(false);

  // Step 1 — business
  const [businessName, setBusinessName] = useState<string>("");
  const [ownerName, setOwnerName] = useState<string>("");
  const [mobile, setMobile] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [city, setCity] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [cuisines, setCuisines] = useState<string[]>([]);

  // Step 2 — KYC
  const [gstNumber, setGstNumber] = useState<string>("");
  const [fssaiNumber, setFssaiNumber] = useState<string>("");
  const [docFiles, setDocFiles] = useState<Record<DocKey, string>>({
    gst: "",
    fssai: "",
    ownerId: "",
    businessProof: "",
  });

  // Step 3 — menu & pricing
  const [packages, setPackages] = useState<MenuPackage[]>([
    {
      name: "Silver Veg Package",
      dishes: "Paneer Tikka, Dal Makhani, Veg Biryani, Gulab Jamun",
      price: "799",
    },
  ]);
  const [minGuests, setMinGuests] = useState<string>("");
  const [maxGuests, setMaxGuests] = useState<string>("");

  // Step 4 — photos & coverage
  const [galleryNames, setGalleryNames] = useState<string[]>([]);
  const [serviceCities, setServiceCities] = useState<string[]>([]);
  const [counters, setCounters] = useState<string[]>([]);

  const [error, setError] = useState<string>("");

  /* ── helpers ───────────────────────────────────────────────────────── */

  const toggle = (
    value: string,
    list: string[],
    setList: (next: string[]) => void,
  ) => {
    setList(
      list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value],
    );
  };

  const updatePackage = (
    index: number,
    field: keyof MenuPackage,
    value: string,
  ) => {
    setPackages((prev) =>
      prev.map((pkg, i) => (i === index ? { ...pkg, [field]: value } : pkg)),
    );
  };

  const addPackage = () => {
    setPackages((prev) => [...prev, { name: "", dishes: "", price: "" }]);
  };

  const removePackage = (index: number) => {
    setPackages((prev) => prev.filter((_, i) => i !== index));
  };

  const cityName = (id: string) =>
    cities.find((c) => c.id === id)?.name ?? id;

  /* ── validation per step ───────────────────────────────────────────── */

  const validateStep = (): string => {
    if (step === 0) {
      if (
        !businessName.trim() ||
        !ownerName.trim() ||
        !mobile.trim() ||
        !email.trim() ||
        !password ||
        !confirmPassword
      ) {
        return "Please fill in all required business details.";
      }
      if (password !== confirmPassword) {
        return "Passwords do not match.";
      }
      if (!city) return "Please select your city.";
      if (!state) return "Please select your state.";
      if (cuisines.length === 0) {
        return "Select at least one cuisine speciality.";
      }
    }
    if (step === 1) {
      if (!gstNumber.trim() || !fssaiNumber.trim()) {
        return "Please enter your GST and FSSAI numbers.";
      }
    }
    if (step === 2) {
      if (packages.length === 0) {
        return "Add at least one menu package.";
      }
      const incomplete = packages.some(
        (p) => !p.name.trim() || !p.price.trim(),
      );
      if (incomplete) {
        return "Each package needs a name and a per-plate price.";
      }
      if (!minGuests.trim() || !maxGuests.trim()) {
        return "Please set your minimum and maximum guest capacity.";
      }
    }
    if (step === 3) {
      if (serviceCities.length === 0) {
        return "Select at least one serviceable city.";
      }
    }
    return "";
  };

  const next = () => {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const vendorId = deriveVendorId(
    `${businessName}|${email}|${city}|${packages.length}`,
  );

  /* ── success screen ────────────────────────────────────────────────── */

  if (submitted) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <div className="rounded-2xl border border-cream-3 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-maroon/10 text-3xl text-maroon">
            ✓
          </div>
          <h1 className="font-display mt-6 text-2xl text-ink sm:text-3xl">
            Application submitted!
          </h1>
          <p className="mt-3 text-base text-ink-soft">
            Your account is pending verification. We&apos;ll WhatsApp you once
            approved.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-cream-2 px-4 py-2 text-sm text-ink">
            Vendor ID
            <span className="font-display font-semibold text-maroon">
              {vendorId}
            </span>
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/vendor/dashboard"
              className="rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
            >
              Go to Dashboard
            </Link>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-maroon px-6 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
            >
              Contact Support on WhatsApp
            </a>
          </div>
        </div>
      </section>
    );
  }

  /* ── wizard ────────────────────────────────────────────────────────── */

  return (
    <section className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <header className="max-w-2xl">
        <p className="eyebrow text-sm font-medium text-gold">Partner With Us</p>
        <h1 className="font-display mt-2 text-3xl text-ink sm:text-4xl">
          Vendor Registration
        </h1>
        <p className="font-script mt-3 text-xl text-ink-soft">
          List your catering business and start receiving bookings.
        </p>
      </header>

      {/* Free / admin-controlled note */}
      <div className="mt-6 rounded-2xl border border-cream-3 bg-surface-beige p-5 shadow-sm">
        <p className="font-display text-sm font-semibold text-ink">
          Registration is free
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          There&apos;s no cost to list your business. Approval is
          admin-controlled — our team reviews your KYC documents before your
          profile goes live.
        </p>
      </div>

      {/* Step progress */}
      <ol className="mt-8 flex flex-wrap gap-1 sm:gap-2">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors " +
                  (current
                    ? "bg-maroon text-cream"
                    : done
                      ? "bg-maroon/15 text-maroon"
                      : "bg-cream-2 text-ink-soft")
                }
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={
                  "text-xs sm:text-sm " +
                  (current
                    ? "font-semibold text-ink"
                    : "text-ink-soft")
                }
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <span aria-hidden="true" className="text-cream-3">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-2xl border border-cream-3 bg-white p-4 shadow-sm sm:p-6 lg:p-8"
      >
        {/* ── STEP 1 ── */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl text-ink">Business Sign-Up</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="businessName" className={labelClass}>
                  Business Name
                </label>
                <input
                  id="businessName"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Awadhi Royal Caterers"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ownerName" className={labelClass}>
                  Owner Name
                </label>
                <input
                  id="ownerName"
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Full name"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="mobile" className={labelClass}>
                  Contact Mobile
                </label>
                <input
                  id="mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10-digit mobile number"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="business@example.com"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className={labelClass}>
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-soft transition-colors hover:text-maroon"
                  >
                    <EyeIcon off={showPassword} />
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className={labelClass}>
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-soft transition-colors hover:text-maroon"
                  >
                    <EyeIcon off={showConfirm} />
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="city" className={labelClass}>
                  City
                </label>
                <select
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a city</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="state" className={labelClass}>
                  State
                </label>
                <select
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a state</option>
                  {indianStates.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className={labelClass}>Cuisine Specialities</span>
              <div className="flex flex-wrap gap-2">
                {registrationCuisines.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    active={cuisines.includes(c)}
                    onClick={() => toggle(c, cuisines, setCuisines)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <h2 className="font-display text-xl text-ink">KYC &amp; Documents</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {DOCS.map((doc) => (
                <div key={doc.key} className="flex flex-col gap-1.5">
                  <span className={labelClass}>{doc.label}</span>
                  <label
                    htmlFor={`doc-${doc.key}`}
                    className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-cream-3 bg-cream/40 px-4 py-6 text-center transition-colors hover:border-maroon hover:bg-cream/60"
                  >
                    <span aria-hidden="true" className="text-2xl text-maroon">
                      ⬆
                    </span>
                    <span className="text-sm font-medium text-ink">
                      {docFiles[doc.key] || "Click to upload"}
                    </span>
                    <span className="text-xs text-ink-soft/70">{doc.hint}</span>
                    <input
                      id={`doc-${doc.key}`}
                      type="file"
                      className="sr-only"
                      onChange={(e) =>
                        setDocFiles((prev) => ({
                          ...prev,
                          [doc.key]: e.target.files?.[0]?.name ?? "",
                        }))
                      }
                    />
                  </label>
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="gstNumber" className={labelClass}>
                  GST Number
                </label>
                <input
                  id="gstNumber"
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="22AAAAA0000A1Z5"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="fssaiNumber" className={labelClass}>
                  FSSAI Number
                </label>
                <input
                  id="fssaiNumber"
                  type="text"
                  value={fssaiNumber}
                  onChange={(e) => setFssaiNumber(e.target.value)}
                  placeholder="14-digit licence number"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg bg-cream/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <p className="text-sm text-ink-soft">
                Your documents are reviewed by the Bhojpatra admin for
                verification.
              </p>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cream-3 px-3 py-1 text-xs font-semibold text-ink">
                Verification Status: Pending
              </span>
            </div>
            <p className="text-xs text-ink-soft/70">
              Flow: Pending → Verified → Rejected (you&apos;ll be notified on
              WhatsApp at each step).
            </p>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <h2 className="font-display text-xl text-ink">Menu &amp; Pricing</h2>

            <div className="flex flex-col gap-4">
              {packages.map((pkg, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-cream-3 bg-cream/30 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink">
                      Package {i + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removePackage(i)}
                      aria-label={`Remove package ${i + 1}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-maroon/10 hover:text-maroon"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className={labelClass}>Package Name</label>
                      <input
                        type="text"
                        value={pkg.name}
                        onChange={(e) =>
                          updatePackage(i, "name", e.target.value)
                        }
                        placeholder="e.g. Gold Non-Veg Package"
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={labelClass}>Per-Plate Price (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={pkg.price}
                        onChange={(e) =>
                          updatePackage(i, "price", e.target.value)
                        }
                        placeholder="799"
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <label className={labelClass}>
                        Dishes (comma separated)
                      </label>
                      <input
                        type="text"
                        value={pkg.dishes}
                        onChange={(e) =>
                          updatePackage(i, "dishes", e.target.value)
                        }
                        placeholder="Paneer Tikka, Dal Makhani, Biryani, Gulab Jamun"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addPackage}
                className="self-start rounded-full border border-maroon px-6 py-2.5 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
              >
                + Add Package
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="minGuests" className={labelClass}>
                  Min Guests
                </label>
                <input
                  id="minGuests"
                  type="number"
                  min={0}
                  value={minGuests}
                  onChange={(e) => setMinGuests(e.target.value)}
                  placeholder="50"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="maxGuests" className={labelClass}>
                  Max Guests
                </label>
                <input
                  id="maxGuests"
                  type="number"
                  min={0}
                  value={maxGuests}
                  onChange={(e) => setMaxGuests(e.target.value)}
                  placeholder="2000"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4 ── */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <h2 className="font-display text-xl text-ink">Photos &amp; Coverage</h2>

            <div className="flex flex-col gap-2">
              <span className={labelClass}>Photo Gallery</span>
              <label
                htmlFor="gallery"
                className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-cream-3 bg-cream/40 px-4 py-8 text-center transition-colors hover:border-maroon hover:bg-cream/60"
              >
                <span aria-hidden="true" className="text-2xl text-maroon">
                  🖼
                </span>
                <span className="text-sm font-medium text-ink">
                  {galleryNames.length > 0
                    ? `${galleryNames.length} photo${galleryNames.length === 1 ? "" : "s"} selected`
                    : "Click to upload food & event photos"}
                </span>
                <span className="text-xs text-ink-soft/70">
                  Multiple images, JPG or PNG
                </span>
                <input
                  id="gallery"
                  type="file"
                  multiple
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) =>
                    setGalleryNames(
                      e.target.files
                        ? Array.from(e.target.files).map((f) => f.name)
                        : [],
                    )
                  }
                />
              </label>
              {galleryNames.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-2">
                  {galleryNames.map((name, i) => (
                    <span
                      key={`${name}-${i}`}
                      className="inline-flex max-w-full items-center gap-2 truncate rounded-lg bg-cream-2 px-3 py-1.5 text-xs text-ink sm:max-w-[14rem]"
                    >
                      <span
                        aria-hidden="true"
                        className="h-6 w-6 shrink-0 rounded bg-cream-3"
                      />
                      <span className="truncate">{name}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span className={labelClass}>Serviceable Cities</span>
              <div className="flex flex-wrap gap-2">
                {cities.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    active={serviceCities.includes(c.id)}
                    onClick={() =>
                      toggle(c.id, serviceCities, setServiceCities)
                    }
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className={labelClass}>Available Add-On Counters</span>
              <div className="flex flex-wrap gap-2">
                {registrationCounters.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    active={counters.includes(c)}
                    onClick={() => toggle(c, counters, setCounters)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5 ── */}
        {step === 4 && (
          <div className="flex flex-col gap-5">
            <h2 className="font-display text-xl text-ink">Review &amp; Submit</h2>

            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <ReviewItem label="Business Name" value={businessName || "—"} />
              <ReviewItem
                label="City / State"
                value={`${city ? cityName(city) : "—"} · ${state || "—"}`}
              />
              <ReviewItem
                label="Cuisine Specialities"
                value={cuisines.length ? cuisines.join(", ") : "—"}
              />
              <ReviewItem
                label="Menu Packages"
                value={`${packages.length} package${packages.length === 1 ? "" : "s"}`}
              />
              <ReviewItem
                label="Serviceable Cities"
                value={
                  serviceCities.length
                    ? serviceCities.map(cityName).join(", ")
                    : "—"
                }
              />
              <ReviewItem
                label="Add-On Counters"
                value={counters.length ? counters.join(", ") : "—"}
              />
            </dl>

            <div className="rounded-lg bg-cream/40 px-4 py-3">
              <p className="text-sm text-ink-soft">
                By submitting, your application enters the admin review queue.
                Verification status starts as{" "}
                <span className="font-semibold text-ink">Pending</span>.
              </p>
            </div>
          </div>
        )}

        {/* error */}
        {error && (
          <p className="mt-5 rounded-lg bg-maroon/10 px-4 py-2.5 text-sm font-medium text-maroon">
            {error}
          </p>
        )}

        {/* nav */}
        <div className="mt-8 flex flex-col gap-2 border-t border-cream-3 pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="w-full rounded-full border border-maroon px-6 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/5 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="w-full rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark sm:w-auto"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              className="w-full rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark sm:w-auto"
            >
              Submit Application
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}
