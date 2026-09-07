import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";
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
    default: "True Self Me | Therapy & Counseling in Austin, TX",
    template: "%s | True Self Me",
  },
  description:
    "Grounded, authentic therapy and counseling for individuals, teens, couples, and dads. Professional support to help you find steadiness, clarity, and purpose.",
  keywords: [
    "Austin Therapy",
    "Therapy for Dads",
    "Men's Mental Health",
    "Couples Therapy",
    "Individual Counseling",
    "The Dad Block",
    "Sliding Scale Therapy Austin",
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
    title: "True Self Me | Therapy & Counseling in Austin, TX",
    description:
      "Grounded therapy for individuals, couples, and dads. Schedule your consultation today.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "True Self Me - Therapy & Counseling",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "True Self Me | Therapy & Counseling",
    description: "Grounded therapy for individuals, couples, and dads in Austin, TX.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-cream font-sans text-ink">
        <Navbar />
        <main id="top" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
