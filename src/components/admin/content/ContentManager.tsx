"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import Tabs, { type TabItem } from "@/components/admin/shared/Tabs";
import Modal from "@/components/admin/shared/Modal";
import EmptyState from "@/components/admin/shared/EmptyState";
import { Field, inputClass, Toggle } from "@/components/admin/shared/FormControls";
import { StarSolid } from "@/components/admin/shared/icons";
import { Button } from "@/components/ui";
import type { ContentBanner, ContentTestimonial, ContentFaq } from "@/lib/admin/types";
import PagesTab from "./PagesTab";
import ContactInfoTab from "./ContactInfoTab";
import HomePageTab from "./HomePageTab";

const TABS: TabItem[] = [
  { id: "home", label: "Home Page" },
  { id: "pages", label: "Pages" },
  { id: "contact", label: "Contact Info" },
  { id: "banners", label: "Banners" },
  { id: "testimonials", label: "Testimonials" },
  { id: "faq", label: "FAQ" },
];

export default function ContentManager() {
  const [tab, setTab] = useState("home");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Content Control"
        subtitle="Edit the home page, site pages, contact details, banners, testimonials and FAQs."
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "home" && <HomePageTab />}
      {tab === "pages" && <PagesTab />}
      {tab === "contact" && <ContactInfoTab />}
      {tab === "banners" && <BannersTab />}
      {tab === "testimonials" && <TestimonialsTab />}
      {tab === "faq" && <FaqTab />}
    </div>
  );
}

/* ── Shared content hook ──────────────────────────────────────────────────── */

// Load one content kind from the API and PATCH edits/toggles back. Optimistic:
// the UI updates immediately, then reconciles with the server's copy.
function useContentList<T extends { id: string }>(kind: string) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/content?kind=${kind}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (active && json?.items) setRows(json.items as T[]);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [kind]);

  const patch = async (id: string, changes: Partial<T>) => {
    const prev = rows;
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...changes } : r)));
    try {
      const res = await fetch(`/api/content/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!res.ok) throw new Error();
      const json = (await res.json().catch(() => null)) as { item?: T } | null;
      if (json?.item) setRows((p) => p.map((r) => (r.id === id ? json.item! : r)));
    } catch {
      setRows(prev); // rollback
    }
  };

  return { rows, loading, patch };
}

/* ── Banners ──────────────────────────────────────────────────────────────── */

function BannersTab() {
  const { rows, loading, patch } = useContentList<ContentBanner>("banner");
  const [draft, setDraft] = useState<ContentBanner | null>(null);

  const toggle = (id: string, active: boolean) => patch(id, { active: !active });
  const save = (b: ContentBanner) => {
    patch(b.id, { title: b.title, subtitle: b.subtitle, placement: b.placement });
    setDraft(null);
  };

  return (
    <div className="space-y-4">
      {rows.length === 0 && (
        <EmptyState title={loading ? "Loading banners…" : "No banners"} />
      )}
      {rows.map((b) => (
        <WidgetCard key={b.id}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-ink">{b.title}</p>
                <span className="rounded-full bg-cream-2 px-2.5 py-0.5 text-[11px] font-medium text-ink-soft">{b.placement}</span>
              </div>
              <p className="mt-0.5 text-sm text-ink-soft">{b.subtitle}</p>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-ink-soft">
                <Toggle checked={b.active} onChange={() => toggle(b.id, b.active)} label={`Toggle ${b.title}`} /> Active
              </label>
              <Button variant="ghost" size="sm" onClick={() => setDraft(b)}>Edit</Button>
            </div>
          </div>
        </WidgetCard>
      ))}

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title="Edit Banner"
        footer={draft && <SaveCancel onCancel={() => setDraft(null)} onSave={() => save(draft)} />}
      >
        {draft && (
          <div className="space-y-4">
            <Field label="Title"><input className={inputClass} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
            <Field label="Subtitle"><input className={inputClass} value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} /></Field>
            <Field label="Placement"><input className={inputClass} value={draft.placement} onChange={(e) => setDraft({ ...draft, placement: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ── Testimonials ─────────────────────────────────────────────────────────── */

function TestimonialsTab() {
  const { rows, loading, patch } = useContentList<ContentTestimonial>("testimonial");
  const [draft, setDraft] = useState<ContentTestimonial | null>(null);

  const toggle = (id: string, visible: boolean) => patch(id, { visible: !visible });
  const save = (t: ContentTestimonial) => {
    patch(t.id, { name: t.name, city: t.city, rating: t.rating, quote: t.quote });
    setDraft(null);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {rows.length === 0 && (
        <EmptyState title={loading ? "Loading testimonials…" : "No testimonials"} />
      )}
      {rows.map((t) => (
        <WidgetCard key={t.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-ink">{t.name} <span className="text-xs font-normal text-ink-soft">· {t.city}</span></p>
              <div className="mt-0.5 flex items-center gap-0.5 text-maroon">
                {Array.from({ length: t.rating }).map((_, i) => <StarSolid key={i} className="h-3.5 w-3.5" />)}
              </div>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-xs text-ink-soft">
              <Toggle checked={t.visible} onChange={() => toggle(t.id, t.visible)} label={`Toggle ${t.name}`} /> Visible
            </label>
          </div>
          <p className="mt-2 text-sm text-ink-soft">&ldquo;{t.quote}&rdquo;</p>
          <Button variant="ghost" size="sm" onClick={() => setDraft(t)} className="mt-3">Edit</Button>
        </WidgetCard>
      ))}

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title="Edit Testimonial"
        footer={draft && <SaveCancel onCancel={() => setDraft(null)} onSave={() => save(draft)} />}
      >
        {draft && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name"><input className={inputClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
              <Field label="City"><input className={inputClass} value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></Field>
            </div>
            <Field label="Rating (1–5)"><input type="number" min={1} max={5} className={inputClass} value={draft.rating} onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })} /></Field>
            <Field label="Quote"><textarea rows={3} className={inputClass + " resize-y"} value={draft.quote} onChange={(e) => setDraft({ ...draft, quote: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ── FAQ ──────────────────────────────────────────────────────────────────── */

function FaqTab() {
  const { rows, loading, patch } = useContentList<ContentFaq>("faq");
  const [draft, setDraft] = useState<ContentFaq | null>(null);

  const toggle = (id: string, visible: boolean) => patch(id, { visible: !visible });
  const save = (f: ContentFaq) => {
    patch(f.id, { question: f.question, answer: f.answer });
    setDraft(null);
  };

  return (
    <div className="space-y-4">
      {rows.length === 0 && (
        <EmptyState title={loading ? "Loading FAQs…" : "No FAQs"} />
      )}
      {rows.map((f) => (
        <WidgetCard key={f.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-ink">{f.question}</p>
              <p className="mt-0.5 text-sm text-ink-soft">{f.answer}</p>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-xs text-ink-soft">
              <Toggle checked={f.visible} onChange={() => toggle(f.id, f.visible)} label={`Toggle FAQ`} /> Visible
            </label>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setDraft(f)} className="mt-3">Edit</Button>
        </WidgetCard>
      ))}

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title="Edit FAQ"
        footer={draft && <SaveCancel onCancel={() => setDraft(null)} onSave={() => save(draft)} />}
      >
        {draft && (
          <div className="space-y-4">
            <Field label="Question"><input className={inputClass} value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} /></Field>
            <Field label="Answer"><textarea rows={3} className={inputClass + " resize-y"} value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SaveCancel({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  return (
    <>
      <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      <Button variant="primary" onClick={onSave}>Save changes</Button>
    </>
  );
}
