"use client";

import { useState } from "react";

const inputClass =
  "w-full rounded-lg border border-cream-3 bg-cream/40 px-3.5 py-2.5 text-ink placeholder:text-ink-soft/60 outline-none transition-colors focus:border-maroon focus:ring-1 focus:ring-maroon/30";

// Exact business details from the brand brief.
const PHONE_DISPLAY = "+91 99183 59017";
const WHATSAPP_NUMBER = "919918359017";
const EMAIL = "ankit23690@gmail.com";
const ADDRESS = "C-59, Sec K, Aliganj, Lucknow";
const HOURS = "10 AM – 7 PM (Open all days)";
const INSTAGRAM = "@bhojpatraofficial";
const DOMAIN = "www.bhojpatra.co.in";

const WHATSAPP_MESSAGE =
  "Hi Bhojpatra! I'd like to enquire about booking catering for my event.";
const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE,
)}`;
const directionsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  ADDRESS,
)}`;

const SUBJECTS = [
  "Wedding",
  "Engagement",
  "Birthday Party",
  "Corporate Event",
  "Reception",
  "Other Occasion",
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: wire up to your enquiry backend / CRM.
    setSubmitted(true);
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:py-16">
      <div className="max-w-2xl">
        <p className="eyebrow text-sm font-medium text-gold">Contact Us</p>
        <h1 className="mt-2 text-3xl text-ink sm:text-4xl">
          Let&apos;s Plan Your Feast
        </h1>
        <p className="font-script mt-3 text-xl text-ink-soft">
          Reach out and our team will help you book the perfect celebration.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        {/* LEFT — enquiry form */}
        <div className="rounded-2xl border border-cream-3 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-xl font-semibold text-ink">
            Send us an enquiry
          </h2>

          {submitted && (
            <div className="mt-4 rounded-lg border border-maroon/30 bg-maroon/5 px-4 py-3 text-sm font-medium text-maroon">
              Thanks! We&apos;ll reach out shortly.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm text-ink-soft">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Your full name"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm text-ink-soft">
                Email
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
                Mobile
              </label>
              <input
                id="mobile"
                name="mobile"
                type="tel"
                required
                autoComplete="tel"
                placeholder="10-digit mobile number"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="subject" className="text-sm text-ink-soft">
                Subject / Occasion
              </label>
              <select
                id="subject"
                name="subject"
                required
                defaultValue=""
                className={inputClass}
              >
                <option value="" disabled>
                  Select an occasion
                </option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="message" className="text-sm text-ink-soft">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={4}
                placeholder="Tell us about your event — date, guest count & city."
                className={`${inputClass} resize-y`}
              />
            </div>

            <button
              type="submit"
              className="mt-1 w-full rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
            >
              Send Enquiry
            </button>
          </form>

          <div className="mt-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-cream-3" />
            <span className="text-xs uppercase tracking-wide text-ink-soft">
              or
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
            Chat on WhatsApp
          </a>
        </div>

        {/* RIGHT — business details */}
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl bg-maroon p-6 text-cream shadow-sm sm:p-8">
            <p className="eyebrow text-sm font-medium text-cream/80">
              Bhojpatra
            </p>
            <h2 className="font-display mt-1 text-2xl font-semibold">
              India&apos;s Feast Booking Platform
            </h2>

            <ul className="mt-6 flex flex-col gap-5 text-sm">
              <DetailRow icon="📞" label="Phone / WhatsApp">
                <a href={`tel:+${WHATSAPP_NUMBER}`} className="hover:underline">
                  {PHONE_DISPLAY}
                </a>
              </DetailRow>
              <DetailRow icon="✉️" label="Email">
                <a href={`mailto:${EMAIL}`} className="hover:underline">
                  {EMAIL}
                </a>
              </DetailRow>
              <DetailRow icon="📍" label="Address">
                {ADDRESS}
              </DetailRow>
              <DetailRow icon="🕒" label="Hours">
                {HOURS}
              </DetailRow>
              <DetailRow icon="📷" label="Instagram">
                <a
                  href="https://instagram.com/bhojpatraofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {INSTAGRAM}
                </a>
              </DetailRow>
              <DetailRow icon="🌐" label="Website">
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
              Get Directions
            </a>
          </div>

          <div className="rounded-2xl border border-cream-3 bg-white p-6 shadow-sm">
            <h3 className="font-display text-base font-semibold text-ink">
              Operating Hours
            </h3>
            <p className="mt-2 text-sm text-ink-soft">
              We&apos;re available {HOURS}. Drop a message any time on WhatsApp
              and we&apos;ll get back to you during business hours.
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
