# Phase 10 — Google Search Campaign: Paused Pre-Launch Build

**Status: CAMPAIGN CREATED PAUSED. Do not enable traffic until every
item in the launch gate is GREEN (see the end of this document).**

Everything in `lib/googleAdsCampaign.ts` is the single source of truth
and is enforced by `tests/googleAds.test.mjs`. Copy-paste values below
straight into the Google Ads UI.

---

## 1. Campaign settings (create PAUSED)

| Setting | Value |
|---|---|
| Campaign type | Search |
| Campaign name | `True Self Me — Coaching (Search)` |
| Status | **Paused** at creation |
| Networks | Google Search ONLY. Search partners OFF (review later). Display expansion OFF (never auto-enable). |
| Daily budget | **$35.00 USD** |
| Locations | United States — location option: **"Presence: people in or regularly in your targeted locations"** (not "presence or interest"; blocks international intent junk) |
| Languages | English |
| Schedule | 24/7 — scheduler, lead capture and email automation run continuously |
| Bidding | **Maximize Conversions** — no Target CPA until conversion evidence exists |
| Auto-tagging | **ON** (gclid). Required for the Data Manager pipeline. gbraid/wbraid arrive automatically. No tracking templates that would strip UTMs. |

## 2. Conversions (before enabling bidding signals)

Created in Google Ads via **Tools → Data manager → connect the "Data
Manager API" conversion source**, then create three actions:

| Event (event name) | Conversion action | Role | Notes |
|---|---|---|---|
| `booking_confirmed` | action id → `GOOGLE_ADS_BOOKING_CONFIRMED_ACTION_ID` | **Primary** (bidding) | Count: one per booking. Value: from env or action default. |
| `lead` | action id → `GOOGLE_ADS_LEAD_ACTION_ID` | Secondary | Paid leads only (requires gclid/gbraid/wbraid — organic leads are never uploaded). Optional value via `GOOGLE_ADS_LEAD_CONVERSION_VALUE_CENTS`. |
| `session_paid` | action id → `GOOGLE_ADS_SESSION_PAID_ACTION_ID` | Secondary | Actual collected amount per event. |

Environment: `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_ADS_CUSTOMER_ID`
(`8942702311`), plus the three action ids. Pipeline behavior is
already built and tested: stable transaction ids
(`booking:{reference}` / `lead:{id}` / `booking:{reference}:paid`),
deduplication, retries with backoff, dead-letter state.

## 3. Ad groups, keywords, landing pages

Match types: **exact + phrase only.** No broad match initially.

### Ad group 1 — Career Coaching → `/career-coaching`
Exact: `[career coaching]` `[career coach]` `[career transition coach]` `[career change coach]` `[career coach for professionals]`
Phrase: `"career coaching for professionals"` `"career transition coaching"` `"career direction coach"` `"professional development coach"`

### Ad group 2 — Coaching for Dads → `/coaching-for-dads`
Exact: `[coaching for dads]` `[coaching for fathers]` `[fatherhood coach]` `[dad life coach]` `[coach for fathers]`
Phrase: `"coaching for dads"` `"coaching for fathers"` `"fatherhood coach"` `"work life balance coach for dads"`

### Ad group 3 — Relationship Coaching → `/relationship-coaching`
Exact: `[relationship coaching]` `[relationship coach]` `[communication coach]` `[relationship coaching for men]` `[individual relationship coaching]`
Phrase: `"relationship coaching"` `"relationship coach"` `"communication coaching for individuals"` `"relationship patterns coach"`

**Future (do NOT create yet):** Men's Life Transitions →
`/mens-life-coaching` (page is a noindex draft until launched).

## 4. Campaign negatives (shared list)

Freebie: `free` `for free` `cheap` · Jobs: `jobs` `job` `hiring`
`salary` `resume` · Coach-training/education: `become a coach`
`become a life coach` `coach training` `coach certification`
`life coach certification` `icf certification` `training` `course`
`courses` `certification course` `degree` `school` `university` ·
Sports: `sports` `football` `soccer` `basketball` `fitness` `gym`
`tennis` · Clinical: `therapy` `therapist` `counseling` `counselling`
`psychologist` `psychiatrist` `medication` `antidepressants` ·
Crisis: `suicide` `suicidal` `self-harm` `self harm` `988` `hotline`
`crisis line` `mental health emergency` + exact `[988]`
`[suicide hotline]` `[mental health emergency]`

> ⚠️ Never add `coach`, `coaching`, `career`, `dad`, `relationship` as
> negatives — they would strangle the campaign. (Test-enforced.)

## 5. Responsive search ads

Full copy lives in `lib/googleAdsCampaign.ts` (15 headlines + 4
descriptions per ad group; length limits and content rules are
unit-tested). Voice: non-clinical, no guarantees, no diagnostic
language, truthful credential framing ("CPCAB-Trained"), accurate
pricing ("$125 Per Session"), clear booking CTAs ("Book A 50-Minute
Session"). Display paths mirror the landing slugs.

## 6. Stripe production-readiness gate (BLOCKED)

- [ ] **Live keys** in Vercel: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_live…), `STRIPE_SECRET_KEY` (sk_live…) — currently **test** keys.
- [ ] **Live webhook** endpoint on the real domain with `STRIPE_WEBHOOK_SECRET` (live whsec…) — test-mode webhook exists; live not yet.
- [ ] Webhook signature verification verified once live (bogus POST → "Invalid signature").
- [ ] SetupIntent + Payment Element on **live** mode (one $0-charge card-save with a real card via the live flow — no unnecessary real charge; Stripe's live-mode card-save itself is the verification).
- [ ] Post-session PaymentIntent architecture reviewed for live (off_session charge + `requires_customer_action` recovery + failure/receipt emails exist and are wired).
- [ ] Confirm **no test keys anywhere in production env vars**.

## 7. General pre-launch gate (partially BLOCKED)

- [ ] **Real domain** replacing `mykahaniproject.vercel.app` (canonical/OG/sitemap auto-follow `NEXT_PUBLIC_SITE_URL` + `lib/site.ts`).
- [ ] **Real contact info** in `lib/site.ts` (phone/email/address are placeholders).
- [ ] **Privacy policy + terms pages** — do not exist yet; create before traffic.
- [ ] **Cancellation policy + card-authorization wording** — present in the booking flow; mirror on a policy page.
- [x] Non-clinical disclaimer + emergency information (every landing page + footer).
- [x] Scheduler, Stripe test-mode booking flow, attribution, conversion outbox, email automation (verified live in Phases 6–8 checkpoints).
- [x] Mobile experience (Phase 9 verified: no horizontal scroll, accessible forms, fast CTA).
- [ ] **Real email delivery** (`EMAIL_PROVIDER=resend` + domain verification) — currently console-only.

## 8. Launch gate: READY vs BLOCKED/PENDING

**READY (built, tested, verified live):**
- Landing pages + funnel (Phase 9) ✓
- Scheduler → Stripe → confirmed booking (Phase 6–8 checkpoints) ✓
- Attribution capture + persistence ✓
- Conversion outbox: booking_confirmed / session_paid / **lead** (Phase 10) ✓
- Email automation + nurture + transactional notices ✓
- Campaign configuration: settings, ad groups, keywords, negatives, RSAs ✓
- Crisis/clinical exclusion keywords + disclaimers ✓

**BLOCKED / PENDING before enabling traffic:**
1. Google Cloud service-account credentials (billing issue) — Phase 7 live verification.
2. Data Manager conversion source + 3 conversion action ids → env vars.
3. One test conversion received in Google Ads (Data Manager check-results / conversions table) + duplicate-prevention confirmed.
4. Stripe **live** keys + **live** webhook + signature re-verification (item 6 above).
5. Real domain + real contact info + privacy/terms pages.
6. Real email delivery (Resend or equivalent).
7. Search-partners review (stay OFF at launch).
8. Then: enable campaign, watch search terms daily for the first weeks, add negatives from observed junk, and only consider tCPA after ≥30 booking_confirmed conversions.

**Manual actions in Google Ads (no automation, in order):**
1. Enable auto-tagging (Account settings).
2. Data manager: connect conversion source; create the three actions; copy ids into env; redeploy.
3. Create the campaign exactly per §1–§5 — **paused**.
4. Ad review completes automatically; landing pages pass policy (non-clinical disclaimers are in place).
5. When the gate is green: flip the campaign to Enabled.
