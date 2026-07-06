import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import VendorProfile from "@/components/vendors/VendorProfile";
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
  return {
    title: profile
      ? `${profile.business} — Bhojpatra`
      : "Caterer — Bhojpatra",
    description: profile
      ? `${profile.business}, ${profile.city} — menus from ₹${profile.priceFrom}/plate on Bhojpatra.`
      : "Verified caterers on Bhojpatra.",
  };
}

export default async function VendorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await loadProfile(id);
  if (!profile) notFound();

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
