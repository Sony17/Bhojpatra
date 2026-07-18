import type { Metadata } from "next";
import SettingsView from "@/components/account/SettingsView";

export const metadata: Metadata = {
  title: "Settings — Bhojpatra",
  description: "Manage your Bhojpatra account preferences.",
};

export default function AccountSettingsPage() {
  return <SettingsView />;
}
