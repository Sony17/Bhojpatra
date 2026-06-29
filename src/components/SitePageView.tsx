"use client";

import { useSitePage } from "@/lib/sitePages";
import { useLang } from "@/lib/i18n";

/**
 * Public renderer for the editable "Company" pages (About Us, Careers,
 * Terms & Privacy). Content is read live from the admin-editable store, so a
 * save in Admin → Content Control → Pages shows up here immediately.
 */
export default function SitePageView({ slug }: { slug: string }) {
  const page = useSitePage(slug);
  const { lang, t } = useLang();

  if (!page) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h1 className="text-2xl text-ink">{t("Page not found", "पेज नहीं मिला")}</h1>
        <p className="mt-2 text-ink-soft">
          {t(
            "This page hasn't been set up yet.",
            "यह पेज अभी तक सेट नहीं किया गया है।",
          )}
        </p>
      </section>
    );
  }

  const eyebrow = lang === "hi" ? page.eyebrowHi : page.eyebrow;
  const title = lang === "hi" ? page.titleHi : page.title;
  const intro = lang === "hi" ? page.introHi : page.intro;

  return (
    <section className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <header className="max-w-2xl">
        <p className="eyebrow text-sm font-medium text-gold">{eyebrow}</p>
        <h1 className="mt-2 text-3xl text-ink sm:text-4xl">{title}</h1>
        {intro && (
          <p className="font-script mt-3 text-xl text-ink-soft">{intro}</p>
        )}
      </header>

      <div className="mt-10 space-y-8">
        {page.sections.map((section) => {
          const heading = lang === "hi" ? section.headingHi : section.heading;
          const body = lang === "hi" ? section.bodyHi : section.body;
          return (
            <article
              key={section.id}
              className="rounded-2xl border border-cream-3 bg-white p-6 shadow-sm sm:p-8"
            >
              <h2 className="font-display text-xl font-semibold text-ink">
                {heading}
              </h2>
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-ink-soft">
                {body.split("\n").map((line, i) =>
                  line.trim() ? <p key={i}>{line}</p> : null,
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
