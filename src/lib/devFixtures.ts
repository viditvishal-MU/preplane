/**
 * DEV-ONLY mock data arrays.
 * These are preserved for local development / Storybook but must NOT be
 * imported in any production page component.
 */

import type { TimelineEvent, Remark, LmpCandidate, LmpSession } from "./mockLmpDetail";
import type { Session } from "./mockSessions";
import type { Mentor } from "./mockMentors";

// ── From mockLmpDetail ──────────────────────────────────────────────

export const DEV_TIMELINE_EVENTS: TimelineEvent[] = [
  { id: "t1", kind: "create",     date: "Apr 12",       text: "Process created · JD Mode 1 upload" },
  { id: "t2", kind: "poc",        date: "Apr 12 · 14:20", text: "POC Priya Shetty assigned (AI score: 87). Confirmed by Ravi.", author: "Ravi Kumar" },
  { id: "t3", kind: "cv",         date: "Apr 14",       text: "5 CVs uploaded by Allocator Ravi Kumar", author: "Ravi Kumar" },
  { id: "t4", kind: "rounds",     date: "Apr 15",       text: "Rounds configured: R1 HR · R2 Technical · R3 Case Study" },
  { id: "t5", kind: "round-move", date: "Apr 18",       text: "Priya moved R1 → R2. Note: 'Cleared HR round.'", author: "Priya Shetty" },
  { id: "t6", kind: "match",      date: "Apr 21",       text: "Mentor match run. 42 results. Top: Rahul Verma (87/100)" },
  { id: "t7", kind: "round-move", date: "Apr 23",       text: "Aman moved R2 → R3. Note: 'Strong technical signal.'", author: "Priya Shetty" },
  { id: "t8", kind: "status",     date: "Apr 24",       text: "Status confirmed Ongoing (SLA window healthy)" },
];

export const DEV_REMARKS: Remark[] = [
  { id: "r1", author: "Ravi Kumar",  initials: "RK", avatarColor: "bg-orange-200 text-orange-600", role: "Allocator",
    timestamp: "Apr 22 · 11:04", text: "Client confirmed they'd like to move 2 candidates to onsite next week.",
    replies: [
      { id: "r1a", author: "Priya Shetty", initials: "PS", avatarColor: "bg-teal-200 text-teal-600", role: "POC",
        timestamp: "Apr 22 · 11:32", text: "Noted — I'll align mentor sessions for Aman and Riya before Friday." },
    ] },
  { id: "r2", author: "Asha Mehra", initials: "AM", avatarColor: "bg-plum-400/30 text-plum-400", role: "Admin",
    timestamp: "Apr 23 · 09:15", text: "Looped in. Please log readiness scores after each session." },
];

export const DEV_CANDIDATES: LmpCandidate[] = [
  { id: "c1", name: "Aman Gupta",   initials: "AG", avatarColor: "bg-orange-200 text-orange-600", round: "R3 — Case" },
  { id: "c2", name: "Riya Sen",     initials: "RS", avatarColor: "bg-teal-200 text-teal-600",     round: "R2 — Technical" },
  { id: "c3", name: "Vikram Joshi", initials: "VJ", avatarColor: "bg-yellow-200 text-yellow-600", round: "R2 — Technical" },
  { id: "c4", name: "Neha Pillai",  initials: "NP", avatarColor: "bg-sage-200 text-sage-600",     round: "R1 — HR" },
  { id: "c5", name: "Karan Mehta",  initials: "KM", avatarColor: "bg-plum-400/30 text-plum-400",  round: "R1 — HR" },
];

export const DEV_LMP_SESSIONS: LmpSession[] = [
  { id: "s1", mentor: "Rahul Verma",  candidate: "Aman Gupta",   status: "Completed" },
  { id: "s2", mentor: "Devon Park",   candidate: "Riya Sen",     status: "Scheduled" },
  { id: "s3", mentor: "Mei Tanaka",   candidate: "Vikram Joshi", status: "Scheduled" },
  { id: "s4", mentor: "Aditi Rao",    candidate: "Neha Pillai",  status: "Cancelled" },
];

// ── From mockSessions ───────────────────────────────────────────────

export const DEV_SESSIONS: Session[] = [
  {
    id: "S-9001", reqId: "REQ-1042",
    mentor: { name: "Rahul Verma", initials: "RV", color: "bg-teal-200 text-teal-600", role: "Senior PM", company: "Razorpay" },
    candidate: { name: "Aanya Roy", initials: "AR", color: "bg-orange-200 text-orange-600" },
    date: "2026-05-02T15:00", dateLabel: "May 2, 2026 · 3:00 PM",
    round: "R2 — Technical", status: "scheduled",
  },
  {
    id: "S-9002", reqId: "REQ-1042",
    mentor: { name: "Anita Krishnan", initials: "AK", color: "bg-orange-200 text-orange-600", role: "Senior PM", company: "Vercel" },
    candidate: { name: "Karthik Iyer", initials: "KI", color: "bg-sage-200 text-sage-600" },
    date: "2026-04-26T11:00", dateLabel: "Apr 26, 2026 · 11:00 AM",
    round: "R1 — Intro", status: "feedback-pending",
    pocFeedbackSubmitted: true, studentFeedbackSubmitted: false,
    studentToken: "fb_8H2k9LmQ3xRpW7vN",
  },
  {
    id: "S-9003", reqId: "REQ-1042",
    mentor: { name: "Dev Sundaram", initials: "DS", color: "bg-teal-200 text-teal-600", role: "Group PM", company: "Atlassian" },
    candidate: { name: "Maya Holm", initials: "MH", color: "bg-plum-400/30 text-plum-400" },
    date: "2026-04-22T16:30", dateLabel: "Apr 22, 2026 · 4:30 PM",
    round: "R2 — Technical", status: "completed",
  },
  {
    id: "S-9004", reqId: "REQ-1042",
    mentor: { name: "Hiro Tanaka", initials: "HT", color: "bg-yellow-200 text-yellow-600", role: "Principal PM", company: "Datadog" },
    candidate: { name: "Sara Lin", initials: "SL", color: "bg-sky-400/20 text-sky-400" },
    date: "2026-04-18T09:00", dateLabel: "Apr 18, 2026 · 9:00 AM",
    round: "R1 — Intro", status: "no-show",
  },
  {
    id: "S-9005", reqId: "REQ-1042",
    mentor: { name: "Priya Anand", initials: "PA", color: "bg-plum-400/30 text-plum-400", role: "Senior PM", company: "Zomato" },
    candidate: { name: "Vikram Soni", initials: "VS", color: "bg-coral-50 text-coral-600" },
    date: "2026-04-15T14:00", dateLabel: "Apr 15, 2026 · 2:00 PM",
    round: "R3 — Converted ", status: "closed",
    pocFeedbackSubmitted: true, studentFeedbackSubmitted: true,
  },
];

// ── From mockMentors ────────────────────────────────────────────────

export { MENTORS as DEV_MENTORS } from "./mockMentors";
