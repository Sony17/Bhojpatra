"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import Tabs, { type TabItem } from "@/components/admin/shared/Tabs";
import Modal from "@/components/admin/shared/Modal";
import EmptyState from "@/components/admin/shared/EmptyState";
import { Field, inputClass, Toggle } from "@/components/admin/shared/FormControls";
import { StarSolid } from "@/components/admin/shared/icons";
import { Button } from "@/components/ui";
import {
  useHomeContent,
  useHomeContentLoaded,
  saveHomeContent,
} from "@/lib/homeContent";
import type { ContentBanner, ContentFaq } from "@/lib/admin/types";
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

/* ── Testimonials (mirrors the public home page) ──────────────────────────── */

// A customer review row as returned by GET /api/admin/reviews — the subset of
// the public `StoredReview` shape this tab renders.
interface AdminReview {
  id: string;
  vendor: string;
  name: string;
  occasion: string;
  city: string;
  rating: number;
  comment: string;
  createdAt: string;
  hidden?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Two rows of the two-column customer-reviews grid. */
const REVIEWS_PER_PAGE = 4;

type ReviewPeriod = "week" | "month" | "all";
const REVIEW_PERIODS: { id: ReviewPeriod; label: string }[] = [
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "all", label: "All time" },
];

/** Filled maroon stars, clamped to 0–5. */
function Stars({ rating }: { rating: number }) {
  return (
    <div className="mt-0.5 flex items-center gap-0.5 text-maroon">
      {Array.from({ length: Math.max(0, Math.min(5, Math.round(rating))) }).map(
        (_, i) => (
          <StarSolid key={i} className="h-3.5 w-3.5" />
        ),
      )}
    </div>
  );
}

/**
 * Everything shown in the home-page testimonials carousel, gathered in one place
 * so an admin can take any of it down. The carousel reads two sources and this
 * tab mirrors both:
 *   1. Live customer reviews (the `reviews` table) — hide / restore per review.
 *   2. Curated testimonials (the home-content store, also editable under the
 *      Home Page tab) — remove per item.
 */
function TestimonialsTab() {
  const home = useHomeContent();
  const homeLoaded = useHomeContentLoaded();
  const curated = home.testimonials.items;

  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);

  // Narrow the (potentially long) review list to a recent window, then page
  // through it two rows at a time so the section never dumps everything at once.
  const [period, setPeriod] = useState<ReviewPeriod>("month");
  const [page, setPage] = useState(0);
  // "Now" is stamped once when the list loads (in an async callback, never during
  // render) so the week / month windows have a stable reference point.
  const [loadedAt, setLoadedAt] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/reviews", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        // Only reviews with a written comment surface as testimonials.
        if (active && json?.reviews) {
          setReviews(
            (json.reviews as AdminReview[]).filter((r) => r.comment?.trim()),
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) {
          setLoadedAt(Date.now());
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Switch window and jump back to the first page in one user action (avoids a
  // page-resetting effect).
  const selectPeriod = (next: ReviewPeriod) => {
    setPeriod(next);
    setPage(0);
  };

  // Reviews within the selected window (week / month / all), newest first.
  const filtered = useMemo(() => {
    if (period === "all" || !loadedAt) return reviews;
    const windowMs = period === "week" ? 7 * DAY_MS : 30 * DAY_MS;
    const cutoff = loadedAt - windowMs;
    return reviews.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      return Number.isFinite(t) && t >= cutoff;
    });
  }, [reviews, period, loadedAt]);

  // Two rows of the two-column grid per page.
  const pageCount = Math.max(1, Math.ceil(filtered.length / REVIEWS_PER_PAGE));
  const clampedPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(
    clampedPage * REVIEWS_PER_PAGE,
    clampedPage * REVIEWS_PER_PAGE + REVIEWS_PER_PAGE,
  );

  // Optimistically hide / restore a customer review; roll back on failure.
  const setHidden = async (id: string, hidden: boolean) => {
    const prev = reviews;
    setReviews((rs) => rs.map((r) => (r.id === id ? { ...r, hidden } : r)));
    try {
      const res = await fetch(`/api/admin/reviews/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setReviews(prev);
    }
  };

  // Drop a curated testimonial from the home content and persist. Guarded on
  // `homeLoaded` so a click before the fetch lands can't save the seed defaults
  // over the stored content.
  const removeCurated = (id: string) => {
    if (!homeLoaded) return;
    if (!window.confirm("Remove this testimonial from the home page?")) return;
    const nextItems = curated.filter((t) => t.id !== id);
    void saveHomeContent({
      ...home,
      testimonials: { ...home.testimonials, items: nextItems },
    }).catch(() => {});
  };

  return (
    <div className="space-y-8">
      {/* Live customer reviews */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink">Customer reviews</h3>
            <p className="mt-0.5 max-w-2xl text-sm text-ink-soft">
              Real reviews left by customers. These show in the home-page
              testimonials carousel (one per order). Remove any you don&rsquo;t
              want shown — it&rsquo;s hidden from the whole site and stops counting
              toward the vendor&rsquo;s rating. You can restore it later.
            </p>
          </div>
          <div className="flex shrink-0 rounded-full border border-cream-3 bg-cream/40 p-0.5">
            {REVIEW_PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPeriod(p.id)}
                aria-pressed={period === p.id}
                className={
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors " +
                  (period === p.id
                    ? "bg-maroon text-cream"
                    : "text-ink-soft hover:text-ink")
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={
              loading
                ? "Loading reviews…"
                : reviews.length === 0
                  ? "No customer reviews yet"
                  : "No reviews in this period"
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {visible.map((r) => (
              <WidgetCard
                key={r.id}
                className={r.hidden ? "opacity-60" : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">
                      {r.name}
                      {(r.occasion || r.city) && (
                        <span className="text-xs font-normal text-ink-soft">
                          {" · "}
                          {[r.occasion, r.city].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </p>
                    <Stars rating={r.rating} />
                  </div>
                  <span
                    className={
                      "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium " +
                      (r.hidden
                        ? "bg-cream-2 text-ink-soft"
                        : "bg-maroon/10 text-maroon")
                    }
                  >
                    {r.hidden ? "Hidden" : "On home page"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink-soft">
                  &ldquo;{r.comment}&rdquo;
                </p>
                <p className="mt-2 text-xs text-ink-soft">
                  {r.vendor} · {new Date(r.createdAt).toLocaleDateString()}
                </p>
                {r.hidden ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setHidden(r.id, false)}
                    className="mt-3"
                  >
                    Restore
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setHidden(r.id, true)}
                    className="mt-3"
                  >
                    Remove from site
                  </Button>
                )}
              </WidgetCard>
            ))}
          </div>
        )}

        {pageCount > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-ink-soft">
              Showing {clampedPage * REVIEWS_PER_PAGE + 1}–
              {clampedPage * REVIEWS_PER_PAGE + visible.length} of{" "}
              {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={clampedPage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs font-medium text-ink-soft">
                Page {clampedPage + 1} of {pageCount}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={clampedPage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Curated testimonials */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">Curated testimonials</h3>
          <p className="mt-0.5 text-sm text-ink-soft">
            Hand-written testimonials that also appear in the carousel. Add or edit
            them under the{" "}
            <a
              href="/admin/content"
              className="font-semibold text-maroon hover:underline"
            >
              Home Page
            </a>{" "}
            tab; remove one here to take it off the home page.
          </p>
        </div>

        {curated.length === 0 ? (
          <EmptyState title="No curated testimonials" />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {curated.map((t) => (
              <WidgetCard key={t.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">
                      {t.name}
                      {t.role && (
                        <span className="text-xs font-normal text-ink-soft">
                          {" · "}
                          {t.role}
                        </span>
                      )}
                    </p>
                    <Stars rating={t.rating} />
                  </div>
                  <span className="shrink-0 rounded-full bg-cream-2 px-2.5 py-0.5 text-[11px] font-medium text-ink-soft">
                    Curated
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink-soft">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCurated(t.id)}
                  disabled={!homeLoaded}
                  className="mt-3"
                >
                  Remove from site
                </Button>
              </WidgetCard>
            ))}
          </div>
        )}
      </section>
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
