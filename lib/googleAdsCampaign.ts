/**
 * Phase 10 — Google Search campaign: paused pre-launch configuration.
 *
 * This file is the single source of truth for the manual Google Ads
 * setup (docs/google-ads-launch.md). Tests enforce RSA character
 * limits, non-clinical copy rules, keyword match types, and that ad
 * groups map to real landing pages. Nothing here automates Google —
 * the campaign is created BY HAND in the Google Ads UI, paused.
 */

export const campaign = {
  name: "True Self Me — Coaching (Search)",
  type: "Search",
  status: "PAUSED at creation — traffic only after the launch gate passes",
  budgetPerDay: "$35.00 USD (configurable)",
  networks: {
    search: true,
    searchPartners: false, // review separately, later
    displayExpansion: false, // never auto-enabled
  },
  location: {
    target: "United States",
    /** Presence: people IN or regularly IN the targeted location. */
    option: "Presence (not interest or presence)",
    rationale:
      "Excludes international intent-junk that merely mentions the US.",
  },
  languages: ["English"],
  schedule: "24/7 — scheduler, lead capture and email automation run continuously",
  bidding: {
    strategy: "Maximize Conversions",
    note: "No Target CPA until sufficient conversion evidence accumulates.",
    primary: "booking_confirmed (primary action — used for bidding)",
    secondary: ["lead (secondary)", "session_paid (secondary)"],
  },
  autoTagging: {
    gclid: true,
    note: "Required for the Data Manager attribution pipeline. gbraid/wbraid arrive automatically for iOS traffic. UTMs are preserved by the site's first-party cookies — do not enable tracking templates that strip them.",
  },
};

/** RSA copy constraints (Google limits). */
export const RSA_LIMITS = {
  headlines: { min: 3, max: 15, maxChars: 30 },
  descriptions: { min: 2, max: 4, maxChars: 90 },
};

export type AdGroup = {
  name: string;
  landingPath: string; // final URL (after the real domain replaces the preview host)
  keywords: Array<{ match: "exact" | "phrase"; text: string }>;
  rsa: {
    path1?: string;
    path2?: string;
    headlines: string[]; // 1–15 items, each ≤30 chars
    descriptions: string[]; // 2–4 items, each ≤90 chars
  };
};

export const adGroups: AdGroup[] = [
  {
    name: "Career Coaching",
    landingPath: "/career-coaching",
    keywords: [
      { match: "exact", text: "[career coaching]" },
      { match: "exact", text: "[career coach]" },
      { match: "exact", text: "[career transition coach]" },
      { match: "exact", text: "[career change coach]" },
      { match: "exact", text: "[career coach for professionals]" },
      { match: "phrase", text: '"career coaching for professionals"' },
      { match: "phrase", text: '"career transition coaching"' },
      { match: "phrase", text: '"career direction coach"' },
      { match: "phrase", text: '"professional development coach"' },
    ],
    rsa: {
      path1: "career-coaching",
      headlines: [
        "Career Coaching That Clarifies",
        "Think Through Your Next Move",
        "Clarity For Your Career",
        "Non-Clinical Career Coaching",
        "20+ Yrs Leadership Experience",
        "CPCAB-Trained Coach",
        "Transitions Without The Panic",
        "Leadership Thinking Partner",
        "Goals With Accountability",
        "Virtual Sessions, US-Wide",
        "Book A 50-Minute Session",
        "$125 Per Session. No Packages",
        "Decide Deliberately",
        "A Thinking Partner For Pros",
        "Free Cancellation, 24h Notice",
      ],
      descriptions: [
        "Non-clinical career coaching for professionals: direction, decisions, leadership.",
        "Think through transitions and goals with 20+ years of leadership experience.",
        "Virtual 50-minute sessions across the US. $125 per session. Cancel free up to 24h.",
        "Structured, accountable, pressure-free. Book your session with Fahd Alam today.",
      ],
    },
  },
  {
    name: "Coaching for Dads",
    landingPath: "/coaching-for-dads",
    keywords: [
      { match: "exact", text: "[coaching for dads]" },
      { match: "exact", text: "[coaching for fathers]" },
      { match: "exact", text: "[fatherhood coach]" },
      { match: "exact", text: "[dad life coach]" },
      { match: "exact", text: "[coach for fathers]" },
      { match: "phrase", text: '"coaching for dads"' },
      { match: "phrase", text: '"coaching for fathers"' },
      { match: "phrase", text: '"fatherhood coach"' },
      { match: "phrase", text: '"work life balance coach for dads"' },
    ],
    rsa: {
      path1: "coaching-for-dads",
      headlines: [
        "Coaching For Dads",
        "Fatherhood, Thought Through",
        "Be The Dad You Intend To Be",
        "Work-Family Balance Coaching",
        "Non-Clinical Coaching For Dads",
        "Priorities That Actually Hold",
        "Accountability Without Nagging",
        "Communication That Lands",
        "20+ Yrs Leadership Experience",
        "CPCAB-Trained Coach & Dad",
        "Virtual Sessions Across The US",
        "Book A 50-Minute Session",
        "$125 Per Session. No Packages",
        "Free Cancellation, 24h Notice",
        "Steady Under The Load",
      ],
      descriptions: [
        "Practical coaching for dads: balance, communication, roles and priorities.",
        "A pressure-free space to decide what kind of father and partner you want to be.",
        "Virtual 50-minute sessions across the US. $125 per session. Free cancellation 24h.",
        "Non-clinical coaching with structure and accountability. Book with Fahd Alam.",
      ],
    },
  },
  {
    name: "Relationship Coaching",
    landingPath: "/relationship-coaching",
    keywords: [
      { match: "exact", text: "[relationship coaching]" },
      { match: "exact", text: "[relationship coach]" },
      { match: "exact", text: "[communication coach]" },
      { match: "exact", text: "[relationship coaching for men]" },
      { match: "exact", text: "[individual relationship coaching]" },
      { match: "phrase", text: '"relationship coaching"' },
      { match: "phrase", text: '"relationship coach"' },
      { match: "phrase", text: '"communication coaching for individuals"' },
      { match: "phrase", text: '"relationship patterns coach"' },
    ],
    rsa: {
      path1: "relationship-coaching",
      headlines: [
        "Relationship Coaching",
        "Change The Patterns You Repeat",
        "Communication That Lands",
        "Navigate Conflict Better",
        "Rebuild Connection",
        "Individual, Relational Focus",
        "Non-Clinical Coaching",
        "Culturally Attuned Coaching",
        "20+ Yrs Leadership Experience",
        "CPCAB-Trained Coach",
        "Virtual Sessions Across The US",
        "Book A 50-Minute Session",
        "$125 Per Session. No Packages",
        "Come Alone, Work On You",
        "Free Cancellation, 24h Notice",
      ],
      descriptions: [
        "Individual coaching with a relational focus: communication, patterns, connection.",
        "Name the loop you keep repeating and practice a different way through it.",
        "Virtual 50-minute sessions across the US. $125 per session. Free cancellation 24h.",
        "Non-clinical, culturally attuned coaching. Come alone — the work starts with you.",
      ],
    },
  },
];

/** Future ad group — configured, NOT to be created in the initial launch. */
export const futureAdGroups = [
  {
    name: "Men's Life Transitions",
    landingPath: "/mens-life-coaching",
    note: "Add only after /mens-life-coaching leaves draft (noindex) state and the launch gate passes.",
  },
];

/**
 * Campaign-level negative keyword list. Deliberately conservative:
 * blocks junk and clinical/crisis intent without blocking legitimate
 * coaching searches ("career" and bare "coach" are intentionally NOT
 * negatives — they would strangle the whole campaign).
 */
export const campaignNegatives: Array<{ match: "exact" | "phrase"; text: string }> = [
  // Freebie / bargain intent
  { match: "phrase", text: '"free"' },
  { match: "phrase", text: '"for free"' },
  { match: "phrase", text: '"cheap"' },
  // Jobs / provider-side intent
  { match: "phrase", text: '"jobs"' },
  { match: "phrase", text: '"job"' },
  { match: "phrase", text: '"hiring"' },
  { match: "phrase", text: '"salary"' },
  { match: "phrase", text: '"resume"' },
  // Coach-training / education intent (NOT coaching-seeking)
  { match: "phrase", text: '"become a coach"' },
  { match: "phrase", text: '"become a life coach"' },
  { match: "phrase", text: '"coach training"' },
  { match: "phrase", text: '"coach certification"' },
  { match: "phrase", text: '"life coach certification"' },
  { match: "phrase", text: '"icf certification"' },
  { match: "phrase", text: '"training"' },
  { match: "phrase", text: '"course"' },
  { match: "phrase", text: '"courses"' },
  { match: "phrase", text: '"certification course"' },
  { match: "phrase", text: '"degree"' },
  { match: "phrase", text: '"school"' },
  { match: "phrase", text: '"university"' },
  // Sports / physical coaching (different intent entirely)
  { match: "phrase", text: '"sports"' },
  { match: "phrase", text: '"football"' },
  { match: "phrase", text: '"soccer"' },
  { match: "phrase", text: '"basketball"' },
  { match: "phrase", text: '"fitness"' },
  { match: "phrase", text: '"gym"' },
  { match: "phrase", text: '"tennis"' },
  // Clinical / treatment intent
  { match: "phrase", text: '"therapy"' },
  { match: "phrase", text: '"therapist"' },
  { match: "phrase", text: '"counseling"' },
  { match: "phrase", text: '"counselling"' },
  { match: "phrase", text: '"psychologist"' },
  { match: "phrase", text: '"psychiatrist"' },
  { match: "phrase", text: '"medication"' },
  { match: "phrase", text: '"antidepressants"' },
  // Crisis / emergency intent — never an acquisition funnel
  { match: "phrase", text: '"suicide"' },
  { match: "phrase", text: '"suicidal"' },
  { match: "phrase", text: '"self-harm"' },
  { match: "phrase", text: '"self harm"' },
  { match: "phrase", text: '"988"' },
  { match: "phrase", text: '"hotline"' },
  { match: "phrase", text: '"crisis line"' },
  { match: "phrase", text: '"mental health emergency"' },
  { match: "exact", text: "[988]" },
  { match: "exact", text: "[suicide hotline]" },
  { match: "exact", text: "[mental health emergency]" },
];
