import type { Metadata } from "next";
import AddOnManager from "@/components/admin/addons/AddOnManager";

export const metadata: Metadata = { title: "Add-On Manager" };

export default function AddOnsPage() {
  return <AddOnManager />;
}
