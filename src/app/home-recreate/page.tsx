import PublicShell from "@/components/app/PublicShell";
import AdFooter from "@/components/AdFooter";
import Footer from "@/components/Footer";
import { navLinks } from "@/lib/data";

import CampaignPopup from "@/components/CampaignPopup";
import Hero from "@/components/sections/Hero";
import PromoBanner from "@/components/sections/PromoBanner";
import ChooseOccasion from "@/components/sections/ChooseOccasion";
import TopCategories from "@/components/sections/TopCategories";
import ServiceCards from "@/components/sections/ServiceCards";
import Packages from "@/components/sections/Packages";
import Gallery from "@/components/sections/Gallery";
import BrandRibbon from "@/components/sections/BrandRibbon";
import Testimonials from "@/components/sections/Testimonials";
import PromoLeadCapture from "@/components/sections/PromoLeadCapture";


// Full header nav for this page: every main section.
const partner = navLinks.find((l) => l.href === "/partner")!;
const headerLinks = [
  { label: "Feast Booking", labelHi: "भोज बुकिंग", href: "/book" },
  { label: "Venues", labelHi: "वेन्यू", href: "/venues" },
  { label: "Baina", labelHi: "बैना", href: "/baina-box" },
  // Partner menu: Caterers first, then short, plain role names.
  {
    ...partner,
    items: [
      { title: "Explore Caterers", titleHi: "कैटरर देखें", subtitle: "Browse and book", subtitleHi: "देखें और बुक करें", href: "/vendors", iconKey: "caterers" },
      { title: "Catering Vendor", titleHi: "कैटरिंग वेंडर", subtitle: "List your catering", subtitleHi: "अपनी कैटरिंग लिस्ट करें", href: "/vendor/register", iconKey: "vendor" },
      { title: "Venue Vendor", titleHi: "वेन्यू वेंडर", subtitle: "List your venue", subtitleHi: "अपना वेन्यू लिस्ट करें", href: "/signup?type=partner&role=venue", iconKey: "venue" },
      { title: "Event Planner", titleHi: "इवेंट प्लानर", subtitle: "Refer clients, earn", subtitleHi: "क्लाइंट रेफर करें, कमाएं", href: "/signup?type=partner&role=planner", iconKey: "planner" },
      { title: "Individual", titleHi: "व्यक्तिगत", subtitle: "Refer friends, earn", subtitleHi: "दोस्तों को रेफर करें, कमाएं", href: "/signup?type=partner&role=individual", iconKey: "individual" },
    ],
  },
];

/**
 * Conversion-first home funnel:
 * 1. Hero — location + book / find caterers
 * 2. Baina → order path (directly under the hero)
 * 3. Promo offer banner (art) — below Baina
 * 4. Occasions → /book
 * 5. Categories → /vendors
 * 6. Packages → Book opens Feast interest popup until 2027
 * 7. Social proof
 * 8. Promo lead capture — post-testimonials
 */
export default function HomeRecreate() {
  return (
    <PublicShell hero navLinks={headerLinks} footerNode={
        // Both footers for side-by-side review: new compact one first, then
        // the current site footer (it carries the phone tab-bar padding).
        <>
          <AdFooter />
          <Footer />
        </>
      }>
      <Hero navRow />
      {/* Baina strip hidden here; three service cards take its place. */}
      <ServiceCards />
      <PromoBanner />
      <ChooseOccasion />
      <div className="home-band-cream">
        <TopCategories />
      </div>
      <Packages />
      <div className="home-band-cream">
        <Gallery />
      </div>
      <BrandRibbon />
      <Testimonials />
      <PromoLeadCapture />
      <CampaignPopup />
    </PublicShell>
  );
}
