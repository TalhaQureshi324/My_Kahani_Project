import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import AboutContinued from "@/components/sections/AboutContinued";
import MeetTherapist from "@/components/sections/MeetTherapist";
import BioConclusion from "@/components/sections/BioConclusion";
import BreakBanner from "@/components/sections/BreakBanner";
import WhyWorkWithMe from "@/components/sections/WhyWorkWithMe";
import TherapyApproach from "@/components/sections/TherapyApproach";
import CounselingServices from "@/components/sections/CounselingServices";
import LocationBanner from "@/components/sections/LocationBanner";
import LocationMap from "@/components/sections/LocationMap";
import Specialties from "@/components/sections/Specialties";
import PotentialLimitlessBanner from "@/components/sections/PotentialLimitlessBanner";
import RightGuidance from "@/components/sections/RightGuidance";
import Pricing from "@/components/sections/Pricing";
import DadBlockSummary from "@/components/sections/DadBlockSummary";
import Contact from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Hero />
      <About />
      <AboutContinued />
      <MeetTherapist />
      <BioConclusion />
      <BreakBanner />
      <WhyWorkWithMe />
      <TherapyApproach />
      <CounselingServices />
      <LocationBanner />
      <LocationMap />
      <Specialties />
      <PotentialLimitlessBanner />
      <RightGuidance />
      <Pricing />
      <DadBlockSummary />
      <Contact />
    </>
  );
}
