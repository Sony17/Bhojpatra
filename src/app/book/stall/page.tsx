import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import StallBookingWizard from "@/components/booking/StallBookingWizard";
import { loadStallTileImages } from "@/lib/stallTileImagesServer";
import { loadCatalogSnapshot } from "@/lib/catalogSnapshot";

export const metadata: Metadata = {
  title: "Book a Single Stall — Bhojpatra",
  description:
    "Book one trusted stall for your celebration — pick the caterer, build their menu dish by dish, and pay only for what you pick. Simple as that.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Admin-set tile photos (Content Control → Single Stall Tiles), read here so the
  // tiles paint with them — the picker has no other image source. The stall
  // roster and the URL's event details are resolved here too, so the first
  // frame is the final one: no empty "No stalls" → tiles swap.
  const [tileImages, catalog, sp] = await Promise.all([
    loadStallTileImages(),
    loadCatalogSnapshot(),
    searchParams,
  ]);
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") search.set(k, v);
  }
  return (
    <PublicShell>
      <StallBookingWizard
        tileImages={tileImages}
        initialMenu={catalog?.categories}
        initialVendors={catalog?.vendors}
        initialSearch={search.toString()}
      />
    </PublicShell>
  );
}
