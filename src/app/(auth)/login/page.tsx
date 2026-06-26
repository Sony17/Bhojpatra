import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Log In — Bhojpatra",
  description: "Log in to your Bhojpatra account to manage your celebrations.",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
