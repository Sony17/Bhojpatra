import { packages as seedPackages } from "@/lib/data";
import { readSingleton, writeSingleton } from "@/lib/store";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SETTINGS_KEY = "package_configs";

type PackageNameConfig = {
  id: string;
  name: string;
  nameHi: string;
  tagline?: string;
  taglineHi?: string;
};

const SEED: PackageNameConfig[] = seedPackages
  .filter((p) => p.id !== "custom")
  .map((p) => ({
    id: p.id,
    name: p.name,
    nameHi: p.nameHi,
    tagline: p.tagline,
    taglineHi: p.taglineHi,
  }));

async function readPackages(): Promise<PackageNameConfig[]> {
  const stored = await readSingleton<{ packages: PackageNameConfig[] }>(
    SETTINGS_KEY,
  );
  const list = stored?.packages;
  if (Array.isArray(list) && list.length) {
    // Merge stored names with seed IDs so no core tier is lost
    const merged = SEED.map((seed) => {
      const found = list.find((item) => item.id === seed.id);
      return found ? { ...seed, ...found } : seed;
    });
    return merged;
  }
  return SEED;
}

export async function GET() {
  return Response.json({ packages: await readPackages() });
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

  const raw = (body as { packages?: unknown } | null)?.packages;
  if (!Array.isArray(raw)) {
    return Response.json(
      { error: "Provide a packages array." },
      { status: 400 },
    );
  }

  const list: PackageNameConfig[] = [];
  for (const item of raw) {
    const row = (item ?? {}) as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim().toLowerCase() : "";
    if (!id) continue;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) continue;
    const nameHi =
      typeof row.nameHi === "string" && row.nameHi.trim()
        ? row.nameHi.trim()
        : name;
    const tagline =
      typeof row.tagline === "string" && row.tagline.trim()
        ? row.tagline.trim()
        : undefined;
    const taglineHi =
      typeof row.taglineHi === "string" && row.taglineHi.trim()
        ? row.taglineHi.trim()
        : undefined;

    list.push({
      id,
      name,
      nameHi,
      ...(tagline ? { tagline } : {}),
      ...(taglineHi ? { taglineHi } : {}),
    });
  }

  if (!list.length) {
    return Response.json(
      { error: "Add at least one package configuration." },
      { status: 400 },
    );
  }

  try {
    await writeSingleton(SETTINGS_KEY, { packages: list });
  } catch (err) {
    console.error("Failed to persist package names", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, packages: list });
}
