"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useLang } from "@/lib/i18n";
import { occasions, cities, guestPresets } from "@/lib/data";
import { isValidPhone, isValidEmail } from "@/lib/validate";
import { Button } from "@/components/ui";

interface CustomCateringModalProps {
  open: boolean;
  onClose: () => void;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CustomCateringModal({ open, onClose }: CustomCateringModalProps) {
  const { lang, t } = useLang();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [occasion, setOccasion] = useState(occasions[0]?.name ?? "Wedding");
  const [eventDate, setEventDate] = useState("");
  const [city, setCity] = useState(cities[0]?.name ?? "Lucknow");
  const [guests, setGuests] = useState<string>(String(guestPresets[1]));
  const [budget, setBudget] = useState("");
  const [requirements, setRequirements] = useState("");

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedEnquiryId, setSubmittedEnquiryId] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  function validateAndSetFile(file: File) {
    setFileError("");
    const isPdf =
      file.type === "application/pdf" ||
      file.type === "application/x-pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setFileError(
        t(
          "Only PDF documents are accepted. Please select a PDF file.",
          "केवल PDF दस्तावेज़ स्वीकार किए जाते हैं। कृपया एक PDF फ़ाइल चुनें।",
        ),
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(
        t(
          "File is too large. Maximum allowed size is 10 MB.",
          "फ़ाइल बहुत बड़ी है। अधिकतम अनुमत आकार 10 MB है।",
        ),
      );
      return;
    }

    setSelectedFile(file);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function removeFile() {
    setSelectedFile(null);
    setFileError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function resetForm() {
    setName("");
    setPhone("");
    setEmail("");
    setEventDate("");
    setBudget("");
    setRequirements("");
    setSelectedFile(null);
    setFileError("");
    setSubmitError("");
    setSubmittedEnquiryId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitError("");

    // Client-side validations
    if (!name.trim()) {
      setSubmitError(t("Please enter your name.", "कृपया अपना नाम दर्ज करें।"));
      return;
    }
    if (!isValidPhone(phone)) {
      setSubmitError(
        t(
          "Please enter a valid 10-digit mobile number.",
          "कृपया एक मान्य 10-अंकों का मोबाइल नंबर दर्ज करें।",
        ),
      );
      return;
    }
    if (email.trim() && !isValidEmail(email)) {
      setSubmitError(
        t(
          "Please enter a valid email address.",
          "कृपया एक मान्य ईमेल पता दर्ज करें।",
        ),
      );
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("phone", phone.trim());
      if (email.trim()) formData.append("email", email.trim().toLowerCase());
      formData.append("eventType", occasion);
      formData.append("eventDate", eventDate);
      formData.append("city", city);
      formData.append("guests", guests);
      if (budget.trim()) formData.append("budget", budget.trim());
      formData.append(
        "requirements",
        requirements.trim() || "Custom catering requirements as detailed.",
      );

      if (selectedFile) {
        formData.append("menuPdf", selectedFile);
      }

      const res = await fetch("/api/contact", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        id?: string;
        error?: string;
      } | null;

      if (!res.ok || !data?.ok) {
        setSubmitError(
          data?.error ??
            t(
              "Could not submit your enquiry. Please try again.",
              "आपकी पूछताछ सबमिट नहीं हो सकी। कृपया पुनः प्रयास करें।",
            ),
        );
        return;
      }

      setSubmittedEnquiryId(data.id ?? "ENQ-SUBMITTED");
    } catch {
      setSubmitError(
        t(
          "Network error. Please check your connection and try again.",
          "नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें और पुनः प्रयास करें।",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-catering-title"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="animate-fade absolute inset-0 bg-ink/65 backdrop-blur-sm [animation-duration:200ms]"
      />

      {/* Modal Dialog Card */}
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-cream/30 bg-white shadow-modal focus:outline-none overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-cream-3 bg-gradient-to-b from-cream/20 to-white px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-maroon sm:text-[11px]">
              {t("Bespoke Feasts & Menus", "कस्टम दावत और मेनू")}
            </span>
            <h2
              id="custom-catering-title"
              className="mt-1 font-display text-xl font-bold leading-tight text-ink sm:text-2xl"
            >
              {t("Custom Catering Enquiry", "कस्टम कैटरिंग पूछताछ")}
            </h2>
            <p className="mt-1 text-xs text-ink-soft sm:text-sm">
              {t(
                "Have your own menu, catering brief, or target budget? Share it below.",
                "क्या आपके पास अपना मेनू, कैटरिंग विवरण या बजट है? नीचे साझा करें।",
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close", "बंद करें")}
            className="rounded-full p-1.5 text-ink-soft hover:bg-cream-2 hover:text-ink transition"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {submittedEnquiryId ? (
            /* Success State */
            <div className="py-6 text-center sm:py-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cream/60 text-maroon ring-1 ring-maroon/20">
                <svg
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>

              <h3 className="mt-4 font-display text-2xl font-bold text-ink">
                {t("Enquiry Submitted", "पूछताछ दर्ज हो गई")}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft sm:text-base">
                {t(
                  "Our team will review your requirements and get back to you.",
                  "हमारी टीम आपकी आवश्यकताओं की समीक्षा करेगी और जल्द ही आपसे संपर्क करेगी।",
                )}
              </p>

              <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-maroon/15 bg-cream/30 px-4 py-1.5 text-xs font-semibold text-ink">
                <span>{t("Reference ID:", "संदर्भ संख्या:")}</span>
                <span className="font-mono text-maroon">{submittedEnquiryId}</span>
              </div>

              <div className="mt-8 flex justify-center gap-3">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    resetForm();
                  }}
                >
                  {t("Submit Another", "एक और जमा करें")}
                </Button>
                <Button variant="primary" size="md" onClick={onClose}>
                  {t("Done", "हो गया")}
                </Button>
              </div>
            </div>
          ) : (
            /* Enquiry Form */
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {submitError && (
                <div
                  role="alert"
                  className="rounded-control border border-maroon/40 bg-maroon/10 px-4 py-3 text-xs font-medium text-maroon sm:text-sm"
                >
                  {submitError}
                </div>
              )}

              {/* Customer Details */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <label
                    htmlFor="custom-name"
                    className="block text-xs font-bold uppercase tracking-wider text-ink/75"
                  >
                    {t("Your Name", "आपका नाम")}{" "}
                    <span className="text-maroon">*</span>
                  </label>
                  <input
                    id="custom-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("e.g. Rahul Sharma", "उदा. राहुल शर्मा")}
                    className="mt-1.5 h-11 w-full rounded-control border border-cream-3 bg-white px-3.5 text-sm text-ink outline-none transition focus:border-maroon focus:ring-1 focus:ring-maroon"
                  />
                </div>

                <div>
                  <label
                    htmlFor="custom-phone"
                    className="block text-xs font-bold uppercase tracking-wider text-ink/75"
                  >
                    {t("Mobile Number", "मोबाइल नंबर")}{" "}
                    <span className="text-maroon">*</span>
                  </label>
                  <div className="relative mt-1.5 flex items-center">
                    <span className="absolute left-3 text-sm font-semibold text-ink-soft">
                      +91
                    </span>
                    <input
                      id="custom-phone"
                      type="tel"
                      required
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder={t("10-digit number", "10 अंकों का नंबर")}
                      className="h-11 w-full rounded-control border border-cream-3 bg-white pl-12 pr-3.5 text-sm text-ink outline-none transition focus:border-maroon focus:ring-1 focus:ring-maroon"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="custom-email"
                    className="block text-xs font-bold uppercase tracking-wider text-ink/75"
                  >
                    {t("Email Address", "ईमेल पता")}{" "}
                    <span className="text-[11px] font-normal lowercase text-ink-soft">
                      ({t("optional", "वैकल्पिक")})
                    </span>
                  </label>
                  <input
                    id="custom-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1.5 h-11 w-full rounded-control border border-cream-3 bg-white px-3.5 text-sm text-ink outline-none transition focus:border-maroon focus:ring-1 focus:ring-maroon"
                  />
                </div>
              </div>

              {/* Event / Catering Details */}
              <div className="rounded-xl border border-cream-3 bg-cream/15 p-3.5 sm:p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-maroon">
                  {t("Event Details", "कार्यक्रम का विवरण")}
                </p>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="custom-occasion"
                      className="block text-[11px] font-semibold text-ink/80"
                    >
                      {t("Occasion", "अवसर")}
                    </label>
                    <select
                      id="custom-occasion"
                      value={occasion}
                      onChange={(e) => setOccasion(e.target.value)}
                      className="mt-1 h-10 w-full rounded-control border border-cream-3 bg-white px-2.5 text-xs text-ink outline-none focus:border-maroon sm:text-sm"
                    >
                      {occasions.map((o) => (
                        <option key={o.id} value={o.name}>
                          {lang === "hi" ? o.nameHi : o.name}
                        </option>
                      ))}
                      <option value="Other Occasion">{t("Other Occasion", "अन्य अवसर")}</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="custom-date"
                      className="block text-[11px] font-semibold text-ink/80"
                    >
                      {t("Event Date", "तारीख")}
                    </label>
                    <input
                      id="custom-date"
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="mt-1 h-10 w-full rounded-control border border-cream-3 bg-white px-2.5 text-xs text-ink outline-none focus:border-maroon sm:text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="custom-city"
                      className="block text-[11px] font-semibold text-ink/80"
                    >
                      {t("City / Location", "शहर / स्थान")}
                    </label>
                    <select
                      id="custom-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="mt-1 h-10 w-full rounded-control border border-cream-3 bg-white px-2.5 text-xs text-ink outline-none focus:border-maroon sm:text-sm"
                    >
                      {cities.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                      <option value="Other">{t("Other City", "अन्य शहर")}</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="custom-guests"
                      className="block text-[11px] font-semibold text-ink/80"
                    >
                      {t("Expected Guests", "अनुमानित मेहमान")}
                    </label>
                    <input
                      id="custom-guests"
                      type="number"
                      min="1"
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      placeholder="e.g. 250"
                      className="mt-1 h-10 w-full rounded-control border border-cream-3 bg-white px-2.5 text-xs text-ink outline-none focus:border-maroon sm:text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="custom-budget"
                      className="block text-[11px] font-semibold text-ink/80"
                    >
                      {t("Target Budget", "लक्षित बजट")}{" "}
                      <span className="text-[10px] font-normal text-ink-soft">
                        ({t("e.g. ₹800/plate or ₹2.5 Lakh total", "उदा. ₹800/प्लेट या कुल ₹2.5 लाख")})
                      </span>
                    </label>
                    <input
                      id="custom-budget"
                      type="text"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder={t("Your target budget or rate", "आपका लक्षित बजट या दर")}
                      className="mt-1 h-10 w-full rounded-control border border-cream-3 bg-white px-2.5 text-xs text-ink outline-none focus:border-maroon sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Requirements Text */}
              <div>
                <label
                  htmlFor="custom-requirements"
                  className="block text-xs font-bold uppercase tracking-wider text-ink/75"
                >
                  {t("Tell Us About Your Requirements", "अपनी आवश्यकताएं बताएं")}
                </label>
                <textarea
                  id="custom-requirements"
                  rows={3}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder={t(
                    "Describe your desired dishes, cuisine preferences, live counters, dietary notes, or service expectations...",
                    "अपने पसंदीदा व्यंजन, लाइव काउंटर, खान-पान की प्राथमिकताएं या सेवा संबंधी आवश्यकताएं लिखें...",
                  )}
                  className="mt-1.5 w-full rounded-control border border-cream-3 bg-white p-3 text-sm text-ink outline-none transition placeholder:text-ink/40 focus:border-maroon focus:ring-1 focus:ring-maroon"
                />
              </div>

              {/* Menu / Budget PDF Upload Area */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink/75">
                  {t("Upload Menu or Budget PDF", "मेनू या बजट PDF अपलोड करें")}{" "}
                  <span className="text-[11px] font-normal lowercase text-ink-soft">
                    ({t("optional", "वैकल्पिक")})
                  </span>
                </label>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {t(
                    "Share your existing menu, budget, or catering brief so our team can understand your requirements (PDF, max 10 MB).",
                    "अपना मौजूदा मेनू, बजट या कैटरिंग विवरण साझा करें ताकि हमारी टीम समझ सके (PDF, अधिकतम 10 MB)।",
                  )}
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="menu-pdf-upload"
                />

                {selectedFile ? (
                  /* File Selected State */
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-maroon/20 bg-cream/30 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-maroon text-white font-bold text-xs">
                        PDF
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-ink sm:text-sm">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-ink-soft">
                          {formatBytes(selectedFile.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-maroon hover:bg-cream/60 transition"
                      >
                        {t("Replace", "बदलें")}
                      </button>
                      <button
                        type="button"
                        onClick={removeFile}
                        aria-label={t("Remove file", "फ़ाइल हटाएं")}
                        className="rounded-lg p-1 text-ink-soft hover:bg-maroon/10 hover:text-maroon transition"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                        >
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Dropzone / Upload Trigger */
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition ${
                      isDragging
                        ? "border-maroon bg-cream/40 scale-[0.99]"
                        : "border-cream-3 bg-cream/10 hover:border-maroon/40 hover:bg-cream/20"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cream/60 text-maroon">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                      </svg>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-ink sm:text-sm">
                      <span className="text-maroon underline underline-offset-2">
                        {t("Click to upload", "अपलोड करने के लिए क्लिक करें")}
                      </span>{" "}
                      {t("or drag & drop your PDF here", "या अपनी PDF यहाँ खींच कर लाएँ")}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-soft">
                      {t("PDF documents up to 10 MB", "10 MB तक के PDF दस्तावेज़")}
                    </p>
                  </div>
                )}

                {fileError && (
                  <p className="mt-1.5 text-xs font-medium text-maroon">{fileError}</p>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={onClose}
                  disabled={submitting}
                >
                  {t("Cancel", "रद्द करें")}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={submitting}
                  className="min-w-[10rem]"
                >
                  {t("Submit Enquiry", "पूछताछ भेजें")}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
