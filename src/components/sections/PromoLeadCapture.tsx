"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";
import { isValidEmail, isValidPhone } from "@/lib/validate";
import { Mail, Phone } from "@/components/icons";
import { Button, useToast } from "@/components/ui";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import ShareOffer from "./ShareOffer";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Promotional lead-capture under the hero.
 * Banner art is the focus; email/phone + sharing sit in a premium panel beneath.
 * No scroll-reveal — keeps the hero → promo handoff continuous (same reason as
 * ChooseOccasion).
 */
export default function PromoLeadCapture() {
  const { lang, t } = useLang();
  const { promo } = useHomeContent();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const hasImage = Boolean(promo.image);
  const heading = lang === "hi" ? promo.headingHi : promo.heading;
  const subtitle = lang === "hi" ? promo.subtitleHi : promo.subtitle;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    if (!isValidEmail(email) && !isValidPhone(phone)) {
      const msg = t(
        "Please enter a valid email address or mobile number.",
        "कृपया एक मान्य ईमेल पता या मोबाइल नंबर दर्ज करें।",
      );
      setStatus("error");
      setMessage(msg);
      toast(msg, { tone: "error" });
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        const msg =
          data.error ??
          t(
            "Something went wrong. Please try again.",
            "कुछ गलत हो गया। कृपया फिर से कोशिश करें।",
          );
        setStatus("error");
        setMessage(msg);
        toast(msg, { tone: "error" });
        return;
      }

      setStatus("success");
      setMessage(
        t("You're on the list!", "आप लिस्ट में शामिल हो गए!"),
      );
      setEmail("");
      setPhone("");
    } catch {
      const msg = t(
        "Network error. Please try again.",
        "नेटवर्क त्रुटि। कृपया फिर से कोशिश करें।",
      );
      setStatus("error");
      setMessage(msg);
      toast(msg, { tone: "error" });
    }
  }

  function renderLeadForm(shareAction?: ReactNode) {
    if (status === "success") {
      return (
        <p
          role="status"
          className="rounded-control border border-cream/40 bg-cream px-3 py-2 text-center text-xs font-semibold text-maroon shadow-card"
        >
          {message}
        </p>
      );
    }

    return (
      <form
        onSubmit={handleSubmit}
        noValidate
        className={
          shareAction
            ? "grid w-full grid-cols-2 gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-stretch sm:gap-2"
            : "grid w-full grid-cols-2 gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-stretch sm:gap-2"
        }
      >
        <label className="focus-within:shadow-brand flex min-h-8 min-w-0 items-center gap-1 rounded-control border border-cream/50 bg-white px-2 py-1 transition focus-within:border-cream sm:min-h-10 sm:gap-2 sm:px-2.5 sm:py-1.5">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cream text-maroon sm:h-6 sm:w-6">
            <Mail className="h-3 w-3" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col justify-center gap-0">
            <span className="sr-only">
              {t("Email Address", "ईमेल पता")}
            </span>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t("Email", "ईमेल")}
              autoComplete="email"
              className="w-full min-w-0 bg-transparent text-xs leading-tight text-ink outline-none placeholder:text-ink/50"
            />
          </span>
        </label>

        <label className="focus-within:shadow-brand flex min-h-8 min-w-0 items-center gap-1 rounded-control border border-cream/50 bg-white px-2 py-1 transition focus-within:border-cream sm:min-h-10 sm:gap-2 sm:px-2.5 sm:py-1.5">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cream text-maroon sm:h-6 sm:w-6">
            <Phone className="h-3 w-3" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col justify-center gap-0">
            <span className="sr-only">
              {t("Mobile Number", "मोबाइल नंबर")}
            </span>
            <input
              type="tel"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder={t("Mobile", "मोबाइल")}
              autoComplete="tel"
              inputMode="numeric"
              className="w-full min-w-0 bg-transparent text-xs leading-tight text-ink outline-none placeholder:text-ink/50"
            />
          </span>
        </label>

        <div className="col-span-2 flex items-stretch gap-1 sm:col-span-1 sm:contents sm:gap-1.5">
          <Button
            type="submit"
            variant="inverse"
            size="sm"
            loading={status === "submitting"}
            className="min-h-8 min-w-0 flex-1 px-3 sm:min-h-10 sm:w-auto sm:flex-none sm:px-5"
          >
            {status === "submitting"
              ? t("…", "…")
              : t("Notify Me", "सूचित करें")}
          </Button>
          {shareAction}
        </div>
      </form>
    );
  }

  if (hasImage) {
    const promoLine = `${heading} — ${subtitle}`;
    const shareAction = (
      <WhatsAppShareButton
        path="/#offers"
        message={promoLine}
        messageHi={promoLine}
        label=""
        labelHi=""
        variant="inverse"
        size="sm"
        className="min-h-8 shrink-0 px-3 sm:min-h-10"
      />
    );

    return (
      <section id="offers" aria-label="Promotional offers" className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          {/* Mobile: image box matches the banner’s natural ratio so art fits
              edge-to-edge; form sits below. Wide screens keep the float-over-art layout. */}
          <div className="overflow-hidden rounded-card bg-cream shadow-pop ring-1 ring-maroon/10 sm:relative sm:aspect-[2.54/1]">
            <div className="relative aspect-[2.54/1] w-full sm:absolute sm:inset-0 sm:aspect-auto">
              <Image
                src={promo.image}
                alt={heading}
                fill
                sizes="(min-width: 1280px) 1280px, calc(100vw - 32px)"
                className="object-cover object-center"
                unoptimized={isUnoptimized(promo.image)}
                priority
              />
            </div>

            {/* Gradient scrim so the lead form floats over the artwork on wide
                screens instead of sitting in a hard slab — reads more premium.
                On mobile the form gets its own maroon panel below, so hide it. */}
            <div className="promo-overlay-scrim pointer-events-none absolute inset-x-0 bottom-0 hidden h-2/3 sm:block" />

            <div className="bg-maroon px-2 py-1.5 sm:absolute sm:inset-x-0 sm:bottom-0 sm:bg-transparent sm:p-4">
              <div className="mx-auto w-full max-w-5xl">
                {renderLeadForm(shareAction)}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="offers" aria-label="Promotional offers" className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-3 sm:px-8 sm:py-4">
        <div className="overflow-hidden rounded-card bg-maroon shadow-card">
          <div className="flex flex-col gap-2.5 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-5 sm:px-6 sm:py-3.5">
            <div className="min-w-0 shrink sm:max-w-xs lg:max-w-sm">
              <p className="eyebrow text-[9px] font-semibold tracking-[0.2em] text-cream/70">
                {t("Offer", "ऑफर")}
              </p>
              <h2 className="font-display mt-0.5 truncate text-base leading-snug text-cream sm:text-lg">
                {heading}
              </h2>
              <p className="mt-0.5 line-clamp-1 text-xs text-cream/70">
                {subtitle}
              </p>
            </div>

            <div className="min-w-0 flex-1">{renderLeadForm()}</div>

            <div className="hidden shrink-0 lg:block">
              <ShareOffer heading={heading} subtitle={subtitle} compact />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
