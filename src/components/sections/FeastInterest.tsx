"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { packages } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { isValidEmail, isValidPhone } from "@/lib/validate";
import { Button, Field, Input, useErrorDialog } from "@/components/ui";
import { feastInterestFailureSpec } from "@/lib/failureDialogs";

type Status = "idle" | "submitting" | "success" | "error";

const FEAST_TIERS = packages.filter((p) => p.id !== "custom");

/**
 * Feast-2027 interest popup — opened when a guest taps Book on a Silver /
 * Gold / Platinum package while feast bookings are not yet open. Posts to
 * `/api/enquiries/feast-interest`; package + event details land in Admin →
 * Enquiries.
 */
export default function FeastInterestPopup({
  open,
  onClose,
  initialPackageId = "",
}: {
  open: boolean;
  onClose: () => void;
  /** Pre-select the feast package the guest just tapped (silver|gold|platinum). */
  initialPackageId?: string;
}) {
  const { lang, t } = useLang();
  const { showError } = useErrorDialog();
  const titleId = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [packageId, setPackageId] = useState(initialPackageId);
  const [occasion, setOccasion] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [guests, setGuests] = useState("");
  const [venue, setVenue] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Reset / prefill whenever the popup opens for a package.
  useEffect(() => {
    if (!open) return;
    setPackageId(
      FEAST_TIERS.some((p) => p.id === initialPackageId)
        ? initialPackageId
        : FEAST_TIERS[0]?.id ?? "",
    );
    setStatus("idle");
    setMessage("");
  }, [open, initialPackageId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  function validationError(): string {
    if (!name.trim())
      return t("Please tell us your name.", "कृपया अपना नाम बताएं।");
    if (!isValidPhone(phone))
      return t(
        "Please enter a valid 10-digit mobile number.",
        "कृपया सही 10 अंकों का मोबाइल नंबर डालें।",
      );
    if (email.trim() && !isValidEmail(email))
      return t(
        "That email doesn't look right — please check it.",
        "यह ईमेल सही नहीं लग रहा — कृपया जाँच लें।",
      );
    if (!city.trim())
      return t("Please tell us your city.", "कृपया अपना शहर बताएं।");
    if (!packageId)
      return t("Please choose a feast package.", "कृपया एक फीस्ट पैकेज चुनें।");
    if (!occasion.trim())
      return t("Please tell us the occasion.", "कृपया अवसर बताएं।");
    if (!eventDate)
      return t("Please pick an event date.", "कृपया इवेंट की तारीख चुनें।");
    if (!guests.trim() || Number(guests) < 1)
      return t("Please tell us the guest count.", "कृपया मेहमान संख्या बताएं।");
    return "";
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    const invalid = validationError();
    if (invalid) {
      setStatus("error");
      setMessage(invalid);
      return;
    }

    setStatus("submitting");
    setMessage("");

    const pkg = FEAST_TIERS.find((p) => p.id === packageId);
    const packageLabel = pkg
      ? lang === "hi"
        ? pkg.nameHi
        : pkg.name
      : packageId;

    try {
      const res = await fetch("/api/enquiries/feast-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone,
          email: email.trim(),
          city: city.trim(),
          packageId,
          packageName: packageLabel,
          occasion: occasion.trim(),
          eventDate,
          guests: guests.trim(),
          venue: venue.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        if (res.status >= 500) {
          setStatus("idle");
          showError(
            feastInterestFailureSpec({
              t,
              retry: () => setStatus("idle"),
            }),
          );
          return;
        }
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
    } catch {
      setStatus("idle");
      showError(
        feastInterestFailureSpec({
          t,
          retry: () => setStatus("idle"),
        }),
      );
    }
  }

  if (!mounted || !open) return null;

  const selectClass =
    "w-full rounded-control border border-cream-3 bg-cream/40 px-3.5 py-2.5 text-ink outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30";

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label={t("Close", "बंद करें")}
        onClick={onClose}
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-sheet bg-white shadow-modal sm:rounded-card"
      >
        <div className="flex items-start justify-between gap-3 border-b border-cream-3 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-maroon">
              {t("Full feast catering", "पूर्ण फीस्ट कैटरिंग")}
            </p>
            <h2 id={titleId} className="mt-0.5 font-display text-xl text-ink sm:text-2xl">
              {t(
                "Feast bookings open in 2027",
                "फीस्ट बुकिंग 2027 में शुरू होंगी",
              )}
            </h2>
            <p className="mt-1 text-xs leading-snug text-ink/70 sm:text-sm">
              {t(
                "Share your celebration details — we'll call when Feast opens.",
                "अपने उत्सव की जानकारी दें — फीस्ट खुलते ही हम कॉल करेंगे।",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close", "बंद करें")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink/55 transition hover:bg-cream hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-5">
          {status === "success" ? (
            <div role="status" className="rounded-card border border-maroon/25 bg-cream/40 px-4 py-5">
              <p className="text-base font-semibold text-maroon">
                {t("Thank you — you're on the list!", "धन्यवाद — आप लिस्ट में हैं!")}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/75">
                {t(
                  "We'll contact you when Feast bookings open in 2027.",
                  "फीस्ट बुकिंग 2027 में शुरू होते ही हम आपसे संपर्क करेंगे।",
                )}
              </p>
              <Button type="button" variant="primary" size="md" className="mt-4" onClick={onClose}>
                {t("Done", "हो गया")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t("Your name", "आपका नाम")} required>
                  <Input
                    type="text"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    placeholder={t("Full name", "पूरा नाम")}
                  />
                </Field>
                <Field label={t("Mobile number", "मोबाइल नंबर")} required>
                  <Input
                    type="tel"
                    name="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    inputMode="numeric"
                    placeholder={t("10-digit mobile", "10 अंकों का मोबाइल")}
                  />
                </Field>
                <Field label={t("Email (optional)", "ईमेल (वैकल्पिक)")}>
                  <Input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder={t("you@example.com", "you@example.com")}
                  />
                </Field>
                <Field label={t("City", "शहर")} required>
                  <Input
                    type="text"
                    name="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    autoComplete="address-level2"
                    placeholder={t("e.g. Lucknow", "जैसे लखनऊ")}
                  />
                </Field>
                <Field label={t("Feast package", "फीस्ट पैकेज")} required>
                  <select
                    name="package"
                    value={packageId}
                    onChange={(e) => setPackageId(e.target.value)}
                    className={selectClass}
                  >
                    {FEAST_TIERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {lang === "hi" ? p.nameHi : p.name}
                        {p.price ? ` · ${p.price}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("Occasion", "अवसर")} required>
                  <Input
                    type="text"
                    name="occasion"
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    placeholder={t("e.g. Wedding", "जैसे शादी")}
                  />
                </Field>
                <Field label={t("Event date", "इवेंट की तारीख")} required>
                  <Input
                    type="date"
                    name="eventDate"
                    value={eventDate}
                    min="2027-01-01"
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </Field>
                <Field label={t("Guests", "मेहमान")} required>
                  <Input
                    type="number"
                    name="guests"
                    value={guests}
                    min={1}
                    inputMode="numeric"
                    onChange={(e) => setGuests(e.target.value)}
                    placeholder={t("e.g. 200", "जैसे 200")}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label={t("Venue (optional)", "वेन्यू (वैकल्पिक)")}>
                    <Input
                      type="text"
                      name="venue"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder={t("Hall / address if known", "हॉल / पता अगर पता हो")}
                    />
                  </Field>
                </div>
              </div>

              {status === "error" && message && (
                <p
                  role="alert"
                  className="rounded-control border border-maroon/30 bg-cream/50 px-3.5 py-2.5 text-sm font-medium text-maroon"
                >
                  {message}
                </p>
              )}

              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={status === "submitting"}
                  className="w-full sm:w-auto"
                >
                  {t("Register interest", "रुचि दर्ज करें")}
                </Button>
                <p className="text-caption text-ink/60">
                  {t(
                    "No booking yet — we'll only call when Feast opens in 2027.",
                    "अभी कोई बुकिंग नहीं — फीस्ट 2027 में खुलने पर ही हम कॉल करेंगे।",
                  )}
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
