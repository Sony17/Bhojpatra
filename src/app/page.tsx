"use client";

import { useState } from "react";
import PublicShell from "@/components/app/PublicShell";
import CampaignPopup from "@/components/CampaignPopup";
import Hero from "@/components/sections/Hero";
import PromoBanner from "@/components/sections/PromoBanner";
import CustomCateringBanner from "@/components/sections/CustomCateringBanner";
import CustomCateringModal from "@/components/enquiry/CustomCateringModal";
import ChooseOccasion from "@/components/sections/ChooseOccasion";
import BainaBoxes from "@/components/sections/BainaBoxes";
import Gallery from "@/components/sections/Gallery";
import BrandRibbon from "@/components/sections/BrandRibbon";
import Testimonials from "@/components/sections/Testimonials";
import PromoLeadCapture from "@/components/sections/PromoLeadCapture";

/**
 * Conversion-first home funnel:
 * 1. Hero — location + book / find caterers (+ custom catering callout)
 * 2. Promo offer banner (art) — below the hero
 * 3. Custom Catering Banner — custom menu & budget brief submission
 * 4. Occasions → /book
 * 5. Baina → order path
 * 6. Gallery — real event snapshots
 * 7. Social proof
 * 8. Promo lead capture — post-testimonials
 */
export default function Home() {
  const [customEnquiryOpen, setCustomEnquiryOpen] = useState(false);

  return (
    <PublicShell hero>
      <Hero />
      <PromoBanner />
      <CustomCateringBanner onOpenModal={() => setCustomEnquiryOpen(true)} />
      <ChooseOccasion />
      <BainaBoxes />
      <div className="home-band-cream">
        <Gallery />
      </div>
      <BrandRibbon />
      <Testimonials />
      <PromoLeadCapture />
      <CampaignPopup />
      <CustomCateringModal
        open={customEnquiryOpen}
        onClose={() => setCustomEnquiryOpen(false)}
      />
    </PublicShell>
  );
}
