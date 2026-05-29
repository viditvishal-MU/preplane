export type HistoryStatus = "open" | "closed" | "converted" | "not-converted";

export type HistoryRun = {
  id: string;
  date: string;
  role: string;
  company: string;
  cohort: string;
  candidates: number;
  sources: ("MU" | "ALU" | "EXT")[];
  matches: number;
  topScore: number;
  topMentor: string;
  rating: number;
  status: HistoryStatus;
  jdSummary: string;
  selectedMentor: { name: string; role: string; company: string };
  lmpOwner: string;
  sessionStatus: "scheduled" | "completed" | "missed" | "n/a";
  feedbackStatus: "submitted" | "pending" | "n/a";
};

export const HISTORY_RUNS: HistoryRun[] = [
  {
    id: "RUN-2042", date: "Apr 22, 2026", role: "Product Manager", company: "Swiggy",
    cohort: "TBM · C7", candidates: 5, sources: ["MU", "ALU"],
    matches: 42, topScore: 92, topMentor: "Anita Krishnan", rating: 4.8, status: "open",
    jdSummary: "Senior PM role for the Instamart vertical, focused on growth + retention experiments.",
    selectedMentor: { name: "Anita Krishnan", role: "Senior PM", company: "Vercel" },
    lmpOwner: "Priya Shetty", sessionStatus: "scheduled", feedbackStatus: "pending",
  },
  {
    id: "RUN-2041", date: "Apr 18, 2026", role: "Senior Backend Engineer", company: "Razorpay",
    cohort: "YLC · C1", candidates: 8, sources: ["MU", "EXT"],
    matches: 28, topScore: 87, topMentor: "Dev Sundaram", rating: 4.5, status: "open",
    jdSummary: "Staff-track backend role, strong distributed-systems bias.",
    selectedMentor: { name: "Dev Sundaram", role: "Group PM", company: "Atlassian" },
    lmpOwner: "Asha Mehra", sessionStatus: "completed", feedbackStatus: "submitted",
  },
  {
    id: "RUN-2039", date: "Apr 02, 2026", role: "Data Scientist", company: "Zerodha",
    cohort: "TBM · C7", candidates: 4, sources: ["ALU"],
    matches: 19, topScore: 81, topMentor: "Maya Holm", rating: 4.7, status: "converted",
    jdSummary: "Quant DS role on the equities team, time-series + risk modelling.",
    selectedMentor: { name: "Maya Holm", role: "Director of Product", company: "Stripe" },
    lmpOwner: "Devon Park", sessionStatus: "completed", feedbackStatus: "submitted",
  },
  {
    id: "RUN-2034", date: "Mar 14, 2026", role: "Staff Engineer", company: "PhonePe",
    cohort: "YLC · C1", candidates: 6, sources: ["MU", "ALU", "EXT"],
    matches: 15, topScore: 76, topMentor: "Hiro Tanaka", rating: 4.1, status: "not-converted",
    jdSummary: "Staff IC role — payments infra, tier-1 product surface.",
    selectedMentor: { name: "Hiro Tanaka", role: "Principal PM", company: "Datadog" },
    lmpOwner: "Aditi Rao", sessionStatus: "completed", feedbackStatus: "submitted",
  },
  {
    id: "RUN-2031", date: "Feb 28, 2026", role: "Design Lead", company: "Cred",
    cohort: "TBM · C7", candidates: 3, sources: ["EXT"],
    matches: 4, topScore: 68, topMentor: "—", rating: 0, status: "closed",
    jdSummary: "Design lead for the rewards surface — closed without offer.",
    selectedMentor: { name: "—", role: "—", company: "—" },
    lmpOwner: "—", sessionStatus: "n/a", feedbackStatus: "n/a",
  },
];