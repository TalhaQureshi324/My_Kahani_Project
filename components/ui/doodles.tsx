/**
 * Original, hand-drawn-style decorative SVGs.
 * These are drawn from scratch for this project — not extracted
 * from any external site. Tweak colors via the `className` prop.
 */

type DoodleProps = { className?: string };

export function BlockMark({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="7" y="7" width="34" height="34" rx="8" fill="#bc5b34" />
      <rect x="17" y="17" width="14" height="14" rx="4" fill="#f7f1e6" />
    </svg>
  );
}

export function SmileyDoodle({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="16" />
      <circle cx="18.5" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="29.5" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <path d="M16.5 28c2.6 3.6 12.4 3.6 15 0" />
    </svg>
  );
}

export function HeartArrowDoodle({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M24 39C12 30.5 8 21.5 13.5 15c3.4-4 9.5-2.4 10.5 2.4C25 12.6 31.1 11 34.5 15 40 21.5 36 30.5 24 39Z" />
      <path d="M10 38 38 10" opacity="0.55" />
      <path d="M38 10h-9M38 10v9" opacity="0.55" />
    </svg>
  );
}

export function PeaceDoodle({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="16" />
      <path d="M24 8v32M24 24l-11 11M24 24l11 11" />
    </svg>
  );
}

export function SquiggleDoodle({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 48 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 14c5-10 9 8 14-2s9 8 14-2 8 6 14-1" />
    </svg>
  );
}

export function SparkleDoodle({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        d="M24 5l3.2 15.8L43 24l-15.8 3.2L24 43l-3.2-15.8L5 24l15.8-3.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ── Service line icons ─────────────────────────────────────── */

export function IconPerson({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="16" r="7" />
      <path d="M11 40c2-9 7-13 13-13s11 4 13 13" />
    </svg>
  );
}

export function IconRings({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      className={className}
      aria-hidden="true"
    >
      <circle cx="18" cy="24" r="11" />
      <circle cx="30" cy="24" r="11" />
    </svg>
  );
}

export function IconFamily({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="14" cy="21" r="6" />
      <circle cx="34" cy="21" r="6" />
      <circle cx="24" cy="11" r="4.5" />
      <path d="M4 40c1.5-6 5-9 10-9s8.5 3 10 9" />
      <path d="M24 40c1.5-6 5-9 10-9s8.5 3 10 9" opacity="0.7" />
    </svg>
  );
}

export function IconGroup({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="15" strokeDasharray="4 5" />
      <circle cx="24" cy="9" r="3" fill="currentColor" stroke="none" />
      <circle cx="37" cy="16.5" r="3" fill="currentColor" stroke="none" />
      <circle cx="37" cy="31.5" r="3" fill="currentColor" stroke="none" />
      <circle cx="24" cy="39" r="3" fill="currentColor" stroke="none" />
      <circle cx="11" cy="31.5" r="3" fill="currentColor" stroke="none" />
      <circle cx="11" cy="16.5" r="3" fill="currentColor" stroke="none" />
      <circle cx="24" cy="24" r="4" />
    </svg>
  );
}

export function IconCompass({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="16" />
      <path d="M24 13l4.5 14.5L24 25l-4.5 2.5Z" fill="currentColor" />
      <path d="M24 5v3M24 40v3M5 24h3M40 24h3" strokeLinecap="round" />
    </svg>
  );
}

export const serviceIcons: Record<string, (p: DoodleProps) => React.ReactElement> = {
  person: IconPerson,
  rings: IconRings,
  family: IconFamily,
  group: IconGroup,
  compass: IconCompass,
};

/* ── Rust-section artwork (all drawn from scratch) ──────────── */

/** Repeating diamond/zigzag line pattern for the mustard strip. */
export function GeometricPattern({ className }: DoodleProps) {
  return (
    <svg className={className} aria-hidden="true">
      <defs>
        <pattern
          id="geo-diamonds"
          width="96"
          height="96"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M48 10 L86 48 L48 86 L10 48 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <path
            d="M48 30 L66 48 L48 66 L30 48 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M48 46 L58 56 M48 46 L38 56"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M0 48h10M86 48h10M48 0v10M48 86v10"
            stroke="currentColor"
            strokeWidth="2"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#geo-diamonds)" />
    </svg>
  );
}

/** Abstract "hands gripping" community mark — four arms meeting at a center. */
export function CommunityHands({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 86C26 70 34 62 44 52" />
      <path d="M86 86C70 70 62 62 52 52" />
      <path d="M10 10c16 16 24 24 34 34" />
      <path d="M86 10C70 26 62 34 52 44" />
      <circle cx="48" cy="48" r="9" strokeWidth="2.5" />
      <path d="M20 76l8-8M76 76l-8-8M20 20l8 8M76 20l-8 8" strokeWidth="2" />
    </svg>
  );
}

/** Loose line-art corner spray used to tuck behind inset portraits. */
export function CornerAccent({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M116 4C74 10 44 34 30 74" />
      <path d="M116 26C86 32 64 50 52 82" />
      <path d="M116 48C96 54 82 66 74 90" />
      <path d="M30 74l-8 16M52 82l-4 18M74 90l2 18" strokeWidth="2" />
      <circle cx="116" cy="4" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Boho overlapping-arc line pattern for the approach section backdrop. */
export function OverlapPattern({ className }: DoodleProps) {
  return (
    <svg className={className} aria-hidden="true">
      <defs>
        <pattern
          id="overlap-arcs"
          width="96"
          height="64"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 32a24 24 0 0 1 48 0 24 24 0 0 1 48 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M-24 64a24 24 0 0 1 48 0 24 24 0 0 1 48 0 24 24 0 0 1 48 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M-24 0a24 24 0 0 0 48 0 24 24 0 0 0 48 0 24 24 0 0 0 48 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#overlap-arcs)" />
    </svg>
  );
}
