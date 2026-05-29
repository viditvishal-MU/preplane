import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LuminaShell, LxPageHeader, LxLivePill, LxGrid, LxCard, LxCardHeader, LxSection,
  LxHero, LxKpi, LxStackedBar, LxDonut, LxRankedBar, LxHeatmap, LxAttentionStrip,
  LxInsightTile, LX_HEX, type LxAccent,
} from "@/components/lumina/primitives";
import { LxLmpFilters } from "@/components/lumina/LxFilters";
import { useLmpFilters, uniquePocs, usePrepPocOptions } from "./filters/useLmpFilters";
import { useRole } from "@/lib/roles";
import {
  DOMAINS, domainBreakdown, isConverted, isDormant, offerCounts, pocLoad, statusCounts,
  POC_OVERLOAD_THRESHOLD,
} from "@/lib/mockProcesses";
import { isCrossDomain } from "@/lib/domainAllocation";
import { useLmpRows } from "@/lib/sheets/hooks";
import { useLiveProcesses } from "@/lib/sheets/useLiveProcesses";
import { useDomains } from "@/lib/hooks/useDbData";
import { useLmpProcessesRealtime } from "@/lib/hooks/useLmpProcessesRealtime";
import { useLmpCandidatesRealtime } from "@/lib/hooks/useLmpCandidatesRealtime";
import { Link } from "react-router-dom";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { SyncIndicator } from "@/components/sheets/SyncIndicator";

export function AdminLmpDashboard() {
  const { user } = useRole();
  const prepPocOptions = usePrepPocOptions();
  // Total student count from canonical students DB (independent of any filter).
  const { data: totalStudentsDb = 0 } = useQuery({
    queryKey: ["students_total_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true });
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  // Live student roster (name + cohort + domain + lmp counts) — drives cohort, domain & participation cards.
  const { data: studentRoster = [] } = useQuery({
    queryKey: ["students_roster_full"],
    queryFn: async () => {
      const PAGE = 1000;
      let from = 0;
      const out: any[] = [];
      // paginate to bypass the 1000-row default limit
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from("students")
          .select("name, cohort, primary_domain, secondary_domain, lmp_count, active_lmp_count")
          .range(from, from + PAGE - 1);
        if (error) throw new Error(error.message);
        const rows = data ?? [];
        out.push(...rows);
        if (rows.length < PAGE) break;
        from += PAGE;
      }
      return out.map((s) => ({
        name: (s.name ?? "").trim(),
        cohort: (s.cohort ?? "").trim(),
        primaryDomain: (s.primary_domain ?? "").trim(),
        secondaryDomain: (s.secondary_domain ?? "").trim(),
        lmpCount: Number(s.lmp_count ?? 0),
        activeLmpCount: Number(s.active_lmp_count ?? 0),
      }));
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  // Live realtime — keep all KPI queries fresh as DB rows change.
  useLmpProcessesRealtime();
  useLmpCandidatesRealtime();
  const { data: lmpRecords = [] } = useLmpRows();
  const { processes: liveProcesses, isLoading: lmpLoading } = useLiveProcesses();
  const { data: domainRows = [] } = useDomains();
  const { filtered, all, filters, set } = useLmpFilters({ role: "admin", userName: user.name, data: liveProcesses.length ? liveProcesses : undefined });

  /* ─────── KPIs ─────── */
  const total = filtered.length || 1;
  const converted = filtered.filter(isConverted).length;
  const conversionRate = (converted / total) * 100;
  const ongoing = filtered.filter((r) => r.status === "Ongoing").length;
  const offerReceived = filtered.filter((r) => r.status === "Offer Received").length;
  const risk =
    filtered.filter((r) => r.status === "On Hold").length +
    filtered.filter(isDormant).length +
    filtered.filter((r) => r.status === "Closed").length;

  /* ─────── Status + Offer ─────── */
  const sc = statusCounts(filtered);
  const oc = offerCounts(filtered);

  /* ─────── Domains ─────── */
  const domains = useMemo(() => domainBreakdown(filtered), [filtered]);
  const sortedByLoad = [...domains].sort((a, b) => b.ongoing - a.ongoing);
  const highestLoad = sortedByLoad[0];
  const highestRisk = [...domains].sort((a, b) => b.risk - a.risk)[0];
  const fastestMoving = [...domains].sort(
    (a, b) => (b.converted / Math.max(1, b.total)) - (a.converted / Math.max(1, a.total)),
  )[0];

  /* ─────── POCs ─────── */
  const prepLoad = useMemo(() => pocLoad(filtered, "prep"), [filtered]);
  const outreachLoad = useMemo(() => pocLoad(filtered, "outreach"), [filtered]);
  const activePocs = new Set<string>();
  filtered.filter((r) => r.status === "Ongoing").forEach((r) => {
    activePocs.add(r.prepPoc); activePocs.add(r.outreachPoc);
  });
  const avgLoad = activePocs.size ? ongoing / activePocs.size : 0;
  const overloaded = prepLoad.filter((p) => p.ongoing > POC_OVERLOAD_THRESHOLD).length
    + outreachLoad.filter((p) => p.ongoing > POC_OVERLOAD_THRESHOLD).length;

  /* ─────── Capacity heatmap — fully live from POC DB + LMP DB ─────── */
  const { data: prepPocCapacity = [], isLoading: capacityLoading } = useQuery({
    queryKey: ["prep_poc_capacity_live"],
    queryFn: async () => {
      const [pocsRes, linksRes] = await Promise.all([
        supabase
          .from("poc_profiles")
          .select("id, name, role_type, primary_domain, domain_tags")
          .eq("status", "active"),
        supabase
          .from("lmp_poc_links")
          .select("poc_id, is_active, role, lmp_processes(status, domains(name))"),
      ]);
      if (pocsRes.error) throw new Error(pocsRes.error.message);
      if (linksRes.error) throw new Error(linksRes.error.message);

      const norm = (s: any) => String(s ?? "").trim().toLowerCase();
      // "Active" = currently carried (not yet converted/closed/rejected).
      const TERMINAL = new Set(["converted", "closed", "rejected"]);

      type Link = { is_active: boolean; lmp_processes: any };
      const byPoc = new Map<string, Link[]>();
      (linksRes.data ?? []).forEach((l: any) => {
        if (!l.poc_id || !l.lmp_processes) return;
        const arr = byPoc.get(l.poc_id) ?? [];
        arr.push({ is_active: !!l.is_active, lmp_processes: l.lmp_processes });
        byPoc.set(l.poc_id, arr);
      });

      return (pocsRes.data ?? [])
        .map((p: any) => {
          const links = byPoc.get(p.id) ?? [];
          const domainCtx = new Set<string>(
            [p.primary_domain, ...(Array.isArray(p.domain_tags) ? p.domain_tags : [])]
              .filter(Boolean)
              .map((d: string) => norm(d)),
          );
          let ongoing = 0, converted = 0, onHold = 0, dormant = 0, closed = 0;
          let active = 0, cross = 0;
          links.forEach((l) => {
            const st = norm(l.lmp_processes?.status);
            const dn = norm(l.lmp_processes?.domains?.name);
            if (st === "converted") converted++;
            else if (st === "on hold") onHold++;
            else if (st === "dormant") dormant++;
            else if (st === "closed" || st === "rejected") closed++;
            else ongoing++;
            // Active load = currently active links on non-terminal LMPs.
            if (l.is_active && !TERMINAL.has(st)) {
              active++;
              if (domainCtx.size && dn && !domainCtx.has(dn)) cross++;
            }
          });
          return {
            name: (p.name ?? "").trim(),
            historical: links.length,                 // every prep link ever (live)
            active,                                   // current carry (live)
            cross,
            inDomain: Math.max(0, active - cross),
            ongoing,
            converted,
            onHold,
            dormant,
            closed,
          };
        })
        .filter((p) => p.name && (p.historical > 0 || p.active > 0))
        .sort((a, b) => (b.active - a.active) || (b.historical - a.historical));
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const capacityPocs = prepPocCapacity.map((p) => p.name);
  const heatmapMatrix = prepPocCapacity.map((p) => [
    p.historical,
    p.active,
    p.inDomain,
    p.cross,
    p.ongoing,
    p.converted,
    p.onHold,
    p.dormant,
    p.closed,
  ]);
  const loadTotals = prepPocCapacity.map((p) => p.active);

  /* ─────── Attention strip — live, source-of-truth queries ─────── */
  const { data: attentionPendingOffers = 0 } = useQuery({
    queryKey: ["attention_pending_offers"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("lmp_processes")
        .select("*", { count: "exact", head: true })
        .ilike("status", "offer received");
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const { data: attentionMissingPrepDocs = 0 } = useQuery({
    queryKey: ["attention_missing_prep_docs"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("lmp_processes")
        .select("*", { count: "exact", head: true })
        .or("prep_doc.is.null,prep_doc.eq.")
        .not("status", "in", '("Converted","Closed","Rejected")');
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const { data: attentionPocs = [] } = useQuery({
    queryKey: ["attention_pocs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("poc_profiles")
        .select("name, active_load, max_threshold")
        .eq("status", "active");
      if (error) throw new Error(error.message);
      return (data ?? []).map((p: any) => ({
        name: (p.name ?? "").trim(),
        active: Number(p.active_load ?? 0),
        threshold: Number(p.max_threshold ?? 8),
      }));
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const mostOverloadedPocName =
    [...attentionPocs].sort((a, b) => b.active - a.active)[0]?.name ?? "—";
  const overloadedPocsCount = attentionPocs.filter((p) => p.active > p.threshold).length;
  const highestRiskDomainName =
    [...domainRows]
      .map((d: any) => ({
        name: d?.name ?? "—",
        risk: Number(d?.on_hold ?? 0) + Number(d?.dormant ?? 0) + Number(d?.closed ?? 0),
        total: Number(d?.total_lmps ?? 0),
      }))
      .sort((a, b) => b.risk - a.risk || b.total - a.total)[0]?.name ?? "—";

  /* ─────── Student analytics (live · students DB) ─────── */
  const studentStats = useMemo(() => {
    // Unique students in CURRENT filtered LMP view (derived from process name strings).
    const inViewNames = new Set<string>();
    filtered.forEach((r) => {
      [r.r1Shortlisted, r.r2Shortlisted, r.r3Shortlisted, r.finalConvert, r.convertNames]
        .filter(Boolean)
        .forEach((s) =>
          s.split(/[,/]/).map((n) => n.trim()).filter(Boolean).forEach((n) => inViewNames.add(n)),
        );
    });

    // Canonical counts come from the students DB (active_lmp_count is maintained
    // by the candidates trigger), so the strip reflects real DB state, not parsed strings.
    const rosterWithCohort = studentRoster.filter((s) => s.name && s.cohort);
    let active = 0, single = 0, multiple = 0, inactive = 0;
    studentRoster.forEach((s) => {
      const c = s.activeLmpCount;
      if (c === 0) inactive += 1;
      else if (c === 1) { single += 1; active += 1; }
      else { multiple += 1; active += 1; }
    });

    // Cohort split from students DB
    const cohortAgg: Record<string, { total: number; single: number; multiple: number; inactive: number }> = {};
    rosterWithCohort.forEach((s) => {
      const bucket = cohortAgg[s.cohort] ?? { total: 0, single: 0, multiple: 0, inactive: 0 };
      bucket.total += 1;
      const c = s.activeLmpCount;
      if (c === 0) bucket.inactive += 1;
      else if (c === 1) bucket.single += 1;
      else bucket.multiple += 1;
      cohortAgg[s.cohort] = bucket;
    });

    // Domain preference: count students by primary_domain from students DB.
    // "total" = all students with that primary domain; "active" = only those currently in ≥1 process.
    const totalsByDomain = new Map<string, number>();
    const activeByDomain = new Map<string, number>();
    studentRoster.forEach((s) => {
      if (!s.primaryDomain) return;
      totalsByDomain.set(s.primaryDomain, (totalsByDomain.get(s.primaryDomain) ?? 0) + 1);
      if (s.activeLmpCount > 0) {
        activeByDomain.set(s.primaryDomain, (activeByDomain.get(s.primaryDomain) ?? 0) + 1);
      }
    });
    const domainKeys = new Set<string>([...DOMAINS, ...totalsByDomain.keys()]);
    const domainRowsTotal = [...domainKeys].map((d) => ({ label: d, value: totalsByDomain.get(d) ?? 0 }));
    const domainRowsActive = [...domainKeys].map((d) => ({ label: d, value: activeByDomain.get(d) ?? 0 }));

    return {
      totalStudents: inViewNames.size,        // "In current view"
      activeStudents: active,                  // In Process (Unique) — live DB
      inactiveStudents: inactive,              // Inactive — live DB
      singleProcess: single,                   // live DB
      multipleProcesses: multiple,             // live DB
      cohortAgg,
      domainRowsTotal,
      domainRowsActive,
    };
  }, [filtered, studentRoster]);

  const [domainPrefMode, setDomainPrefMode] = useState<"total" | "active">("total");

  return (
    <LuminaShell>
      <LxPageHeader
        crumb="ADMIN · DASHBOARD"
        title="Operating snapshot"
        subtitle="Where conversion stands today, where load sits, and where attention is needed."
        right={<LxLivePill />}
      />

      <LxLmpFilters
        filters={filters}
        set={set}
        pocOptions={prepPocOptions}
        showPrepPoc
        showOutreachPoc
      />

      {/* ─────── SECTION 1: Unified LMP Health + Status ─────── */}
      <LxGrid>
        <LxHero
          eyebrow="LMP Health Summary"
          title="Live snapshot of the selected view vs. the full pipeline"
          primaryValue={`${conversionRate.toFixed(1)}%`}
          primaryLabel="overall conversion"
          variant="mu"
          span={12}
          stats={[
            {
              label: "In current view",
              value: filtered.length.toLocaleString(),
              sub: `${converted} converted · ${ongoing} ongoing`,
            },
            {
              label: "Overall LMPs",
              value: all.length.toLocaleString(),
              sub: `${all.filter(isConverted).length} converted across all processes`,
            },
            {
              label: "Conversion",
              value: `${conversionRate.toFixed(1)}%`,
              sub: `${converted} of ${filtered.length} in view`,
              accent: "success",
            },
          ]}
          rightSlot={
            <StatusMiniDonut
              total={filtered.length}
              segments={[
                { label: "Ongoing",        value: sc.Ongoing,           accent: "info" },
                { label: "Offer Received", value: sc["Offer Received"], accent: "yellow" },
                { label: "Converted",      value: sc.Converted,         accent: "success" },
                { label: "On Hold",        value: sc["On Hold"],        accent: "ai" },
                { label: "Dormant",        value: sc.Dormant,           accent: "orange" },
                { label: "Closed",         value: sc.Closed,            accent: "risk" },
              ]}
            />
          }
          footer={
            <StatusStrip
              total={filtered.length}
              segments={[
                { label: "Ongoing",        value: sc.Ongoing,           accent: "info" },
                { label: "Offer Received", value: sc["Offer Received"], accent: "yellow" },
                { label: "Converted",      value: sc.Converted,         accent: "success" },
                { label: "On Hold",        value: sc["On Hold"],        accent: "ai" },
                { label: "Dormant",        value: sc.Dormant,           accent: "orange" },
                { label: "Closed",         value: sc.Closed,            accent: "risk" },
              ]}
            />
          }
        />
      </LxGrid>

      {/* ─────── SECTION 4: Domain load (live from domains table) ─────── */}
      <LxSection eyebrow="Domains" title="Where is the load concentrated?" hint="Active load by domain — with total processes and conversion rate from the domains database." />
      <LxGrid>
        <LxCard span={12}>
          <LxCardHeader eyebrow="Active load" title="Domain load (ranked)"
            hint="Bar length reflects active LMPs. Chips show total processes and conversion rate." />
          {(() => {
            type DomainRow = { name: string; total_lmps: number; active_lmps: number; converted_lmps: number; conversion_rate: number };
            const rows = (domainRows as DomainRow[])
              .filter((d) => d.name && d.name.toLowerCase() !== "unmapped")
              .map((d) => ({
                label: d.name,
                value: Number(d.active_lmps ?? 0),
                total: Number(d.total_lmps ?? 0),
                converted: Number(d.converted_lmps ?? 0),
                conv: Number(d.conversion_rate ?? 0),
              }))
              .sort((a, b) => b.value - a.value);
            return (
              <LxRankedBar
                accent="info"
                maxItems={12}
                rows={rows}
                chips={(r) => {
                  const meta = rows.find((x) => x.label === r.label);
                  if (!meta) return null;
                  return (
                    <span className="flex items-center gap-1.5 text-[10.5px] font-medium">
                      <span className="px-1.5 py-[1px] rounded-full" style={{ background: "var(--lx-soft)", color: "var(--lx-text-2)" }}>
                        {meta.total} total
                      </span>
                      <span className="px-1.5 py-[1px] rounded-full" style={{ background: "rgba(106,158,98,0.14)", color: "var(--lx-success, #6A9E62)" }}>
                        {meta.conv.toFixed(1)}% conv
                      </span>
                    </span>
                  );
                }}
              />
            );
          })()}
        </LxCard>
      </LxGrid>

      {/* ─────── SECTION 4.5: Student analytics ─────── */}
      <LxSection
        eyebrow="Student analytics"
        title="Student distribution, participation, and inactivity snapshot"
      />

      {/* Row 1 — metrics strip */}
      <LxGrid>
        <LxKpi span={2} label="Total students"        accent="info"    value={totalStudentsDb}
          sub="Live · students DB" />
        <LxKpi span={2} label="In current view"       accent="teal"    value={studentStats.totalStudents}
          sub="Unique in selected scope" />
        <LxKpi span={2} label="In Process (Unique)"   accent="success" value={studentStats.activeStudents}
          sub="At least 1 process" />
        <LxKpi span={2} label="Single Process"        accent="success" value={studentStats.singleProcess}
          sub="Exactly 1 process" />
        <LxKpi span={2} label="Multiple Processes"    accent="ai"      value={studentStats.multipleProcesses}
          sub="2+ processes" />
        <LxKpi span={2} label="Inactive (0 Process)"  accent="risk"    value={studentStats.inactiveStudents}
          sub="Zero processes" />
      </LxGrid>

      {/* Row 2 — cohort distribution */}
      <LxGrid>
        {Object.keys(studentStats.cohortAgg).length === 0 ? (
          <LxCard span={12}>
            <div className="px-4 py-8 text-center text-[12px]" style={{ color: "var(--lx-text-3)" }}>
              No students in DB yet.
            </div>
          </LxCard>
        ) : (
          Object.entries(studentStats.cohortAgg ?? {})
            .filter(([, c]) => c && typeof c === "object")
            .sort((a, b) => ((b[1]?.total ?? 0) - (a[1]?.total ?? 0)))
            .map(([cohort, c]) => {
              const inProcess = c.single + c.multiple;
              const pct = (n: number) => (c.total ? (n / c.total) * 100 : 0);
              return (
                <LxCard key={cohort} span={6}>
                  <LxCardHeader
                    eyebrow="Cohort"
                    title={cohort}
                    hint={`${c.total} total · ${inProcess} in process · ${c.inactive} inactive`}
                  />
                  <LxStackedBar
                    segments={[
                      { label: "Single Process",     value: c.single,   accent: "success" },
                      { label: "Multiple Processes", value: c.multiple, accent: "info" },
                      { label: "Inactive",           value: c.inactive, accent: "risk" },
                    ]}
                  />
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11.5px]" style={{ color: "var(--lx-text-3)" }}>
                    <div>
                      <div className="uppercase tracking-[0.5px] text-[10px]">Single</div>
                      <div className="mt-0.5"><span className="font-semibold" style={{ color: "var(--lx-text)" }}>{c.single}</span> · {pct(c.single).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-[0.5px] text-[10px]">Multiple</div>
                      <div className="mt-0.5"><span className="font-semibold" style={{ color: "var(--lx-text)" }}>{c.multiple}</span> · {pct(c.multiple).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-[0.5px] text-[10px]">Inactive</div>
                      <div className="mt-0.5"><span className="font-semibold" style={{ color: "var(--lx-text)" }}>{c.inactive}</span> · {pct(c.inactive).toFixed(0)}%</div>
                    </div>
                  </div>
                </LxCard>
              );
            })
        )}
      </LxGrid>

      {/* Row 3 — domain preference */}
      <LxGrid>
        <LxCard span={12}>
          <LxCardHeader
            eyebrow="Domain preference"
            title="Students by domain"
            hint="Number of unique students participating per domain."
            right={
              <div className="inline-flex rounded-md p-0.5" style={{ background: "var(--lx-soft)", border: "1px solid var(--lx-border)" }}>
                {(["total", "active"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setDomainPrefMode(m)}
                    className="px-2.5 h-7 text-[11.5px] font-medium rounded-[5px] transition-colors"
                    style={{
                      background: domainPrefMode === m ? "var(--lx-surface)" : "transparent",
                      color: domainPrefMode === m ? "var(--lx-text)" : "var(--lx-text-3)",
                      boxShadow: domainPrefMode === m ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    }}
                  >
                    {m === "total" ? "Total students" : "Active only"}
                  </button>
                ))}
              </div>
            }
          />
          <LxRankedBar
            accent="info"
            maxItems={12}
            rows={[...(domainPrefMode === "active" ? studentStats.domainRowsActive : studentStats.domainRowsTotal)].sort((a, b) => b.value - a.value)}
          />
        </LxCard>
      </LxGrid>

      {/* ─────── SECTION 5: POC Operational Load ─────── */}
      <LxSection eyebrow="People" title="POC capacity map" hint="Live from POC DB · every POC linked to any LMP (prep, support, outreach, admin)." />
      <LxGrid>
        <LxCard span={12}>
          <LxCardHeader
            eyebrow="All POCs"
            title="POC × LMP workload"
            hint="Every POC mapped to any LMP in any role · live from POC DB."
            right={capacityLoading ? <span className="text-[11px]" style={{ color: "var(--lx-text-3)" }}>Loading…</span> : <LxLivePill />}
          />
          {capacityPocs.length === 0 && !capacityLoading ? (
            <div className="px-4 py-8 text-center text-[12px]" style={{ color: "var(--lx-text-3)" }}>
              No POCs linked to any LMP.
            </div>
          ) : (
            <LxHeatmap
              rowLabels={capacityPocs}
              columns={[
                { label: "Total LMP (till today)", accent: "teal" },
                { label: "Current Load",           accent: "ai" },
                { label: "In-domain Load",         accent: "success" },
                { label: "Cross-domain Load",      accent: "orange" },
                { label: "Ongoing",   accent: "info" },
                { label: "Converted", accent: "success" },
                { label: "On Hold",   accent: "neutral" },
                { label: "Dormant",   accent: "orange" },
                { label: "Closed",    accent: "risk" },
              ]}
              values={heatmapMatrix}
              loadTotals={loadTotals}
              primaryIndex={1}
            />
          )}
        </LxCard>
      </LxGrid>


      <LxAttentionStrip
        items={[
          { label: "Highest risk domain",  value: highestRiskDomainName,        accent: "risk" },
          { label: "Most overloaded POC",  value: mostOverloadedPocName,        accent: "orange" },
          { label: "Pending offers",       value: attentionPendingOffers,       accent: "yellow" },
          { label: "Missing prep docs",    value: attentionMissingPrepDocs,     accent: "ai" },
          { label: "Overloaded POCs",      value: overloadedPocsCount,          accent: "info" },
        ]}
      />
    </LuminaShell>
  );
}

function StatusMiniDonut({
  total, segments,
}: {
  total: number;
  segments: { label: string; value: number; accent: LxAccent }[];
}) {
  const safe = segments.reduce((s, x) => s + x.value, 0) || 1;
  let cursor = 0;
  const stops = segments.map((s) => {
    const pct = (s.value / safe) * 100;
    const start = cursor; cursor += pct;
    return `${LX_HEX[s.accent]} ${start}% ${cursor}%`;
  });
  return (
    <div className="relative shrink-0" style={{ width: 132, height: 132 }} aria-hidden>
      <div
        className="h-full w-full rounded-full"
        style={{ background: stops.length ? `conic-gradient(${stops.join(", ")})` : "rgba(26,25,22,0.15)" }}
      />
      <div
        className="absolute inset-[14px] rounded-full grid place-items-center text-center"
        style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(26,25,22,0.08)" }}
      >
        <div>
          <div className="text-[22px] font-semibold leading-none" style={{ color: "var(--lx-text)" }}>{total}</div>
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.7px] mt-1" style={{ color: "rgba(26,25,22,0.62)" }}>
            Processes
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusStrip({
  total, segments,
}: {
  total: number;
  segments: { label: string; value: number; accent: LxAccent }[];
}) {
  const safe = total || 1;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {segments.map((s) => {
        const pct = (s.value / safe) * 100;
        const color = LX_HEX[s.accent];
        return (
          <div
            key={s.label}
            className="rounded-xl px-3 py-2.5 flex flex-col gap-1"
            style={{
              background: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(26,25,22,0.08)",
              borderLeft: `3px solid ${color}`,
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
              <div className="text-[10px] font-semibold uppercase tracking-[0.6px] truncate" style={{ color: "rgba(26,25,22,0.62)" }}>
                {s.label}
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-[20px] font-semibold leading-none" style={{ color: "var(--lx-text)" }}>{s.value}</div>
              <div className="text-[11.5px] font-semibold tabular-nums" style={{ color }}>{pct.toFixed(0)}%</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}