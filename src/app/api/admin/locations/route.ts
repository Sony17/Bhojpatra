import { cities } from "@/lib/data";
import { readSingleton, writeSingleton } from "@/lib/store";
import { requireRole } from "@/lib/auth";

// Serviceable locations (cities / states) offered in the Hero + booking
// pickers. The admin curates this list; it is persisted to Postgres (Neon) as
// the `locations` settings singleton. Public GET so the customer-facing pickers
// can read it; admin-only POST to edit. Falls back to the seed `cities` list.
export const dynamic = "force-dynamic";

const SETTINGS_KEY = "locations";

type LocationOption = { id: string; name: string; nameHi: string };

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function readLocations(): Promise<LocationOption[]> {
  const stored = await readSingleton<{ locations: LocationOption[] }>(
    SETTINGS_KEY,
  );
  const list = stored?.locations;
  return Array.isArray(list) && list.length ? list : cities;
}

export async function GET() {
  return Response.json({ locations: await readLocations() });
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

  const raw = (body as { locations?: unknown } | null)?.locations;
  if (!Array.isArray(raw)) {
    return Response.json(
      { error: "Provide a locations array." },
      { status: 400 },
    );
  }

  // Normalise: require a name, default Hindi to the English name, derive/dedupe
  // ids, and never let a row collide with the reserved "other" sentinel.
  const seen = new Set<string>();
  const locations: LocationOption[] = [];
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
    if (!base || base === "other") base = slugify(name) || "location";
    let id = base;
    let n = 2;
    while (seen.has(id)) id = `${base}-${n++}`;
    seen.add(id);
    locations.push({ id, name, nameHi });
  }

  if (!locations.length) {
    return Response.json(
      { error: "Add at least one location." },
      { status: 400 },
    );
  }

  try {
    await writeSingleton(SETTINGS_KEY, { locations });
  } catch (err) {
    console.error("Failed to persist locations", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, locations });
}
