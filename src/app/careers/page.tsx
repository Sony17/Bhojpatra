import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import SitePageView from "@/components/SitePageView";

export const metadata: Metadata = {
  title: "Careers — Bhojpatra",
  description:
    "Join Bhojpatra and help build the future of feast booking in India. See our open roles.",
};

export default function CareersPage() {
  return (
    <PublicShell>
      <SitePageView slug="careers" />
    </PublicShell>
  );
}
