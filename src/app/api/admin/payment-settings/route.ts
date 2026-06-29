import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_MERCHANT, isValidVpa, type UpiPayeeConfig } from "@/lib/upi";

// Merchant UPI identity used by checkout. The admin sets this once and it is
// persisted to disk; the booking wizard reads it (with DEFAULT_MERCHANT as a
// fallback) to build the live UPI deep-link + QR.
export const dynamic = "force-dynamic";

const STORE = path.join(process.cwd(), "data", "payment-settings.json");

async function readSettings(): Promise<UpiPayeeConfig> {
  try {
    const stored = JSON.parse(
      await fs.readFile(STORE, "utf8"),
    ) as Partial<UpiPayeeConfig>;
    return { ...DEFAULT_MERCHANT, ...stored };
  } catch {
    return { ...DEFAULT_MERCHANT };
  }
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
    await fs.mkdir(path.dirname(STORE), { recursive: true });
    await fs.writeFile(STORE, JSON.stringify(settings, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to persist payment settings", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, ...settings });
}
