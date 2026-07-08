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
} from "@/lib/data";

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface HomeCategory {
  id: string;
  name: string;
  nameHi: string;
  image: string;
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
  /** Brand logo (upload or URL) shown in the moving ribbon. When empty, the
   *  chip falls back to the brand name's initials. */
  logo: string;
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
}

export interface HomeContent {
  hero: {
    headlineTop: string;
    headlineTopHi: string;
    headlineBottom: string;
    headlineBottomHi: string;
    lede: string;
    ledeHi: string;
    /** Static backdrop used by the default (Original / Minimal) hero look. */
    background: string;
  };
  /** Moving "trusted by" ribbon of the prestigious / famous brands Bhojpatra
   *  serves. Scrolls continuously beneath the hero; fully admin-managed
   *  (enable toggle, heading and the brand chips). */
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
  };
  booking: {
    heading: string;
    headingHi: string;
    subtitle: string;
    subtitleHi: string;
  };
}

/* ── Defaults (seed content, derived from data.ts) ────────────────────────── */

export const DEFAULT_HOME_CONTENT: HomeContent = {
  hero: {
    headlineTop: "Book Verified Caterers, Food Stalls & Famous Vendors.",
    headlineTopHi: "वेरिफाइड कैटरर, फूड स्टॉल और मशहूर वेंडर बुक करें।",
    headlineBottom: "One Bhojpatra Experience.",
    headlineBottomHi: "एक भोजपत्र अनुभव।",
    lede: "Compare curated menus, customize your feast and book trusted celebration partners in minutes.",
    ledeHi:
      "क्यूरेटेड मेन्यू की तुलना करें, अपनी दावत कस्टमाइज़ करें और मिनटों में भरोसेमंद सेलिब्रेशन पार्टनर बुक करें।",
    background: "/hero-bg.webp",
  },
  brandRibbon: {
    enabled: true,
    heading: "Proudly serving India's finest brands",
    headingHi: "गर्व से भारत के बेहतरीन ब्रांड्स की सेवा में",
    // Dummy placeholders — an admin replaces these with the real brands (and
    // uploads their logos) via Admin → Content Control → Home Page → Brand
    // Ribbon. With no logo a chip shows the brand's initials.
    brands: [
      {
        id: "brand-grand-pavilion",
        name: "The Grand Pavilion",
        nameHi: "द ग्रैंड पवेलियन",
        logo: "",
      },
      {
        id: "brand-royal-rasoi",
        name: "Royal Rasoi",
        nameHi: "रॉयल रसोई",
        logo: "",
      },
      {
        id: "brand-saffron-court",
        name: "Saffron Court",
        nameHi: "सैफ्रॉन कोर्ट",
        logo: "",
      },
      {
        id: "brand-heritage-halwai",
        name: "Heritage Halwai",
        nameHi: "हेरिटेज हलवाई",
        logo: "",
      },
      {
        id: "brand-maharaja-caterers",
        name: "Maharaja Caterers",
        nameHi: "महाराजा कैटरर्स",
        logo: "",
      },
      {
        id: "brand-golden-spoon",
        name: "Golden Spoon",
        nameHi: "गोल्डन स्पून",
        logo: "",
      },
      {
        id: "brand-silver-platter",
        name: "Silver Platter",
        nameHi: "सिल्वर प्लैटर",
        logo: "",
      },
      {
        id: "brand-nawabs-kitchen",
        name: "Nawab's Kitchen",
        nameHi: "नवाब्स किचन",
        logo: "",
      },
    ],
  },
  services: {
    heading: "Services",
    headingHi: "सेवाएं",
    subtitle: "Handpicked specialists across every flavour of your celebration.",
    subtitleHi: "आपके उत्सव के हर स्वाद के लिए चुनिंदा स्पेशलिस्ट।",
    cta: "View All Categories",
    ctaHi: "सभी कैटेगरी देखें",
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      nameHi: c.nameHi,
      image: c.image,
    })),
    bainaBox: {
      id: "baina-box",
      name: "Baina Box",
      nameHi: "बैना बॉक्स",
      image:
        "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=70",
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
    image:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=70",
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
    })),
  },
  promo: {
    heading: "Get Promotional Offers First",
    headingHi: "प्रोमोशनल ऑफर सबसे पहले पाएं",
    subtitle:
      "Seasonal discounts, early-bird deals & festive menu offers — straight to you.",
    subtitleHi:
      "सीज़नल छूट, अर्ली-बर्ड डील और त्योहारी मेन्यू ऑफर — सीधे आपके पास।",
  },
  booking: {
    heading: "Book Your Celebration",
    headingHi: "अपना उत्सव बुक करें",
    subtitle: "Fill in the details to confirm your booking.",
    subtitleHi: "अपनी बुकिंग पक्की करने के लिए विवरण भरें।",
  },
};

/* ── Reconcile (merge stored content over defaults) ───────────────────────── */

/** Per-section shallow merge so newly-added fields keep a default value, while
 *  a saved array (categories, items…) replaces the default wholesale. */
export function reconcile(stored: Partial<HomeContent> | null): HomeContent {
  if (!stored) return DEFAULT_HOME_CONTENT;
  const d = DEFAULT_HOME_CONTENT;
  return {
    hero: { ...d.hero, ...stored.hero },
    brandRibbon: {
      ...d.brandRibbon,
      ...stored.brandRibbon,
      brands: stored.brandRibbon?.brands?.length
        ? stored.brandRibbon.brands
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
    bainaBoxSpecial: { ...d.bainaBoxSpecial, ...stored.bainaBoxSpecial },
    packages: {
      ...d.packages,
      ...stored.packages,
      tiers: stored.packages?.tiers?.length
        ? stored.packages.tiers
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
        ? stored.testimonials.items
        : d.testimonials.items,
    },
    promo: { ...d.promo, ...stored.promo },
    booking: { ...d.booking, ...stored.booking },
  };
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
