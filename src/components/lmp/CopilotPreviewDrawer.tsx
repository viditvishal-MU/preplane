import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X, Link2, ArrowUpRight, type LucideIcon,
  Users, Calendar, Briefcase, GraduationCap, UserCircle2, Clock, ShieldCheck, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PreviewPayload, PreviewKind } from "@/lib/copilotEngine";

const ICONS: Record<PreviewKind, LucideIcon> = {
  "poc-dashboard": Users,
  "poc-workload":  Users,
  "my-tasks":      Calendar,
  "process":   Briefcase,
  "student":       GraduationCap,
  "mentor":        UserCircle2,
  "timeline":      Clock,
  "sla":           ShieldCheck,
  "lmp-board":     Activity,
  "risk":          ShieldCheck,
};

type Fact = { label: string; value: string; tone?: "ok" | "warn" | "risk" };

function toneClass(tone?: Fact["tone"]) {
  switch (tone) {
    case "ok":   return "text-sage-600";
    case "warn": return "text-yellow-600";
    case "risk": return "text-coral-600";
    default:     return "text-n900";
  }
}

function buildContent(p: PreviewPayload): {
  title: string; subtitle: string; facts?: Fact[];
  sections?: { heading: string; items: string[] }[];
  table?: { columns: string[]; rows: (string | { value: string; tone?: Fact["tone"] })[][] };
  activity?: string[];
} {
  switch (p.kind) {
    case "poc-dashboard":
    case "poc-workload":
      return {
        title: "POC Dashboard",
        subtitle: "Active workload overview",
        facts: [
          { label: "Active POCs",     value: "12" },
          { label: "Overloaded",      value: "3", tone: "warn" },
          { label: "SLA risks",       value: "5", tone: "risk" },
          { label: "Stuck students",  value: "8", tone: "risk" },
        ],
        table: {
          columns: ["POC", "Active processes", "SLA risk", "Stuck"],
          rows: [
            ["Priya Shetty", "7", { value: "2", tone: "warn" }, { value: "1", tone: "risk" }],
            ["Rahul Verma",  "5", { value: "1", tone: "warn" }, { value: "0", tone: "ok" }],
            ["Namita Iyer",  "4", { value: "0", tone: "ok" },   { value: "2", tone: "risk" }],
            ["Karan Mehta",  "6", { value: "3", tone: "risk" }, { value: "1", tone: "risk" }],
          ],
        },
      };
    case "my-tasks":
      return {
        title: "My Tasks",
        subtitle: "Today's pending LMP actions",
        sections: [
          { heading: "Due today",        items: ["Approve prep guide — Riya Kapoor", "Confirm mentor align — Razorpay PM"] },
          { heading: "Overdue",          items: ["Mock feedback — Aditi Rao (2d)", "POC sync — Meesho Growth (3d)"] },
          { heading: "Recently assigned", items: ["LMP-2042 reassignment", "Atlassian PM intake"] },
          { heading: "Needs follow-up",  items: ["Mehak Shah · no update 7d", "Karan Mehta · pending sign-off"] },
        ],
      };
    case "process":
      return {
        title: p.name ?? "Process",
        subtitle: `${p.refId ?? "LMP-2042"} · R2 — Technical`,
        facts: [
          { label: "Status",         value: "Ongoing", tone: "ok" },
          { label: "Health",         value: "Healthy", tone: "ok" },
          { label: "Candidates",     value: "5" },
          { label: "SLA",            value: "6d", tone: "ok" },
          { label: "Domain POC",     value: "Priya Shetty" },
          { label: "Behavioral POC", value: "Namita Iyer" },
        ],
        activity: [
          "Apr 24 — Round updated by Priya Shetty",
          "Apr 18 — Mentor session logged",
          "Apr 12 — Process created",
        ],
      };
    case "student":
      return {
        title: p.name ?? "Aditi Rao",
        subtitle: "Swiggy — Product Manager",
        facts: [
          { label: "Current stage",      value: "R2 — Technical" },
          { label: "Assigned POC",       value: "Priya Shetty" },
          { label: "Prep guide",         value: "Done", tone: "ok" },
          { label: "Mentor status",      value: "Pending", tone: "warn" },
          { label: "Mock status",        value: "Scheduled", tone: "ok" },
          { label: "Last update",        value: "Apr 24" },
        ],
      };
    case "mentor":
      return {
        title: p.name ?? "Anika Shah",
        subtitle: "Group PM, Razorpay",
        facts: [
          { label: "Domain",       value: "Product" },
          { label: "Source",       value: "Alumni" },
          { label: "Rating",       value: "4.9", tone: "ok" },
          { label: "Sessions",     value: "42" },
          { label: "Cost",         value: "₹3,500/hr" },
          { label: "Availability", value: "This week", tone: "ok" },
        ],
      };
    case "timeline":
      return {
        title: `Timeline — ${p.name ?? "Process"}`,
        subtitle: p.refId ?? "Activity log",
        activity: [
          "Apr 24 — Round updated by Priya Shetty",
          "Apr 18 — Mentor session logged",
          "Apr 14 — Candidate added to pipeline",
          "Apr 12 — Process created",
          "Apr 12 — POC assigned",
        ],
      };
    case "sla":
      return {
        title: "SLA Dashboard",
        subtitle: "Active processes past 14d threshold",
        facts: [
          { label: "Total breaches", value: "5", tone: "risk" },
          { label: "Critical (>30d)", value: "2", tone: "risk" },
          { label: "Warning",         value: "3", tone: "warn" },
          { label: "Avg overdue",     value: "9d" },
        ],
      };
    case "lmp-board":
    case "risk":
    default:
      return {
        title: "LMP Board",
        subtitle: "Active processes",
        facts: [
          { label: "Active",   value: "24" },
          { label: "Stuck",    value: "6", tone: "risk" },
          { label: "Healthy",  value: "14", tone: "ok" },
          { label: "Closed",   value: "4" },
        ],
      };
  }
}

export function CopilotPreviewDrawer({
  payload, open, onClose,
}: {
  payload: PreviewPayload | null;
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && payload && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-n900/10"
            aria-hidden
          />
          <motion.aside
            key="drawer"
            initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-3 right-3 bottom-3 z-50 w-[460px] max-w-[92vw] rounded-2xl bg-white border border-n200 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.25)] flex flex-col overflow-hidden"
            role="dialog"
            aria-label="Preview"
          >
            <DrawerBody payload={payload} onClose={onClose} onNavigate={(href) => { onClose(); navigate(href); }} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DrawerBody({
  payload, onClose, onNavigate,
}: {
  payload: PreviewPayload;
  onClose: () => void;
  onNavigate: (href: string) => void;
}) {
  const Icon = ICONS[payload.kind] ?? Activity;
  const c = buildContent(payload);

  return (
    <>
      <header className="shrink-0 flex items-start gap-3 px-5 pt-5 pb-3 border-b border-n100">
        <span className="h-9 w-9 rounded-lg bg-orange-50 border border-orange-200 grid place-items-center shrink-0">
          <Icon className="h-4 w-4 text-orange-500" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-n900 truncate">{c.title}</div>
          <div className="text-[12px] text-n500 truncate mt-0.5">{c.subtitle}</div>
        </div>
        <button
          onClick={onClose}
          className="h-8 w-8 grid place-items-center rounded-md text-n500 hover:text-n900 hover:bg-n100 transition-colors"
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-5">
        {c.facts && (
          <div className="grid grid-cols-2 gap-2">
            {c.facts.map((f) => (
              <div key={f.label} className="rounded-lg border border-n100 bg-n50/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.5px] text-n400">{f.label}</div>
                <div className={cn("mt-0.5 text-[13px] font-medium", toneClass(f.tone))}>{f.value}</div>
              </div>
            ))}
          </div>
        )}

        {c.table && (
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.5px] text-n500 font-medium mb-1.5">Top POCs</div>
            <div className="overflow-hidden rounded-lg border border-n100">
              <table className="w-full text-[12.5px]">
                <thead className="bg-n50/60">
                  <tr>
                    {c.table.columns.map((col) => (
                      <th key={col} className="text-left px-2.5 py-1.5 text-[10.5px] uppercase tracking-[0.5px] text-n500 font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {c.table.rows.map((row, i) => (
                    <tr key={i} className="border-t border-n100">
                      {row.map((cell, j) => {
                        const isObj = typeof cell === "object";
                        const value = isObj ? cell.value : cell;
                        const tone = isObj ? cell.tone : undefined;
                        return <td key={j} className={cn("px-2.5 py-1.5", toneClass(tone))}>{value}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {c.sections?.map((s) => (
          <div key={s.heading}>
            <div className="text-[10.5px] uppercase tracking-[0.5px] text-n500 font-medium mb-1.5">{s.heading}</div>
            <ul className="space-y-1">
              {s.items.map((it, i) => (
                <li key={i} className="flex gap-2 text-[12.5px] text-n800">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-n400 shrink-0" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {c.activity && (
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.5px] text-n500 font-medium mb-1.5">Latest activity</div>
            <ul className="space-y-1">
              {c.activity.map((it, i) => (
                <li key={i} className="flex gap-2 text-[12.5px] text-n700">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-n400 shrink-0" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <footer className="shrink-0 flex items-center gap-2 px-5 py-3 border-t border-n100 bg-white">
        <button
          onClick={() => onNavigate(payload.href)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-orange-500 text-white text-[12.5px] font-medium hover:bg-orange-600 transition-colors"
        >
          Go to full page
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => {
            const url = `${window.location.origin}${payload.href}`;
            navigator.clipboard?.writeText(url).catch(() => {});
            toast("Link copied", { description: url });
          }}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-white text-n800 text-[12.5px] font-medium border border-n300 hover:border-n400 transition-colors"
        >
          <Link2 className="h-3.5 w-3.5" />
          Copy link
        </button>
      </footer>
    </>
  );
}