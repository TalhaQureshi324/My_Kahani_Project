# True Self Me — Therapy Practice Website

A Next.js (App Router) + TypeScript + Tailwind CSS v4 implementation of a
single-page therapy practice site with a community-program sub-section,
built to the architecture spec:

- Sticky global navbar with desktop dropdown ("The Fathers' Circle" →
  Learn More / Events), a mobile drill-down drawer ("Menu" ⇄ folder ⇄ back),
  and a persistent **Work with me** CTA.
- Editorial homepage front-half built to the section-by-section layout spec:
  split hero (copy + portrait, pill "Book your appointment" CTA), About with
  inset portrait and tucked line-art accent, mirrored About-continuation with
  CTA, the rust `#7B3B26` "Meet Your Therapist" compound grid (mustard
  `#D29B5A` patterned strip | bio | inset headshot), the gold `#B38200`
  pill-CTA conclusion block with the community-hands mark, and a full-bleed
  break banner (`next/image` fill + `object-cover`).
- Deep-linkable homepage sections with exact anchor IDs:
  `#hero`, `#about`, `#meet-therapist`, `#qualifications`, `#therapy-approach`,
  `#services`, `#location`, `#specialties`, `#pricing`, `#dad-block-summary`,
  `#contact`.
- Sub-pages: `/the-dad-block` (program overview + FAQ) and
  `/the-dad-block/events` (schedule + RSVP form).
- React Hook Form + Zod validation on the contact inquiry and RSVP forms.
- Footer with smooth-scroll back-to-top, location details, full nav
  directory, copyright, and credits.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Replacing the placeholder content

**All copy in this project is original placeholder text.** Nothing was
scraped or copied from any live website, and no third-party photography is
bundled. Before launch:

1. **Text** — every string lives in `lib/content.ts` (sections, services,
   specialties, pricing, FAQs, events) and `lib/site.ts` (name, address,
   phone, email, hours, copyright). Swap in your own content there.
2. **Photos** — drop real images into `/public/images` and replace the
   `<PhotoFrame>` placeholders (they mark the intended crop and tone).
3. **Colors & fonts** — design tokens are defined once in `app/globals.css`
   (`@theme` block: cream / terracotta / olive / night palette, Fraunces +
   DM Sans). Fonts are loaded in `app/layout.tsx`.
4. **Forms** — both forms currently simulate success client-side. Wire the
   `onSubmit` handlers in `components/sections/Contact.tsx` and
   `components/forms/RsvpForm.tsx` to an API route, Formspree, or your
   email relay.

## Project structure

```
app/
  layout.tsx                 # fonts, navbar, footer, smooth scroll
  page.tsx                   # homepage — composes all anchor sections
  the-dad-block/page.tsx     # program overview (Learn More)
  the-dad-block/events/page.tsx
components/
  navbar/                    # Navbar, MobileDrawer, nav-config
  sections/                  # Hero, About, ... Contact
  footer/Footer.tsx
  forms/RsvpForm.tsx
  ui/                        # doodle SVGs, Marquee, Button, headings
lib/
  content.ts                 # ALL placeholder copy in one place
  site.ts                    # practice name, contact details
```
