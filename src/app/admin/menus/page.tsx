import type { Metadata } from "next";
import MenuModerationConsole from "@/components/admin/menus/MenuModerationConsole";

export const metadata: Metadata = { title: "Menu Moderation" };

export default function AdminMenusPage() {
  return <MenuModerationConsole />;
}
