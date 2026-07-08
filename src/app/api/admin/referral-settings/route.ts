import {
  DEFAULT_REFERRAL_RATES,
  MAX_REFERRAL_PERCENT,
  REFERRAL_RATE_ROLES,
  normalizeReferralRates,
  type ReferralRates,
} from "@/lib/referralRates";
import { readSingleton, writeSingleton } from "@/lib/store";
import { requireRole } from "@/lib/auth";

// Admin-set referral percentages (customer discount + referrer reward), per
// person-to-person partner type. Persisted to Postgres (Neon) as a settings
// singleton. GET is public so the booking wizard and partner dashboard can read
// the live rates; POST is admin-only.
export const dynamic = "force-dynamic";

const SETTINGS_KEY = "referral";

const RATE_FIELDS = ["customerPercent", "referrerPercent"] as const;

async function readRates(): Promise<ReferralRates> {
  const stored = await readSingleton<ReferralRates>(SETTINGS_KEY);
  return normalizeReferralRates(stored ?? DEFAULT_REFERRAL_RATES);
}

export async function GET() {
  return Response.json(await readRates());
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

  // Reject clearly out-of-range values instead of silently clamping, so a
  // fat-finger (e.g. 500%) surfaces as an error the admin can correct. Missing
  // / blank fields are allowed and fall back to 0 via normalizeReferralRates.
  const src = (body ?? {}) as Record<string, Record<string, unknown>>;
  for (const role of REFERRAL_RATE_ROLES) {
    for (const field of RATE_FIELDS) {
      const raw = src[role]?.[field];
      if (raw == null || raw === "") continue;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > MAX_REFERRAL_PERCENT) {
        return Response.json(
          {
            error: `Enter a percentage between 0 and ${MAX_REFERRAL_PERCENT} for each field.`,
          },
          { status: 400 },
        );
      }
    }
  }

  const rates = normalizeReferralRates(body);

  try {
    await writeSingleton(SETTINGS_KEY, rates);
  } catch (err) {
    console.error("Failed to persist referral settings", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, ...rates });
}
