// import { program } from "@/lib/content"; // Dad Block pause — restore with the entry below

export type NavChild = { label: string; href: string; ariaLabel?: string };
export type NavItem = { label: string; href: string; children?: NavChild[] };

export const mainNav: NavItem[] = [
  { label: "About", href: "/#about" },
  { label: "Meet Fahd", href: "/#meet-fahd" },
  { label: "Approach", href: "/#approach" },
  { label: "Services", href: "/#services" },
  { label: "Specialties", href: "/#specialties" },
  { label: "Pricing", href: "/#pricing" },
  // Temporarily disabled (Dad Block pause) — restore to re-link:
  // {
  //   label: program.navLabel,
  //   href: "/the-dad-block",
  //   children: [
  //     { label: "Learn More", href: "/the-dad-block" },
  //     { label: "Events", href: "/the-dad-block/events" },
  //   ],
  // },
  { label: "Book", href: "/book" },
];

export const cta = { label: "Work with me", href: "/#contact" };
