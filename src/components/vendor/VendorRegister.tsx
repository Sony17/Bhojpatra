"use client";

import { useState } from "react";
import {
  cities,
  indianStates,
  registrationCuisines,
  registrationCounters,
} from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { isValidGst } from "@/lib/validate";
import ThemedSelect from "@/components/ThemedSelect";
import { Badge, Button, Card, Chip as UIChip } from "@/components/ui";

const WHATSAPP = "https://wa.me/919918359017";

const inputClass =
  "w-full rounded-control border border-cream-3 bg-cream/40 px-3.5 py-2.5 text-ink placeholder:text-ink-soft/60 outline-none transition-colors focus:border-maroon focus:ring-1 focus:ring-maroon/30";

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
    <UIChip
      selected={active}
      onClick={onClick}
      className="shrink-0 whitespace-nowrap"
    >
      {label}
    </UIChip>
  );
}

/* ── Free-text adder for chip groups (extra cities / counters) ───────── */

function CustomAdder({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (value: string) => void;
}) {
  const { t } = useLang();
  const [draft, setDraft] = useState<string>("");

  const submit = () => {
    const value = draft.trim();
    if (!value) return;
    onAdd(value);
    setDraft("");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className={inputClass + " max-w-xs"}
      />
      <Button
        type="button"
        variant="secondary"
        onClick={submit}
        disabled={!draft.trim()}
      >
        + {t("Add", "जोड़ें")}
      </Button>
    </div>
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
  // The caterer reaches this wizard already signed in (it's step 2 of the
  // vendor sign-up), so identity comes from their account — no re-entered
  // credentials. Email is bound to the account (it links the application to
  // their login); the owner name is prefilled but editable.
  const session = useSession();

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
  // Owner name defaults to the account holder but stays editable — `ownerTouched`
  // switches from the session default to the vendor's own edit.
  const [ownerName, setOwnerName] = useState<string>("");
  const [ownerTouched, setOwnerTouched] = useState<boolean>(false);
  const [mobile, setMobile] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [cuisines, setCuisines] = useState<string[]>([]);

  // Identity comes from the signed-in account (the wizard is step 2 of sign-up):
  // email is read-only and bound to the login; owner name is prefilled from it.
  const email = session?.email ?? "";
  const ownerNameValue = ownerTouched ? ownerName : (session?.name ?? "");
  // Optional Google reputation the caterer imports so their card doesn't read
  // "New" before their first Bhojpatra review — shown as a "Google" badge.
  const [googleRating, setGoogleRating] = useState<string>("");
  const [googleReviews, setGoogleReviews] = useState<string>("");

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
  const [maxEventsPerDay, setMaxEventsPerDay] = useState<string>("");

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

  // Add a serviceable city the vendor typed in. If it matches a preset city we
  // reuse that city's id (so the chip lights up instead of duplicating); an
  // unlisted city is stored by its literal name (cityName() falls back to it).
  const addCustomCity = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    const match = cities.find(
      (c) => c.name.toLowerCase() === name.toLowerCase(),
    );
    const value = match ? match.id : name;
    setServiceCities((prev) => (prev.includes(value) ? prev : [...prev, value]));
  };

  // Add an add-on counter the vendor typed in — counters are stored by label,
  // so a custom one is just a label not present in the preset list.
  const addCustomCounter = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    const match = registrationCounters.find(
      (c) => c.toLowerCase() === name.toLowerCase(),
    );
    const value = match ?? name;
    setCounters((prev) => (prev.includes(value) ? prev : [...prev, value]));
  };

  // Vendor-typed entries not covered by the preset chip lists — rendered as
  // their own removable chips beneath the presets.
  const customServiceCities = serviceCities.filter(
    (v) => !cities.some((c) => c.id === v),
  );
  const customCounters = counters.filter(
    (c) => !registrationCounters.includes(c),
  );

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
        !ownerNameValue.trim() ||
        !mobile.trim() ||
        !email.trim()
      ) {
        return t(
          "Please fill in all required business details.",
          "कृपया सभी आवश्यक बिज़नेस विवरण भरें।",
        );
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
      if (!gstNumber.trim()) {
        return t(
          "Please enter your GST number.",
          "कृपया अपना जीएसटी नंबर दर्ज करें।",
        );
      }
      if (!isValidGst(gstNumber)) {
        return t(
          "Please enter a valid 15-digit GST number.",
          "कृपया एक मान्य 15-अंकीय जीएसटी नंबर दर्ज करें।",
        );
      }
      if (!fssaiNumber.trim()) {
        return t(
          "Please enter your FSSAI number.",
          "कृपया अपना एफएसएसएआई नंबर दर्ज करें।",
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
      if (!minGuests.trim() || !maxGuests.trim() || !maxEventsPerDay.trim()) {
        return t(
          "Please set your guest capacity and max events per day.",
          "कृपया अपनी मेहमान क्षमता और प्रति-दिन अधिकतम इवेंट निर्धारित करें।",
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
      owner: ownerNameValue,
      email,
      phone: mobile,
      city: city ? cityName(city) : "",
      state,
      cuisines,
      gstNumber,
      fssaiNumber,
      googleRating,
      googleReviews,
      docIds,
      packages,
      minGuests,
      maxGuests,
      maxEventsPerDay,
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
        <Card padding="none" className="p-8 text-center sm:p-12">
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
            <Button href="/vendor/dashboard" variant="primary" size="lg">
              {t("Go to Dashboard", "डैशबोर्ड पर जाएं")}
            </Button>
            <Button
              href={WHATSAPP}
              target="_blank"
              rel="noreferrer"
              variant="secondary"
              size="lg"
            >
              {t("Contact Support on WhatsApp", "व्हाट्सएप पर सहायता से संपर्क करें")}
            </Button>
          </div>
        </Card>
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
      <div className="mt-6 rounded-card border border-cream-3 bg-surface-beige p-5 shadow-card">
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
      <ol className="-mx-5 mt-8 flex flex-nowrap gap-1 overflow-x-auto px-5 no-scrollbar sm:gap-2 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        {stepLabels.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label} className="flex shrink-0 items-center gap-2 whitespace-nowrap">
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
        className="mt-8 rounded-card border border-cream-3 bg-white p-4 shadow-card sm:p-6 lg:p-8"
      >
        {/* ── STEP 1 ── */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-xl text-ink">
                {t("Business Details", "बिज़नेस विवरण")}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                {t(
                  "Signed in to your Bhojpatra account — no need to set a password again. Just add your business details below.",
                  "आपके भोजपत्र खाते में साइन इन — पासवर्ड फिर से सेट करने की ज़रूरत नहीं। बस नीचे अपने बिज़नेस विवरण जोड़ें।",
                )}
              </p>
            </div>

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
                  value={ownerNameValue}
                  onChange={(e) => {
                    setOwnerTouched(true);
                    setOwnerName(e.target.value);
                  }}
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
                  {t("Account Email", "खाता ईमेल")}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  aria-describedby="email-note"
                  placeholder="business@example.com"
                  className={`${inputClass} cursor-not-allowed bg-cream-2/60 text-ink-soft`}
                />
                <span id="email-note" className="text-xs text-ink-soft/70">
                  {t(
                    "Your application is linked to this signed-in account.",
                    "आपका आवेदन इसी साइन-इन खाते से जुड़ा है।",
                  )}
                </span>
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
              <div className="-mx-4 flex flex-nowrap items-center gap-2 overflow-x-auto px-4 no-scrollbar sm:-mx-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
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

            {/* Optional Google reputation — surfaced as a "Google" badge on the
                caterer's card so a new listing isn't a blank "New". */}
            <div className="flex flex-col gap-2 rounded-card border border-cream-3 bg-cream/30 p-4">
              <span className={labelClass}>
                {t("Google Reviews (optional)", "गूगल रिव्यू (वैकल्पिक)")}
              </span>
              <p className="text-xs text-ink-soft/80">
                {t(
                  "Already rated on Google? Add it and we'll show a Google badge on your card while your Bhojpatra reviews build up.",
                  "गूगल पर पहले से रेटिंग है? इसे जोड़ें और जब तक आपके भोजपत्र रिव्यू बनते हैं, हम आपके कार्ड पर गूगल बैज दिखाएंगे।",
                )}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="googleRating" className={labelClass}>
                    {t("Google Rating (0–5)", "गूगल रेटिंग (0–5)")}
                  </label>
                  <input
                    id="googleRating"
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    inputMode="decimal"
                    value={googleRating}
                    onChange={(e) => setGoogleRating(e.target.value)}
                    placeholder="4.6"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="googleReviews" className={labelClass}>
                    {t("Number of Google Reviews", "गूगल रिव्यू की संख्या")}
                  </label>
                  <input
                    id="googleReviews"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={googleReviews}
                    onChange={(e) => setGoogleReviews(e.target.value)}
                    placeholder="230"
                    className={inputClass}
                  />
                </div>
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
                        "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-control border border-dashed px-4 py-6 text-center transition-colors hover:border-maroon hover:bg-cream/60 " +
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
                  {t("GST Number", "जीएसटी नंबर")} *
                </label>
                <input
                  id="gstNumber"
                  type="text"
                  required
                  autoCapitalize="characters"
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

            <div className="flex flex-col gap-2 rounded-card bg-cream/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <p className="text-sm text-ink-soft">
                {t(
                  "Your documents are reviewed by the Bhojpatra admin for verification.",
                  "वेरिफिकेशन के लिए आपके दस्तावेज़ों की समीक्षा भोजपत्र एडमिन द्वारा की जाती है।",
                )}
              </p>
              <Badge tone="soft" className="shrink-0">
                {t("Verification Status: Pending", "वेरिफिकेशन स्थिति: पेंडिंग")}
              </Badge>
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
                  className="rounded-card border border-cream-3 bg-cream/30 p-4"
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

              <Button
                type="button"
                variant="secondary"
                onClick={addPackage}
                className="self-start"
              >
                {t("+ Add Package", "+ पैकेज जोड़ें")}
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <span className={labelClass}>
                {t("Capacity", "क्षमता")}
              </span>
              <div className="grid gap-4 sm:grid-cols-3">
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
                    {t("Max Guests / Event", "अधिकतम मेहमान / इवेंट")}
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
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="maxEventsPerDay" className={labelClass}>
                    {t("Max Events / Day", "अधिकतम इवेंट / दिन")}
                  </label>
                  <input
                    id="maxEventsPerDay"
                    type="number"
                    min={0}
                    value={maxEventsPerDay}
                    onChange={(e) => setMaxEventsPerDay(e.target.value)}
                    placeholder="3"
                    className={inputClass}
                  />
                </div>
              </div>
              <p className="text-xs text-ink-soft/70">
                {t(
                  "How many guests you can serve at one event, and how many events you can cater in a single day.",
                  "आप एक इवेंट में कितने मेहमानों को सेवा दे सकते हैं, और एक ही दिन में कितने इवेंट संभाल सकते हैं।",
                )}
              </p>
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
                className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-control border border-dashed border-cream-3 bg-cream/40 px-4 py-8 text-center transition-colors hover:border-maroon hover:bg-cream/60"
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
              <div className="-mx-4 flex flex-nowrap items-center gap-2 overflow-x-auto px-4 no-scrollbar sm:-mx-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
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
                {customServiceCities.map((name) => (
                  <Chip
                    key={name}
                    label={name}
                    active
                    onClick={() =>
                      toggle(name, serviceCities, setServiceCities)
                    }
                  />
                ))}
              </div>
              <CustomAdder
                placeholder={t(
                  "Add another city…",
                  "एक और शहर जोड़ें…",
                )}
                onAdd={addCustomCity}
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className={labelClass}>
                {t("Available Add-On Counters", "उपलब्ध ऐड-ऑन काउंटर")}
              </span>
              <div className="-mx-4 flex flex-nowrap items-center gap-2 overflow-x-auto px-4 no-scrollbar sm:-mx-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
                {registrationCounters.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    active={counters.includes(c)}
                    onClick={() => toggle(c, counters, setCounters)}
                  />
                ))}
                {customCounters.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    active
                    onClick={() => toggle(c, counters, setCounters)}
                  />
                ))}
              </div>
              <CustomAdder
                placeholder={t(
                  "Add another counter…",
                  "एक और काउंटर जोड़ें…",
                )}
                onAdd={addCustomCounter}
              />
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
                label={t("Capacity", "क्षमता")}
                value={
                  minGuests || maxGuests || maxEventsPerDay
                    ? t(
                        `${minGuests || "—"}–${maxGuests || "—"} guests · ${maxEventsPerDay || "—"} events/day`,
                        `${minGuests || "—"}–${maxGuests || "—"} मेहमान · ${maxEventsPerDay || "—"} इवेंट/दिन`,
                      )
                    : "—"
                }
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
              <ReviewItem
                label={t("Google Reviews", "गूगल रिव्यू")}
                value={
                  googleRating.trim()
                    ? t(
                        `${googleRating}★ · ${googleReviews.trim() || "0"} reviews`,
                        `${googleRating}★ · ${googleReviews.trim() || "0"} रिव्यू`,
                      )
                    : "—"
                }
              />
            </dl>

            <div className="rounded-card bg-cream/40 px-4 py-3">
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
          <p className="mt-5 rounded-control bg-maroon/10 px-4 py-2.5 text-sm font-medium text-maroon">
            {error}
          </p>
        )}

        {/* nav */}
        <div className="mt-8 flex flex-col gap-2 border-t border-cream-3 pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            onClick={back}
            disabled={step === 0}
            className="sm:w-auto"
          >
            {t("Back", "पीछे")}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              onClick={next}
              className="sm:w-auto"
            >
              {t("Next", "आगे")}
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={submitting}
              className="sm:w-auto"
            >
              {submitting
                ? t("Submitting…", "सबमिट हो रहा है…")
                : t("Submit Application", "आवेदन सबमिट करें")}
            </Button>
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
