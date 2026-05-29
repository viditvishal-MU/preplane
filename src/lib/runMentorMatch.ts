/**
 * Standalone mentor-matching orchestrator used by the "Run Mentor" modal
 * on /mentors. Reuses the same scoring pipeline as the LMP MentorsTab via
 * `@/lib/mentorPipeline` so results stay consistent.
 *
 * Adds two extra "always-on" candidate buckets:
 *   - Previously aligned mentors (`lmp_mentors`)
 *   - Mentors who have conducted sessions (`sessions`)
 * Both are tagged via `extraTags` so they surface as badges in the result UI.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Mentor, MentorSource } from "@/lib/mockMentors";
import { getScoringWeights } from "@/lib/scoringWeights";
import {
  fetchLinkedIn, generateExternalQueries, setExternalSearchContext,
  type ExternalPlatform,
} from "@/lib/externalMentors";
import { getExternalDiscoveryConfig } from "@/lib/externalDiscoveryConfig";
import { extractSkillsFromText, extractSeniority } from "@/lib/jdStore";
import {
  normaliseDbMentor, normaliseExternal, normaliseALU,
  runPipeline,
  type ScoringCandidate, type MatchMode,
} from "@/lib/mentorPipeline";
import type { ALUMentor } from "@/lib/alumniStore";

export type RunMentorInput = {
  jdText?: string;
  selectedSkills: string[];
  role: string;
  company: string;
  industry: string;
  seniority?: string;
  sources: MentorSource[];           // ["MU","ALU","EXT"]
  matchMode: MatchMode;
};

export type RunMentorStepId = "MU" | "ALU" | "EXT" | "PRIOR" | "RANK";

export type RunMentorResult = {
  suggested: Mentor[];
  counts: { MU: number; ALU: number; EXT: number; prior: number; aligned: number };
};

export async function runMentorMatch(
  input: RunMentorInput,
  ctx: {
    allMentors: any[];                       // from useAllMentors
    alumniMentors: ALUMentor[];              // from useAlumniMentors
    onStep?: (id: RunMentorStepId) => void;
    onError?: (msg: string) => void;
  },
): Promise<RunMentorResult> {
  const cfg = getExternalDiscoveryConfig();
  const wantMU = input.sources.includes("MU");
  const wantALU = input.sources.includes("ALU");
  const wantEXT = input.sources.includes("EXT") && cfg.anyEnabled;

  // ── Derive JD info ──
  let jdSkills = input.selectedSkills.slice();
  let jdSeniority = input.seniority || "Mid";
  if (input.jdText && input.jdText.trim()) {
    jdSkills = Array.from(new Set([...jdSkills, ...extractSkillsFromText(input.jdText)]));
    if (!input.seniority) jdSeniority = extractSeniority(input.jdText);
  }
  const jdInfo = {
    jdSkills,
    jdRole: input.role || "",
    jdSeniority,
    jdCompany: input.company || "",
    jdIndustry: input.industry || "",
    gapSkills: [] as string[],
  };

  const raw: ScoringCandidate[] = [];

  // ── MU + ALU (from already-loaded mentors table) ──
  if (wantMU) {
    ctx.onStep?.("MU");
    const muRows = ctx.allMentors.filter((m: any) => (m.source || "MU") === "MU");
    raw.push(...muRows.map(normaliseDbMentor));
  }
  if (wantALU) {
    ctx.onStep?.("ALU");
    raw.push(...ctx.alumniMentors.map(normaliseALU));
  }

  // ── External AI discovery ──
  // Needs a role — fall back to the top JD skill so users who only paste skills
  // still get external results instead of a 400 "role required".
  const extRole = jdInfo.jdRole || jdInfo.jdSkills[0] || "";
  if (wantEXT && extRole) {
    ctx.onStep?.("EXT");
    try {
      setExternalSearchContext({
        role: extRole,
        company: jdInfo.jdCompany,
        industry: jdInfo.jdIndustry,
        skills: jdInfo.jdSkills,
        seniority: jdInfo.jdSeniority,
      });
      const queries = generateExternalQueries({
        role: extRole,
        company: jdInfo.jdCompany,
        industry: jdInfo.jdIndustry,
        required_skills: jdInfo.jdSkills,
        seniority_level: jdInfo.jdSeniority,
      });
      const res = await fetchLinkedIn(queries, cfg);
      if (res.errors.length) {
        const fatal = res.errors.find((e) => !e.recoverable);
        if (fatal) ctx.onError?.(fatal.message);
      }
      raw.push(...res.mentors.map(normaliseExternal));
    } catch (e) {
      ctx.onError?.(e instanceof Error ? e.message : String(e));
    }
  }

  // ── Previously aligned + Prior-session mentors ──
  ctx.onStep?.("PRIOR");
  let alignedIds = new Set<string>();
  let priorSessionCounts = new Map<string, number>();
  try {
    const [alignedRes, sessionRes] = await Promise.all([
      supabase
        .from("lmp_mentors")
        .select("mentor_id, status")
        .not("status", "in", '("removed","cancelled")'),
      supabase
        .from("sessions")
        .select("mentor_id, status")
        .in("status", ["completed", "done"]),
    ]);
    if (!alignedRes.error && alignedRes.data) {
      alignedRes.data.forEach((r: any) => r.mentor_id && alignedIds.add(r.mentor_id));
    }
    if (!sessionRes.error && sessionRes.data) {
      sessionRes.data.forEach((r: any) => {
        if (!r.mentor_id) return;
        priorSessionCounts.set(r.mentor_id, (priorSessionCounts.get(r.mentor_id) || 0) + 1);
      });
    }
  } catch (e) {
    // Non-fatal — proceed without prior-session boost.
  }

  // Tag any existing candidates and pull in any missing mentors from
  // ctx.allMentors that are aligned / have prior sessions.
  const byId = new Map(raw.map((c) => [c.id, c]));
  const ensure = (id: string) => {
    if (byId.has(id)) return byId.get(id)!;
    const row = ctx.allMentors.find((m: any) => m.id === id);
    if (!row) return null;
    const c = normaliseDbMentor(row);
    raw.push(c);
    byId.set(id, c);
    return c;
  };
  let priorBucket = 0, alignedBucket = 0;
  alignedIds.forEach((id) => {
    const c = ensure(id);
    if (!c) return;
    alignedBucket++;
    c.extraTags = [...(c.extraTags ?? []), { emoji: "🔗", label: "Previously aligned" }];
  });
  priorSessionCounts.forEach((n, id) => {
    const c = ensure(id);
    if (!c) return;
    priorBucket++;
    c.extraTags = [...(c.extraTags ?? []), { emoji: "🎙️", label: `Prior sessions · ${n}` }];
    c.sessions_taken = (c.sessions_taken ?? 0) + n;
  });

  // ── Rank ──
  ctx.onStep?.("RANK");
  const suggested = runPipeline(raw, jdInfo, getScoringWeights(), input.matchMode);

  return {
    suggested,
    counts: {
      MU: suggested.filter((m) => m.source === "MU").length,
      ALU: suggested.filter((m) => m.source === "ALU").length,
      EXT: suggested.filter((m) => m.source === "EXT").length,
      prior: priorBucket,
      aligned: alignedBucket,
    },
  };
}
