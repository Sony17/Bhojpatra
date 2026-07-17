import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import CompareView from "@/components/vendors/CompareView";

export const metadata: Metadata = {
  title: "Compare Caterers — Bhojpatra",
  description:
    "Compare verified caterers side-by-side — price, rating, cuisines, diet, tiers and more — to pick the right one for your feast.",
};

export default function ComparePage() {
  return (
    <PublicShell>
      <CompareView />
    </PublicShell>
  );
}
