import { type LmpStatus } from "./mockLMP";

export type TimelineKind = "create" | "poc" | "cv" | "rounds" | "round-move" | "match" | "status";

export type TimelineEvent = {
  id: string;
  kind: TimelineKind;
  date: string;
  text: string;
  author?: string;
};

export type Remark = {
  id: string;
  author: string;
  initials: string;
  avatarColor: string;
  role: "Allocator" | "POC" | "Admin";
  timestamp: string;
  text: string;
  replies?: Remark[];
};

export type LmpCandidate = {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  round: string;
};

export type LmpSession = {
  id: string;
  mentor: string;
  candidate: string;
  status: "Scheduled" | "Completed" | "Cancelled";
};

export const TIMELINE_EVENTS: TimelineEvent[] = [
  { id: "t1", kind: "create",     date: "Apr 12",       text: "Process created · JD Mode 1 upload" },
  { id: "t2", kind: "poc",        date: "Apr 12 · 14:20", text: "POC Priya Shetty assigned (AI score: 87). Confirmed by Ravi.", author: "Ravi Kumar" },
  { id: "t3", kind: "cv",         date: "Apr 14",       text: "5 CVs uploaded by Allocator Ravi Kumar", author: "Ravi Kumar" },
  { id: "t4", kind: "rounds",     date: "Apr 15",       text: "Rounds configured: R1 HR · R2 Technical · R3 Case Study" },
  { id: "t5", kind: "round-move", date: "Apr 18",       text: "Priya moved R1 → R2. Note: 'Cleared HR round.'", author: "Priya Shetty" },
  { id: "t6", kind: "match",      date: "Apr 21",       text: "Mentor match run. 42 results. Top: Rahul Verma (87/100)" },
  { id: "t7", kind: "round-move", date: "Apr 23",       text: "Aman moved R2 → R3. Note: 'Strong technical signal.'", author: "Priya Shetty" },
  { id: "t8", kind: "status",     date: "Apr 24",       text: "Status confirmed Ongoing (SLA window healthy)" },
];

export const REMARKS: Remark[] = [
  { id: "r1", author: "Ravi Kumar",  initials: "RK", avatarColor: "bg-orange-200 text-orange-600", role: "Allocator",
    timestamp: "Apr 22 · 11:04", text: "Client confirmed they'd like to move 2 candidates to onsite next week.",
    replies: [
      { id: "r1a", author: "Priya Shetty", initials: "PS", avatarColor: "bg-teal-200 text-teal-600", role: "POC",
        timestamp: "Apr 22 · 11:32", text: "Noted — I'll align mentor sessions for Aman and Riya before Friday." },
    ] },
  { id: "r2", author: "Asha Mehra", initials: "AM", avatarColor: "bg-plum-400/30 text-plum-400", role: "Admin",
    timestamp: "Apr 23 · 09:15", text: "Looped in. Please log readiness scores after each session." },
];

export const CANDIDATES: LmpCandidate[] = [
  { id: "c1", name: "Aman Gupta",   initials: "AG", avatarColor: "bg-orange-200 text-orange-600", round: "R3 — Case" },
  { id: "c2", name: "Riya Sen",     initials: "RS", avatarColor: "bg-teal-200 text-teal-600",     round: "R2 — Technical" },
  { id: "c3", name: "Vikram Joshi", initials: "VJ", avatarColor: "bg-yellow-200 text-yellow-600", round: "R2 — Technical" },
  { id: "c4", name: "Neha Pillai",  initials: "NP", avatarColor: "bg-sage-200 text-sage-600",     round: "R1 — HR" },
  { id: "c5", name: "Karan Mehta",  initials: "KM", avatarColor: "bg-plum-400/30 text-plum-400",  round: "R1 — HR" },
];

export const SESSIONS: LmpSession[] = [
  { id: "s1", mentor: "Rahul Verma",  candidate: "Aman Gupta",   status: "Completed" },
  { id: "s2", mentor: "Devon Park",   candidate: "Riya Sen",     status: "Scheduled" },
  { id: "s3", mentor: "Mei Tanaka",   candidate: "Vikram Joshi", status: "Scheduled" },
  { id: "s4", mentor: "Aditi Rao",    candidate: "Neha Pillai",  status: "Cancelled" },
];

export const STATUS_OPTIONS: LmpStatus[] = [
  "not-started",
  "ongoing",
  "dormant",
  "hold",
  "closed",
  "converted",
  "not-converted",
  "converted-na",
];

export const TIMELINE_DOT: Record<TimelineKind, string> = {
  create: "bg-orange-500",
  poc: "bg-orange-500",
  cv: "bg-n400",
  rounds: "bg-n400",
  "round-move": "bg-teal-400",
  match: "bg-plum-400",
  status: "bg-yellow-500",
};