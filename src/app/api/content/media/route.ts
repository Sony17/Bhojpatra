/**
 * Admin image upload for the CMS editors (Content Control). The client
 * downscales and sends a data URL; the bytes are stored in their own row and
 * the short media URL comes back for the content to reference.
 */
import { requireRole } from "@/lib/auth";
import { storeImage } from "@/lib/contentMedia";

export const dynamic = "force-dynamic";

// POST /api/content/media { dataUrl } → { url }
export async function POST(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  let body: { dataUrl?: unknown };
  try {
    body = (await request.json()) ?? {};
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body.dataUrl !== "string") {
    return Response.json({ error: "Missing image." }, { status: 400 });
  }
  try {
    return Response.json({ url: await storeImage(body.dataUrl) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (/Unsupported|too large|empty/.test(message)) {
      return Response.json({ error: message }, { status: 400 });
    }
    console.error("Failed to store content image", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
