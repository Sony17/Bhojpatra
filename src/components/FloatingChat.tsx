"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLang, type Lang } from "@/lib/i18n";

/* Bhojpatra contact — mirrors the placeholder in the Footer. Swap for the
   real WhatsApp business number later. */
const WHATSAPP_NUMBER = "911234567890";

const waLink = (text: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

/* ── Knowledge base ───────────────────────────────────────────────────
   Self-contained, scripted answers (EN + HI). Each entry matches on
   keywords (matched in either script); the first match wins. Anything
   unmatched falls back to a WhatsApp handoff. */
interface Knowledge {
  keywords: string[];
  answer: string;
  answerHi: string;
}

const KNOWLEDGE: Knowledge[] = [
  {
    keywords: ["price", "cost", "plate", "package", "budget", "rate", "charge", "fee", "कीमत", "पैकेज", "रेट", "प्लेट"],
    answer:
      "Our per-plate packages:\n• Silver — ₹799\n• Gold — ₹1199 (most popular)\n• Platinum — ₹1599+\n\nEvery package is fully customizable to your menu and guest count.",
    answerHi:
      "हमारे प्रति-प्लेट पैकेज:\n• सिल्वर — ₹799\n• गोल्ड — ₹1199 (सबसे लोकप्रिय)\n• प्लैटिनम — ₹1599+\n\nहर पैकेज आपके मेन्यू और मेहमानों की संख्या के अनुसार पूरी तरह कस्टमाइज़ किया जा सकता है।",
  },
  {
    keywords: ["city", "cities", "location", "where", "area", "serve", "available", "near", "शहर", "लोकेशन", "कहाँ", "कहां"],
    answer:
      "We cover 500+ cities across India — including Lucknow, Delhi, Mumbai, Bengaluru, Kolkata, Hyderabad, Jaipur and Pune. Tell us your city and we'll match you with local specialists.",
    answerHi:
      "हम पूरे भारत में 500+ शहरों में सेवा देते हैं — लखनऊ, दिल्ली, मुंबई, बेंगलुरु, कोलकाता, हैदराबाद, जयपुर और पुणे सहित। अपना शहर बताएं और हम आपको स्थानीय स्पेशलिस्ट से जोड़ देंगे।",
  },
  {
    keywords: ["occasion", "wedding", "haldi", "mehndi", "tilak", "engagement", "reception", "birthday", "corporate", "event", "party", "अवसर", "शादी", "हल्दी", "मेहंदी", "बर्थडे", "पार्टी"],
    answer:
      "We cater every celebration — Weddings, Engagements, Tilak, Haldi, Mehndi, Receptions, Birthday Parties and Corporate Events. Which one are you planning?",
    answerHi:
      "हम हर उत्सव के लिए कैटरिंग करते हैं — शादी, सगाई, तिलक, हल्दी, मेहंदी, रिसेप्शन, बर्थडे पार्टी और कॉर्पोरेट इवेंट। आप कौन-सा प्लान कर रहे हैं?",
  },
  {
    keywords: ["book", "booking", "process", "step", "how", "start", "begin", "बुक", "बुकिंग", "प्रोसेस", "कैसे", "शुरू"],
    answer:
      "Booking takes 4 easy steps:\n1. Choose your occasion\n2. Select a package\n3. Pick your specialists\n4. Review & confirm\n\nYou'll get instant confirmation — we assist end-to-end.",
    answerHi:
      "बुकिंग सिर्फ़ 4 आसान चरणों में:\n1. अपना अवसर चुनें\n2. पैकेज चुनें\n3. अपने स्पेशलिस्ट चुनें\n4. समीक्षा करें और कन्फ़र्म करें\n\nआपको तुरंत पुष्टि मिलेगी — हम शुरू से अंत तक मदद करते हैं।",
  },
  {
    keywords: ["vendor", "specialist", "caterer", "verified", "trust", "safe", "quality", "review", "वेंडर", "स्पेशलिस्ट", "वेरिफाइड", "समीक्षा", "भरोसा"],
    answer:
      "Every one of our 10,000+ specialists is verified and rated by real customers (we average 4.8/5 across 1 Lakh+ happy customers). You can compare menus and reviews before you choose.",
    answerHi:
      "हमारे 10,000+ स्पेशलिस्ट में से हर एक वेरिफाइड है और असली ग्राहकों द्वारा रेट किया गया है (1 लाख+ खुश ग्राहकों में औसत 4.8/5)। चुनने से पहले आप मेन्यू और समीक्षाओं की तुलना कर सकते हैं।",
  },
  {
    keywords: ["contact", "call", "phone", "human", "talk", "agent", "support", "whatsapp", "help", "संपर्क", "कॉल", "बात", "मदद", "सहायता"],
    answer:
      "Happy to connect you with our team! Tap “Chat on WhatsApp” below and we'll reply instantly. 🙏",
    answerHi:
      "हम आपको हमारी टीम से जोड़कर खुश होंगे! नीचे “WhatsApp पर चैट करें” दबाएं और हम तुरंत जवाब देंगे। 🙏",
  },
];

function findAnswer(input: string, lang: Lang): string {
  const text = input.toLowerCase();
  const hit = KNOWLEDGE.find((k) => k.keywords.some((w) => text.includes(w)));
  if (hit) return lang === "hi" ? hit.answerHi : hit.answer;
  return lang === "hi"
    ? "मुझे इसका पूरा भरोसा नहीं है — लेकिन हमारी टीम तुरंत मदद कर सकती है। नीचे “WhatsApp पर चैट करें” दबाएं। 🙏"
    : "I'm not fully sure about that one — but our team can help right away. Tap “Chat on WhatsApp” below and we'll get you sorted. 🙏";
}

/* Collapsible FAQ shortcuts — tapping one drops the answer straight into chat.
   `kb` indexes into KNOWLEDGE so the answer follows the active language. */
const FAQS: { q: string; qHi: string; kb: number }[] = [
  { q: "What does it cost?", qHi: "इसकी कीमत क्या है?", kb: 0 },
  { q: "Which cities do you serve?", qHi: "आप किन शहरों में सेवा देते हैं?", kb: 1 },
  { q: "How does booking work?", qHi: "बुकिंग कैसे होती है?", kb: 3 },
  { q: "Are your vendors verified?", qHi: "क्या आपके वेंडर वेरिफाइड हैं?", kb: 4 },
];

interface Message {
  from: "bot" | "user";
  text: string;
}

/* ── Callback request ─────────────────────────────────────────────────
   The "Request a callback" view mirrors the in-app help sheet: a phone
   number, a "what do you need help with?" topic, and an optional note.
   The `en` label is the canonical value sent to /api/leads (it must match
   the server's CALLBACK_TOPICS whitelist); `hi` is display-only. */
const CALLBACK_TOPICS: { en: string; hi: string }[] = [
  { en: "Service assistance", hi: "सेवा सहायता" },
  { en: "Daily orders", hi: "रोज़ के ऑर्डर" },
  { en: "Multi occasion order", hi: "कई अवसरों का ऑर्डर" },
  { en: "App guidance", hi: "ऐप मार्गदर्शन" },
  { en: "Rewards & referrals", hi: "रिवॉर्ड्स और रेफरल" },
];

const PHONE_RE = /^[6-9]\d{9}$/;

const GREETING_EN =
  "Namaste! 🙏 I'm the Bhojpatra assistant. Ask me about pricing, occasions, cities or booking — or pick a question below.";
const GREETING_HI =
  "नमस्ते! 🙏 मैं भोजपत्र असिस्टेंट हूँ। मुझसे कीमत, अवसर, शहर या बुकिंग के बारे में पूछें — या नीचे से कोई सवाल चुनें।";

/** Support headset glyph — used for the assistant avatar and launcher. */
function HeadsetIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h4v1h-7v2h6c1.66 0 3-1.34 3-3V10c0-4.97-4.03-9-9-9z" />
    </svg>
  );
}

/** Official WhatsApp glyph. */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden>
      <path d="M16.04 4C9.93 4 4.98 8.95 4.98 15.06c0 1.95.51 3.86 1.48 5.54L4.9 27.1l6.66-1.74a11 11 0 0 0 5.29 1.35h.01c6.11 0 11.06-4.95 11.06-11.06C27.92 8.95 22.97 4 16.04 4Zm0 20.27h-.01a9.2 9.2 0 0 1-4.68-1.28l-.34-.2-3.95 1.03 1.05-3.85-.22-.35a9.16 9.16 0 0 1-1.41-4.89c0-5.07 4.13-9.2 9.21-9.2 2.46 0 4.77.96 6.51 2.7a9.13 9.13 0 0 1 2.7 6.51c0 5.08-4.13 9.21-9.2 9.21Zm5.05-6.89c-.28-.14-1.64-.81-1.89-.9-.25-.09-.43-.14-.62.14-.18.28-.71.9-.87 1.08-.16.18-.32.21-.6.07-.28-.14-1.17-.43-2.22-1.37-.82-.73-1.38-1.64-1.54-1.92-.16-.28-.02-.43.12-.57.13-.12.28-.32.41-.48.14-.16.18-.28.28-.46.09-.18.05-.35-.02-.49-.07-.14-.62-1.5-.85-2.05-.22-.54-.45-.46-.62-.47l-.53-.01c-.18 0-.48.07-.74.35-.25.28-.96.94-.96 2.3 0 1.36.99 2.67 1.13 2.85.14.18 1.95 2.98 4.73 4.18.66.29 1.18.46 1.58.59.66.21 1.27.18 1.74.11.53-.08 1.64-.67 1.87-1.32.23-.65.23-1.2.16-1.32-.07-.12-.25-.19-.53-.33Z" />
    </svg>
  );
}

/** Phone-handset glyph — used on the "Request a callback" tab. */
function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M6.62 10.79a15.53 15.53 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.36 11.36 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z" />
    </svg>
  );
}

export default function FloatingChat() {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "callback">("chat");
  const [messages, setMessages] = useState<Message[]>([
    { from: "bot", text: GREETING_EN },
  ]);
  const [draft, setDraft] = useState("");
  const [faqOpen, setFaqOpen] = useState(false);

  // ── "Request a callback" form ──────────────────────────────────────
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [note, setNote] = useState("");
  const [cbSubmitting, setCbSubmitting] = useState(false);
  const [cbError, setCbError] = useState("");
  const [cbDone, setCbDone] = useState(false);
  const validPhone = PHONE_RE.test(phone);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submitCallback(e: FormEvent) {
    e.preventDefault();
    if (!validPhone || cbSubmitting) return;
    setCbSubmitting(true);
    setCbError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          source: "support-callback",
          topic: topic || undefined,
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("request failed");
      setCbDone(true);
    } catch {
      setCbError(
        t(
          "Couldn't send your request. Please try again.",
          "आपका अनुरोध नहीं भेजा जा सका। कृपया फिर से प्रयास करें।",
        ),
      );
    } finally {
      setCbSubmitting(false);
    }
  }

  function resetCallback() {
    setCbDone(false);
    setPhone("");
    setTopic("");
    setNote("");
    setShowDesc(false);
    setCbError("");
  }

  // Keep the latest message in view as the conversation grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  // Keep the opening greeting in the active language while the chat is still
  // pristine (only the greeting shown). Once the user engages, leave history be.
  useEffect(() => {
    setMessages((prev) =>
      prev.length === 1 && prev[0].from === "bot"
        ? [{ from: "bot", text: lang === "hi" ? GREETING_HI : GREETING_EN }]
        : prev,
    );
  }, [lang]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { from: "user", text: trimmed },
      { from: "bot", text: findAnswer(trimmed, lang) },
    ]);
    setDraft("");
    inputRef.current?.focus();
  }

  function askFaq(faq: { q: string; qHi: string; kb: number }) {
    const k = KNOWLEDGE[faq.kb];
    setMessages((prev) => [
      ...prev,
      { from: "user", text: lang === "hi" ? faq.qHi : faq.q },
      { from: "bot", text: lang === "hi" ? k.answerHi : k.answer },
    ]);
  }

  return (
    <div className="fixed bottom-24 right-5 z-[60] flex flex-col items-end gap-3 lg:bottom-6 lg:right-6">
      {/* ── Chat panel — scaled to 80% from the bottom-right so it grows up
          from the launcher without nudging the launcher off the corner. ── */}
      {open && (
        <div className="animate-rise flex h-[28rem] max-h-[calc(100dvh-6rem)] w-[20rem] max-w-[calc(100vw-1.5rem)] origin-bottom-right scale-[0.8] flex-col overflow-hidden rounded-2xl border border-cream-3 bg-white shadow-[0_18px_50px_rgba(185,32,37,0.28)] [animation-duration:0.4s] sm:h-[32rem] sm:max-h-[calc(100dvh-7rem)] sm:w-[22rem]">
          {/* Header */}
          <div className="flex items-center gap-3 bg-maroon px-4 py-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream/20 text-cream ring-1 ring-cream/40">
              <HeadsetIcon className="h-5 w-5" />
            </span>
            <div className="flex-1 leading-tight">
              <p className="font-display text-base text-cream">{t("Bhojpatra Assistant", "भोजपत्र असिस्टेंट")}</p>
              <p className="flex items-center gap-1.5 text-xs text-cream/80">
                <span className="h-2 w-2 rounded-full bg-cream" /> {t("Online · replies instantly", "ऑनलाइन · तुरंत जवाब")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("Close chat", "चैट बंद करें")}
              className="flex h-8 w-8 items-center justify-center rounded-full text-cream/80 transition-colors hover:bg-cream/15 hover:text-cream"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {/* View switch — Chat ⇄ Request a callback */}
          <div className="bg-white px-3 pt-2.5 pb-1">
            <div className="flex rounded-full bg-cream-2 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setView("chat")}
                aria-pressed={view === "chat"}
                className={`flex-1 rounded-full py-1.5 transition-colors ${
                  view === "chat"
                    ? "bg-maroon text-cream shadow-sm"
                    : "text-maroon hover:bg-cream-3"
                }`}
              >
                {t("Chat", "चैट")}
              </button>
              <button
                type="button"
                onClick={() => setView("callback")}
                aria-pressed={view === "callback"}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 transition-colors ${
                  view === "callback"
                    ? "bg-maroon text-cream shadow-sm"
                    : "text-maroon hover:bg-cream-3"
                }`}
              >
                <PhoneIcon className="h-3.5 w-3.5" />
                {t("Request a callback", "कॉलबैक चाहिए")}
              </button>
            </div>
          </div>

          {view === "chat" && (
          <>
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-surface-beige px-3.5 py-4">
            {messages.map((m, i) => (
              <div key={i} className={m.from === "user" ? "flex justify-end" : "flex justify-start"}>
                <p
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                    m.from === "user"
                      ? "rounded-br-sm bg-maroon text-cream"
                      : "rounded-bl-sm border border-cream-3 bg-white text-ink"
                  }`}
                >
                  {m.text}
                </p>
              </div>
            ))}
          </div>

          {/* Pinned FAQ quick-replies — stacked above the input, WhatsApp-style.
              Collapsed to a single pill; tapping expands the full list. */}
          <div className="border-t border-cream-3 bg-white px-3 pt-2.5">
            {faqOpen && (
              <div className="animate-rise flex flex-col gap-1.5 pb-2 [animation-duration:0.25s]">
                {FAQS.map((faq) => (
                  <button
                    key={faq.q}
                    type="button"
                    onClick={() => askFaq(faq)}
                    className="rounded-full border border-cream-3 bg-surface-beige px-4 py-2 text-left text-sm text-ink transition-colors hover:border-maroon hover:bg-cream-2"
                  >
                    {lang === "hi" ? faq.qHi : faq.q}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setFaqOpen((v) => !v)}
              aria-expanded={faqOpen}
              className="flex w-full items-center justify-between rounded-full bg-cream-2 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-maroon transition-colors hover:bg-cream-3"
            >
              {t("Frequently asked", "अक्सर पूछे जाने वाले")}
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 transition-transform ${faqOpen ? "" : "rotate-180"}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>

          {/* Input + WhatsApp handoff */}
          <div className="bg-white px-3 pb-3 pt-2.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t("Type your question…", "अपना सवाल लिखें…")}
                aria-label={t("Type your question", "अपना सवाल लिखें")}
                className="min-w-0 flex-1 rounded-full border border-cream-3 bg-surface-beige px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-soft focus:border-maroon"
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={!draft.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-maroon text-cream transition-colors hover:bg-maroon-dark disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
                </svg>
              </button>
            </form>
            <a
              href={waLink("Hi Bhojpatra! I'd like help planning my feast booking.")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-2 text-xs font-semibold text-maroon transition-colors hover:text-maroon-dark"
            >
              <WhatsAppIcon className="h-4 w-4" />
              {t("Prefer to talk? Chat on WhatsApp", "बात करना चाहते हैं? WhatsApp पर चैट करें")}
            </a>
          </div>
          </>
          )}

          {/* ── Request a callback ─────────────────────────────────────── */}
          {view === "callback" && (
            <div className="flex-1 overflow-y-auto bg-surface-beige px-4 py-4">
              {cbDone ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-maroon text-cream">
                    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <p className="mt-4 font-display text-lg text-ink">
                    {t("Callback requested", "कॉलबैक का अनुरोध हो गया")}
                  </p>
                  <p className="mt-1.5 max-w-[15rem] text-sm text-ink-soft">
                    {t(
                      `We'll call you on +91 ${phone} within 10 minutes.`,
                      `हम आपको +91 ${phone} पर 10 मिनट के भीतर कॉल करेंगे।`,
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={resetCallback}
                    className="mt-5 rounded-full border border-maroon px-5 py-2 text-sm font-semibold text-maroon transition-colors hover:bg-cream-2"
                  >
                    {t("Request another", "एक और अनुरोध करें")}
                  </button>
                </div>
              ) : (
                <form onSubmit={submitCallback} className="space-y-4">
                  <div>
                    <h3 className="font-display text-lg text-ink">
                      {t("Need help?", "मदद चाहिए?")}
                    </h3>
                    <p className="mt-1 text-sm text-ink-soft">
                      {t(
                        "Tell us what's blocking you — we'll call within 10 mins.",
                        "बताएं क्या रुकावट है — हम 10 मिनट में कॉल करेंगे।",
                      )}
                    </p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label
                      htmlFor="cb-phone"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-soft"
                    >
                      {t("We'll call you on", "हम आपको इस नंबर पर कॉल करेंगे")}
                    </label>
                    <div className="flex items-center overflow-hidden rounded-xl border border-cream-3 bg-white focus-within:border-maroon">
                      <span className="pl-3.5 pr-2 text-sm font-semibold text-ink-soft">+91</span>
                      <input
                        id="cb-phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) =>
                          setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                        }
                        placeholder={t("10-digit mobile number", "10 अंकों का मोबाइल नंबर")}
                        aria-label={t("Your mobile number", "आपका मोबाइल नंबर")}
                        className="min-w-0 flex-1 bg-transparent py-2.5 pr-3.5 text-sm text-ink outline-none placeholder:text-ink-soft"
                      />
                    </div>
                  </div>

                  {/* Topic */}
                  <div className="rounded-2xl border border-cream-3 bg-white p-3.5">
                    <p className="mb-2.5 text-sm font-semibold text-ink">
                      {t("What do you need help with?", "आपको किसमें मदद चाहिए?")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {CALLBACK_TOPICS.map((tp) => {
                        const active = topic === tp.en;
                        return (
                          <button
                            key={tp.en}
                            type="button"
                            onClick={() => setTopic(active ? "" : tp.en)}
                            aria-pressed={active}
                            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                              active
                                ? "border-maroon bg-maroon text-cream"
                                : "border-cream-3 bg-surface-beige text-ink hover:border-maroon"
                            }`}
                          >
                            {lang === "hi" ? tp.hi : tp.en}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional description */}
                  {showDesc ? (
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder={t("Add a description (optional)", "विवरण जोड़ें (वैकल्पिक)")}
                      aria-label={t("Description", "विवरण")}
                      className="w-full resize-none rounded-xl border border-cream-3 bg-white px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink-soft focus:border-maroon"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDesc(true)}
                      className="flex items-center gap-1.5 text-sm font-semibold text-maroon transition-colors hover:text-maroon-dark"
                    >
                      <span className="text-base leading-none">+</span>
                      {t("Add description", "विवरण जोड़ें")}
                    </button>
                  )}

                  {cbError && (
                    <p
                      role="alert"
                      className="rounded-xl border border-maroon/30 bg-cream-2 px-3.5 py-2.5 text-sm text-maroon"
                    >
                      {cbError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={!validPhone || cbSubmitting}
                    className="btn-sheen w-full rounded-full bg-maroon py-3 text-sm font-semibold text-cream shadow-[0_10px_24px_rgba(185,32,37,0.35)] transition-colors hover:bg-maroon-dark disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {cbSubmitting
                      ? t("Sending…", "भेजा जा रहा है…")
                      : t("Request callback", "कॉलबैक का अनुरोध करें")}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Launcher bubble ─────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? t("Close chat", "चैट बंद करें") : t("Chat with Bhojpatra", "भोजपत्र से चैट करें")}
        className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-maroon text-cream shadow-[0_8px_24px_rgba(185,32,37,0.45)] ring-2 ring-cream transition-transform hover:scale-105 active:scale-95 sm:h-14 sm:w-14"
      >
        {!open && <span className="absolute inset-0 animate-ping rounded-2xl bg-maroon/40" />}
        {open ? (
          <svg viewBox="0 0 24 24" className="relative h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <HeadsetIcon className="relative h-7 w-7 sm:h-8 sm:w-8" />
        )}
      </button>
    </div>
  );
}
