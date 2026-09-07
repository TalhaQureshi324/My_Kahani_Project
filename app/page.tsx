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
import TheDadBlockSection from "@/components/sections/TheDadBlockSection";
import ContactSection from "@/components/sections/ContactSection";
import { site } from "@/lib/site";

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "True Self Me Therapy & Counseling",
  image: `${site.url}/images/og-image.jpg`,
  description:
    "Professional therapy and counseling services for individuals, couples, families, and community support groups.",
  url: site.url,
  priceRange: "$30 - $185",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Austin",
    addressRegion: "TX",
    addressCountry: "US",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
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
      <TheDadBlockSection />
      <ContactSection />
    </>
  );
}
