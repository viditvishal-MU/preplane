export type LmpProcessStatus =
  | "not-started"
  | "ongoing"
  | "dormant"
  | "hold"
  | "closed"
  | "converted"
  | "not-converted"
  | "converted-na";

import type { AssignmentType, AssignmentReason } from "./pocCapability";
import { classifyAssignment } from "./pocCapability";
import type { AllocationTag, JdMode, ScoreBreakdown } from "./pocAllocation";

/** A POC slot on an LMP process card. */
export type LmpProcessPoc = {
  name: string;
  initials: string;
  color: string;
  /** Match type emitted by the allocation engine. */
  matchType: "In-Domain" | "Cross-Domain" | "High Load Override" | "Manual Override" | "Support POC Suggested" | "Support POC Skipped";
  currentLoad: number;
  maxThreshold: number;
  scoreBreakdown?: ScoreBreakdown | null;
};

export type LmpProcess = {
  id: string;
  company: string;
  role: string;
  domain: string;
  seniority: string;
  status: LmpProcessStatus;
  stage: string;
  /** Prep POC — main owner (auto-assigned by allocation engine). */
  prepPoc?: LmpProcessPoc;
  /** @deprecated Use prepPoc instead */
  domainPrepPoc: LmpProcessPoc;
  /** Support POC — secondary support owner. */
  supportPoc?: LmpProcessPoc;
  /** Outreach POC — outreach coordination. */
  outreachPoc?: LmpProcessPoc;
  /** Whether the latest allocation ran in JD-aware or load-only mode. */
  jdMode: JdMode;
  /** Allocation engine tags (In-Domain, Cross-Domain…). */
  allocationTags: AllocationTag[];
  /** Human-readable explanation of why these POCs were picked. */
  allocationReason: string;
  /**
   * @deprecated Use prepPoc / supportPoc instead.
   * Backward-compat aliases.
   */
  primaryPoc: { name: string; initials: string; color: string };
  /** @deprecated Use supportPoc instead */
  secondaryPoc?: { name: string; initials: string; color: string };
  candidates: number;
  slaDays: number;
  createdAt: string;
  /** Name of the user who created/owns this LMP process. */
  createdBy: string;
  /** Mentor match status for the card. */
  mentorMatch: "completed" | "not-run" | "weak";
  mentorMatchCount?: number;
  /** LMP status for the card. */
  lmp: "open" | "closed" | "none";
  topCandidate?: string;
  /** Was the primary POC inside or outside their capability bucket? */
  assignmentType?: AssignmentType;
  /** Why was this POC chosen? */
  assignmentReason?: AssignmentReason;
  /** File name of the uploaded JD document (PDF or DOCX). Set by POC on the Overview tab. */
  jdFileName?: string;
  /** Raw extracted text content of the JD. Set after parsing on upload. */
  jdText?: string;
  /** Skills extracted from the JD text. Set after parsing. */
  jdSkills?: string[];
  /** Seniority level extracted from the JD. */
  jdSeniority?: string;
  /** ISO timestamp when the JD was uploaded. */
  jdUploadedAt?: string;
};

/**
 * Seed data — written using the new dual-POC model. `primaryPoc` /
 * `secondaryPoc` are derived automatically by `hydrateAliases()` below.
 */
type Seed = Omit<LmpProcess, "primaryPoc" | "secondaryPoc"> & { behavioralPrepPoc?: LmpProcessPoc };

const SEEDS: Seed[] = [
  {
    id: "REQ-1042", company: "Swiggy", role: "Product Manager",
    domain: "Product Management", seniority: "Mid-Senior",
    status: "ongoing", stage: "R2 — Technical",
    domainPrepPoc:     poc("Priya Shetty",   "In-Domain"),
    supportPoc:        poc("Namita Iyer",     "Support POC Suggested"),
    jdMode: "FULL_SCORING",
    allocationTags: ["In-Domain", "Support POC Suggested"],
    allocationReason: "Priya Shetty selected via In-Domain match for Product Management (JD-aware scoring). Namita Iyer suggested as Support POC.",
    candidates: 5, slaDays: 6, createdAt: "Apr 12",
    createdBy: "Rahul Verma", mentorMatch: "completed", mentorMatchCount: 42, lmp: "open", topCandidate: "Arjun Mehta",
    assignmentType: "domain", assignmentReason: "ai_best_fit",
  },
  {
    id: "REQ-1041", company: "Razorpay", role: "Senior Backend Engineer",
    domain: "Engineering", seniority: "Senior",
    status: "ongoing", stage: "R3 — System Design",
    domainPrepPoc:     poc("Rahul Verma",    "In-Domain"),
    supportPoc:        poc("Dr. Gopika Rao", "Support POC Suggested"),
    jdMode: "FULL_SCORING",
    allocationTags: ["In-Domain", "Support POC Suggested"],
    allocationReason: "Rahul Verma selected via In-Domain match for Engineering. Dr. Gopika Rao suggested as Support POC.",
    candidates: 8, slaDays: 18, createdAt: "Apr 8",
    createdBy: "Rahul Verma", mentorMatch: "completed", mentorMatchCount: 28, lmp: "open", topCandidate: "Sara Iyer",
    assignmentType: "domain", assignmentReason: "ai_best_fit",
  },
  {
    id: "REQ-1039", company: "Cred", role: "Design Lead",
    domain: "Design", seniority: "Lead",
    status: "hold", stage: "On Hold",
    domainPrepPoc:     poc("Devon Park",   "In-Domain"),
    supportPoc:        poc("Riti Sen",     "Support POC Suggested"),
    jdMode: "FULL_SCORING",
    allocationTags: ["In-Domain", "Support POC Suggested"],
    allocationReason: "Devon Park selected via In-Domain match for Design. Riti Sen suggested as Support POC.",
    candidates: 3, slaDays: 22, createdAt: "Mar 28",
    createdBy: "Asha Mehra", mentorMatch: "weak", mentorMatchCount: 4, lmp: "none",
    assignmentType: "domain", assignmentReason: "ai_best_fit",
  },
  {
    id: "REQ-1037", company: "Zerodha", role: "Data Scientist",
    domain: "Data Science", seniority: "Mid",
    status: "converted", stage: "Offer Accepted",
    domainPrepPoc:     poc("Aditi Rao",  "In-Domain"),
    supportPoc:        poc("Namita Iyer", "Support POC Suggested"),
    jdMode: "FULL_SCORING",
    allocationTags: ["In-Domain", "Support POC Suggested"],
    allocationReason: "Aditi Rao selected via In-Domain match for Data Science. Namita Iyer suggested as Support POC.",
    candidates: 4, slaDays: 11, createdAt: "Mar 20",
    createdBy: "Rahul Verma", mentorMatch: "completed", mentorMatchCount: 19, lmp: "closed", topCandidate: "Liam O'Connor",
    assignmentType: "domain", assignmentReason: "ai_best_fit",
  },
  {
    id: "REQ-1036", company: "Meesho", role: "Growth PM",
    domain: "Product Management", seniority: "Senior",
    status: "dormant", stage: "Awaiting CVs",
    domainPrepPoc:     poc("Sana Khan",     "In-Domain"),
    jdMode: "LOAD_ONLY",
    allocationTags: ["In-Domain"],
    allocationReason: "Sana Khan selected via load-only In-Domain assignment (no JD on file).",
    candidates: 2, slaDays: 35, createdAt: "Mar 10",
    createdBy: "Rahul Verma", mentorMatch: "not-run", lmp: "none",
    assignmentType: "domain", assignmentReason: "load_balance",
  },
  {
    id: "REQ-1034", company: "PhonePe", role: "Staff Engineer",
    domain: "Engineering", seniority: "Staff",
    status: "not-converted", stage: "Closed — No Offer",
    domainPrepPoc:     poc("Aisha Bello",   "Cross-Domain"),
    jdMode: "FULL_SCORING",
    allocationTags: ["Cross-Domain"],
    allocationReason: "All in-domain Engineering POCs at threshold. Aisha Bello assigned via Cross-Domain fallback.",
    candidates: 6, slaDays: 41, createdAt: "Feb 22",
    createdBy: "Asha Mehra", mentorMatch: "completed", mentorMatchCount: 15, lmp: "closed",
    assignmentType: "cross", assignmentReason: "load_balance",
  },
];

function poc(name: string, matchType: LmpProcessPoc["matchType"]): LmpProcessPoc {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase();
  return {
    name,
    initials,
    color: "bg-gray-200 text-gray-600",
    matchType,
    currentLoad: 0,
    maxThreshold: 10,
    scoreBreakdown: null,
  };
}

/** Hydrate the legacy `primaryPoc` / `secondaryPoc` aliases and set `prepPoc`. */
function hydrateAliases(seed: Seed): LmpProcess {
  const primary = {
    name: seed.domainPrepPoc.name,
    initials: seed.domainPrepPoc.initials,
    color: seed.domainPrepPoc.color,
  };
  const secondary = seed.supportPoc
    ? {
        name: seed.supportPoc.name,
        initials: seed.supportPoc.initials,
        color: seed.supportPoc.color,
      }
    : undefined;
  // Strip behavioralPrepPoc from seed (legacy compat)
  const { behavioralPrepPoc: _, ...rest } = seed as any;
  return { ...rest, prepPoc: seed.domainPrepPoc, primaryPoc: primary, secondaryPoc: secondary };
}

export const LMP_PROCESSES: LmpProcess[] = SEEDS.map(hydrateAliases);

/** Helper for code that creates new LMP processes at runtime (e.g. wizard). */
export function makeLmpProcess(seed: Seed): LmpProcess {
  return hydrateAliases(seed);
}

/**
 * Auto-tag any LMP process that didn't get an explicit assignmentType.
 * Uses the POC capability bucket to decide domain vs cross.
 */
LMP_PROCESSES.forEach((r) => {
  if (!r.assignmentType) {
    r.assignmentType = classifyAssignment(r.primaryPoc.name, r.domain);
  }
  if (!r.assignmentReason) {
    r.assignmentReason = r.assignmentType === "cross" ? "load_balance" : "ai_best_fit";
  }
});

export const COMPANIES = Array.from(new Set(LMP_PROCESSES.map((r) => r.company))).sort();
export const DOMAINS = Array.from(new Set(LMP_PROCESSES.map((r) => r.domain))).sort();
export const POCS = Array.from(new Set(LMP_PROCESSES.map((r) => r.primaryPoc.name))).sort();

export const STATUS_OPTIONS: { value: LmpProcessStatus; label: string }[] = [
  { value: "not-started", label: "Not Started" },
  { value: "ongoing", label: "Ongoing" },
  { value: "dormant", label: "Dormant" },
  { value: "hold", label: "On Hold" },
  { value: "closed", label: "Closed" },
  { value: "converted", label: "Converted" },
  { value: "not-converted", label: "Not Converted" },
  { value: "converted-na", label: "Converted NA" },
];

// Type definitions and default config moved to src/types/lmp.ts.
// Re-exported here for backward compatibility with existing imports.
export type { Candidate, Round, RemarkEntry } from "@/types/lmp";
export { DEFAULT_ROUNDS, ROUND_TYPES } from "@/types/lmp";
import type { Candidate, RemarkEntry } from "@/types/lmp";

export const SAMPLE_CANDIDATES: Candidate[] = [
  { id: "c1", name: "Arjun Mehta",   initials: "AM", color: "bg-orange-200 text-orange-600", cohort: "TBM · C7", roundId: "r2" },
  { id: "c2", name: "Sara Iyer",     initials: "SI", color: "bg-teal-200 text-teal-600",     cohort: "YLC · C1", roundId: "r1" },
  { id: "c3", name: "Liam O'Connor", initials: "LO", color: "bg-plum-400/30 text-plum-400",  cohort: "TBM · C7", roundId: "r3" },
  { id: "c4", name: "Zara Khan",     initials: "ZK", color: "bg-sage-200 text-sage-600",     cohort: "YLC · C1", roundId: "pool" },
  { id: "c5", name: "Hiro Tanaka",   initials: "HT", color: "bg-yellow-200 text-yellow-600", cohort: "TBM · C7", roundId: "pool" },
];

// Roster of available students (TBM C7 + YLC C1) that can be added to an LMP process.
export type RosterStudent = {
  id: string;
  name: string;
  initials: string;
  color: string;
  program: "TBM" | "YLC";
  cohort: "C7" | "C1";
};

export const STUDENT_ROSTER: RosterStudent[] = [
  { id: "s-tbm-1", name: "Aanya Kapoor",    initials: "AK", color: "bg-orange-200 text-orange-600", program: "TBM", cohort: "C7" },
  { id: "s-tbm-2", name: "Rohan Bhatia",    initials: "RB", color: "bg-teal-200 text-teal-600",     program: "TBM", cohort: "C7" },
  { id: "s-tbm-3", name: "Neha Sundaram",   initials: "NS", color: "bg-plum-400/30 text-plum-400",  program: "TBM", cohort: "C7" },
  { id: "s-tbm-4", name: "Vikram Joshi",    initials: "VJ", color: "bg-sage-200 text-sage-600",     program: "TBM", cohort: "C7" },
  { id: "s-tbm-5", name: "Ishita Reddy",    initials: "IR", color: "bg-yellow-200 text-yellow-600", program: "TBM", cohort: "C7" },
  { id: "s-tbm-6", name: "Karan Malhotra",  initials: "KM", color: "bg-orange-200 text-orange-600", program: "TBM", cohort: "C7" },
  { id: "s-ylc-1", name: "Anika Sharma",    initials: "AS", color: "bg-teal-200 text-teal-600",     program: "YLC", cohort: "C1" },
  { id: "s-ylc-2", name: "Devansh Rao",     initials: "DR", color: "bg-plum-400/30 text-plum-400",  program: "YLC", cohort: "C1" },
  { id: "s-ylc-3", name: "Meera Nair",      initials: "MN", color: "bg-sage-200 text-sage-600",     program: "YLC", cohort: "C1" },
  { id: "s-ylc-4", name: "Aarav Sinha",     initials: "AS", color: "bg-yellow-200 text-yellow-600", program: "YLC", cohort: "C1" },
  { id: "s-ylc-5", name: "Tara Banerjee",   initials: "TB", color: "bg-orange-200 text-orange-600", program: "YLC", cohort: "C1" },
  { id: "s-ylc-6", name: "Pranav Kulkarni", initials: "PK", color: "bg-teal-200 text-teal-600",     program: "YLC", cohort: "C1" },
];

export const SAMPLE_REMARKS: RemarkEntry[] = [
  {
    id: "rm1", candidateId: "c1", pocName: "Priya Shetty", pocInitials: "PS", pocColor: "bg-orange-200 text-orange-600",
    timestamp: "Apr 18, 10:24",
    fromRound: "R1 — HR Screen", toRound: "R2 — Technical",
    text: "Strong communication and clear motivation. Cleared HR screen with above-average notes on stakeholder examples.",
  },
  {
    id: "rm2", candidateId: "c1", pocName: "Priya Shetty", pocInitials: "PS", pocColor: "bg-orange-200 text-orange-600",
    timestamp: "Apr 20, 09:10",
    text: "Mentor session scheduled for Friday — focusing on system trade-offs.",
  },
];

export function getLmpProcessById(id: string) {
  return LMP_PROCESSES.find((r) => r.id === id);
}
// Backward-compatible aliases
export type Requisition = LmpProcess;
export type ReqStatus = LmpProcessStatus;
export type ReqPoc = LmpProcessPoc;
export const REQUISITIONS = LMP_PROCESSES;
export const getRequisitionById = getLmpProcessById;
export const makeRequisition = makeLmpProcess;
