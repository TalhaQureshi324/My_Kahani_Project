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

## Card-on-file booking (Authorize.Net)

The `/book` page and the homepage booking drawer vault a card on file via
Authorize.net Accept.js — the card is tokenized in the browser and our server
only ever receives an opaque token. To enable it:

1. Create a free developer sandbox at https://developer.authorize.net
   (sign up, activate via the confirmation email, log in).
2. Under **Account → API Credentials & Keys**, generate your **API Login ID**,
   **Transaction Key**, and **Public Client Key**.
3. Copy `.env.example` to `.env.local` and fill in:

   ```
   AUTHORIZENET_API_LOGIN_ID=<API Login ID>
   AUTHORIZENET_TRANSACTION_KEY=<Transaction Key>
   NEXT_PUBLIC_AUTHORIZENET_API_LOGIN_ID=<same API Login ID>
   NEXT_PUBLIC_AUTHORIZENET_CLIENT_KEY=<Public Client Key>
   AUTHORIZENET_ENVIRONMENT=SANDBOX
   ```

4. Restart the dev server, then self-check your credentials:

   ```bash
   npm run booking:check
   ```

   ✅ "Credentials are VALID" → you're ready to book with the sandbox test
   card `4242 4242 4242 4242` (or `4007000000027`), any future MM/YY, any CVV.
   ❌ "Credentials are INVALID (E00007)" → re-check the API Login ID /
   Transaction Key you pasted.

For production, add the same five variables in **Vercel → Project → Settings
→ Environment Variables**, switch the credentials to your live gateway, and
set `AUTHORIZENET_ENVIRONMENT=PRODUCTION`. The deployment must run over HTTPS
(Accept.js requires it — Vercel provides this automatically).

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
