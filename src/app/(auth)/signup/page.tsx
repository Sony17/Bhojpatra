import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Sign Up — Bhojpatra",
  description: "Create a Bhojpatra account to book your next feast.",
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
