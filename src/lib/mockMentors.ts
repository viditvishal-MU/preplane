export type MentorSource = "MU" | "ALU" | "EXT";

export type Mentor = {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
  company: string;
  source: MentorSource;
  sourceRank?: 1 | 2 | 3;
  score: number;
  scores: { role: number; skills: number; company: number; industry: number; seniority: number };
  layer: string;
  decisionTags: { emoji: string; label: string }[];
  rating: number;
  reviews: number;
  outcome: number; // % goal met
  availability: "available" | "busy";
  email: string;
  phone: string;
  seniority: "Mid" | "Senior" | "Lead" | "Staff";
  shortlisted?: boolean;
  linkedin?: string;
  /** Mentor Union member toggle — defaults to source==="MU". */
  mentorUnion?: boolean;
  /** Per-session remuneration in INR. */
  remunerationInr?: number;
  pastExperience?: { role: string; company: string; years: string }[];
  mentorshipHistory?: { reqRole: string; reqCompany: string; outcome: "converted" | "not-converted" | "ongoing"; rating?: number }[];
  internal?: { lmpOwner: string; poc: string; feedbackAvg: number; feedbackCount: number };
  /** New spec: tier code + label, breakdown out of 45, signals for justification. */
  tier?: "L1" | "L2" | "L3" | "L4" | "L5";
  tier_label?: string;
  rank?: number;
  score_breakdown?: {
    skill: number;
    seniority: number;
    prestige: number;
    
    source: number;
    total: number;
  };
  match_signals?: {
    matched_skills: string[];
    missing_skills: string[];
    seniority_note: string;
    company_note: string;
    source_note: string;
    gap_coverage: string[];
  };
  /** External discovery metadata (only populated when source === "EXT"). */
  platform?: "Topmate" | "ADPList" | "LinkedIn" | "Superpeer";
  external_links?: { platform: string; booking: string | null; linkedin: string | null };
  sessions_taken?: number | null;
  /** Marked when dedup detects a name+role collision without company match. */
  possibleDuplicate?: boolean;
};

export const MENTORS: Mentor[] = [
  {
    id: "m1", name: "Anita Krishnan", initials: "AK", color: "bg-orange-200 text-orange-600",
    role: "Senior PM", company: "Vercel", source: "MU", score: 92,
    scores: { role: 32, skills: 24, company: 18, industry: 12, seniority: 6 },
    layer: "Layer 1: Same Role + Company",
    decisionTags: [{ emoji: "🎯", label: "Best HR Match" }, { emoji: "🏢", label: "Company Insider" }],
    rating: 4.8, reviews: 18, outcome: 84, availability: "available",
    email: "anita@example.com", phone: "+91 98xxx", seniority: "Senior",
    linkedin: "anita-krishnan", mentorUnion: true, remunerationInr: 4500,
    pastExperience: [
      { role: "Senior PM", company: "Vercel", years: "2022 — Now" },
      { role: "Product Lead", company: "Razorpay", years: "2019 — 2022" },
      { role: "Product Manager", company: "Flipkart", years: "2016 — 2019" },
    ],
    mentorshipHistory: [
      { reqRole: "PM", reqCompany: "Swiggy", outcome: "converted", rating: 4.9 },
      { reqRole: "Growth PM", reqCompany: "Cred", outcome: "converted", rating: 4.7 },
      { reqRole: "PM", reqCompany: "Meesho", outcome: "ongoing" },
    ],
    internal: { lmpOwner: "Priya Shetty", poc: "Devon Park", feedbackAvg: 4.6, feedbackCount: 14 },
  },
  {
    id: "m2", name: "Dev Sundaram", initials: "DS", color: "bg-teal-200 text-teal-600",
    role: "Group PM", company: "Atlassian", source: "MU", score: 87,
    scores: { role: 30, skills: 22, company: 14, industry: 13, seniority: 8 },
    layer: "Layer 2: Same Role + Adjacent Company",
    decisionTags: [{ emoji: "🧠", label: "Strategy Coach" }],
    rating: 4.5, reviews: 12, outcome: 78, availability: "available",
    email: "dev@example.com", phone: "+91 99xxx", seniority: "Lead",
    linkedin: "dev-sundaram", mentorUnion: true, remunerationInr: 4000,
    pastExperience: [
      { role: "Group PM", company: "Atlassian", years: "2021 — Now" },
      { role: "Senior PM", company: "Freshworks", years: "2018 — 2021" },
    ],
    mentorshipHistory: [
      { reqRole: "PM", reqCompany: "Razorpay", outcome: "converted", rating: 4.6 },
      { reqRole: "Growth PM", reqCompany: "Zomato", outcome: "not-converted", rating: 4.2 },
    ],
    internal: { lmpOwner: "Asha Mehra", poc: "Priya Shetty", feedbackAvg: 4.4, feedbackCount: 9 },
  },
  {
    id: "m3", name: "Maya Holm", initials: "MH", color: "bg-sage-200 text-sage-600",
    role: "Director of Product", company: "Stripe", source: "ALU", score: 81,
    scores: { role: 28, skills: 20, company: 12, industry: 14, seniority: 7 },
    layer: "Layer 3: Adjacent Role + Same Industry",
    decisionTags: [{ emoji: "🎓", label: "Alumni Network" }, { emoji: "💸", label: "Pricing Expert" }],
    rating: 4.6, reviews: 9, outcome: 72, availability: "busy",
    email: "maya@example.com", phone: "+1 415xxx", seniority: "Lead",
    linkedin: "maya-holm", mentorUnion: false, remunerationInr: 6000,
    pastExperience: [
      { role: "Director of Product", company: "Stripe", years: "2020 — Now" },
      { role: "Senior PM", company: "Square", years: "2017 — 2020" },
    ],
    mentorshipHistory: [
      { reqRole: "Senior PM", reqCompany: "Cred", outcome: "converted", rating: 4.8 },
    ],
    internal: { lmpOwner: "Devon Park", poc: "Rahul Verma", feedbackAvg: 4.7, feedbackCount: 6 },
  },
  {
    id: "m4", name: "Hiro Tanaka", initials: "HT", color: "bg-yellow-200 text-yellow-600",
    role: "Principal PM", company: "Datadog", source: "EXT", score: 76,
    scores: { role: 26, skills: 19, company: 10, industry: 13, seniority: 8 },
    layer: "Layer 4: External · TopMate",
    decisionTags: [{ emoji: "🛠️", label: "DevTools" }],
    rating: 4.3, reviews: 22, outcome: 68, availability: "available",
    email: "hiro@example.com", phone: "+81 90xxx", seniority: "Staff",
    linkedin: "hiro-tanaka", mentorUnion: false, remunerationInr: 7500,
    pastExperience: [
      { role: "Principal PM", company: "Datadog", years: "2019 — Now" },
      { role: "Senior PM", company: "Splunk", years: "2015 — 2019" },
    ],
    mentorshipHistory: [],
    internal: { lmpOwner: "Aditi Rao", poc: "Devon Park", feedbackAvg: 4.1, feedbackCount: 3 },
  },
  {
    id: "m5", name: "Priya Anand", initials: "PA", color: "bg-plum-400/30 text-plum-400",
    role: "Senior PM", company: "Zomato", source: "MU", score: 73,
    scores: { role: 28, skills: 18, company: 9, industry: 12, seniority: 6 },
    layer: "Layer 2: Same Role + Adjacent Company",
    decisionTags: [{ emoji: "🇮🇳", label: "APAC Insider" }],
    rating: 4.1, reviews: 7, outcome: 66, availability: "available",
    email: "priya.a@example.com", phone: "+91 90xxx", seniority: "Senior",
    linkedin: "priya-anand", mentorUnion: true, remunerationInr: 3500,
    pastExperience: [
      { role: "Senior PM", company: "Zomato", years: "2021 — Now" },
    ],
    mentorshipHistory: [
      { reqRole: "PM", reqCompany: "Swiggy", outcome: "ongoing" },
    ],
    internal: { lmpOwner: "Priya Shetty", poc: "Devon Park", feedbackAvg: 4.0, feedbackCount: 4 },
  },
];

export const SOURCE_META: Record<MentorSource, { label: string; chip: string; dot: string }> = {
  MU:  { label: "Mentor Union", chip: "bg-teal-50 text-teal-600 border-teal-200",   dot: "bg-teal-400" },
  ALU: { label: "Alumni",       chip: "bg-sage-50 text-sage-600 border-sage-200",   dot: "bg-sage-400" },
  EXT: { label: "External",     chip: "bg-sky-400/10 text-sky-400 border-sky-400/30", dot: "bg-sky-400" },
};

export const SCORE_DIM_COLORS = {
  role:      "bg-orange-500",
  skills:    "bg-teal-400",
  company:   "bg-plum-400",
  industry:  "bg-sky-400",
  seniority: "bg-sage-400",
} as const;

export const SCORE_DIM_MAX = { role: 35, skills: 25, company: 20, industry: 15, seniority: 10 } as const;