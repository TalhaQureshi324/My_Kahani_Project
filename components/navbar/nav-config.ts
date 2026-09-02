import { program } from "@/lib/content";

export type NavChild = { label: string; href: string };
export type NavItem = { label: string; href: string; children?: NavChild[] };

export const mainNav: NavItem[] = [
  { label: "About", href: "/#about" },
  { label: "Meet Fahd", href: "/#meet-therapist" },
  { label: "Approach", href: "/#therapy-approach" },
  { label: "Services", href: "/#services" },
  { label: "Specialties", href: "/#specialties" },
  { label: "Pricing", href: "/#pricing" },
  {
    label: program.navLabel,
    href: "/the-dad-block",
    children: [
      { label: "Learn More", href: "/the-dad-block" },
      { label: "Events", href: "/the-dad-block/events" },
    ],
  },
];

export const cta = { label: "Work with me", href: "/#contact" };
