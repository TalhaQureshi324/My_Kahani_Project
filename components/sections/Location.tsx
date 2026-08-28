import { Clock, MapPin, Video } from "lucide-react";
import { SectionHeading } from "@/components/ui/primitives";
import { PeaceDoodle } from "@/components/ui/doodles";
import { site } from "@/lib/site";
import { locationCopy } from "@/lib/content";

export default function Location() {
  return (
    <section id="location" className="scroll-mt-24 border-t border-ink/10">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
        <div>
          <SectionHeading
            eyebrow={locationCopy.eyebrow}
            title={locationCopy.title}
          />
          <ul className="mt-8 space-y-6 text-base">
            <li className="flex items-start gap-4">
              <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <p className="font-bold">{site.addressLines[0]}</p>
                <p className="text-ink-soft">{site.addressLines[1]}</p>
                <p className="mt-1 text-sm text-ink-soft">{locationCopy.parking}</p>
              </span>
            </li>
            <li className="flex items-start gap-4">
              <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-olive/15 text-olive">
                <Video className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <p className="font-bold">{site.virtual}</p>
                <p className="text-ink-soft">{locationCopy.virtualNote}</p>
              </span>
            </li>
            <li className="flex items-start gap-4">
              <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
                <Clock className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <p className="font-bold">{site.hours}</p>
                <p className="text-ink-soft">{locationCopy.hoursNote}</p>
              </span>
            </li>
          </ul>
        </div>

        {/* Stylized map placeholder */}
        <div className="relative">
          <div className="relative overflow-hidden rounded-[2rem] border border-ink/10 bg-cream-dark">
            <svg
              viewBox="0 0 400 300"
              className="h-full w-full"
              role="img"
              aria-label="Stylized map placeholder — replace with an embedded map of your office location"
            >
              <rect width="400" height="300" fill="#e9dfc9" />
              <path d="M0 80 C90 60 140 120 220 100 S340 40 400 70" stroke="#f7f1e6" strokeWidth="14" fill="none" />
              <path d="M60 0 C80 90 40 180 80 300" stroke="#f7f1e6" strokeWidth="10" fill="none" />
              <path d="M0 200 C120 180 260 240 400 210" stroke="#f7f1e6" strokeWidth="12" fill="none" />
              <path d="M280 0 C300 100 260 200 300 300" stroke="#f7f1e6" strokeWidth="8" fill="none" />
              <circle cx="200" cy="150" r="46" fill="#bc5b34" opacity="0.14" />
              <circle cx="200" cy="150" r="26" fill="#bc5b34" opacity="0.25" />
              <path d="M200 118 a20 20 0 0 1 20 20 c0 15 -20 34 -20 34 s-20 -19 -20 -34 a20 20 0 0 1 20 -20 Z" fill="#98431f" />
              <circle cx="200" cy="139" r="7" fill="#f7f1e6" />
              <text x="200" y="205" textAnchor="middle" fontFamily="Georgia, serif" fontSize="16" fill="#262118" fontStyle="italic">
                {site.city}
              </text>
            </svg>
          </div>
          <PeaceDoodle className="absolute -top-5 -left-4 h-12 w-12 animate-float text-olive" />
        </div>
      </div>
    </section>
  );
}
