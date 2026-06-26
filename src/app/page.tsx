import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/sections/Hero";
import StatsBar from "@/components/sections/StatsBar";
import HowItWorks from "@/components/sections/HowItWorks";
import ChooseOccasion from "@/components/sections/ChooseOccasion";
import TopCategories from "@/components/sections/TopCategories";
import Packages from "@/components/sections/Packages";
import ChooseSpecialists from "@/components/sections/ChooseSpecialists";
import ReviewSelection from "@/components/sections/ReviewSelection";
import BookingForm from "@/components/sections/BookingForm";
import WhyChoose from "@/components/sections/WhyChoose";
import CtaBanner from "@/components/sections/CtaBanner";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <StatsBar />
        {/* Beige bands alternate (base ↔ deeper) so each section reads as a
            distinct zone flowing out of the hero — never white. The base
            tone comes from the page body; alt sections sit on a full-bleed
            deeper-beige band. */}
        <HowItWorks />
        <div className="bg-surface-beige-2">
          <TopCategories />
        </div>
        <ChooseOccasion />
        <div className="bg-surface-beige-2">
          <Packages />
        </div>
        <ChooseSpecialists />
        <div className="bg-surface-beige-2">
          <ReviewSelection />
        </div>
        <BookingForm />
        <WhyChoose />
        <CtaBanner />
      </main>
      <Footer />
    </>
  );
}
