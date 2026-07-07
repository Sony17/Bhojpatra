import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import VendorProfile from "@/components/vendors/VendorProfile";
import VendorDetail from "@/components/vendors/VendorDetail";
import { vendorListings } from "@/lib/data";
import {
  findVendorById,
  toPublicVendorProfile,
  type PublicVendorProfile,
} from "@/lib/vendorMenus";
import { listPhotosByOwner, photoUrl } from "@/lib/vendorPhotos";

// Live vendor content changes at runtime — never prerender/cache this page.
export const dynamic = "force-dynamic";

async function loadProfile(id: string): Promise<PublicVendorProfile | null> {
  const record = await findVendorById(id);
  if (!record?.ownerUserId) return null;
  const gallery = (await listPhotosByOwner(record.ownerUserId, "gallery")).map(
    photoUrl,
  );
  return toPublicVendorProfile(record, gallery);
}

/** `params` is async in this Next version. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await loadProfile(id);
  if (profile) {
    return {
      title: `${profile.business} — Bhojpatra`,
      description: `${profile.business}, ${profile.city} — menus from ₹${profile.priceFrom}/plate on Bhojpatra.`,
    };
  }

  // Curated static listing (no live menu) still gets a real profile page.
  const listing = vendorListings.find((v) => v.id === id);
  if (listing) {
    return {
      title: `${listing.name} — Bhojpatra`,
      description: `${listing.name}, ${listing.city} — verified caterer from ₹${listing.priceFrom}/plate on Bhojpatra.`,
    };
  }

  return {
    title: "Caterer — Bhojpatra",
    description: "Verified caterers on Bhojpatra.",
  };
}

export default async function VendorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await loadProfile(id);

  // Live registered vendor → menu + gallery profile.
  if (profile) {
    return (
      <>
        <Header />
        <main className="flex-1 pt-28 sm:pt-32">
          <VendorProfile profile={profile} />
        </main>
        <Footer />
        <FloatingChat />
      </>
    );
  }

  // Curated static listing → detail page (info, reviews, "Book this caterer").
  const listing = vendorListings.find((v) => v.id === id);
  if (listing) {
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

  notFound();
}
