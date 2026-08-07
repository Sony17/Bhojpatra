import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import NotFoundView from "@/components/app/NotFoundView";

export const metadata: Metadata = {
  title: "Page not found — Bhojpatra",
  description:
    "The page you were looking for doesn't exist. Browse verified feast specialists or start a new booking.",
};

export default function NotFound() {
  return (
    <PublicShell>
      <NotFoundView />
    </PublicShell>
  );
}
