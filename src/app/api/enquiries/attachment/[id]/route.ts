import { getEnquiryByAttachmentId, readEnquiryFile } from "@/lib/enquiries";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Secure stream endpoint for customer-uploaded enquiry menu/budget PDFs.
 *
 * Security Design:
 * 1. Admin Access: Authenticated admins (via session cookie) have direct access
 *    to view and download any attachment from the admin console.
 * 2. Scoped WhatsApp Recipient Access: A non-admin recipient (e.g. caterer or
 *    stakeholder on WhatsApp) can ONLY access this specific document if they
 *    present the cryptographically secure, unguessable `shareToken` issued
 *    exclusively for this attachment (?token=...).
 * 3. Rejection: Unauthenticated requests lacking a valid share token are
 *    rejected with 401 Unauthorized. File enumeration and unauthorized scraping
 *    are strictly prevented.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const enquiry = await getEnquiryByAttachmentId(id);

  if (!enquiry || !enquiry.attachment) {
    return Response.json({ error: "Attachment not found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  // Authorization Check:
  // 1. Check for matching scoped share token first (WhatsApp recipient flow)
  const isTokenAuthorized =
    Boolean(token) &&
    typeof token === "string" &&
    token.length >= 32 &&
    token === enquiry.attachment.shareToken;

  // 2. If token is not provided or doesn't match, check for active admin session
  let isAdmin = false;
  if (!isTokenAuthorized) {
    try {
      const adminGuard = await requireRole("admin");
      isAdmin = !(adminGuard instanceof Response);
    } catch {
      isAdmin = false;
    }
  }

  if (!isAdmin && !isTokenAuthorized) {
    return Response.json(
      {
        error:
          "Unauthorized. An active admin session or a valid authorized share link is required to view this document.",
      },
      { status: 401 },
    );
  }

  const file = await readEnquiryFile(enquiry.attachment);
  if (!file) {
    return Response.json(
      { error: "The attachment file is no longer available." },
      { status: 404 },
    );
  }

  const safeFilename = encodeURIComponent(enquiry.attachment.originalName);

  return new Response(file as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeFilename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
