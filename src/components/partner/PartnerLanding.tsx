"use client";

import { useState } from "react";
import Link from "next/link";
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

const stats: { value: string; label: string }[] = [
  { value: "10,000+", label: "Vendors" },
  { value: "500+", label: "Cities" },
  { value: "Zero", label: "Joining Fee" },
  { value: "1 Lakh+", label: "Customers" },
];

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
  const [form, setForm] = useState<EnquiryForm>(emptyForm);
  const [submitted, setSubmitted] = useState(false);

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
      <section className="bg-maroon text-cream">
        <div className="mx-auto max-w-7xl px-5 pb-20 pt-28 sm:pb-24 sm:pt-32">
          <div className="max-w-2xl">
            <p className="eyebrow text-xs font-semibold text-gold-soft">
              Partner With Bhojpatra
            </p>
            <h1 className="font-display mt-4 text-3xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Grow your catering business with India&apos;s feast platform
            </h1>
            <p className="font-script mt-4 text-xl text-gold-soft sm:text-3xl">
              More feasts, more bookings, more growth.
            </p>
            <p className="mt-6 max-w-xl text-base text-cream/85 sm:text-lg">
              Reach lakhs of customers planning celebrations across India. Get
              quality leads matched to your cuisine and city — with zero upfront
              cost. List free, get verified, and start receiving bookings.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#partner-enquiry"
                className="rounded-full bg-cream px-6 py-3 text-center text-sm font-semibold text-maroon shadow-sm transition hover:bg-cream-2"
              >
                Become a Partner
              </a>
              <Link
                href="/vendor/register"
                className="rounded-full border border-cream px-6 py-3 text-center text-sm font-semibold text-cream transition hover:bg-cream/10"
              >
                List as a Vendor
              </Link>
            </div>

            {/* Quick stat pills */}
            <ul className="mt-10 flex flex-wrap gap-3">
              {stats.map((s) => (
                <li
                  key={s.label}
                  className="rounded-full border border-cream/25 bg-cream/10 px-4 py-2 text-sm backdrop-blur-sm"
                >
                  <span className="font-semibold text-cream">{s.value}</span>{" "}
                  <span className="text-cream/75">{s.label}</span>
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
            Who Can Partner
          </p>
          <h2 className="mt-3 text-3xl text-ink sm:text-4xl">
            Choose how you want to partner
          </h2>
          <p className="font-script mt-4 text-xl text-ink-soft">
            Pick the path that fits you — we&apos;ll pre-fill your enquiry below.
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
              The Bhojpatra Advantage
            </p>
            <h2 className="mt-3 text-3xl text-ink sm:text-4xl">
              Why partner with us
            </h2>
            <p className="font-script mt-4 text-xl text-ink-soft">
              Everything you need to win more bookings and grow with confidence.
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
            Simple Onboarding
          </p>
          <h2 className="mt-3 text-3xl text-ink sm:text-4xl">How it works</h2>
          <p className="font-script mt-4 text-xl text-ink-soft">
            Three easy steps from sign-up to your first booking.
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
                Get Started
              </p>
              <h2 className="mt-3 text-3xl text-ink sm:text-4xl">
                Send a partner enquiry
              </h2>
              <p className="font-script mt-4 text-xl text-ink-soft">
                Tell us about your business and our team will reach out.
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
                    Thank you!
                  </h3>
                  <p className="mt-3 max-w-md text-ink-soft">
                    Our onboarding team will WhatsApp you within 24 hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setForm(emptyForm);
                    }}
                    className="mt-6 rounded-full border border-maroon px-6 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
                  >
                    Submit another enquiry
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
                        Full Name
                      </label>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        required
                        autoComplete="name"
                        placeholder="Enter your full name"
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
                        Business Name
                      </label>
                      <input
                        id="businessName"
                        name="businessName"
                        type="text"
                        placeholder="Your business / brand"
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
                        I want to partner as
                      </label>
                      <select
                        id="partnerType"
                        name="partnerType"
                        required
                        value={form.partnerType}
                        onChange={(e) =>
                          update("partnerType", e.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="" disabled>
                          Select partner type
                        </option>
                        {partnerTypes.map((type) => (
                          <option key={type.id} value={type.title}>
                            {type.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="city" className="text-sm text-ink-soft">
                        City
                      </label>
                      <input
                        id="city"
                        name="city"
                        type="text"
                        required
                        autoComplete="address-level2"
                        placeholder="Your city"
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
                        Cuisine / Speciality
                      </label>
                      <input
                        id="speciality"
                        name="speciality"
                        type="text"
                        placeholder="e.g. Mughlai, Live Counters"
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
                        Mobile
                      </label>
                      <input
                        id="mobile"
                        name="mobile"
                        type="tel"
                        required
                        autoComplete="tel"
                        placeholder="10-digit mobile number"
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
                        Email
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
                        Message
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={3}
                        placeholder="Tell us a little about your business"
                        value={form.message}
                        onChange={(e) => update("message", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-ink-soft">
                    Your enquiry is sent to our team + WhatsApp for quick
                    onboarding.
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      className="rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
                    >
                      Submit Enquiry
                    </button>
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-maroon px-6 py-3 text-center text-sm font-semibold text-maroon transition hover:bg-maroon/5"
                    >
                      Enquire on WhatsApp
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
            Start with zero upfront cost
          </h2>
          <p className="font-script max-w-xl text-2xl text-gold-soft">
            List free today and let the bookings come to you.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="#partner-enquiry"
              className="rounded-full bg-cream px-6 py-3 text-center text-sm font-semibold text-maroon shadow-sm transition hover:bg-cream-2"
            >
              Become a Partner
            </a>
            <Link
              href="/vendor/register"
              className="rounded-full border border-cream px-6 py-3 text-center text-sm font-semibold text-cream transition hover:bg-cream/10"
            >
              List as a Vendor
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
