"use client";

import { useState } from "react";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import { Field, inputClass } from "@/components/admin/shared/FormControls";
import {
  useSiteContent,
  saveSiteContent,
  type ContactInfo,
} from "@/lib/sitePages";

/**
 * Admin editor for the Contact page's business details. Edits are saved to the
 * shared site-content store and reflected on the public /contact page.
 */
export default function ContactInfoTab() {
  const content = useSiteContent();
  const [draft, setDraft] = useState<ContactInfo>(content.contact);
  const [saved, setSaved] = useState(false);

  const set = (patch: Partial<ContactInfo>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setSaved(false);
  };

  const save = () => {
    saveSiteContent({ ...content, contact: draft });
    setSaved(true);
  };

  return (
    <WidgetCard>
      <div className="flex items-center justify-between">
        <a
          href="/contact"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-ink-soft hover:underline"
        >
          View contact page
        </a>
        {saved && (
          <span className="text-xs font-medium text-maroon">Saved ✓</span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Eyebrow">
          <input
            className={inputClass}
            value={draft.eyebrow}
            onChange={(e) => set({ eyebrow: e.target.value })}
          />
        </Field>
        <Field label="Heading">
          <input
            className={inputClass}
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Intro">
          <textarea
            rows={2}
            className={inputClass + " resize-y"}
            value={draft.intro}
            onChange={(e) => set({ intro: e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Phone (display)">
          <input
            className={inputClass}
            value={draft.phoneDisplay}
            onChange={(e) => set({ phoneDisplay: e.target.value })}
          />
        </Field>
        <Field label="WhatsApp number" hint="Digits only, with country code.">
          <input
            className={inputClass}
            value={draft.whatsapp}
            onChange={(e) => set({ whatsapp: e.target.value })}
          />
        </Field>
        <Field label="Email">
          <input
            className={inputClass}
            value={draft.email}
            onChange={(e) => set({ email: e.target.value })}
          />
        </Field>
        <Field label="Hours">
          <input
            className={inputClass}
            value={draft.hours}
            onChange={(e) => set({ hours: e.target.value })}
          />
        </Field>
        <Field label="Instagram handle">
          <input
            className={inputClass}
            value={draft.instagram}
            onChange={(e) => set({ instagram: e.target.value })}
          />
        </Field>
        <Field label="Website" hint="Domain only, without https://">
          <input
            className={inputClass}
            value={draft.website}
            onChange={(e) => set({ website: e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Address">
          <input
            className={inputClass}
            value={draft.address}
            onChange={(e) => set({ address: e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={save}
          className="rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark"
        >
          Save changes
        </button>
      </div>
    </WidgetCard>
  );
}
