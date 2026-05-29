import { motion } from "framer-motion";
import { Zap, ArrowRight, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCapabilityNudges } from "@/lib/pocCapability";

const BASE_NUDGES = [
  { id: "p1", title: "PM @ Swiggy — mentor match not run yet", body: "Run now to surface MU + Alumni candidates.", cta: "Run match", onClick: undefined as undefined | (() => void) },
  { id: "p3", title: "Priya Sharma stuck in R2 for 10 days",    body: "Check in with the candidate or reschedule R3.", cta: "Open req", onClick: undefined },
  { id: "p4", title: "PM @ Zomato has no activity in 9 days",   body: "Update pipeline or mark dormant.",            cta: "Update", onClick: undefined },
];

export function PocSmartNudges() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data: pendingFeedback = [] } = useQuery({
    queryKey: ["poc-pending-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, lmp_id, scheduled_at, mentors:mentors(name), students:students(name)")
        .eq("status", "completed")
        .is("poc_feedback", null)
        .order("completed_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const items = useMemo(() => {
    const dbNudges = (pendingFeedback as any[]).map((s) => ({
      id: `pf-${s.id}`,
      title: `POC feedback pending — ${s.mentors?.name ?? "mentor"} × ${s.students?.name ?? "candidate"}`,
      body: "Submit POC feedback to unlock the student feedback link.",
      cta: "Fill feedback",
      onClick: () => s.lmp_id && navigate(`/lmp/${encodeURIComponent(s.lmp_id)}?tab=Sessions`),
    }));
    const cap = getCapabilityNudges().map((n) => ({
      id: n.id, title: n.title, body: n.body, cta: "Reassign cross-domain", onClick: undefined as undefined | (() => void),
    }));
    return [...dbNudges, ...cap, ...BASE_NUDGES].filter((n) => !dismissed.has(n.id));
  }, [pendingFeedback, dismissed, navigate]);

  const dismiss = (id: string) => setDismissed((s) => new Set(s).add(id));

  if (items.length === 0) {
    return (
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h4 className="text-[18px] font-semibold text-n900">Smart Nudges</h4>
        </div>
        <div className="rounded-xl border border-dashed border-n300 bg-white p-6 text-center text-[13px] text-n500">
          You're all caught up.
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h4 className="text-[18px] font-semibold text-n900">Smart Nudges</h4>
        <button onClick={() => setDismissed(new Set(items.map((i) => i.id)))} className="text-[12px] text-n500 hover:text-n900 hover:bg-n100 rounded-md px-2 py-1 transition-colors">
          Dismiss All
        </button>
      </div>
      <div className="-mx-1 overflow-x-auto">
        <ul className="flex gap-3 px-1 pb-1 snap-x">
          {items.map((n, i) => (
            <motion.li
              key={n.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22, delay: i * 0.06 }}
              className="snap-start shrink-0 w-[280px] rounded-xl bg-orange-50 border border-orange-200 p-4 relative"
            >
              <button
                onClick={() => dismiss(n.id)}
                className="absolute top-2 right-2 h-6 w-6 grid place-items-center rounded-md text-orange-500/70 hover:text-orange-600 hover:bg-orange-100 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
              <div className="h-7 w-7 rounded-md bg-white text-orange-500 grid place-items-center mb-2 shadow-sm">
                <Zap className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <div className="text-[14px] font-medium text-n800 leading-snug pr-4">{n.title}</div>
              <div className="text-[13px] text-n600 mt-1 leading-snug">{n.body}</div>
              <button
                onClick={n.onClick}
                className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-orange-600 hover:text-orange-500 transition-colors"
              >
                {n.cta} <ArrowRight className="h-3 w-3" strokeWidth={2} />
              </button>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
