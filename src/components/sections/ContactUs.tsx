"use client";

import { useState } from "react";
import { Phone, Mail, MapPin, Clock } from "@/components/icons";
import Reveal from "@/components/Reveal";

/** Bhojpatra HQ — used for both the contact card and the embedded map. */
const office = {
  name: "Bhojpatra HQ",
  address: "Hazratganj, Lucknow, Uttar Pradesh 226001",
  phone: "+91 12345 67890",
  email: "info@bhojpatra.com",
  hours: "Mon – Sat · 10:00 AM – 7:00 PM",
};

/**
 * Keyless Google Maps embed. `output=embed` renders an interactive map for a
 * place query without a Maps JavaScript API key, so it works out of the box.
 */
const mapSrc =
  "https://maps.google.com/maps?q=" +
  encodeURIComponent("Hazratganj, Lucknow, Uttar Pradesh") +
  "&z=14&output=embed";

const contactCards = [
  { iconKey: "phone", label: "Call Us", value: office.phone, href: `tel:${office.phone.replace(/\s+/g, "")}` },
  { iconKey: "mail", label: "Email Us", value: office.email, href: `mailto:${office.email}` },
  { iconKey: "pin", label: "Visit Us", value: office.address, href: undefined },
  { iconKey: "clock", label: "Working Hours", value: office.hours, href: undefined },
] as const;

const cardIcons = {
  phone: <Phone className="h-3.5 w-3.5" />,
  mail: <Mail className="h-3.5 w-3.5" />,
  pin: <MapPin className="h-3.5 w-3.5" />,
  clock: <Clock className="h-3.5 w-3.5" />,
};

const formFields = [
  { id: "name", label: "Full Name", type: "text", placeholder: "Enter your full name", autoComplete: "name" },
  { id: "phone", label: "Mobile Number", type: "tel", placeholder: "10-digit mobile number", autoComplete: "tel" },
  { id: "email", label: "Email Address", type: "email", placeholder: "you@example.com", autoComplete: "email" },
  { id: "subject", label: "Subject", type: "text", placeholder: "How can we help?", autoComplete: "off" },
] as const;

export default function ContactUs() {
  const [sent, setSent] = useState(false);

  return (
    <section id="contact" className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="eyebrow text-xs font-semibold text-gold sm:text-sm">Contact Us</p>
        <h2 className="mt-2 text-3xl text-ink sm:text-4xl">Get in Touch</h2>
        <p className="font-script mt-3 text-xl text-ink-soft sm:text-2xl">
          We&apos;d love to help plan your next celebration.
        </p>
      </Reveal>

      {/* Quick contact tiles */}
      <Reveal stagger className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-2.5 lg:grid-cols-4">
        {contactCards.map((card) => {
          const inner = (
            <div className="card-lift group flex h-full flex-col items-center gap-1.5 rounded-xl border border-cream-3 bg-white p-2.5 text-center shadow-sm hover:border-maroon/40 hover:shadow-md">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-maroon/10 text-maroon transition-transform duration-300 group-hover:scale-110">
                {cardIcons[card.iconKey]}
              </span>
              <span className="text-xs font-semibold text-ink">{card.label}</span>
              <span className="text-[11px] leading-snug text-ink-soft">{card.value}</span>
            </div>
          );
          return card.href ? (
            <a key={card.label} href={card.href} className="block">
              {inner}
            </a>
          ) : (
            <div key={card.label}>{inner}</div>
          );
        })}
      </Reveal>

      {/* Map + form, side by side on large screens */}
      <Reveal variant="fade" delay={100} className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
        {/* Google Maps location */}
        <div className="overflow-hidden rounded-2xl border border-cream-3 shadow-sm">
          <iframe
            title={`Map showing ${office.name}`}
            src={mapSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-72 w-full border-0 lg:h-full lg:min-h-[28rem]"
          />
        </div>

        {/* Contact form */}
        <div className="rounded-2xl border border-cream-3 bg-white p-6 shadow-sm sm:p-8">
          <form
            className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            {formFields.map((field) => (
              <div key={field.id} className="flex flex-col gap-1.5">
                <label htmlFor={`contact-${field.id}`} className="text-sm text-ink-soft">
                  {field.label}
                </label>
                <input
                  id={`contact-${field.id}`}
                  name={field.id}
                  type={field.type}
                  placeholder={field.placeholder}
                  autoComplete={field.autoComplete}
                  className="rounded-lg border border-cream-3 bg-cream/40 px-3 py-2.5 text-ink placeholder:text-ink-soft/60 outline-none transition-all duration-200 focus:border-maroon focus:bg-white focus:ring-2 focus:ring-maroon/20"
                />
              </div>
            ))}

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="contact-message" className="text-sm text-ink-soft">
                Message
              </label>
              <textarea
                id="contact-message"
                name="message"
                rows={4}
                placeholder="Tell us about your event…"
                className="resize-y rounded-lg border border-cream-3 bg-cream/40 px-3 py-2.5 text-ink placeholder:text-ink-soft/60 outline-none transition-all duration-200 focus:border-maroon focus:bg-white focus:ring-2 focus:ring-maroon/20"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="btn-sheen w-full rounded-lg bg-maroon px-5 py-3 text-base font-semibold text-cream shadow-sm transition-all duration-300 hover:bg-maroon-dark hover:shadow-lg active:scale-[0.98]"
              >
                Send Message
              </button>
              {sent ? (
                <p className="mt-3 text-center text-sm font-medium text-maroon">
                  Thank you! We&apos;ve received your message and will get back to you shortly.
                </p>
              ) : (
                <p className="mt-3 text-center text-xs text-ink-soft">
                  Your data is safe with us. We&apos;ll respond within one business day.
                </p>
              )}
            </div>
          </form>
        </div>
      </Reveal>
    </section>
  );
}
