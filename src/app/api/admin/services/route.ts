import { servicePackages, type ServicePackage } from "@/lib/data";
import { readSingleton, writeSingleton } from "@/lib/store";
import { requireRole } from "@/lib/auth";

// Feast-wide service packages offered in the booking wizard's "Choose Your
// Service Package" step. The admin curates this list; it is persisted to
// Postgres (Neon) as the `services` settings singleton. Public GET so the
// customer-facing wizard can read it; admin-only POST to edit. Falls back to the
// seed `servicePackages` list.
export const dynamic = "force-dynamic";

const SETTINGS_KEY = "services";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SEED: ServicePackage[] = servicePackages;

async function readServices(): Promise<ServicePackage[]> {
  const stored = await readSingleton<{ services: ServicePackage[] }>(
    SETTINGS_KEY,
  );
  const list = stored?.services;
  return Array.isArray(list) && list.length ? list : SEED;
}

/** Coerce to a finite, non-negative integer price (₹). */
function toPrice(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/** Keep only the non-empty trimmed strings from an incoming list field. */
function toStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => s.length > 0);
}

export async function GET() {
  return Response.json({ services: await readServices() });
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

  const raw = (body as { services?: unknown } | null)?.services;
  if (!Array.isArray(raw)) {
    return Response.json(
      { error: "Provide a services array." },
      { status: 400 },
    );
  }

  // Normalise: require a name, default Hindi to the English name, coerce prices
  // and the per-guest flag, keep the display lists, and derive/dedupe ids.
  const seen = new Set<string>();
  const list: ServicePackage[] = [];
  for (const item of raw) {
    const row = (item ?? {}) as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) continue;
    const str = (v: unknown, fallback = "") =>
      typeof v === "string" && v.trim() ? v.trim() : fallback;

    let base =
      typeof row.id === "string" && row.id.trim() ? row.id.trim() : slugify(name);
    if (!base) base = slugify(name) || "service";
    let id = base;
    let n = 2;
    while (seen.has(id)) id = `${base}-${n++}`;
    seen.add(id);

    const priceMin = toPrice(row.priceMin);
    const priceMax = Math.max(priceMin, toPrice(row.priceMax));

    list.push({
      id,
      badge: str(row.badge, `Package ${list.length + 1}`),
      name,
      nameHi: str(row.nameHi, name),
      subtitle: str(row.subtitle),
      subtitleHi: str(row.subtitleHi, str(row.subtitle)),
      icon: str(row.icon, "🍽️"),
      includes: toStrings(row.includes),
      notIncluded: toStrings(row.notIncluded),
      bestFor: toStrings(row.bestFor),
      priceMin,
      priceMax,
      perPlate: row.perPlate !== false,
      ...(row.openTop === true ? { openTop: true } : {}),
    });
  }

  if (!list.length) {
    return Response.json(
      { error: "Add at least one service package." },
      { status: 400 },
    );
  }

  try {
    await writeSingleton(SETTINGS_KEY, { services: list });
  } catch (err) {
    console.error("Failed to persist services", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, services: list });
}
