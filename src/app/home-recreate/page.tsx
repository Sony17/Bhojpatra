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
      <Hero trustBadges={false} cta={{ en: "Plan your feast", hi: "अपना भोज प्लान करें" }} />
      {/* Baina strip hidden here; three service cards take its place. */}
      <ServiceCards />
      <PromoBanner />
      <ChooseOccasion
        tiles
        title={{ en: "Every Occasion, Beautifully Served.", hi: "हर मौका, खूबसूरती से परोसा गया।" }}
        subtitle={{
          en: "From intimate family gatherings to grand celebrations, discover curated catering, live food stalls and memorable dining experiences.",
          hi: "छोटी पारिवारिक महफ़िलों से भव्य उत्सवों तक, चुनी हुई कैटरिंग, लाइव फूड स्टॉल और यादगार खाने के अनुभव खोजें।",
        }}
      />
      <div className="home-band-cream">
        <TopCategories tiles />
      </div>
      <Packages compactSubtitle />
      <GalleryCoverflow />
      {SHOW_BRANDS_AND_REVIEWS && <BrandRibbon />}
      {SHOW_BRANDS_AND_REVIEWS && <Testimonials compact />}
      <PromoLeadCapture />
      <CampaignPopup />
    </PublicShell>
  );
}
