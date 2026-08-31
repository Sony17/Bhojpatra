import PublicShell from "@/components/app/PublicShell";
import CampaignPopup from "@/components/CampaignPopup";
import Hero from "@/components/sections/Hero";
import PromoBanner from "@/components/sections/PromoBanner";
import ChooseOccasion from "@/components/sections/ChooseOccasion";
import TopCategories from "@/components/sections/TopCategories";
import BainaBoxes from "@/components/sections/BainaBoxes";
import Gallery from "@/components/sections/Gallery";
import BrandRibbon from "@/components/sections/BrandRibbon";
import Testimonials from "@/components/sections/Testimonials";
import PromoLeadCapture from "@/components/sections/PromoLeadCapture";

/**
 * Conversion-first home funnel:
 * 1. Hero — location + book / find caterers
 * 2. Promo offer banner (art) — below the hero
 * 3. Occasions → /book
 * 4. Categories → /vendors
 * 5. Packages → book
 * 6. Baina → order path
 * 7. Social proof
 * 8. Promo lead capture — post-testimonials
 */
export default function Home() {
  return (
    <PublicShell hero>
      <Hero />
      <PromoBanner />
      <ChooseOccasion />
      <div className="home-band-cream">
        <TopCategories />
      </div>
      <BainaBoxes />
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
