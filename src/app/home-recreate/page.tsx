import PublicShell from "@/components/app/PublicShell";
import AdFooter from "@/components/AdFooter";
import Footer from "@/components/Footer";
import { navLinks } from "@/lib/data";

// Full header nav for this page: every main section, in booking order.
const partner = navLinks.find((l) => l.href === "/partner")!;
const headerLinks = [
  { label: "Feast Booking", labelHi: "भोज बुकिंग", href: "/book" },
  { label: "Caterers", labelHi: "कैटरर", href: "/vendors" },
  { label: "Venues", labelHi: "वेन्यू", href: "/venues" },
  { label: "Baina", labelHi: "बैना", href: "/baina-box" },
  partner,
];
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
