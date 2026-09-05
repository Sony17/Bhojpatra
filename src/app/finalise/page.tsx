import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import PackageSectionSwitcher from "@/components/showcase/PackageSectionSwitcher";

export const metadata: Metadata = {
  title: "Choose Your Package — Bhojpatra",
  description:
    "Compare our Silver, Gold and Platinum feast packages side by side, see exactly what each includes, and pick the one made for your celebration.",
};

export default function FinalisePage() {
  return (
    <PublicShell>
      <PackageSectionSwitcher />
    </PublicShell>
  );
}
