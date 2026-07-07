import { requireRole } from "@/lib/auth";
import { listAdminVendors } from "@/lib/admin/vendors";

export const dynamic = "force-dynamic";

// GET /api/admin/vendors → { vendors: AdminVendor[] }
// Every vendor the admin manages: real account-owned caterers (assembled live
// from the store + their KYC application) followed by the curated catalog.
export async function GET() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  try {
    const vendors = await listAdminVendors();
    return Response.json({ vendors });
  } catch (err) {
    console.error("Failed to list admin vendors", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
