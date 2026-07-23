import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import TierDeckIdeas from "@/components/ideate/TierDeckIdeas";

export const metadata: Metadata = {
  title: "Ideate — Package Stack | Bhojpatra",
  description:
    "Prototype lab: the Silver / Gold / Platinum scrolls overlapped into one card footprint.",
  // Internal ideation page — keep it out of search engines.
  robots: { index: false, follow: false },
};

export default function IdeatePage() {
  return (
    <PublicShell>
      <TierDeckIdeas />
    </PublicShell>
  );
}
