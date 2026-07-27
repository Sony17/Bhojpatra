import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import OccasionsExplorer from "@/components/collections/OccasionsExplorer";

export const metadata: Metadata = {
  title: "Occasions — Bhojpatra",
  description:
    "Every celebration, one Bhojpatra experience. Browse weddings, tilak, haldi, birthdays, corporate events and more — curated menus, verified vendors and seamless booking.",
};

export default function OccasionsPage() {
  return (
    <PublicShell>
      <OccasionsExplorer />
    </PublicShell>
  );
}
