import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/auth/session → { user } (or { user: null }) for client hydration.
export async function GET() {
  const user = await getSessionUser();
  return Response.json({ user });
}
