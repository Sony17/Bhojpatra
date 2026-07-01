"use client";

import { useState } from "react";
import Link from "next/link";
import {
  cities,
  indianStates,
  registrationCuisines,
  registrationCounters,
} from "@/lib/data";
import { useLang } from "@/lib/i18n";
import ThemedSelect from "@/components/ThemedSelect";

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

type DocStatus = "idle" | "uploading" | "done" | "error";

interface DocUploadState {
  fileName: string;
  status: DocStatus;
  /** Server id once the file is stored (`/api/vendors/kyc`). */
  id?: string;
  error?: string;
}

const emptyDoc = (): DocUploadState => ({ fileName: "", status: "idle" });

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
  const { t } = useLang();

  const stepLabels = [
    t("Business", "बिज़नेस"),
    t("KYC & Documents", "केवाईसी और दस्तावेज़"),
    t("Menu & Pricing", "मेन्यू और मूल्य"),
    t("Photos & Coverage", "फ़ोटो और सेवा क्षेत्र"),
    t("Review", "समीक्षा"),
  ];

  const docConfigs: { key: DocKey; label: string; hint: string }[] = [
    {
      key: "gst",
      label: t("GST Certificate", "जीएसटी प्रमाणपत्र"),
      hint: t("PDF, JPG or PNG", "पीडीएफ, जेपीजी या पीएनजी"),
    },
    {
      key: "fssai",
      label: t("FSSAI Licence", "एफएसएसएआई लाइसेंस"),
      hint: t("PDF, JPG or PNG", "पीडीएफ, जेपीजी या पीएनजी"),
    },
    {
      key: "ownerId",
      label: t("Owner ID Proof", "मालिक का पहचान प्रमाण"),
      hint: t("Aadhaar, PAN or Passport", "आधार, पैन या पासपोर्ट"),
    },
    {
      key: "businessProof",
      label: t("Business Proof", "बिज़नेस प्रमाण"),
      hint: t("Registration / Shop Act", "रजिस्ट्रेशन / शॉप एक्ट"),
    },
  ];

  const [step, setStep] = useState<number>(0);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  /** Application id returned by the server once persisted. */
  const [serverVendorId, setServerVendorId] = useState<string>("");

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
  const [docFiles, setDocFiles] = useState<Record<DocKey, DocUploadState>>({
    gst: emptyDoc(),
    fssai: emptyDoc(),
    ownerId: emptyDoc(),
    businessProof: emptyDoc(),
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

  /* Upload a KYC document the moment it's selected — the file is stored
     server-side and we keep its returned id for the application. */
  const uploadDoc = async (key: DocKey, file: File) => {
    setDocFiles((prev) => ({
      ...prev,
      [key]: { fileName: file.name, status: "uploading" },
    }));

    const body = new FormData();
    body.append("file", file);
    body.append("docKey", key);
    body.append("business", businessName);
    body.append("email", email);

    try {
      const res = await fetch("/api/vendors/kyc", { method: "POST", body });
      const data = (await res.json()) as {
        document?: { id: string };
        error?: string;
      };
      if (!res.ok) {
        setDocFiles((prev) => ({
          ...prev,
          [key]: {
            fileName: file.name,
            status: "error",
            error:
              data.error ??
              t("Upload failed. Please try again.", "अपलोड विफल। कृपया पुनः प्रयास करें।"),
          },
        }));
        return;
      }
      setDocFiles((prev) => ({
        ...prev,
        [key]: { fileName: file.name, status: "done", id: data.document?.id },
      }));
    } catch {
      setDocFiles((prev) => ({
        ...prev,
        [key]: {
          fileName: file.name,
          status: "error",
          error: t(
            "Network error. Please try again.",
            "नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।",
          ),
        },
      }));
    }
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
        return t(
          "Please fill in all required business details.",
          "कृपया सभी आवश्यक बिज़नेस विवरण भरें।",
        );
      }
      if (password !== confirmPassword) {
        return t("Passwords do not match.", "पासवर्ड मेल नहीं खाते।");
      }
      if (!city) return t("Please select your city.", "कृपया अपना शहर चुनें।");
      if (!state) return t("Please select your state.", "कृपया अपना राज्य चुनें।");
      if (cuisines.length === 0) {
        return t(
          "Select at least one cuisine speciality.",
          "कम से कम एक व्यंजन विशेषज्ञता चुनें।",
        );
      }
    }
    if (step === 1) {
      if (!gstNumber.trim() || !fssaiNumber.trim()) {
        return t(
          "Please enter your GST and FSSAI numbers.",
          "कृपया अपने जीएसटी और एफएसएसएआई नंबर दर्ज करें।",
        );
      }
      if (Object.values(docFiles).some((d) => d.status === "uploading")) {
        return t(
          "Please wait for your documents to finish uploading.",
          "कृपया अपने दस्तावेज़ अपलोड होने तक प्रतीक्षा करें।",
        );
      }
    }
    if (step === 2) {
      if (packages.length === 0) {
        return t("Add at least one menu package.", "कम से कम एक मेन्यू पैकेज जोड़ें।");
      }
      const incomplete = packages.some(
        (p) => !p.name.trim() || !p.price.trim(),
      );
      if (incomplete) {
        return t(
          "Each package needs a name and a per-plate price.",
          "हर पैकेज के लिए एक नाम और प्रति-प्लेट मूल्य आवश्यक है।",
        );
      }
      if (!minGuests.trim() || !maxGuests.trim()) {
        return t(
          "Please set your minimum and maximum guest capacity.",
          "कृपया अपनी न्यूनतम और अधिकतम मेहमान क्षमता निर्धारित करें।",
        );
      }
    }
    if (step === 3) {
      if (serviceCities.length === 0) {
        return t(
          "Select at least one serviceable city.",
          "कम से कम एक सेवा योग्य शहर चुनें।",
        );
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }

    setSubmitting(true);
    setError("");

    // Only forward documents that finished uploading; their server ids let the
    // admin pull the actual files during review.
    const docIds: Partial<Record<DocKey, string>> = {};
    (Object.keys(docFiles) as DocKey[]).forEach((key) => {
      const id = docFiles[key].id;
      if (id) docIds[key] = id;
    });

    const payload = {
      business: businessName,
      owner: ownerName,
      email,
      phone: mobile,
      city: city ? cityName(city) : "",
      state,
      cuisines,
      gstNumber,
      fssaiNumber,
      docIds,
      packages,
      minGuests,
      maxGuests,
      serviceCities: serviceCities.map(cityName),
      counters,
    };

    try {
      const res = await fetch("/api/vendors/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        setError(
          data.error ??
            t(
              "Couldn't submit your application. Please try again.",
              "आपका आवेदन सबमिट नहीं हो सका। कृपया पुनः प्रयास करें।",
            ),
        );
        return;
      }
      if (data.id) setServerVendorId(data.id);
      setSubmitted(true);
    } catch {
      setError(
        t(
          "Network error. Please try again.",
          "नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const vendorId =
    serverVendorId ||
    deriveVendorId(`${businessName}|${email}|${city}|${packages.length}`);

  /* ── success screen ────────────────────────────────────────────────── */

  if (submitted) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <div className="rounded-2xl border border-cream-3 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-maroon/10 text-3xl text-maroon">
            ✓
          </div>
          <h1 className="font-display mt-6 text-2xl text-ink sm:text-3xl">
            {t("Application submitted!", "आवेदन सबमिट हो गया!")}
          </h1>
          <p className="mt-3 text-base text-ink-soft">
            {t(
              "Your account is pending verification. We'll WhatsApp you once approved.",
              "आपका खाता वेरिफिकेशन के लिए लंबित है। स्वीकृत होने पर हम आपको व्हाट्सएप करेंगे।",
            )}
          </p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-cream-2 px-4 py-2 text-sm text-ink">
            {t("Vendor ID", "वेंडर आईडी")}
            <span className="font-display font-semibold text-maroon">
              {vendorId}
            </span>
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/vendor/dashboard"
              className="rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
            >
              {t("Go to Dashboard", "डैशबोर्ड पर जाएं")}
            </Link>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-maroon px-6 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
            >
              {t("Contact Support on WhatsApp", "व्हाट्सएप पर सहायता से संपर्क करें")}
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
        <p className="eyebrow text-sm font-medium text-gold">
          {t("Partner With Us", "हमारे साथ जुड़ें")}
        </p>
        <h1 className="font-display mt-2 text-3xl text-ink sm:text-4xl">
          {t("Vendor Registration", "वेंडर रजिस्ट्रेशन")}
        </h1>
        <p className="font-script mt-3 text-xl text-ink-soft">
          {t(
            "List your catering business and start receiving bookings.",
            "अपना कैटरिंग बिज़नेस सूचीबद्ध करें और बुकिंग प्राप्त करना शुरू करें।",
          )}
        </p>
      </header>

      {/* Free / admin-controlled note */}
      <div className="mt-6 rounded-2xl border border-cream-3 bg-surface-beige p-5 shadow-sm">
        <p className="font-display text-sm font-semibold text-ink">
          {t("Registration is free", "रजिस्ट्रेशन निःशुल्क है")}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {t(
            "There's no cost to list your business. Approval is admin-controlled — our team reviews your KYC documents before your profile goes live.",
            "अपना बिज़नेस सूचीबद्ध करने का कोई शुल्क नहीं है। स्वीकृति एडमिन द्वारा नियंत्रित है — हमारी टीम आपकी प्रोफ़ाइल लाइव होने से पहले आपके केवाईसी दस्तावेज़ों की समीक्षा करती है।",
          )}
        </p>
      </div>

      {/* Step progress */}
      <ol className="mt-8 flex flex-wrap gap-1 sm:gap-2">
        {stepLabels.map((label, i) => {
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
            <h2 className="font-display text-xl text-ink">
              {t("Business Sign-Up", "बिज़नेस साइन-अप")}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="businessName" className={labelClass}>
                  {t("Business Name", "बिज़नेस का नाम")}
                </label>
                <input
                  id="businessName"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder={t("e.g. Awadhi Royal Caterers", "उदा. अवधी रॉयल कैटरर्स")}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ownerName" className={labelClass}>
                  {t("Owner Name", "मालिक का नाम")}
                </label>
                <input
                  id="ownerName"
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder={t("Full name", "पूरा नाम")}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="mobile" className={labelClass}>
                  {t("Contact Number", "संपर्क नंबर")}
                </label>
                <input
                  id="mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder={t("10-digit mobile number", "10-अंकों का मोबाइल नंबर")}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className={labelClass}>
                  {t("Email", "ईमेल")}
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
                  {t("Password", "पासवर्ड")}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("At least 8 characters", "कम से कम 8 अक्षर")}
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
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className={labelClass}>
                  {t("Confirm Password", "पासवर्ड की पुष्टि करें")}
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("Re-enter your password", "अपना पासवर्ड फिर से दर्ज करें")}
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
              <div className="flex flex-col gap-1.5">
                <label htmlFor="city" className={labelClass}>
                  {t("City", "शहर")}
                </label>
                <ThemedSelect
                  id="city"
                  value={city}
                  onChange={setCity}
                  placeholder={t("Select a city", "एक शहर चुनें")}
                  ariaLabel={t("City", "शहर")}
                  buttonClassName={inputClass}
                  options={cities.map((c) => ({ value: c.id, label: c.name }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="state" className={labelClass}>
                  {t("State", "राज्य")}
                </label>
                <ThemedSelect
                  id="state"
                  value={state}
                  onChange={setState}
                  placeholder={t("Select a state", "एक राज्य चुनें")}
                  ariaLabel={t("State", "राज्य")}
                  buttonClassName={inputClass}
                  options={indianStates.map((s) => ({ value: s, label: s }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className={labelClass}>
                {t("Cuisine Specialities", "व्यंजन विशेषज्ञता")}
              </span>
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
            <h2 className="font-display text-xl text-ink">
              {t("KYC & Documents", "केवाईसी और दस्तावेज़")}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {docConfigs.map((doc) => {
                const state = docFiles[doc.key];
                const uploading = state.status === "uploading";
                const done = state.status === "done";
                const failed = state.status === "error";
                return (
                  <div key={doc.key} className="flex flex-col gap-1.5">
                    <span className={labelClass}>{doc.label}</span>
                    <label
                      htmlFor={`doc-${doc.key}`}
                      className={
                        "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center transition-colors hover:border-maroon hover:bg-cream/60 " +
                        (failed
                          ? "border-maroon bg-maroon/5"
                          : "border-cream-3 bg-cream/40")
                      }
                    >
                      <span aria-hidden="true" className="text-2xl text-maroon">
                        {done ? "✓" : uploading ? "…" : "⬆"}
                      </span>
                      <span className="max-w-full truncate text-sm font-medium text-ink">
                        {state.fileName || t("Click to upload", "अपलोड करने के लिए क्लिक करें")}
                      </span>
                      <span className="text-xs text-ink-soft/70">
                        {uploading
                          ? t("Uploading…", "अपलोड हो रहा है…")
                          : done
                            ? t("Uploaded ✓", "अपलोड हो गया ✓")
                            : failed
                              ? state.error
                              : doc.hint}
                      </span>
                      <input
                        id={`doc-${doc.key}`}
                        type="file"
                        accept="application/pdf,image/jpeg,image/png"
                        className="sr-only"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void uploadDoc(doc.key, file);
                        }}
                      />
                    </label>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="gstNumber" className={labelClass}>
                  {t("GST Number", "जीएसटी नंबर")}
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
                  {t("FSSAI Number", "एफएसएसएआई नंबर")}
                </label>
                <input
                  id="fssaiNumber"
                  type="text"
                  value={fssaiNumber}
                  onChange={(e) => setFssaiNumber(e.target.value)}
                  placeholder={t("14-digit licence number", "14-अंकों का लाइसेंस नंबर")}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg bg-cream/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <p className="text-sm text-ink-soft">
                {t(
                  "Your documents are reviewed by the Bhojpatra admin for verification.",
                  "वेरिफिकेशन के लिए आपके दस्तावेज़ों की समीक्षा भोजपत्र एडमिन द्वारा की जाती है।",
                )}
              </p>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cream-3 px-3 py-1 text-xs font-semibold text-ink">
                {t("Verification Status: Pending", "वेरिफिकेशन स्थिति: पेंडिंग")}
              </span>
            </div>
            <p className="text-xs text-ink-soft/70">
              {t(
                "Flow: Pending → Verified → Rejected (you'll be notified on WhatsApp at each step).",
                "प्रक्रिया: पेंडिंग → वेरिफाइड → अस्वीकृत (हर चरण पर आपको व्हाट्सएप पर सूचित किया जाएगा)।",
              )}
            </p>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <h2 className="font-display text-xl text-ink">
              {t("Menu & Pricing", "मेन्यू और मूल्य")}
            </h2>

            <div className="flex flex-col gap-4">
              {packages.map((pkg, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-cream-3 bg-cream/30 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink">
                      {t("Package", "पैकेज")} {i + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removePackage(i)}
                      aria-label={t(
                        `Remove package ${i + 1}`,
                        `पैकेज ${i + 1} हटाएं`,
                      )}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-maroon/10 hover:text-maroon"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className={labelClass}>
                        {t("Package Name", "पैकेज का नाम")}
                      </label>
                      <input
                        type="text"
                        value={pkg.name}
                        onChange={(e) =>
                          updatePackage(i, "name", e.target.value)
                        }
                        placeholder={t("e.g. Gold Non-Veg Package", "उदा. गोल्ड नॉन-वेज पैकेज")}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={labelClass}>
                        {t("Per-Plate Price (₹)", "प्रति-प्लेट मूल्य (₹)")}
                      </label>
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
                        {t("Dishes (comma separated)", "व्यंजन (अल्पविराम से अलग)")}
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
                {t("+ Add Package", "+ पैकेज जोड़ें")}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="minGuests" className={labelClass}>
                  {t("Min Guests", "न्यूनतम मेहमान")}
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
                  {t("Max Guests", "अधिकतम मेहमान")}
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
            <h2 className="font-display text-xl text-ink">
              {t("Photos & Coverage", "फ़ोटो और सेवा क्षेत्र")}
            </h2>

            <div className="flex flex-col gap-2">
              <span className={labelClass}>{t("Photo Gallery", "फ़ोटो गैलरी")}</span>
              <label
                htmlFor="gallery"
                className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-cream-3 bg-cream/40 px-4 py-8 text-center transition-colors hover:border-maroon hover:bg-cream/60"
              >
                <span aria-hidden="true" className="text-2xl text-maroon">
                  🖼
                </span>
                <span className="text-sm font-medium text-ink">
                  {galleryNames.length > 0
                    ? t(
                        `${galleryNames.length} photo${galleryNames.length === 1 ? "" : "s"} selected`,
                        `${galleryNames.length} फ़ोटो चुनी गईं`,
                      )
                    : t(
                        "Click to upload food & event photos",
                        "खाने और इवेंट की फ़ोटो अपलोड करने के लिए क्लिक करें",
                      )}
                </span>
                <span className="text-xs text-ink-soft/70">
                  {t("Multiple images, JPG or PNG", "कई छवियां, जेपीजी या पीएनजी")}
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
              <span className={labelClass}>
                {t("Serviceable Cities", "सेवा योग्य शहर")}
              </span>
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
              <span className={labelClass}>
                {t("Available Add-On Counters", "उपलब्ध ऐड-ऑन काउंटर")}
              </span>
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
            <h2 className="font-display text-xl text-ink">
              {t("Review & Submit", "समीक्षा करें और सबमिट करें")}
            </h2>

            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <ReviewItem
                label={t("Business Name", "बिज़नेस का नाम")}
                value={businessName || "—"}
              />
              <ReviewItem
                label={t("City / State", "शहर / राज्य")}
                value={`${city ? cityName(city) : "—"} · ${state || "—"}`}
              />
              <ReviewItem
                label={t("Cuisine Specialities", "व्यंजन विशेषज्ञता")}
                value={cuisines.length ? cuisines.join(", ") : "—"}
              />
              <ReviewItem
                label={t("Menu Packages", "मेन्यू पैकेज")}
                value={t(
                  `${packages.length} package${packages.length === 1 ? "" : "s"}`,
                  `${packages.length} पैकेज`,
                )}
              />
              <ReviewItem
                label={t("Serviceable Cities", "सेवा योग्य शहर")}
                value={
                  serviceCities.length
                    ? serviceCities.map(cityName).join(", ")
                    : "—"
                }
              />
              <ReviewItem
                label={t("Add-On Counters", "ऐड-ऑन काउंटर")}
                value={counters.length ? counters.join(", ") : "—"}
              />
            </dl>

            <div className="rounded-lg bg-cream/40 px-4 py-3">
              <p className="text-sm text-ink-soft">
                {t("By submitting, your application enters the admin review queue. Verification status starts as", "सबमिट करने पर, आपका आवेदन एडमिन समीक्षा कतार में आ जाता है। वेरिफिकेशन स्थिति शुरू होती है")}{" "}
                <span className="font-semibold text-ink">
                  {t("Pending", "पेंडिंग")}
                </span>
                .
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
            {t("Back", "पीछे")}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="w-full rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark sm:w-auto"
            >
              {t("Next", "आगे")}
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {submitting
                ? t("Submitting…", "सबमिट हो रहा है…")
                : t("Submit Application", "आवेदन सबमिट करें")}
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
