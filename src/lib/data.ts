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
  nameHi: string;
  icon: string; // emoji placeholder until real iconography is supplied
  image: string;
}

export interface Category {
  id: string;
  name: string;
  nameHi: string;
  icon: string;
  image: string;
}

/** One line in a package's feature list. A `heading` item renders as a bold
    course header (e.g. "Main Course") without a tick/chevron; everything else
    is a normal listed item. */
export interface PackageFeature {
  label: string;
  labelHi: string;
  heading?: boolean;
  /** Closes the preceding course and renders at the top level — used so a
      trailing item (e.g. "1 Sweet") sits beside Welcome Drink / Starters
      rather than being nested inside the previous course. */
  standalone?: boolean;
}

export interface PackageTier {
  id: string;
  name: string;
  nameHi: string;
  price: string;
  unit: string;
  unitHi: string;
  popular?: boolean;
  /** Short label shown under the price (e.g. "Fixed Menu"). */
  tagline?: string;
  taglineHi?: string;
  /** Guest-count range the package serves (e.g. "50–300 Guests"). */
  pax?: string;
  paxHi?: string;
  /** Occasions the tier suits best, shown as a "Perfect for" line on the
      package card (e.g. "Birthdays · Pujas · Family Gatherings"). */
  bestFor?: string;
  bestForHi?: string;
  /** Min / max guests this package supports — enforced in the booking flow. */
  minPax?: number;
  maxPax?: number;
  features: PackageFeature[];
  /** Closing note above the CTA — one line per entry. */
  footnote?: string[];
  footnoteHi?: string[];
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
  { id: "wedding", name: "Wedding", nameHi: "शादी", icon: "💍", image: img("photo-1414235077428-338989a2e8c0") },
  { id: "engagement", name: "Engagement", nameHi: "सगाई", icon: "💐", image: img("photo-1519671482749-fd09be7ccebf") },
  { id: "tilak", name: "Tilak", nameHi: "तिलक", icon: "🪔", image: img("photo-1631452180519-c014fe946bc7") },
  { id: "haldi", name: "Haldi", nameHi: "हल्दी", icon: "🌼", image: img("photo-1606491956689-2ea866880c84") },
  { id: "mehndi", name: "Mehndi", nameHi: "मेहंदी", icon: "🌿", image: img("photo-1546069901-ba9599a7e63c") },
  { id: "reception", name: "Reception", nameHi: "रिसेप्शन", icon: "🥂", image: img("photo-1565557623262-b51c2513a641") },
  { id: "birthday", name: "Birthday Party", nameHi: "बर्थडे पार्टी", icon: "🎂", image: img("photo-1530103862676-de8c9debad1d") },
  { id: "corporate", name: "Corporate Event", nameHi: "कॉर्पोरेट इवेंट", icon: "🏢", image: img("photo-1517248135467-4c7edcad34c4") },
];

/** A crowd-favourite dish surfaced in the "Trending" panel per occasion. */
export interface TrendingDish {
  name: string;
  /** Short badge, e.g. "Bestseller", "Most Loved". Translated via a map in the
   *  PlanningFor component since the vocabulary is small and fixed. */
  tag: string;
  image: string;
}

export interface PlanningOccasion {
  id: string;
  name: string;
  nameHi: string;
  iconKey: string;
  image: string;
  /** One-line descriptor shown over the cinematic showcase for the occasion. */
  tagline: string;
  taglineHi: string;
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
    id: "any", name: "Any Occasion", nameHi: "कोई भी अवसर", iconKey: "sparkle", image: img("photo-1565557623262-b51c2513a641", 1400),
    tagline: "Whatever you're celebrating, we cater it beautifully.",
    taglineHi: "आप जो भी मना रहे हों, हम उसे खूबसूरती से कैटर करते हैं।",
    trending: [
      { name: "Paneer Butter Masala", tag: "Bestseller", image: trendingImg("photo-1631452180519-c014fe946bc7") },
      { name: "Dum Biryani", tag: "Most Loved", image: trendingImg("photo-1563379091339-03b21ab4a4f8") },
      { name: "Butter Naan", tag: "Trending", image: trendingImg("photo-1585937421612-70a008356fbe") },
      { name: "Gulab Jamun", tag: "Sweet Pick", image: trendingImg("photo-1601050690597-df0568f70950") },
      { name: "Chaat Platter", tag: "Crowd Fav", image: trendingImg("photo-1606491956689-2ea866880c84") },
    ],
  },
  {
    id: "wedding", name: "Wedding", nameHi: "शादी", iconKey: "rings", image: img("photo-1414235077428-338989a2e8c0", 1400),
    tagline: "Grand wedding feasts, flawlessly planned and served.",
    taglineHi: "भव्य शादी के भोज, बेहतरीन तरीके से प्लान और सर्व किए गए।",
    trending: [
      { name: "Mutton Rogan Josh", tag: "Bestseller", image: trendingImg("photo-1633945274405-b6c8069047b0") },
      { name: "Shahi Paneer", tag: "Most Loved", image: trendingImg("photo-1631452180519-c014fe946bc7") },
      { name: "Hyderabadi Biryani", tag: "Trending", image: trendingImg("photo-1563379091339-03b21ab4a4f8") },
      { name: "Malai Kofta", tag: "Crowd Fav", image: trendingImg("photo-1585937421612-70a008356fbe") },
      { name: "Rasmalai", tag: "Sweet Pick", image: trendingImg("photo-1601050690597-df0568f70950") },
    ],
  },
  {
    id: "corporate", name: "Corporate", nameHi: "कॉर्पोरेट", iconKey: "briefcase", image: img("photo-1517248135467-4c7edcad34c4", 1400),
    tagline: "Polished catering that impresses every guest.",
    taglineHi: "बेहतरीन कैटरिंग जो हर मेहमान को प्रभावित करे।",
    trending: [
      { name: "Veg Manchurian", tag: "Bestseller", image: trendingImg("photo-1585032226651-759b368d7246") },
      { name: "Pasta Counter", tag: "Trending", image: trendingImg("photo-1473093295043-cdd812d0e601") },
      { name: "Paneer Tikka", tag: "Most Loved", image: trendingImg("photo-1631452180519-c014fe946bc7") },
      { name: "Assorted Sandwiches", tag: "Quick Bite", image: trendingImg("photo-1565895405227-31cffbe0cf86") },
      { name: "Filter Coffee", tag: "Crowd Fav", image: trendingImg("photo-1437418747212-8d9709afab22") },
    ],
  },
  {
    id: "birthday", name: "Birthday", nameHi: "बर्थडे", iconKey: "gift", image: img("photo-1530103862676-de8c9debad1d", 1400),
    tagline: "Joyful spreads that make the day unforgettable.",
    taglineHi: "खुशियों भरे व्यंजन जो दिन को यादगार बना दें।",
    trending: [
      { name: "Cheese Pizza", tag: "Bestseller", image: trendingImg("photo-1565299624946-b28f40a0ae38") },
      { name: "Chilli Gobi", tag: "Trending", image: trendingImg("photo-1585032226651-759b368d7246") },
      { name: "Kulfi Falooda", tag: "Sweet Pick", image: trendingImg("photo-1601050690597-df0568f70950") },
      { name: "Spring Rolls", tag: "Crowd Fav", image: trendingImg("photo-1565895405227-31cffbe0cf86") },
      { name: "Chocolate Cake", tag: "Most Loved", image: trendingImg("photo-1578985545062-69928b1d9587") },
    ],
  },
  {
    id: "festival", name: "Festival", nameHi: "त्योहार", iconKey: "lantern", image: img("photo-1631452180519-c014fe946bc7", 1400),
    tagline: "Festive menus steeped in tradition.",
    taglineHi: "परंपरा में रचे-बसे त्योहारी मेन्यू।",
    trending: [
      { name: "Gajar Ka Halwa", tag: "Bestseller", image: trendingImg("photo-1601050690597-df0568f70950") },
      { name: "Chole Bhature", tag: "Most Loved", image: trendingImg("photo-1585937421612-70a008356fbe") },
      { name: "Puri Sabzi", tag: "Trending", image: trendingImg("photo-1606491956689-2ea866880c84") },
      { name: "Boondi Raita", tag: "Crowd Fav", image: trendingImg("photo-1565557623262-b51c2513a641") },
      { name: "Kaju Katli", tag: "Sweet Pick", image: trendingImg("photo-1631452180519-c014fe946bc7") },
    ],
  },
  {
    id: "house-party", name: "House Party", nameHi: "हाउस पार्टी", iconKey: "home", image: img("photo-1519225421980-715cb0215aed", 1400),
    tagline: "Effortless feasts for gatherings at home.",
    taglineHi: "घर की महफ़िलों के लिए आसान भोज।",
    trending: [
      { name: "Tandoori Chicken", tag: "Bestseller", image: trendingImg("photo-1633945274405-b6c8069047b0") },
      { name: "Veg Biryani", tag: "Most Loved", image: trendingImg("photo-1563379091339-03b21ab4a4f8") },
      { name: "Hara Bhara Kebab", tag: "Trending", image: trendingImg("photo-1631452180519-c014fe946bc7") },
      { name: "Pav Bhaji", tag: "Crowd Fav", image: trendingImg("photo-1606491956689-2ea866880c84") },
      { name: "Jalebi", tag: "Sweet Pick", image: trendingImg("photo-1601050690597-df0568f70950") },
    ],
  },
  {
    id: "pooja", name: "Pooja / Bhandara", nameHi: "पूजा / भंडारा", iconKey: "diya", image: img("photo-1606491956689-2ea866880c84", 1400),
    tagline: "Pure, satvik bhojan for every ritual.",
    taglineHi: "हर अनुष्ठान के लिए शुद्ध, सात्विक भोजन।",
    trending: [
      { name: "Kadhi Chawal", tag: "Bestseller", image: trendingImg("photo-1585937421612-70a008356fbe") },
      { name: "Aloo Puri", tag: "Most Loved", image: trendingImg("photo-1606491956689-2ea866880c84") },
      { name: "Sabudana Khichdi", tag: "Trending", image: trendingImg("photo-1630383249896-424e482df921") },
      { name: "Sooji Halwa", tag: "Sweet Pick", image: trendingImg("photo-1601050690597-df0568f70950") },
      { name: "Boondi Laddoo", tag: "Crowd Fav", image: trendingImg("photo-1631452180519-c014fe946bc7") },
    ],
  },
];

export const cities: { id: string; name: string; nameHi: string }[] = [
  { id: "lucknow", name: "Lucknow", nameHi: "लखनऊ" },
  { id: "delhi", name: "Delhi", nameHi: "दिल्ली" },
  { id: "mumbai", name: "Mumbai", nameHi: "मुंबई" },
  { id: "bengaluru", name: "Bengaluru", nameHi: "बेंगलुरु" },
  { id: "kolkata", name: "Kolkata", nameHi: "कोलकाता" },
  { id: "hyderabad", name: "Hyderabad", nameHi: "हैदराबाद" },
  { id: "jaipur", name: "Jaipur", nameHi: "जयपुर" },
  { id: "pune", name: "Pune", nameHi: "पुणे" },
];

export const categories: Category[] = [
  { id: "caterers", name: "Caterers", nameHi: "केटरर्स", icon: "🍲", image: img("photo-1599487488170-d11ec9c172f0", 500) },
  { id: "live-counters", name: "Live Counters", nameHi: "लाइव काउंटर", icon: "🍳", image: img("photo-1565895405227-31cffbe0cf86", 500) },
  { id: "chaat", name: "Chaat Experts", nameHi: "चाट एक्सपर्ट", icon: "🥘", image: img("photo-1601050690597-df0568f70950", 500) },
  { id: "sweets", name: "Sweet Specialists", nameHi: "मिठाई स्पेशलिस्ट", icon: "🍬", image: img("photo-1631452180519-c014fe946bc7", 500) },
  { id: "beverages", name: "Beverage Partners", nameHi: "बेवरेज पार्टनर", icon: "🥤", image: img("photo-1437418747212-8d9709afab22", 500) },
  { id: "decor", name: "Decor & More", nameHi: "सजावट और बहुत कुछ", icon: "🎉", image: img("photo-1519225421980-715cb0215aed", 500) },
];

export const packages: PackageTier[] = [
  {
    id: "silver",
    name: "Silver",
    nameHi: "सिल्वर",
    price: "₹799",
    unit: "/ Plate",
    unitHi: "/ प्लेट",
    tagline: "Fixed Menu",
    taglineHi: "फिक्स्ड मेन्यू",
    pax: "50 – 300 Guests",
    paxHi: "50 – 300 मेहमान",
    bestFor: "Birthdays · Pujas · Family Gatherings",
    bestForHi: "जन्मदिन · पूजा · पारिवारिक समारोह",
    minPax: 50,
    maxPax: 300,
    image: img("photo-1490645935967-10de6ba17061"),
    features: [
      { label: "Welcome Drink", labelHi: "वेलकम ड्रिंक" },
      { label: "2 Starters", labelHi: "2 स्टार्टर" },
      { label: "Fixed Main Course Menu", labelHi: "फिक्स्ड मेन कोर्स मेन्यू", heading: true },
      {
        label:
          "1 Paneer Delicacy, Dry Veg, Dal, Chawal, Raita, Salad, Papad, Achar, Puri / Naan",
        labelHi:
          "1 पनीर व्यंजन, ड्राय वेज, दाल, चावल, रायता, सलाद, पापड़, अचार, पूरी / नान",
      },
      { label: "1 Sweet", labelHi: "1 मिठाई", standalone: true },
    ],
    footnote: ["Fixed main course menu with up to 5 vendors in your city."],
    footnoteHi: ["आपके शहर में 5 वेंडर तक के साथ फिक्स्ड मेन कोर्स मेन्यू।"],
  },
  {
    id: "gold",
    name: "Gold",
    nameHi: "गोल्ड",
    price: "₹1199",
    unit: "/ Plate",
    unitHi: "/ प्लेट",
    popular: true,
    tagline: "Popular Choice",
    taglineHi: "लोकप्रिय विकल्प",
    pax: "150 – 10,000 Guests",
    paxHi: "150 – 10,000 मेहमान",
    bestFor: "Weddings · Receptions · Engagements",
    bestForHi: "शादी · रिसेप्शन · सगाई",
    minPax: 150,
    maxPax: 10_000,
    image: img("photo-1543339308-43e59d6b73a6"),
    features: [
      { label: "Welcome Drink", labelHi: "वेलकम ड्रिंक" },
      { label: "5 Starters (Pick Any)", labelHi: "5 स्टार्टर (कोई भी चुनें)", heading: true },
      { label: "3 Live Stalls (Pick Any)", labelHi: "3 लाइव स्टॉल (कोई भी चुनें)" },
      { label: "Chaat (Pick Any)", labelHi: "चाट (कोई भी चुनें)", heading: true },
      { label: "Chinese (Pick Any)", labelHi: "चाइनीज़ (कोई भी चुनें)" },
      { label: "South Indian (Pick Any)", labelHi: "साउथ इंडियन (कोई भी चुनें)", standalone: true },
      { label: "Main Course (Pick Any)", labelHi: "मेन कोर्स (कोई भी चुनें)", standalone: true },
      { label: "Sweet Stall (Pick Any)", labelHi: "स्वीट स्टॉल (कोई भी चुनें)", standalone: true },
    ],
    footnote: ["From 150 guests — multiple choices in your city; choices from multiple vendors for 1,000+ guests"],
    footnoteHi: ["150 मेहमानों से — आपके शहर में कई विकल्प; 1,000+ मेहमानों के लिए कई वेंडरों से विकल्प"],
  },
  {
    id: "platinum",
    name: "Platinum",
    nameHi: "प्लैटिनम",
    price: "₹1599+",
    unit: "/ Plate",
    unitHi: "/ प्लेट",
    tagline: "Premium Experience",
    taglineHi: "प्रीमियम अनुभव",
    pax: "50 – 50,000 Guests",
    paxHi: "50 – 50,000 मेहमान",
    bestFor: "Grand Weddings · Galas · VIP Events",
    bestForHi: "भव्य शादियाँ · गाला · वीआईपी इवेंट",
    minPax: 50,
    maxPax: 50_000,
    image: img("photo-1600891964599-f61ba0e24092"),
    features: [
      { label: "Welcome Drink", labelHi: "वेलकम ड्रिंक" },
      { label: "Premium Starters (Pick Any)", labelHi: "प्रीमियम स्टार्टर (कोई भी चुनें)" },
      { label: "Live Stalls (Pick Any)", labelHi: "लाइव स्टॉल (कोई भी चुनें)" },
      { label: "Chaat (Pick Any)", labelHi: "चाट (कोई भी चुनें)" },
      { label: "Main Course (Pick Any)", labelHi: "मेन कोर्स (कोई भी चुनें)" },
      { label: "Sweet Stall (Pick Any)", labelHi: "स्वीट स्टॉल (कोई भी चुनें)" },
      { label: "Premium Famous Vendors", labelHi: "प्रीमियम मशहूर वेंडर" },
    ],
    footnote: ["From just 50 guests — multiple choices & famous vendors across India"],
    footnoteHi: ["सिर्फ़ 50 मेहमानों से — पूरे भारत में कई विकल्प और मशहूर वेंडर"],
  },
  {
    id: "custom",
    name: "Custom",
    nameHi: "कस्टम",
    price: "Your Price",
    unit: "/ Plate",
    unitHi: "/ प्लेट",
    tagline: "Build Your Own",
    taglineHi: "खुद बनाएं",
    bestFor: "Any Occasion, Your Way",
    bestForHi: "कोई भी अवसर, आपके अंदाज़ में",
    image: img("photo-1467003909585-2f8a72700288"),
    features: [
      { label: "Build Your Own Menu", labelHi: "अपना खुद का मेन्यू बनाएं" },
      { label: "Pick Any Cuisines & Courses", labelHi: "कोई भी व्यंजन और कोर्स चुनें" },
      { label: "Add Live Counters & Extras", labelHi: "लाइव काउंटर और एक्स्ट्रा जोड़ें" },
      { label: "Choose Your Vendor", labelHi: "अपना वेंडर चुनें" },
      { label: "Pay Only For What You Select", labelHi: "सिर्फ़ अपनी पसंद के लिए भुगतान करें" },
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
    image: img("photo-1505686994434-e3cc5abf1330", 600),
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

export interface Testimonial {
  id: string;
  name: string;
  role: string; // occasion / context, e.g. "Wedding · Lucknow"
  roleHi: string;
  quote: string;
  quoteHi: string;
  rating: number;
  avatar: string;
}

export const testimonials: Testimonial[] = [
  {
    id: "t-1",
    name: "Ananya Sharma",
    role: "Wedding · Lucknow",
    roleHi: "शादी · लखनऊ",
    quote:
      "Bhojpatra made catering for our 600-guest wedding effortless. The live counters were the talk of the night and every dish arrived exactly on time.",
    quoteHi:
      "भोजपत्र ने हमारी 600 मेहमानों की शादी की कैटरिंग को बेहद आसान बना दिया। लाइव काउंटर रात की जान थे और हर व्यंजन बिल्कुल समय पर आया।",
    rating: 5,
    avatar: "/avatars/t-1.jpg",
  },
  {
    id: "t-2",
    name: "Rohit Mehta",
    role: "Corporate Gala · Delhi",
    roleHi: "कॉर्पोरेट गाला · दिल्ली",
    quote:
      "Transparent pricing and zero surprises. I compared three specialists in minutes and booked the best one for our annual gala without a single call.",
    quoteHi:
      "पारदर्शी कीमत और कोई छिपी बात नहीं। मैंने मिनटों में तीन स्पेशलिस्ट की तुलना की और बिना एक भी कॉल किए हमारे सालाना गाला के लिए सबसे अच्छा बुक किया।",
    rating: 5,
    avatar: "/avatars/t-2.jpg",
  },
  {
    id: "t-3",
    name: "Priya Nair",
    role: "Anniversary · Mumbai",
    roleHi: "एनिवर्सरी · मुंबई",
    quote:
      "The team helped us design a fully vegetarian menu that everyone loved. Support was warm and responsive from first click to the final bite.",
    quoteHi:
      "टीम ने हमें पूरी तरह शाकाहारी मेन्यू बनाने में मदद की जो सबको पसंद आया। पहले क्लिक से आखिरी निवाले तक सहयोग गर्मजोशी भरा और तत्पर रहा।",
    rating: 5,
    avatar: "/avatars/t-3.jpg",
  },
  {
    id: "t-4",
    name: "Vikram Singh",
    role: "Diwali Party · Jaipur",
    roleHi: "दिवाली पार्टी · जयपुर",
    quote:
      "Booking was genuinely a five-minute job and the sweet stall was outstanding. We'll never go back to chasing caterers over the phone.",
    quoteHi:
      "बुकिंग वाकई पाँच मिनट का काम था और मिठाई स्टॉल लाजवाब था। अब हम कभी फ़ोन पर केटरर्स के पीछे नहीं भागेंगे।",
    rating: 5,
    avatar: "/avatars/t-4.jpg",
  },
  {
    id: "t-5",
    name: "Sneha Reddy",
    role: "Birthday · Hyderabad",
    roleHi: "बर्थडे · हैदराबाद",
    quote:
      "Loved being able to read real reviews before choosing. Our specialist nailed the South Indian spread and the kids' dessert counter was a hit.",
    quoteHi:
      "चुनने से पहले असली समीक्षाएं पढ़ पाना बहुत अच्छा लगा। हमारे स्पेशलिस्ट ने साउथ इंडियन स्प्रेड शानदार बनाया और बच्चों का डेज़र्ट काउंटर हिट रहा।",
    rating: 5,
    avatar: "/avatars/t-5.jpg",
  },
  {
    id: "t-6",
    name: "Arjun Kapoor",
    role: "Engagement · Pune",
    roleHi: "सगाई · पुणे",
    quote:
      "End-to-end assistance is real here. They handled vendor coordination so we could actually enjoy our own engagement. Highly recommend.",
    quoteHi:
      "यहाँ शुरू से अंत तक की मदद असली है। उन्होंने वेंडर का सारा समन्वय संभाला ताकि हम अपनी सगाई का असल में आनंद ले सकें। ज़रूर सुझाऊंगा।",
    rating: 5,
    avatar: "/avatars/t-6.jpg",
  },
];

export interface DropdownItem {
  title: string;
  titleHi: string;
  subtitle: string;
  subtitleHi: string;
  href: string;
  iconKey: string;
}

export const partnerOptions: DropdownItem[] = [
  {
    title: "As a Vendor",
    titleHi: "वेंडर के रूप में",
    subtitle: "For Work",
    subtitleHi: "काम के लिए",
    href: "/vendor/register",
    iconKey: "vendor",
  },
  {
    title: "As an Event Planner",
    titleHi: "इवेंट प्लानर के रूप में",
    subtitle: "For Refer Business",
    subtitleHi: "बिज़नेस रेफर करने के लिए",
    href: "/partner",
    iconKey: "planner",
  },
  {
    title: "As an Individual",
    titleHi: "व्यक्ति के रूप में",
    subtitle: "For Refer Business",
    subtitleHi: "बिज़नेस रेफर करने के लिए",
    href: "/partner",
    iconKey: "individual",
  },
  {
    title: "As a Venue Owner",
    titleHi: "वेन्यू मालिक के रूप में",
    subtitle: "GST No. Required",
    subtitleHi: "GST नंबर आवश्यक",
    href: "/partner",
    iconKey: "venue",
  },
];

export const navLinks: {
  label: string;
  labelHi: string;
  href: string;
  hasDropdown?: boolean;
  items?: DropdownItem[];
}[] = [
  { label: "Vendors", labelHi: "वेंडर", href: "/vendors" },
  { label: "Venues", labelHi: "वेन्यू", href: "/venues" },
  { label: "My Bookings", labelHi: "मेरी बुकिंग", href: "/bookings" },
  { label: "Partner With Us", labelHi: "हमारे साथ जुड़ें", href: "/partner", hasDropdown: true, items: partnerOptions },
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

export const guestPresets: number[] = [
  50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000,
];

/* ───────────────────────────────────────────────────────────────────────
   MENU BUILDER — per-category vendor + item selection powering the /book
   wizard's "Build Your Menu" step. For every category the customer first
   picks ONE specialist vendor (Step A), then chooses items from that
   vendor's own menu (Step B). The selected package decides how many items
   each category includes (see `packageCategoryItems`). Per-plate prices on a
   vendor are *additions* layered on top of the package's base plate price.
─────────────────────────────────────────────────────────────────────── */

export interface CategoryItem {
  id: string;
  name: string;
  diet: DietType;
}

export interface CategoryVendor {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  /** Per-plate amount added on top of the package base when this vendor is chosen. */
  perPlate: number;
  image: string;
  items: CategoryItem[];
}

export interface MenuCategory {
  id: string;
  name: string;
  nameHi: string;
  icon: string;
  /** One-line note shown in the "what's included" strip. */
  blurb: string;
  blurbHi: string;
  vendors: CategoryVendor[];
}

/** Compact item builder — ids are unique within a vendor (selection resets
 *  whenever the customer switches vendors, so global uniqueness isn't needed). */
const mkItems = (
  vendorId: string,
  defs: [name: string, diet?: DietType][],
): CategoryItem[] =>
  defs.map(([name, diet], i) => ({ id: `${vendorId}-${i}`, name, diet: diet ?? "veg" }));

const vImg = (id: string) => img(id, 300);

export const menuCategories: MenuCategory[] = [
  {
    id: "welcome",
    name: "Welcome Drinks",
    nameHi: "वेलकम ड्रिंक्स",
    icon: "🥤",
    blurb: "Refreshing arrival drinks to greet your guests.",
    blurbHi: "मेहमानों के स्वागत के लिए ताज़ा पेय।",
    vendors: [
      { id: "wd-sparkle", name: "Sip & Sparkle", rating: 4.8, reviews: 210, perPlate: 40, image: vImg("photo-1437418747212-8d9709afab22"),
        items: mkItems("wd-sparkle", [["Masala Jaljeera"], ["Aam Panna"], ["Tender Coconut Cooler"], ["Rose Sharbat"], ["Thandai"], ["Virgin Mojito"]]) },
      { id: "wd-sharbat", name: "Sharbat House", rating: 4.7, reviews: 165, perPlate: 35, image: vImg("photo-1601050690597-df0568f70950"),
        items: mkItems("wd-sharbat", [["Rose Sharbat"], ["Khus Sharbat"], ["Spiced Buttermilk"], ["Masala Jaljeera"], ["Kokum Cooler"], ["Nimbu Pani"]]) },
      { id: "wd-cooler", name: "Cooler Co.", rating: 4.6, reviews: 140, perPlate: 30, image: vImg("photo-1565895405227-31cffbe0cf86"),
        items: mkItems("wd-cooler", [["Tender Coconut Cooler"], ["Spiced Buttermilk"], ["Virgin Mojito"], ["Nimbu Pani"], ["Aam Panna"], ["Masala Jaljeera"]]) },
      { id: "wd-mocktail", name: "Mocktail Mantra", rating: 4.7, reviews: 188, perPlate: 45, image: vImg("photo-1437418747212-8d9709afab22"),
        items: mkItems("wd-mocktail", [["Virgin Mojito"], ["Blue Lagoon"], ["Fruit Punch"], ["Thandai"], ["Rose Sharbat"], ["Kokum Cooler"]]) },
      { id: "wd-fizz", name: "Fizz & Co.", rating: 4.6, reviews: 132, perPlate: 38, image: vImg("photo-1601050690597-df0568f70950"),
        items: mkItems("wd-fizz", [["Jaljeera Fizz"], ["Cola Float"], ["Lemon Soda"], ["Aam Panna"], ["Watermelon Cooler"], ["Mint Lemonade"]]) },
      { id: "wd-juice", name: "Juice Junction", rating: 4.7, reviews: 174, perPlate: 42, image: vImg("photo-1565895405227-31cffbe0cf86"),
        items: mkItems("wd-juice", [["Fresh Orange"], ["Mosambi Juice"], ["Sugarcane Juice"], ["Pineapple Cooler"], ["Tender Coconut Cooler"], ["Mixed Fruit Punch"]]) },
    ],
  },
  {
    id: "starters",
    name: "Starters",
    nameHi: "स्टार्टर",
    icon: "🍢",
    blurb: "Hot, hand-passed bites to open the feast.",
    blurbHi: "भोज की शुरुआत के लिए गरमागरम स्टार्टर।",
    vendors: [
      { id: "st-tandoor", name: "Tandoor Tales", rating: 4.8, reviews: 260, perPlate: 70, image: vImg("photo-1567188040759-fb8a883dc6d8"),
        items: mkItems("st-tandoor", [["Paneer Tikka"], ["Tandoori Mushroom"], ["Hara Bhara Kebab"], ["Chicken Tikka", "non-veg"], ["Mutton Seekh Kebab", "non-veg"], ["Tandoori Aloo"]]) },
      { id: "st-kebab", name: "Kebab Korner", rating: 4.7, reviews: 205, perPlate: 65, image: vImg("photo-1633945274405-b6c8069047b0"),
        items: mkItems("st-kebab", [["Galouti Kebab", "non-veg"], ["Mutton Seekh Kebab", "non-veg"], ["Hara Bhara Kebab"], ["Chicken Malai Tikka", "non-veg"], ["Paneer Tikka"], ["Shami Kebab", "non-veg"]]) },
      { id: "st-crispy", name: "Crispy Counter", rating: 4.6, reviews: 150, perPlate: 55, image: vImg("photo-1585032226651-759b368d7246"),
        items: mkItems("st-crispy", [["Chilli Gobi"], ["Veg Spring Roll"], ["Crispy Corn"], ["Honey Chilli Potato"], ["Paneer 65"], ["Veg Manchurian"]]) },
      { id: "st-grill", name: "Grill & Gather", rating: 4.7, reviews: 230, perPlate: 75, image: vImg("photo-1606471191009-63994c53433b"),
        items: mkItems("st-grill", [["Chicken Tikka", "non-veg"], ["Amritsari Fish", "non-veg"], ["Paneer Tikka"], ["Tandoori Prawns", "non-veg"], ["Hara Bhara Kebab"], ["Malai Broccoli"]]) },
      { id: "st-sizzle", name: "Sizzle Studio", rating: 4.6, reviews: 178, perPlate: 60, image: vImg("photo-1585032226651-759b368d7246"),
        items: mkItems("st-sizzle", [["Veg Seekh"], ["Paneer Tikka"], ["Soya Chaap"], ["Chicken Malai Tikka", "non-veg"], ["Tandoori Mushroom"], ["Hara Bhara Kebab"]]) },
      { id: "st-smoke", name: "Smoke & Spice", rating: 4.8, reviews: 244, perPlate: 78, image: vImg("photo-1633945274405-b6c8069047b0"),
        items: mkItems("st-smoke", [["Mutton Seekh Kebab", "non-veg"], ["Galouti Kebab", "non-veg"], ["Smoked Paneer Tikka"], ["Tandoori Chicken", "non-veg"], ["Achari Aloo"], ["Malai Broccoli"]]) },
    ],
  },
  {
    id: "live",
    name: "Live Counters",
    nameHi: "लाइव काउंटर",
    icon: "🔥",
    blurb: "Made-to-order stations cooked in front of guests.",
    blurbHi: "मेहमानों के सामने बनने वाले लाइव काउंटर।",
    vendors: [
      { id: "lc-flame", name: "Live Flame Co.", rating: 4.8, reviews: 240, perPlate: 90, image: vImg("photo-1565895405227-31cffbe0cf86"),
        items: mkItems("lc-flame", [["Live Tandoor"], ["Dosa Station"], ["Pasta Counter"], ["Tawa Pulao"], ["Momo Counter"], ["Jalebi Live"]]) },
      { id: "lc-dosa", name: "Dosa Dynamics", rating: 4.7, reviews: 190, perPlate: 70, image: vImg("photo-1630383249896-424e482df921"),
        items: mkItems("lc-dosa", [["Live Dosa"], ["Uttapam Station"], ["Idli Bar"], ["Filter Coffee"], ["Medu Vada"], ["Pongal Live"]]) },
      { id: "lc-pasta", name: "Pasta Piazza", rating: 4.6, reviews: 160, perPlate: 80, image: vImg("photo-1473093295043-cdd812d0e601"),
        items: mkItems("lc-pasta", [["Pasta Counter"], ["Pizza Station"], ["Garlic Bread"], ["Risotto Live"], ["Bruschetta Bar"], ["Mac & Cheese"]]) },
      { id: "lc-chaat", name: "Chaat Circuit", rating: 4.7, reviews: 275, perPlate: 60, image: vImg("photo-1606491956689-2ea866880c84"),
        items: mkItems("lc-chaat", [["Golgappa Bar"], ["Tikki Chaat"], ["Papdi Chaat"], ["Dahi Bhalla"], ["Bhel Counter"], ["Raj Kachori"]]) },
      { id: "lc-grill", name: "Grill Theatre", rating: 4.6, reviews: 168, perPlate: 95, image: vImg("photo-1606471191009-63994c53433b"),
        items: mkItems("lc-grill", [["Live Tandoor"], ["Sizzler Station"], ["Kebab Counter"], ["Grilled Veg Live"], ["Tawa Pulao"], ["Live Naan"]]) },
      { id: "lc-wok", name: "Wok Live", rating: 4.7, reviews: 202, perPlate: 85, image: vImg("photo-1473093295043-cdd812d0e601"),
        items: mkItems("lc-wok", [["Live Noodles"], ["Stir-Fry Station"], ["Momo Counter"], ["Schezwan Rice Live"], ["Dim Sum Bar"], ["Manchurian Live"]]) },
    ],
  },
  {
    id: "chaat",
    name: "Chaat",
    nameHi: "चाट",
    icon: "🥘",
    blurb: "Tangy, street-style chaat counters.",
    blurbHi: "चटपटे स्ट्रीट-स्टाइल चाट काउंटर।",
    vendors: [
      { id: "ch-tuesday", name: "Tuesday Chaat Corner", rating: 4.7, reviews: 150, perPlate: 55, image: vImg("photo-1601050690597-df0568f70950"),
        items: mkItems("ch-tuesday", [["Golgappa / Pani Puri"], ["Aloo Tikki Chaat"], ["Papdi Chaat"], ["Dahi Bhalla"], ["Samosa Chaat"], ["Raj Kachori"]]) },
      { id: "ch-royal", name: "Royal Chaat House", rating: 4.9, reviews: 195, perPlate: 65, image: vImg("photo-1606471191009-63994c53433b"),
        items: mkItems("ch-royal", [["Raj Kachori"], ["Bhel Puri"], ["Sev Puri"], ["Dahi Puri"], ["Tikki Chaat"], ["Palak Chaat"]]) },
      { id: "ch-lucknow", name: "Lucknow Chaat Bhandar", rating: 4.8, reviews: 142, perPlate: 50, image: vImg("photo-1567188040759-fb8a883dc6d8"),
        items: mkItems("ch-lucknow", [["Basket Chaat"], ["Matar Tikki"], ["Pani Puri"], ["Dahi Bhalla"], ["Papdi Chaat"], ["Bhel Counter"]]) },
      { id: "ch-aradh", name: "Aradh Chaat Point", rating: 4.6, reviews: 118, perPlate: 45, image: vImg("photo-1606491956689-2ea866880c84"),
        items: mkItems("ch-aradh", [["Pani Puri"], ["Sev Puri"], ["Aloo Tikki Chaat"], ["Dahi Puri"], ["Samosa Chaat"], ["Bhel Puri"]]) },
      { id: "ch-banaras", name: "Banaras Chaat Co.", rating: 4.8, reviews: 176, perPlate: 58, image: vImg("photo-1601050690597-df0568f70950"),
        items: mkItems("ch-banaras", [["Tamatar Chaat"], ["Palak Patta Chaat"], ["Aloo Tikki Chaat"], ["Golgappa / Pani Puri"], ["Dahi Bhalla"], ["Basket Chaat"]]) },
      { id: "ch-street", name: "Street Chaat Lab", rating: 4.6, reviews: 134, perPlate: 48, image: vImg("photo-1567188040759-fb8a883dc6d8"),
        items: mkItems("ch-street", [["Bhel Puri"], ["Sev Puri"], ["Pani Puri"], ["Ragda Pattice"], ["Dahi Puri"], ["Samosa Chaat"]]) },
    ],
  },
  {
    id: "chinese",
    name: "Chinese",
    nameHi: "चाइनीज़",
    icon: "🥡",
    blurb: "Wok-fresh Indo-Chinese favourites.",
    blurbHi: "वोक-फ्रेश इंडो-चाइनीज़ पसंदीदा।",
    vendors: [
      { id: "cn-wok", name: "Wok & Roll", rating: 4.7, reviews: 198, perPlate: 75, image: vImg("photo-1585032226651-759b368d7246"),
        items: mkItems("cn-wok", [["Veg Hakka Noodles"], ["Veg Manchurian"], ["Chilli Paneer"], ["Chicken Hakka Noodles", "non-veg"], ["Chilli Chicken", "non-veg"], ["Veg Fried Rice"]]) },
      { id: "cn-dragon", name: "Dragon Dynasty", rating: 4.8, reviews: 224, perPlate: 85, image: vImg("photo-1473093295043-cdd812d0e601"),
        items: mkItems("cn-dragon", [["Schezwan Noodles"], ["Chilli Paneer"], ["Veg Spring Roll"], ["Chicken Manchurian", "non-veg"], ["Schezwan Fried Rice"], ["Honey Chilli Potato"]]) },
      { id: "cn-bamboo", name: "Bamboo House", rating: 4.6, reviews: 165, perPlate: 70, image: vImg("photo-1565895405227-31cffbe0cf86"),
        items: mkItems("cn-bamboo", [["Veg Fried Rice"], ["Hakka Noodles"], ["Gobi Manchurian"], ["Crispy Chilli Baby Corn"], ["Chilli Chicken", "non-veg"], ["Hot & Sour Soup"]]) },
      { id: "cn-mandarin", name: "Mandarin Express", rating: 4.7, reviews: 187, perPlate: 80, image: vImg("photo-1585032226651-759b368d7246"),
        items: mkItems("cn-mandarin", [["Chilli Paneer"], ["Schezwan Noodles"], ["Veg Manchurian"], ["Drums of Heaven", "non-veg"], ["Chicken Fried Rice", "non-veg"], ["Spring Roll"]]) },
      { id: "cn-canton", name: "Canton Kitchen", rating: 4.6, reviews: 156, perPlate: 72, image: vImg("photo-1473093295043-cdd812d0e601"),
        items: mkItems("cn-canton", [["Veg Hakka Noodles"], ["Chilli Garlic Noodles"], ["Gobi Manchurian"], ["Chilli Chicken", "non-veg"], ["Veg Fried Rice"], ["Spring Roll"]]) },
      { id: "cn-sichuan", name: "Sichuan Street", rating: 4.8, reviews: 209, perPlate: 82, image: vImg("photo-1565895405227-31cffbe0cf86"),
        items: mkItems("cn-sichuan", [["Schezwan Noodles"], ["Chilli Paneer"], ["Crispy Chilli Baby Corn"], ["Kung Pao Chicken", "non-veg"], ["Schezwan Fried Rice"], ["Hot & Sour Soup"]]) },
    ],
  },
  {
    id: "south-indian",
    name: "South Indian",
    nameHi: "साउथ इंडियन",
    icon: "🥥",
    blurb: "Dosas, idlis and South Indian classics.",
    blurbHi: "डोसा, इडली और साउथ इंडियन क्लासिक्स।",
    vendors: [
      { id: "si-dakshin", name: "Dakshin Delights", rating: 4.8, reviews: 232, perPlate: 70, image: vImg("photo-1630383249896-424e482df921"),
        items: mkItems("si-dakshin", [["Masala Dosa"], ["Idli Sambar"], ["Medu Vada"], ["Uttapam"], ["Pongal"], ["Filter Coffee"]]) },
      { id: "si-chettinad", name: "Chettinad Feast Co.", rating: 4.8, reviews: 212, perPlate: 80, image: vImg("photo-1565557623262-b51c2513a641"),
        items: mkItems("si-chettinad", [["Ghee Roast Dosa"], ["Rava Dosa"], ["Curd Rice"], ["Sambar & Rasam"], ["Lemon Rice"], ["Mysore Bonda"]]) },
      { id: "si-namma", name: "Namma Ruchi", rating: 4.7, reviews: 201, perPlate: 65, image: vImg("photo-1630383249896-424e482df921"),
        items: mkItems("si-namma", [["Idli Sambar"], ["Set Dosa"], ["Vada"], ["Coconut Chutney"], ["Bisi Bele Bath"], ["Pongal"]]) },
      { id: "si-madras", name: "Madras Tiffin Room", rating: 4.6, reviews: 158, perPlate: 60, image: vImg("photo-1565557623262-b51c2513a641"),
        items: mkItems("si-madras", [["Plain Dosa"], ["Masala Dosa"], ["Idli"], ["Medu Vada"], ["Upma"], ["Filter Coffee"]]) },
      { id: "si-coastal", name: "Coastal Tiffins", rating: 4.7, reviews: 184, perPlate: 68, image: vImg("photo-1630383249896-424e482df921"),
        items: mkItems("si-coastal", [["Neer Dosa"], ["Appam"], ["Idiyappam"], ["Sambar & Rasam"], ["Coconut Chutney"], ["Filter Coffee"]]) },
      { id: "si-anna", name: "Anna's Mess", rating: 4.6, reviews: 149, perPlate: 58, image: vImg("photo-1565557623262-b51c2513a641"),
        items: mkItems("si-anna", [["Masala Dosa"], ["Mini Idli"], ["Medu Vada"], ["Pongal"], ["Lemon Rice"], ["Curd Rice"]]) },
    ],
  },
  {
    id: "main",
    name: "Main Course",
    nameHi: "मेन कोर्स",
    icon: "🍲",
    blurb: "Signature curries, biryanis and breads.",
    blurbHi: "खास करी, बिरयानी और ब्रेड।",
    vendors: [
      { id: "mc-awadhi", name: "Awadhi Royal", rating: 4.9, reviews: 412, perPlate: 120, image: vImg("photo-1555939594-58d7cb561ad1"),
        items: mkItems("mc-awadhi", [["Paneer Butter Masala"], ["Dal Makhani"], ["Mutton Rogan Josh", "non-veg"], ["Butter Chicken", "non-veg"], ["Veg Dum Biryani"], ["Assorted Naan"]]) },
      { id: "mc-nawabi", name: "Nawabi Dawat", rating: 4.8, reviews: 287, perPlate: 90, image: vImg("photo-1556910103-1c02745aae4d"),
        items: mkItems("mc-nawabi", [["Butter Chicken", "non-veg"], ["Malai Kofta"], ["Dal Makhani"], ["Mutton Dum Biryani", "non-veg"], ["Shahi Paneer"], ["Tandoori Roti"]]) },
      { id: "mc-spice", name: "Spice Symphony", rating: 4.7, reviews: 198, perPlate: 70, image: vImg("photo-1414235077428-338989a2e8c0"),
        items: mkItems("mc-spice", [["Veg Manchurian"], ["Paneer Butter Masala"], ["Chicken Chettinad", "non-veg"], ["Jeera Rice"], ["Dal Tadka"], ["Butter Naan"]]) },
      { id: "mc-ganga", name: "Ganga Caterers", rating: 4.6, reviews: 156, perPlate: 55, image: vImg("photo-1490645935967-10de6ba17061"),
        items: mkItems("mc-ganga", [["Malai Kofta"], ["Sambar & Rasam"], ["Dal Makhani"], ["Veg Dum Biryani"], ["Mix Veg Handi"], ["Tandoori Roti"]]) },
      { id: "mc-mughal", name: "Mughal Mahal", rating: 4.8, reviews: 268, perPlate: 110, image: vImg("photo-1556910103-1c02745aae4d"),
        items: mkItems("mc-mughal", [["Shahi Paneer"], ["Dal Bukhara"], ["Mutton Korma", "non-veg"], ["Murgh Makhani", "non-veg"], ["Hyderabadi Biryani"], ["Sheermal"]]) },
      { id: "mc-rasoi", name: "Rasoi Royale", rating: 4.7, reviews: 221, perPlate: 80, image: vImg("photo-1414235077428-338989a2e8c0"),
        items: mkItems("mc-rasoi", [["Kadhai Paneer"], ["Dal Tadka"], ["Veg Biryani"], ["Chicken Curry", "non-veg"], ["Mix Veg"], ["Butter Naan"]]) },
    ],
  },
  {
    id: "sweets",
    name: "Sweets",
    nameHi: "मिठाई",
    icon: "🍬",
    blurb: "A sweet finish — halwai-made desserts.",
    blurbHi: "हलवाई के हाथ की मिठाइयों के साथ मीठा अंत।",
    vendors: [
      { id: "sw-bengal", name: "Bengal Sweet Atelier", rating: 4.8, reviews: 320, perPlate: 85, image: vImg("photo-1601050690597-df0568f70950"),
        items: mkItems("sw-bengal", [["Jalebi Rabri"], ["Imarti"], ["Gulab Jamun"], ["Rasmalai"], ["Moong Halwa"], ["Gajar Halwa"]]) },
      { id: "sw-saffron", name: "Saffron Halwai", rating: 4.7, reviews: 240, perPlate: 70, image: vImg("photo-1631452180519-c014fe946bc7"),
        items: mkItems("sw-saffron", [["Gulab Jamun"], ["Gajar Halwa"], ["Moong Halwa"], ["Kaju Katli"], ["Rasmalai"], ["Jalebi Rabri"]]) },
      { id: "sw-ghasitaram", name: "Ghasitaram Classic", rating: 4.6, reviews: 190, perPlate: 60, image: vImg("photo-1578985545062-69928b1d9587"),
        items: mkItems("sw-ghasitaram", [["Kaju Katli"], ["Gulab Jamun"], ["Soan Papdi"], ["Rasgulla"], ["Gajar Halwa"], ["Imarti"]]) },
      { id: "sw-haldiram", name: "Haldiram Live", rating: 4.7, reviews: 280, perPlate: 75, image: vImg("photo-1601050690597-df0568f70950"),
        items: mkItems("sw-haldiram", [["Jalebi Rabri"], ["Imarti"], ["Gulab Jamun"], ["Rasmalai"], ["Moong Halwa"], ["Gajar Halwa"]]) },
      { id: "sw-mithai", name: "Mithai Mahal", rating: 4.8, reviews: 256, perPlate: 80, image: vImg("photo-1631452180519-c014fe946bc7"),
        items: mkItems("sw-mithai", [["Motichoor Laddu"], ["Kaju Katli"], ["Rasgulla"], ["Cham Cham"], ["Gulab Jamun"], ["Gajar Halwa"]]) },
      { id: "sw-kesar", name: "Kesar Sweets", rating: 4.7, reviews: 198, perPlate: 72, image: vImg("photo-1578985545062-69928b1d9587"),
        items: mkItems("sw-kesar", [["Kesar Peda"], ["Soan Papdi"], ["Gulab Jamun"], ["Rasmalai"], ["Moong Halwa"], ["Jalebi Rabri"]]) },
    ],
  },
];

/**
 * Which menu categories (and in what order) each package opens up in the
 * booking builder. This MUST mirror the segments advertised on each package
 * card in the home page <Packages> section, so the tabs a guest sees on /book
 * match the package they selected.
 *   • Silver  — fixed menu: welcome, starters, main course, sweet
 *   • Gold    — multi-cuisine spread incl. live, chaat, chinese, south indian
 *   • Platinum— premium curated segments
 *   • Custom  — everything (build your own)
 */
export const packageCategories: Record<string, string[]> = {
  silver: ["welcome", "starters", "main", "sweets"],
  gold: ["welcome", "starters", "live", "chaat", "chinese", "south-indian", "main", "sweets"],
  platinum: ["welcome", "starters", "chaat", "live", "main", "sweets"],
  custom: ["welcome", "starters", "live", "chaat", "chinese", "south-indian", "main", "sweets"],
};

/**
 * How many items each package includes per category id. Drives the
 * "Sweets ×3" allowance strip and the "3/3 picked" counters in Step B.
 * Keys are kept in step with `packageCategories` above.
 */
export const packageCategoryItems: Record<string, Record<string, number>> = {
  silver: { welcome: 1, starters: 2, main: 3, sweets: 1 },
  gold: { welcome: 1, starters: 5, live: 1, chaat: 2, chinese: 2, "south-indian": 2, main: 5, sweets: 3 },
  platinum: { welcome: 2, starters: 6, chaat: 3, live: 2, main: 6, sweets: 4 },
  custom: { welcome: 2, starters: 6, live: 2, chaat: 3, chinese: 3, "south-indian": 3, main: 6, sweets: 4 },
};

/** Base per-plate price for a package id (₹). Custom bills only what's chosen. */
export const packageBasePerPlate: Record<string, number> = {
  silver: 799,
  gold: 1199,
  platinum: 1599,
  custom: 0,
};

/**
 * Minimum advance-booking lead time (in days) each package needs before the
 * event date — richer tiers source more vendors, so they need more notice.
 * A package only appears once the chosen date is at least this many days away.
 * Custom has no lead-time requirement (always available).
 */
export const packageLeadDays: Record<string, number> = {
  silver: 7,
  gold: 21,
  platinum: 45,
  custom: 0,
};

/* ───────────────────────────────────────────────────────────────────────
   VENDOR CATALOG / LISTING — search & filter by city, state, cuisine, tier.
─────────────────────────────────────────────────────────────────────── */

export interface VendorListing {
  id: string;
  name: string;
  /** Every tier band this caterer serves (one per price band their packages
   *  cover) — ordered Silver → Gold → Platinum. A vendor can sit in several. */
  tiers: ("Silver" | "Gold" | "Platinum")[];
  rating: number;
  reviews: number;
  city: string;
  state: string;
  cuisines: string[];
  /** Meals / courses this caterer serves, e.g. "Main Course", "Dinner". */
  mealTypes: string[];
  diet: "Veg" | "Non-Veg" | "Veg & Non-Veg";
  priceFrom: number;
  verified: boolean;
  image: string;
}

/** Meal / course offerings used for the "Serves" filter on the catalog. */
export const mealTypeOptions: string[] = [
  "Breakfast", "Lunch", "Dinner", "Starters", "Main Course",
  "Desserts", "Live Counters",
];

export const indianStates: string[] = [
  "Uttar Pradesh", "Delhi", "Maharashtra", "Karnataka", "West Bengal",
  "Telangana", "Rajasthan", "Tamil Nadu",
];

export const vendorListings: VendorListing[] = [
  { id: "vl-1", name: "Awadhi Royal Caterers", tiers: ["Gold", "Platinum"], rating: 4.9, reviews: 412, city: "Lucknow", state: "Uttar Pradesh", cuisines: ["Mughlai", "North Indian"], mealTypes: ["Lunch", "Dinner", "Main Course", "Live Counters", "Desserts"], diet: "Veg & Non-Veg", priceFrom: 1349, verified: true, image: img("photo-1555939594-58d7cb561ad1", 500) },
  { id: "vl-2", name: "Nawabi Dawat", tiers: ["Silver", "Gold"], rating: 4.8, reviews: 287, city: "Lucknow", state: "Uttar Pradesh", cuisines: ["North Indian", "Punjabi"], mealTypes: ["Dinner", "Main Course", "Starters", "Desserts"], diet: "Veg & Non-Veg", priceFrom: 1199, verified: true, image: img("photo-1556910103-1c02745aae4d", 500) },
  { id: "vl-3", name: "Dilli Darbar Caterers", tiers: ["Gold", "Platinum"], rating: 4.7, reviews: 233, city: "Delhi", state: "Delhi", cuisines: ["Mughlai", "Chinese"], mealTypes: ["Lunch", "Dinner", "Main Course", "Live Counters"], diet: "Veg & Non-Veg", priceFrom: 1250, verified: true, image: img("photo-1633945274405-b6c8069047b0", 500) },
  { id: "vl-4", name: "Marathi Mejwani", tiers: ["Silver"], rating: 4.6, reviews: 144, city: "Mumbai", state: "Maharashtra", cuisines: ["North Indian", "Continental"], mealTypes: ["Breakfast", "Lunch", "Main Course", "Desserts"], diet: "Veg", priceFrom: 999, verified: true, image: img("photo-1490645935967-10de6ba17061", 500) },
  { id: "vl-5", name: "Namma Ruchi Caterers", tiers: ["Silver", "Gold"], rating: 4.8, reviews: 201, city: "Bengaluru", state: "Karnataka", cuisines: ["South Indian", "Chinese"], mealTypes: ["Breakfast", "Lunch", "Dinner", "Live Counters"], diet: "Veg & Non-Veg", priceFrom: 1050, verified: true, image: img("photo-1630383249896-424e482df921", 500) },
  { id: "vl-6", name: "Bengal Bhoj", tiers: ["Gold", "Platinum"], rating: 4.9, reviews: 318, city: "Kolkata", state: "West Bengal", cuisines: ["Bengali", "Mughlai"], mealTypes: ["Lunch", "Dinner", "Main Course", "Desserts", "Live Counters"], diet: "Veg & Non-Veg", priceFrom: 1299, verified: true, image: img("photo-1565557623262-b51c2513a641", 500) },
  { id: "vl-7", name: "Nizami Daawat", tiers: ["Gold"], rating: 4.7, reviews: 176, city: "Hyderabad", state: "Telangana", cuisines: ["Mughlai", "South Indian"], mealTypes: ["Dinner", "Main Course", "Starters"], diet: "Non-Veg", priceFrom: 1180, verified: true, image: img("photo-1633945274405-b6c8069047b0", 500) },
  { id: "vl-8", name: "Rajwada Rasoi", tiers: ["Silver"], rating: 4.5, reviews: 98, city: "Jaipur", state: "Rajasthan", cuisines: ["North Indian", "Punjabi"], mealTypes: ["Lunch", "Main Course", "Desserts"], diet: "Veg", priceFrom: 949, verified: true, image: img("photo-1585937421612-70a008356fbe", 500) },
  { id: "vl-9", name: "Chettinad Feast Co.", tiers: ["Silver", "Gold"], rating: 4.8, reviews: 212, city: "Chennai", state: "Tamil Nadu", cuisines: ["South Indian"], mealTypes: ["Breakfast", "Lunch", "Dinner", "Main Course"], diet: "Veg & Non-Veg", priceFrom: 1090, verified: true, image: img("photo-1630383249896-424e482df921", 500) },
  { id: "vl-10", name: "Maratha Spice Caterers", tiers: ["Silver", "Gold"], rating: 4.6, reviews: 134, city: "Pune", state: "Maharashtra", cuisines: ["Continental", "Chinese"], mealTypes: ["Lunch", "Starters", "Main Course", "Live Counters"], diet: "Veg & Non-Veg", priceFrom: 1020, verified: false, image: img("photo-1414235077428-338989a2e8c0", 500) },
  { id: "vl-11", name: "Tandoor Tales", tiers: ["Silver"], rating: 4.5, reviews: 121, city: "Delhi", state: "Delhi", cuisines: ["Punjabi", "North Indian"], mealTypes: ["Dinner", "Starters", "Main Course"], diet: "Non-Veg", priceFrom: 899, verified: true, image: img("photo-1567188040759-fb8a883dc6d8", 500) },
  { id: "vl-12", name: "Sattvik Bhojan", tiers: ["Gold", "Platinum"], rating: 4.7, reviews: 167, city: "Lucknow", state: "Uttar Pradesh", cuisines: ["North Indian", "South Indian"], mealTypes: ["Breakfast", "Lunch", "Main Course", "Desserts"], diet: "Veg", priceFrom: 1100, verified: true, image: img("photo-1601050690597-df0568f70950", 500) },
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
  /** Transaction / reference ID of the online payment (UPI/QR), when the guest
   *  settled money at booking time. Absent for COD / "connect" (nothing paid). */
  paymentRef?: string;
  /** Referral code this feast was booked with (when a partner referred it). */
  referralCode?: string;
  /** Display name of the referring partner, resolved at booking time. */
  referrerName?: string;
  /** Which kind of partner referred it — "planner" | "individual". */
  referrerType?: string;
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
  titleHi: string;
  /** Short overline shown in the hover overlay (e.g. "Wedding · 500 pax"). */
  caption: string;
  captionHi: string;
  image: string;
}

export const galleryItems: GalleryItem[] = [
  { title: "Royal Wedding Feast", titleHi: "शाही शादी का भोज", caption: "Wedding · 500 pax", captionHi: "शादी · 500 लोग", image: img("photo-1414235077428-338989a2e8c0", 700) },
  { title: "Live Chaat Station", titleHi: "लाइव चाट स्टेशन", caption: "Street-food counter", captionHi: "स्ट्रीट-फ़ूड काउंटर", image: img("photo-1606491956689-2ea866880c84", 700) },
  { title: "Dum Biryani Handi", titleHi: "दम बिरयानी हांडी", caption: "Most loved · main", captionHi: "सबसे पसंदीदा · मेन", image: img("photo-1563379091339-03b21ab4a4f8", 700) },
  { title: "Mandap & Mehndi", titleHi: "मंडप और मेहंदी", caption: "Haldi · Mehndi", captionHi: "हल्दी · मेहंदी", image: img("photo-1546069901-ba9599a7e63c", 700) },
  { title: "Paneer Butter Masala", titleHi: "पनीर बटर मसाला", caption: "Bestseller · main", captionHi: "बेस्टसेलर · मेन", image: img("photo-1631452180519-c014fe946bc7", 700) },
  { title: "Corporate Gala", titleHi: "कॉर्पोरेट गाला", caption: "Corporate · 200 pax", captionHi: "कॉर्पोरेट · 200 लोग", image: img("photo-1517248135467-4c7edcad34c4", 700) },
  { title: "Gulab Jamun Tray", titleHi: "गुलाब जामुन ट्रे", caption: "Sweet pick · dessert", captionHi: "मिठाई · डेज़र्ट", image: img("photo-1601050690597-df0568f70950", 700) },
  { title: "Birthday Celebration", titleHi: "बर्थडे सेलिब्रेशन", caption: "Birthday · 80 pax", captionHi: "बर्थडे · 80 लोग", image: img("photo-1530103862676-de8c9debad1d", 700) },
  { title: "Reception Buffet", titleHi: "रिसेप्शन बुफ़े", caption: "Reception · 300 pax", captionHi: "रिसेप्शन · 300 लोग", image: img("photo-1565557623262-b51c2513a641", 700) },
  { title: "Butter Naan Basket", titleHi: "बटर नान बास्केट", caption: "Trending · breads", captionHi: "ट्रेंडिंग · ब्रेड", image: img("photo-1585937421612-70a008356fbe", 700) },
];
