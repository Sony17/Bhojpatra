import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PackageShowcase from "@/components/showcase/PackageShowcase";

export const metadata: Metadata = {
  title: "Package Differentiation — Showcase",
  description:
    "Design playground: nine ways to make the Silver, Gold and Platinum tiers read as one clear value ladder.",
};

export default function ShowcasePage() {
  return (
    <>
      <Header />
      <main className="flex-1 pt-28 sm:pt-32">
        <PackageShowcase />
      </main>
      <Footer />
    </>
  );
}
