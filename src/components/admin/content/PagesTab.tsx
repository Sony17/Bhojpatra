"use client";

import { useState } from "react";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import Modal from "@/components/admin/shared/Modal";
import { Field, inputClass } from "@/components/admin/shared/FormControls";
import {
  useSiteContent,
  saveSiteContent,
  type SitePage,
  type SiteSection,
} from "@/lib/sitePages";

/**
 * Admin editor for the public "Company" pages (About Us, Careers,
 * Terms & Privacy). Edits are saved to the shared site-content store, so the
 * matching public page reflects them immediately.
 */
export default function PagesTab() {
  const content = useSiteContent();
  const [draft, setDraft] = useState<SitePage | null>(null);

  const save = (page: SitePage) => {
    void saveSiteContent({
      ...content,
      pages: content.pages.map((p) => (p.slug === page.slug ? page : p)),
    }).catch(() => {});
    setDraft(null);
  };

  return (
    <div className="space-y-4">
      {content.pages.map((page) => (
        <WidgetCard key={page.slug}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-ink">{page.navLabel}</p>
                <span className="rounded-full bg-cream-2 px-2.5 py-0.5 text-[11px] font-medium text-ink-soft">
                  /{page.slug}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-ink-soft">
                {page.title} · {page.sections.length} section
                {page.sections.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <a
                href={`/${page.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-ink-soft hover:underline"
              >
                View page
              </a>
              <button
                type="button"
                onClick={() => setDraft(structuredClone(page))}
                className="text-sm font-semibold text-maroon hover:underline"
              >
                Edit
              </button>
            </div>
          </div>
        </WidgetCard>
      ))}

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft ? `Edit ${draft.navLabel}` : "Edit Page"}
        footer={
          draft && (
            <SaveCancel onCancel={() => setDraft(null)} onSave={() => save(draft)} />
          )
        }
      >
        {draft && <PageForm draft={draft} setDraft={setDraft} />}
      </Modal>
    </div>
  );
}

function PageForm({
  draft,
  setDraft,
}: {
  draft: SitePage;
  setDraft: (p: SitePage) => void;
}) {
  const set = (patch: Partial<SitePage>) => setDraft({ ...draft, ...patch });

  const setSection = (id: string, patch: Partial<SiteSection>) =>
    set({
      sections: draft.sections.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    });

  const addSection = () =>
    set({
      sections: [
        ...draft.sections,
        {
          id: `${draft.slug}-${Date.now()}`,
          heading: "New section",
          headingHi: "नया अनुभाग",
          body: "",
          bodyHi: "",
        },
      ],
    });

  const removeSection = (id: string) =>
    set({ sections: draft.sections.filter((s) => s.id !== id) });

  return (
    <div className="space-y-5">
      <Field label="Eyebrow">
        <input
          className={inputClass}
          value={draft.eyebrow}
          onChange={(e) => set({ eyebrow: e.target.value })}
        />
      </Field>
      <Field label="Title">
        <input
          className={inputClass}
          value={draft.title}
          onChange={(e) => set({ title: e.target.value })}
        />
      </Field>
      <Field label="Intro">
        <textarea
          rows={2}
          className={inputClass + " resize-y"}
          value={draft.intro}
          onChange={(e) => set({ intro: e.target.value })}
        />
      </Field>

      <div className="space-y-4 border-t border-cream-3 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Sections
          </p>
          <button
            type="button"
            onClick={addSection}
            className="text-sm font-semibold text-maroon hover:underline"
          >
            + Add section
          </button>
        </div>

        {draft.sections.map((section, i) => (
          <div
            key={section.id}
            className="space-y-3 rounded-lg border border-cream-3 bg-cream/30 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-soft">
                Section {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeSection(section.id)}
                className="text-xs font-semibold text-maroon hover:underline"
              >
                Remove
              </button>
            </div>
            <Field label="Heading">
              <input
                className={inputClass}
                value={section.heading}
                onChange={(e) =>
                  setSection(section.id, { heading: e.target.value })
                }
              />
            </Field>
            <Field label="Body" hint="Use a new line to start a new paragraph.">
              <textarea
                rows={4}
                className={inputClass + " resize-y"}
                value={section.body}
                onChange={(e) =>
                  setSection(section.id, { body: e.target.value })
                }
              />
            </Field>
          </div>
        ))}
      </div>
    </div>
  );
}

function SaveCancel({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full border border-cream-3 px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-cream-2"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        className="rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark"
      >
        Save changes
      </button>
    </>
  );
}
