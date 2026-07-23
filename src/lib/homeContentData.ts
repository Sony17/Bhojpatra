/**
 * Home-page CMS content — types, seed defaults and reconcile logic.
 *
 * SERVER-SAFE (no "use client", no browser APIs) so both the client hook
 * (`homeContent.ts`) and the API route (`/api/content/home`) can share it. The
 * editable content itself is persisted to the database (the `settings`
 * singleton table) via that route; this module only owns the shape + defaults.
 * Defaults are derived from `src/lib/data.ts` so the seed always matches the
 * original hardcoded page.
 */
import {
  categories,
  packages,
  galleryItems,
  testimonials,
  occasions,
  heroEventImages,
  heroLocationImages,
} from "@/lib/data";

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface HomeCategory {
  id: string;
  name: string;
  nameHi: string;
  image: string;
  /** "Starting from" price shown on the card (free text, e.g. "₹999 / plate").
   *  Only rendered when `services.showPrices` is on; empty hides it. */
  priceFrom?: string;
}

export interface HomeOccasion {
  id: string;
  name: string;
  nameHi: string;
  image: string;
}

export interface HomeBrand {
  id: string;
  name: string;
  nameHi: string;
  /** Circular brand logo (upload or URL) shown beside the name. When empty,
   *  the card falls back to the brand name's initials. */
  logo: string;
  image: string;
}

export interface HomeRibbonBrand {
  id: string;
  name: string;
  nameHi: string;
  /** Brand logo (upload or URL) shown in the white badge on the card. When
   *  empty, the card falls back to the brand name's initials. */
  logo: string;
  /** Full-bleed cover photo behind the logo and text. */
  image: string;
  /** City / area shown under the brand name. */
  location: string;
  locationHi: string;
  /** Star rating shown on the card (e.g. 4.8). Hide when 0. */
  rating: number;
  /** Review count shown beside the rating (e.g. 256). Hide when 0. */
  reviewCount: number;
  /** Brand type tag on the card (e.g. "Caterer", "Venue", "Halwai"). Hide when empty. */
  category: string;
  categoryHi: string;
  /** Short specialty / cuisine line (e.g. "Awadhi · Mughlai"). Hide when empty. */
  specialty: string;
  specialtyHi: string;
  /** Starting price per plate in ₹ (e.g. 899). Rendered as "from ₹899". Hide when 0. */
  priceFrom: number;
  /** Founding / "serving since" year (e.g. 1998). Hide when 0. */
  since: number;
  /** When true, shows a "Featured" ribbon for prestige. */
  featured: boolean;
}

/** Fill missing fields on a stored ribbon brand so older CMS saves keep working. */
export function normalizeRibbonBrand(
  brand: Partial<HomeRibbonBrand> & Pick<HomeRibbonBrand, "id" | "name">,
): HomeRibbonBrand {
  return {
    id: brand.id,
    name: brand.name,
    nameHi: brand.nameHi ?? brand.name,
    logo: brand.logo ?? "",
    image: brand.image ?? "",
    location: brand.location ?? "",
    locationHi: brand.locationHi ?? "",
    rating: typeof brand.rating === "number" ? brand.rating : 0,
    reviewCount: typeof brand.reviewCount === "number" ? brand.reviewCount : 0,
    category: brand.category ?? "",
    categoryHi: brand.categoryHi ?? "",
    specialty: brand.specialty ?? "",
    specialtyHi: brand.specialtyHi ?? "",
    priceFrom: typeof brand.priceFrom === "number" ? brand.priceFrom : 0,
    since: typeof brand.since === "number" ? brand.since : 0,
    featured: brand.featured ?? false,
  };
}

export interface HomePackage {
  id: string;
  name: string;
  nameHi: string;
  price: string;
}

export interface HomeGalleryItem {
  id: string;
  title: string;
  titleHi: string;
  caption: string;
  captionHi: string;
  image: string;
}

export interface HomeTestimonial {
  id: string;
  name: string;
  role: string;
  roleHi: string;
  quote: string;
  quoteHi: string;
  rating: number;
  /** Optional portrait — falls back to initials when empty. */
  avatar?: string;
}

/** Icon keys for the hero trust strip — mapped to components in `Hero.tsx`. */
export type HomeTrustBadgeIcon = "shield" | "price" | "clipboard" | "headset";

export interface HomeTrustBadge {
  id: string;
  icon: HomeTrustBadgeIcon;
  title: string;
  titleHi: string;
  sub: string;
  subHi: string;
}

export interface HomeContent {
  hero: {
    headlineTop: string;
    headlineTopHi: string;
    headlineBottom: string;
    headlineBottomHi: string;
    lede: string;
    ledeHi: string;
    /** Booking-bar CTA label (e.g. "Book Your Feast"). */
    cta: string;
    ctaHi: string;
    /** Fallback backdrop when no occasion/location override matches. */
    background: string;
    /** Per-occasion hero backdrops — keys match admin Settings → Occasions ids.
     *  Takes priority over location overrides and the default background. */
    backgroundsByOccasion?: Record<string, string>;
    /** Per-location hero backdrops — keys match admin Settings → Locations ids.
     *  Used when the selected occasion has no override. */
    backgroundsByLocation?: Record<string, string>;
    /** Which booking-bar selection drives the hero image when both have a match.
     *  `occasion` (default) — event image wins; `location` — city image wins. */
    backgroundPriority?: "occasion" | "location";
    /** Trust strip beneath the booking bar. */
    trustBadges: HomeTrustBadge[];
  };
  /** Featured-brands carousel of the prestigious / famous brands Bhojpatra
   *  serves. Horizontal snap slider with cover photo, logo, location and
   *  rating; fully admin-managed (enable toggle, heading and brand cards). */
  brandRibbon: {
    enabled: boolean;
    heading: string;
    headingHi: string;
    brands: HomeRibbonBrand[];
  };
  services: {
    heading: string;
    headingHi: string;
    subtitle: string;
    subtitleHi: string;
    cta: string;
    ctaHi: string;
    /** Whether each service-category card shows its "from" price. Admins can
     *  turn this off to hide prices across the whole section. */
    showPrices: boolean;
    categories: HomeCategory[];
    /** The curated Baina Box card, shown among the service categories and
     *  linking to its own catalogue rather than the booking wizard. */
    bainaBox: HomeCategory;
  };
  occasions: {
    heading: string;
    headingHi: string;
    subtitle: string;
    subtitleHi: string;
    items: HomeOccasion[];
  };
  /** "Celebrate with Sweetness & Love" — the Baina Box promo band. */
  bainaBoxes: {
    heading: string;
    headingHi: string;
    /** Accent second line (e.g. "Sweetness & Love"). */
    headingEm: string;
    headingEmHi: string;
    subtitle: string;
    subtitleHi: string;
    cta: string;
    ctaHi: string;
    brands: HomeBrand[];
  };
  /** "Baina Box, specially by Bhojpatra" — an admin-editable signature block
   *  showcasing Bhojpatra's own curated Baina Box offering. Shown as an elegant
   *  card in the vendor dashboard and atop a Baina Box catalogue search. Its CTA
   *  always deep-links to the Baina Box catalogue (`/vendors?q=Baina+Box`). */
  bainaBoxSpecial: {
    enabled: boolean;
    heading: string;
    headingHi: string;
    body: string;
    bodyHi: string;
    cta: string;
    ctaHi: string;
    image: string;
  };
  packages: {
    heading: string;
    headingHi: string;
    subtitle: string;
    subtitleHi: string;
    tiers: HomePackage[];
  };
  gallery: {
    eyebrow: string;
    eyebrowHi: string;
    heading: string;
    headingHi: string;
    headingEm: string;
    headingEmHi: string;
    subtitle: string;
    subtitleHi: string;
    cta: string;
    ctaHi: string;
    /** The fan-out cluster shown *above* the CTA (first 7 are laid out). */
    cluster: HomeGalleryItem[];
    /** Top auto-scrolling ribbon (scrolls left → right). */
    rowOne: HomeGalleryItem[];
    /** Bottom auto-scrolling ribbon (scrolls right → left). */
    rowTwo: HomeGalleryItem[];
  };
  testimonials: {
    eyebrow: string;
    eyebrowHi: string;
    heading: string;
    headingHi: string;
    subtitle: string;
    subtitleHi: string;
    items: HomeTestimonial[];
  };
  promo: {
    heading: string;
    headingHi: string;
    subtitle: string;
    subtitleHi: string;
    /** Optional full-width banner artwork (uploaded via admin). When set, the
     *  image is shown edge-to-edge and the heading/subtitle are used for alt
     *  text and the lead-capture strip below. */
    image: string;
  };
  booking: {
    heading: string;
    headingHi: string;
    subtitle: string;
    subtitleHi: string;
  };
}

/* ── Defaults (seed content, derived from data.ts) ────────────────────────── */

/** Default "from" price shown on each service-category card. Fully editable in
 *  Admin → Content → Home Page; a category not listed here seeds an empty price
 *  (card shows no price until an admin sets one). */
const CATEGORY_PRICE_FROM: Record<string, string> = {
  caterers: "₹999 / plate",
  "live-counters": "₹90 / plate",
  chaat: "₹60 / plate",
  sweets: "₹599 / box",
  beverages: "₹45 / plate",
  decor: "₹35,000",
};

export const DEFAULT_HOME_CONTENT: HomeContent = {
  hero: {
    headlineTop: "Book Verified Caterers, Food Stalls & Famous Vendors.",
    headlineTopHi: "वेरिफाइड कैटरर, फूड स्टॉल और मशहूर वेंडर बुक करें।",
    headlineBottom: "One Bhojpatra Experience.",
    headlineBottomHi: "एक भोजपत्र अनुभव।",
    lede: "Compare curated menus, customize your feast and book trusted celebration partners in minutes.",
    ledeHi:
      "क्यूरेटेड मेन्यू की तुलना करें, अपनी दावत कस्टमाइज़ करें और मिनटों में भरोसेमंद सेलिब्रेशन पार्टनर बुक करें।",
    cta: "Book Your Feast",
    ctaHi: "अपनी दावत बुक करें",
    background: "/bhoj_Hero_1.png",
    backgroundsByOccasion: { ...heroEventImages },
    backgroundsByLocation: { ...heroLocationImages },
    backgroundPriority: "occasion",
    trustBadges: [
      {
        id: "trust-verified",
        icon: "shield",
        title: "Verified Partners",
        titleHi: "वेरिफाइड पार्टनर्स",
        sub: "Quality you can trust",
        subHi: "क्वालिटी जिस पर भरोसा हो",
      },
      {
        id: "trust-pricing",
        icon: "price",
        title: "Transparent Pricing",
        titleHi: "पारदर्शी कीमतें",
        sub: "No hidden surprises",
        subHi: "कोई छिपा खर्च नहीं",
      },
      {
        id: "trust-booking",
        icon: "clipboard",
        title: "Easy Booking",
        titleHi: "आसान बुकिंग",
        sub: "In just a few clicks",
        subHi: "बस कुछ क्लिक में",
      },
      {
        id: "trust-support",
        icon: "headset",
        title: "Dedicated Support",
        titleHi: "समर्पित सपोर्ट",
        sub: "We're here for you",
        subHi: "हम आपके साथ हैं",
      },
    ],
  },
  brandRibbon: {
    enabled: true,
    heading: "Proudly serving India's finest brands",
    headingHi: "गर्व से भारत के बेहतरीन ब्रांड्स की सेवा में",
    // Dummy seed with realistic Unsplash covers + square logo crops — replace
    // via Admin → Content Control → Home Page → Brand Ribbon.
    brands: [
      {
        id: "brand-grand-pavilion",
        name: "The Grand Pavilion",
        nameHi: "द ग्रैंड पवेलियन",
        logo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=200&h=200&q=80",
        image:
          "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=600&h=600&q=80",
        location: "Lucknow",
        locationHi: "लखनऊ",
        rating: 4.8,
        reviewCount: 256,
        category: "Banquet Venue",
        categoryHi: "बैंक्वेट वेन्यू",
        specialty: "Awadhi Fine Dining",
        specialtyHi: "अवधी फ़ाइन डाइनिंग",
        priceFrom: 1499,
        since: 1998,
        featured: true,
      },
      {
        id: "brand-royal-rajasthan",
        name: "Royal Rajasthan",
        nameHi: "रॉयल राजस्थान",
        logo: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=200&h=200&q=80",
        image:
          "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=600&h=600&q=80",
        location: "Jaipur",
        locationHi: "जयपुर",
        rating: 4.9,
        reviewCount: 412,
        category: "Caterer",
        categoryHi: "कैटरर",
        specialty: "Rajasthani · Marwari",
        specialtyHi: "राजस्थानी · मारवाड़ी",
        priceFrom: 1199,
        since: 2005,
        featured: true,
      },
      {
        id: "brand-saffron-court",
        name: "Saffron Court",
        nameHi: "सैफ्रॉन कोर्ट",
        logo: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=200&h=200&q=80",
        image:
          "https://images.unsplash.com/photo-1478146896981-b80fe463b330?auto=format&fit=crop&w=600&h=600&q=80",
        location: "Delhi",
        locationHi: "दिल्ली",
        rating: 4.7,
        reviewCount: 189,
        category: "Banquet Venue",
        categoryHi: "बैंक्वेट वेन्यू",
        specialty: "Mughlai · Continental",
        specialtyHi: "मुगलई · कॉन्टिनेंटल",
        priceFrom: 1699,
        since: 2011,
        featured: false,
      },
      {
        id: "brand-heritage-halwai",
        name: "Heritage Halwai",
        nameHi: "हेरिटेज हलवाई",
        logo: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=200&h=200&q=80",
        image:
          "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&h=600&q=80",
        location: "Kanpur",
        locationHi: "कानपुर",
        rating: 4.6,
        reviewCount: 98,
        category: "Halwai",
        categoryHi: "हलवाई",
        specialty: "Traditional Mithai · Sweets",
        specialtyHi: "पारंपरिक मिठाई · स्वीट्स",
        priceFrom: 649,
        since: 1972,
        featured: false,
      },
      {
        id: "brand-maharaja-caterers",
        name: "Maharaja Caterers",
        nameHi: "महाराजा कैटरर्स",
        logo: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=200&h=200&q=80",
        image:
          "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=600&h=600&q=80",
        location: "Varanasi",
        locationHi: "वाराणसी",
        rating: 4.8,
        reviewCount: 321,
        category: "Caterer",
        categoryHi: "कैटरर",
        specialty: "Banarasi · North Indian",
        specialtyHi: "बनारसी · नॉर्थ इंडियन",
        priceFrom: 999,
        since: 1989,
        featured: true,
      },
      {
        id: "brand-golden-spoon",
        name: "Golden Spoon",
        nameHi: "गोल्डन स्पून",
        logo: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=200&h=200&q=80",
        image:
          "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&h=600&q=80",
        location: "Agra",
        locationHi: "आगरा",
        rating: 4.5,
        reviewCount: 147,
        category: "Caterer",
        categoryHi: "कैटरर",
        specialty: "Mughlai · Tandoor",
        specialtyHi: "मुगलई · तंदूर",
        priceFrom: 899,
        since: 2014,
        featured: false,
      },
      {
        id: "brand-silver-platter",
        name: "Silver Platter",
        nameHi: "सिल्वर प्लैटर",
        logo: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=200&h=200&q=80",
        image:
          "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&h=600&q=80",
        location: "Noida",
        locationHi: "नोएडा",
        rating: 4.7,
        reviewCount: 203,
        category: "Caterer",
        categoryHi: "कैटरर",
        specialty: "Multi-cuisine · Live Counters",
        specialtyHi: "मल्टी-क्विज़ीन · लाइव काउंटर",
        priceFrom: 1099,
        since: 2016,
        featured: false,
      },
      {
        id: "brand-nawabs-kitchen",
        name: "Nawab's Kitchen",
        nameHi: "नवाब्स किचन",
        logo: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=200&h=200&q=80",
        image:
          "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&h=600&q=80",
        location: "Lucknow",
        locationHi: "लखनऊ",
        rating: 4.9,
        reviewCount: 478,
        category: "Caterer",
        categoryHi: "कैटरर",
        specialty: "Awadhi · Kebabs · Biryani",
        specialtyHi: "अवधी · कबाब · बिरयानी",
        priceFrom: 1299,
        since: 2001,
        featured: true,
      },
    ],
  },
  services: {
    heading: "Single stall, one Bhojpatra Experience...",
    headingHi: "सिंगल स्टॉल, एक भोजपत्र अनुभव...",
    subtitle: "Handpicked specialists across every flavour of your celebration.",
    subtitleHi: "आपके उत्सव के हर स्वाद के लिए चुनिंदा स्पेशलिस्ट।",
    cta: "View All Categories",
    ctaHi: "सभी कैटेगरी देखें",
    showPrices: true,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      nameHi: c.nameHi,
      image: c.image,
      priceFrom: CATEGORY_PRICE_FROM[c.id] ?? "",
    })),
    bainaBox: {
      id: "baina-box",
      name: "Baina Box",
      nameHi: "बैना बॉक्स",
      image:
        "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=70",
      priceFrom: "₹599 / box",
    },
  },
  occasions: {
    heading: "moments when we set tables",
    headingHi: "जब हम मेज़ सजाते हैं",
    subtitle: "Make every moment so delicious with the help of Bhojpatra",
    subtitleHi: "भोजपत्र के साथ हर पल को स्वादिष्ट बनाएं",
    items: occasions.map((o) => ({
      id: o.id,
      name: o.name,
      nameHi: o.nameHi,
      image: o.image,
    })),
  },
  bainaBoxes: {
    heading: "Celebrate with",
    headingHi: "उत्सव मनाएं",
    headingEm: "Sweetness & Love",
    headingEmHi: "मिठास और प्यार के साथ",
    subtitle: "Premium Baina Boxes from famous brands, beautifully packed.",
    subtitleHi: "मशहूर ब्रांड्स के प्रीमियम बैना बॉक्स, खूबसूरती से पैक किए हुए।",
    cta: "Explore Baina Box →",
    ctaHi: "बैना बॉक्स देखें →",
    brands: [
      {
        id: "ram-asrey",
        name: "Ram Asrey",
        nameHi: "राम आसरे",
        logo: "",
        image:
          "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=70",
      },
      {
        id: "chhappan-bhog",
        name: "Chhappan Bhog",
        nameHi: "छप्पन भोग",
        logo: "",
        image:
          "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=500&q=70",
      },
      {
        id: "hazelnut-factory",
        name: "Hazelnut Factory",
        nameHi: "हेज़लनट फैक्ट्री",
        logo: "",
        image:
          "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=500&q=70",
      },
      {
        id: "premium-packaging",
        name: "Premium Packaging",
        nameHi: "प्रीमियम पैकेजिंग",
        logo: "",
        image:
          "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=500&q=70",
      },
    ],
  },
  bainaBoxSpecial: {
    enabled: true,
    heading: "Signature Baina Boxes",
    headingHi: "सिग्नेचर बैना बॉक्स",
    body: "Curated and delivered by Bhojpatra — premium gift boxes from famous brands, beautifully packed and made special for every celebration.",
    bodyHi:
      "भोजपत्र द्वारा तैयार और डिलीवर — मशहूर ब्रांड्स के प्रीमियम गिफ्ट बॉक्स, खूबसूरती से पैक किए और हर उत्सव के लिए खास।",
    cta: "Explore Baina Box →",
    ctaHi: "बैना बॉक्स देखें →",
    image: "/baina-box-signature.png",
  },
  packages: {
    heading: "Select Your Package",
    headingHi: "अपना पैकेज चुनें",
    subtitle: "Choose a package as per your preference.",
    subtitleHi: "अपनी पसंद के अनुसार एक पैकेज चुनें।",
    tiers: packages.map((p) => ({
      id: p.id,
      name: p.name,
      nameHi: p.nameHi,
      price: p.price,
    })),
  },
  gallery: {
    eyebrow: "Real Events",
    eyebrowHi: "असली इवेंट",
    heading: "Feasts we've",
    headingHi: "जो भोज हमने",
    headingEm: "brought to life",
    headingEmHi: "साकार किए",
    subtitle:
      "A glimpse from real weddings, corporate galas and house parties — plated, served and celebrated by our specialists.",
    subtitleHi:
      "असली शादियों, कॉर्पोरेट गाला और हाउस पार्टियों की एक झलक — हमारे स्पेशलिस्ट द्वारा परोसी और मनाई गई।",
    cta: "Plan your feast",
    ctaHi: "अपना भोज प्लान करें",
    cluster: galleryItems.slice(0, 7).map((g, i) => ({
      id: `gc-${i + 1}`,
      title: g.title,
      titleHi: g.titleHi,
      caption: g.caption,
      captionHi: g.captionHi,
      image: g.image,
    })),
    rowOne: galleryItems.slice(0, 5).map((g, i) => ({
      id: `gr1-${i + 1}`,
      title: g.title,
      titleHi: g.titleHi,
      caption: g.caption,
      captionHi: g.captionHi,
      image: g.image,
    })),
    rowTwo: galleryItems.slice(5).map((g, i) => ({
      id: `gr2-${i + 1}`,
      title: g.title,
      titleHi: g.titleHi,
      caption: g.caption,
      captionHi: g.captionHi,
      image: g.image,
    })),
  },
  testimonials: {
    eyebrow: "Loved by Hosts",
    eyebrowHi: "मेज़बानों की पसंद",
    heading: "What Our Customers Say",
    headingHi: "हमारे ग्राहक क्या कहते हैं",
    subtitle:
      "From weddings to corporate galas — thousands of celebrations served and remembered.",
    subtitleHi:
      "शादियों से लेकर कॉर्पोरेट गाला तक — हज़ारों उत्सव परोसे और याद रखे गए।",
    items: testimonials.map((t) => ({
      id: t.id,
      name: t.name,
      role: t.role,
      roleHi: t.roleHi,
      quote: t.quote,
      quoteHi: t.quoteHi,
      rating: t.rating,
      avatar: t.avatar,
    })),
  },
  promo: {
    heading: "This Raksha Bandhan, Gift Something Timeless",
    headingHi: "इस रक्षा बंधन, कुछ अनमोल उपहार दें",
    subtitle:
      "Unique gifts made from real Bhojpatra for your loved ones — get offer updates first.",
    subtitleHi:
      "अपनों के लिए असली भोजपत्र से बने अनोखे उपहार — ऑफर अपडेट सबसे पहले पाएं।",
    image: "/promo-baina-box.png",
  },
  booking: {
    heading: "Book Your Celebration",
    headingHi: "अपना उत्सव बुक करें",
    subtitle: "Fill in the details to confirm your booking.",
    subtitleHi: "अपनी बुकिंग पक्की करने के लिए विवरण भरें।",
  },
};

/* ── Reconcile (merge stored content over defaults) ───────────────────────── */

/** Unsplash photo ids that 404 — drop stored hero overrides that reference them
 *  so saved CMS data self-heals after catalog fixes. */
const BROKEN_HERO_PHOTO_IDS = [
  "photo-1599669300163-7e84be7172c",
  "photo-1587427296010-57d8f2d7d1ac",
  "photo-1564507592333-c606332012b5",
  "photo-1596178060521-6a8d08d3f7c8",
  "photo-1558981403-c5f9899a28ea",
  "photo-1587474260584-136574529e8e",
];

export function isBrokenHeroImage(url: string): boolean {
  return BROKEN_HERO_PHOTO_IDS.some((id) => url.includes(id));
}
function mergeHeroImageMap(
  defaults: Record<string, string>,
  stored?: Record<string, string>,
): Record<string, string> {
  const merged = { ...defaults };
  if (!stored) return merged;
  for (const [key, url] of Object.entries(stored)) {
    if (url && !isBrokenHeroImage(url)) merged[key] = url;
  }
  return merged;
}

/** Per-section shallow merge so newly-added fields keep a default value, while
 *  a saved array (categories, items…) replaces the default wholesale. */
export function reconcile(stored: Partial<HomeContent> | null): HomeContent {
  if (!stored) return DEFAULT_HOME_CONTENT;
  const d = DEFAULT_HOME_CONTENT;
  return {
    hero: {
      ...d.hero,
      ...stored.hero,
      backgroundsByOccasion: mergeHeroImageMap(
        d.hero.backgroundsByOccasion ?? {},
        stored.hero?.backgroundsByOccasion,
      ),
      backgroundsByLocation: mergeHeroImageMap(
        d.hero.backgroundsByLocation ?? {},
        stored.hero?.backgroundsByLocation,
      ),
      trustBadges: stored.hero?.trustBadges?.length
        ? stored.hero.trustBadges
        : d.hero.trustBadges,
    },
    brandRibbon: {
      ...d.brandRibbon,
      ...stored.brandRibbon,
      brands: stored.brandRibbon?.brands?.length
        ? stored.brandRibbon.brands.map((item, index) => {
            const normalized = normalizeRibbonBrand(item);
            const seed =
              d.brandRibbon.brands.find((s) => s.id === item.id) ??
              d.brandRibbon.brands[index % d.brandRibbon.brands.length];
            if (!seed) return normalized;
            // Backfill every empty display field from realistic dummy content.
            // The positional fallback also migrates older cards whose ids no
            // longer match the current seed list.
            return {
              ...normalized,
              logo: normalized.logo || seed.logo,
              image: normalized.image || seed.image,
              location: normalized.location || seed.location,
              locationHi: normalized.locationHi || seed.locationHi,
              rating: normalized.rating || seed.rating,
              reviewCount: normalized.reviewCount || seed.reviewCount,
              category: normalized.category || seed.category,
              categoryHi: normalized.categoryHi || seed.categoryHi,
              specialty: normalized.specialty || seed.specialty,
              specialtyHi: normalized.specialtyHi || seed.specialtyHi,
              priceFrom: normalized.priceFrom || seed.priceFrom,
              since: normalized.since || seed.since,
            };
          })
        : d.brandRibbon.brands,
    },
    services: {
      ...d.services,
      ...stored.services,
      categories: stored.services?.categories?.length
        ? stored.services.categories
        : d.services.categories,
      bainaBox: { ...d.services.bainaBox, ...stored.services?.bainaBox },
    },
    occasions: {
      ...d.occasions,
      ...stored.occasions,
      items: stored.occasions?.items?.length
        ? stored.occasions.items
        : d.occasions.items,
    },
    bainaBoxes: {
      ...d.bainaBoxes,
      ...stored.bainaBoxes,
      brands: stored.bainaBoxes?.brands?.length
        ? stored.bainaBoxes.brands
        : d.bainaBoxes.brands,
    },
    bainaBoxSpecial: (() => {
      const merged = { ...d.bainaBoxSpecial, ...stored.bainaBoxSpecial };
      // Content saved before the in-house artwork existed points at the
      // retired Unsplash default — heal it to the brand illustration.
      if (merged.image?.includes("photo-1601050690597")) {
        merged.image = d.bainaBoxSpecial.image;
      }
      return merged;
    })(),
    packages: {
      ...d.packages,
      ...stored.packages,
      tiers: stored.packages?.tiers?.length
        ? stored.packages.tiers.map((t) =>
            t.id === "custom" || t.name?.toLowerCase().includes("customised") || t.name?.toLowerCase().includes("customized")
              ? { ...t, name: "Single Stall", nameHi: "सिंगल स्टॉल" }
              : t
          )
        : d.packages.tiers,
    },
    gallery: (() => {
      // `items` was the old single list; migrate it into the three groups so
      // content saved before the split isn't lost.
      const g = stored.gallery as
        | (Partial<HomeContent["gallery"]> & { items?: HomeGalleryItem[] })
        | undefined;
      const legacy = g?.items?.length ? g.items : null;
      return {
        ...d.gallery,
        ...stored.gallery,
        cluster: g?.cluster?.length
          ? g.cluster
          : legacy
            ? legacy.slice(0, 7)
            : d.gallery.cluster,
        rowOne: g?.rowOne?.length
          ? g.rowOne
          : legacy
            ? legacy.slice(0, 5)
            : d.gallery.rowOne,
        rowTwo: g?.rowTwo?.length
          ? g.rowTwo
          : legacy
            ? legacy.slice(5)
            : d.gallery.rowTwo,
      };
    })(),
    testimonials: {
      ...d.testimonials,
      ...stored.testimonials,
      items: stored.testimonials?.items?.length
        ? stored.testimonials.items.map((item) => {
            const seed = d.testimonials.items.find((s) => s.id === item.id);
            return {
              ...item,
              avatar: item.avatar || seed?.avatar,
            };
          })
        : d.testimonials.items,
    },
    promo: { ...d.promo, ...stored.promo },
    booking: { ...d.booking, ...stored.booking },
  };
}

/* ── Hero background resolution ───────────────────────────────────────────── */

/** Pick the hero backdrop for the current booking-bar selections. Priority is
 *  admin-configurable (`backgroundPriority`); within each tier the same
 *  fallbacks apply (CMS override → seed catalog). */
export function resolveHeroBackground(
  hero: HomeContent["hero"],
  occasionId: string,
  locationId: string,
  homeOccasions?: HomeOccasion[],
): string {
  const occasionBg = (() => {
    const byOcc = hero.backgroundsByOccasion?.[occasionId];
    if (byOcc) return byOcc;
    const cmsOcc = homeOccasions?.find((o) => o.id === occasionId);
    if (cmsOcc?.image) return cmsOcc.image;
    return heroEventImages[occasionId];
  })();

  const locationBg = (() => {
    const byLoc = hero.backgroundsByLocation?.[locationId];
    if (byLoc) return byLoc;
    return heroLocationImages[locationId];
  })();

  const priority = hero.backgroundPriority ?? "occasion";
  if (priority === "location") {
    if (locationBg) return locationBg;
    if (occasionBg) return occasionBg;
  } else {
    if (occasionBg) return occasionBg;
    if (locationBg) return locationBg;
  }

  return hero.background;
}

/** Every distinct hero backdrop that may appear — used to preload/crossfade. */
export function collectHeroBackgroundUrls(
  content: Pick<HomeContent, "hero" | "occasions">,
): string[] {
  const urls = new Set<string>();
  const push = (src?: string) => {
    if (src) urls.add(src);
  };

  push(content.hero.background);
  Object.values(content.hero.backgroundsByOccasion ?? {}).forEach(push);
  Object.values(content.hero.backgroundsByLocation ?? {}).forEach(push);
  content.occasions.items.forEach((o) => push(o.image));
  Object.values(heroEventImages).forEach(push);
  Object.values(heroLocationImages).forEach(push);

  return [...urls];
}

/* ── Image helper ─────────────────────────────────────────────────────────── */

/**
 * Whether a `next/image` `src` must bypass the optimizer. Local public assets
 * (`/…`) and the allow-listed Unsplash host are optimized as usual; admin-set
 * images (data: URLs from an upload, or a pasted third-party URL) are rendered
 * unoptimized so they don't hit the remote-pattern allow-list.
 */
export function isUnoptimized(src: string): boolean {
  if (!src) return false;
  if (src.startsWith("/")) return false;
  if (src.includes("images.unsplash.com")) return false;
  return true;
}
