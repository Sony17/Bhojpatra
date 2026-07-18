import type { Metadata } from "next";
import RolesPermissions from "@/components/admin/roles/RolesPermissions";

export const metadata: Metadata = { title: "Roles & Permissions" };

export default function RolesPage() {
  return <RolesPermissions />;
}
