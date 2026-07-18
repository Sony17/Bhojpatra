import type { Metadata } from "next";
import ProfileView from "@/components/account/ProfileView";

export const metadata: Metadata = {
  title: "My Profile — Bhojpatra",
  description: "View and update your Bhojpatra profile.",
};

export default function AccountProfilePage() {
  return <ProfileView />;
}
