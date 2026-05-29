import { Users2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import type { Mentor } from "@/lib/mockMentors";
import type { Candidate, Round } from "@/lib/mockLmpData";

export type Assignment = {
  id: string;
  mentor: Mentor;
  candidate: Candidate;
  round: Round;
  role: string;
  status: "Pending" | "Confirmed" | "Completed";
  assignedAt: string;
};

const STATUS_STYLE: Record<Assignment["status"], string> = {
  Pending:   "bg-yellow-50 border-yellow-200 text-yellow-600",
  Confirmed: "bg-sage-50 border-sage-200 text-sage-600",
  Completed: "bg-sky-400/10 border-sky-400/30 text-sky-400",
};

export function AssignedTable({
  assignments,
  onUnassign,
}: {
  assignments: Assignment[];
  onUnassign: (id: string) => void;
}) {
  if (assignments.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-n200 shadow-sm">
        <EmptyState
          icon={Users2}
          title="No mentors assigned yet"
          description="Assign a mentor from Suggested or Shortlisted to a candidate and round. Assignments persist across re-runs."
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-n200 shadow-sm overflow-hidden">
      <table className="w-full text-[13px]">
        <thead className="bg-n50 border-b border-n200 text-[11px] uppercase tracking-[0.5px] text-n500 font-medium">
          <tr>
            <Th>Mentor</Th>
            <Th>Candidate</Th>
            <Th>Round</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a) => (
            <tr key={a.id} className="border-b border-n100 last:border-0 hover:bg-n50/60 transition-colors">
              <Td>
                <div className="flex items-center gap-3">
                  <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-[12px] font-semibold", a.mentor.color)}>
                    {a.mentor.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-n900 truncate">{a.mentor.name}</div>
                    <div className="text-[12px] text-n500 truncate">{a.mentor.company}</div>
                  </div>
                </div>
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold", a.candidate.color)}>
                    {a.candidate.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] text-n800 truncate">{a.candidate.name}</div>
                    <div className="text-[11px] text-n500 truncate">{a.candidate.cohort}</div>
                  </div>
                </div>
              </Td>
              <Td className="text-n700">{a.round.name}</Td>
              <Td className="text-n700">{a.role}</Td>
              <Td>
                <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", STATUS_STYLE[a.status])}>
                  {a.status}
                </span>
              </Td>
              <Td className="text-right">
                <button
                  onClick={() => onUnassign(a.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-n300 bg-white text-n700 hover:bg-n100 text-[12px] font-medium px-2.5 py-1.5 transition-colors"
                  aria-label="Remove assignment"
                >
                  <X className="h-3.5 w-3.5" /> Unassign
                </button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("text-left px-4 py-2.5 font-medium", className)}>{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}