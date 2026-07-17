import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import PackageShowcase from "@/components/showcase/PackageShowcase";

export const metadata: Metadata = {
  title: "Package Differentiation — Showcase",
  description:
    "Design playground: nine ways to make the Silver, Gold and Platinum tiers read as one clear value ladder.",
};

export default function ShowcasePage() {
  return (
    <PublicShell chat={false}>
      <PackageShowcase />
    </PublicShell>
  );
}
