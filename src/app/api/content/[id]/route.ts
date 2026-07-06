import {
  getContent,
  removeContent,
  upsertContent,
  validateContent,
  type ContentRecord,
} from "@/lib/content";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/content/[id]
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const record = await getContent(decodeURIComponent(id));
  if (!record) {
    return Response.json({ error: "Content item not found." }, { status: 404 });
  }
  return Response.json({ item: record });
}

// PATCH /api/content/[id] → update fields / toggle visibility
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const record = await getContent(decodeURIComponent(id));
  if (!record) {
    return Response.json({ error: "Content item not found." }, { status: 404 });
  }

  // The kind is fixed at creation; validate the update against it.
  const check = validateContent(record.kind, body, true);
  if (!check.ok || !check.value) {
    return Response.json({ error: check.error ?? "Invalid content." }, { status: 400 });
  }

  const next = { ...record, ...check.value } as ContentRecord;
  try {
    await upsertContent(next);
  } catch (err) {
    console.error("Failed to update content item", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ item: next });
}

// DELETE /api/content/[id] → hard-delete
export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  const record = await getContent(decodeURIComponent(id));
  if (!record) {
    return Response.json({ error: "Content item not found." }, { status: 404 });
  }
  await removeContent(decodeURIComponent(id));
  return Response.json({ ok: true });
}
