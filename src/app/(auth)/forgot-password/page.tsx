import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Reset Password — Bhojpatra",
  description: "Reset your Bhojpatra account password.",
};

export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot" />;
}
