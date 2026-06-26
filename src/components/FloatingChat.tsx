"use client";

import { useEffect, useRef, useState } from "react";

/* Bhojpatra contact — mirrors the placeholder in the Footer. Swap for the
   real WhatsApp business number later. */
const WHATSAPP_NUMBER = "911234567890";

const waLink = (text: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

/* ── Knowledge base ───────────────────────────────────────────────────
   Self-contained, scripted answers. Each entry matches on keywords; the
   first match wins. Anything unmatched falls back to a WhatsApp handoff. */
interface Knowledge {
  keywords: string[];
  answer: string;
}

const KNOWLEDGE: Knowledge[] = [
  {
    keywords: ["price", "cost", "plate", "package", "budget", "rate", "charge", "fee"],
    answer:
      "Our per-plate packages:\n• Silver — ₹799\n• Gold — ₹1199 (most popular)\n• Platinum — ₹1599+\n\nEvery package is fully customizable to your menu and guest count.",
  },
  {
    keywords: ["city", "cities", "location", "where", "area", "serve", "available", "near"],
    answer:
      "We cover 500+ cities across India — including Lucknow, Delhi, Mumbai, Bengaluru, Kolkata, Hyderabad, Jaipur and Pune. Tell us your city and we'll match you with local specialists.",
  },
  {
    keywords: ["occasion", "wedding", "haldi", "mehndi", "tilak", "engagement", "reception", "birthday", "corporate", "event", "party"],
    answer:
      "We cater every celebration — Weddings, Engagements, Tilak, Haldi, Mehndi, Receptions, Birthday Parties and Corporate Events. Which one are you planning?",
  },
  {
    keywords: ["book", "booking", "process", "step", "how", "start", "begin"],
    answer:
      "Booking takes 4 easy steps:\n1. Choose your occasion\n2. Select a package\n3. Pick your specialists\n4. Review & confirm\n\nYou'll get instant confirmation — we assist end-to-end.",
  },
  {
    keywords: ["vendor", "specialist", "caterer", "verified", "trust", "safe", "quality", "review"],
    answer:
      "Every one of our 10,000+ specialists is verified and rated by real customers (we average 4.8/5 across 1 Lakh+ happy customers). You can compare menus and reviews before you choose.",
  },
  {
    keywords: ["contact", "call", "phone", "human", "talk", "agent", "support", "whatsapp", "help"],
    answer:
      "Happy to connect you with our team! Tap “Chat on WhatsApp” below and we'll reply instantly. 🙏",
  },
];

function findAnswer(input: string): string {
  const text = input.toLowerCase();
  const hit = KNOWLEDGE.find((k) => k.keywords.some((w) => text.includes(w)));
  return (
    hit?.answer ??
    "I'm not fully sure about that one — but our team can help right away. Tap “Chat on WhatsApp” below and we'll get you sorted. 🙏"
  );
}

/* Collapsible FAQ shortcuts — tapping one drops the answer straight into chat. */
const FAQS: { q: string; a: string }[] = [
  { q: "What does it cost?", a: KNOWLEDGE[0].answer },
  { q: "Which cities do you serve?", a: KNOWLEDGE[1].answer },
  { q: "How does booking work?", a: KNOWLEDGE[3].answer },
  { q: "Are your vendors verified?", a: KNOWLEDGE[4].answer },
];

interface Message {
  from: "bot" | "user";
  text: string;
}

const GREETING: Message = {
  from: "bot",
  text: "Namaste! 🙏 I'm the Bhojpatra assistant. Ask me about pricing, occasions, cities or booking — or pick a question below.",
};

/** Official WhatsApp glyph. */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden>
      <path d="M16.04 4C9.93 4 4.98 8.95 4.98 15.06c0 1.95.51 3.86 1.48 5.54L4.9 27.1l6.66-1.74a11 11 0 0 0 5.29 1.35h.01c6.11 0 11.06-4.95 11.06-11.06C27.92 8.95 22.97 4 16.04 4Zm0 20.27h-.01a9.2 9.2 0 0 1-4.68-1.28l-.34-.2-3.95 1.03 1.05-3.85-.22-.35a9.16 9.16 0 0 1-1.41-4.89c0-5.07 4.13-9.2 9.21-9.2 2.46 0 4.77.96 6.51 2.7a9.13 9.13 0 0 1 2.7 6.51c0 5.08-4.13 9.21-9.2 9.21Zm5.05-6.89c-.28-.14-1.64-.81-1.89-.9-.25-.09-.43-.14-.62.14-.18.28-.71.9-.87 1.08-.16.18-.32.21-.6.07-.28-.14-1.17-.43-2.22-1.37-.82-.73-1.38-1.64-1.54-1.92-.16-.28-.02-.43.12-.57.13-.12.28-.32.41-.48.14-.16.18-.28.28-.46.09-.18.05-.35-.02-.49-.07-.14-.62-1.5-.85-2.05-.22-.54-.45-.46-.62-.47l-.53-.01c-.18 0-.48.07-.74.35-.25.28-.96.94-.96 2.3 0 1.36.99 2.67 1.13 2.85.14.18 1.95 2.98 4.73 4.18.66.29 1.18.46 1.58.59.66.21 1.27.18 1.74.11.53-.08 1.64-.67 1.87-1.32.23-.65.23-1.2.16-1.32-.07-.12-.25-.19-.53-.33Z" />
    </svg>
  );
}

export default function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [faqOpen, setFaqOpen] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the latest message in view as the conversation grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { from: "user", text: trimmed },
      { from: "bot", text: findAnswer(trimmed) },
    ]);
    setDraft("");
    inputRef.current?.focus();
  }

  function askFaq(faq: { q: string; a: string }) {
    setMessages((prev) => [...prev, { from: "user", text: faq.q }, { from: "bot", text: faq.a }]);
  }

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {/* ── Chat panel ──────────────────────────────────────────────── */}
      {open && (
        <div className="animate-rise flex h-[32rem] max-h-[calc(100dvh-7rem)] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-cream-3 bg-white shadow-[0_18px_50px_rgba(142,23,27,0.28)] [animation-duration:0.4s]">
          {/* Header */}
          <div className="flex items-center gap-3 bg-maroon px-4 py-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream/20 text-cream ring-1 ring-cream/40">
              <WhatsAppIcon className="h-5 w-5" />
            </span>
            <div className="flex-1 leading-tight">
              <p className="font-display text-base text-cream">Bhojpatra Assistant</p>
              <p className="flex items-center gap-1.5 text-xs text-cream/80">
                <span className="h-2 w-2 rounded-full bg-cream" /> Online · replies instantly
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="flex h-8 w-8 items-center justify-center rounded-full text-cream/80 transition-colors hover:bg-cream/15 hover:text-cream"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

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

            {/* Collapsible FAQ shortcuts */}
            <div className="overflow-hidden rounded-xl border border-cream-3 bg-white">
              <button
                type="button"
                onClick={() => setFaqOpen((v) => !v)}
                aria-expanded={faqOpen}
                className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-maroon"
              >
                Frequently asked
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 transition-transform ${faqOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {faqOpen && (
                <div className="flex flex-col gap-1.5 px-2.5 pb-2.5">
                  {FAQS.map((faq) => (
                    <button
                      key={faq.q}
                      type="button"
                      onClick={() => askFaq(faq)}
                      className="rounded-lg border border-cream-3 bg-surface-beige px-3 py-2 text-left text-sm text-ink transition-colors hover:border-maroon hover:bg-cream-2"
                    >
                      {faq.q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Input + WhatsApp handoff */}
          <div className="border-t border-cream-3 bg-white px-3 pb-3 pt-2.5">
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
                placeholder="Type your question…"
                aria-label="Type your question"
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
              Prefer to talk? Chat on WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* ── Launcher bubble ─────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close chat" : "Chat with Bhojpatra"}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-maroon text-cream shadow-[0_8px_24px_rgba(142,23,27,0.45)] ring-2 ring-cream transition-transform hover:scale-105 active:scale-95"
      >
        {!open && <span className="absolute inset-0 animate-ping rounded-full bg-maroon/40" />}
        {open ? (
          <svg viewBox="0 0 24 24" className="relative h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="relative h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6a8.5 8.5 0 0 1-.9-3.9 8.38 8.38 0 0 1 8.5-8.5 8.38 8.38 0 0 1 8.5 8.5Z" />
            <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />
          </svg>
        )}
      </button>
    </div>
  );
}
