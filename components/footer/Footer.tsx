import Link from "next/link";
import Image from "next/image";
import { ArrowUp, Mail, MapPin, Phone } from "lucide-react";
import { SquiggleDoodle } from "@/components/ui/doodles";
import { mainNav } from "@/components/navbar/nav-config";
import { site } from "@/lib/site";
import { program } from "@/lib/content";

export default function Footer() {
  const year = 2026;
  return (
    <footer className="bg-night text-cream">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand + location */}
          <div>
            <Image
              src="/images/true_self_me_footer_logo_cream.png"
              alt={site.name}
              width={1203}
              height={951}
              sizes="160px"
              className="h-28 w-auto md:h-32"
            />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-cream/70">
              Counseling and community for every chapter of your story — in
              person in Austin and virtually across Texas.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-cream/70">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-terracotta-tint" aria-hidden="true" />
                <span>
                  {site.addressLines[0]}
                  <br />
                  {site.addressLines[1]}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-terracotta-tint" aria-hidden="true" />
                <a href={site.phoneHref} className="transition-colors hover:text-cream">
                  {site.phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-terracotta-tint" aria-hidden="true" />
                <a href={`mailto:${site.email}`} className="transition-colors hover:text-cream">
                  {site.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Explore */}
          <nav aria-label="Footer — explore">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cream/50">
              Explore
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              {mainNav.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-cream/75 transition-colors hover:text-terracotta-tint"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Programs */}
          <nav aria-label="Footer — programs">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cream/50">
              Programs
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <Link href="/the-dad-block" className="text-cream/75 transition-colors hover:text-terracotta-tint">
                  {program.name} · Learn More
                </Link>
              </li>
              <li>
                <Link href="/the-dad-block/events" className="text-cream/75 transition-colors hover:text-terracotta-tint">
                  {program.name} · Events
                </Link>
              </li>
              <li>
                <Link href="/#services" className="text-cream/75 transition-colors hover:text-terracotta-tint">
                  Group therapy cohorts
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="text-cream/75 transition-colors hover:text-terracotta-tint">
                  Sliding scale
                </Link>
              </li>
            </ul>
          </nav>

          {/* Back to top */}
          <div className="flex flex-col items-start gap-6">
            <a
              href="#top"
              className="group inline-flex items-center gap-3 rounded-full border border-cream/20 px-5 py-3 text-sm font-bold transition-colors hover:border-terracotta-tint hover:text-terracotta-tint"
              aria-label="Back to top"
            >
              Back to top
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cream/10 transition-transform duration-300 group-hover:-translate-y-1">
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </span>
            </a>
            <SquiggleDoodle className="h-6 w-28 text-terracotta-tint/60" />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-cream/10 pt-8 text-xs text-cream/55 sm:flex-row">
          <p>
            © {year} {site.copyrightName}. All rights reserved.
          </p>
          <p>
            {site.credits} ·{" "}
            <Link href="/#contact" className="underline-offset-4 hover:text-cream hover:underline">
              Questions about this site?
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
