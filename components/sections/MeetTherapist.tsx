import { BadgeCheck } from "lucide-react";
import { PhotoFrame } from "@/components/ui/primitives";
import { GeometricPattern } from "@/components/ui/doodles";
import { therapist } from "@/lib/content";

/**
 * Section 4 — Meet Your Therapist: rust compound grid —
 * [patterned mustard strip | editorial bio | inset portrait].
 */
export default function MeetTherapist() {
  return (
    <section
      id="meet-therapist"
      className="scroll-mt-24 bg-rust text-creamwarm"
    >
      <div className="mx-auto grid max-w-7xl lg:grid-cols-[96px_minmax(0,1fr)_minmax(300px,400px)]">
        {/* Graphic strip */}
        <div
          className="relative hidden min-h-[480px] overflow-hidden bg-mustard lg:block"
          aria-hidden="true"
        >
          <GeometricPattern className="absolute inset-0 h-full w-full text-cocoa" />
        </div>

        {/* Bio */}
        <div className="px-5 py-16 sm:px-10 lg:px-14 lg:py-24">
          <h2 className="font-display text-4xl font-semibold tracking-wide uppercase sm:text-5xl">
            {therapist.heading}
          </h2>
          <div className="mt-6 space-y-1.5">
            <p className="flex items-center gap-2 text-lg font-bold text-creamwarm">
              <BadgeCheck className="h-5 w-5 text-mustard" aria-hidden="true" />
              {therapist.name}, {therapist.credential}
            </p>
            <p className="text-sm tracking-wide text-creamwarm/75">
              {therapist.supervisorLine}
            </p>
          </div>

          <div className="mt-8 max-w-2xl space-y-5 text-base leading-relaxed text-creamwarm/85 sm:text-lg">
            {therapist.paragraphs.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>

          <p className="mt-9 max-w-2xl font-display text-2xl leading-snug font-semibold text-balance sm:text-3xl">
            “{therapist.quote}”
          </p>
        </div>

        {/* Portrait — inset, never flush to section edges */}
        <div className="flex items-center px-8 py-12 sm:px-12 lg:py-24 lg:pr-14">
          <PhotoFrame
            label={therapist.photoLabel}
            tone="dark"
            className="w-full aspect-[4/5] shadow-[0_30px_60px_-25px_rgba(0,0,0,0.55)]"
          />
        </div>
      </div>
    </section>
  );
}
