import path from "path";
import { DEFAULT_MERCHANT, isValidVpa, type UpiPayeeConfig } from "@/lib/upi";
import { readSingleton, writeSingleton } from "@/lib/store";

// Merchant UPI identity used by checkout. The admin sets this once and it is
// persisted to Postgres (Neon); the booking wizard reads it (with
// DEFAULT_MERCHANT as a fallback) to build the live UPI deep-link + QR.
export const dynamic = "force-dynamic";

const SETTINGS_KEY = "payment";
const STORE = path.join(process.cwd(), "data", "payment-settings.json");

async function readSettings(): Promise<UpiPayeeConfig> {
  const stored = await readSingleton<UpiPayeeConfig>(SETTINGS_KEY, STORE);
  return { ...DEFAULT_MERCHANT, ...(stored ?? {}) };
}

export async function GET() {
  return Response.json(await readSettings());
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { vpa, payeeName } = (body ?? {}) as Record<string, unknown>;

  if (typeof vpa !== "string" || !isValidVpa(vpa)) {
    return Response.json(
      { error: "Enter a valid UPI ID (e.g. name@bank)." },
      { status: 400 },
    );
  }
  if (typeof payeeName !== "string" || !payeeName.trim()) {
    return Response.json({ error: "Enter the payee name." }, { status: 400 });
  }

  const settings: UpiPayeeConfig = {
    vpa: vpa.trim(),
    payeeName: payeeName.trim(),
  };

  try {
    await writeSingleton(SETTINGS_KEY, STORE, settings);
  } catch (err) {
    console.error("Failed to persist payment settings", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, ...settings });
}
