"use client";

import Reveal from "@/components/Reveal";
import { useLang } from "@/lib/i18n";

/** Trust stats shown as a band beneath the About intro. */
const STATS: { value: string; label: string; labelHi: string }[] = [
  { value: "500+", label: "Verified specialists", labelHi: "सत्यापित विशेषज्ञ" },
  { value: "20+", label: "Cities served", labelHi: "सेवित शहर" },
  { value: "10,000+", label: "Happy celebrations", labelHi: "खुशहाल आयोजन" },
];

/** The four reasons families choose Bhojpatra, rendered as cards. */
const REASONS: {
  title: string;
  titleHi: string;
  body: string;
  bodyHi: string;
}[] = [
  {
    title: "Specialist-first",
    titleHi: "विशेषज्ञ-पहले",
    body: "We curate the best chaat-walas, halwais and live counters instead of one-size catering.",
    bodyHi:
      "हम एक जैसी कैटरिंग के बजाय बेहतरीन चाट-वालों, हलवाइयों और लाइव काउंटरों को चुनते हैं।",
  },
  {
    title: "Transparent pricing",
    titleHi: "पारदर्शी मूल्य",
    body: "Plate-level pricing across Silver, Gold and Platinum — no hidden surprises.",
    bodyHi:
      "Silver, Gold और Platinum में प्लेट-स्तर की कीमतें — कोई छिपा हुआ खर्च नहीं।",
  },
  {
    title: "Dedicated curator",
    titleHi: "समर्पित क्यूरेटर",
    body: "A real human guides you from menu to last service.",
    bodyHi: "एक असली इंसान आपको मेन्यू से लेकर आख़िरी परोसने तक मार्गदर्शन देता है।",
  },
  {
    title: "Trusted vendors",
    titleHi: "भरोसेमंद विक्रेता",
    body: "Every kitchen is vetted on hygiene, taste, and celebration experience.",
    bodyHi:
      "हर रसोई को स्वच्छता, स्वाद और आयोजन के अनुभव पर परखा जाता है।",
  },
];

export default function AboutHighlights() {
  const { lang, t } = useLang();

  return (
    <section className="mx-auto max-w-3xl px-5 pb-4 sm:pb-8">
      {/* Trust stats */}
      <Reveal
        stagger
        from="up"
        className="grid grid-cols-3 gap-3 rounded-2xl border border-cream-3 bg-maroon p-6 text-center sm:gap-6 sm:p-8"
      >
        {STATS.map((s) => (
          <div key={s.value}>
            <p className="font-display text-2xl text-cream sm:text-4xl">
              {s.value}
            </p>
            <p className="mt-1 text-xs text-cream/80 sm:text-sm">
              {lang === "hi" ? s.labelHi : s.label}
            </p>
          </div>
        ))}
      </Reveal>

      {/* Why families choose Bhojpatra */}
      <Reveal as="h2" className="mt-12 text-2xl text-ink sm:text-3xl">
        {t("Why families choose Bhojpatra", "परिवार Bhojpatra क्यों चुनते हैं")}
      </Reveal>

      <Reveal
        stagger
        from="alt"
        className="mt-6 grid gap-4 sm:grid-cols-2"
      >
        {REASONS.map((r) => (
          <article
            key={r.title}
            className="rounded-2xl border border-cream-3 bg-white p-6 shadow-sm transition-transform duration-300 hover:-translate-y-0.5"
          >
            <h3 className="font-display text-lg font-semibold text-maroon">
              {lang === "hi" ? r.titleHi : r.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {lang === "hi" ? r.bodyHi : r.body}
            </p>
          </article>
        ))}
      </Reveal>
    </section>
  );
}
