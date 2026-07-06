import {
  isContentKind,
  newContentId,
  readContent,
  upsertContent,
  validateContent,
  type ContentKind,
  type ContentRecord,
} from "@/lib/content";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/content?kind=banner|testimonial|faq → { items }
export async function GET(request: Request) {
  const kindParam = new URL(request.url).searchParams.get("kind");
  if (kindParam && !isContentKind(kindParam)) {
    return Response.json({ error: "Unknown content kind." }, { status: 400 });
  }
  const items = await readContent((kindParam as ContentKind) ?? undefined);
  return Response.json({ items });
}

// POST /api/content { kind, ... } → create a content item
export async function POST(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isContentKind(body.kind)) {
    return Response.json(
      { error: "A valid content kind is required." },
      { status: 400 },
    );
  }
  const kind = body.kind;
  const check = validateContent(kind, body);
  if (!check.ok || !check.value) {
    return Response.json({ error: check.error ?? "Invalid content." }, { status: 400 });
  }

  const record = { kind, id: newContentId(kind), ...check.value } as ContentRecord;

  try {
    await upsertContent(record);
  } catch (err) {
    console.error("Failed to create content item", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, item: record }, { status: 201 });
}
