"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import ThemedSelect from "@/components/ThemedSelect";
import {
  partnerBenefits,
  partnerSteps,
  partnerTypes,
  type PartnerBenefit,
  type PartnerStep,
  type PartnerType,
} from "@/lib/data";

const inputClass =
  "w-full rounded-lg border border-cream-3 bg-cream/40 px-3.5 py-2.5 text-ink placeholder:text-ink-soft/60 outline-none transition-colors focus:border-maroon focus:ring-1 focus:ring-maroon/30";

interface EnquiryForm {
  fullName: string;
  businessName: string;
  partnerType: string;
  city: string;
  speciality: string;
  mobile: string;
  email: string;
  message: string;
}

const emptyForm: EnquiryForm = {
  fullName: "",
  businessName: "",
  partnerType: "",
  city: "",
  speciality: "",
  mobile: "",
  email: "",
  message: "",
};

export default function PartnerLanding() {
  const { t } = useLang();
  const [form, setForm] = useState<EnquiryForm>(emptyForm);
  const [submitted, setSubmitted] = useState(false);

  const stats: { value: string; label: string }[] = [
    { value: "10,000+", label: t("Vendors", "वेंडर") },
    { value: "500+", label: t("Cities", "शहर") },
    { value: t("Zero", "शून्य"), label: t("Joining Fee", "जॉइनिंग फीस") },
    { value: "1 Lakh+", label: t("Customers", "ग्राहक") },
  ];

  function update<K extends keyof EnquiryForm>(key: K, value: EnquiryForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectType(title: string) {
    update("partnerType", title);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  const waParts = [
    "Hi Bhojpatra! I'd like to partner with you.",
    form.fullName && `Name: ${form.fullName}`,
    form.businessName && `Business: ${form.businessName}`,
    form.partnerType && `Partner as: ${form.partnerType}`,
  ].filter(Boolean);
  const waLink = `https://wa.me/919918359017?text=${encodeURIComponent(
    waParts.join("\n")
  )}`;

  return (
    <>
      {/* ─── 1. HERO BAND ─────────────────────────────────────────────── */}
      {/* Mirrors the home hero: a full-bleed feast photo with a slow ken-burns
          drift, a soft white wash for legibility, and ink headline + maroon
          accent — no red flood over the background. */}
      <section className="relative isolate flex min-h-[88vh] flex-col overflow-hidden bg-surface-beige text-ink">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <Image
            src="/bhoj_Hero_1.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="animate-kenburns object-cover object-center"
          />
        </div>
        {/* Readability scrim — soft on the left where the copy sits, fading to
            reveal the golden feast spread on the right (the home hero's look). */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-white/80 via-white/45 to-white/5"
        />

        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 pb-20 pt-32 sm:pt-36 lg:pb-24 lg:pt-44">
          <div className="max-w-2xl">
            <p className="eyebrow text-xs font-semibold text-maroon">
              {t("Partner With Bhojpatra", "Bhojpatra के साथ जुड़ें")}
            </p>
            <h1 className="font-display mt-4 text-[2.75rem] font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              {t(
                "Grow your catering business with India's feast platform",
                "भारत के फीस्ट प्लेटफ़ॉर्म के साथ अपना कैटरिंग व्यवसाय बढ़ाएँ"
              )}
            </h1>
            <p className="font-script mt-4 text-xl text-maroon sm:text-3xl">
              {t(
                "More feasts, more bookings, more growth.",
                "ज़्यादा फीस्ट, ज़्यादा बुकिंग, ज़्यादा ग्रोथ।"
              )}
            </p>
            <p className="mt-6 max-w-xl text-base text-ink-soft sm:text-lg">
              {t(
                "Reach lakhs of customers planning celebrations across India. Get quality leads matched to your cuisine and city — with zero upfront cost. List free, get verified, and start receiving bookings.",
                "पूरे भारत में आयोजन की योजना बना रहे लाखों ग्राहकों तक पहुँचें। अपने व्यंजन और शहर के अनुसार क्वालिटी लीड पाएँ — बिना किसी अग्रिम शुल्क के। मुफ़्त में लिस्ट करें, वेरिफ़ाई हों, और बुकिंग पाना शुरू करें।"
              )}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup?type=partner"
                className="btn-sheen rounded-full bg-maroon px-6 py-3 text-center text-sm font-semibold text-cream shadow-[0_10px_30px_-12px_rgba(185,32,37,0.6)] transition hover:-translate-y-0.5 hover:bg-maroon-dark"
              >
                {t("Become a Partner", "अभी जुड़ें")}
              </Link>
              <Link
                href="/signup?type=vendor"
                className="rounded-full border border-maroon/60 bg-white/60 px-6 py-3 text-center text-sm font-semibold text-maroon backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white"
              >
                {t("List as a Vendor", "वेंडर के रूप में लिस्ट करें")}
              </Link>
            </div>

            {/* Quick stat pills */}
            <ul className="mt-10 flex flex-wrap gap-3">
              {stats.map((s) => (
                <li
                  key={s.label}
                  className="rounded-full border border-maroon/20 bg-white/70 px-4 py-2 text-sm backdrop-blur-sm"
                >
                  <span className="font-semibold text-ink">{s.value}</span>{" "}
                  <span className="text-ink-soft">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── 2. PARTNER TYPES ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-xs font-semibold text-gold">
            {t("Who Can Partner", "कौन जुड़ सकता है")}
          </p>
          <h2 className="mt-3 text-3xl text-ink sm:text-4xl">
            {t("Choose how you want to partner", "चुनें कि आप कैसे जुड़ना चाहते हैं")}
          </h2>
          <p className="font-script mt-4 text-xl text-ink-soft">
            {t(
              "Pick the path that fits you — we'll pre-fill your enquiry below.",
              "अपने लिए सही विकल्प चुनें — हम नीचे आपकी पूछताछ पहले से भर देंगे।"
            )}
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {partnerTypes.map((type: PartnerType) => {
            const selected = form.partnerType === type.title;
            return (
              <li key={type.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectType(type.title)}
                  className={`flex h-full w-full flex-col rounded-2xl border border-cream-3 bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md sm:p-6 ${
                    selected ? "ring-2 ring-maroon" : ""
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-cream-3 bg-cream/40 text-2xl shadow-sm"
                  >
                    {type.icon}
                  </span>
                  <h3 className="font-display mt-4 text-lg font-semibold text-ink">
                    {type.title}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-maroon">
                    {type.subtitle}
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">
                    {type.description}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ─── 3. BENEFITS ──────────────────────────────────────────────── */}
      <div className="bg-surface-beige-2">
        <section className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow text-xs font-semibold text-gold">
              {t("The Bhojpatra Advantage", "Bhojpatra की खूबियाँ")}
            </p>
            <h2 className="mt-3 text-3xl text-ink sm:text-4xl">
              {t("Why partner with us", "हमारे साथ क्यों जुड़ें")}
            </h2>
            <p className="font-script mt-4 text-xl text-ink-soft">
              {t(
                "Everything you need to win more bookings and grow with confidence.",
                "ज़्यादा बुकिंग पाने और आत्मविश्वास के साथ बढ़ने के लिए सब कुछ।"
              )}
            </p>
          </div>

          <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {partnerBenefits.map((benefit: PartnerBenefit) => (
              <li
                key={benefit.title}
                className="flex flex-col rounded-2xl border border-cream-3 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md sm:p-6"
              >
                <span
                  aria-hidden="true"
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-cream-3 bg-cream/40 text-2xl shadow-sm [background-image:radial-gradient(circle_at_30%_25%,var(--color-gold-soft)_0%,transparent_70%)]"
                >
                  {benefit.icon}
                </span>
                <h3 className="font-display mt-4 text-lg font-semibold text-ink">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm text-ink-soft">
                  {benefit.description}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* ─── 4. HOW IT WORKS ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-xs font-semibold text-gold">
            {t("Simple Onboarding", "आसान ऑनबोर्डिंग")}
          </p>
          <h2 className="mt-3 text-3xl text-ink sm:text-4xl">
            {t("How it works", "यह कैसे काम करता है")}
          </h2>
          <p className="font-script mt-4 text-xl text-ink-soft">
            {t(
              "Three easy steps from sign-up to your first booking.",
              "साइन-अप से लेकर आपकी पहली बुकिंग तक तीन आसान चरण।"
            )}
          </p>
        </div>

        <ol className="relative mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Connecting line on desktop */}
          <span
            aria-hidden="true"
            className="absolute left-0 right-0 top-7 hidden h-px bg-cream-3 sm:block"
          />
          {partnerSteps.map((step: PartnerStep) => (
            <li
              key={step.n}
              className="relative flex flex-col items-center text-center"
            >
              <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-maroon text-xl font-bold text-cream shadow-sm ring-4 ring-surface-beige">
                {step.n}
              </span>
              <h3 className="font-display mt-5 text-lg font-semibold text-ink">
                {step.title}
              </h3>
              <p className="mt-2 max-w-xs text-sm text-ink-soft">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ─── 5. PARTNER ENQUIRY FORM ──────────────────────────────────── */}
      <div className="bg-surface-beige">
        <section
          id="partner-enquiry"
          className="mx-auto max-w-7xl px-5 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-3xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow text-xs font-semibold text-gold">
                {t("Get Started", "शुरू करें")}
              </p>
              <h2 className="mt-3 text-3xl text-ink sm:text-4xl">
                {t("Send a partner enquiry", "पार्टनर पूछताछ भेजें")}
              </h2>
              <p className="font-script mt-4 text-xl text-ink-soft">
                {t(
                  "Tell us about your business and our team will reach out.",
                  "हमें अपने व्यवसाय के बारे में बताएँ और हमारी टीम आपसे संपर्क करेगी।"
                )}
              </p>
            </div>

            <div className="mt-10 rounded-2xl border border-cream-3 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
              {submitted ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <span
                    aria-hidden="true"
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-maroon-soft text-3xl"
                  >
                    🎉
                  </span>
                  <h3 className="font-display mt-5 text-2xl font-semibold text-ink">
                    {t("Thank you!", "धन्यवाद!")}
                  </h3>
                  <p className="mt-3 max-w-md text-ink-soft">
                    {t(
                      "Our onboarding team will WhatsApp you within 24 hours.",
                      "हमारी ऑनबोर्डिंग टीम 24 घंटों के भीतर आपको WhatsApp करेगी।"
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setForm(emptyForm);
                    }}
                    className="mt-6 rounded-full border border-maroon px-6 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
                  >
                    {t("Submit another enquiry", "एक और पूछताछ भेजें")}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="fullName"
                        className="text-sm text-ink-soft"
                      >
                        {t("Full Name", "पूरा नाम")}
                      </label>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        required
                        autoComplete="name"
                        placeholder={t("Enter your full name", "अपना पूरा नाम दर्ज करें")}
                        value={form.fullName}
                        onChange={(e) => update("fullName", e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="businessName"
                        className="text-sm text-ink-soft"
                      >
                        {t("Business Name", "व्यवसाय का नाम")}
                      </label>
                      <input
                        id="businessName"
                        name="businessName"
                        type="text"
                        placeholder={t("Your business / brand", "आपका व्यवसाय / ब्रांड")}
                        value={form.businessName}
                        onChange={(e) =>
                          update("businessName", e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="partnerType"
                        className="text-sm text-ink-soft"
                      >
                        {t("I want to partner as", "मैं जुड़ना चाहता/चाहती हूँ")}
                      </label>
                      <ThemedSelect
                        id="partnerType"
                        name="partnerType"
                        required
                        value={form.partnerType}
                        onChange={(v) => update("partnerType", v)}
                        placeholder={t(
                          "Select partner type",
                          "पार्टनर प्रकार चुनें",
                        )}
                        ariaLabel={t(
                          "I want to partner as",
                          "मैं जुड़ना चाहता/चाहती हूँ",
                        )}
                        buttonClassName={inputClass}
                        options={partnerTypes.map((type) => ({
                          value: type.title,
                          label: type.title,
                        }))}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="city" className="text-sm text-ink-soft">
                        {t("City", "शहर")}
                      </label>
                      <input
                        id="city"
                        name="city"
                        type="text"
                        required
                        autoComplete="address-level2"
                        placeholder={t("Your city", "आपका शहर")}
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="speciality"
                        className="text-sm text-ink-soft"
                      >
                        {t("Cuisine / Speciality", "व्यंजन / विशेषता")}
                      </label>
                      <input
                        id="speciality"
                        name="speciality"
                        type="text"
                        placeholder={t("e.g. Mughlai, Live Counters", "जैसे मुगलई, लाइव काउंटर")}
                        value={form.speciality}
                        onChange={(e) =>
                          update("speciality", e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="mobile"
                        className="text-sm text-ink-soft"
                      >
                        {t("Mobile", "मोबाइल नंबर")}
                      </label>
                      <input
                        id="mobile"
                        name="mobile"
                        type="tel"
                        required
                        autoComplete="tel"
                        placeholder={t("10-digit mobile number", "10 अंकों का मोबाइल नंबर")}
                        value={form.mobile}
                        onChange={(e) => update("mobile", e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <label
                        htmlFor="email"
                        className="text-sm text-ink-soft"
                      >
                        {t("Email", "ईमेल")}
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <label
                        htmlFor="message"
                        className="text-sm text-ink-soft"
                      >
                        {t("Message", "संदेश")}
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={3}
                        placeholder={t(
                          "Tell us a little about your business",
                          "हमें अपने व्यवसाय के बारे में थोड़ा बताएँ"
                        )}
                        value={form.message}
                        onChange={(e) => update("message", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-ink-soft">
                    {t(
                      "Your enquiry is sent to our team + WhatsApp for quick onboarding.",
                      "त्वरित ऑनबोर्डिंग के लिए आपकी पूछताछ हमारी टीम + WhatsApp पर भेजी जाती है।"
                    )}
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      className="rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
                    >
                      {t("Submit Enquiry", "पूछताछ भेजें")}
                    </button>
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-maroon px-6 py-3 text-center text-sm font-semibold text-maroon transition hover:bg-maroon/5"
                    >
                      {t("Enquire on WhatsApp", "WhatsApp पर पूछताछ करें")}
                    </a>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ─── 6. CLOSING CTA BAND ──────────────────────────────────────── */}
      <section className="bg-maroon text-cream">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-5 py-16 text-center sm:py-20">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            {t("Start with zero upfront cost", "बिना किसी अग्रिम शुल्क के शुरू करें")}
          </h2>
          <p className="font-script max-w-xl text-2xl text-gold-soft">
            {t(
              "List free today and let the bookings come to you.",
              "आज ही मुफ़्त में लिस्ट करें और बुकिंग आपके पास आने दें।"
            )}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup?type=partner"
              className="rounded-full bg-cream px-6 py-3 text-center text-sm font-semibold text-maroon shadow-sm transition hover:bg-cream-2"
            >
              {t("Become a Partner", "अभी जुड़ें")}
            </Link>
            <Link
              href="/signup?type=vendor"
              className="rounded-full border border-cream px-6 py-3 text-center text-sm font-semibold text-cream transition hover:bg-cream/10"
            >
              {t("List as a Vendor", "वेंडर के रूप में लिस्ट करें")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
