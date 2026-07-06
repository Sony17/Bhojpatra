import {
  DEFAULT_MERCHANT,
  isValidVpa,
  isValidQrImage,
  type UpiPayeeConfig,
} from "@/lib/upi";
import { readSingleton, writeSingleton } from "@/lib/store";
import { requireRole } from "@/lib/auth";

// Merchant UPI identity used by checkout. The admin sets this once and it is
// persisted to Postgres (Neon); the booking wizard reads it (with
// DEFAULT_MERCHANT as a fallback) to build the live UPI deep-link + QR.
export const dynamic = "force-dynamic";

const SETTINGS_KEY = "payment";

async function readSettings(): Promise<UpiPayeeConfig> {
  const stored = await readSingleton<UpiPayeeConfig>(SETTINGS_KEY);
  return { ...DEFAULT_MERCHANT, ...(stored ?? {}) };
}

export async function GET() {
  return Response.json(await readSettings());
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

  const { vpa, payeeName, qrImage } = (body ?? {}) as Record<string, unknown>;

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

  // Optional custom QR image (a base64 data URL). A non-empty value must be a
  // valid, size-capped image; an empty string / missing value clears any
  // previously uploaded QR (the whole singleton is rewritten each save, so
  // omitting the field drops it — checkout falls back to the generated QR).
  if (typeof qrImage === "string" && qrImage.trim()) {
    if (!isValidQrImage(qrImage)) {
      return Response.json(
        { error: "Upload a valid QR image (PNG/JPEG/WebP under 450 KB)." },
        { status: 400 },
      );
    }
    settings.qrImage = qrImage.trim();
  }

  try {
    await writeSingleton(SETTINGS_KEY, settings);
  } catch (err) {
    console.error("Failed to persist payment settings", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, ...settings });
}
