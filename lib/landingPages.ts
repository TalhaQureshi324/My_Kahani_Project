import { SESSION_PRICE_CENTS, SESSION_CURRENCY } from "./pricing.ts";

/**
 * Phase 9 — Google Ads landing page content, data-driven so a new page
 * is a config entry plus a three-line route file.
 *
 * Positioning rules baked into review tests:
 *   - non-clinical coaching: guidance, accountability, personal and
 *     professional development
 *   - marketing copy never describes services as psychotherapy,
 *     clinical diagnosis, medical treatment or licensed therapy
 *   - credentials are the truthful ones already published on the site
 *   - every page carries the non-clinical + emergency disclaimers
 */

export const BOOKING_URL = "/book";

export type LandingFaq = { q: string; a: string };
export type LandingGoal = { title: string; text: string };

export type LandingPageContent = {
  slug: string;
  /** Draft pages render but are excluded from search indexes + sitemap. */
  noindex?: boolean;
  meta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
  };
  hero: {
    eyebrow: string;
    h1: string;
    subhead: string;
    primaryCta: string;
    secondaryCta: string;
  };
  goalsHeading: string;
  goalsIntro: string;
  goals: LandingGoal[];
  approachHeading: string;
  approachParagraphs: string[];
  credentialsHeading: string;
  credentialsLines: string[];
  faq: LandingFaq[];
  ctaHeading: string;
  ctaText: string;
};

export const NON_CLINICAL_DISCLAIMER =
  "True Self Me offers non-clinical coaching and personal development services. Coaching is guidance and accountability — not psychotherapy, clinical diagnosis, medical treatment or licensed therapy.";

export const EMERGENCY_DISCLAIMER =
  "If you are in immediate danger or experiencing an emergency, contact emergency services (911 in the US) or the 988 Suicide & Crisis Lifeline (call or text 988). Coaching is not an emergency service.";

const priceLabel = `$${(SESSION_PRICE_CENTS / 100).toFixed(0)}`;

const STANDARD_FAQ: LandingFaq[] = [
  {
    q: "Is this therapy or counselling?",
    a: "No. True Self Me provides non-clinical coaching — guidance, structure and accountability for personal and professional goals. It is not psychotherapy, diagnosis or medical treatment, and it is not a substitute for mental-health care.",
  },
  {
    q: "What does a session look like?",
    a: "A 50-minute virtual video conversation. We clarify where you are, what you want to move toward, and leave with concrete next steps and accountability.",
  },
  {
    q: "How much does it cost?",
    a: `${priceLabel} per 50-minute session (${SESSION_CURRENCY}), booked and paid per session. Free cancellation up to 24 hours before your session.`,
  },
  {
    q: "Who is it for?",
    a: "Adults and young professionals who want a grounded, pressure-free space to think clearly and act deliberately — no diagnosis, no labels, just practical support.",
  },
];

export const landingPages: Record<string, LandingPageContent> = {
  "coaching-for-dads": {
    slug: "coaching-for-dads",
    meta: {
      title: "Coaching for Dads | Non-Clinical Fatherhood Coaching — True Self Me",
      description:
        "Practical, non-clinical coaching for dads: fatherhood, communication, work/family balance and accountability. Virtual 50-minute sessions across the US. $125.",
      ogTitle: "Coaching for Dads — True Self Me",
      ogDescription:
        "A grounded space for fathers to think clearly about family, work and what comes next. Non-clinical coaching, virtual across the US.",
    },
    hero: {
      eyebrow: "Coaching for dads",
      h1: "Coaching for dads who want to be deliberate about fatherhood",
      subhead:
        "A pressure-free space to think through family, work and priorities — with structure, honesty and accountability. Non-clinical coaching, virtual across the United States.",
      primaryCta: "Book a 50-minute session",
      secondaryCta: "Prefer to start with a note? Stay in touch instead",
    },
    goalsHeading: "What dads work on",
    goalsIntro:
      "Every dad's situation is different. These are the conversations that come up most:",
    goals: [
      {
        title: "Work / family balance",
        text: "When the calendar is full, decide deliberately what gets your best hours — instead of defaulting.",
      },
      {
        title: "Communication at home",
        text: "Say what you mean, hear what's meant, and get out of the same argument on repeat.",
      },
      {
        title: "Roles and expectations",
        text: "Sort out what kind of father, partner and provider you want to be — from what others expect of you.",
      },
      {
        title: "Priorities that hold",
        text: "Trade the endless to-do list for a small number of commitments you'll actually keep.",
      },
      {
        title: "Pressure and steadiness",
        text: "Stay effective under the weight of providing, leading and showing up — without disappearing from your own life.",
      },
      {
        title: "Accountability that isn't nagging",
        text: "A standing conversation that checks in on what you said mattered — and what you did about it.",
      },
    ],
    approachHeading: "How the coaching works",
    approachParagraphs: [
      "This is non-clinical coaching: a working conversation between adults. No diagnosis, no labels, no clinical treatment — just structured thinking, honest questions and follow-through.",
      "Sessions are 50 minutes, virtual, and built around your agenda. You set the direction; the coaching keeps you honest about it between sessions.",
      "Between cultures and generations, fatherhood carries different expectations. That context is welcome in the conversation, not worked around.",
    ],
    credentialsHeading: "Who you'll be talking to",
    credentialsLines: [
      "Fahd Alam — Coach & Mentor. CPCAB-trained in counselling skills (this is training in listening and support skills, not a clinical licence).",
      "MBA, LLB, BE — and 20+ years of international business, technology and senior leadership experience.",
      "A father's understanding of the trade-offs dads navigate, across cultures and expectations.",
    ],
    faq: [
      ...STANDARD_FAQ,
      {
        q: "I'm a new dad and overwhelmed. Is this for me?",
        a: "Yes — new fatherhood is one of the most common reasons dads start here. It's a practical conversation about roles, rest, pressure and priorities, not a clinical assessment.",
      },
    ],
    ctaHeading: "Ready when you are",
    ctaText:
      "Pick a time for a 50-minute virtual session — or leave your email and Fahd will check in from time to time first.",
  },

  "career-coaching": {
    slug: "career-coaching",
    meta: {
      title: "Career Coaching | Direction, Decisions & Accountability — True Self Me",
      description:
        "Non-clinical career coaching for professionals: direction, big decisions, leadership and transitions. 50-minute virtual sessions across the US. $125.",
      ogTitle: "Career Coaching — True Self Me",
      ogDescription:
        "Think clearly about your career direction, decisions and leadership — with structure and accountability. Virtual sessions across the US.",
    },
    hero: {
      eyebrow: "Career coaching",
      h1: "Career coaching for professionals at a decision point",
      subhead:
        "Direction, transitions, leadership and goals — thought through with someone who has spent 20+ years in international business and leadership. Non-clinical coaching, virtual across the United States.",
      primaryCta: "Book a 50-minute session",
      secondaryCta: "Not ready to book? Stay in touch instead",
    },
    goalsHeading: "What professionals work on",
    goalsIntro: "Common starting points for career coaching here:",
    goals: [
      {
        title: "Career direction",
        text: "Sort a vague restlessness into a clear picture of what you actually want next.",
      },
      {
        title: "Big professional decisions",
        text: "Take the loop in your head and put it on the table — options, trade-offs, timelines.",
      },
      {
        title: "Leadership under weight",
        text: "Lead teams and carry responsibility without losing your own judgment in the noise.",
      },
      {
        title: "Transitions",
        text: "Change roles, industries or countries deliberately instead of reactively.",
      },
      {
        title: "Goals that survive contact",
        text: "Set fewer, better goals — with an accountability rhythm that keeps them moving.",
      },
      {
        title: "Success that feels isolating",
        text: "A candid thinking partner when everyone around you expects confidence and certainty.",
      },
    ],
    approachHeading: "How the coaching works",
    approachParagraphs: [
      "Non-clinical coaching: a structured working conversation — no diagnosis, no labels, no clinical treatment. Your agenda, held to rigorously.",
      "Sessions are 50 minutes and virtual. You leave with decisions clarified and commitments made; the accountability lives in the follow-up.",
      "The perspective behind this practice is real-world: 20+ years across international business, technology, entrepreneurship and senior leadership — plus formal training in counselling skills (CPCAB).",
    ],
    credentialsHeading: "Who you'll be talking to",
    credentialsLines: [
      "Fahd Alam — Coach & Mentor. CPCAB-trained in counselling skills (listening and support training, not a clinical licence).",
      "MBA, LLB, BE — with two decades building businesses and leading teams through difficult periods across countries and cultures.",
      "Particular experience with professionals, executives, entrepreneurs and people carrying significant responsibility.",
    ],
    faq: [
      ...STANDARD_FAQ,
      {
        q: "Is this career counselling or recruitment?",
        a: "Neither. It's non-clinical coaching — a structured space to think through direction, decisions and goals, with accountability for what you decide. No placement services, no clinical treatment.",
      },
    ],
    ctaHeading: "Ready to think it through",
    ctaText:
      "Book a 50-minute virtual session — or leave your email and start with an occasional note instead.",
  },

  "relationship-coaching": {
    slug: "relationship-coaching",
    meta: {
      title: "Relationship Coaching | Communication & Patterns — True Self Me",
      description:
        "Non-clinical relationship coaching: communication, shared goals, patterns and conflict navigation. Individual coaching with a relational focus. Virtual, US. $125.",
      ogTitle: "Relationship Coaching — True Self Me",
      ogDescription:
        "A grounded space to think about communication, patterns and connection. Non-clinical coaching for individuals, virtual across the US.",
    },
    hero: {
      eyebrow: "Relationship coaching",
      h1: "Relationship coaching for the patterns you're tired of repeating",
      subhead:
        "Communication, shared goals, conflict navigation and connection — thought through honestly, with accountability. Non-clinical coaching for individuals, virtual across the United States.",
      primaryCta: "Book a 50-minute session",
      secondaryCta: "Rather stay in touch first? Leave a note",
    },
    goalsHeading: "What people work on",
    goalsIntro:
      "This is individual coaching with a relational focus — the work happens with you:",
    goals: [
      {
        title: "Communication that lands",
        text: "Say the thing you actually mean — and get better at hearing what's actually being said.",
      },
      {
        title: "Recurring patterns",
        text: "Name the loop you keep ending up in, and understand what keeps feeding it.",
      },
      {
        title: "Shared goals",
        text: "Get clear on what you and the people closest to you are building — and where you've quietly diverged.",
      },
      {
        title: "Conflict navigation",
        text: "Disagree without damaging: practical ways to stay in a hard conversation.",
      },
      {
        title: "Connection",
        text: "Rebuild closeness that routine, distance or history has worn thin.",
      },
      {
        title: "Culture and expectations",
        text: "Family, duty, reputation and intergenerational expectations — welcome in the conversation.",
      },
    ],
    approachHeading: "How the coaching works",
    approachParagraphs: [
      "Non-clinical and individual: this is coaching for you as a person thinking through your relationships — not couples therapy, not clinical treatment, not diagnosis.",
      "Sessions are 50 minutes, virtual, and conversational. The interest is not just the immediate problem but the patterns underneath it: how earlier experiences, family relationships, culture and expectations shape how you relate today.",
      "You bring the situation; the coaching brings structure, honesty and follow-through.",
    ],
    credentialsHeading: "Who you'll be talking to",
    credentialsLines: [
      "Fahd Alam — Coach & Mentor. CPCAB-trained in counselling skills (listening and support training, not a clinical licence).",
      "MBA, LLB, BE — with 20+ years of international leadership experience and a particular interest in how culture and family shape relationships.",
      "Experienced with Pakistani, South Asian and other collectivist contexts, where family, marriage, religion and duty are often part of the picture.",
    ],
    faq: [
      {
        q: "Is this couples therapy?",
        a: "No. This is individual, non-clinical coaching for people thinking through their relationships — communication, patterns, goals and connection. It is not psychotherapy, couples therapy or clinical treatment.",
      },
      ...STANDARD_FAQ.slice(1),
      {
        q: "My partner isn't interested in coaching. Can I come alone?",
        a: "Yes — the work starts with you. Changing how you show up in a relationship is something an individual can practice, with accountability.",
      },
    ],
    ctaHeading: "Start with one conversation",
    ctaText:
      "Book a 50-minute virtual session — or leave your email and begin with an occasional note.",
  },

  "mens-life-coaching": {
    slug: "mens-life-coaching",
    noindex: true, // prepared draft — flip to indexed when it goes live
    meta: {
      title: "Men's Life Coaching | Non-Clinical Coaching — True Self Me",
      description:
        "Non-clinical life coaching for men: direction, pressure, relationships and accountability. 50-minute virtual sessions across the US.",
      ogTitle: "Men's Life Coaching — True Self Me",
      ogDescription:
        "A grounded space for men to think through direction, pressure and what comes next. Virtual sessions across the US.",
    },
    hero: {
      eyebrow: "Men's life coaching",
      h1: "Life coaching for men carrying more than they say out loud",
      subhead:
        "Direction, pressure, relationships and accountability — a grounded, non-clinical space to think clearly. Virtual across the United States.",
      primaryCta: "Book a 50-minute session",
      secondaryCta: "Stay in touch instead",
    },
    goalsHeading: "What men work on",
    goalsIntro: "Common starting points:",
    goals: [
      {
        title: "Direction",
        text: "From quietly stuck to a deliberate next chapter.",
      },
      {
        title: "Pressure",
        text: "Carry responsibility without going flat or reactive.",
      },
      {
        title: "Relationships",
        text: "Show up at home the way you intend to.",
      },
      {
        title: "Accountability",
        text: "A standing conversation that takes your own goals seriously.",
      },
    ],
    approachHeading: "How the coaching works",
    approachParagraphs: [
      "Non-clinical coaching: structured conversations, honest questions, follow-through. No diagnosis, no labels, no clinical treatment.",
      "50-minute virtual sessions built around your agenda, with accountability between them.",
    ],
    credentialsHeading: "Who you'll be talking to",
    credentialsLines: [
      "Fahd Alam — Coach & Mentor. CPCAB-trained in counselling skills (not a clinical licence).",
      "MBA, LLB, BE — 20+ years of international business and senior leadership experience.",
    ],
    faq: STANDARD_FAQ,
    ctaHeading: "Ready when you are",
    ctaText: "Book a session — or leave your email to start slower.",
  },
};

export function getLandingPage(slug: string): LandingPageContent | null {
  return landingPages[slug] ?? null;
}

/** Indexable landing slugs (drafts excluded from sitemap/indexing). */
export const indexedLandingSlugs = Object.values(landingPages)
  .filter((p) => !p.noindex)
  .map((p) => p.slug);
