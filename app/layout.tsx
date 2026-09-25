import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";
import BookingProvider from "@/components/booking/BookingProvider";
import AttributionCapture from "@/components/tracking/AttributionCapture";
import GAScript from "@/components/analytics/GAScript";
import FloatingBookingButton from "@/components/booking/FloatingBookingButton";
import EngagementTracker from "@/components/analytics/EngagementTracker";
import { site } from "@/lib/site";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const sans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "True Self Me | Coaching & Mentorship Across the US",
    template: "%s | True Self Me",
  },
  description:
    "Grounded, authentic coaching and mentorship for individuals, couples, and dads across the United States — support to find steadiness, clarity, and purpose.",
  keywords: [
    "Personal Coaching",
    "Professional Coaching",
    "Coaching for Dads",
    "Men's Coaching",
    "Relationship & Couples Coaching",
    "Career Coaching",
    "Life Transition Coaching",
    "The Dad Block",
    "True Self Me",
  ],
  authors: [{ name: "True Self Me" }],
  creator: "True Self Me",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: site.url,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: site.url,
    siteName: "True Self Me",
    title: "True Self Me | Coaching & Mentorship Across the US",
    description:
      "A grounded, pressure-free space for personal and professional coaching — virtual sessions across the United States.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "True Self Me - Coaching & Mentorship",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "True Self Me | Coaching & Mentorship",
    description: "Coaching for individuals, couples, and dads across the United States.",
    images: ["/og-image.jpg"],
  },
  other: {
    "geo.region": "US-TX",
    "geo.placename": "Austin",
    "geo.position": "30.2672;-97.7431",
    ICBM: "30.2672, -97.7431",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#5D1F13",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-cream font-sans text-ink">
        <GAScript />
        <AttributionCapture />
        <EngagementTracker />
        <BookingProvider>
          <Navbar />
          <main id="top" className="flex-1">
            {children}
          </main>
          <Footer />
          <FloatingBookingButton />
        </BookingProvider>
      </body>
    </html>
  );
}
