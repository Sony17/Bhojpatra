export interface BainaBoxProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  unit: string;
}

export interface BainaBoxVendorData {
  slug: string;
  vendorId: string;
  name: string;
  nameHi?: string;
  logoImage?: string;
  heroImage: string;
  gallery?: string[];
  rating: number;
  reviews: number;
  location: string;
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
        id: "ram-4",
        name: "Baina Box (Mix)",
        image:
          "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=80",
        price: 749,
        unit: "Box",
      },
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
          "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=500&q=80",
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

import { vendorListings, type VendorListing } from "@/lib/data";
import { slugifyName } from "@/lib/bookings";

export function vendorListingToBainaData(v: VendorListing): BainaBoxVendorData {
  const existing = Object.values(BAINA_BOX_VENDOR_DATA).find(
    (b) => b.vendorId === v.id || b.slug === slugifyName(v.name),
  );
  if (existing) return existing;

  const slug = slugifyName(v.name);
  const fixedPrice = v.priceFrom || 799;

  return {
    slug,
    vendorId: v.id,
    name: v.name,
    heroImage: v.image,
    gallery: [v.image],
    rating: v.rating || 4.8,
    reviews: v.reviews || 100,
    location: `${v.city}, ${v.state}`,
    tags: v.cuisines.includes("Baina Boxes")
      ? v.cuisines
      : ["Baina Boxes", ...v.cuisines],
    verified: v.verified,
    fixedPrice,
    priceUnit: "Box",
    bestFor: ["Weddings", "Gifting", "Festivals", "Parties"],
    whyChoose: [
      "Authentic Traditional Taste",
      "Made with Pure Desi Ghee",
      "Freshly Prepared Daily",
      "Hygienic Preparation",
      "On-time Delivery",
    ],
    products: [
      {
        id: `${slug}-main`,
        name: `${v.name} Signature Baina Box`,
        image: v.image,
        price: fixedPrice,
        unit: "Box",
      },
      {
        id: `${slug}-sweets`,
        name: "Assorted Sweets Box",
        image:
          "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=80",
        price: Math.round(fixedPrice * 1.1),
        unit: "Box",
      },
      {
        id: `${slug}-dryfruits`,
        name: "Royal Dry Fruits Hamper",
        image:
          "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=500&q=80",
        price: Math.round(fixedPrice * 1.3),
        unit: "Box",
      },
    ],
  };
}

export function getAllBainaBoxVendors(
  allListings: VendorListing[] = vendorListings,
): BainaBoxVendorData[] {
  const result: BainaBoxVendorData[] = [...Object.values(BAINA_BOX_VENDOR_DATA)];
  const seenIds = new Set(result.map((b) => b.vendorId));
  const seenSlugs = new Set(result.map((b) => b.slug));

  for (const v of allListings) {
    const slug = slugifyName(v.name);
    if (!seenIds.has(v.id) && !seenSlugs.has(slug)) {
      result.push(vendorListingToBainaData(v));
      seenIds.add(v.id);
      seenSlugs.add(slug);
    }
  }
  return result;
}

export function getBainaBoxVendor(
  slug: string,
  allListings: VendorListing[] = vendorListings,
): BainaBoxVendorData | undefined {
  if (BAINA_BOX_VENDOR_DATA[slug]) return BAINA_BOX_VENDOR_DATA[slug];
  const listing = allListings.find(
    (v) => slugifyName(v.name) === slug || v.id === slug,
  );
  if (listing) return vendorListingToBainaData(listing);
  return undefined;
}

export function getBainaBoxVendorByVendorId(
  vendorId: string,
  allListings: VendorListing[] = vendorListings,
): BainaBoxVendorData | undefined {
  const staticFound = Object.values(BAINA_BOX_VENDOR_DATA).find(
    (v) => v.vendorId === vendorId,
  );
  if (staticFound) return staticFound;
  const listing = allListings.find((v) => v.id === vendorId);
  if (listing) return vendorListingToBainaData(listing);
  return undefined;
}

