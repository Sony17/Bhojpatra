import type { Metadata } from "next";
import ChangePasswordForm from "@/components/account/ChangePasswordForm";

export const metadata: Metadata = {
  title: "Change Password — Bhojpatra",
  description: "Update the password you use to sign in to Bhojpatra.",
};

export default function AccountPasswordPage() {
  return <ChangePasswordForm />;
}
