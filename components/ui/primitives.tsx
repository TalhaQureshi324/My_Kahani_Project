import Link from "next/link";
import type { ReactNode } from "react";

/* ── Button / CTAs ──────────────────────────────────────────── */

type ButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "outline" | "night" | "cream" | "gold";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold tracking-wide transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta disabled:opacity-60";

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-terracotta text-cream shadow-[0_6px_20px_-8px_rgba(152,67,31,0.7)] hover:-translate-y-0.5 hover:bg-terracotta-deep",
  outline:
    "border-2 border-ink/70 text-ink hover:-translate-y-0.5 hover:border-terracotta hover:text-terracotta",
  night:
    "bg-night text-cream hover:-translate-y-0.5 hover:bg-night-2",
  cream:
    "bg-cream text-ink hover:-translate-y-0.5 hover:bg-cream-dark",
  gold:
    "bg-gold text-creamwarm border border-creamwarm/70 hover:-translate-y-0.5 hover:bg-gold/90",
};

export function Button({
  children,
  href,
  variant = "primary",
  className = "",
  type = "button",
  disabled,
}: ButtonProps) {
  const cls = `${base} ${variants[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} disabled={disabled}>
      {children}
    </button>
  );
}

/* ── Section heading ────────────────────────────────────────── */

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  dark = false,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  align?: "left" | "center";
  dark?: boolean;
}) {
  return (
    <div
      className={`max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-[0.22em] ${
          dark ? "text-terracotta-tint" : "text-terracotta"
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`mt-3 font-display text-4xl leading-[1.08] font-semibold text-balance sm:text-5xl ${
          dark ? "text-cream" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {lede ? (
        <p
          className={`mt-5 text-base leading-relaxed sm:text-lg ${
            dark ? "text-cream/70" : "text-ink-soft"
          }`}
        >
          {lede}
        </p>
      ) : null}
    </div>
  );
}

/* ── Photo placeholder ──────────────────────────────────────── */

export function PhotoFrame({
  label,
  className = "",
  tone = "cream",
}: {
  label: string;
  className?: string;
  tone?: "cream" | "dark" | "terracotta";
}) {
  const tones = {
    cream: "bg-cream-dark text-ink-soft border-ink/10",
    dark: "bg-night-2 text-cream/60 border-cream/10",
    terracotta: "bg-terracotta text-cream/80 border-cream/20",
  };
  return (
    <div
      className={`relative flex aspect-[4/5] flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border-2 border-dashed p-6 text-center ${tones[tone]} ${className}`}
    >
      <svg
        viewBox="0 0 48 48"
        className="h-10 w-10 opacity-60"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <rect x="7" y="10" width="34" height="28" rx="4" />
        <circle cx="19" cy="21" r="3.4" />
        <path d="M11 34l8-7 6 5 5-4 7 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="max-w-[24ch] text-xs leading-relaxed tracking-wide uppercase">
        {label}
      </p>
    </div>
  );
}
