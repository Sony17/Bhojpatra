import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicShell from "@/components/app/PublicShell";
import VendorProfile from "@/components/vendors/VendorProfile";
import VendorDetail from "@/components/vendors/VendorDetail";
import { loadStorefront } from "./storefront";

// Live vendor content changes at runtime — never prerender/cache this page.
export const dynamic = "force-dynamic";

/** `params` is async in this Next version. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const store = await loadStorefront(id);
  if (store?.kind === "live") {
    const { profile, stall } = store;
    const price = stall?.fromPerPlate ?? profile.priceFrom;
    return {
      title: `${profile.business} — Bhojpatra`,
      description: `${profile.business}, ${profile.city} — ${
        stall ? "single stall" : "menus"
      } from ₹${price}/plate on Bhojpatra.`,
    };
  }
  if (store?.kind === "sample") {
    const { listing, stall } = store;
    return {
      title: `${listing.name} — Bhojpatra`,
      description: stall
        ? `${listing.name}, ${listing.city} — single stall from ₹${stall.fromPerPlate}/plate on Bhojpatra.`
        : `${listing.name}, ${listing.city} — enquire on Bhojpatra.`,
    };
  }
  return {
    title: "Caterer — Bhojpatra",
    description: "Caterers on Bhojpatra.",
  };
}

export default async function VendorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = await loadStorefront(id);
  if (!store) notFound();

  return (
    <PublicShell detail>
      {store.kind === "live" ? (
        <VendorProfile profile={store.profile} stall={store.stall} />
      ) : (
        <VendorDetail id={id} stall={store.stall} />
      )}
    </PublicShell>
  );
}
