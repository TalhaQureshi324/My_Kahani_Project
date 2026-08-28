"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronRight, X } from "lucide-react";
import { BlockMark } from "@/components/ui/doodles";
import { cta, mainNav, type NavItem } from "./nav-config";
import { site } from "@/lib/site";

/**
 * Full-screen mobile drawer with drill-down navigation:
 * "Menu" root view → tapping a folder shows its submenu with a
 * back button returning to the root list.
 */
export default function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [folder, setFolder] = useState<NavItem | null>(null);

  // Lock body scroll + close on Escape while the drawer is open.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (folder) setFolder(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, folder, onClose]);

  // Reset the drill-down whenever the drawer closes.
  useEffect(() => {
    if (!open) setFolder(null);
  }, [open]);

  return (
    <div
      className={`fixed inset-0 z-[60] overflow-hidden lg:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
      inert={!open}
    >
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close menu"
        onClick={onClose}
        className={`absolute inset-0 bg-night/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-cream shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        {/* Header — shows "Menu" at root, or the folder name + back in a folder */}
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-ink/10 px-5">
          {folder ? (
            <button
              type="button"
              onClick={() => setFolder(null)}
              className="flex items-center gap-2 text-sm font-bold tracking-wide text-terracotta"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Menu
            </button>
          ) : (
            <span className="flex items-center gap-3">
              <BlockMark className="h-8 w-8" />
              <span className="font-display text-lg font-semibold">
                {site.name}
              </span>
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 transition-colors hover:bg-cream-dark"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-6">
          {folder ? (
            <>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-ink-soft">
                Folder: {folder.label}
              </p>
              <ul className="space-y-1">
                <li>
                  <DrawerLink
                    href={folder.href}
                    label={`${folder.label} — overview`}
                    onClick={onClose}
                  />
                </li>
                {folder.children?.map((child) => (
                  <li key={child.label}>
                    <DrawerLink
                      href={child.href}
                      label={child.label}
                      onClick={onClose}
                    />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <ul className="space-y-1">
              {mainNav.map((item) =>
                item.children ? (
                  <li key={item.label}>
                    <button
                      type="button"
                      onClick={() => setFolder(item)}
                      className="flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left font-display text-lg font-medium transition-colors hover:bg-cream-dark"
                      aria-haspopup="true"
                    >
                      {item.label}
                      <ChevronRight
                        className="h-5 w-5 text-terracotta"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ) : (
                  <li key={item.label}>
                    <DrawerLink
                      href={item.href}
                      label={item.label}
                      onClick={onClose}
                      large
                    />
                  </li>
                )
              )}
            </ul>
          )}
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 border-t border-ink/10 p-5">
          <Link
            href={cta.href}
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-terracotta px-6 py-3.5 text-sm font-bold tracking-wide text-cream transition-colors hover:bg-terracotta-deep"
          >
            {cta.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <p className="mt-3 text-center text-xs text-ink-soft">
            {site.city} · Virtual across Texas
          </p>
        </div>
      </div>
    </div>
  );
}

function DrawerLink({
  href,
  label,
  onClick,
  large = false,
}: {
  href: string;
  label: string;
  onClick: () => void;
  large?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center justify-between rounded-2xl px-4 transition-colors hover:bg-cream-dark ${
        large ? "py-4 font-display text-lg font-medium" : "py-3.5 text-base"
      }`}
    >
      {label}
      {large ? (
        <ChevronRight className="h-5 w-5 text-terracotta" aria-hidden="true" />
      ) : (
        <ArrowRight className="h-4 w-4 text-terracotta" aria-hidden="true" />
      )}
    </Link>
  );
}
