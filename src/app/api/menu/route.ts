import { assembleMenuCategories } from "@/lib/vendorMenus";

export const dynamic = "force-dynamic";

// GET /api/menu → { categories: MenuCategory[] }
// Public: the /book wizard's "Build Your Menu" step — the platform category
// taxonomy with every vendor (curated seed + live) publishing in it.
export async function GET() {
  try {
    const categories = await assembleMenuCategories();
    return Response.json({ categories });
  } catch (err) {
    console.error("Failed to assemble menu categories", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
