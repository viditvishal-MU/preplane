import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, Star, Copy, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  session_type: string | null;
  status: string;
  scheduled_at: string | null;
  mentor_rating: number | null;
  student_rating: number | null;
  poc_feedback: string | null;
  student_feedback: any | null;
  student_feedback_token: string | null;
  mentor_id: string | null;
  student_id: string | null;
  candidate_ids: string[] | null;
  mentors: { id: string; name: string } | null;
  students: { id: string; name: string } | null;
};

function studentRating(s: Row): number | null {
  if (s.student_rating != null) return Number(s.student_rating);
  const r = s.student_feedback?.rating;
  return r != null && !isNaN(Number(r)) ? Number(r) : null;
}

function pocRating(s: Row): number | null {
  if (s.mentor_rating != null && !isNaN(Number(s.mentor_rating))) return Number(s.mentor_rating);
  // Fallback: derive from poc_feedback JSON (form values keyed by field id).
  const raw = s.poc_feedback;
  if (!raw) return null;
  let parsed: any = raw;
  if (typeof raw === "string") {
    try { parsed = JSON.parse(raw); } catch { return null; }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const ratings: number[] = [];
  for (const v of Object.values(parsed)) {
    if (typeof v === "number" && v >= 1 && v <= 5) ratings.push(v);
    else if (v && typeof v === "object") {
      for (const inner of Object.values(v as any)) {
        const n = Number(inner);
        if (!isNaN(n) && n >= 1 && n <= 5) ratings.push(n);
      }
    }
  }
  return ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
}

/**
 * Combined per-session mentor rating: average of POC's mentor_rating and the
 * student-submitted rating when both exist; otherwise whichever is present.
 * Returns null when neither side has rated.
 */
function combinedSessionRating(s: Row): number | null {
  const parts = [pocRating(s), studentRating(s)].filter((r): r is number => r != null);
  if (!parts.length) return null;
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

// Kept for the per-row "Student Feedback" cell which shows only the student's stars.
const ratingFromFeedback = studentRating;

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export function FeedbackTab({ reqId: lmpId }: { reqId: string }) {
  const qc = useQueryClient();
  const [regenId, setRegenId] = useState<string | null>(null);

  const { data: sessions = [], isLoading } = useQuery({
    enabled: !!lmpId,
    queryKey: ["lmp-sessions", lmpId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, session_type, status, scheduled_at, mentor_rating, student_rating, poc_feedback, student_feedback, student_feedback_token, mentor_id, student_id, candidate_ids, mentors:mentors(id,name), students:students(id,name)")
        .eq("lmp_id", lmpId)
        .order("scheduled_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  // Resolve names for every candidate_ids entry across all sessions.
  const extraStudentIds = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) {
      for (const id of s.candidate_ids ?? []) {
        if (id && id !== s.student_id) set.add(id);
      }
    }
    return Array.from(set);
  }, [sessions]);

  const { data: extraStudents = [] } = useQuery({
    enabled: extraStudentIds.length > 0,
    queryKey: ["lmp-sessions-extra-students", lmpId, extraStudentIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, name")
        .in("id", extraStudentIds);
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const studentsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sessions) {
      if (s.students?.id) map.set(s.students.id, s.students.name);
    }
    for (const s of extraStudents) map.set(s.id, s.name);
    return map;
  }, [sessions, extraStudents]);

  const candidateNames = (s: Row): string[] => {
    const ids = (s.candidate_ids?.length ? s.candidate_ids : (s.student_id ? [s.student_id] : []));
    return ids.map((id) => studentsById.get(id) ?? "Unknown").filter(Boolean);
  };

  const totals = useMemo(() => {
    const total = sessions.length;
    const poc = sessions.filter((s) => !!s.poc_feedback).length;
    const student = sessions.filter((s) => !!s.student_feedback).length;
    const ratings = sessions.map(combinedSessionRating).filter((r): r is number => r != null);
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    return { total, poc, student, avg, ratingsCount: ratings.length };
  }, [sessions]);

  const groups = useMemo(() => {
    const map = new Map<string, { mentorId: string | null; mentorName: string; rows: Row[] }>();
    for (const s of sessions) {
      const key = s.mentor_id ?? "unassigned";
      const name = s.mentors?.name ?? "Unassigned mentor";
      if (!map.has(key)) map.set(key, { mentorId: s.mentor_id, mentorName: name, rows: [] });
      map.get(key)!.rows.push(s);
    }
    return Array.from(map.values()).map((g) => {
      const ratings = g.rows.map(combinedSessionRating).filter((r): r is number => r != null);
      return {
        ...g,
        avg: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
        submitted: ratings.length,
      };
    });
  }, [sessions]);

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/feedback/${token}`);
    toast.success("Student feedback link copied");
  };

  const regenerate = async () => {
    if (!regenId) return;
    const newToken = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase
      .from("sessions")
      .update({ student_feedback_token: newToken })
      .eq("id", regenId);
    if (error) { toast.error(`Failed: ${error.message}`); return; }
    toast.success("Token regenerated");
    qc.invalidateQueries({ queryKey: ["lmp-sessions", lmpId] });
    setRegenId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-n500 text-[13px]">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading feedback…
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div>
        <h3 className="text-[18px] font-semibold text-n900 mb-3">Feedback Tracker</h3>
        <div className="rounded-2xl bg-white border border-dashed border-n300 p-12 text-center text-[13px] text-n500">
          No sessions scheduled for this LMP process yet. Once the POC fills mentor feedback or the student submits via their link, it will appear here.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[18px] font-semibold text-n900">Feedback Tracker</h3>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Stat label="Total sessions" value={totals.total} tone="n" />
        <Stat label="POC submitted" value={`${totals.poc}/${totals.total}`} tone="sage" />
        <Stat label="Student submitted" value={`${totals.student}/${totals.total}`} tone="orange" />
        <Stat
          label={`Avg mentor rating${totals.ratingsCount ? ` (${totals.ratingsCount})` : ""}`}
          value={totals.ratingsCount ? totals.avg.toFixed(2) : "—"}
          tone="amber"
          title="Average of POC and student ratings per session. Sessions where only the POC has rated still contribute the POC's score."
        />
      </div>

      <div className="space-y-5">
        {groups.map((g) => (
          <div key={g.mentorId ?? "unassigned"} className="rounded-2xl bg-white border border-n200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-n50 border-b border-n100">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-semibold text-n800">{g.mentorName}</span>
                <span className="text-[11px] text-n500">{g.rows.length} session{g.rows.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-amber-600">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="tabular-nums font-medium">
                  {g.submitted ? g.avg.toFixed(2) : "—"}
                </span>
                <span className="text-n400">({g.submitted} feedback{g.submitted !== 1 ? "s" : ""})</span>
              </div>
            </div>

            <table className="w-full text-[13px]">
              <thead className="text-n500 text-[11px] uppercase tracking-[0.5px] border-b border-n100">
                <tr>
                  <Th>Session</Th>
                  <Th>Candidate</Th>
                  <Th>Date</Th>
                  <Th>POC Feedback</Th>
                  <Th>Student Feedback</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((s, i) => {
                  const hasPoc = !!s.poc_feedback;
                  const hasStudent = !!s.student_feedback;
                  const rating = ratingFromFeedback(s);
                  const names = candidateNames(s);
                  const isGroup = names.length > 1;
                  return (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-t border-n100 hover:bg-n50/60 transition-colors"
                    >
                      <Td className="font-medium text-n800">
                        {(s.session_type ?? "session").replace(/^./, c => c.toUpperCase())}
                        {isGroup && (
                          <span className="ml-1.5 inline-flex items-center rounded-full bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 text-[10px] font-semibold">
                            Group · {names.length}
                          </span>
                        )}
                      </Td>
                      <Td title={isGroup ? names.join(", ") : undefined}>
                        {names.length === 0 ? "—" : isGroup ? (
                          <div className="flex flex-col gap-0.5">
                            {names.slice(0, 3).map((n, idx) => (
                              <span key={idx} className="text-n700">{n}</span>
                            ))}
                            {names.length > 3 && (
                              <span className="text-n500 text-[11.5px]">+{names.length - 3} more</span>
                            )}
                          </div>
                        ) : names[0]}
                      </Td>
                      <Td className="text-n600 whitespace-nowrap">{fmtDate(s.scheduled_at)}</Td>
                      <Td>
                        {hasPoc ? (
                          <span className="inline-flex items-center gap-1.5 text-sage-600">
                            ✓ Submitted
                            {s.mentor_rating != null && (
                              <span className="inline-flex items-center gap-0.5 text-amber-600 ml-1">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                <span className="tabular-nums">{Number(s.mentor_rating).toFixed(1)}</span>
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-yellow-600">⏳ Pending</span>
                        )}
                      </Td>
                      <Td>
                        {hasStudent ? (
                          <span className="inline-flex items-center gap-1.5 text-sage-600">
                            ✓ Submitted
                            {rating != null && (
                              <span className="inline-flex items-center gap-0.5 text-amber-600 ml-1">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                <span className="tabular-nums">{rating.toFixed(1)}</span>
                              </span>
                            )}
                          </span>
                        ) : s.student_feedback_token ? (
                          <span className="inline-flex items-center gap-2 text-n500">
                            ⏳ Waiting
                            <button
                              onClick={() => copyLink(s.student_feedback_token!)}
                              className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 font-medium"
                            >
                              <Copy className="h-3 w-3" /> Copy link
                            </button>
                            <button
                              onClick={() => setRegenId(s.id)}
                              className="inline-flex items-center gap-1 text-coral-600 hover:text-coral-700 font-medium"
                            >
                              <RefreshCcw className="h-3 w-3" /> Regenerate
                            </button>
                          </span>
                        ) : (
                          <span className="text-n400">— Awaiting POC</span>
                        )}
                      </Td>
                      <Td>
                        {hasPoc && hasStudent ? (
                          <Pill tone="sage">Closed</Pill>
                        ) : hasPoc || hasStudent ? (
                          <Pill tone="yellow">In progress</Pill>
                        ) : (
                          <Pill tone="n">Pending</Pill>
                        )}
                      </Td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <Dialog open={!!regenId} onOpenChange={(o) => !o && setRegenId(null)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-semibold text-n900">Regenerate token?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-n600">
            The previous link will stop working and the student will need the new one.
          </p>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={regenerate}
              className="flex-1 h-10 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-medium transition-colors"
            >
              Yes, regenerate
            </button>
            <button onClick={() => setRegenId(null)} className="h-10 px-4 text-[13px] text-n500 hover:text-n800 font-medium">
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, tone, title }: { label: string; value: number | string; tone: "n" | "sage" | "orange" | "amber"; title?: string }) {
  const cls = {
    n:      "bg-n100 text-n700 border-n200",
    sage:   "bg-sage-50 text-sage-700 border-sage-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    amber:  "bg-amber-50 text-amber-700 border-amber-200",
  }[tone];
  return (
    <span title={title} className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium", title ? "cursor-help" : "", cls)}>
      <span className="tabular-nums font-bold">{value}</span>
      <span>{label}</span>
    </span>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "sage" | "yellow" | "n" }) {
  const cls = {
    sage:   "bg-sage-50 text-sage-600 border-sage-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    n:      "bg-n100 text-n600 border-n200",
  }[tone];
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", cls)}>
      {children}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left font-medium px-4 py-2.5">{children}</th>;
}
function Td({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) {
  return <td title={title} className={cn("px-4 py-3 text-n700", className)}>{children}</td>;
}
