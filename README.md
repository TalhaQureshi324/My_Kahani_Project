# True Self Me — Coaching & Mentorship Platform

A production-grade **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4**
platform for a virtual coaching practice — marketing site, Google Ads landing
pages, custom scheduling engine, Stripe card-on-file booking, lead nurture,
email automation, server-side conversion attribution, and campaign
guardrails, all in one deployable codebase.

**Live site**: [https://trueselfme.com](https://trueselfme.com)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Getting Started](#getting-started)
4. [Environment Variables](#environment-variables)
5. [Database (Supabase / PostgreSQL)](#database-supabase--postgresql)
6. [Booking Flow (Stripe)](#booking-flow-stripe)
7. [Payments & Card-on-File](#payments--card-on-file)
8. [Post-Session Billing](#post-session-billing)
9. [Lead Capture & Email Nurture](#lead-capture--email-nurture)
10. [Attribution & Conversion Tracking](#attribution--conversion-tracking)
11. [Client-Side Analytics](#client-side-analytics)
12. [Google Ads Automation & Guardrails](#google-ads-automation--guardrails)
13. [Cron Jobs & Background Workers](#cron-jobs--background-workers)
14. [Google Ads Landing Pages](#google-ads-landing-pages)
15. [Project Structure](#project-structure)
16. [Deployment](#deployment)
17. [Testing](#testing)
18. [Launch Gate (Pre-Traffic Checklist)](#launch-gate-pre-traffic-checklist)

---

## Architecture Overview

```
Visitor
  │
  ├─ Google Ads click (gclid/gbraid/wbraid captured in first-party cookies)
  │
  ├─ Landing page (/coaching-for-dads, /career-coaching, /relationship-coaching)
  │    └─ Stripe.js loaded ONLY at the payment step (never on landing pages)
  │
  ├─ /book or booking drawer
  │    ├─ Custom scheduler (availability from Supabase)
  │    ├─ 10-minute slot hold (DB exclusion constraint)
  │    ├─ 3-field intake (name, email, phone)
  │    ├─ Card-on-file consent + Stripe Payment Element
  │    ├─ Server-side SetupIntent verification
  │    └─ Confirmed booking + .ics calendar + confirmation email
  │
  ├─ Lead capture (visitors not ready to book)
  │    └─ 3-email nurture sequence + transactional payment notices
  │
  └─ Session occurs
       └─ Post-session Stripe PaymentIntent (off-session charge)
            └─ session_paid conversion → Google Ads Data Manager API
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (`@theme` tokens) |
| Database | Supabase (PostgreSQL + RLS) |
| Payments | **Stripe** (SetupIntent, Payment Element, PaymentIntent, webhooks) |
| Email | Provider abstraction (console for dev, Resend for production) |
| Analytics | GA4-ready gtag/dataLayer dispatcher (inert until Measurement ID set) |
| Ad Conversions | Google Data Manager API (server-side `events:ingest`) |
| Process Manager | PM2 (VPS) / Vercel (preview) |
| Reverse Proxy | Nginx + Let's Encrypt SSL |
| Testing | Node.js built-in test runner (98 tests) |

---

## Getting Started

```bash
# 1. Clone and install
git clone https://github.com/TalhaQureshi324/My_Kahani_Project.git
cd My_Kahani_Project
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in your Supabase and Stripe keys (see Environment Variables below)

# 3. Run the database migrations
#    Copy the full contents of supabase/RUN_ALL_MIGRATIONS.sql
#    and execute in the Supabase SQL Editor (fully idempotent — safe to re-run)

# 4. Start the dev server
npm run dev          # http://localhost:3000

# 5. Run the test suite
npm test             # 98 tests

# 6. Production build
npm run build

# 7. Self-check booking prerequisites
npm run booking:check
```

---

## Environment Variables

Copy `.env.example` → `.env.local` (development) or `.env.production`
(VPS deployment). All variables are documented inline in the example file.

### Required (Core)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | Canonical URL (e.g. `https://trueselfme.com`) — builds manage/ICS links |
| `SUPABASE_URL` | Supabase project REST endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service role key — never expose to the browser |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_test_…` or `pk_live_…`) |
| `STRIPE_SECRET_KEY` | Stripe **restricted key** (`rk_test_…` or `rk_live_…`) with write access to Customers, SetupIntents, PaymentIntents, PaymentMethods, and Webhooks |
| `STRIPE_WEBHOOK_SECRET` | Signing secret (`whsec_…`) from your Stripe webhook endpoint |
| `CRON_SECRET` | Shared secret for background worker endpoints |

### Optional (Features)

| Variable | Description |
|----------|-------------|
| `EMAIL_PROVIDER` | `console` (default, logs only) or `resend` |
| `RESEND_API_KEY` | Required when `EMAIL_PROVIDER=resend` |
| `EMAIL_FROM` | From-address for all outgoing email |
| `PROMO_CODES` | JSON array of discount codes (see Booking Flow section) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 Measurement ID (`G-XXXXXXX`) — analytics stays inert until set |
| `ADS_CONSENT_DEFAULT` | `denied` (default) or `granted` — controls user-identifier uploads to Google |
| `ADS_AUTOMATION_MODE` | `dry_run` (default) or `live` — Google Ads mutation guardrail |

---

## Database (Supabase / PostgreSQL)

All schema lives in `supabase/migrations/` (numbered 0001–0009). The
aggregated `supabase/RUN_ALL_MIGRATIONS.sql` is **fully idempotent** — safe
to re-run on any environment.

### Core Tables

| Table | Purpose |
|-------|---------|
| `bookings` | Slot holds → confirmed → cancelled/completed lifecycle; stores Stripe refs, attribution jsonb, price snapshot, card metadata |
| `customers` | Internal customer records (email as dedup key, Stripe customer link) |
| `availability_rules` | Practitioner's weekly schedule (defined in America/Chicago) |
| `availability_exceptions` | Date-specific blocked/extra availability |
| `slot_holds` | 10-minute expiry tracking for pending bookings |
| `booking_operations` | Idempotency ledger — prevents duplicate verify/charge operations |
| `notification_jobs` | Email queue (confirmation, reminders, payment notices, lead nurture) |

### Lead & Nurture Tables

| Table | Purpose |
|-------|---------|
| `leads` | Captured leads with status (`new`→`nurturing`→`booked`/`unsubscribed`), consent flags, attribution |
| `stripe_events` | Webhook event dedup (unique on `stripe_event_id`) |

### Conversion & Automation Tables

| Table | Purpose |
|-------|---------|
| `conversion_outbox` | Durable queue for Google Ads conversion uploads (`booking_confirmed`, `session_paid`, `lead`) |
| `ads_automation_runs` | Guardrail evaluation batches with duplicate-cron protection |
| `ads_automation_actions` | Full audit trail: entity, action, before/after, rule, reason, dry-run flag |
| `ads_alerts` | Severity-tagged alerts with acknowledgement state |
| `search_term_reviews` | Deterministic classification of harvested search terms |
| `ads_site_health` | Rolling site/scheduler probe history for outage detection |

### Key Database Constraints

- **`bookings_no_active_overlap`** — PostgreSQL exclusion constraint (`tstzrange &&`) prevents two active bookings from ever overlapping the same slot, even under concurrent requests (losing insert fails with `23P01`)
- **`booking_reference` unique partial index** — no two bookings share a public reference
- **`conversion_outbox_dedupe_uniq`** — one conversion per (event_type, booking/lead), preventing duplicate Google Ads uploads
- **`notification_jobs_live_uniq`** — one live job per (booking_id, type)

---

## Booking Flow (Stripe)

The booking flow is a four-stage state machine:

```
Stage 1: Pick Date & Time (custom scheduler)
  └─ Availability from DB (America/Chicago rules + exceptions − holds)
  └─ Slot selected → POST /api/booking/hold → 10-minute DB hold
  └─ Attribution cookies (gclid/UTMs) persisted to bookings row

Stage 2: Your Details (3-field intake)
  └─ First name, last name, email, phone
  └─ details_submitted analytics event

Stage 3: Review & Confirm
  └─ Pricing breakdown from lib/pricing (Session Fee + $0 Due Today)
  └─ Promo/discount code input (POST /api/booking/promo)
  └─ Card-on-file consent checkbox
  └─ POST /api/booking/setup-intent (persists details + creates Stripe Customer + SetupIntent)
  └─ Stripe Payment Element mounts (loads Stripe.js HERE — never earlier)

Stage 4: Confirmation
  └─ stripe.confirmSetup() in browser
  └─ POST /api/booking/setup-intent/verify (server-side: retrieves SI,
     checks status=succeeded, saves card brand/last4, converts hold→confirmed,
     creates notification jobs, queues Google conversion)
  └─ .ics calendar download + manage-by-token link
```

### Promo / Discount Codes

Codes are configured via the `PROMO_CODES` env var (JSON array):

```json
[
  {"code": "WELCOME20", "type": "percent", "value": 20},
  {"code": "FRIEND50", "type": "flat_cents", "value": 5000}
]
```

- `percent` — percentage off (0–100)
- `flat_cents` — flat discount in cents

Validation happens server-side (`POST /api/booking/promo`); the UI shows a
green success tag or "Invalid promo code." An empty `PROMO_CODES` (default)
rejects all codes.

### Pricing

Live pricing is sourced from `lib/pricing.ts`:

```ts
export const SESSION_PRICE_CENTS = 12500; // $125.00
export const PRICING_SOURCE = "test_individual_v1_2026-09-30";
```

Bookings snapshot the price at booking time (`session_price_cents` on the
bookings row) so historical bookings never re-read current pricing. Change
the price by updating `lib/pricing.ts` and deploying.

---

## Payments & Card-on-File

**The platform uses Stripe exclusively** (Authorize.Net was fully removed).

### How Card Saving Works

1. The server creates a **Stripe Customer** + **SetupIntent**
   (`usage: "off_session"`) linked to the booking
2. The browser renders Stripe's **Payment Element** inside an iframe —
   card data never touches our servers
3. On submit, `stripe.confirmSetup()` runs client-side
4. Our server **re-verifies** the SetupIntent independently (status =
   `succeeded`, correct customer, payment method attached) before marking
   the booking as confirmed — the client's claim is never trusted
5. Safe card metadata (brand + last4 only) is stored on the booking row;
   full card numbers, CVC, and Stripe secrets are never stored or logged

### What the Customer Sees

- Session Fee: $125.00 / Due Today (Card Authorization): $0.00
- "Your card is verified now with a temporary $1.00 authorization (released
  immediately) and kept securely on file. The session fee is billed only
  after your appointment is completed."

### Stripe Webhook (`/api/webhooks/stripe`)

Handles (all idempotent via `stripe_events` dedup):

| Event | Action |
|-------|--------|
| `setup_intent.succeeded` | Links SI + PM to the booking |
| `setup_intent.setup_failed` | Records failure code/reason |
| `payment_intent.succeeded` | Marks booking `paid`, queues receipt email |
| `payment_intent.requires_action` | Sends 3DS recovery link (fresh manage token) |
| `payment_intent.payment_failed` | Sends failure email with retry link |
| `charge.refunded` | Sends refund confirmation |

Webhook signature is verified against `STRIPE_WEBHOOK_SECRET` on the raw
request body. Unsigned requests return `400`.

---

## Post-Session Billing

After a session is completed, the practitioner charges the saved card via a
**server-side off-session PaymentIntent** (using the stored PaymentMethod).
The customer never re-enters their card.

If the charge requires customer authentication (3DS):

- The booking enters `requires_customer_action`
- A **secure recovery link** (fresh manage token, never a client_secret or
  Stripe ID) is emailed to the customer
- They complete authentication on the site via
  `POST /api/booking/manage/[token]/complete-payment`

Failed charges send a retry email with the same secure link.

---

## Lead Capture & Email Nurture

### Lead Lifecycle

```
new → nurturing → booked
                 ↘ unsubscribed
                 ↘ invalid (crisis-flagged)
                 ↘ archived
```

### Capture (`POST /api/leads`)

- First name, email, optional phone (SMS consent required explicitly)
- Attribution from first-party cookies (same source as booking flow)
- Crisis screening on free-text fields — emergency terms trigger a
  predefined 911/988 response + human review flag; such leads are never
  enrolled in nurture and never sent to advertising systems
- Duplicate emails collapse to a single nurture stream
- Paid leads (arrived with a Google click ID) are queued in
  `conversion_outbox` for Google Ads

### Nurture Sequence

| Email | Timing | Content |
|-------|--------|---------|
| 1 | Immediately | Welcome + booking CTA |
| 2 | ~2 days | Value thought + CTA |
| 3 | ~5 days | Final gentle note + CTA |

Every email includes a one-click unsubscribe link
(`/api/leads/unsubscribe/[token]`). **Booking confirmation automatically
stops all remaining nurture emails** for that lead.

### Transactional Emails

| Type | Trigger |
|------|---------|
| `booking_confirmation` | Booking confirmed (verify success) |
| `reminder_24h` / `reminder_2h` | Before the session |
| `booking_rescheduled` | Reschedule via manage link |
| `booking_cancelled` | Cancellation via manage link |
| `payment_succeeded` | Post-session charge succeeds |
| `payment_failed` | Post-session charge fails |
| `payment_action_required` | 3DS authentication needed |
| `refund_completed` | Refund processed |

Marketing unsubscribe **never** disables transactional booking emails —
they run on separate job types and never consult the lead's marketing state.

---

## Attribution & Conversion Tracking

### First-Party Attribution (`lib/attribution.ts`)

On every page load, `AttributionCapture` (root layout) reads the URL for
`gclid`, `gbraid`, `wbraid`, and UTM parameters, then persists them into
first-party cookies (30-day expiry):

- **First-touch cookie** (`tsm_attribution`) — set once, never overwritten
- **Last-touch cookie** (`tsm_attribution_last`) — updated on each new
  campaign landing

At slot hold time, the server reads these cookies and persists the resolved
attribution onto the booking row.

### Server-Side Conversion Pipeline

Conversions are uploaded to Google via the **Data Manager API**
(`POST /v1/events:ingest`) — never the legacy `UploadClickConversions`
endpoint.

| Event | Trigger | Transaction ID |
|-------|---------|---------------|
| `booking_confirmed` | Booking verify succeeds | `booking:{reference}` |
| `session_paid` | PaymentIntent succeeds (webhook) | `booking:{reference}:paid` |
| `lead` | Lead captured with a Google click ID | `lead:{lead_id}` |

Every conversion flows through the `conversion_outbox` table:
```
business event committed → outbox row → async worker → Google API → result persisted
```

- **Never blocks the booking/payment** — enqueue is fire-and-forget
- **Stable transaction IDs** — retries reuse the same ID, preventing
  duplicate conversions in Google Ads
- **Retry with backoff** — 1m → 5m → 30m → 2h → 12h, then dead-letter
- **Consent-gated** — hashed email/phone only uploaded when
  `ADS_CONSENT_DEFAULT=granted`; click-ID conversions always flow
- **Organic leads** (no click ID) are stored but never uploaded

### Required Google Cloud / Ads Setup

1. Enable the **Data Manager API** in Google Cloud
2. Create a **service account** + key JSON → set
   `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
3. Grant the service-account email access to the Google Ads account
4. In Google Ads → Tools → Data manager, create three conversion actions:
   - `booking_confirmed` → `GOOGLE_ADS_BOOKING_CONFIRMED_ACTION_ID`
   - `session_paid` → `GOOGLE_ADS_SESSION_PAID_ACTION_ID`
   - `lead` → `GOOGLE_ADS_LEAD_ACTION_ID`
5. Set `GOOGLE_ADS_CUSTOMER_ID` (digits only)

---

## Client-Side Analytics

**`lib/analytics.ts`** — type-safe event catalog with dual `gtag` /
`dataLayer` dispatcher. Inert by default (no Measurement ID → no-op).

| Event | Fires when |
|-------|-----------|
| `cta_clicked` | Any booking CTA (navbar, hero, services, pricing, footer, floating button) with location + label |
| `booking_drawer_opened` | Drawer opens, with source |
| `slot_selected` | Date/time picked in the scheduler |
| `details_submitted` | Intake form validated + submitted |
| `card_saved` | Server-side card verify succeeds |
| `booking_confirmed_client` | Same as above (conversion signal) |
| `ics_downloaded` | Calendar file download clicked |
| `scroll_depth` | 25/50/75/90/100% milestones (once each) |
| `section_viewed` | Section ≥50% visible for ≥3 seconds |

**`components/analytics/GAScript.tsx`** — loads gtag.js only when
`NEXT_PUBLIC_GA_MEASUREMENT_ID` is set.

**`components/analytics/EngagementTracker.tsx`** — passive scroll/visibility
tracking, renders nothing.

---

## Google Ads Automation & Guardrails

All automation lives in `lib/ads/automation.ts` — pure, deterministic,
unit-tested rules. **Dry-run by default** (`ADS_AUTOMATION_MODE=dry_run`).

| Rule | ID | Behavior |
|------|----|---------|
| $400 Checkpoint | `ADS-400` | At $400 test spend with 0 confirmed bookings and <5 qualified leads → pause + critical alert, no auto-reactivation |
| Budget Ceiling | `ADS-CEILING` | Warn at 80% of $1,000 test ceiling, pause at 100% |
| Spend Anomaly | — | Daily spend ≥2× budget → critical alert |
| Search Terms | `ADS-TERM-*` | Crisis intent → block + flag; confident junk → auto-negative proposal; ambiguous → human review queue |
| Site Health | `ADS-SITE-OUTAGE` | Sustained (≥15min) landing-page/scheduler failure → critical alert (pause is opt-in) |
| Stripe Health | `ADS-STRIPE-BREAK` | ≥50% SetupIntent failures over ≥5 attempts → critical alert (pause is opt-in); a single post-session decline never pauses |
| Pipeline | — | No successful conversion upload for 6h with pending events → critical alert |

**Audit trail**: every proposed or executed mutation is recorded in
`ads_automation_actions` with entity, action, before/after values, rule,
reason, dry-run flag, and rollback info.

**Weekly digest** (`buildWeeklyDigest`): spend, clicks, CTR, CPC, leads,
bookings, paid sessions, cost-per metrics, search terms, negatives,
disapprovals, automation actions, and health counters — zero PII.

---

## Cron Jobs & Background Workers

All workers are `CRON_SECRET`-protected (accept Vercel Cron's
`Authorization: Bearer` or a custom `x-cron-secret` header) and serve both
GET and POST.

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/jobs/process-emails` | Daily (Hobby) | Sends notification_jobs + lead nurture |
| `/api/jobs/process-conversions` | Daily (Hobby) | Uploads conversion_outbox rows to Google |
| `/api/jobs/ads-automation` | On demand | Evaluates guardrail rules |
| `/api/jobs/conversions-health` | On demand | Queue stats + stuck detection |

For frequent scheduling (production), point a system crontab or external
scheduler at these endpoints with the auth header — no code changes needed.

---

## Google Ads Landing Pages

Data-driven from `lib/landingPages.ts` — a new page is a config entry + a
three-line route file.

| Route | Status | Content |
|-------|--------|---------|
| `/coaching-for-dads` | Live, indexed | Fatherhood, communication, balance, accountability |
| `/career-coaching` | Live, indexed | Direction, decisions, leadership, transitions |
| `/relationship-coaching` | Live, indexed | Communication, patterns, connection |
| `/mens-life-coaching` | Draft (`noindex`) | Prepared — launch by removing the flag |

Each page: ad-specific H1, value prop, goals grid, approach, truthful
credentials (CPCAB framed as training, not a clinical licence), live
pricing from `lib/pricing.ts`, FAQ, booking CTA, lead form, non-clinical +
emergency disclaimers. Unique title/description/canonical/OpenGraph +
Service/FAQPage JSON-LD.

**Performance**: Stripe.js never loads on landing pages — it loads only at
the payment step. Mobile-first responsive, FAQ uses native
`<details>/<summary>` (accessible, zero JS).

Campaign configuration lives in `lib/googleAdsCampaign.ts` (paused
pre-launch build — settings, keywords, negatives, RSAs — enforced by
`tests/googleAds.test.mjs`).

---

## Project Structure

```
app/
  layout.tsx                    # Fonts, navbar, footer, analytics, floating CTA
  page.tsx                      # Homepage — composes all anchor sections
  book/page.tsx                 # Standalone booking page
  api/
    availability/               # GET slot availability
    booking/
      hold/                     # POST — create 10-min slot hold
      confirm/                  # POST — legacy confirm (superseded by verify)
      setup-intent/             # POST — create SI + Stripe Customer
      setup-intent/verify/      # POST — server-side SI verification
      promo/                    # POST — validate discount code
    bookings/[reference]/calendar/  # GET — .ics download
    leads/                      # POST — lead capture
    leads/unsubscribe/[token]/  # GET — one-click marketing unsubscribe
    jobs/
      process-emails/           # Email worker
      process-conversions/      # Google conversion uploader
      ads-automation/           # Guardrail evaluation
      conversions-health/       # Queue observability
    webhooks/stripe/            # Stripe signed webhooks
  coaching-for-dads/            # Ad landing page
  career-coaching/              # Ad landing page
  relationship-coaching/       # Ad landing page
  mens-life-coaching/          # Draft landing page (noindex)
  the-dad-block/               # Program page (temporarily redirected)
  the-dad-block/events/        # Events page (temporarily redirected)
  sitemap.ts                   # Dynamic sitemap
  robots.ts                    # robots.txt

components/
  analytics/                    # GAScript, EngagementTracker
  booking/
    BookingProvider.tsx         # Global drawer context
    BookingDrawer.tsx           # Slide-over sheet (lazy-loads BookingFlow)
    BookingTrigger.tsx          # CTA button (analytics-tagged)
    BookingFlow.tsx             # 4-stage wizard
    CustomScheduler.tsx         # Calendar + slot picker
    CardOnFileStep.tsx          # Stripe Payment Element + consent
    BookingConfirmation.tsx     # Stage 4 — .ics + reference
    PromoCodeInput.tsx          # Discount code UI
    FloatingBookingButton.tsx   # Global fixed bottom-right CTA
  footer/                       # Footer, BackToTop
  navbar/                       # Navbar, MobileDrawer, nav-config
  sections/                     # Hero, About, Specialties, Pricing, etc.
  ui/                           # Doodles, Reveal, primitives

lib/
  ads/
    automation.ts               # Guardrail rules engine (pure, tested)
    convert.ts                  # Conversion payload builder (redaction-safe)
    conversionOutbox.ts         # Enqueue helpers
    dataManager.ts              # Google Data Manager API client
  analytics.ts                  # Client-side event catalog + dispatcher
  attribution.ts                # First-party cookie capture/parse
  email/
    provider.ts                 # Send abstraction (console/resend)
    templates.ts                # All email templates
  googleAdsCampaign.ts          # Campaign config (paused, test-enforced)
  landingPages.ts               # Landing page content (data-driven)
  leads.ts                      # Lead helpers (pure + DB)
  pricing.ts                    # Single source of truth for pricing
  scheduling.ts                 # Slot generation (CST-based)
  site.ts                       # Practice name, contact details
  stripe.ts                     # Stripe client + config
  supabase.ts                   # Supabase admin client

supabase/
  RUN_ALL_MIGRATIONS.sql        # Idempotent — all migrations in order
  migrations/                   # 0001–0009 individual files

tests/                          # 98 tests across 6 suites
  attribution.test.mjs
  scheduling.test.mjs
  conversions.test.mjs
  leads.test.mjs
  landing.test.mjs
  googleAds.test.mjs
  automation.test.mjs
```

---

## Deployment

### VPS (Hostinger — current production)

```bash
# First-time setup (already done on srv2012525.hstgr.cloud)
apt install -y nodejs git nginx certbot python3-certbot-nginx
npm install -g pm2

# Deploy the latest
cd /var/www/trueselfme
git pull origin main
npm install
npm run build
pm2 restart trueselfme
```

Nginx reverse-proxies `https://trueselfme.com` → `localhost:3000` with
Let's Encrypt SSL (auto-renews). PM2 keeps the Node process alive across
reboots (`pm2 startup` + `pm2 save` configured).

### Vercel (preview / development)

Connect the GitHub repo; Vercel auto-deploys on push. Set the same
environment variables in **Project → Settings → Environment Variables**.

### Stripe Webhook Endpoint

In the Stripe Dashboard → Developers → Webhooks, add:
```
https://trueselfme.com/api/webhooks/stripe
```
with the five events listed in the [Payments section](#payments--card-on-file).
Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

---

## Testing

```bash
npm test    # 98 tests, zero network/database dependencies
```

| Suite | Coverage |
|-------|----------|
| `attribution.test.mjs` | Cookie capture, first/last touch, expiry, sanitization |
| `scheduling.test.mjs` | DST transitions, timezone math, slot generation, busy filtering |
| `conversions.test.mjs` | Hashing, transaction IDs, consent gating, redaction, retry classification, backoff |
| `leads.test.mjs` | Normalization, duplicates, schedule, gating, crisis terms, template rules |
| `landing.test.mjs` | Config integrity, no clinical claims, CTA mapping, draft status |
| `googleAds.test.mjs` | RSA limits, keyword match types, safe negatives, campaign settings |
| `automation.test.mjs` | Checkpoint, ceiling, anomaly, search terms, site/Stripe health, digest |

---

## Launch Gate (Pre-Traffic Checklist)

**Ready / verified:**
- [x] Landing pages + funnel (scheduler → Stripe → confirmed booking)
- [x] Attribution capture + persistence
- [x] Conversion outbox (`booking_confirmed` / `session_paid` / `lead`)
- [x] Email automation + nurture + transactional notices
- [x] Campaign structure, keywords, negatives, RSAs (test-enforced)
- [x] Mobile experience (no horizontal scroll, accessible forms)
- [x] Client-side analytics (all events wired, inert by default)
- [x] Live domain (trueselfme.com) + HTTPS

**Pending (before enabling paid traffic):**
- [ ] Google Cloud service-account credentials (billing issue)
- [ ] Data Manager conversion source + three conversion action IDs
- [ ] Stripe **live** keys + live webhook endpoint
- [ ] Real email delivery (`EMAIL_PROVIDER=resend` + domain verification)
- [ ] Privacy Policy + Terms pages
- [ ] Manual creation of the paused Google Ads campaign
- [ ] Clean test data from Supabase (test bookings, leads, events)
- [ ] Configure `PROMO_CODES` if discount codes are needed

---

## License

Private project — all rights reserved.
