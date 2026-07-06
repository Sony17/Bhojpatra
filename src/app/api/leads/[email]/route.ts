import path from "path";
import { createStore } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import type { Lead } from "../route";

export const dynamic = "force-dynamic";

// Leads are keyed by email; the dynamic segment carries a URL-encoded email.
const store = createStore<Lead>({
  table: "leads",
  file: path.join(process.cwd(), "data", "leads.json"),
  idField: "email",
});

// PATCH /api/leads/[email] → { status } (mark New / Contacted)
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ email: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { email } = await ctx.params;
  const key = decodeURIComponent(email).toLowerCase();
  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.status !== "New" && body.status !== "Contacted") {
    return Response.json({ error: "Invalid status." }, { status: 400 });
  }

  const lead = await store.get(key);
  if (!lead) {
    return Response.json({ error: "Lead not found." }, { status: 404 });
  }

  const next: Lead = { ...lead, status: body.status };
  try {
    await store.upsert(next);
  } catch (err) {
    console.error("Failed to update lead", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
  return Response.json({ lead: next });
}

// DELETE /api/leads/[email] → hard-delete (leads carry no history)
export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ email: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { email } = await ctx.params;
  const key = decodeURIComponent(email).toLowerCase();
  const lead = await store.get(key);
  if (!lead) {
    return Response.json({ error: "Lead not found." }, { status: 404 });
  }
  await store.remove(key);
  return Response.json({ ok: true });
}
