import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicShell from "@/components/app/PublicShell";
import VendorFullMenu from "@/components/vendors/VendorFullMenu";
import { loadStorefront } from "../storefront";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const store = await loadStorefront(id);
  if (store) {
    const name =
      store.kind === "live" ? store.profile.business : store.listing.name;
    const city = store.kind === "live" ? store.profile.city : store.listing.city;
    return {
      title: `Full Menu — ${name} | Bhojpatra`,
      description: `Browse the menu of ${name} in ${city} on Bhojpatra.`,
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
  const store = await loadStorefront(id);
  if (!store) notFound();

  return (
    <PublicShell detail footer={false}>
      <VendorFullMenu
        vendorId={id}
        profile={store.kind === "live" ? store.profile : null}
        listing={store.kind === "sample" ? store.listing : null}
        stall={store.stall}
      />
    </PublicShell>
  );
}
