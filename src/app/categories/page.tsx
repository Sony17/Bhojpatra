import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import CategoriesExplorer from "@/components/collections/CategoriesExplorer";

export const metadata: Metadata = {
  title: "Categories — Bhojpatra",
  description:
    "Every craving, one Bhojpatra experience. Browse caterers, live counters, chaat, sweets, beverages, decor and Baina Box — curated menus, verified vendors and seamless booking.",
};

export default function CategoriesPage() {
  return (
    <PublicShell>
      <CategoriesExplorer />
    </PublicShell>
  );
}
