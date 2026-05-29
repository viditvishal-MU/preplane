import { useMemo } from "react";
import {
  LuminaShell, LxPageHeader, LxLivePill, LxGrid, LxCard, LxCardHeader, LxSection,
  LxHero, LxKpi, LxStackedBar, LxAttentionStrip, LX_HEX,
} from "@/components/lumina/primitives";
import { LxLmpFilters } from "@/components/lumina/LxFilters";
import { useLmpFilters } from "./filters/useLmpFilters";
import { useRole } from "@/lib/roles";
import { motion } from "framer-motion";
import {
  isConverted, isDormant, statusCounts, type Process,
} from "@/lib/mockProcesses";
import { useLiveProcesses } from "@/lib/sheets/useLiveProcesses";
import { useLmpProcessesRealtime } from "@/lib/hooks/useLmpProcessesRealtime";
import { useLmpCandidatesRealtime } from "@/lib/hooks/useLmpCandidatesRealtime";
import { Link } from "react-router-dom";

const STATUS_ACCENT: Record<Process["status"], { hex: string; soft: string; fg: string }> = {
  Ongoing:          { hex: LX_HEX.info,    soft: "rgba(74,142,232,0.12)",  fg: LX_HEX.info },
  "Offer Received": { hex: LX_HEX.yellow,  soft: "rgba(247,211,68,0.18)",  fg: "var(--lx-text)" },
  Converted:        { hex: LX_HEX.success, soft: "rgba(106,158,98,0.12)",  fg: LX_HEX.success },
  "On Hold":        { hex: LX_HEX.ai,      soft: "rgba(139,92,246,0.12)",  fg: LX_HEX.ai },
  Dormant:          { hex: LX_HEX.orange,  soft: "rgba(227,131,48,0.10)",  fg: "var(--lx-text)" },
  Closed:           { hex: LX_HEX.risk,    soft: "rgba(240,112,64,0.12)",  fg: LX_HEX.risk },
};

function StatusPill({ s }: { s: Process["status"] }) {
  const a = STATUS_ACCENT[s];
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium border"
      style={{ background: a.soft, color: a.fg, borderColor: `${a.hex}55` }}>
      {s}
    </span>
  );
}

export function PocLmpDashboard() {

  const { user } = useRole();
  // Live realtime — POC dashboard refreshes as their LMPs / candidates change.
  useLmpProcessesRealtime();
  useLmpCandidatesRealtime();
  const { processes: liveProcesses } = useLiveProcesses();
  // Prefer canonical POC profile name (matches sheet values) over auth display name.
  const matchName = user.pocProfileName ?? user.name;
  const pocName = useMemo(() => {
    const procs = liveProcesses.length ? liveProcesses : [];
    const matchesPoc = (cell?: string) => {
      if (!cell) return false;
      return cell.split(/[,/&+]| and /i).some((n) => n.trim().toLowerCase() === matchName.toLowerCase()
        || n.trim().toLowerCase().startsWith(matchName.toLowerCase().split(/\s+/)[0]));
    };
    const owns = procs.some((p) => matchesPoc(p.prepPoc) || matchesPoc(p.outreachPoc));
    return owns ? matchName : procs[0]?.prepPoc || matchName;
  }, [matchName, liveProcesses]);

  const { filtered, filters, set } = useLmpFilters({ role: "poc", userName: pocName, data: liveProcesses.length ? liveProcesses : undefined });

  const total = filtered.length || 1;
  const converted = filtered.filter(isConverted).length;
  const conversionRate = (converted / total) * 100;
  const ongoing = filtered.filter((r) => r.status === "Ongoing").length;
  const offer = filtered.filter((r) => r.status === "Offer Received").length;
  const risk =
    filtered.filter((r) => r.status === "On Hold").length +
    filtered.filter(isDormant).length +
    filtered.filter((r) => r.status === "Closed").length;

  const sc = statusCounts(filtered);

  // Task completion
  const prepDone = filtered.filter((r) => r.prepDoc === "Sent").length;
  const mentorDone = filtered.filter((r) => r.mentorAligned === "Yes").length;
  const roundDone = filtered.filter((r) =>
    r.placementProgress === "R1" || r.placementProgress === "R2" ||
    r.placementProgress === "R3" || r.placementProgress === "Offer" ||
    r.placementProgress === "Converted",
  ).length;
  const finished = filtered.filter((r) => r.status === "Closed" || isConverted(r));
  const outcomeLogged = finished.filter((r) =>
    (r.status === "Closed" && r.closedReason) ||
    (isConverted(r) && r.convertNames),
  ).length;

  const checklist = [
    { label: "Confirm selection",   done: filtered.filter((r) => r.placementProgress !== "Not Started").length, total: filtered.length },
    { label: "Share prep doc",      done: prepDone,        total: filtered.length },
    { label: "Align mentors",       done: mentorDone,      total: filtered.length },
    { label: "Track rounds",        done: roundDone,       total: filtered.length },
    { label: "Close & log outcome", done: outcomeLogged,   total: finished.length },
  ];

  // Active processes
  const activeRows = filtered
    .filter((r) => r.status === "Ongoing" || r.status === "Offer Received" || r.status === "On Hold")
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 12);

  return (
    <LuminaShell>
      <LxPageHeader
        crumb="POC · DASHBOARD"
        title="My workload"
        subtitle={`Processes where Prep POC or Outreach POC = ${pocName}`}
        right={<LxLivePill />}
      />

      <LxLmpFilters filters={filters} set={set} pocOptions={[pocName]} />

      {/* SECTION 1 — Personal hero + KPIs */}
      <LxGrid>
        <LxHero
          eyebrow="My Conversion"
          title="My final-conversion rate across owned processes"
          primaryValue={`${conversionRate.toFixed(1)}%`}
          primaryLabel="my conversion"
          statement={`${converted} of ${filtered.length} processes converted`}
          ringPct={conversionRate}
          variant="green"
          span={7}
        />
        <div className="col-span-12 md:col-span-5 grid grid-cols-12 gap-4">
          <LxKpi span={6} label="My active load" accent="info"   value={ongoing} sub="Status = Ongoing" />
          <LxKpi span={6} label="Offer received" accent="yellow" value={offer}   sub="Awaiting outcome" />
          <LxKpi span={6} label="My risk load"   accent="risk"   value={risk}    sub="Hold + Dormant + Closed" />
          <LxKpi span={6} label="Total processes" accent="teal"  value={filtered.length} sub="In my scope" />
        </div>
      </LxGrid>

      {/* SECTION 2 — Status distribution */}
      <LxSection eyebrow="My status" title="My process status distribution" />
      <LxCard span={12}>
        <LxStackedBar
          segments={[
            { label: "Ongoing",        value: sc.Ongoing,            accent: "info" },
            { label: "Offer Received", value: sc["Offer Received"], accent: "yellow" },
            { label: "Converted",      value: sc.Converted,          accent: "success" },
            { label: "On Hold",        value: sc["On Hold"],        accent: "ai" },
            { label: "Dormant",        value: sc.Dormant,            accent: "orange" },
            { label: "Closed",         value: sc.Closed,             accent: "risk" },
          ]}
        />
      </LxCard>

      {/* SECTION 3 — Checklist + Active table */}
      <LxGrid>
        <LxCard span={5}>
          <LxCardHeader eyebrow="My checklist" title="LMP task completion"
            hint="Track each step's completion across active and closed processes." />
          <ul className="space-y-3.5">
            {checklist.map((row, i) => {
              const pct = row.total ? (row.done / row.total) * 100 : 0;
              const accent = pct >= 80 ? "success" : pct >= 60 ? "yellow" : "risk";
              return (
                <li key={row.label}>
                  <div className="flex items-baseline justify-between text-[12.5px] mb-1.5">
                    <span style={{ color: "var(--lx-text-2)" }}>{row.label}</span>
                    <span className="font-mono tabular-nums" style={{ color: "var(--lx-text)" }}>
                      {row.done}<span style={{ color: "var(--lx-text-3)" }}> / {row.total}</span>
                      <span className="ml-2 font-semibold" style={{ color: LX_HEX[accent] }}>{pct.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--lx-soft)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.55, delay: i * 0.05, ease: [0, 0, 0.2, 1] }}
                      className="h-full rounded-full"
                      style={{ background: LX_HEX[accent] }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </LxCard>

        <LxCard span={7}>
          <LxCardHeader eyebrow="My active processes" title="Active & pending"
            hint="Ongoing, Offer Received, On Hold." />
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-[12px] border-separate border-spacing-y-1.5">
              <thead>
                <tr>
                  {["Company","Role","Status","Prep %","Prep doc","Next action"].map((h) => (
                    <th key={h} className="text-left font-medium px-2 py-1 text-[11px] uppercase tracking-[0.5px]"
                      style={{ color: "var(--lx-text-3)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeRows.map((r) => {
                  const next =
                    r.placementProgress === "Offer" ? "Confirm outcome" :
                    r.prepDoc !== "Sent" ? "Share prep doc" :
                    r.mentorAligned !== "Yes" ? "Align mentor" :
                    r.placementProgress === "Not Started" ? "Confirm selection" :
                    "Update round";
                  return (
                    <tr key={r.processId}>
                      <td className="px-2 py-1.5 truncate max-w-[140px]" style={{ color: "var(--lx-text)" }}>{r.company}</td>
                      <td className="px-2 py-1.5 truncate max-w-[120px]" style={{ color: "var(--lx-text-2)" }}>{r.role}</td>
                      <td className="px-2 py-1.5"><StatusPill s={r.status} /></td>
                      <td className="px-2 py-1.5 font-mono tabular-nums" style={{ color: "var(--lx-text)" }}>{r.prepProgress}%</td>
                      <td className="px-2 py-1.5">
                        {r.prepDoc === "Sent"
                          ? <span style={{ color: LX_HEX.success }}>Sent</span>
                          : <span style={{ color: LX_HEX.risk }}>Missing</span>}
                      </td>
                      <td className="px-2 py-1.5" style={{ color: "var(--lx-text-2)" }}>{next}</td>
                    </tr>
                  );
                })}
                {activeRows.length === 0 && (
                  <tr><td colSpan={6} className="px-2 py-6 text-center" style={{ color: "var(--lx-text-3)" }}>No active processes.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </LxCard>
      </LxGrid>

      {/* LMP summary */}
      <LxGrid>
        <LxKpi span={4} label="My LMPs" accent="info" value={filtered.length} sub="From LMP Tracker (live)" />
        <LxKpi span={4} label="Conversion" accent="teal"
          value={`${conversionRate.toFixed(1)}%`}
          sub="My conversion rate" />
        <LxCard span={4}>
          <Link to="/lmp" className="flex items-center justify-center h-full text-[12px] font-medium py-4"
            style={{ color: "var(--lx-accent)" }}>
            Browse all LMPs →
          </Link>
        </LxCard>
      </LxGrid>

      <LxAttentionStrip
        items={[
          { label: "My conversion", value: `${conversionRate.toFixed(1)}%`, accent: "success" },
          { label: "Active load",   value: ongoing,                          accent: "info" },
          { label: "Awaiting outcome", value: offer,                         accent: "yellow" },
          { label: "Risk load",     value: risk,                             accent: "risk" },
        ]}
      />
    </LuminaShell>
  );
}
