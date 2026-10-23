import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import StallBookingWizard from "@/components/booking/StallBookingWizard";
import { loadStallTileImages } from "@/lib/stallTileImagesServer";

export const metadata: Metadata = {
  title: "Book a Single Stall — Bhojpatra",
  description:
    "Book one trusted stall for your celebration — pick the caterer, build their menu dish by dish, and pay only for what you pick. Simple as that.",
};

export default async function Page() {
  // Admin-set tile photos (Content Control → Single Stall Tiles), read here so the
  // tiles paint with them — the picker has no other image source.
  const tileImages = await loadStallTileImages();
  return (
    <PublicShell>
      <StallBookingWizard tileImages={tileImages} />
    </PublicShell>
  );
}
