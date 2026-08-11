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

/** Everything the Baina Box order panel needs to sell boxes for a brand. The
 *  curated storefronts below satisfy it, and so does a live vendor's published
 *  box menu (via `bainaProductsFromVendorBoxes`) — one order flow, two sources. */
export interface BainaOrderVendor {
  vendorId: string;
  name: string;
  location: string;
  products: BainaBoxProduct[];
}

export interface BainaBoxVendorData extends BainaOrderVendor {
  slug: string;
  nameHi?: string;
  logoImage?: string;
  heroImage: string;
  gallery?: string[];
  rating: number;
  reviews: number;
  tags: string[];
  verified?: boolean;
  fixedPrice: number;
  priceUnit: string;
  bestFor: string[];
  whyChoose: string[];
  products: BainaBoxProduct[];
}

export const BAINA_BOX_VENDOR_DATA: Record<string, BainaBoxVendorData> = {
  "ram-asrey": {
    slug: "ram-asrey",
    vendorId: "vl-13",
    name: "Ram Asrey",
    nameHi: "राम आसरे",
    logoImage:
      "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=150&q=80",
    heroImage:
      "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80",
    ],
    rating: 4.9,
    reviews: 356,
    location: "Hazratganj, Lucknow",
    tags: ["Baina Boxes", "Sweets", "Veg"],
    verified: true,
    fixedPrice: 749,
    priceUnit: "Box",
    bestFor: ["Weddings", "Gifting", "Festivals", "Home Functions"],
    whyChoose: [
      "Since 1948",
      "Made with Pure Desi Ghee",
      "Freshly Prepared Daily",
      "Hygienic Preparation",
      "On-time Delivery",
    ],
    products: [
      {
        id: "ram-1",
        name: "Kaju Katli",
        image:
          "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=80",
        price: 799,
        unit: "Box",
      },
      {
        id: "ram-2",
        name: "Motichoor Laddu",
        image:
          "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=80",
        price: 599,
        unit: "Box",
      },
      {
        id: "ram-3",
        name: "Dry Fruit Box",
        image:
          "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=500&q=80",
        price: 999,
        unit: "Box",
      },
      {
        id: "ram-4",
        name: "Baina Box (Mix)",
        image:
          "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=500&q=80",
        price: 749,
        unit: "Box",
      },
    ],
  },
  "chhappan-bhog": {
    // TODO: replace placeholder content
    slug: "chhappan-bhog",
    vendorId: "vl-14",
    name: "Chhappan Bhog",
    nameHi: "छप्पन भोग",
    logoImage:
      "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=150&q=80",
    heroImage:
      "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80",
    ],
    rating: 4.8,
    reviews: 289,
    location: "Alambagh, Lucknow",
    tags: ["Baina Boxes", "Sweets", "Veg"],
    verified: true,
    fixedPrice: 699,
    priceUnit: "Box",
    bestFor: ["Weddings", "Gifting", "Corporate Events"],
    whyChoose: [
      "Since 1992",
      "Authentic Traditional Taste",
      "Hygienic & Fresh",
      "Custom Box Branding",
    ],
    products: [
      {
        id: "ch-1",
        name: "Signature Sweets Box",
        image:
          "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=500&q=80",
        price: 699,
        unit: "Box",
      },
      {
        id: "ch-2",
        name: "Premium Peda Box",
        image:
          "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=80",
        price: 649,
        unit: "Box",
      },
      {
        id: "ch-3",
        name: "Assorted Mithai Box",
        image:
          "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=80",
        price: 899,
        unit: "Box",
      },
      {
        id: "ch-4",
        name: "Royal Dry Fruits",
        image:
          "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=500&q=80",
        price: 1199,
        unit: "Box",
      },
    ],
  },
  "hazelnut-factory": {
    // TODO: replace placeholder content
    slug: "hazelnut-factory",
    vendorId: "vl-15",
    name: "Hazelnut Factory",
    nameHi: "हेज़लनट फैक्ट्री",
    logoImage:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=150&q=80",
    heroImage:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=800&q=80",
    ],
    rating: 4.7,
    reviews: 214,
    location: "Nirala Nagar, Lucknow",
    tags: ["Baina Boxes", "Bakery", "Veg"],
    verified: true,
    fixedPrice: 599,
    priceUnit: "Box",
    bestFor: ["Parties", "Gifting", "Festivals"],
    whyChoose: [
      "Artisan Bakery & Sweets",
      "Modern Packaging Design",
      "Freshly Baked Daily",
    ],
    products: [
      {
        id: "hf-1",
        name: "Bakery Baina Hamper",
        image:
          "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=500&q=80",
        price: 599,
        unit: "Box",
      },
      {
        id: "hf-2",
        name: "Chocolate & Nut Box",
        image:
          "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=500&q=80",
        price: 799,
        unit: "Box",
      },
      {
        id: "hf-3",
        name: "Gourmet Sweets Box",
        image:
          "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=80",
        price: 849,
        unit: "Box",
      },
    ],
  },
};

export function getBainaBoxVendor(slug: string): BainaBoxVendorData | undefined {
  return BAINA_BOX_VENDOR_DATA[slug];
}

export function getBainaBoxVendorByVendorId(vendorId: string): BainaBoxVendorData | undefined {
  return Object.values(BAINA_BOX_VENDOR_DATA).find((v) => v.vendorId === vendorId);
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

