"use client";

import { useState } from "react";
import { useSiteContent } from "@/lib/sitePages";
import { useLang } from "@/lib/i18n";
import ThemedSelect from "@/components/ThemedSelect";

const inputClass =
  "w-full rounded-lg border border-cream-3 bg-cream/40 px-3.5 py-2.5 text-ink placeholder:text-ink-soft/60 outline-none transition-colors focus:border-maroon focus:ring-1 focus:ring-maroon/30";

const WHATSAPP_MESSAGE =
  "Hi Bhojpatra! I'd like to enquire about booking catering for my event.";

const SUBJECTS: { value: string; en: string; hi: string }[] = [
  { value: "Wedding", en: "Wedding", hi: "शादी" },
  { value: "Engagement", en: "Engagement", hi: "सगाई" },
  { value: "Birthday Party", en: "Birthday Party", hi: "बर्थडे पार्टी" },
  { value: "Corporate Event", en: "Corporate Event", hi: "कॉर्पोरेट इवेंट" },
  { value: "Reception", en: "Reception", hi: "रिसेप्शन" },
  { value: "Other Occasion", en: "Other Occasion", hi: "अन्य अवसर" },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [subject, setSubject] = useState("");
  const { contact } = useSiteContent();
  const { t } = useLang();

  const PHONE_DISPLAY = contact.phoneDisplay;
  const WHATSAPP_NUMBER = contact.whatsapp;
  const EMAIL = contact.email;
  const ADDRESS = contact.address;
  const HOURS = contact.hours;
  const INSTAGRAM = contact.instagram;
  const DOMAIN = contact.website;

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    WHATSAPP_MESSAGE,
  )}`;
  const directionsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    ADDRESS,
  )}`;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: wire up to your enquiry backend / CRM.
    setSubmitted(true);
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:py-16">
      <div className="max-w-2xl">
        <p className="eyebrow text-sm font-medium text-gold">
          {contact.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl text-ink sm:text-4xl">{contact.title}</h1>
        <p className="font-script mt-3 text-xl text-ink-soft">
          {contact.intro}
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        {/* LEFT — enquiry form */}
        <div className="rounded-2xl border border-cream-3 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-xl font-semibold text-ink">
            {t("Send us an enquiry", "हमें पूछताछ भेजें")}
          </h2>

          {submitted && (
            <div className="mt-4 rounded-lg border border-maroon/30 bg-maroon/5 px-4 py-3 text-sm font-medium text-maroon">
              {t(
                "Thanks! We'll reach out shortly.",
                "धन्यवाद! हम जल्द ही आपसे संपर्क करेंगे।",
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm text-ink-soft">
                {t("Name", "नाम")}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder={t("Your full name", "आपका पूरा नाम")}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm text-ink-soft">
                {t("Email", "ईमेल")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="mobile" className="text-sm text-ink-soft">
                {t("Mobile", "मोबाइल")}
              </label>
              <input
                id="mobile"
                name="mobile"
                type="tel"
                required
                autoComplete="tel"
                placeholder={t("10-digit mobile number", "10 अंकों का मोबाइल नंबर")}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="subject" className="text-sm text-ink-soft">
                {t("Subject / Occasion", "विषय / अवसर")}
              </label>
              <ThemedSelect
                id="subject"
                name="subject"
                required
                value={subject}
                onChange={setSubject}
                placeholder={t("Select an occasion", "अवसर चुनें")}
                ariaLabel={t("Subject / Occasion", "विषय / अवसर")}
                buttonClassName={inputClass}
                options={SUBJECTS.map((s) => ({
                  value: s.value,
                  label: t(s.en, s.hi),
                }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="message" className="text-sm text-ink-soft">
                {t("Message", "संदेश")}
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={4}
                placeholder={t(
                  "Tell us about your event — date, guest count & city.",
                  "अपने इवेंट के बारे में बताएं — तारीख, मेहमानों की संख्या और शहर।",
                )}
                className={`${inputClass} resize-y`}
              />
            </div>

            <button
              type="submit"
              className="mt-1 w-full rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
            >
              {t("Send Enquiry", "पूछताछ भेजें")}
            </button>
          </form>

          <div className="mt-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-cream-3" />
            <span className="text-xs uppercase tracking-wide text-ink-soft">
              {t("or", "या")}
            </span>
            <span className="h-px flex-1 bg-cream-3" />
          </div>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-maroon px-6 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
          >
            <span aria-hidden="true">💬</span>
            {t("Chat on WhatsApp", "WhatsApp पर चैट करें")}
          </a>
        </div>

        {/* RIGHT — business details */}
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl bg-maroon p-6 text-cream shadow-sm sm:p-8">
            <p className="eyebrow text-sm font-medium text-cream/80">
              Bhojpatra
            </p>
            <h2 className="font-display mt-1 text-2xl font-semibold">
              {t(
                "India's Feast Booking Platform",
                "भारत का फीस्ट बुकिंग प्लेटफॉर्म",
              )}
            </h2>

            <ul className="mt-6 flex flex-col gap-5 text-sm">
              <DetailRow icon="📞" label={t("Phone / WhatsApp", "फोन / WhatsApp")}>
                <a href={`tel:+${WHATSAPP_NUMBER}`} className="hover:underline">
                  {PHONE_DISPLAY}
                </a>
              </DetailRow>
              <DetailRow icon="✉️" label={t("Email", "ईमेल")}>
                <a href={`mailto:${EMAIL}`} className="hover:underline">
                  {EMAIL}
                </a>
              </DetailRow>
              <DetailRow icon="📍" label={t("Address", "पता")}>
                {ADDRESS}
              </DetailRow>
              <DetailRow icon="🕒" label={t("Hours", "समय")}>
                {HOURS}
              </DetailRow>
              <DetailRow icon="📷" label={t("Instagram", "इंस्टाग्राम")}>
                <a
                  href={`https://instagram.com/${INSTAGRAM.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {INSTAGRAM}
                </a>
              </DetailRow>
              <DetailRow icon="🌐" label={t("Website", "वेबसाइट")}>
                <a
                  href={`https://${DOMAIN}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {DOMAIN}
                </a>
              </DetailRow>
            </ul>

            <a
              href={directionsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-full border border-cream px-6 py-3 text-sm font-semibold text-cream transition hover:bg-cream/10"
            >
              <span aria-hidden="true">🧭</span>
              {t("Get Directions", "दिशा-निर्देश पाएं")}
            </a>
          </div>

          <div className="rounded-2xl border border-cream-3 bg-white p-6 shadow-sm">
            <h3 className="font-display text-base font-semibold text-ink">
              {t("Operating Hours", "कार्य समय")}
            </h3>
            <p className="mt-2 text-sm text-ink-soft">
              {t("We're available", "हम उपलब्ध हैं")} {HOURS}.{" "}
              {t(
                "Drop a message any time on WhatsApp and we'll get back to you during business hours.",
                "WhatsApp पर कभी भी संदेश भेजें और हम कार्य समय के दौरान आपसे संपर्क करेंगे।",
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream/15 text-base"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-cream/70">{label}</p>
        <p className="mt-0.5 break-words font-medium">{children}</p>
      </div>
    </li>
  );
}
