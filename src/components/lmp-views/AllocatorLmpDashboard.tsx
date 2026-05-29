import { useMemo } from "react";
import {
  LuminaShell, LxPageHeader, LxLivePill, LxGrid, LxCard, LxCardHeader, LxSection,
  LxHero, LxKpi, LxRankedBar, LxStackedBar, LxAttentionStrip, LX_HEX,
} from "@/components/lumina/primitives";
import { LxLmpFilters } from "@/components/lumina/LxFilters";
import { useLmpFilters, uniquePocs, usePrepPocOptions } from "./filters/useLmpFilters";
import { useRole } from "@/lib/roles";
import { completenessForRows, isConverted, requiredFieldsForRow } from "@/lib/mockProcesses";
import { motion } from "framer-motion";
import { useLiveProcesses } from "@/lib/sheets/useLiveProcesses";
import { useLmpProcessesRealtime } from "@/lib/hooks/useLmpProcessesRealtime";
import { useLmpCandidatesRealtime } from "@/lib/hooks/useLmpCandidatesRealtime";
import { Link } from "react-router-dom";
import { SyncIndicator } from "@/components/sheets/SyncIndicator";

export function AllocatorLmpDashboard() {
  const { user } = useRole();
  const prepPocOptions = usePrepPocOptions();
  useLmpProcessesRealtime();
  useLmpCandidatesRealtime();
  const { processes: liveProcesses } = useLiveProcesses();
  const { filtered, all, filters, set } = useLmpFilters({ role: "allocator", userName: user.name, data: liveProcesses.length ? liveProcesses : undefined });

  const completeness = useMemo(() => completenessForRows(filtered), [filtered]);

  // Quality KPIs
  const missingPrep = filtered.filter((r) => !r.prepDoc && (r.status === "Ongoing" || r.status === "Offer Received")).length;
  const roundGaps = filtered.filter((r) => {
    const latest = r.r3Shortlisted ? "R3" : r.r2Shortlisted ? "R2" : r.r1Shortlisted ? "R1" : null;
    if (!latest) return false;
    return r.placementProgress !== latest && !["Offer", "Converted"].includes(r.placementProgress);
  }).length;
  const unloggedOutcomes = filtered.filter((r) => {
    if (r.status === "Closed") return !r.closedReason;
    if (isConverted(r)) return !r.convertNames;
    return false;
  }).length;
  const statusMissing = filtered.filter((r) => !r.status).length;
  const totalIssues = filtered.reduce((s, r) => s + requiredFieldsForRow(r).missing.length, 0);

  // POC completeness ranking
  const pocList = Array.from(new Set(filtered.flatMap((r) => [r.prepPoc, r.outreachPoc]).filter(Boolean))) as string[];
  const pocCompleteness = pocList.map((name) => {
    const owned = filtered.filter((r) => r.prepPoc === name || r.outreachPoc === name);
    const c = completenessForRows(owned);
    return { label: name, value: +c.pct.toFixed(1) };
  });

  // Compliance checklist
  const total = filtered.length;
  const finished = filtered.filter((r) => r.status === "Closed" || isConverted(r));
  const compliance = [
    { label: "Prep doc compliance",    done: filtered.filter((r) => r.prepDoc === "Sent").length, total },
    { label: "Mentor alignment",       done: filtered.filter((r) => r.mentorAligned === "Yes").length, total },
    { label: "Round tracking",         done: filtered.filter((r) => {
      const latest = r.r3Shortlisted ? "R3" : r.r2Shortlisted ? "R2" : r.r1Shortlisted ? "R1" : null;
      return !latest || r.placementProgress === latest || ["Offer", "Converted"].includes(r.placementProgress);
    }).length, total },
    { label: "Outcome logging",        done: finished.filter((r) =>
        (r.status === "Closed" && r.closedReason) || (isConverted(r) && r.convertNames),
      ).length, total: finished.length },
  ];

  // Worst POC (lowest completeness)
  const worstPoc = [...pocCompleteness].sort((a, b) => a.value - b.value)[0];

  return (
    <LuminaShell>
      <LxPageHeader
        crumb="MODERATOR · DASHBOARD"
        title="Data quality snapshot"
        subtitle="What's missing, stale, or incorrectly logged across all processes."
        right={<LxLivePill />}
      />

      <LxLmpFilters
        filters={filters}
        set={set}
        pocOptions={prepPocOptions}
        showPrepPoc
      />

      {/* SECTION 1 — Completeness Hero + KPI cluster */}
      <LxGrid>
        <LxHero
          eyebrow="Data completeness"
          title="Required fields filled across all in-scope processes"
          primaryValue={`${completeness.pct.toFixed(1)}%`}
          primaryLabel="overall completeness"
          statement={`${completeness.filled} of ${completeness.total} required fields filled`}
          ringPct={completeness.pct}
          variant="blue"
          span={7}
        />
        <div className="col-span-12 md:col-span-5 grid grid-cols-12 gap-4">
          <LxKpi span={6} label="Processes in scope" accent="info"   value={filtered.length} sub={`Of ${all.length} total`} />
          <LxKpi span={6} label="Total issues"       accent="risk"   value={totalIssues}     sub="Sum of missing fields" />
          <LxKpi span={6} label="Missing prep docs"  accent="orange" value={missingPrep}     sub="Ongoing or Offer" />
          <LxKpi span={6} label="Status missing"     accent="ai"     value={statusMissing}   sub="Required field blank" />
        </div>
      </LxGrid>

      {/* SECTION 2 — Quality breakdown */}
      <LxSection eyebrow="Quality" title="Where data quality breaks" hint="Top-level signals across the four most common gap types." />
      <LxGrid>
        <LxKpi span={3} label="Missing prep docs"  accent="risk"   value={missingPrep}      sub="Ongoing or Offer Received" />
        <LxKpi span={3} label="Round data gaps"    accent="yellow" value={roundGaps}        sub="Latest round vs progress" />
        <LxKpi span={3} label="Unlogged outcomes"  accent="risk"   value={unloggedOutcomes} sub="Closed/Converted blank" />
        <LxKpi span={3} label="Status missing"     accent="ai"     value={statusMissing}    sub="Status field blank" />
      </LxGrid>

      {/* SECTION 3 — POC completeness ranking + Compliance */}
      <LxGrid>
        <LxCard span={7}>
          <LxCardHeader
            eyebrow="POC submission"
            title="POC completeness ranking"
            hint="Higher is better. % of required fields filled per POC."
          />
          <LxRankedBar
            accent="success"
            maxItems={12}
            valueSuffix="%"
            rows={pocCompleteness}
          />
        </LxCard>

        <LxCard span={5}>
          <LxCardHeader
            eyebrow="Compliance"
            title="Compliance snapshot"
            hint="Per-step compliance across required actions."
          />
          <ul className="space-y-3.5">
            {compliance.map((row, i) => {
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
      </LxGrid>

      {/* SECTION 4 — Issue mix (stacked) */}
      <LxSection eyebrow="Issue mix" title="Where the gaps live" hint="Distribution across the four most common gap types." />
      <LxCard span={12}>
        <LxStackedBar
          segments={[
            { label: "Missing prep",     value: missingPrep,      accent: "risk" },
            { label: "Round gaps",       value: roundGaps,        accent: "yellow" },
            { label: "Unlogged outcome", value: unloggedOutcomes, accent: "orange" },
            { label: "Status missing",   value: statusMissing,    accent: "ai" },
          ]}
        />
      </LxCard>

      {/* ─── LMP Tracker summary ─── */}
      <LxSection eyebrow="LMP Tracker · Live" title="Process snapshot" />
      <LxGrid>
        <LxKpi span={3} label="Total LMPs" accent="info" value={filtered.length} sub="From LMP Tracker" />
        <LxKpi span={3} label="Ongoing" accent="teal"
          value={filtered.filter((r) => r.status === "Ongoing").length}
          sub="Active processes" />
        <LxKpi span={3} label="Converted" accent="success"
          value={filtered.filter(isConverted).length} sub="Successfully placed" />
        <LxKpi span={3} label="Domains" accent="orange"
          value={new Set(filtered.map((r) => r.domain).filter(Boolean)).size} sub="Unique domains" />
      </LxGrid>
      <LxGrid>
        <LxCard span={12}>
          <LxCardHeader eyebrow="Quick access" title="LMP Tracker records"
            right={
              <div className="flex items-center gap-3">
                <SyncIndicator queryKey={["sheets", "LMP Tracker"]} />
                <Link to="/lmp" className="text-[11.5px] font-medium px-2.5 py-1.5 rounded-md transition-colors"
                  style={{ color: "var(--lx-accent)", background: "var(--lx-soft)" }}>
                  View all LMPs →
                </Link>
              </div>
            }
          />
        </LxCard>
      </LxGrid>

      {/* Attention strip */}
      <LxAttentionStrip
        items={[
          { label: "Overall completeness", value: `${completeness.pct.toFixed(1)}%`,  accent: "info" },
          { label: "Total issues",         value: totalIssues,                         accent: "risk" },
          { label: "Lowest POC",           value: worstPoc ? `${worstPoc.label} · ${worstPoc.value.toFixed(0)}%` : "—", accent: "orange" },
          { label: "Missing prep",         value: missingPrep,                         accent: "yellow" },
        ]}
      />
    </LuminaShell>
  );
}
