import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import CompareView from "@/components/vendors/CompareView";

export const metadata: Metadata = {
  title: "Compare Caterers — Bhojpatra",
  description:
    "Compare verified caterers side-by-side — price, rating, cuisines, diet, tiers and more — to pick the right one for your feast.",
};

export default function ComparePage() {
  return (
    <>
      <Header />
      <main className="flex-1 pt-28 sm:pt-32">
        <CompareView />
      </main>
      <Footer />
      <FloatingChat />
    </>
  );
}
