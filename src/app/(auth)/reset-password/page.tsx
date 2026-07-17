import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Choose a New Password — Bhojpatra",
  description: "Set a new password for your Bhojpatra account.",
};

export default function ResetPasswordPage() {
  return <AuthForm mode="reset" />;
}
