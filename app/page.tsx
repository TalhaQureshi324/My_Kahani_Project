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
  description:
    "Professional virtual therapy and counseling services for individuals, couples, families, and community support groups across the United States.",
  image: `${site.url}/og-image.jpg`,
  url: site.url,
  telephone: "+1-512-555-0143",
  priceRange: "$30 - $185",
  medicalSpecialty: [
    "Psychotherapy",
    "Counseling",
    "Individual Therapy",
    "Couples Therapy",
    "Family Therapy",
  ],
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
    "@type": "Country",
    name: "United States",
  },
  founder: {
    "@type": "Person",
    name: "Fahd Alam",
    jobTitle: "Therapeutic Counsellor (CPCAB-trained)",
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

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How much do therapy sessions cost at True Self Me?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Individual therapy is $125 per session, couples and family therapy are $185 per session, and group therapy ranges from $30 to $60. Limited sliding-scale spots are also available.",
      },
    },
    {
      "@type": "Question",
      name: "Do you offer online therapy?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — True Self Me is a fully virtual practice providing secure telehealth appointments to clients across the United States.",
      },
    },
    {
      "@type": "Question",
      name: "What is The Dad Block?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The Dad Block is a community group offering a grounded, pressure-free environment for fathers to connect, build genuine relationships, and navigate parenting together.",
      },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
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
