import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import AboutContinued from "@/components/sections/AboutContinued";
import MeetTherapist from "@/components/sections/MeetTherapist";
import BioConclusion from "@/components/sections/BioConclusion";
import BreakBanner from "@/components/sections/BreakBanner";
import WhyWorkWithMe from "@/components/sections/WhyWorkWithMe";
import TherapyApproach from "@/components/sections/TherapyApproach";
import Services from "@/components/sections/Services";
import Location from "@/components/sections/Location";
import Specialties from "@/components/sections/Specialties";
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
      <Services />
      <Location />
      <Specialties />
      <Pricing />
      <DadBlockSummary />
      <Contact />
    </>
  );
}
