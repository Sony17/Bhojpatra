"use client";

import { useState, type FormEvent } from "react";
import Reveal from "@/components/Reveal";
import { useLang } from "@/lib/i18n";
import { useHomeContent } from "@/lib/homeContent";
import { isValidEmail, isValidPhone } from "@/lib/validate";
import { Mail, Phone } from "@/components/icons";

type Status = "idle" | "submitting" | "success" | "error";

export default function PromoLeadCapture() {
  const { lang, t } = useLang();
  const { promo } = useHomeContent();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    // Mirror the server's rule (email OR phone) so an incomplete submission
    // shows an inline message instead of firing a request that's sure to 400.
    if (!isValidEmail(email) && !isValidPhone(phone)) {
      setStatus("error");
      setMessage(
        t(
          "Please enter a valid email address or mobile number.",
          "कृपया एक मान्य ईमेल पता या मोबाइल नंबर दर्ज करें।",
        ),
      );
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
        setStatus("error");
        setMessage(
          data.error ??
            t(
              "Something went wrong. Please try again.",
              "कुछ गलत हो गया। कृपया फिर से कोशिश करें।",
            ),
        );
        return;
      }

      setStatus("success");
      setMessage(
        t(
          "You're on the list! Watch your inbox for exclusive offers.",
          "आप लिस्ट में शामिल हो गए! खास ऑफर के लिए अपना इनबॉक्स देखें।",
        ),
      );
      setEmail("");
      setPhone("");
    } catch {
      setStatus("error");
      setMessage(
        t(
          "Network error. Please try again.",
          "नेटवर्क त्रुटि। कृपया फिर से कोशिश करें।",
        ),
      );
    }
  }

  return (
    <section id="offers" className="bg-maroon">
      <div className="mx-auto max-w-7xl px-5 py-7 sm:py-8">
        <Reveal
          variant="scale"
          className="mx-auto flex max-w-5xl flex-col items-center gap-4 rounded-2xl border border-cream/30 px-5 py-5 text-center sm:flex-row sm:items-center sm:gap-6 sm:px-7 sm:text-left"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cream shadow-[0_8px_20px_-10px_rgba(0,0,0,0.6)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/watermark-pot.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-auto object-contain"
            />
          </span>

          <div className="flex flex-col gap-0.5 sm:flex-1">
            <h2 className="text-lg text-cream sm:text-xl">
              {lang === "hi" ? promo.headingHi : promo.heading}
            </h2>
            <p className="text-xs text-cream/80">
              {lang === "hi" ? promo.subtitleHi : promo.subtitle}
            </p>
          </div>

          {status === "success" ? (
            <p
              role="status"
              className="rounded-lg bg-cream px-4 py-2.5 text-sm font-semibold text-maroon sm:max-w-xs"
            >
              {message}
            </p>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
            >
              <label className="flex items-center gap-2 rounded-lg border border-cream/40 bg-white px-3 py-2 transition-colors focus-within:border-cream focus-within:ring-2 focus-within:ring-cream/40 sm:w-44">
                <Mail className="h-4 w-4 shrink-0 text-maroon" />
                <span className="sr-only">{t("Email Address", "ईमेल पता")}</span>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full bg-transparent text-sm text-ink placeholder:text-ink/50 outline-none"
                />
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-cream/40 bg-white px-3 py-2 transition-colors focus-within:border-cream focus-within:ring-2 focus-within:ring-cream/40 sm:w-40">
                <Phone className="h-4 w-4 shrink-0 text-maroon" />
                <span className="sr-only">{t("Mobile Number", "मोबाइल नंबर")}</span>
                <input
                  type="tel"
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder={t("Mobile number", "मोबाइल नंबर")}
                  autoComplete="tel"
                  inputMode="numeric"
                  className="w-full bg-transparent text-sm text-ink placeholder:text-ink/50 outline-none"
                />
              </label>

              <button
                type="submit"
                disabled={status === "submitting"}
                className="btn-sheen shrink-0 rounded-lg bg-cream px-4 py-2 text-sm font-semibold text-maroon shadow-[0_8px_18px_-10px_rgba(0,0,0,0.6)] transition-all duration-300 hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === "submitting"
                  ? t("Signing up…", "साइन अप…")
                  : t("Notify Me", "सूचित करें")}
              </button>

              {status === "error" && (
                <p role="alert" className="text-xs font-medium text-cream sm:w-full">
                  {message}
                </p>
              )}
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
