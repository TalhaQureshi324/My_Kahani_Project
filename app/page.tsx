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

const medicalBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  name: "True Self Me - Therapy & Counseling",
  image: `${site.url}/images/og-image.jpg`,
  url: site.url,
  telephone: "+1-512-555-0143",
  priceRange: "$30 - $185",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Austin",
    addressRegion: "TX",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 30.2672,
    longitude: -97.7431,
  },
  areaServed: {
    "@type": "City",
    name: "Austin",
  },
  sameAs: ["https://www.instagram.com", "https://www.linkedin.com"],
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalBusinessSchema) }}
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
