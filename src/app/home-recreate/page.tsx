import PublicShell from "@/components/app/PublicShell";

import CampaignPopup from "@/components/CampaignPopup";
import Hero from "@/components/sections/Hero";
import PromoBanner from "@/components/sections/PromoBanner";
import ChooseOccasion from "@/components/sections/ChooseOccasion";
import TopCategories from "@/components/sections/TopCategories";
import ServiceCards from "@/components/sections/ServiceCards";
import Packages from "@/components/sections/Packages";
import GalleryCoverflow from "@/components/sections/GalleryCoverflow";
import BrandRibbon from "@/components/sections/BrandRibbon";
import Testimonials from "@/components/sections/Testimonials";
import PromoLeadCapture from "@/components/sections/PromoLeadCapture";

// Featured brands and reviews are hidden for now (not removed): flip to true
// to bring both back.
const SHOW_BRANDS_AND_REVIEWS = false;

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
    <PublicShell hero>
      <Hero trustBadges={false} />
      {/* Baina strip hidden here; three service cards take its place. */}
      <ServiceCards />
      <PromoBanner />
      <ChooseOccasion />
      <div className="home-band-cream">
        <TopCategories />
      </div>
      <Packages />
      <GalleryCoverflow />
      {SHOW_BRANDS_AND_REVIEWS && <BrandRibbon />}
      {SHOW_BRANDS_AND_REVIEWS && <Testimonials compact />}
      <PromoLeadCapture />
      <CampaignPopup />
    </PublicShell>
  );
}
