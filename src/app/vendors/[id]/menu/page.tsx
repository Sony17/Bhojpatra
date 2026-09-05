import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicShell from "@/components/app/PublicShell";
import VendorFullMenu from "@/components/vendors/VendorFullMenu";
import { vendorListings } from "@/lib/data";
import {
  findVendorById,
  readVendorItemLimits,
  toPublicVendorProfile,
  type PublicVendorProfile,
} from "@/lib/vendorMenus";
import { listPhotosByOwner, photoUrl } from "@/lib/vendorPhotos";

export const dynamic = "force-dynamic";

async function loadProfile(id: string): Promise<PublicVendorProfile | null> {
  const record = await findVendorById(id);
  if (!record?.ownerUserId) return null;
  const gallery = (await listPhotosByOwner(record.ownerUserId, "gallery")).map(
    photoUrl,
  );
  const limits = await readVendorItemLimits();
  return toPublicVendorProfile(record, gallery, limits[record.id]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await loadProfile(id);
  if (profile) {
    return {
      title: `Full Menu — ${profile.business} | Bhojpatra`,
      description: `Browse the complete menu and dishes of ${profile.business} in ${profile.city} on Bhojpatra.`,
    };
  }

  const listing = vendorListings.find((v) => v.id === id);
  if (listing) {
    return {
      title: `Full Menu — ${listing.name} | Bhojpatra`,
      description: `Browse the complete menu of ${listing.name} in ${listing.city} on Bhojpatra.`,
    };
  }

  return {
    title: "Caterer Full Menu — Bhojpatra",
    description: "Browse caterer menus on Bhojpatra.",
  };
}

export default async function VendorFullMenuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await loadProfile(id);

  if (profile) {
    return (
      <PublicShell detail footer={false}>
        <VendorFullMenu vendorId={id} profile={profile} listing={null} />
      </PublicShell>
    );
  }

  const listing = vendorListings.find((v) => v.id === id);
  if (listing) {
    return (
      <PublicShell detail footer={false}>
        <VendorFullMenu vendorId={id} profile={null} listing={listing} />
      </PublicShell>
    );
  }

  notFound();
}
