"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import Reveal from "@/components/Reveal";
import { Button, Card, Input, Textarea, Select } from "@/components/ui";
import {
  partnerBenefits,
  partnerFaqs,
  partnerSteps,
  partnerTypes,
  partnerVoices,
  type PartnerBenefit,
  type PartnerFaq,
  type PartnerStep,
  type PartnerType,
  type PartnerVoice,
} from "@/lib/data";

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

/** Shared section heading — quiet eyebrow, display title, single lede line.
 *  One consistent rhythm keeps the page minimal instead of six variations. */
function SectionHead({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="eyebrow text-[0.7rem] font-semibold text-maroon">{eyebrow}</p>
      <h2 className="font-display mt-3 text-[1.75rem] leading-tight text-ink sm:text-4xl">
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-sm text-ink-soft sm:text-base">
        {lede}
      </p>
    </div>
  );
}

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

  /** Each partner-type card goes straight to registration — caterers sign up
   *  as vendors, everyone else as a partner with their role pre-selected. */
  function signupHref(id: string) {
    return id === "vendor"
      ? "/signup?type=vendor"
      : `/signup?type=partner&role=${id}`;
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
      {/* ─── 1. HERO ──────────────────────────────────────────────────── */}
      {/* Full-bleed feast photo with a slow ken-burns drift and a soft white
          wash for legibility — ink headline + maroon accent, no red flood. */}
      <section className="relative isolate flex min-h-[86vh] flex-col overflow-hidden bg-surface-beige text-ink">
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
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-white/85 via-white/50 to-white/5"
        />

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 pb-20 pt-32 sm:pt-36 lg:pb-24 lg:pt-44">
          <div className="max-w-2xl">
            <p className="eyebrow text-[0.7rem] font-semibold text-maroon">
              {t("Partner With Bhojpatra", "Bhojpatra के साथ जुड़ें")}
            </p>
            <h1 className="font-display mt-5 text-[1.3rem] font-bold leading-[1.04] tracking-tight text-ink sm:text-3xl lg:text-4xl">
              {t(
                "Grow your business with India's feast platform",
                "भारत के फीस्ट प्लेटफ़ॉर्म के साथ अपना व्यवसाय बढ़ाएँ"
              )}
            </h1>
            <p className="mt-5 max-w-lg text-base text-ink-soft sm:text-lg">
              {t(
                "Reach lakhs of customers planning celebrations across India — quality leads matched to your cuisine and city, with zero upfront cost.",
                "पूरे भारत में आयोजन की योजना बना रहे लाखों ग्राहकों तक पहुँचें — अपने व्यंजन और शहर के अनुसार क्वालिटी लीड, बिना किसी अग्रिम शुल्क के।"
              )}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                href="/signup?type=partner"
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
              >
                {t("Become a Partner", "अभी जुड़ें")}
              </Button>
              <Button
                href="/signup?type=vendor"
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                {t("List as a Vendor", "वेंडर के रूप में लिस्ट करें")}
              </Button>
            </div>

            {/* Trust line — rating only, so the numbers below feel earned. */}
            <p className="mt-7 text-xs text-ink-soft sm:text-sm">
              <span aria-hidden="true" className="text-maroon">
                ★★★★★
              </span>{" "}
              {t(
                "Rated 4.9 by partners across India",
                "पूरे भारत के पार्टनर से 4.9 रेटिंग"
              )}
            </p>

            {/* Stat strip — quiet, premium numbers instead of pill clutter. */}
            <dl className="mt-12 flex flex-nowrap items-end gap-x-8 gap-y-4 overflow-x-auto no-scrollbar sm:flex-wrap sm:gap-x-10">
              {stats.map((s) => (
                <div key={s.label} className="shrink-0">
                  <dt className="font-display text-2xl font-bold leading-none text-ink sm:text-3xl">
                    {s.value}
                  </dt>
                  <dd className="mt-1.5 text-xs uppercase tracking-wide text-ink-soft">
                    {s.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ─── 2. PARTNER TYPES ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <Reveal>
          <SectionHead
            eyebrow={t("Who Can Partner", "कौन जुड़ सकता है")}
            title={t("Choose how you want to partner", "चुनें कि आप कैसे जुड़ना चाहते हैं")}
            lede={t(
              "Pick the path that fits you — we'll take you straight to registration.",
              "अपने लिए सही विकल्प चुनें — हम आपको सीधे रजिस्ट्रेशन पर ले जाएँगे।"
            )}
          />
        </Reveal>

        <Reveal
          as="ul"
          stagger
          className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {partnerTypes.map((type: PartnerType) => (
            <li key={type.id}>
              <Link
                href={signupHref(type.id)}
                className="flex h-full w-full flex-col rounded-hero border border-maroon/10 bg-white p-5 text-left transition duration-200 hover:-translate-y-1 hover:border-maroon/25 hover:shadow-pop sm:p-6"
              >
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-maroon/10 bg-cream/40 text-xl"
                >
                  {type.icon}
                </span>
                <h3 className="font-display mt-5 text-base font-semibold text-ink">
                  {type.title}
                </h3>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-maroon">
                  {type.subtitle}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {type.description}
                </p>
              </Link>
            </li>
          ))}
        </Reveal>
      </section>

      {/* ─── 3. BENEFITS ──────────────────────────────────────────────── */}
      <div className="border-y border-maroon/10 bg-surface-beige-2">
        <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <Reveal>
            <SectionHead
              eyebrow={t("The Bhojpatra Advantage", "Bhojpatra की खूबियाँ")}
              title={t("Why partner with us", "हमारे साथ क्यों जुड़ें")}
              lede={t(
                "Everything you need to win more bookings and grow with confidence.",
                "ज़्यादा बुकिंग पाने और आत्मविश्वास के साथ बढ़ने के लिए सब कुछ।"
              )}
            />
          </Reveal>

          <Reveal
            as="ul"
            stagger
            className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {partnerBenefits.map((benefit: PartnerBenefit) => (
              <li
                key={benefit.title}
                className="group flex flex-col rounded-hero border border-maroon/10 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:shadow-pop"
              >
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-maroon/10 bg-cream/40 text-xl"
                >
                  {benefit.icon}
                </span>
                <h3 className="font-display mt-5 text-base font-semibold text-ink">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {benefit.description}
                </p>
              </li>
            ))}
          </Reveal>
        </section>
      </div>

      {/* ─── 3.5 INSTANT PAYOUTS ──────────────────────────────────────── */}
      {/* The payout promise, made concrete: the pitch on the left, a preview of
          the partner payout dashboard on the right so the benefit is tangible. */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Pitch */}
          <Reveal variant="left">
            <p className="eyebrow text-[0.7rem] font-semibold text-maroon">
              {t("Instant Payouts", "तुरंत भुगतान")}
            </p>
            <h2 className="font-display mt-3 text-[1.75rem] leading-tight text-ink sm:text-4xl">
              {t(
                "Pass your client bookings, get paid instantly",
                "अपनी क्लाइंट बुकिंग भेजें, तुरंत भुगतान पाएं"
              )}
            </h2>
            <p className="mt-4 max-w-md text-sm text-ink-soft sm:text-base">
              {t(
                "Pass your client bookings to Bhojpatra and get instant payout partner benefits. Track every rupee — total earnings, active payouts and what's due — from one simple dashboard.",
                "अपनी क्लाइंट बुकिंग Bhojpatra को भेजें और तुरंत भुगतान पार्टनर लाभ पाएं। एक ही डैशबोर्ड से हर रुपया ट्रैक करें — कुल कमाई, सक्रिय भुगतान और बकाया।"
              )}
            </p>

            <ul className="mt-6 space-y-3">
              {[
                t(
                  "Total earnings, active payouts, due amount & due date at a glance",
                  "एक नज़र में कुल कमाई, सक्रिय भुगतान, बकाया राशि और भुगतान तिथि"
                ),
                t(
                  "Confirmed bookings turn payable the moment your event completes",
                  "इवेंट पूरा होते ही पुष्ट बुकिंग भुगतान-योग्य हो जाती है"
                ),
                t(
                  "The same instant-payout dashboard for Event Planners and Venue Partners",
                  "इवेंट प्लानर और वेन्यू पार्टनर दोनों के लिए एक जैसा तुरंत-भुगतान डैशबोर्ड"
                ),
              ].map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-3 text-sm text-ink-soft"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-maroon text-[0.7rem] font-bold text-cream"
                  >
                    ✓
                  </span>
                  {line}
                </li>
              ))}
            </ul>

            <Button
              href="/signup?type=partner"
              variant="primary"
              size="lg"
              className="mt-8 w-full sm:w-auto"
            >
              {t("Become a Partner", "अभी जुड़ें")}
            </Button>
          </Reveal>

          {/* Payout dashboard preview */}
          <Reveal variant="right">
            <div className="rounded-hero border border-maroon/15 bg-white p-5 shadow-pop sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-ink-soft">
                    {t("Partner Dashboard", "पार्टनर डैशबोर्ड")}
                  </p>
                  <p className="font-display text-base font-semibold text-ink">
                    {t("Payouts", "भुगतान")}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-maroon px-3 py-1 text-xs font-semibold text-cream">
                  <span aria-hidden="true">📋</span>{" "}
                  {t("Event Planner", "इवेंट प्लानर")}
                </span>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3">
                {[
                  {
                    label: t("Total earning", "कुल कमाई"),
                    value: "₹2,45,000",
                    accent: false,
                  },
                  {
                    label: t("Active payout", "सक्रिय भुगतान"),
                    value: "₹48,000",
                    accent: false,
                  },
                  {
                    label: t("Due amount", "बकाया राशि"),
                    value: "₹32,500",
                    accent: true,
                  },
                  {
                    label: t("Due date", "भुगतान तिथि"),
                    value: "24 Jul 2026",
                    accent: false,
                  },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="rounded-control border border-maroon/15 bg-white p-3.5"
                  >
                    <dt className="text-xs text-ink-soft">{m.label}</dt>
                    <dd
                      className={`font-display mt-1 text-xl font-bold sm:text-2xl ${
                        m.accent ? "text-maroon" : "text-ink"
                      }`}
                    >
                      {m.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5 flex items-center justify-between rounded-control bg-cream/50 px-4 py-3">
                <span className="text-xs text-ink-soft">
                  {t("Next payout", "अगला भुगतान")}
                </span>
                <span className="font-display text-sm font-semibold text-maroon">
                  {t("in 2 days", "2 दिन में")}
                </span>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-ink-soft">
              {t(
                "Venue Partners get the same instant-payout view.",
                "वेन्यू पार्टनर को भी यही तुरंत-भुगतान व्यू मिलता है।"
              )}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─── 4. HOW IT WORKS ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-5 py-20 sm:py-28">
        <Reveal>
          <SectionHead
            eyebrow={t("Simple Onboarding", "आसान ऑनबोर्डिंग")}
            title={t("How it works", "यह कैसे काम करता है")}
            lede={t(
              "Three easy steps from sign-up to your first booking.",
              "साइन-अप से लेकर आपकी पहली बुकिंग तक तीन आसान चरण।"
            )}
          />
        </Reveal>

        <Reveal variant="up">
          <ol className="relative mt-14 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
            {/* Connecting hairline on desktop */}
            <span
              aria-hidden="true"
              className="absolute left-0 right-0 top-6 hidden h-px bg-maroon/15 sm:block"
            />
            {partnerSteps.map((step: PartnerStep) => (
              <li
                key={step.n}
                className="relative flex flex-col items-center text-center"
              >
                <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-maroon text-lg font-bold text-cream ring-8 ring-surface-beige">
                  {step.n}
                </span>
                <h3 className="font-display mt-6 text-lg font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      {/* ─── 4.5 PARTNER VOICES ───────────────────────────────────────── */}
      {/* Social proof from the partner side — one voice per partner path so
          every visitor sees someone like themselves already winning here. */}
      <div className="home-band-cream border-t border-maroon/10">
        <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <Reveal>
            <SectionHead
              eyebrow={t("Partner Voices", "पार्टनर की ज़ुबानी")}
              title={t("Partners already growing with us", "पार्टनर जो हमारे साथ बढ़ रहे हैं")}
              lede={t(
                "Caterers, planners and venue owners on what changed after they joined.",
                "कैटरर, प्लानर और वेन्यू मालिक — जुड़ने के बाद क्या बदला, उन्हीं की ज़ुबानी।"
              )}
            />
          </Reveal>

          <Reveal
            as="ul"
            stagger
            className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {partnerVoices.map((voice: PartnerVoice) => (
              <li
                key={voice.id}
                className="flex h-full flex-col rounded-hero border border-maroon/10 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:shadow-pop"
              >
                <div className="flex items-center justify-between">
                  <span
                    aria-label={t("5 out of 5 stars", "5 में से 5 स्टार")}
                    className="text-sm text-maroon"
                  >
                    ★★★★★
                  </span>
                  <span
                    aria-hidden="true"
                    className="font-display text-3xl leading-none text-cream"
                  >
                    &ldquo;
                  </span>
                </div>
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
                  {t(voice.quote, voice.quoteHi)}
                </blockquote>
                <p className="mt-4">
                  <span className="inline-flex rounded-full bg-cream/50 px-3 py-1 text-xs font-semibold text-maroon">
                    {t(voice.metric, voice.metricHi)}
                  </span>
                </p>
                <footer className="mt-4 flex items-center gap-3 border-t border-maroon/10 pt-4">
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-maroon/15">
                    <Image
                      src={voice.avatar}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {voice.name}
                    </span>
                    <span className="block truncate text-xs text-ink-soft">
                      {t(voice.business, voice.businessHi)}
                    </span>
                  </span>
                </footer>
              </li>
            ))}
          </Reveal>
        </section>
      </div>

      {/* ─── 4.75 FAQ ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-5 py-20 sm:py-28">
        <Reveal>
          <SectionHead
            eyebrow={t("Good To Know", "जानने योग्य बातें")}
            title={t("Frequently asked questions", "अक्सर पूछे जाने वाले सवाल")}
            lede={t(
              "The details partners ask us about most, answered upfront.",
              "जो सवाल पार्टनर हमसे सबसे ज़्यादा पूछते हैं, उनके जवाब पहले से।"
            )}
          />
        </Reveal>

        <Reveal as="ul" stagger className="mt-12 flex flex-col gap-3">
          {partnerFaqs.map((faq: PartnerFaq) => (
            <li key={faq.q}>
              <details className="group rounded-hero border border-maroon/10 bg-white transition hover:border-maroon/25 open:border-maroon/25 open:shadow-pop">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden sm:p-6 sm:text-base">
                  {t(faq.q, faq.qHi)}
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-maroon/15 text-maroon transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-ink-soft sm:px-6 sm:pb-6">
                  {t(faq.a, faq.aHi)}
                </p>
              </details>
            </li>
          ))}
        </Reveal>
      </section>

      {/* ─── 5. PARTNER ENQUIRY FORM ──────────────────────────────────── */}
      <div className="border-t border-maroon/10 bg-surface-beige-2">
        <section
          id="partner-enquiry"
          className="mx-auto max-w-3xl px-5 py-20 sm:py-28"
        >
          <Reveal>
            <SectionHead
              eyebrow={t("Get Started", "शुरू करें")}
              title={t("Send a partner enquiry", "पार्टनर पूछताछ भेजें")}
              lede={t(
                "Tell us about your business and our team will reach out.",
                "हमें अपने व्यवसाय के बारे में बताएँ और हमारी टीम आपसे संपर्क करेगी।"
              )}
            />
          </Reveal>

          <Card padding="none" className="mt-12 p-5 sm:p-8">
            {submitted ? (
              <div className="flex flex-col items-center py-10 text-center">
                <span
                  aria-hidden="true"
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-cream/50 text-3xl"
                >
                  🎉
                </span>
                <h3 className="font-display mt-5 text-2xl font-semibold text-ink">
                  {t("Thank you!", "धन्यवाद!")}
                </h3>
                <p className="mt-3 max-w-md text-sm text-ink-soft sm:text-base">
                  {t(
                    "Our onboarding team will WhatsApp you within 24 hours.",
                    "हमारी ऑनबोर्डिंग टीम 24 घंटों के भीतर आपको WhatsApp करेगी।"
                  )}
                </p>
                <Button
                  variant="secondary"
                  className="mt-6"
                  onClick={() => {
                    setSubmitted(false);
                    setForm(emptyForm);
                  }}
                >
                  {t("Submit another enquiry", "एक और पूछताछ भेजें")}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="fullName" className="text-sm text-ink-soft">
                      {t("Full Name", "पूरा नाम")}
                    </label>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder={t("Enter your full name", "अपना पूरा नाम दर्ज करें")}
                      value={form.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="businessName"
                      className="text-sm text-ink-soft"
                    >
                      {t("Business Name", "व्यवसाय का नाम")}
                    </label>
                    <Input
                      id="businessName"
                      name="businessName"
                      type="text"
                      placeholder={t("Your business / brand", "आपका व्यवसाय / ब्रांड")}
                      value={form.businessName}
                      onChange={(e) => update("businessName", e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="partnerType"
                      className="text-sm text-ink-soft"
                    >
                      {t("I want to partner as", "मैं जुड़ना चाहता/चाहती हूँ")}
                    </label>
                    <Select
                      id="partnerType"
                      name="partnerType"
                      required
                      value={form.partnerType}
                      onChange={(v) => update("partnerType", v)}
                      placeholder={t("Select partner type", "पार्टनर प्रकार चुनें")}
                      ariaLabel={t(
                        "I want to partner as",
                        "मैं जुड़ना चाहता/चाहती हूँ"
                      )}
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
                    <Input
                      id="city"
                      name="city"
                      type="text"
                      required
                      autoComplete="address-level2"
                      placeholder={t("Your city", "आपका शहर")}
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="speciality"
                      className="text-sm text-ink-soft"
                    >
                      {t("Cuisine / Speciality", "व्यंजन / विशेषता")}
                    </label>
                    <Input
                      id="speciality"
                      name="speciality"
                      type="text"
                      placeholder={t("e.g. Mughlai, Live Counters", "जैसे मुगलई, लाइव काउंटर")}
                      value={form.speciality}
                      onChange={(e) => update("speciality", e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="mobile" className="text-sm text-ink-soft">
                      {t("Mobile", "मोबाइल नंबर")}
                    </label>
                    <Input
                      id="mobile"
                      name="mobile"
                      type="tel"
                      required
                      autoComplete="tel"
                      placeholder={t("10-digit mobile number", "10 अंकों का मोबाइल नंबर")}
                      value={form.mobile}
                      onChange={(e) => update("mobile", e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label htmlFor="email" className="text-sm text-ink-soft">
                      {t("Email", "ईमेल")}
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label htmlFor="message" className="text-sm text-ink-soft">
                      {t("Message", "संदेश")}
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      rows={3}
                      placeholder={t(
                        "Tell us a little about your business",
                        "हमें अपने व्यवसाय के बारे में थोड़ा बताएँ"
                      )}
                      value={form.message}
                      onChange={(e) => update("message", e.target.value)}
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
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full sm:w-auto"
                  >
                    {t("Submit Enquiry", "पूछताछ भेजें")}
                  </Button>
                  <Button
                    variant="secondary"
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto"
                  >
                    {t("Enquire on WhatsApp", "WhatsApp पर पूछताछ करें")}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </section>
      </div>

      {/* ─── 6. CLOSING CTA BAND ──────────────────────────────────────── */}
      <section className="home-band-maroon relative overflow-hidden text-cream">
        {/* Brand pot watermark — quiet depth on the closing band. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 top-1/2 hidden -translate-y-1/2 opacity-[0.08] select-none sm:block"
        >
          <Image
            src="/watermark-pot.png"
            alt=""
            width={280}
            height={355}
          />
        </div>

        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-5 px-5 py-20 text-center sm:py-24">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            {t("Start with zero upfront cost", "बिना किसी अग्रिम शुल्क के शुरू करें")}
          </h2>
          <p className="max-w-xl text-base text-cream/90 sm:text-lg">
            {t(
              "List free today and let the bookings come to you.",
              "आज ही मुफ़्त में लिस्ट करें और बुकिंग आपके पास आने दें।"
            )}
          </p>
          <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              href="/signup?type=partner"
              variant="inverse"
              size="lg"
              className="w-full sm:w-auto"
            >
              {t("Become a Partner", "अभी जुड़ें")}
            </Button>
            <Link
              href="/signup?type=vendor"
              className="focus-ring inline-flex min-h-12 w-full items-center justify-center rounded-control border border-cream px-7 text-sm font-semibold text-cream transition hover:bg-cream/10 sm:w-auto"
            >
              {t("List as a Vendor", "वेंडर के रूप में लिस्ट करें")}
            </Link>
          </div>

          <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-cream/80 sm:text-sm">
            {[
              t("No joining fee", "कोई जॉइनिंग फीस नहीं"),
              t("KYC verified in 24–48 hrs", "24–48 घंटे में KYC वेरिफिकेशन"),
              t("Instant payouts", "तुरंत भुगतान"),
            ].map((line) => (
              <li key={line} className="flex items-center gap-1.5">
                <span aria-hidden="true">✓</span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
