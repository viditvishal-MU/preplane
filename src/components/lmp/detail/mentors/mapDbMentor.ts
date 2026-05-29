import type { Mentor } from "@/lib/mockMentors";
import type { LmpMentorRow } from "@/lib/hooks/useLmpMentorsLive";

const PALETTE = [
  "bg-orange-200 text-orange-600",
  "bg-teal-200 text-teal-600",
  "bg-sage-200 text-sage-600",
  "bg-yellow-200 text-yellow-600",
  "bg-plum-400/30 text-plum-400",
];

function deriveInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function pickColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

/** Map a joined lmp_mentors row (mentor join) into the UI `Mentor` shape. */
export function lmpMentorRowToMentor(row: LmpMentorRow): Mentor | null {
  const m = row.mentor;
  if (!m) return null;
  const source: Mentor["source"] = m.source === "MU" || m.source === "ALU" ? m.source : "EXT";
  return {
    id: m.id,
    name: m.name ?? "",
    initials: deriveInitials(m.name ?? ""),
    color: pickColor(m.id ?? m.name ?? ""),
    role: m.designation ?? m.role ?? "",
    company: m.company ?? "",
    source,
    score: Math.round(((m.rating ?? 0) as number) * 20),
    scores: { role: 0, skills: 0, company: 0, industry: 0, seniority: 0 },
    layer: "",
    decisionTags: [],
    rating: Number(m.rating ?? 0),
    reviews: 0,
    outcome: 0,
    availability: (m.availability ?? "available") as Mentor["availability"],
    email: m.email ?? "",
    phone: "",
    seniority: (m.seniority ?? "Mid") as Mentor["seniority"],
    linkedin: m.linkedin ?? undefined,
  };
}
