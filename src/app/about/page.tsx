import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import SitePageView from "@/components/SitePageView";
import AboutHighlights from "@/components/about/AboutHighlights";

export const metadata: Metadata = {
  title: "About Us — Bhojpatra",
  description:
    "Learn about Bhojpatra — India's Feast Booking Platform connecting you with verified catering specialists.",
};

export default function AboutPage() {
  return (
    <PublicShell>
      <SitePageView slug="about" hideBar />
      <AboutHighlights />
    </PublicShell>
  );
}
