/**
 * CMS content store.
 *
 * Banners, testimonials and FAQs all live in one `content_items` table,
 * discriminated by a `kind` field. Backs the admin "Content Manager" tabs.
 * Items are hard-deletable. Seeded from the former mock lists on first empty
 * read.
 */
import { randomUUID } from "crypto";
import { createStore } from "@/lib/store";
import type {
  ContentBanner,
  ContentTestimonial,
  ContentFaq,
} from "@/lib/admin/types";
import {
  contentBanners as SEED_BANNERS,
  contentTestimonials as SEED_TESTIMONIALS,
  contentFaqs as SEED_FAQS,
} from "@/lib/admin/mockData";

export type ContentKind = "banner" | "testimonial" | "faq";

export const CONTENT_KINDS: ContentKind[] = ["banner", "testimonial", "faq"];

export type ContentRecord =
  | ({ kind: "banner" } & ContentBanner)
  | ({ kind: "testimonial" } & ContentTestimonial)
  | ({ kind: "faq" } & ContentFaq);
const store = createStore<ContentRecord>({
  table: "content_items",
  idField: "id",
});

const ID_PREFIX: Record<ContentKind, string> = {
  banner: "BN",
  testimonial: "TS",
  faq: "FQ",
};

export function isContentKind(v: unknown): v is ContentKind {
  return v === "banner" || v === "testimonial" || v === "faq";
}

export function newContentId(kind: ContentKind): string {
  return `${ID_PREFIX[kind]}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export function getContent(id: string): Promise<ContentRecord | null> {
  return store.get(id);
}

export function upsertContent(rec: ContentRecord): Promise<void> {
  return store.upsert(rec);
}

export function removeContent(id: string): Promise<void> {
  return store.remove(id);
}

/** Every content item, seeding all three kinds the first time the store is
 *  empty. Filter by `kind` in the caller. */
export async function ensureSeededContent(): Promise<ContentRecord[]> {
  const rows = await store.list();
  if (rows.length) return rows;
  const seeded: ContentRecord[] = [
    ...SEED_BANNERS.map((b) => ({ kind: "banner" as const, ...b })),
    ...SEED_TESTIMONIALS.map((t) => ({ kind: "testimonial" as const, ...t })),
    ...SEED_FAQS.map((f) => ({ kind: "faq" as const, ...f })),
  ];
  await store.upsertMany(seeded);
  return seeded;
}

export async function readContent(kind?: ContentKind): Promise<ContentRecord[]> {
  const rows = await ensureSeededContent();
  return kind ? rows.filter((r) => r.kind === kind) : rows;
}

export interface ContentValidation {
  ok: boolean;
  error?: string;
  value?: Record<string, unknown>;
}

/**
 * Validate a content create/update body for the given kind. `partial` allows an
 * update carrying only some fields.
 */
export function validateContent(
  kind: ContentKind,
  body: Record<string, unknown>,
  partial = false,
): ContentValidation {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const need = (v: unknown) => typeof v === "string" && v.trim().length > 0;

  if (kind === "banner") {
    const out: Partial<ContentBanner> = {};
    if (body.title !== undefined || !partial) {
      if (!need(body.title))
        return { ok: false, error: "Banner title is required." };
      out.title = str(body.title);
    }
    if (body.subtitle !== undefined || !partial) out.subtitle = str(body.subtitle);
    if (body.placement !== undefined || !partial)
      out.placement = str(body.placement) || "Homepage";
    if (body.active !== undefined || !partial) out.active = Boolean(body.active);
    return { ok: true, value: out };
  }

  if (kind === "testimonial") {
    const out: Partial<ContentTestimonial> = {};
    if (body.name !== undefined || !partial) {
      if (!need(body.name))
        return { ok: false, error: "Reviewer name is required." };
      out.name = str(body.name);
    }
    if (body.quote !== undefined || !partial) {
      if (!need(body.quote))
        return { ok: false, error: "A quote is required." };
      out.quote = str(body.quote);
    }
    if (body.city !== undefined || !partial) out.city = str(body.city);
    if (body.rating !== undefined || !partial) {
      const r = Number(body.rating);
      out.rating = Number.isFinite(r) ? Math.min(5, Math.max(1, Math.round(r))) : 5;
    }
    if (body.visible !== undefined || !partial) out.visible = Boolean(body.visible);
    return { ok: true, value: out };
  }

  // faq
  const out: Partial<ContentFaq> = {};
  if (body.question !== undefined || !partial) {
    if (!need(body.question))
      return { ok: false, error: "A question is required." };
    out.question = str(body.question);
  }
  if (body.answer !== undefined || !partial) {
    if (!need(body.answer))
      return { ok: false, error: "An answer is required." };
    out.answer = str(body.answer);
  }
  if (body.visible !== undefined || !partial) out.visible = Boolean(body.visible);
  return { ok: true, value: out };
}
