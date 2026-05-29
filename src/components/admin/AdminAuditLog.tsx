import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Download, ShieldCheck, UserPlus, UserMinus, SlidersHorizontal, Database, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

type Action =
  | "user.invite" | "user.deactivate" | "user.role_change"
  | "config.scoring" | "config.threshold"
  | "datasource.sync" | "auth.login";

type Entry = {
  id: string;
  actor: string;
  initials: string;
  action: Action;
  target: string;
  detail: string;
  ip: string;
  ts: string;
};

const ICON: Record<Action, { icon: typeof UserPlus; cls: string; label: string }> = {
  "user.invite":       { icon: UserPlus,           cls: "bg-teal-50 text-teal-600",     label: "User invited" },
  "user.deactivate":   { icon: UserMinus,          cls: "bg-coral-50 text-coral-600",   label: "User deactivated" },
  "user.role_change":  { icon: ShieldCheck,        cls: "bg-plum-400/10 text-plum-400", label: "Role changed" },
  "config.scoring":    { icon: SlidersHorizontal,  cls: "bg-orange-50 text-orange-600", label: "Scoring updated" },
  "config.threshold":  { icon: SlidersHorizontal,  cls: "bg-orange-50 text-orange-600", label: "Threshold updated" },
  "datasource.sync":   { icon: Database,           cls: "bg-sky-400/10 text-sky-400",   label: "Data source sync" },
  "auth.login":        { icon: KeyRound,           cls: "bg-n100 text-n700",            label: "Sign-in" },
};

const SEED: Entry[] = [
  { id: "a1", actor: "Asha Mehra",   initials: "AM", action: "config.scoring",   target: "Scoring Weights",     detail: "Skills 25 → 30, Role 35 → 30",          ip: "10.0.4.21", ts: "Just now" },
  { id: "a2", actor: "Asha Mehra",   initials: "AM", action: "user.invite",      target: "noah@mentormatch.ai", detail: "Invited as POC · domains: Data, ML",    ip: "10.0.4.21", ts: "12 min ago" },
  { id: "a3", actor: "Rahul Verma",  initials: "RV", action: "config.threshold", target: "POC Concurrent Processes", detail: "12 → 14",                                ip: "10.0.4.78", ts: "1 h ago" },
  { id: "a4", actor: "Asha Mehra",   initials: "AM", action: "user.role_change", target: "lina@mentormatch.ai", detail: "Allocator → Admin",                      ip: "10.0.4.21", ts: "3 h ago" },
  { id: "a5", actor: "System",       initials: "SY", action: "datasource.sync",  target: "ALU Roster",          detail: "Synced 234 mentors · 0 errors",         ip: "—",         ts: "5 h ago" },
  { id: "a6", actor: "Asha Mehra",   initials: "AM", action: "user.deactivate",  target: "lina@mentormatch.ai", detail: "Deactivated by admin",                  ip: "10.0.4.21", ts: "Yesterday" },
  { id: "a7", actor: "Carlos Ribeiro", initials: "CR", action: "auth.login",     target: "carlos@mentormatch.ai", detail: "SSO via Google",                       ip: "10.0.4.92", ts: "Yesterday" },
  { id: "a8", actor: "Rahul Verma",  initials: "RV", action: "config.scoring",   target: "Sparse JD Overrides", detail: "Enabled basic-info mode",               ip: "10.0.4.78", ts: "Mar 12" },
];

const FILTERS = ["All", "Users", "Config", "System"] as const;
type Filter = typeof FILTERS[number];

function bucket(a: Action): Filter {
  if (a.startsWith("user.")) return "Users";
  if (a.startsWith("config.")) return "Config";
  return "System";
}

export function AdminAuditLog() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SEED.filter(e => {
      if (filter !== "All" && bucket(e.action) !== filter) return false;
      if (!q) return true;
      return e.actor.toLowerCase().includes(q) || e.target.toLowerCase().includes(q) || e.detail.toLowerCase().includes(q);
    });
  }, [query, filter]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h3 className="text-[24px] font-semibold tracking-[-0.5px] text-n900">Audit Log</h3>
          <p className="text-[13px] text-n500 mt-1">Recent admin actions, configuration changes, and sign-ins.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md bg-white border border-n300 hover:border-n400 hover:bg-n50 text-n800 text-[14px] font-medium px-4 py-2.5 transition-colors duration-150">
          <Download className="h-4 w-4" strokeWidth={1.75} />
          Export CSV
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-n400" strokeWidth={1.5} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by actor, target, or detail…"
          className="w-full h-10 rounded-md border border-n300 bg-white pl-9 pr-9 text-[14px] focus:outline-none focus-visible:shadow-focus focus:border-orange-400 transition-colors duration-150"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-md text-n400 hover:text-n700 hover:bg-n100" aria-label="Clear">
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "text-[13px] rounded-full px-3 py-1.5 border transition-colors duration-150 ease-smooth",
              filter === f
                ? "bg-orange-50 border-orange-500 text-orange-600 font-medium"
                : "bg-white border-n200 text-n600 hover:text-n900 hover:border-n300",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <section className="rounded-lg bg-white border border-n200 shadow-sm overflow-hidden">
        <ul className="divide-y divide-n100">
          <AnimatePresence initial={false}>
            {filtered.map(e => {
              const meta = ICON[e.action];
              const Icon = meta.icon;
              return (
                <motion.li
                  key={e.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-n50 transition-colors duration-150"
                >
                  <div className={cn("h-8 w-8 grid place-items-center rounded-md shrink-0", meta.cls)}>
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-[13px] font-medium text-n900">{e.actor}</span>
                      <span className="text-[12px] text-n500">{meta.label}</span>
                      <span className="text-[12px] text-n400">·</span>
                      <span className="text-[13px] text-n800 truncate">{e.target}</span>
                    </div>
                    <div className="text-[12px] text-n500 mt-0.5">{e.detail}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[12px] text-n600 tabular-nums">{e.ts}</div>
                    <div className="text-[11px] text-n400 tabular-nums mt-0.5">{e.ip}</div>
                  </div>
                  <div className="hidden lg:flex items-center shrink-0 ml-2">
                    <div className="h-7 w-7 rounded-full bg-n900 text-white grid place-items-center text-[10px] font-medium">{e.initials}</div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
          {filtered.length === 0 && (
            <li className="px-5 py-10 text-center text-n500 text-[13px]">No entries match your filters.</li>
          )}
        </ul>
      </section>
    </div>
  );
}