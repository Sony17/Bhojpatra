import { requireRole } from "@/lib/auth";
import { IFSC_RE, normalizeIfsc } from "@/lib/payoutAccount";

// GET /api/vendor/ifsc?code=HDFC0001234 → { bank, branch, city } — fills the
// bank name / branch on the onboarding payout form. Proxies Razorpay's public
// IFSC directory (ifsc.razorpay.com) so the browser never depends on its CORS.
// 404 when the code doesn't exist; 502 when the directory is unreachable (the
// vendor can still type the bank name by hand).
export async function GET(request: Request) {
  const guard = await requireRole("vendor", "admin");
  if (guard instanceof Response) return guard;

  const code = normalizeIfsc(new URL(request.url).searchParams.get("code") ?? "");
  if (!IFSC_RE.test(code)) {
    return Response.json({ error: "Invalid IFSC." }, { status: 400 });
  }

  try {
    const res = await fetch(`https://ifsc.razorpay.com/${code}`, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 86400 },
    });
    if (res.status === 404) {
      return Response.json({ error: "IFSC not found." }, { status: 404 });
    }
    if (!res.ok) throw new Error(`IFSC lookup ${res.status}`);
    const data = (await res.json()) as Record<string, unknown>;
    const s = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 120) : "");
    return Response.json({ bank: s(data.BANK), branch: s(data.BRANCH), city: s(data.CITY) });
  } catch (err) {
    console.error("IFSC lookup failed", err);
    return Response.json({ error: "Couldn't look up that IFSC." }, { status: 502 });
  }
}
