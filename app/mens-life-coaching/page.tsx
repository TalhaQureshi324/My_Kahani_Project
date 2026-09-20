import type { Metadata } from "next";
import { getLandingPage, landingPages, NON_CLINICAL_DISCLAIMER, EMERGENCY_DISCLAIMER } from "@/lib/landingPages";
import { site } from "@/lib/site";
import LandingPage from "@/components/landing/LandingPage";

/**
 * Prepared draft (Phase 9): renders fully but is excluded from search
 * indexing and the sitemap until this audience goes live. To launch:
 * remove `noindex: true` from lib/landingPages.ts.
 */
const page = getLandingPage("mens-life-coaching")!;

export const metadata: Metadata = {
  title: page.meta.title,
  description: page.meta.description,
  alternates: { canonical: `${site.url}/mens-life-coaching` },
  robots: { index: false, follow: false },
  openGraph: {
    title: page.meta.ogTitle,
    description: page.meta.ogDescription,
    url: `${site.url}/mens-life-coaching`,
    type: "website",
    siteName: site.name,
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
  },
  other: {
    note: NON_CLINICAL_DISCLAIMER + " " + EMERGENCY_DISCLAIMER,
  },
};

export default function MensLifeCoachingPage() {
  return <LandingPage page={landingPages["mens-life-coaching"]} />;
}
