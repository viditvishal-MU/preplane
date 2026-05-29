import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { type Mentor, SOURCE_META, SCORE_DIM_COLORS, SCORE_DIM_MAX } from "@/lib/mockMentors";

const TABS = [
  "Overview", "Experience", "Match Analysis", "Decision Insights",
  "Remunerations", "Feedback & Ratings", "LMP History", "Interaction Log",
] as const;
type Tab = typeof TABS[number];

function useMentorSkills(mentorId: string | undefined) {
  return useQuery({
    enabled: !!mentorId,
    queryKey: ["mentor-skills", mentorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentors")
        .select("skill_tags")
        .eq("id", mentorId!)
        .maybeSingle();
      if (error) throw error;
      return (data?.skill_tags ?? []) as string[];
    },
  });
}

function useMentorReviews(mentorId: string | undefined) {
  return useQuery({
    enabled: !!mentorId,
    queryKey: ["mentor-reviews", mentorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, student_rating, mentor_rating, student_feedback, completed_at, students:students(name)")
        .eq("mentor_id", mentorId!)
        .or("student_rating.not.is.null,mentor_rating.not.is.null,student_feedback.not.is.null")
        .order("completed_at", { ascending: false, nullsFirst: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function MentorProfileDrawer({
  mentor, open, onOpenChange,
}: { mentor: Mentor | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [tab, setTab] = useState<Tab>("Overview");
  if (!mentor) return null;
  const meta = SOURCE_META[mentor.source];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[720px] sm:max-w-[720px] p-0 flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-n200">
          <div className="flex items-start gap-4">
            <div className={cn("h-14 w-14 rounded-full flex items-center justify-center text-[16px] font-semibold", mentor.color)}>
              {mentor.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[20px] font-semibold text-n900 truncate">{mentor.name}</div>
              <div className="text-[14px] text-n500 truncate">{mentor.role} @ {mentor.company}</div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.5px]", meta.chip)}>
                  {mentor.source}
                </span>
                <span className="text-[12px] text-n500">{mentor.seniority}</span>
              </div>
            </div>
            <div className="h-14 w-14 rounded-full bg-orange-50 border border-orange-200 flex flex-col items-center justify-center">
              <span className="text-[22px] font-bold text-orange-500 leading-none">{mentor.score}</span>
              <span className="text-[10px] text-orange-500/70">/ 45</span>
            </div>
          </div>
        </div>

        <div className="border-b border-n200 overflow-x-auto">
          <nav className="flex items-center gap-1 px-6">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-3 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors duration-150 whitespace-nowrap",
                  tab === t ? "text-orange-600 border-orange-500" : "text-n500 hover:text-n800 border-transparent",
                )}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === "Overview" && <OverviewBody mentor={mentor} />}
          {tab === "Match Analysis" && <MatchAnalysisBody mentor={mentor} />}
          {tab === "Decision Insights" && <DecisionInsightsBody mentor={mentor} />}
          {tab === "Feedback & Ratings" && <RatingsBody mentor={mentor} />}
          {(tab === "Experience" || tab === "Remunerations" || tab === "LMP History" || tab === "Interaction Log") && (
            <ComingSoon name={tab} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function OverviewBody({ mentor }: { mentor: Mentor }) {
  return (
    <div className="space-y-4 text-[14px] text-n700 leading-[1.6]">
      <p>
        {mentor.name.split(" ")[0]} brings deep experience in {mentor.role.toLowerCase()} roles, with a track record of mentoring candidates into similar positions at {mentor.company} and adjacent companies.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Sessions Done" value="38" />
        <Stat label="Avg Rating" value={`${mentor.rating.toFixed(1)} / 5`} />
        <Stat label="Goal Met" value={`${mentor.outcome}%`} />
        <Stat label="Languages" value="EN · HI" />
      </div>
    </div>
  );
}

function MatchAnalysisBody({ mentor }: { mentor: Mentor }) {
  const { data: skills = [], isLoading } = useMentorSkills(mentor.id);
  const dims = (Object.keys(mentor.scores) as (keyof Mentor["scores"])[]);
  return (
    <div className="space-y-6">
      <div>
        <h5 className="text-[13px] font-semibold text-n900 uppercase tracking-[0.5px] mb-2">5-Dimension Score</h5>
        <table className="w-full text-[13px]">
          <tbody>
            {dims.map((d) => (
              <tr key={d} className="border-b border-n100 last:border-0">
                <td className="py-2 capitalize text-n600 w-32">{d}</td>
                <td className="py-2 w-full">
                  <div className="h-1.5 rounded-full bg-n100 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", SCORE_DIM_COLORS[d])}
                      style={{ width: `${(mentor.scores[d] / SCORE_DIM_MAX[d]) * 100}%` }}
                    />
                  </div>
                </td>
                <td className="py-2 pl-3 text-right tabular-nums text-n700 font-medium w-16">
                  {mentor.scores[d]}/{SCORE_DIM_MAX[d]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h5 className="text-[13px] font-semibold text-n900 uppercase tracking-[0.5px] mb-2">Mentor Skills</h5>
        {isLoading ? (
          <div className="text-[12px] text-n500">Loading skills…</div>
        ) : skills.length === 0 ? (
          <div className="text-[12px] text-n500">No skills tagged for this mentor.</div>
        ) : (
          <ul className="grid grid-cols-2 gap-2 text-[13px]">
            {skills.map((s) => (
              <li key={s} className="flex items-center gap-2 rounded-lg bg-n50 border border-n200 px-3 py-2">
                <Check className="h-3.5 w-3.5 text-sage-600" strokeWidth={2.5} />
                <span className="text-n800">{s}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DecisionInsightsBody({ mentor }: { mentor: Mentor }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {mentor.decisionTags.map((t) => (
          <span key={t.label} className="rounded-full bg-orange-50 border border-orange-200 text-orange-700 px-2.5 py-0.5 text-[12px] font-medium">
            {t.emoji} {t.label}
          </span>
        ))}
        <span className="rounded-full bg-teal-50 border border-teal-200 text-teal-600 px-2.5 py-0.5 text-[12px] font-medium">
          🏢 Company Insider
        </span>
      </div>
      <div className="rounded-xl bg-n100 border border-n200 border-l-[3px] border-l-orange-500 p-4">
        <p className="text-[13px] text-n700 leading-[1.65]">
          Recommended primarily because {mentor.name.split(" ")[0]} has direct line-of-sight into the hiring team's process and a strong record of helping similar candidates clear the technical round. Risk: limited recent exposure to A/B-testing depth — pair with a Layer-2 mentor for the simulation round.
        </p>
      </div>
    </div>
  );
}

function RatingsBody({ mentor }: { mentor: Mentor }) {
  const { data: reviews = [], isLoading } = useMentorReviews(mentor.id);
  const data = [
    { name: "Goal Met", value: mentor.outcome },
    { name: "Goal Missed", value: 100 - mentor.outcome },
  ];
  const COLORS = ["hsl(var(--sage-400))", "hsl(var(--n200))"];
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="text-[28px] font-bold text-orange-500 tabular-nums">{mentor.rating.toFixed(1)}</div>
          <div className="text-[11px] text-n500">{mentor.reviews} reviews</div>
        </div>
        <div className="h-24 w-24">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={28} outerRadius={42} startAngle={90} endAngle={-270}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-[12px]">
          <div className="text-sage-600 font-medium">{mentor.outcome}% Goal Met</div>
          <div className="text-n500 mt-1">Across last {mentor.reviews} sessions</div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-[12px] text-n500">Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <div className="text-[12px] text-n500 rounded-xl border border-dashed border-n200 p-4 text-center">No feedback yet.</div>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r: any) => {
            const rating = Number(
              r.student_rating ?? r.mentor_rating ?? r.student_feedback?.rating ?? 0
            );
            const text = r.student_feedback?.notes || r.student_feedback?.comments || r.student_feedback?.text || "";
            const author = r.students?.name || "Anonymous";
            const stars = Math.max(0, Math.min(5, Math.round(rating)));
            return (
              <li key={r.id} className="rounded-xl border border-n200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-medium text-n800">{author}</div>
                  <div className="text-yellow-500 text-[12px]">{"★".repeat(stars)}{"☆".repeat(5 - stars)}</div>
                </div>
                {text && <p className="mt-1 text-[13px] text-n600 leading-[1.6]">{text}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-n50 border border-n200 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.5px] text-n400 font-medium">{label}</div>
      <div className="text-[15px] font-semibold text-n900 tabular-nums">{value}</div>
    </div>
  );
}

function ComingSoon({ name }: { name: string }) {
  return (
    <div className="text-center py-12">
      <h4 className="text-[16px] font-semibold text-n800">{name}</h4>
      <p className="text-[13px] text-n500 mt-1">Wired up in a later prompt.</p>
    </div>
  );
}