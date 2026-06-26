import type { Metadata } from "next";
import MenuCatalog from "@/components/admin/menu/MenuCatalog";

export const metadata: Metadata = { title: "Menu & Catalog" };

export default function MenuPage() {
  return <MenuCatalog />;
}
