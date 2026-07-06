import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import VendorDetail from "@/components/vendors/VendorDetail";
import { vendorListings } from "@/lib/data";

/** Vendor detail + reviews route. `params` is async in this Next version. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const vendor = vendorListings.find((v) => v.id === id);
  return {
    title: vendor ? `${vendor.name} — Bhojpatra` : "Caterer — Bhojpatra",
    description: vendor
      ? `View ${vendor.name} in ${vendor.city}, ${vendor.state} — ${vendor.cuisines.join(
          ", ",
        )}. From ₹${vendor.priceFrom.toLocaleString("en-IN")} / plate. Compare and book on Bhojpatra.`
      : "View, compare and book a verified caterer on Bhojpatra.",
  };
}

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <Header />
      <main className="flex-1 pt-28 sm:pt-32">
        <VendorDetail id={id} />
      </main>
      <Footer />
      <FloatingChat />
    </>
  );
}
