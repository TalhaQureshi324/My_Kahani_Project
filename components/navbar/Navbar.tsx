"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronDown, Menu } from "lucide-react";
import { cta, mainNav } from "./nav-config";
import { site } from "@/lib/site";
import MobileDrawer from "./MobileDrawer";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-ink/10 bg-cream/90 shadow-[0_8px_30px_-18px_rgba(38,33,24,0.35)] backdrop-blur-md"
            : "border-b border-transparent bg-cream"
        }`}
      >
        <nav
          className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-6 px-5 sm:px-8"
          aria-label="Main navigation"
        >
          {/* Brand */}
          <Link
            href="/"
            className="group flex shrink-0 items-center"
            aria-label={`${site.name} — home`}
          >
            <Image
              src="/images/true_self_me_logo_header.png"
              alt={site.name}
              width={1117}
              height={356}
              priority
              sizes="(min-width: 1024px) 220px, 160px"
              className="h-10 w-auto sm:h-11 lg:h-12"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 lg:flex">
            {mainNav.map((item) =>
              item.children ? (
                <div key={item.label} className="group relative">
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-cream-dark group-hover:text-terracotta"
                    aria-haspopup="true"
                  >
                    {item.label}
                    <ChevronDown
                      className="h-4 w-4 transition-transform duration-200 group-hover:rotate-180"
                      aria-hidden="true"
                    />
                  </button>
                  <div className="invisible absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 translate-y-2 pt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-paper p-2 shadow-[0_20px_50px_-20px_rgba(38,33,24,0.45)]">
                      {item.children.map((child) => (
                        <Link
                          key={child.label}
                          href={child.href}
                          className="block rounded-xl px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-cream-dark hover:text-terracotta"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-full px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-cream-dark hover:text-terracotta"
                >
                  {item.label}
                </Link>
              )
            )}
          </div>

          {/* CTA + hamburger */}
          <div className="flex items-center gap-3">
            <Link
              href={cta.href}
              className="hidden rounded-full bg-terracotta px-5 py-2.5 text-sm font-bold tracking-wide text-cream shadow-[0_6px_20px_-8px_rgba(152,67,31,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-terracotta-deep sm:inline-flex"
            >
              {cta.label}
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 text-ink transition-colors hover:bg-cream-dark lg:hidden"
              aria-label="Open menu"
              aria-expanded={drawerOpen}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </nav>
      </header>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
