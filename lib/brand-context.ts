/**
 * Compact, non-sensitive brand context served to LLM workflows via
 * GET /api/internal/marketing/context. Contains NO client/customer
 * data (spec section 44) — marketing voice and rules only.
 */

export const CONTENT_PILLARS = [
  "Personal Growth & Self-Awareness",
  "Relationships & Communication",
  "Parenting & Family",
  "Teen Development",
  "College & Life Transitions",
  "Career & Professional Growth",
  "Cultural Identity & Belonging",
  "Changing Multigenerational Patterns",
  "Coaching Education",
  "Reflection & Personal Development",
];

export const BRAND_CONTEXT = {
  brand: {
    name: "True Self Me",
    url: "https://trueselfme.com",
    tagline: "Grounded, authentic coaching and mentorship",
    practitioner: "Fahd Alam — Coach & Mentor",
  },
  positioning:
    "Non-clinical coaching and personal development. Support for finding steadiness, clarity, and purpose — not healthcare.",
  coachingNotTherapyPolicy: {
    rule: "Content must never present coaching as clinical healthcare.",
    never: [
      "diagnose mental illness",
      "claim to treat or cure any condition",
      "prescribe treatment or medication",
      "replace medical or psychological care",
      "guarantee outcomes",
      "make unsupported medical or psychological claims",
    ],
    crisisLine: "988 (if crisis-adjacent topics arise, include the referral and stay non-clinical)",
  },
  tone: {
    voice: "Warm, grounded, direct, hopeful. A competent human professional — never hype.",
    audience:
      "Individuals, couples, dads, teens/college students, and professionals across the United States seeking practical guidance.",
    readingLevel: "Clear, plain English; short paragraphs; concrete examples over abstractions.",
  },
  approvedLanguage: [
    "coaching", "guidance", "reflection", "personal development",
    "self-awareness", "communication skills", "relationship support",
    "goal setting", "personal growth", "professional growth",
  ],
  prohibitedLanguage: [
    "therapy", "therapist", "treatment", "cure", "diagnosis",
    "mental illness claims", "unlock your potential", "embark on your journey",
    "delve into", "game-changing", "in today's fast-paced world",
  ],
  writingRules: {
    avoidPatterns: [
      "three-item lists everywhere", "fake anecdotes", "generic introductions",
      "repetitive conclusions", "keyword stuffing", "motivational filler",
      "excessive em dashes",
    ],
    factRule:
      "Never invent studies, researchers, statistics, or citations. Verify or remove factual claims.",
  },
  services: [
    { name: "Initial Consultation", detail: "One 50-minute virtual session" },
    { name: "4-Session Package", detail: "Four virtual sessions — $200 ($50/session)" },
    { name: "Coaching for Dads", url: "https://trueselfme.com/coaching-for-dads" },
    { name: "Career Coaching", url: "https://trueselfme.com/career-coaching" },
    { name: "Relationship & Couples Coaching", url: "https://trueselfme.com/relationship-coaching" },
    { name: "Men's Life Coaching", url: "https://trueselfme.com/mens-life-coaching" },
  ],
  contentPillars: CONTENT_PILLARS,
  ctaGuidance: {
    default: "Book a Session — https://trueselfme.com/#book",
    soft: ["Save this for later.", "Share this with someone who may find it helpful.", "Read the full article on TrueSelfMe.com."],
    rule: "Do not use a sales CTA on every post; rotate value-first endings.",
  },
  visual: {
    palette: { cream: "#F5EFE6", deepClay: "#5D1F13", terracotta: "#A8532B", surface: "#F3EDE5" },
    fonts: { display: "Fraunces (serif)", body: "DM Sans (sans-serif)" },
    instagram: { portrait: "1080x1350", style: "Editorial, calm, generous whitespace; no cluttered text slides." },
  },
} as const;
