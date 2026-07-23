"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { vendorListings, cities, type VendorListing } from "@/lib/data";
import {
  slugifyName,
  fetchMyBookings,
  onStoredBookingsChange,
  type StoredBooking,
} from "@/lib/bookings";
import { useVendorRatings, statFor } from "@/lib/vendorRatings";
import { useCompare } from "@/lib/compare";
import { openCompareTable } from "@/lib/compareTray";
import CompareTray from "@/components/vendors/CompareTray";
import VendorReviewPanel from "@/components/vendors/VendorReviewPanel";
import ReviewCard from "@/components/vendors/ReviewCard";
import { Stars, StarIcon } from "@/components/reviews/reviewDisplay";
import { Button } from "@/components/ui";
import { SITE_ORIGIN } from "@/components/WhatsAppShareButton";
import { WhatsApp } from "@/components/icons";

/** One customer review as returned by `GET /api/reviews`. */
interface StoredReview {
  /** The booking this review is for — matches one of the signed-in customer's
   *  own orders when it's their review (so it becomes editable). */
  bookingId: string;
  vendorId: string;
  vendor: string;
  name: string;
  occasion: string;
  city: string;
  rating: number;
  comment: string;
  images?: string[];
  createdAt: string;
}

/** A small cream disc with a red check — the trust marker in the summary. */
function CheckBadge() {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cream-2">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3 w-3 text-maroon"
        aria-hidden="true"
      >
        <path d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

/** Brand-aligned tier badge styling (mirrors the catalogue card). */
function tierBadgeClass(tier: VendorListing["tiers"][number]): string {
  switch (tier) {
    case "Platinum":
      return "bg-maroon text-cream";
    case "Gold":
      return "bg-cream-3 text-ink";
    default:
      return "bg-cream-2 text-ink";
  }
}

/**
 * Signature dishes for the "Famous For" strip, keyed by cuisine — the first of
 * the vendor's cuisines with an entry wins. Placeholder content for the curated
 * seed listings; real onboarded vendors will declare their own.
 */
const FAMOUS_FOR: Record<
  string,
  { name: string; nameHi: string; icon: string }[]
> = {
  Chaat: [
    { name: "Gol Gappe", nameHi: "गोल गप्पे", icon: "🥟" },
    { name: "Aloo Tikki Chaat", nameHi: "आलू टिक्की चाट", icon: "🥔" },
    { name: "Dahi Bhalla", nameHi: "दही भल्ला", icon: "🥣" },
    { name: "Papdi Chaat", nameHi: "पापड़ी चाट", icon: "🫓" },
  ],
  Mughlai: [
    { name: "Galouti Kebab", nameHi: "गलौटी कबाब", icon: "🍢" },
    { name: "Dum Biryani", nameHi: "दम बिरयानी", icon: "🍛" },
    { name: "Mutton Korma", nameHi: "मटन कोरमा", icon: "🍲" },
    { name: "Sheermal", nameHi: "शीरमाल", icon: "🫓" },
  ],
  "North Indian": [
    { name: "Dal Makhani", nameHi: "दाल मखनी", icon: "🍲" },
    { name: "Paneer Lababdar", nameHi: "पनीर लबाबदार", icon: "🧀" },
    { name: "Tandoori Platter", nameHi: "तंदूरी प्लैटर", icon: "🍢" },
    { name: "Gulab Jamun", nameHi: "गुलाब जामुन", icon: "🍮" },
  ],
  Punjabi: [
    { name: "Chole Bhature", nameHi: "छोले भटूरे", icon: "🫓" },
    { name: "Butter Chicken", nameHi: "बटर चिकन", icon: "🍗" },
    { name: "Amritsari Kulcha", nameHi: "अमृतसरी कुलचा", icon: "🥙" },
    { name: "Lassi", nameHi: "लस्सी", icon: "🥛" },
  ],
  "South Indian": [
    { name: "Masala Dosa", nameHi: "मसाला डोसा", icon: "🥞" },
    { name: "Idli Sambar", nameHi: "इडली सांभर", icon: "🍚" },
    { name: "Chettinad Curry", nameHi: "चेट्टीनाड करी", icon: "🍛" },
    { name: "Filter Coffee", nameHi: "फ़िल्टर कॉफ़ी", icon: "☕" },
  ],
  Bengali: [
    { name: "Kosha Mangsho", nameHi: "कोशा मांग्शो", icon: "🍲" },
    { name: "Fish Curry", nameHi: "मछली करी", icon: "🐟" },
    { name: "Rosogolla", nameHi: "रसगुल्ला", icon: "🍡" },
    { name: "Mishti Doi", nameHi: "मिष्टी दोई", icon: "🥣" },
  ],
  Chinese: [
    { name: "Hakka Noodles", nameHi: "हक्का नूडल्स", icon: "🍜" },
    { name: "Veg Manchurian", nameHi: "वेज मंचूरियन", icon: "🥡" },
    { name: "Spring Rolls", nameHi: "स्प्रिंग रोल", icon: "🌯" },
    { name: "Chilli Paneer", nameHi: "चिली पनीर", icon: "🌶️" },
  ],
  Continental: [
    { name: "Wood-fired Pizza", nameHi: "वुड-फ़ायर्ड पिज़्ज़ा", icon: "🍕" },
    { name: "Pasta Station", nameHi: "पास्ता स्टेशन", icon: "🍝" },
    { name: "Grilled Sizzlers", nameHi: "ग्रिल्ड सिज़लर", icon: "🥘" },
    { name: "Salad Bar", nameHi: "सलाद बार", icon: "🥗" },
  ],
  "Baina Boxes": [
    { name: "Motichoor Ladoo", nameHi: "मोतीचूर लड्डू", icon: "🍮" },
    { name: "Kaju Katli", nameHi: "काजू कतली", icon: "🍬" },
    { name: "Dry Fruit Box", nameHi: "ड्राई फ्रूट बॉक्स", icon: "🥜" },
    { name: "Gujiya", nameHi: "गुझिया", icon: "🥟" },
  ],
  Beverages: [
    { name: "Masala Shikanji", nameHi: "मसाला शिकंजी", icon: "🍋" },
    { name: "Thandai", nameHi: "ठंडाई", icon: "🥛" },
    { name: "Mocktail Counter", nameHi: "मॉकटेल काउंटर", icon: "🍹" },
    { name: "Fresh Juices", nameHi: "ताज़ा जूस", icon: "🧃" },
  ],
  Decor: [
    { name: "Mandap Styling", nameHi: "मंडप सज्जा", icon: "🏵️" },
    { name: "Floral Themes", nameHi: "पुष्प थीम", icon: "💐" },
    { name: "Stage Backdrops", nameHi: "स्टेज बैकड्रॉप", icon: "✨" },
    { name: "Festive Lighting", nameHi: "उत्सव रोशनी", icon: "🪔" },
  ],
};

/**
 * Sample menu sections keyed by cuisine — merged across all of the vendor's
 * cuisines. Placeholder content, same as the seed listings themselves.
 */
const SAMPLE_MENU: Record<
  string,
  { name: string; nameHi: string; icon: string; items: string[] }[]
> = {
  Chaat: [
    {
      name: "Chaat Counter", nameHi: "चाट काउंटर", icon: "🥟",
      items: ["Gol Gappe", "Aloo Tikki Chaat", "Dahi Bhalla", "Papdi Chaat", "Raj Kachori", "Basket Chaat"],
    },
    {
      name: "Live Counters", nameHi: "लाइव काउंटर", icon: "🍽️",
      items: ["Pav Bhaji", "Matra Chaat", "Kulle Chaat", "Fruit Chaat"],
    },
  ],
  Mughlai: [
    {
      name: "Starters", nameHi: "स्टार्टर", icon: "🍢",
      items: ["Galouti Kebab", "Shami Kebab", "Seekh Kebab", "Chicken Malai Tikka", "Veg Shammi"],
    },
    {
      name: "Main Course", nameHi: "मुख्य व्यंजन", icon: "🍛",
      items: ["Dum Biryani", "Mutton Korma", "Nihari", "Awadhi Pulao", "Sheermal", "Butter Naan"],
    },
  ],
  "North Indian": [
    {
      name: "Main Course", nameHi: "मुख्य व्यंजन", icon: "🍲",
      items: ["Dal Makhani", "Paneer Lababdar", "Shahi Paneer", "Mix Veg", "Butter Naan", "Jeera Rice"],
    },
    {
      name: "Desserts", nameHi: "मिठाई", icon: "🍮",
      items: ["Gulab Jamun", "Moong Dal Halwa", "Kheer", "Jalebi"],
    },
  ],
  Punjabi: [
    {
      name: "Starters", nameHi: "स्टार्टर", icon: "🍢",
      items: ["Paneer Tikka", "Tandoori Chicken", "Hara Bhara Kebab", "Amritsari Fish"],
    },
    {
      name: "Main Course", nameHi: "मुख्य व्यंजन", icon: "🍛",
      items: ["Chole Bhature", "Butter Chicken", "Sarson da Saag", "Makki di Roti", "Rajma Chawal", "Lassi"],
    },
  ],
  "South Indian": [
    {
      name: "Tiffin", nameHi: "टिफ़िन", icon: "🥞",
      items: ["Masala Dosa", "Idli Sambar", "Medu Vada", "Uttapam", "Pongal"],
    },
    {
      name: "Main Course", nameHi: "मुख्य व्यंजन", icon: "🍛",
      items: ["Chettinad Curry", "Sambar Rice", "Lemon Rice", "Curd Rice", "Filter Coffee"],
    },
  ],
  Bengali: [
    {
      name: "Main Course", nameHi: "मुख्य व्यंजन", icon: "🍲",
      items: ["Kosha Mangsho", "Fish Curry", "Luchi Aloor Dom", "Basanti Pulao"],
    },
    {
      name: "Desserts", nameHi: "मिठाई", icon: "🍡",
      items: ["Rosogolla", "Mishti Doi", "Sandesh", "Payesh"],
    },
  ],
  Chinese: [
    {
      name: "Starters", nameHi: "स्टार्टर", icon: "🥠",
      items: ["Spring Rolls", "Chilli Paneer", "Honey Chilli Potato", "Manchow Soup"],
    },
    {
      name: "Main Course", nameHi: "मुख्य व्यंजन", icon: "🍜",
      items: ["Hakka Noodles", "Veg Manchurian", "Fried Rice", "Chilli Chicken"],
    },
  ],
  Continental: [
    {
      name: "Live Counters", nameHi: "लाइव काउंटर", icon: "🍕",
      items: ["Wood-fired Pizza", "Pasta Station", "Grilled Sizzlers", "Salad Bar"],
    },
    {
      name: "Main Course", nameHi: "मुख्य व्यंजन", icon: "🍝",
      items: ["Mushroom Stroganoff", "Herb Rice", "Roast Veggies", "Garlic Bread"],
    },
  ],
  "Baina Boxes": [
    {
      name: "Signature Boxes", nameHi: "सिग्नेचर बॉक्स", icon: "🎁",
      items: ["Motichoor Ladoo", "Kaju Katli", "Gujiya", "Dry Fruit Box", "Milk Cake", "Besan Barfi"],
    },
  ],
  Sweets: [
    {
      name: "Mithai Counter", nameHi: "मिठाई काउंटर", icon: "🍬",
      items: ["Rasmalai", "Rabri", "Kulfi Falooda", "Gajar Halwa", "Jalebi", "Kheer"],
    },
  ],
  Beverages: [
    {
      name: "Welcome Drinks", nameHi: "वेलकम ड्रिंक्स", icon: "🥤",
      items: ["Masala Shikanji", "Aam Panna", "Rose Sharbat", "Thandai", "Nimbu Pani"],
    },
    {
      name: "Mocktail Counter", nameHi: "मॉकटेल काउंटर", icon: "🍹",
      items: ["Virgin Mojito", "Blue Lagoon", "Fruit Punch", "Fresh Juices"],
    },
  ],
  Decor: [
    {
      name: "Decor Packages", nameHi: "सजावट पैकेज", icon: "🏵️",
      items: ["Mandap Styling", "Floral Themes", "Stage Backdrops", "Festive Lighting", "Entrance Arch", "Table Centrepieces"],
    },
  ],
};

/** Shared shell for the maroon line icons used across the detail sections. */
function LineIcon({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <LineIcon className={className}>
      <path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </LineIcon>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <LineIcon className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </LineIcon>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <LineIcon className={className}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
    </LineIcon>
  );
}

function CompareIcon({ className }: { className?: string }) {
  return (
    <LineIcon className={className}>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </LineIcon>
  );
}

function RosetteIcon({ className }: { className?: string }) {
  return (
    <LineIcon className={className}>
      <circle cx="12" cy="8" r="6" />
      <path d="m15.48 12.89 1.51 8.52a.5.5 0 0 1-.81.47l-3.58-2.68a1 1 0 0 0-1.2 0l-3.59 2.68a.5.5 0 0 1-.81-.47l1.52-8.52" />
    </LineIcon>
  );
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <LineIcon className={className}>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </LineIcon>
  );
}

function PeopleIcon({ className }: { className?: string }) {
  return (
    <LineIcon className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </LineIcon>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <LineIcon className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </LineIcon>
  );
}

function HeartIcon({
  className,
  filled = false,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

/** localStorage key holding the ids of vendors the customer has hearted. */
const SAVED_VENDORS_KEY = "bp:saved-vendors";

/**
 * Quick-action button recipe — the shared Button's look at responsive density.
 * The design keeps all four actions on one row even on phones, which needs
 * tighter padding/type than Button's fixed size steps allow.
 */
const ACTION_BASE =
  "focus-ring tap relative inline-flex min-h-11 items-center justify-center gap-1 whitespace-nowrap rounded-control px-1 text-[11px] font-semibold transition duration-200 ease-out touch-manipulation active:scale-[.98] sm:min-h-12 sm:gap-2 sm:px-5 sm:text-base";
const ACTION_PRIMARY = `${ACTION_BASE} btn-sheen bg-maroon text-cream shadow-brand hover:-translate-y-0.5 hover:shadow-pop`;
const ACTION_SECONDARY = `${ACTION_BASE} border border-maroon bg-transparent text-maroon hover:bg-maroon hover:text-cream`;

export default function VendorDetail({ id }: { id: string }) {
  const { t } = useLang();
  const vendor = useMemo(
    () => vendorListings.find((v) => v.id === id) ?? null,
    [id],
  );

  if (!vendor) {
    return (
      <section className="mx-auto max-w-5xl px-5 py-16 text-center">
        <h1 className="font-display text-2xl text-ink">
          {t("Caterer not found", "कैटरर नहीं मिला")}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {t(
            "This caterer may have been removed. Browse all caterers instead.",
            "यह कैटरर हटाया जा चुका हो सकता है। सभी कैटरर देखें।",
          )}
        </p>
        <Button href="/vendors" variant="primary" size="lg" className="mt-6">
          {t("Back to Caterers", "कैटरर पर वापस")}
        </Button>
      </section>
    );
  }

  return <VendorProfile vendor={vendor} t={t} />;
}

function VendorProfile({
  vendor,
  t,
}: {
  vendor: VendorListing;
  t: (en: string, hi: string) => string;
}) {
  const ratings = useVendorRatings();
  const stats = statFor(ratings, vendor);

  const { has, toggle, isFull, count: compareCount } = useCompare();
  const inCompare = has(vendor.id);
  const compareDisabled = !inCompare && isFull;

  // "Share" quick action — native share sheet where available, else copy link.
  const [linkCopied, setLinkCopied] = useState(false);
  const profileUrl = `${SITE_ORIGIN}/vendors/${vendor.id}`;
  const handleShare = () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      navigator.share({ title: vendor.name, url: profileUrl }).catch(() => {});
      return;
    }
    void navigator.clipboard?.writeText(profileUrl).then(() => {
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  // "Heart" in the top bar — a device-local save list.
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try {
      const list = JSON.parse(
        localStorage.getItem(SAVED_VENDORS_KEY) ?? "[]",
      ) as string[];
      setSaved(list.includes(vendor.id));
    } catch {}
  }, [vendor.id]);
  const toggleSaved = () => {
    setSaved((prev) => {
      const next = !prev;
      try {
        const list = new Set<string>(
          JSON.parse(
            localStorage.getItem(SAVED_VENDORS_KEY) ?? "[]",
          ) as string[],
        );
        if (next) list.add(vendor.id);
        else list.delete(vendor.id);
        localStorage.setItem(SAVED_VENDORS_KEY, JSON.stringify([...list]));
      } catch {}
      return next;
    });
  };

  // WhatsApp forward — same promo-share deep link WhatsAppShareButton builds.
  const waMessage = t(
    `Check out ${vendor.name} on Bhojpatra — a verified caterer in ${vendor.city} from ₹${vendor.priceFrom.toLocaleString("en-IN")}/plate.`,
    `${vendor.name} को Bhojpatra पर देखें — ${vendor.city} में एक वेरिफाइड कैटरर, ₹${vendor.priceFrom.toLocaleString("en-IN")}/प्लेट से।`,
  );
  const waHref = `https://wa.me/?text=${encodeURIComponent(`${waMessage} ${profileUrl}`)}`;

  const famousFor = vendor.cuisines.map((c) => FAMOUS_FOR[c]).find(Boolean);

  // Menu sections merged across the vendor's cuisines — same-named courses
  // (e.g. two cuisines both offering "Main Course") collapse into one.
  const menu = useMemo(() => {
    const sections: { name: string; nameHi: string; icon: string; items: string[] }[] = [];
    for (const c of vendor.cuisines) {
      for (const sec of SAMPLE_MENU[c] ?? []) {
        const existing = sections.find((s) => s.name === sec.name);
        if (existing) {
          for (const it of sec.items)
            if (!existing.items.includes(it)) existing.items.push(it);
        } else {
          sections.push({ ...sec, items: [...sec.items] });
        }
      }
    }
    return sections;
  }, [vendor.cuisines]);

  // Real, customer-submitted reviews for this vendor. Best-effort — falls back
  // to an empty list (and the "no reviews yet" state) on any failure. Exposed as
  // a callback so the review panel can re-pull the list after a fresh submit.
  const [reviews, setReviews] = useState<StoredReview[]>([]);
  const loadReviews = useCallback(() => {
    const slug = slugifyName(vendor.name);
    fetch("/api/reviews")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { reviews?: StoredReview[] } | null) => {
        if (!d?.reviews) return;
        setReviews(
          d.reviews.filter(
            (r) =>
              (r.vendorId && r.vendorId === vendor.id) ||
              slugifyName(r.vendor ?? "") === slug,
          ),
        );
      })
      .catch(() => {});
  }, [vendor.id, vendor.name]);
  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const session = useSession();

  // The signed-in customer's own orders — kept live so a review whose booking id
  // matches one of these can be told apart as "theirs" and made editable inline.
  const [myBookings, setMyBookings] = useState<StoredBooking[]>([]);
  useEffect(() => {
    let active = true;
    const load = () => {
      void fetchMyBookings().then((list) => {
        if (active) setMyBookings(list);
      });
    };
    load();
    const unsub = onStoredBookingsChange(load);
    return () => {
      active = false;
      unsub();
    };
  }, []);
  const myBookingById = useMemo(
    () => new Map(myBookings.map((b) => [b.id, b] as const)),
    [myBookings],
  );

  const localize = (value: string): string => {
    switch (value) {
      case "Veg":
        return t("Veg", "वेज");
      case "Non-Veg":
        return t("Non-Veg", "नॉन-वेज");
      case "Veg & Non-Veg":
        return t("Veg & Non-Veg", "वेज और नॉन-वेज");
      case "Silver":
        return t("Silver", "सिल्वर");
      case "Gold":
        return t("Gold", "गोल्ड");
      case "Platinum":
        return t("Platinum", "प्लैटिनम");
      case "Breakfast":
        return t("Breakfast", "नाश्ता");
      case "Lunch":
        return t("Lunch", "दोपहर का भोजन");
      case "Hi-tea":
        return t("Hi-tea", "हाई-टी");
      case "Dinner":
        return t("Dinner", "रात्रि भोज");
      case "Starters":
        return t("Starters", "स्टार्टर");
      case "Main Course":
        return t("Main Course", "मुख्य व्यंजन");
      case "Desserts":
        return t("Desserts", "मिठाई");
      case "Live Counters":
        return t("Live Counters", "लाइव काउंटर");
      default:
        return value;
    }
  };

  // "Book this caterer" starts a Single Stall with this vendor pre-selected
  // (still changeable in the wizard). City is stored by name here but the wizard
  // keys off the city id, so bridge through the `cities` table. Live vendors
  // resolve by id; a curated seed id absent from the booking menu falls back to
  // the tier picker.
  const cityId = cities.find((c) => c.name === vendor.city)?.id;
  const bookHref = `/book?package=custom&vendor=${encodeURIComponent(
    vendor.id,
  )}${cityId ? `&city=${cityId}` : ""}&step=menu`;

  // A live aggregate from the reviews just loaded for this vendor, so a rating
  // submitted from the panel below is reflected immediately (the shared
  // `useVendorRatings` summary only fetches once on mount).
  const liveStat = reviews.length
    ? {
        rating:
          Math.round(
            (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length) *
              10,
          ) / 10,
        count: reviews.length,
      }
    : undefined;
  // Prefer the live count, then the shared aggregate, then the static seed.
  const verified = liveStat ?? stats;
  const shownRating = verified?.rating ?? vendor.rating;
  const shownCount = verified?.count ?? vendor.reviews;

  // Star breakdown for the ratings summary, built from the written reviews we
  // actually loaded. The headline count equals this list's length whenever any
  // written review exists, so the breakdown and headline never disagree.
  const hasWritten = reviews.length > 0;
  const dist = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0]; // [5★, 4★, 3★, 2★, 1★]
    for (const r of reviews) {
      const s = Math.round(r.rating);
      if (s >= 1 && s <= 5) buckets[5 - s] += 1;
    }
    return buckets;
  }, [reviews]);

  return (
    <section
      className={
        "app-bottom-safe mx-auto max-w-6xl sm:px-5 sm:py-6 lg:py-10 " +
        (compareCount > 0 ? "pb-32 sm:pb-36" : "")
      }
    >
      {/* ── Minimal top bar — back left, save + share right ───────── */}
      <div className="sticky top-0 z-30 mb-1 flex items-center justify-between bg-white px-2 py-1 pt-[max(0.5rem,var(--safe-top))] sm:mb-2 sm:rounded-b-hero">
        <Link
          href="/vendors"
          aria-label={t("Back to caterers", "कैटरर पर वापस")}
          className="focus-ring tap flex h-11 w-11 items-center justify-center rounded-full text-ink transition duration-150 hover:bg-cream/60 active:scale-95"
        >
          <LineIcon className="h-5 w-5">
            <path d="M15 6 9 12l6 6" />
          </LineIcon>
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleSaved}
            aria-pressed={saved}
            aria-label={
              saved
                ? t("Remove from saved", "सेव से हटाएँ")
                : t("Save this caterer", "यह कैटरर सेव करें")
            }
            className="focus-ring tap flex h-11 w-11 items-center justify-center rounded-full transition duration-150 hover:bg-cream/60 active:scale-95"
          >
            <HeartIcon
              className={"h-5 w-5 " + (saved ? "text-maroon" : "text-ink")}
              filled={saved}
            />
          </button>
          <button
            type="button"
            onClick={handleShare}
            aria-label={t("Share", "शेयर")}
            className="focus-ring tap flex h-11 w-11 items-center justify-center rounded-full text-ink transition duration-150 hover:bg-cream/60 active:scale-95"
          >
            <ShareIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:mt-2 sm:px-0 lg:mt-4">
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <div className="relative -mx-4 aspect-[16/10] w-[calc(100%+2rem)] overflow-hidden bg-cream sm:mx-0 sm:aspect-[16/9] sm:w-full sm:rounded-hero sm:border sm:border-maroon/6 sm:shadow-card">
          <Image
            src={vendor.image}
            alt={vendor.name}
            fill
            priority
            sizes="(min-width: 1024px) 896px, 100vw"
            className="object-cover"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent sm:hidden"
          />
          <span className="absolute left-3 top-3 flex flex-wrap gap-1.5 sm:left-4 sm:top-4">
            {vendor.tiers.map((tier) => (
              <span
                key={tier}
                className={
                  "rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm sm:px-3 sm:text-xs " +
                  tierBadgeClass(tier)
                }
              >
                {localize(tier)}
              </span>
            ))}
          </span>
          {vendor.verified && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-maroon shadow-sm backdrop-blur-sm sm:right-4 sm:top-4 sm:px-3 sm:text-xs">
              <span aria-hidden="true">✓</span> {t("Verified", "वेरिफाइड")}
            </span>
          )}
          {/* Rating pill — maroon score segment + white review-count segment. */}
          <a
            href="#reviews"
            className="absolute bottom-8 left-3 flex overflow-hidden rounded-full shadow-sm sm:bottom-4 sm:left-4"
          >
            <span className="flex items-center gap-1 bg-maroon px-2.5 py-1.5 text-xs font-bold text-white">
              <StarIcon className="h-3.5 w-3.5 text-cream" />
              {shownRating}
            </span>
            <span className="flex items-center bg-white px-2.5 py-1.5 text-xs font-medium text-ink">
              ({shownCount.toLocaleString("en-IN")} {t("Reviews", "समीक्षाएँ")})
            </span>
          </a>
        </div>

        {/* ── Content sheet — rounded white card overlapping the hero ── */}
        <div className="relative -mx-4 -mt-5 rounded-t-hero bg-white px-4 pt-6 sm:mx-0 sm:mt-0 sm:rounded-none sm:bg-transparent sm:px-0 sm:pt-0">
        {/* ── Title + fixed-price card ─────────────────────────────── */}
        <div className="flex items-stretch justify-between gap-3 sm:mt-7 sm:gap-8">
          <div className="min-w-0 flex-1">
            <h1 className="font-sans text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {vendor.name}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft sm:text-base">
              <MapPinIcon className="h-4 w-4 shrink-0 text-maroon" />
              {vendor.city}, {vendor.state}
            </p>

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              {vendor.cuisines.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-cream-2 px-3.5 py-1.5 text-sm font-medium text-ink"
                >
                  {c}
                </span>
              ))}
              <span className="rounded-full border border-cream-3 bg-white px-3.5 py-1.5 text-sm font-medium text-ink">
                {localize(vendor.diet)}
              </span>
            </div>

            {vendor.mealTypes.length > 0 && (
              <p className="mt-3.5 text-sm text-ink-soft sm:text-[15px]">
                <span className="font-bold text-ink">
                  {t("Serves", "परोसता है")}:
                </span>{" "}
                {vendor.mealTypes.map(localize).join(" • ")}
              </p>
            )}
          </div>

          <div className="shrink-0 border-l border-cream-3 pl-3 sm:pl-8">
            <div className="w-40 rounded-2xl border border-cream-3 bg-white p-4 shadow-sm sm:w-60 sm:p-5">
              <p className="text-sm text-ink-soft">
                {t("Fixed Price", "निश्चित मूल्य")}
              </p>
              <p className="mt-1 font-display text-4xl font-bold text-maroon">
                ₹{vendor.priceFrom.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-lg font-bold text-ink">
                / {t("plate", "प्लेट")}
              </p>
              <div className="mt-4 flex items-center gap-2.5 border-t border-cream-3 pt-4">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream-2 text-base font-bold text-maroon"
                >
                  ₹
                </span>
                <span className="text-xs leading-snug text-ink">
                  {t("All inclusive", "सब कुछ शामिल")}
                  <span className="block text-ink-soft">
                    {t("No hidden charges", "कोई छिपा शुल्क नहीं")}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Famous For ───────────────────────────────────────────── */}
        {famousFor && (
          <div className="mt-6 rounded-2xl border border-cream-3 bg-cream/40 p-4 sm:p-6">
            <p className="text-base font-bold text-maroon sm:text-lg">
              {t("Famous For", "इनकी खासियत")}
            </p>
            <div className="mt-4 grid grid-cols-4 divide-x divide-cream-3">
              {famousFor.map((dish) => (
                <div
                  key={dish.name}
                  className="flex items-center gap-1.5 px-1.5 first:pl-0 sm:gap-2.5 sm:px-4"
                >
                  <span className="text-xl sm:text-2xl" aria-hidden="true">
                    {dish.icon}
                  </span>
                  <span className="text-[11px] font-medium leading-tight text-ink sm:text-sm sm:leading-snug">
                    {t(dish.name, dish.nameHi)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Trust highlights ─────────────────────────────────────── */}
        <div className="mt-4 rounded-2xl border border-cream-3 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid grid-cols-4 divide-x divide-cream-3">
            {[
              {
                icon: <RosetteIcon className="h-6 w-6" />,
                label: t("Hygienic Preparation", "स्वच्छ तैयारी"),
              },
              {
                icon: <LeafIcon className="h-6 w-6" />,
                label: t("Fresh Ingredients", "ताज़ी सामग्री"),
              },
              {
                icon: <PeopleIcon className="h-6 w-6" />,
                label: t("10+ Years of Trust", "10+ वर्षों का भरोसा"),
              },
              {
                icon: <ClockIcon className="h-6 w-6" />,
                label: t("Quick Service", "तेज़ सेवा"),
              },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-1.5 px-1.5 first:pl-0 sm:gap-2.5 sm:px-4"
              >
                <span className="shrink-0 text-maroon [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6">
                  {f.icon}
                </span>
                <span className="text-[10px] font-semibold leading-tight text-ink sm:max-w-28 sm:text-[13px] sm:leading-snug">
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quick actions — one row of four on every width ───────── */}
        <div className="mt-6 grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-2 sm:gap-3">
          <Link href={bookHref} className={ACTION_PRIMARY}>
            <CalendarIcon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            {t("Book Now", "अभी बुक करें")}
          </Link>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className={ACTION_SECONDARY}
          >
            <WhatsApp className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
            {t("WhatsApp", "व्हाट्सएप")}
          </a>
          <button type="button" onClick={handleShare} className={ACTION_SECONDARY}>
            <ShareIcon className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
            {linkCopied ? t("Copied", "कॉपी हुआ") : t("Share", "शेयर")}
          </button>
          <button
            type="button"
            onClick={() => toggle(vendor.id)}
            disabled={compareDisabled}
            aria-pressed={inCompare}
            className={
              (inCompare ? ACTION_PRIMARY : ACTION_SECONDARY) +
              " disabled:pointer-events-none disabled:opacity-50"
            }
          >
            <CompareIcon className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
            {inCompare ? t("Added", "जोड़ा गया") : t("Compare", "तुलना करें")}
          </button>
        </div>
        {compareCount >= 2 && (
          <button
            type="button"
            onClick={openCompareTable}
            className="mt-3 block w-full text-center text-sm font-semibold text-maroon hover:underline"
          >
            {t(
              `Compare ${compareCount} selected →`,
              `${compareCount} चुने हुए की तुलना करें →`,
            )}
          </button>
        )}

        {/* ── Ideal For ────────────────────────────────────────────── */}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-cream-3 bg-white px-5 py-4 shadow-sm">
          <span className="flex items-center gap-2 text-sm font-bold text-maroon">
            <PeopleIcon className="h-5 w-5" />
            {t("Ideal For", "इनके लिए उपयुक्त")}
          </span>
          <span className="text-sm text-ink">
            {[
              t("Parties", "पार्टियाँ"),
              t("Weddings", "शादियाँ"),
              t("Corporate Events", "कॉर्पोरेट आयोजन"),
              t("Family Functions", "पारिवारिक समारोह"),
            ].join(" • ")}
          </span>
        </div>

        {/* ── Menu ─────────────────────────────────────────────────── */}
        {menu.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-2xl text-ink">
              {t("Menu", "मेन्यू")}
            </h2>
            <div className="mt-4 space-y-4">
              {menu.map((course) => (
                <div
                  key={course.name}
                  className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream-2 text-lg">
                      <span aria-hidden="true">{course.icon}</span>
                    </span>
                    <h3 className="font-sans text-base font-bold text-ink sm:text-lg">
                      {t(course.name, course.nameHi)}
                    </h3>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {course.items.map((it) => (
                      <span
                        key={it}
                        className="rounded-full border border-cream-3 bg-cream/40 px-3.5 py-1.5 text-sm text-ink"
                      >
                        {it}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* ── Ratings & reviews ─────────────────────────────────────────── */}
      <div id="reviews" className="mt-14 scroll-mt-32 border-t border-cream-3 pt-10">
        <div className="text-center">
          <p className="eyebrow text-xs font-semibold text-maroon">
            {t("Ratings & reviews", "रेटिंग और समीक्षाएँ")}
          </p>
          <h2 className="mt-1 font-display text-2xl text-ink sm:text-3xl">
            {t("What guests say", "मेहमान क्या कहते हैं")}
          </h2>
        </div>

        {/* Summary — headline score alongside the star breakdown (or, until
            written reviews land, the reasons the rating can be trusted). */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-cream-3 bg-white shadow-sm">
          <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[minmax(0,auto)_1fr] md:gap-10">
            <div className="flex flex-col items-center justify-center text-center md:min-w-52 md:border-r md:border-cream-3 md:pr-10">
              <p className="font-display text-6xl leading-none text-ink">
                {shownRating}
                <span className="align-top text-2xl text-ink-soft">/5</span>
              </p>
              <div className="mt-3">
                <Stars
                  rating={shownRating}
                  size={22}
                  label={t(
                    `${shownRating} out of 5 stars`,
                    `5 में से ${shownRating} स्टार`,
                  )}
                />
              </div>
              <p className="mt-3 text-sm text-ink-soft">
                {t(
                  `Rated by ${shownCount} ${shownCount === 1 ? "guest" : "guests"}`,
                  `${shownCount} मेहमानों द्वारा रेट किया गया`,
                )}
              </p>
            </div>

            {hasWritten ? (
              <ul className="flex flex-col justify-center gap-2.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = dist[5 - star];
                  const pct = reviews.length
                    ? Math.round((count / reviews.length) * 100)
                    : 0;
                  return (
                    <li key={star} className="flex items-center gap-3 text-sm">
                      <span className="flex w-11 shrink-0 items-center gap-1 font-medium text-ink">
                        {star}
                        <StarIcon className="h-3.5 w-3.5 text-maroon" />
                      </span>
                      <span
                        className="h-2.5 flex-1 overflow-hidden rounded-full bg-cream-2"
                        role="presentation"
                      >
                        <span
                          className="block h-full rounded-full bg-maroon transition-[width] duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="w-9 shrink-0 text-right tabular-nums text-ink-soft">
                        {count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ul className="flex flex-col justify-center gap-4">
                {[
                  t(
                    "Every review comes from a completed Bhojpatra booking.",
                    "हर समीक्षा एक पूर्ण Bhojpatra बुकिंग से आती है।",
                  ),
                  t(
                    "Real photos from real events — never stock imagery.",
                    "असली आयोजनों की असली तस्वीरें — कभी स्टॉक नहीं।",
                  ),
                  t(
                    "Nothing paid or incentivised — just honest hosts.",
                    "कोई भुगतान या प्रोत्साहन नहीं — बस ईमानदार मेज़बान।",
                  ),
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3 text-sm text-ink">
                    <CheckBadge />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Signed-in customers who've completed a booking can rate this caterer
            right here — mirrors the My Bookings review flow. */}
        <VendorReviewPanel vendor={vendor} onReviewed={loadReviews} />

        {reviews.length > 0 ? (
          <>
            <h3 className="mt-10 font-display text-lg text-ink">
              {t(
                `${reviews.length} written ${reviews.length === 1 ? "review" : "reviews"}`,
                `${reviews.length} लिखित समीक्षाएँ`,
              )}
            </h3>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {reviews.map((r) => {
                // The customer can edit a review only when it hangs off one of
                // their own orders (proven by the booking id matching).
                const ownBooking =
                  session?.type === "customer"
                    ? myBookingById.get(r.bookingId)
                    : undefined;
                return (
                  <ReviewCard
                    key={`${r.bookingId}:${r.vendorId || slugifyName(r.vendor)}`}
                    review={r}
                    editable={
                      ownBooking
                        ? { booking: ownBooking, onSaved: loadReviews }
                        : undefined
                    }
                  />
                );
              })}
            </ul>
          </>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-cream-3 bg-white p-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cream-2">
              <StarIcon className="h-6 w-6 text-maroon" />
            </span>
            <p className="mt-4 font-display text-lg text-ink">
              {t("No written reviews yet", "अभी कोई लिखित समीक्षा नहीं")}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
              {t(
                "This rating comes from verified bookings. Written reviews from recent guests will show up here.",
                "यह रेटिंग सत्यापित बुकिंग से है। हाल के मेहमानों की लिखित समीक्षाएँ यहाँ दिखेंगी।",
              )}
            </p>
          </div>
        )}
      </div>

      <CompareTray />
    </section>
  );
}
