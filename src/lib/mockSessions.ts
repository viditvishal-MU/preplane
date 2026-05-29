export type SessionStatus =
  | "scheduled"
  | "completed"
  | "no-show"
  | "rescheduled"
  | "feedback-pending"
  | "closed";

export type Person = { name: string; initials: string; color: string; role?: string; company?: string };

export type Session = {
  id: string;
  reqId: string;
  mentor: Person;
  candidate: Person;
  date: string; // ISO
  dateLabel: string;
  round: string;
  status: SessionStatus;
  pocFeedbackSubmitted?: boolean;
  studentFeedbackSubmitted?: boolean;
  studentToken?: string;
  tokenRegenerated?: boolean;
  notes?: string;
  groupId?: string;
  groupSize?: number;
};

export const SESSIONS: Session[] = [
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

export const STATUS_META: Record<SessionStatus, { label: string; chip: string; pulse?: boolean }> = {
  "scheduled":         { label: "Scheduled",        chip: "bg-teal-50 text-teal-600 border-teal-200" },
  "completed":         { label: "Completed",        chip: "bg-sage-50 text-sage-600 border-sage-200" },
  "no-show":           { label: "No-show",          chip: "bg-coral-50 text-coral-600 border-coral-200" },
  "rescheduled":       { label: "Rescheduled",      chip: "bg-yellow-50 text-yellow-600 border-yellow-200" },
  "feedback-pending":  { label: "Feedback Pending", chip: "bg-orange-50 text-orange-600 border-orange-200", pulse: true },
  "closed":            { label: "Closed",           chip: "bg-n100 text-n500 border-n200" },
};

export function generateToken() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "fb_";
  for (let i = 0; i < 16; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function findSessionByToken(token: string): Session | undefined {
  return SESSIONS.find((s) => s.studentToken === token);
}

// Simulate expired tokens by checking length flag — for demo, treat tokens starting with "fb_EXP" as expired
export function isTokenExpired(token: string): boolean {
  return token.startsWith("fb_EXP");
}