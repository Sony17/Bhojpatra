import type { Metadata } from "next";
import RolesView from "@/components/account/RolesView";

export const metadata: Metadata = {
  title: "Roles — Bhojpatra",
  description: "The account types you hold on Bhojpatra, and how to add more.",
};

export default function AccountRolesPage() {
  return <RolesView />;
}
