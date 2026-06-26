/**
 * Static content for the Bhojpatra marketing/booking scaffold.
 * Sourced from the brand mockup — swap with API/CMS data later.
 */

export interface Stat {
  value: string;
  label: string;
  iconKey: string;
}

export interface Step {
  n: string;
  title: string;
  description: string;
  iconKey: string;
  image: string;
}

export interface Occasion {
  id: string;
  name: string;
  icon: string; // emoji placeholder until real iconography is supplied
  image: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  image: string;
}

export interface PackageTier {
  id: string;
  name: string;
  price: string;
  unit: string;
  popular?: boolean;
  features: string[];
  image: string;
}

export interface Specialist {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  location: string;
  priceFrom: string;
  image: string;
}

/**
 * Curated, verified Unsplash food photography. Each URL is a stable
 * `images.unsplash.com/photo-…` asset (allow-listed in next.config.ts) with a
 * sizing query so the source download stays small before Next re-optimizes.
 */
const img = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

export interface ValueProp {
  title: string;
  description: string;
  icon: string;
}

export const stats: { value: string; label: string; iconKey: string }[] = [
  { value: "10,000+", label: "Verified Specialists", iconKey: "users" },
  { value: "500+", label: "Cities Covered", iconKey: "pin" },
  { value: "1 Lakh+", label: "Happy Customers", iconKey: "userHeart" },
  { value: "4.8/5", label: "Customer Rating", iconKey: "star" },
];

export const heroHighlights: { title: string; iconKey: string }[] = [
  { title: "Verified Specialists", iconKey: "shield" },
  { title: "Transparent Pricing", iconKey: "tag" },
  { title: "Compare & Choose Best", iconKey: "compare" },
  { title: "Easy Booking Process", iconKey: "calendar" },
  { title: "End to End Assistance", iconKey: "headset" },
];

export const steps: Step[] = [
  {
    n: "1",
    title: "Choose Occasion",
    description: "Select the type of celebration.",
    iconKey: "diya",
    image: img("photo-1414235077428-338989a2e8c0", 400),
  },
  {
    n: "2",
    title: "Select Package",
    description: "Pick a package that suits your needs.",
    iconKey: "chef",
    image: img("photo-1490645935967-10de6ba17061", 400),
  },
  {
    n: "3",
    title: "Choose Specialists",
    description: "Select the best specialists in each category.",
    iconKey: "userStar",
    image: img("photo-1599487488170-d11ec9c172f0", 400),
  },
  {
    n: "4",
    title: "Finalize & Book",
    description: "Review, confirm & book with ease.",
    iconKey: "clipboard",
    image: img("photo-1565557623262-b51c2513a641", 400),
  },
];

export const occasions: Occasion[] = [
  { id: "wedding", name: "Wedding", icon: "💍", image: img("photo-1414235077428-338989a2e8c0") },
  { id: "engagement", name: "Engagement", icon: "💐", image: img("photo-1519671482749-fd09be7ccebf") },
  { id: "tilak", name: "Tilak", icon: "🪔", image: img("photo-1631452180519-c014fe946bc7") },
  { id: "haldi", name: "Haldi", icon: "🌼", image: img("photo-1606491956689-2ea866880c84") },
  { id: "mehndi", name: "Mehndi", icon: "🌿", image: img("photo-1546069901-ba9599a7e63c") },
  { id: "reception", name: "Reception", icon: "🥂", image: img("photo-1565557623262-b51c2513a641") },
  { id: "birthday", name: "Birthday Party", icon: "🎂", image: img("photo-1530103862676-de8c9debad1d") },
  { id: "corporate", name: "Corporate Event", icon: "🏢", image: img("photo-1517248135467-4c7edcad34c4") },
];

export const cities: { id: string; name: string }[] = [
  { id: "lucknow", name: "Lucknow" },
  { id: "delhi", name: "Delhi" },
  { id: "mumbai", name: "Mumbai" },
  { id: "bengaluru", name: "Bengaluru" },
  { id: "kolkata", name: "Kolkata" },
  { id: "hyderabad", name: "Hyderabad" },
  { id: "jaipur", name: "Jaipur" },
  { id: "pune", name: "Pune" },
];

export const categories: Category[] = [
  { id: "caterers", name: "Caterers", icon: "🍲", image: img("photo-1599487488170-d11ec9c172f0", 500) },
  { id: "live-counters", name: "Live Counters", icon: "🍳", image: img("photo-1565895405227-31cffbe0cf86", 500) },
  { id: "chaat", name: "Chaat Experts", icon: "🥘", image: img("photo-1601050690597-df0568f70950", 500) },
  { id: "sweets", name: "Sweet Specialists", icon: "🍬", image: img("photo-1631452180519-c014fe946bc7", 500) },
  { id: "beverages", name: "Beverage Partners", icon: "🥤", image: img("photo-1437418747212-8d9709afab22", 500) },
  { id: "decor", name: "Decor & More", icon: "🎉", image: img("photo-1519225421980-715cb0215aed", 500) },
];

export const packages: PackageTier[] = [
  {
    id: "silver",
    name: "Silver",
    price: "₹799",
    unit: "/ Plate",
    image: img("photo-1490645935967-10de6ba17061"),
    features: [
      "Welcome Drink",
      "2 Starters",
      "1 Live Counter",
      "Main Course (Veg)",
      "1 Sweet (Select)",
    ],
  },
  {
    id: "gold",
    name: "Gold",
    price: "₹1199",
    unit: "/ Plate",
    popular: true,
    image: img("photo-1543339308-43e59d6b73a6"),
    features: [
      "Welcome Drink",
      "5 Starters (Select)",
      "South Indian Counter",
      "Chinese (Select)",
      "Multiple Choices — build your perfect menu",
    ],
  },
  {
    id: "platinum",
    name: "Platinum",
    price: "₹1599+",
    unit: "/ Plate",
    image: img("photo-1600891964599-f61ba0e24092"),
    features: [
      "Premium Experience",
      "Premium Starters",
      "Live Counters",
      "Best Main Course Vendors",
      "Premium Sweet Stall",
    ],
  },
];

export const specialists: Specialist[] = [
  {
    id: "tuesday-chaat",
    name: "Tuesday Chaat Corner",
    rating: 4.7,
    reviews: 150,
    location: "Lucknow",
    priceFrom: "₹780",
    image: img("photo-1601050690597-df0568f70950", 200),
  },
  {
    id: "royal-chaat",
    name: "Royal Chaat House",
    rating: 4.9,
    reviews: 195,
    location: "Lucknow",
    priceFrom: "₹890",
    image: img("photo-1606471191009-63994c53433b", 200),
  },
  {
    id: "lucknow-chaat",
    name: "Lucknow Chaat Bhandar",
    rating: 4.8,
    reviews: 142,
    location: "Lucknow",
    priceFrom: "₹760",
    image: img("photo-1567188040759-fb8a883dc6d8", 200),
  },
  {
    id: "aradh-chaat",
    name: "Aradh Chat Point",
    rating: 4.6,
    reviews: 118,
    location: "Lucknow",
    priceFrom: "₹720",
    image: img("photo-1606491956689-2ea866880c84", 200),
  },
];

export const specialistTabs: string[] = [
  "Chaat",
  "Chinese",
  "Main Course",
  "Sweet Stall",
  "Live Counter",
];

export const whyChoose: ValueProp[] = [
  {
    title: "Best Specialists",
    description: "Curated & verified for you.",
    icon: "👨‍🍳",
  },
  {
    title: "Transparent Pricing",
    description: "What you see is what you pay.",
    icon: "💰",
  },
  {
    title: "Compare & Choose",
    description: "Compare menus & choose the best.",
    icon: "⚖️",
  },
  {
    title: "Easy Booking",
    description: "Simple process, instant confirmation.",
    icon: "✅",
  },
  {
    title: "End to End Support",
    description: "We're with you at every step.",
    icon: "🤝",
  },
];

export interface DropdownItem {
  title: string;
  subtitle: string;
  href: string;
  image: string;
}

export const partnerOptions: DropdownItem[] = [
  {
    title: "As a Vendor",
    subtitle: "For Work",
    href: "#partner-vendor",
    image: img("photo-1581299894007-aaa50297cf16", 160),
  },
  {
    title: "As an Event Planner",
    subtitle: "For Refer Business",
    href: "#partner-planner",
    image: img("photo-1519225421980-715cb0215aed", 160),
  },
  {
    title: "As an Individual",
    subtitle: "For Refer Business",
    href: "#partner-individual",
    image: img("photo-1507003211169-0a1dd7228f2d", 160),
  },
  {
    title: "As a Venue Owner",
    subtitle: "GST No. Required",
    href: "#partner-venue",
    image: img("photo-1519167758481-83f550bb49b3", 160),
  },
];

export const navLinks: {
  label: string;
  href: string;
  hasDropdown?: boolean;
  items?: DropdownItem[];
}[] = [
  { label: "Vendors", href: "#specialists" },
  { label: "Occasions", href: "#occasions" },
  { label: "Partner With Us", href: "#partner", hasDropdown: true, items: partnerOptions },
  { label: "About Us", href: "#about" },
];
