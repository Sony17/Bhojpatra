import type { VendorBainaBox } from "@/lib/vendorMenus";

export interface BainaBoxProduct {
  id: string;
  name: string;
  /** Box photo. Empty for a live vendor who published a box without one — the
   *  order panel then draws a placeholder tile in its place. */
  image: string;
  /** What's inside, when the vendor listed it. */
  desc?: string;
  price: number;
  unit: string;
}

/** Everything the Baina Box order panel needs to sell boxes for a brand — a
 *  live vendor's published box menu, via `bainaProductsFromVendorBoxes`. */
export interface BainaOrderVendor {
  vendorId: string;
  name: string;
  location: string;
  products: BainaBoxProduct[];
  /** Verified statutory details for the checkout "Sold by" card. */
  seller?: import("@/lib/sellerDetails").SellerDetails;
}

/** A live vendor's published Baina Box menu, flattened into the order panel's
 *  product list: every size a box is sold in (½ kg, 1 kg, and any custom size
 *  the vendor added) becomes its own orderable line, since that is what the
 *  customer actually picks a quantity of. Ids are derived from the box's
 *  position and size label so they stay stable across renders — the order
 *  reference hashes them, and that hash is the idempotency key. */
export function bainaProductsFromVendorBoxes(
  boxes: readonly VendorBainaBox[],
): BainaBoxProduct[] {
  return boxes.flatMap((box, i) => {
    const sizes: { key: string; label: string; price: number }[] = [
      { key: "half", label: "½ kg box", price: box.price },
      ...(box.price1kg != null && box.price1kg > 0
        ? [{ key: "full", label: "1 kg box", price: box.price1kg }]
        : []),
      ...(box.customSizes ?? []).map((s, j) => ({
        key: `c${j}`,
        label: `${s.label} box`,
        price: s.price,
      })),
    ];
    return sizes
      .filter((s) => Number.isFinite(s.price) && s.price > 0)
      .map((s) => ({
        id: `b${i}-${s.key}`,
        name: box.name,
        image: box.photo ?? "",
        ...(box.contents?.trim() ? { desc: box.contents.trim() } : {}),
        price: Math.round(s.price),
        unit: s.label,
      }));
  });
}

