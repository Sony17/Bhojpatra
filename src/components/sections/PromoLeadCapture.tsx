"use client";

import { useState, type FormEvent } from "react";
import { useLang } from "@/lib/i18n";
import { useHomeContent } from "@/lib/homeContent";
import { isValidEmail, isValidPhone } from "@/lib/validate";
import { Button, useToast } from "@/components/ui";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Lead-capture band at the foot of the home funnel (after testimonials).
 * The offer banner art lives up top in PromoBanner (below the hero).
 *
 * A full-width, minimal band on a soft cream-on-white gradient: a line of copy,
 * two slim fields and a single primary CTA, with a quiet WhatsApp "share the
 * offer" action alongside for word-of-mouth promotion.
 */
export default function PromoLeadCapture() {
  const { lang, t } = useLang();
  const { promo } = useHomeContent();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const hasImage = Boolean(promo.image || promo.imageDesktop);
  const heading = lang === "hi" ? promo.headingHi : promo.heading;
  const subtitle = lang === "hi" ? promo.subtitleHi : promo.subtitle;
  const promoLine = `${heading} — ${subtitle}`;

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
      setMessage(t("You're on the list!", "आप लिस्ट में शामिल हो गए!"));
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

  const inputClass =
    "min-h-11 w-full rounded-control border border-maroon/20 bg-white px-4 text-sm text-ink outline-none transition placeholder:text-ink/40 focus:border-maroon";

  return (
    <section
      id={hasImage ? "notify" : "offers"}
      aria-label={t("Get notified", "सूचित रहें")}
      className="promo-lead-band border-y border-maroon/10"
    >
      <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-11 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-14">
          <div className="min-w-0 lg:w-1/3 lg:shrink-0">
            <h2 className="font-display text-2xl leading-tight text-maroon sm:text-3xl">
              {heading}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/70 sm:text-base">
              {subtitle}
            </p>
          </div>

          <div className="min-w-0 lg:flex-1">
            {status === "success" ? (
              <p
                role="status"
                className="rounded-control border border-maroon/25 bg-white px-4 py-3 text-sm font-medium text-maroon shadow-soft"
              >
                {message}
              </p>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center"
              >
                <label className="w-full sm:min-w-[9rem] sm:flex-1">
                  <span className="sr-only">{t("Email Address", "ईमेल पता")}</span>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder={t("Email", "ईमेल")}
                    autoComplete="email"
                    className={inputClass}
                  />
                </label>

                <label className="w-full sm:min-w-[9rem] sm:flex-1">
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
                    className={inputClass}
                  />
                </label>

                <div className="flex gap-2.5 sm:contents">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={status === "submitting"}
                    className="flex-1 sm:w-auto sm:flex-none"
                  >
                    {t("Notify Me", "सूचित करें")}
                  </Button>
                  <WhatsAppShareButton
                    path="/#offers"
                    message={promoLine}
                    messageHi={promoLine}
                    label="Share"
                    labelHi="साझा करें"
                    variant="secondary"
                    size="md"
                    className="flex-1 sm:w-auto sm:flex-none"
                  />
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
