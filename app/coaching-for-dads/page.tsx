import type { Metadata } from "next";
import { getLandingPage, landingPages, NON_CLINICAL_DISCLAIMER, EMERGENCY_DISCLAIMER } from "@/lib/landingPages";
import { site } from "@/lib/site";
import LandingPage from "@/components/landing/LandingPage";

const page = getLandingPage("coaching-for-dads")!;

export const metadata: Metadata = {
  title: { absolute: page.meta.title },
  description: page.meta.description,
  alternates: { canonical: `${site.url}/coaching-for-dads` },
  robots: { index: !page.noindex, follow: true },
  openGraph: {
    title: page.meta.ogTitle,
    description: page.meta.ogDescription,
    url: `${site.url}/coaching-for-dads`,
    type: "website",
    siteName: site.name,
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
  },
  other: {
    note: NON_CLINICAL_DISCLAIMER + " " + EMERGENCY_DISCLAIMER,
  },
};

export default function CoachingForDadsPage() {
  return <LandingPage page={landingPages["coaching-for-dads"]} />;
}
