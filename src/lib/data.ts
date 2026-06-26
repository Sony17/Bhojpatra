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

export interface Venue {
  id: string;
  name: string;
  city: string; // matches an id in `cities`
  location: string; // locality / area within the city
  type: string; // Banquet Hall, Lawn, Resort, …
  capacity: string;
  priceFrom: string;
  rating: number;
  reviews: number;
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

/** A crowd-favourite dish surfaced in the "Trending" panel per occasion. */
export interface TrendingDish {
  name: string;
  /** Short badge, e.g. "Bestseller", "Most Loved". */
  tag: string;
  image: string;
}

export interface PlanningOccasion {
  id: string;
  name: string;
  iconKey: string;
  image: string;
  /** One-line descriptor shown over the cinematic showcase for the occasion. */
  tagline: string;
  /** Up to 5 crowd-favourite dishes for this occasion. */
  trending: TrendingDish[];
}

/**
 * "Planning For" ribbon — the quick occasion selector shown as a row of
 * stamped pills. Selecting a pill reveals a single cinematic showcase image
 * for that occasion below the ribbon. Images are sized wide for a full-bleed
 * panel.
 */
const trendingImg = (id: string) => img(id, 120);

export const planningOccasions: PlanningOccasion[] = [
  {
    id: "any", name: "Any Occasion", iconKey: "sparkle", image: img("photo-1565557623262-b51c2513a641", 1400),
    tagline: "Whatever you're celebrating, we cater it beautifully.",
    trending: [
      { name: "Paneer Butter Masala", tag: "Bestseller", image: trendingImg("photo-1631452180519-c014fe946bc7") },
      { name: "Dum Biryani", tag: "Most Loved", image: trendingImg("photo-1563379091339-03b21ab4a4f8") },
      { name: "Butter Naan", tag: "Trending", image: trendingImg("photo-1585937421612-70a008356fbe") },
      { name: "Gulab Jamun", tag: "Sweet Pick", image: trendingImg("photo-1601050690597-df0568f70950") },
      { name: "Chaat Platter", tag: "Crowd Fav", image: trendingImg("photo-1606491956689-2ea866880c84") },
    ],
  },
  {
    id: "wedding", name: "Wedding", iconKey: "rings", image: img("photo-1414235077428-338989a2e8c0", 1400),
    tagline: "Grand wedding feasts, flawlessly planned and served.",
    trending: [
      { name: "Mutton Rogan Josh", tag: "Bestseller", image: trendingImg("photo-1633945274405-b6c8069047b0") },
      { name: "Shahi Paneer", tag: "Most Loved", image: trendingImg("photo-1631452180519-c014fe946bc7") },
      { name: "Hyderabadi Biryani", tag: "Trending", image: trendingImg("photo-1563379091339-03b21ab4a4f8") },
      { name: "Malai Kofta", tag: "Crowd Fav", image: trendingImg("photo-1585937421612-70a008356fbe") },
      { name: "Rasmalai", tag: "Sweet Pick", image: trendingImg("photo-1601050690597-df0568f70950") },
    ],
  },
  {
    id: "corporate", name: "Corporate", iconKey: "briefcase", image: img("photo-1517248135467-4c7edcad34c4", 1400),
    tagline: "Polished catering that impresses every guest.",
    trending: [
      { name: "Veg Manchurian", tag: "Bestseller", image: trendingImg("photo-1585032226651-759b368d7246") },
      { name: "Pasta Counter", tag: "Trending", image: trendingImg("photo-1473093295043-cdd812d0e601") },
      { name: "Paneer Tikka", tag: "Most Loved", image: trendingImg("photo-1631452180519-c014fe946bc7") },
      { name: "Assorted Sandwiches", tag: "Quick Bite", image: trendingImg("photo-1565895405227-31cffbe0cf86") },
      { name: "Filter Coffee", tag: "Crowd Fav", image: trendingImg("photo-1437418747212-8d9709afab22") },
    ],
  },
  {
    id: "birthday", name: "Birthday", iconKey: "gift", image: img("photo-1530103862676-de8c9debad1d", 1400),
    tagline: "Joyful spreads that make the day unforgettable.",
    trending: [
      { name: "Cheese Pizza", tag: "Bestseller", image: trendingImg("photo-1565299624946-b28f40a0ae38") },
      { name: "Chilli Gobi", tag: "Trending", image: trendingImg("photo-1585032226651-759b368d7246") },
      { name: "Kulfi Falooda", tag: "Sweet Pick", image: trendingImg("photo-1601050690597-df0568f70950") },
      { name: "Spring Rolls", tag: "Crowd Fav", image: trendingImg("photo-1565895405227-31cffbe0cf86") },
      { name: "Chocolate Cake", tag: "Most Loved", image: trendingImg("photo-1578985545062-69928b1d9587") },
    ],
  },
  {
    id: "festival", name: "Festival", iconKey: "lantern", image: img("photo-1631452180519-c014fe946bc7", 1400),
    tagline: "Festive menus steeped in tradition.",
    trending: [
      { name: "Gajar Ka Halwa", tag: "Bestseller", image: trendingImg("photo-1601050690597-df0568f70950") },
      { name: "Chole Bhature", tag: "Most Loved", image: trendingImg("photo-1585937421612-70a008356fbe") },
      { name: "Puri Sabzi", tag: "Trending", image: trendingImg("photo-1606491956689-2ea866880c84") },
      { name: "Boondi Raita", tag: "Crowd Fav", image: trendingImg("photo-1565557623262-b51c2513a641") },
      { name: "Kaju Katli", tag: "Sweet Pick", image: trendingImg("photo-1631452180519-c014fe946bc7") },
    ],
  },
  {
    id: "house-party", name: "House Party", iconKey: "home", image: img("photo-1519225421980-715cb0215aed", 1400),
    tagline: "Effortless feasts for gatherings at home.",
    trending: [
      { name: "Tandoori Chicken", tag: "Bestseller", image: trendingImg("photo-1633945274405-b6c8069047b0") },
      { name: "Veg Biryani", tag: "Most Loved", image: trendingImg("photo-1563379091339-03b21ab4a4f8") },
      { name: "Hara Bhara Kebab", tag: "Trending", image: trendingImg("photo-1631452180519-c014fe946bc7") },
      { name: "Pav Bhaji", tag: "Crowd Fav", image: trendingImg("photo-1606491956689-2ea866880c84") },
      { name: "Jalebi", tag: "Sweet Pick", image: trendingImg("photo-1601050690597-df0568f70950") },
    ],
  },
  {
    id: "pooja", name: "Pooja / Bhandara", iconKey: "diya", image: img("photo-1606491956689-2ea866880c84", 1400),
    tagline: "Pure, satvik bhojan for every ritual.",
    trending: [
      { name: "Kadhi Chawal", tag: "Bestseller", image: trendingImg("photo-1585937421612-70a008356fbe") },
      { name: "Aloo Puri", tag: "Most Loved", image: trendingImg("photo-1606491956689-2ea866880c84") },
      { name: "Sabudana Khichdi", tag: "Trending", image: trendingImg("photo-1630383249896-424e482df921") },
      { name: "Sooji Halwa", tag: "Sweet Pick", image: trendingImg("photo-1601050690597-df0568f70950") },
      { name: "Boondi Laddoo", tag: "Crowd Fav", image: trendingImg("photo-1631452180519-c014fe946bc7") },
    ],
  },
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

/**
 * Bookable venues grouped by city + locality. `city` references an id in
 * `cities`; `location` is the neighbourhood used by the venue page filters.
 */
export const venues: Venue[] = [
  {
    id: "ambassador-banquet",
    name: "Ambassador Banquet Hall",
    city: "lucknow",
    location: "Gomti Nagar",
    type: "Banquet Hall",
    capacity: "300–600 Guests",
    priceFrom: "₹85,000",
    rating: 4.8,
    reviews: 212,
    image: img("photo-1519167758481-83f550bb49b3", 600),
  },
  {
    id: "awadh-greens",
    name: "Awadh Greens Lawn",
    city: "lucknow",
    location: "Hazratganj",
    type: "Open Lawn",
    capacity: "500–1200 Guests",
    priceFrom: "₹1,20,000",
    rating: 4.7,
    reviews: 168,
    image: img("photo-1464366400600-7168b8af9bc3", 600),
  },
  {
    id: "nawab-mahal",
    name: "Nawab Mahal Convention",
    city: "lucknow",
    location: "Aliganj",
    type: "Convention Center",
    capacity: "800–2000 Guests",
    priceFrom: "₹2,40,000",
    rating: 4.9,
    reviews: 254,
    image: img("photo-1561912774-79769a0a0a3a", 600),
  },
  {
    id: "imperial-grand",
    name: "Imperial Grand Ballroom",
    city: "delhi",
    location: "Connaught Place",
    type: "Hotel Ballroom",
    capacity: "200–500 Guests",
    priceFrom: "₹1,80,000",
    rating: 4.8,
    reviews: 301,
    image: img("photo-1542314831-068cd1dbfeeb", 600),
  },
  {
    id: "saket-palms",
    name: "Saket Palms Resort",
    city: "delhi",
    location: "Saket",
    type: "Resort",
    capacity: "400–900 Guests",
    priceFrom: "₹2,10,000",
    rating: 4.6,
    reviews: 142,
    image: img("photo-1571896349842-33c89424de2d", 600),
  },
  {
    id: "dwarka-celebrations",
    name: "Dwarka Celebrations",
    city: "delhi",
    location: "Dwarka",
    type: "Banquet Hall",
    capacity: "250–700 Guests",
    priceFrom: "₹95,000",
    rating: 4.5,
    reviews: 118,
    image: img("photo-1505373877841-8d25f7d46678", 600),
  },
  {
    id: "marine-bay",
    name: "Marine Bay Banquets",
    city: "mumbai",
    location: "Bandra",
    type: "Banquet Hall",
    capacity: "300–650 Guests",
    priceFrom: "₹2,50,000",
    rating: 4.9,
    reviews: 276,
    image: img("photo-1519225421980-715cb0215aed", 600),
  },
  {
    id: "powai-lakeside",
    name: "Powai Lakeside Lawn",
    city: "mumbai",
    location: "Powai",
    type: "Open Lawn",
    capacity: "500–1500 Guests",
    priceFrom: "₹3,20,000",
    rating: 4.7,
    reviews: 189,
    image: img("photo-1464366400600-7168b8af9bc3", 600),
  },
  {
    id: "andheri-grand",
    name: "Andheri Grand Hotel",
    city: "mumbai",
    location: "Andheri",
    type: "Hotel Ballroom",
    capacity: "200–450 Guests",
    priceFrom: "₹1,95,000",
    rating: 4.6,
    reviews: 154,
    image: img("photo-1566073771259-6a8506099945", 600),
  },
  {
    id: "indiranagar-courtyard",
    name: "Indiranagar Courtyard",
    city: "bengaluru",
    location: "Indiranagar",
    type: "Banquet Hall",
    capacity: "200–500 Guests",
    priceFrom: "₹1,40,000",
    rating: 4.7,
    reviews: 167,
    image: img("photo-1522413452208-996ff3f3e740", 600),
  },
  {
    id: "whitefield-gardens",
    name: "Whitefield Garden Resort",
    city: "bengaluru",
    location: "Whitefield",
    type: "Resort",
    capacity: "400–1000 Guests",
    priceFrom: "₹2,30,000",
    rating: 4.8,
    reviews: 198,
    image: img("photo-1571896349842-33c89424de2d", 600),
  },
  {
    id: "rambagh-heritage",
    name: "Rambagh Heritage Haveli",
    city: "jaipur",
    location: "Civil Lines",
    type: "Heritage Venue",
    capacity: "300–800 Guests",
    priceFrom: "₹2,80,000",
    rating: 4.9,
    reviews: 233,
    image: img("photo-1561912774-79769a0a0a3a", 600),
  },
  {
    id: "amer-fort-lawns",
    name: "Amer Fort View Lawns",
    city: "jaipur",
    location: "Amer",
    type: "Open Lawn",
    capacity: "600–1800 Guests",
    priceFrom: "₹3,50,000",
    rating: 4.8,
    reviews: 176,
    image: img("photo-1464366400600-7168b8af9bc3", 600),
  },
  {
    id: "koregaon-banquets",
    name: "Koregaon Park Banquets",
    city: "pune",
    location: "Koregaon Park",
    type: "Banquet Hall",
    capacity: "250–600 Guests",
    priceFrom: "₹1,30,000",
    rating: 4.6,
    reviews: 144,
    image: img("photo-1519167758481-83f550bb49b3", 600),
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
  iconKey: string;
}

export const partnerOptions: DropdownItem[] = [
  {
    title: "As a Vendor",
    subtitle: "For Work",
    href: "/vendor/register",
    iconKey: "vendor",
  },
  {
    title: "As an Event Planner",
    subtitle: "For Refer Business",
    href: "/partner",
    iconKey: "planner",
  },
  {
    title: "As an Individual",
    subtitle: "For Refer Business",
    href: "/partner",
    iconKey: "individual",
  },
  {
    title: "As a Venue Owner",
    subtitle: "GST No. Required",
    href: "/partner",
    iconKey: "venue",
  },
];

export const navLinks: {
  label: string;
  href: string;
  hasDropdown?: boolean;
  items?: DropdownItem[];
}[] = [
  { label: "Book a Feast", href: "/book" },
  { label: "Vendors", href: "/vendors" },
  { label: "Venues", href: "/venues" },
  { label: "My Bookings", href: "/bookings" },
  { label: "Partner With Us", href: "/partner", hasDropdown: true, items: partnerOptions },
  { label: "Contact", href: "/contact" },
];

/* ───────────────────────────────────────────────────────────────────────
   BOOKING FLOW DATA — cuisines, course-wise dishes, add-on counters,
   vendor comparison set, coupons. Powers the /book wizard & /vendors catalog.
   Bilingual (EN/HI) labels included per the brand's bilingual requirement.
   Swap with API/CMS data later.
─────────────────────────────────────────────────────────────────────── */

export interface Cuisine {
  id: string;
  name: string;
  nameHi: string;
  icon: string;
  image: string;
}

export const cuisines: Cuisine[] = [
  { id: "north-indian", name: "North Indian", nameHi: "नॉर्थ इंडियन", icon: "🍛", image: img("photo-1585937421612-70a008356fbe", 500) },
  { id: "south-indian", name: "South Indian", nameHi: "साउथ इंडियन", icon: "🥥", image: img("photo-1630383249896-424e482df921", 500) },
  { id: "chinese", name: "Chinese", nameHi: "चाइनीज़", icon: "🥡", image: img("photo-1585032226651-759b368d7246", 500) },
  { id: "continental", name: "Continental", nameHi: "कॉन्टिनेंटल", icon: "🍝", image: img("photo-1473093295043-cdd812d0e601", 500) },
  { id: "mughlai", name: "Mughlai", nameHi: "मुग़लई", icon: "🍖", image: img("photo-1633945274405-b6c8069047b0", 500) },
  { id: "punjabi", name: "Punjabi", nameHi: "पंजाबी", icon: "🧈", image: img("photo-1601050690597-df0568f70950", 500) },
  { id: "bengali", name: "Bengali", nameHi: "बंगाली", icon: "🐟", image: img("photo-1565557623262-b51c2513a641", 500) },
];

export type DietType = "veg" | "non-veg";

export interface Dish {
  id: string;
  name: string;
  cuisineId: string;
  diet: DietType;
}

export interface MenuCourse {
  id: string;
  name: string;
  nameHi: string;
  /** Suggested number of selections for this course. */
  suggested: number;
  dishes: Dish[];
}

export const menuCourses: MenuCourse[] = [
  {
    id: "welcome",
    name: "Welcome Drinks",
    nameHi: "वेलकम ड्रिंक्स",
    suggested: 1,
    dishes: [
      { id: "w-jaljeera", name: "Masala Jaljeera", cuisineId: "north-indian", diet: "veg" },
      { id: "w-aampanna", name: "Aam Panna", cuisineId: "north-indian", diet: "veg" },
      { id: "w-coconut", name: "Tender Coconut Cooler", cuisineId: "south-indian", diet: "veg" },
      { id: "w-rose", name: "Rose Sharbat", cuisineId: "mughlai", diet: "veg" },
    ],
  },
  {
    id: "starters",
    name: "Starters",
    nameHi: "स्टार्टर",
    suggested: 4,
    dishes: [
      { id: "s-paneer-tikka", name: "Paneer Tikka", cuisineId: "punjabi", diet: "veg" },
      { id: "s-hara-kebab", name: "Hara Bhara Kebab", cuisineId: "north-indian", diet: "veg" },
      { id: "s-gobi", name: "Chilli Gobi", cuisineId: "chinese", diet: "veg" },
      { id: "s-spring-roll", name: "Veg Spring Roll", cuisineId: "chinese", diet: "veg" },
      { id: "s-seekh", name: "Mutton Seekh Kebab", cuisineId: "mughlai", diet: "non-veg" },
      { id: "s-chicken-tikka", name: "Chicken Tikka", cuisineId: "punjabi", diet: "non-veg" },
      { id: "s-fish-amritsari", name: "Amritsari Fish", cuisineId: "punjabi", diet: "non-veg" },
      { id: "s-prawn", name: "Golden Fried Prawns", cuisineId: "bengali", diet: "non-veg" },
    ],
  },
  {
    id: "main",
    name: "Main Course",
    nameHi: "मेन कोर्स",
    suggested: 5,
    dishes: [
      { id: "m-paneer-butter", name: "Paneer Butter Masala", cuisineId: "punjabi", diet: "veg" },
      { id: "m-dal-makhani", name: "Dal Makhani", cuisineId: "punjabi", diet: "veg" },
      { id: "m-veg-kofta", name: "Malai Kofta", cuisineId: "north-indian", diet: "veg" },
      { id: "m-sambar", name: "Sambar & Rasam", cuisineId: "south-indian", diet: "veg" },
      { id: "m-veg-manchurian", name: "Veg Manchurian", cuisineId: "chinese", diet: "veg" },
      { id: "m-butter-chicken", name: "Butter Chicken", cuisineId: "punjabi", diet: "non-veg" },
      { id: "m-mutton-rogan", name: "Mutton Rogan Josh", cuisineId: "mughlai", diet: "non-veg" },
      { id: "m-fish-curry", name: "Bengali Fish Curry", cuisineId: "bengali", diet: "non-veg" },
      { id: "m-chicken-chettinad", name: "Chicken Chettinad", cuisineId: "south-indian", diet: "non-veg" },
    ],
  },
  {
    id: "breads-rice",
    name: "Breads & Rice",
    nameHi: "ब्रेड और चावल",
    suggested: 3,
    dishes: [
      { id: "b-naan", name: "Assorted Naan", cuisineId: "punjabi", diet: "veg" },
      { id: "b-tandoori-roti", name: "Tandoori Roti", cuisineId: "north-indian", diet: "veg" },
      { id: "b-veg-biryani", name: "Veg Dum Biryani", cuisineId: "mughlai", diet: "veg" },
      { id: "b-jeera-rice", name: "Jeera Rice", cuisineId: "north-indian", diet: "veg" },
      { id: "b-mutton-biryani", name: "Mutton Dum Biryani", cuisineId: "mughlai", diet: "non-veg" },
      { id: "b-curd-rice", name: "Curd Rice", cuisineId: "south-indian", diet: "veg" },
    ],
  },
  {
    id: "desserts",
    name: "Desserts",
    nameHi: "मिठाई",
    suggested: 2,
    dishes: [
      { id: "d-gulab-jamun", name: "Gulab Jamun", cuisineId: "north-indian", diet: "veg" },
      { id: "d-rasgulla", name: "Rasgulla", cuisineId: "bengali", diet: "veg" },
      { id: "d-gajar-halwa", name: "Gajar Ka Halwa", cuisineId: "punjabi", diet: "veg" },
      { id: "d-payasam", name: "Payasam", cuisineId: "south-indian", diet: "veg" },
      { id: "d-icecream", name: "Kulfi Falooda", cuisineId: "mughlai", diet: "veg" },
    ],
  },
];

export interface AddOn {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  /** Price in ₹ — per plate when perPlate, else a flat charge. */
  price: number;
  perPlate: boolean;
  icon: string;
}

export const addOns: AddOn[] = [
  { id: "pan", name: "Pan Counter", nameHi: "पान काउंटर", description: "Live paan with assorted fillings.", price: 40, perPlate: true, icon: "🍃" },
  { id: "chaat", name: "Chaat Station", nameHi: "चाट स्टेशन", description: "Golgappa, tikki & papdi chaat, live.", price: 60, perPlate: true, icon: "🥘" },
  { id: "live", name: "Live Counters", nameHi: "लाइव काउंटर", description: "Dosa, pasta & tandoor made fresh.", price: 90, perPlate: true, icon: "🍳" },
  { id: "dessert", name: "Dessert Counter", nameHi: "डेज़र्ट काउंटर", description: "Live jalebi, ice-cream & more.", price: 70, perPlate: true, icon: "🍨" },
  { id: "staff", name: "Service Staff", nameHi: "सर्विस स्टाफ", description: "Trained stewards in uniform.", price: 8000, perPlate: false, icon: "🧑‍🍳" },
  { id: "tableware", name: "Premium Tableware", nameHi: "प्रीमियम टेबलवेयर", description: "Crockery, cutlery & glassware.", price: 25, perPlate: true, icon: "🍽️" },
  { id: "decor", name: "Decoration", nameHi: "सजावट", description: "Theme decor, florals & lighting.", price: 35000, perPlate: false, icon: "🎉" },
];

export interface ComparisonVendor {
  id: string;
  name: string;
  tier: "Silver" | "Gold" | "Platinum";
  rating: number;
  reviews: number;
  location: string;
  speciality: string;
  /** Per-plate price for the customer's built menu. */
  perPlate: number;
  image: string;
  badges: string[];
}

/** Up to 5 verified vendors (Vendor A–E) presenting their take on the menu. */
export const comparisonVendors: ComparisonVendor[] = [
  { id: "v-a", name: "Awadhi Royal Caterers", tier: "Platinum", rating: 4.9, reviews: 412, location: "Lucknow", speciality: "Mughlai & Awadhi", perPlate: 1349, image: img("photo-1555939594-58d7cb561ad1", 300), badges: ["FSSAI Verified", "Top Rated"] },
  { id: "v-b", name: "Nawabi Dawat", tier: "Gold", rating: 4.8, reviews: 287, location: "Lucknow", speciality: "North Indian", perPlate: 1199, image: img("photo-1556910103-1c02745aae4d", 300), badges: ["FSSAI Verified"] },
  { id: "v-c", name: "Spice Symphony", tier: "Gold", rating: 4.7, reviews: 198, location: "Lucknow", speciality: "Multi-cuisine", perPlate: 1099, image: img("photo-1414235077428-338989a2e8c0", 300), badges: ["FSSAI Verified", "Budget Pick"] },
  { id: "v-d", name: "Ganga Caterers", tier: "Silver", rating: 4.6, reviews: 156, location: "Lucknow", speciality: "Pure Veg", perPlate: 949, image: img("photo-1490645935967-10de6ba17061", 300), badges: ["Pure Veg"] },
  { id: "v-e", name: "Tandoor Tales", tier: "Silver", rating: 4.5, reviews: 121, location: "Lucknow", speciality: "Punjabi & Tandoor", perPlate: 899, image: img("photo-1567188040759-fb8a883dc6d8", 300), badges: ["Budget Pick"] },
];

export interface Coupon {
  code: string;
  label: string;
  /** Percentage discount. */
  percent: number;
  /** Max discount cap in ₹. */
  cap: number;
}

export const coupons: Coupon[] = [
  { code: "BHOJ10", label: "10% off, up to ₹5,000", percent: 10, cap: 5000 },
  { code: "FIRSTFEAST", label: "15% off your first feast, up to ₹10,000", percent: 15, cap: 10000 },
  { code: "WEDDING25", label: "25% off weddings, up to ₹25,000", percent: 25, cap: 25000 },
];

export const guestPresets: number[] = [50, 100, 250, 500, 1000, 2500];

/* ───────────────────────────────────────────────────────────────────────
   VENDOR CATALOG / LISTING — search & filter by city, state, cuisine, tier.
─────────────────────────────────────────────────────────────────────── */

export interface VendorListing {
  id: string;
  name: string;
  tier: "Silver" | "Gold" | "Platinum";
  rating: number;
  reviews: number;
  city: string;
  state: string;
  cuisines: string[];
  diet: "Veg" | "Non-Veg" | "Veg & Non-Veg";
  priceFrom: number;
  verified: boolean;
  image: string;
}

export const indianStates: string[] = [
  "Uttar Pradesh", "Delhi", "Maharashtra", "Karnataka", "West Bengal",
  "Telangana", "Rajasthan", "Tamil Nadu",
];

export const vendorListings: VendorListing[] = [
  { id: "vl-1", name: "Awadhi Royal Caterers", tier: "Platinum", rating: 4.9, reviews: 412, city: "Lucknow", state: "Uttar Pradesh", cuisines: ["Mughlai", "North Indian"], diet: "Veg & Non-Veg", priceFrom: 1349, verified: true, image: img("photo-1555939594-58d7cb561ad1", 500) },
  { id: "vl-2", name: "Nawabi Dawat", tier: "Gold", rating: 4.8, reviews: 287, city: "Lucknow", state: "Uttar Pradesh", cuisines: ["North Indian", "Punjabi"], diet: "Veg & Non-Veg", priceFrom: 1199, verified: true, image: img("photo-1556910103-1c02745aae4d", 500) },
  { id: "vl-3", name: "Dilli Darbar Caterers", tier: "Gold", rating: 4.7, reviews: 233, city: "Delhi", state: "Delhi", cuisines: ["Mughlai", "Chinese"], diet: "Veg & Non-Veg", priceFrom: 1250, verified: true, image: img("photo-1633945274405-b6c8069047b0", 500) },
  { id: "vl-4", name: "Marathi Mejwani", tier: "Silver", rating: 4.6, reviews: 144, city: "Mumbai", state: "Maharashtra", cuisines: ["North Indian", "Continental"], diet: "Veg", priceFrom: 999, verified: true, image: img("photo-1490645935967-10de6ba17061", 500) },
  { id: "vl-5", name: "Namma Ruchi Caterers", tier: "Gold", rating: 4.8, reviews: 201, city: "Bengaluru", state: "Karnataka", cuisines: ["South Indian", "Chinese"], diet: "Veg & Non-Veg", priceFrom: 1050, verified: true, image: img("photo-1630383249896-424e482df921", 500) },
  { id: "vl-6", name: "Bengal Bhoj", tier: "Platinum", rating: 4.9, reviews: 318, city: "Kolkata", state: "West Bengal", cuisines: ["Bengali", "Mughlai"], diet: "Veg & Non-Veg", priceFrom: 1299, verified: true, image: img("photo-1565557623262-b51c2513a641", 500) },
  { id: "vl-7", name: "Nizami Daawat", tier: "Gold", rating: 4.7, reviews: 176, city: "Hyderabad", state: "Telangana", cuisines: ["Mughlai", "South Indian"], diet: "Non-Veg", priceFrom: 1180, verified: true, image: img("photo-1633945274405-b6c8069047b0", 500) },
  { id: "vl-8", name: "Rajwada Rasoi", tier: "Silver", rating: 4.5, reviews: 98, city: "Jaipur", state: "Rajasthan", cuisines: ["North Indian", "Punjabi"], diet: "Veg", priceFrom: 949, verified: true, image: img("photo-1585937421612-70a008356fbe", 500) },
  { id: "vl-9", name: "Chettinad Feast Co.", tier: "Gold", rating: 4.8, reviews: 212, city: "Chennai", state: "Tamil Nadu", cuisines: ["South Indian"], diet: "Veg & Non-Veg", priceFrom: 1090, verified: true, image: img("photo-1630383249896-424e482df921", 500) },
  { id: "vl-10", name: "Maratha Spice Caterers", tier: "Silver", rating: 4.6, reviews: 134, city: "Pune", state: "Maharashtra", cuisines: ["Continental", "Chinese"], diet: "Veg & Non-Veg", priceFrom: 1020, verified: false, image: img("photo-1414235077428-338989a2e8c0", 500) },
  { id: "vl-11", name: "Tandoor Tales", tier: "Silver", rating: 4.5, reviews: 121, city: "Delhi", state: "Delhi", cuisines: ["Punjabi", "North Indian"], diet: "Non-Veg", priceFrom: 899, verified: true, image: img("photo-1567188040759-fb8a883dc6d8", 500) },
  { id: "vl-12", name: "Sattvik Bhojan", tier: "Gold", rating: 4.7, reviews: 167, city: "Lucknow", state: "Uttar Pradesh", cuisines: ["North Indian", "South Indian"], diet: "Veg", priceFrom: 1100, verified: true, image: img("photo-1601050690597-df0568f70950", 500) },
];

/* ───────────────────────────────────────────────────────────────────────
   MY BOOKINGS — customer booking history & status.
─────────────────────────────────────────────────────────────────────── */

export type BookingStatus = "Confirmed" | "Pending" | "Completed" | "Cancelled";

export interface Booking {
  id: string;
  occasion: string;
  date: string;
  guests: number;
  vendor: string;
  city: string;
  amount: number;
  paid: number;
  status: BookingStatus;
}

export const myBookings: Booking[] = [
  { id: "BHJ-24871", occasion: "Wedding", date: "12 Dec 2026", guests: 500, vendor: "Awadhi Royal Caterers", city: "Lucknow", amount: 674500, paid: 168625, status: "Confirmed" },
  { id: "BHJ-24655", occasion: "Engagement", date: "28 Nov 2026", guests: 150, vendor: "Nawabi Dawat", city: "Lucknow", amount: 179850, paid: 0, status: "Pending" },
  { id: "BHJ-23998", occasion: "Birthday Party", date: "05 Aug 2026", guests: 80, vendor: "Spice Symphony", city: "Lucknow", amount: 87920, paid: 87920, status: "Completed" },
  { id: "BHJ-23541", occasion: "Corporate Event", date: "18 Jul 2026", guests: 200, vendor: "Tandoor Tales", city: "Delhi", amount: 179800, paid: 0, status: "Cancelled" },
];

/* ───────────────────────────────────────────────────────────────────────
   PARTNER WITH US — value props, benefits, steps, partner types.
─────────────────────────────────────────────────────────────────────── */

export interface PartnerBenefit {
  title: string;
  description: string;
  icon: string;
}

export const partnerBenefits: PartnerBenefit[] = [
  { title: "More Bookings", description: "Reach lakhs of customers planning feasts across India.", icon: "📈" },
  { title: "Zero Upfront Cost", description: "List your menu free. Pay nothing to join the marketplace.", icon: "🏷️" },
  { title: "Verified-Vendor Badge", description: "Earn trust with a Bhojpatra verification badge on your profile.", icon: "🛡️" },
  { title: "Marketing Exposure", description: "Get featured across our homepage, search & social channels.", icon: "📣" },
  { title: "Quality Leads", description: "Receive enquiries matched to your cuisine, city & capacity.", icon: "🎯" },
  { title: "Easy Dashboard", description: "Manage menus, bookings & earnings from one simple panel.", icon: "📊" },
];

export interface PartnerStep {
  n: string;
  title: string;
  description: string;
}

export const partnerSteps: PartnerStep[] = [
  { n: "1", title: "Join", description: "Sign up and tell us about your business in minutes." },
  { n: "2", title: "Get Verified", description: "Upload KYC docs — we verify GST & FSSAI quickly." },
  { n: "3", title: "Start Receiving Bookings", description: "Go live, list your menu and win new customers." },
];

export interface PartnerType {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
}

export const partnerTypes: PartnerType[] = [
  { id: "vendor", title: "Caterer / Food Vendor", subtitle: "List your menus & win bookings", description: "Caterers and famous food vendors who serve customers directly.", icon: "🍲" },
  { id: "planner", title: "Event Planner", subtitle: "Refer business, earn commission", description: "Planners who bring clients and refer feast bookings to Bhojpatra.", icon: "📋" },
  { id: "individual", title: "Individual Referrer", subtitle: "Refer & earn", description: "Anyone who refers customers and earns on confirmed bookings.", icon: "🙋" },
  { id: "venue", title: "Venue Owner", subtitle: "GST No. required", description: "Banquet halls & venues partnering for in-house catering.", icon: "🏛️" },
];

/* ───────────────────────────────────────────────────────────────────────
   VENDOR DASHBOARD — booking requests, calendar, earnings, notifications.
─────────────────────────────────────────────────────────────────────── */

export type RequestStatus = "New" | "Accepted" | "Declined";

export interface BookingRequest {
  id: string;
  customer: string;
  occasion: string;
  date: string;
  guests: number;
  city: string;
  estValue: number;
  status: RequestStatus;
}

export const vendorBookingRequests: BookingRequest[] = [
  { id: "REQ-7781", customer: "Ankit Sharma", occasion: "Wedding", date: "12 Dec 2026", guests: 500, city: "Lucknow", estValue: 674500, status: "New" },
  { id: "REQ-7765", customer: "Priya Verma", occasion: "Reception", date: "20 Dec 2026", guests: 300, city: "Lucknow", estValue: 404700, status: "New" },
  { id: "REQ-7702", customer: "Rahul Gupta", occasion: "Corporate Event", date: "02 Jan 2027", guests: 180, city: "Kanpur", estValue: 215820, status: "Accepted" },
  { id: "REQ-7688", customer: "Sneha Singh", occasion: "Engagement", date: "15 Nov 2026", guests: 120, city: "Lucknow", estValue: 161880, status: "Accepted" },
  { id: "REQ-7654", customer: "Imran Khan", occasion: "Birthday Party", date: "30 Oct 2026", guests: 60, city: "Lucknow", estValue: 80940, status: "Declined" },
];

export interface VendorStat {
  label: string;
  value: string;
  sub: string;
  icon: string;
}

export const vendorStats: VendorStat[] = [
  { label: "Total Earnings", value: "₹18.4L", sub: "+12% this month", icon: "💰" },
  { label: "Confirmed Bookings", value: "34", sub: "8 upcoming", icon: "📅" },
  { label: "New Requests", value: "2", sub: "Awaiting response", icon: "🔔" },
  { label: "Profile Rating", value: "4.9", sub: "412 reviews", icon: "⭐" },
];

export interface EarningRow {
  id: string;
  event: string;
  date: string;
  amount: number;
  status: "Settled" | "Advance Received" | "Pending";
}

export const vendorEarnings: EarningRow[] = [
  { id: "BHJ-24871", event: "Wedding · 500 pax", date: "12 Dec 2026", amount: 674500, status: "Advance Received" },
  { id: "BHJ-24655", event: "Engagement · 150 pax", date: "28 Nov 2026", amount: 179850, status: "Pending" },
  { id: "BHJ-23998", event: "Birthday · 80 pax", date: "05 Aug 2026", amount: 87920, status: "Settled" },
  { id: "BHJ-23541", event: "Corporate · 200 pax", date: "18 Jul 2026", amount: 179800, status: "Settled" },
];

/** Confirmed events keyed by ISO date for the order calendar (July 2026). */
export const vendorCalendarEvents: { date: string; label: string }[] = [
  { date: "2026-07-12", label: "Wedding · 500" },
  { date: "2026-07-18", label: "Corporate · 200" },
  { date: "2026-07-24", label: "Reception · 300" },
  { date: "2026-07-05", label: "Birthday · 80" },
];

export interface VendorNotification {
  id: string;
  message: string;
  time: string;
  unread: boolean;
}

export const vendorNotifications: VendorNotification[] = [
  { id: "n1", message: "New booking request from Ankit Sharma (Wedding, 500 pax).", time: "2 min ago", unread: true },
  { id: "n2", message: "Payment advance of ₹1,68,625 received for BHJ-24871.", time: "1 hr ago", unread: true },
  { id: "n3", message: "Your profile passed FSSAI re-verification. Badge active.", time: "Yesterday", unread: false },
  { id: "n4", message: "Reminder: Reception event on 24 Jul, 300 guests.", time: "2 days ago", unread: false },
];

/* ───────────────────────────────────────────────────────────────────────
   VENDOR REGISTRATION — cuisine & counter options for the onboarding form.
─────────────────────────────────────────────────────────────────────── */

export const registrationCuisines: string[] = [
  "North Indian", "South Indian", "Chinese", "Continental",
  "Mughlai", "Punjabi", "Bengali",
];

export const registrationCounters: string[] = [
  "Pan Counter", "Chaat Station", "Live Counters", "Dessert Counter",
  "Service Staff", "Tableware", "Decoration",
];

/* ───────────────────────────────────────────────────────────────────────
   GALLERY — a stack of real-event / signature-dish photos used by the
   <Gallery> section. The first seven feed the scroll-driven "fan-out"
   cluster; the full list feeds the staggered grid below it.
─────────────────────────────────────────────────────────────────────── */

export interface GalleryItem {
  /** Stable key + alt text. */
  title: string;
  /** Short overline shown in the hover overlay (e.g. "Wedding · 500 pax"). */
  caption: string;
  image: string;
}

export const galleryItems: GalleryItem[] = [
  { title: "Royal Wedding Feast", caption: "Wedding · 500 pax", image: img("photo-1414235077428-338989a2e8c0", 700) },
  { title: "Live Chaat Station", caption: "Street-food counter", image: img("photo-1606491956689-2ea866880c84", 700) },
  { title: "Dum Biryani Handi", caption: "Most loved · main", image: img("photo-1563379091339-03b21ab4a4f8", 700) },
  { title: "Mandap & Mehndi", caption: "Haldi · Mehndi", image: img("photo-1546069901-ba9599a7e63c", 700) },
  { title: "Paneer Butter Masala", caption: "Bestseller · main", image: img("photo-1631452180519-c014fe946bc7", 700) },
  { title: "Corporate Gala", caption: "Corporate · 200 pax", image: img("photo-1517248135467-4c7edcad34c4", 700) },
  { title: "Gulab Jamun Tray", caption: "Sweet pick · dessert", image: img("photo-1601050690597-df0568f70950", 700) },
  { title: "Birthday Celebration", caption: "Birthday · 80 pax", image: img("photo-1530103862676-de8c9debad1d", 700) },
  { title: "Reception Buffet", caption: "Reception · 300 pax", image: img("photo-1565557623262-b51c2513a641", 700) },
  { title: "Butter Naan Basket", caption: "Trending · breads", image: img("photo-1585937421612-70a008356fbe", 700) },
];
