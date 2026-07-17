import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import SitePageView from "@/components/SitePageView";

export const metadata: Metadata = {
  title: "Terms & Privacy — Bhojpatra",
  description:
    "Bhojpatra's terms of use and privacy policy.",
};

export default function TermsPage() {
  return (
    <PublicShell>
      <SitePageView slug="terms" />
    </PublicShell>
  );
}
