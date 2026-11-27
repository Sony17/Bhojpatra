"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { useLang } from "@/lib/i18n";
import { useSiteContent } from "@/lib/sitePages";
import { Button, Input } from "@/components/ui";
import { isValidPhone } from "@/lib/validate";

/**
 * "None of these fit? Contact Bhojpatra." — a WhatsApp enquiry for a
 * curated package, with name, mobile and an optional menu & budget PDF.
 * Used inline under the packages and as a popup from the Catering section.
 */
export function CuratedEnquiryForm() {
  const { t } = useLang();
  const { contact } = useSiteContent();
  const waText = t(
    "Hi Bhojpatra, none of the packages quite fit my event — I'd like a curated package.",
    "नमस्ते भोजपत्र, कोई भी पैकेज मेरे इवेंट के लिए पूरी तरह फिट नहीं है — मुझे एक कस्टम पैकेज चाहिए।",
  );
  // Custom-enquiry attachment — the guest's own menu & budget PDF. Uploaded
  // straight to /api/leads/enquiry-doc on pick; the returned same-origin URL
  // is appended to the WhatsApp message so the admin can open the PDF from
  // the chat (wa.me links can't carry real attachments).
  const [enquiryDoc, setEnquiryDoc] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [docName, setDocName] = useState("");
  const [docPhone, setDocPhone] = useState("");
  const [docUploading, setDocUploading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const waMessage = enquiryDoc
    ? // Only reachable client-side (a doc can't exist during SSR), so
      // window is safe here.
      `${waText}\n\n${t("My menu & budget PDF:", "मेरा मेन्यू और बजट PDF:")} ${new URL(enquiryDoc.url, window.location.origin).href}`
    : waText;
  const waLink = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(waMessage)}`;

  // The name + number identify the enquiry in the admin console, so they are
  // required before a file can be picked.
  const canAttach = docName.trim().length > 1 && isValidPhone(docPhone);

  async function onPickEnquiryDoc(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked after an error
    if (!file) return;
    setDocError(null);
    if (file.type && file.type !== "application/pdf") {
      setDocError(t("Please upload a PDF file.", "कृपया एक PDF फ़ाइल अपलोड करें।"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setDocError(
        t("File is too large — maximum 5 MB.", "फ़ाइल बहुत बड़ी है — अधिकतम 5 MB।"),
      );
      return;
    }
    setDocUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("name", docName.trim());
      form.append("phone", docPhone.trim());
      const res = await fetch("/api/leads/enquiry-doc", {
        method: "POST",
        body: form,
      });
      const body = (await res.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;
      if (!res.ok || !body?.url) throw new Error(body?.error);
      setEnquiryDoc({ url: body.url, name: file.name });
    } catch {
      setDocError(
        t(
          "Upload failed. Please try again.",
          "अपलोड नहीं हो सका। कृपया फिर से कोशिश करें।",
        ),
      );
    } finally {
      setDocUploading(false);
    }
  }

  return (
    <div className="rounded-card border border-maroon/20 bg-cream/40 px-6 py-6">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm text-ink-soft">
          {t(
            "None of these fit, or want a package curated just for you?",
            "इनमें से कोई फिट नहीं है, या अपने लिए एक खास पैकेज बनवाना चाहते हैं?",
          )}{" "}
          <span className="font-display text-maroon">
            {t("Contact Bhojpatra.", "भोजपत्र से संपर्क करें।")}
          </span>
        </p>
        <Button
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
          leftIcon={<WhatsAppIcon className="h-4 w-4" />}
        >
          <span className="font-display">
            {t("Chat on WhatsApp", "व्हाट्सएप पर चैट करें")}
          </span>
        </Button>
      </div>

      {/* Menu & budget PDF — optional attachment for the enquiry. Name and
          number come first so the request is identifiable in the admin
          console; the file uploads the moment it's picked, and its link is
          folded into the WhatsApp message above. */}
      <div className="mt-5 border-t border-maroon/15 pt-4">
        <div className="flex flex-col items-center gap-2.5 sm:flex-row sm:gap-3">
          <Input
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            disabled={!!enquiryDoc}
            aria-label={t("Your name", "आपका नाम")}
            placeholder={t("Your name", "आपका नाम")}
            className="min-h-10 text-xs sm:max-w-40"
          />
          <Input
            value={docPhone}
            onChange={(e) => setDocPhone(e.target.value)}
            disabled={!!enquiryDoc}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            aria-label={t("Mobile number", "मोबाइल नंबर")}
            placeholder={t("Mobile number", "मोबाइल नंबर")}
            className="min-h-10 text-xs sm:max-w-40"
          />
          {enquiryDoc ? (
            <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-white px-4 py-2 text-xs text-ink shadow-card ring-1 ring-maroon/25">
              <PdfIcon className="h-3.5 w-3.5 shrink-0 text-maroon" />
              <span className="max-w-48 truncate font-semibold">
                {enquiryDoc.name}
              </span>
              <button
                type="button"
                onClick={() => setEnquiryDoc(null)}
                aria-label={t("Remove attached PDF", "जोड़ी गई PDF हटाएँ")}
                className="ml-1 leading-none text-maroon transition hover:opacity-70"
              >
                ✕
              </button>
            </span>
          ) : (
            <button
              type="button"
              disabled={docUploading || !canAttach}
              title={
                canAttach
                  ? undefined
                  : t(
                      "Enter your name and mobile number first",
                      "पहले अपना नाम और मोबाइल नंबर भरें",
                    )
              }
              onClick={() => docInputRef.current?.click()}
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-dashed border-maroon/40 px-4 py-2 text-xs font-semibold text-maroon transition-all duration-300 hover:bg-cream/60 active:scale-95 disabled:pointer-events-none disabled:opacity-60"
            >
              <PdfIcon className="h-3.5 w-3.5 shrink-0" />
              {docUploading
                ? t("Uploading…", "अपलोड हो रहा है…")
                : t(
                    "Attach your menu & budget (PDF)",
                    "अपना मेन्यू और बजट जोड़ें (PDF)",
                  )}
            </button>
          )}
        </div>
        <p className="mt-2.5 text-center text-xs text-ink-soft sm:text-left">
          {t(
            "Optional — your PDF goes along with your WhatsApp message so we know exactly what you have in mind.",
            "वैकल्पिक — आपकी PDF आपके व्हाट्सएप संदेश के साथ जाती है ताकि हमें ठीक-ठीक पता रहे कि आप क्या चाहते हैं।",
          )}
        </p>
        {docError && (
          <p className="mt-2 text-xs font-semibold text-maroon">
            {docError}
          </p>
        )}
        <input
          ref={docInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={onPickEnquiryDoc}
          className="hidden"
        />
      </div>
    </div>
  );
}

/** The same enquiry in a dialog (bottom sheet on phones). */
export function CuratedEnquiryPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- portal target exists only after mount
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!mounted || !open) return null;
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
        aria-label={t("Contact Bhojpatra for a curated package", "खास पैकेज के लिए भोजपत्र से संपर्क करें")}
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-t-sheet bg-white p-3 pb-[calc(0.75rem+var(--safe-bottom))] shadow-modal sm:rounded-card sm:p-4"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("Close", "बंद करें")}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-maroon ring-1 ring-maroon/20 transition hover:bg-cream/60"
        >
          ✕
        </button>
        <CuratedEnquiryForm />
      </div>
    </div>,
    document.body,
  );
}

/** WhatsApp glyph — rendered in a single brand colour via currentColor. */
export function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.46 9.46 0 01-4.82-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.45 9.45 0 01-1.45-5.04c0-5.22 4.25-9.47 9.48-9.47 2.53 0 4.91.99 6.7 2.78a9.42 9.42 0 012.77 6.7c0 5.22-4.25 9.47-9.47 9.47zm8.06-17.53A11.36 11.36 0 0012.04.5C5.76.5.65 5.61.65 11.89c0 2.01.53 3.98 1.53 5.71L.5 23.5l6.05-1.59a11.35 11.35 0 005.49 1.4h.01c6.28 0 11.39-5.11 11.39-11.39 0-3.04-1.18-5.9-3.34-8.05z" />
    </svg>
  );
}

/** Document/paperclip glyph for the PDF attach control — currentColor. */
function PdfIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

