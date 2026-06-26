import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import Hero from "@/components/sections/Hero";
import PlanningFor from "@/components/sections/PlanningFor";
import StatsBar from "@/components/sections/StatsBar";
import ChooseOccasion from "@/components/sections/ChooseOccasion";
import TopCategories from "@/components/sections/TopCategories";
import Packages from "@/components/sections/Packages";
import ChooseSpecialists from "@/components/sections/ChooseSpecialists";
import Gallery from "@/components/sections/Gallery";
import ReviewSelection from "@/components/sections/ReviewSelection";
import BookingForm from "@/components/sections/BookingForm";
import ContactUs from "@/components/sections/ContactUs";
import TaglineBanner from "@/components/sections/TaglineBanner";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <StatsBar />
        <PlanningFor />
        {/* Beige bands alternate (base ↔ deeper) so each section reads as a
            distinct zone flowing out of the hero — never white. The base
            tone comes from the page body; alt sections sit on a full-bleed
            deeper-beige band. */}
        <div className="bg-surface-beige-2">
          <TopCategories />
        </div>
        <ChooseOccasion />
        <div className="bg-surface-beige-2">
          <Packages />
        </div>
        <ChooseSpecialists />
        <Gallery />
        <div className="bg-surface-beige-2">
          <ReviewSelection />
        </div>
        <BookingForm />
        <div className="bg-surface-beige-2">
          <ContactUs />
        </div>
        <TaglineBanner />
      </main>
      <Footer />
      <FloatingChat />
    </>
  );
}
