import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import PackageSectionSwitcher from "@/components/showcase/PackageSectionSwitcher";

export const metadata: Metadata = {
  title: "Choose Your Package — Bhojpatra",
  description:
    "Silver, Gold and Platinum as one clear value ladder — stat strips, an upgrade path, a full comparison and famous-vendor perks, all in the Bhojpatra theme.",
};

export default function FinalisePage() {
  return (
    <PublicShell>
      <PackageSectionSwitcher />
    </PublicShell>
  );
}
