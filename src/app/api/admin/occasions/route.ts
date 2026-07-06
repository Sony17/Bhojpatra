import { occasions } from "@/lib/data";
import { readSingleton, writeSingleton } from "@/lib/store";
import { requireRole } from "@/lib/auth";

// Occasions offered in the Hero + booking pickers. The admin curates this list;
// it is persisted to Postgres (Neon) as the `occasions` settings singleton.
// Public GET so the customer-facing pickers can read it; admin-only POST to
// edit. Falls back to the seed `occasions` list (id/name/nameHi only).
export const dynamic = "force-dynamic";

const SETTINGS_KEY = "occasions";

type OccasionOption = { id: string; name: string; nameHi: string };

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SEED: OccasionOption[] = occasions.map((o) => ({
  id: o.id,
  name: o.name,
  nameHi: o.nameHi,
}));

async function readOccasions(): Promise<OccasionOption[]> {
  const stored = await readSingleton<{ occasions: OccasionOption[] }>(
    SETTINGS_KEY,
  );
  const list = stored?.occasions;
  return Array.isArray(list) && list.length ? list : SEED;
}

export async function GET() {
  return Response.json({ occasions: await readOccasions() });
}

export async function POST(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const raw = (body as { occasions?: unknown } | null)?.occasions;
  if (!Array.isArray(raw)) {
    return Response.json(
      { error: "Provide an occasions array." },
      { status: 400 },
    );
  }

  // Normalise: require a name, default Hindi to the English name, derive/dedupe
  // ids, and never let a row collide with the reserved "other" sentinel.
  const seen = new Set<string>();
  const list: OccasionOption[] = [];
  for (const item of raw) {
    const row = (item ?? {}) as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) continue;
    const nameHi =
      typeof row.nameHi === "string" && row.nameHi.trim()
        ? row.nameHi.trim()
        : name;
    let base =
      typeof row.id === "string" && row.id.trim() ? row.id.trim() : slugify(name);
    if (!base || base === "other") base = slugify(name) || "occasion";
    let id = base;
    let n = 2;
    while (seen.has(id)) id = `${base}-${n++}`;
    seen.add(id);
    list.push({ id, name, nameHi });
  }

  if (!list.length) {
    return Response.json(
      { error: "Add at least one occasion." },
      { status: 400 },
    );
  }

  try {
    await writeSingleton(SETTINGS_KEY, { occasions: list });
  } catch (err) {
    console.error("Failed to persist occasions", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, occasions: list });
}
