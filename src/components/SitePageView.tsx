"use client";

import { useSitePage } from "@/lib/sitePages";
import { useLang } from "@/lib/i18n";
import { AppBar, Card, EmptyState } from "@/components/ui";

/**
 * Public renderer for the editable "Company" pages (About Us, Careers,
 * Terms & Privacy). Content is read live from the admin-editable store, so a
 * save in Admin → Content Control → Pages shows up here immediately.
 */
export default function SitePageView({
  slug,
  hideBar = false,
}: {
  slug: string;
  hideBar?: boolean;
}) {
  const page = useSitePage(slug);
  const { lang, t } = useLang();

  if (!page) {
    return (
      <>
        <AppBar title={t("Page not found", "पेज नहीं मिला")} backHref="/" />
        <section className="mx-auto max-w-3xl px-4 py-8 sm:px-5 sm:py-12">
          <EmptyState
            title={t("Page not found", "पेज नहीं मिला")}
            message={t(
              "This page hasn't been set up yet.",
              "यह पेज अभी तक सेट नहीं किया गया है।",
            )}
          />
        </section>
      </>
    );
  }

  const eyebrow = lang === "hi" ? page.eyebrowHi : page.eyebrow;
  const title = lang === "hi" ? page.titleHi : page.title;
  const intro = lang === "hi" ? page.introHi : page.intro;

  return (
    <>
      {!hideBar && <AppBar title={title} backHref="/" />}
      <section className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-10">
        <header className="max-w-2xl">
          <p className="text-caption font-semibold uppercase tracking-wide text-maroon">
            {eyebrow}
          </p>
          <h1 className="text-app-title mt-2 text-ink">{title}</h1>
          {intro && (
            <p className="text-subtitle mt-3 text-ink/55">{intro}</p>
          )}
        </header>

        <div className="mt-8 space-y-4 sm:space-y-6">
          {page.sections.map((section) => {
            const heading = lang === "hi" ? section.headingHi : section.heading;
            const body = lang === "hi" ? section.bodyHi : section.body;
            return (
              <Card key={section.id} padding="lg">
                <h2 className="font-display text-lg font-semibold text-ink sm:text-xl">
                  {heading}
                </h2>
                <div className="text-body mt-3 space-y-2 text-ink/55">
                  {body.split("\n").map((line, i) =>
                    line.trim() ? <p key={i}>{line}</p> : null,
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </>
  );
}
