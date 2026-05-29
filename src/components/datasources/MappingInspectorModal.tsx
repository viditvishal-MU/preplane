import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Loader2, RefreshCw, AlertTriangle, Search, X, ArrowLeftRight, ArrowLeft, ArrowRight, Settings2, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/roles";
import { useSyncIngest } from "@/lib/hooks/useDbData";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SHEET_TO_DB, DB_TO_SHEET } from "@/lib/sheets/fieldMap";

const TABS = ["LMP Tracker", "Mastersheet", "csv:student_db", "App-Only"] as const;
type TabName = typeof TABS[number];

const SHEET_TABS: TabName[] = ["LMP Tracker", "Mastersheet"];
const HEADER_ROWS: Partial<Record<TabName, number>> = { "LMP Tracker": 15, Mastersheet: 2 };
const CALCULATED_FIELDS = new Set(["r1_count", "r2_count", "r3_count", "mentor_feedback_avg"]);

type Registry = {
  id: string;
  tab_name: string;
  sheet_column: string;
  app_field: string | null;
  sync_direction: string;
  is_mapped: boolean;
  data_coverage_pct: number | null;
  last_verified_at: string | null;
  notes: string | null;
};

const colLetter = (i: number) => {
  let s = ""; let n = i + 1;
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

const normalizeHeader = (s: string) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();

const relativeTime = (iso: string | null) => {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

function DirectionBadge({ direction }: { direction: string }) {
  const d = (direction || "").toLowerCase();
  if (d === "bidirectional" || d === "both" || d === "two-way") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[11px] font-medium"><ArrowLeftRight className="h-3 w-3" /> Bidirectional</span>;
  }
  if (d === "read" || d === "sheet_to_db" || d === "sheet→db") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[11px] font-medium"><ArrowLeft className="h-3 w-3" /> Sheet → DB</span>;
  }
  if (d === "write" || d === "db_to_sheet" || d === "db→sheet" || d === "computed") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[11px] font-medium"><ArrowRight className="h-3 w-3" /> DB → Sheet</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-n100 text-n600 border border-n200 px-2 py-0.5 text-[11px] font-medium"><Settings2 className="h-3 w-3" /> {direction || "—"}</span>;
}

function useRegistry() {
  return useQuery<Registry[]>({
    queryKey: ["field-mapping-registry"],
    queryFn: async () => {
      const { data, error } = await supabase.from("field_mapping_registry").select("*").order("tab_name").order("sheet_column");
      if (error) throw error;
      return (data ?? []) as Registry[];
    },
    staleTime: 60_000,
  });
}

function useLiveSheetHeaders(_tab: TabName, _enabled: boolean) {
  // Live header probing is disabled — frontend no longer talks to the sheets
  // edge function. Registry rows are now the only source for mapping audits.
  return useQuery<string[]>({
    queryKey: ["sheet-headers-disabled"],
    enabled: false,
    queryFn: async () => [],
  });
}

export function MappingInspectorModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { role } = useRole();
  const isAdmin = role === "admin";
  const qc = useQueryClient();
  const syncIngest = useSyncIngest();

  const [activeTab, setActiveTab] = useState<TabName>("LMP Tracker");
  const [search, setSearch] = useState("");

  const { data: registry, isLoading: regLoading } = useRegistry();
  const { data: trackerHeaders, isLoading: thLoading } = useLiveSheetHeaders("LMP Tracker", open);
  const { data: msHeaders, isLoading: msLoading } = useLiveSheetHeaders("Mastersheet", open);

  const headersByTab: Partial<Record<TabName, string[]>> = {
    "LMP Tracker": trackerHeaders ?? [],
    "Mastersheet": msHeaders ?? [],
  };

  const reverify = useMutation({
    mutationFn: async () => {
      // Trigger an LMP sync to refresh upstream data
      await syncIngest.mutateAsync("lmp");
      const liveHeaders = headersByTab[activeTab] ?? [];
      const liveSet = new Set(liveHeaders.map(normalizeHeader));
      const tabRows = (registry ?? []).filter((r) => r.tab_name === activeTab);
      const matched = tabRows.filter((r) => liveSet.has(normalizeHeader(r.sheet_column)));
      if (matched.length) {
        await supabase.from("field_mapping_registry")
          .update({ last_verified_at: new Date().toISOString() })
          .in("id", matched.map((r) => r.id));
      }
      // record live headers not present in registry as unmapped sheet columns
      const regSet = new Set(tabRows.map((r) => normalizeHeader(r.sheet_column)));
      const stray = liveHeaders.filter((h) => h && !regSet.has(normalizeHeader(h)));
      if (stray.length) {
        await supabase.from("unmapped_items").insert(stray.map((h) => ({
          item_type: "sheet_column",
          raw_value: h,
          source_tab: activeTab,
          source_field: h,
        })));
      }
      return { matched: matched.length, stray: stray.length };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["field-mapping-registry"] });
      qc.invalidateQueries({ queryKey: ["sheet-headers"] });
      toast({ title: "Mapping re-verified", description: `${r.matched} fields verified · ${r.stray} unmapped sheet columns flagged` });
    },
    onError: (e: Error) => toast({ title: "Re-verify failed", description: e.message, variant: "destructive" }),
  });

  const tabRows = useMemo(() => {
    const all = registry ?? [];
    const filtered = all.filter((r) => r.tab_name === activeTab);
    const liveHeaders = headersByTab[activeTab] ?? [];
    const hasLive = liveHeaders.length > 0;
    const headerIndex = new Map<string, number>();
    liveHeaders.forEach((h, i) => { if (h) headerIndex.set(normalizeHeader(h), i); });

    const colRegex = /^col\s+([a-z]+)\b/i;
    const humanize = (s: string | null | undefined) =>
      (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const enriched = filtered.map((r) => {
      const liveIdx = headerIndex.get(normalizeHeader(r.sheet_column));
      const liveHeader = liveIdx !== undefined ? liveHeaders[liveIdx] : null;
      const calculated = r.app_field ? CALCULATED_FIELDS.has(r.app_field) : false;

      let col = "—";
      if (liveIdx !== undefined) {
        col = colLetter(liveIdx);
      } else {
        const m = colRegex.exec(r.sheet_column) || colRegex.exec(r.notes || "");
        if (m) col = m[1].toUpperCase();
      }

      let displayHeader = r.sheet_column;
      const stripped = displayHeader.replace(colRegex, "").trim();
      if (!stripped) displayHeader = humanize(r.app_field) || r.sheet_column;
      else if (stripped !== displayHeader) displayHeader = stripped;

      return {
        ...r,
        liveIdx,
        liveHeader,
        col,
        displayHeader,
        calculated,
        broken: hasLive && SHEET_TABS.includes(activeTab) && liveIdx === undefined,
      };
    });

    const colRank = (c: string) => {
      if (!c || c === "—") return Number.MAX_SAFE_INTEGER;
      let n = 0;
      for (const ch of c) n = n * 26 + (ch.charCodeAt(0) - 64);
      return n;
    };
    enriched.sort((a, b) => {
      if (a.liveIdx !== undefined && b.liveIdx !== undefined) return a.liveIdx - b.liveIdx;
      const ra = colRank(a.col); const rb = colRank(b.col);
      if (ra !== rb) return ra - rb;
      return a.sheet_column.localeCompare(b.sheet_column);
    });

    if (!search.trim()) return enriched;
    const q = search.toLowerCase();
    return enriched.filter((r) =>
      r.sheet_column.toLowerCase().includes(q) ||
      (r.app_field || "").toLowerCase().includes(q) ||
      (r.liveHeader || "").toLowerCase().includes(q) ||
      (r.displayHeader || "").toLowerCase().includes(q),
    );
  }, [registry, activeTab, headersByTab, search]);

  const warnings = useMemo(() => {
    if (!SHEET_TABS.includes(activeTab)) return { broken: [] as Registry[], stray: [] as string[] };
    const liveHeaders = headersByTab[activeTab] ?? [];
    const liveSet = new Set(liveHeaders.map(normalizeHeader).filter(Boolean));
    const reg = (registry ?? []).filter((r) => r.tab_name === activeTab);
    const regSet = new Set(reg.map((r) => normalizeHeader(r.sheet_column)));
    const broken = reg.filter((r) => !liveSet.has(normalizeHeader(r.sheet_column)));
    const stray = liveHeaders.filter((h) => h && !regSet.has(normalizeHeader(h)));
    return { broken, stray };
  }, [registry, headersByTab, activeTab]);

  const headersLoading = (activeTab === "LMP Tracker" && thLoading) || (activeTab === "Mastersheet" && msLoading);
  const loading = regLoading || headersLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-n200">
          <DialogTitle className="text-[20px] font-semibold text-n900 flex items-center gap-2">
            Mapping Inspector
            <span className="text-[11px] font-normal text-n500 border border-n200 rounded-full px-2 py-0.5">live</span>
          </DialogTitle>
          <p className="text-[13px] text-n500 mt-1">
            Live Sheet ↔ DB column mapping with sync direction and verification status.
          </p>
        </DialogHeader>

        <div className="px-6 py-3 border-b border-n100 flex items-center gap-2 flex-wrap bg-n50/40">
          <div className="flex items-center gap-1 rounded-md bg-white border border-n200 p-0.5">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={cn(
                  "px-3 py-1.5 rounded text-[12px] font-medium transition-colors",
                  activeTab === t ? "bg-n900 text-white" : "text-n600 hover:text-n900 hover:bg-n100",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-n400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search header, DB column…"
              className="w-full pl-8 pr-8 py-1.5 rounded-md border border-n200 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-n400 hover:text-n700">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {isAdmin && SHEET_TABS.includes(activeTab) && (
            <button
              onClick={() => reverify.mutate()}
              disabled={reverify.isPending || syncIngest.isPending}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 text-amber-700 hover:bg-amber-50 px-3 py-1.5 text-[12px] font-medium disabled:opacity-50"
            >
              {reverify.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Re-verify now
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-n500 text-[13px]">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading mapping…
            </div>
          ) : (
            <>
              {SHEET_TABS.includes(activeTab) && (headersByTab[activeTab]?.length ?? 0) > 0 && (warnings.broken.length > 0 || warnings.stray.length > 0) && (
                <div className="mb-4 rounded-md border border-amber-200 bg-amber-50/60 p-3">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-amber-800 mb-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> {warnings.broken.length + warnings.stray.length} mapping warnings
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
                    <div>
                      <div className="text-n700 font-medium mb-1">Missing in sheet ({warnings.broken.length})</div>
                      <div className="text-n600 max-h-24 overflow-y-auto leading-relaxed">
                        {warnings.broken.length === 0 ? <span className="text-n400">none</span> : warnings.broken.map((b) => b.sheet_column).join(", ")}
                      </div>
                    </div>
                    <div>
                      <div className="text-n700 font-medium mb-1">Unmapped sheet columns ({warnings.stray.length})</div>
                      <div className="text-n600 max-h-24 overflow-y-auto leading-relaxed">
                        {warnings.stray.length === 0 ? <span className="text-n400">none</span> : warnings.stray.join(", ")}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "LMP Tracker" && (
                <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-[12px] text-emerald-800">
                  <span className="font-medium">One-way sync:</span> the LMP Tracker sheet is a mirror of the database.
                  All 27 columns (A–AA) are written from <code className="font-mono">lmp_processes</code> →
                  Sheet. Manual edits in the sheet are <span className="font-medium">not</span> read back.
                </div>
              )}


              {activeTab === "LMP Tracker" && (
                <CodeMapAudit registry={(registry ?? []).filter((r) => r.tab_name === "LMP Tracker")} />
              )}


              <div className="rounded-md border border-n200 overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead className="bg-n50 text-n600 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-3 py-2 w-12">Col</th>
                      <th className="text-left px-3 py-2">Sheet header</th>
                      <th className="text-left px-3 py-2">DB column</th>
                      <th className="text-left px-3 py-2">Direction</th>
                      <th className="text-left px-3 py-2 w-28">Verified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabRows.length === 0 && (
                      <tr><td colSpan={5} className="text-center text-n400 py-8 text-[13px]">No mappings match.</td></tr>
                    )}
                    {tabRows.map((r) => {
                      const stale = !r.last_verified_at || (Date.now() - new Date(r.last_verified_at).getTime() > 7 * 24 * 60 * 60 * 1000);
                      const verifiedClass = !r.is_mapped || stale ? "text-coral-600" : "text-n600";
                      return (
                        <tr key={r.id} className={cn("border-t border-n100 hover:bg-n50/50", r.broken && "bg-coral-50")}>
                          <td className="px-3 py-2 font-mono text-n500 text-[12px]">{r.col}</td>
                          <td className="px-3 py-2">
                            <div className="text-n900">{r.liveHeader || r.displayHeader}</div>
                            {r.liveHeader && normalizeHeader(r.liveHeader) !== normalizeHeader(r.sheet_column) && (
                              <div className="text-[11px] text-amber-700 mt-0.5">registry: {r.sheet_column}</div>
                            )}
                            {r.broken && <div className="text-[11px] text-coral-600 mt-0.5">⚠ not found in live sheet</div>}
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-mono text-[12px] text-n800">{r.app_field || <span className="text-n400 italic">—</span>}</span>
                            {r.calculated && (
                              <span className="ml-1.5 inline-flex items-center rounded-full bg-n100 text-n600 border border-n200 px-1.5 py-[1px] text-[10px]">calculated</span>
                            )}
                            {r.notes && <div className="text-[11px] text-n500 mt-0.5">{r.notes}</div>}
                          </td>
                          <td className="px-3 py-2">
                            <DirectionBadge direction={r.calculated ? "computed" : r.sync_direction} />
                          </td>
                          <td className={cn("px-3 py-2 text-[12px] tabular-nums", verifiedClass)}>
                            {relativeTime(r.last_verified_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 text-[11px] text-n500">
                Showing {tabRows.length} of {(registry ?? []).filter((r) => r.tab_name === activeTab).length} fields in <span className="font-medium text-n700">{activeTab}</span>.
                {SHEET_TABS.includes(activeTab) && (headersByTab[activeTab]?.length ?? 0) > 0 && (
                  <> · {headersByTab[activeTab]!.length} live sheet columns detected.</>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Code-level fieldMap audit for LMP Tracker.
 *
 * Cross-references the actual code-level SHEET_TO_DB / DB_TO_SHEET maps
 * (the only thing the edge sync functions actually use) against the
 * `field_mapping_registry` rows. Surfaces:
 *  - Sheet→DB only (read-only by design — sheet is source of truth)
 *  - DB→Sheet only (UI writes back, sheet doesn't drive it)
 *  - Bidirectional
 *  - In registry but missing from code maps  → NOT actually synced
 *  - In code maps but missing from registry  → undocumented
 */
function CodeMapAudit({ registry }: { registry: Registry[] }) {
  const [open, setOpen] = useState(true);

  const rows = useMemo(() => {
    // Collapse SHEET_TO_DB by db column (multiple sheet headers → one db col).
    const sheetByDb = new Map<string, string[]>();
    for (const [sheetCol, dbCol] of Object.entries(SHEET_TO_DB)) {
      const list = sheetByDb.get(dbCol) ?? [];
      list.push(sheetCol);
      sheetByDb.set(dbCol, list);
    }
    const dbCols = new Set<string>([
      ...Object.values(SHEET_TO_DB),
      ...Object.keys(DB_TO_SHEET),
    ]);

    const out = Array.from(dbCols).map((dbCol) => {
      const sheetHeaders = sheetByDb.get(dbCol) ?? [];
      const writeBackHeader = DB_TO_SHEET[dbCol];
      const hasRead = sheetHeaders.length > 0;
      const hasWrite = !!writeBackHeader;
      const direction: "read" | "write" | "bidirectional" = hasRead && hasWrite
        ? "bidirectional"
        : hasWrite
          ? "write"
          : "read";
      const headerForRegistry =
        writeBackHeader ?? sheetHeaders[0] ?? "";
      const registryHit = registry.find(
        (r) => normalizeHeader(r.app_field || "") === normalizeHeader(dbCol)
          || normalizeHeader(r.sheet_column) === normalizeHeader(headerForRegistry),
      );
      return {
        dbCol,
        sheetHeaders,
        writeBackHeader,
        direction,
        registryHit,
      };
    });
    out.sort((a, b) => a.dbCol.localeCompare(b.dbCol));
    return out;
  }, [registry]);

  // Registry-only entries (declared but code maps don't carry them).
  const registryOnly = useMemo(() => {
    const codeDbCols = new Set(rows.map((r) => r.dbCol.toLowerCase()));
    return registry.filter(
      (r) => r.app_field && !codeDbCols.has(r.app_field.toLowerCase()),
    );
  }, [registry, rows]);

  const counts = useMemo(() => ({
    bidirectional: rows.filter((r) => r.direction === "bidirectional").length,
    read: rows.filter((r) => r.direction === "read").length,
    write: rows.filter((r) => r.direction === "write").length,
    registryOnly: registryOnly.length,
  }), [rows, registryOnly]);

  return (
    <div className="mb-4 rounded-md border border-n200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-n50"
      >
        <div className="flex items-center gap-2 text-[12px] font-medium text-n800">
          <Settings2 className="h-3.5 w-3.5 text-n500" />
          Code-level sync map (what the edge functions actually do)
          <span className="text-[11px] text-n500 font-normal">
            · {counts.bidirectional} both · {counts.read} sheet→DB · {counts.write} DB→sheet
            {counts.registryOnly > 0 && (
              <span className="text-coral-600"> · {counts.registryOnly} not wired in code</span>
            )}
          </span>
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-n400" /> : <ChevronDown className="h-3.5 w-3.5 text-n400" />}
      </button>
      {open && (
        <div className="border-t border-n100">
          <table className="w-full text-[12.5px]">
            <thead className="bg-n50 text-n600 text-[10.5px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-1.5">DB column</th>
                <th className="text-left px-3 py-1.5">Sheet header(s)</th>
                <th className="text-left px-3 py-1.5 w-32">Direction</th>
                <th className="text-left px-3 py-1.5 w-32">Registry</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const sheetText = r.direction === "write"
                  ? r.writeBackHeader
                  : r.sheetHeaders[0] + (r.sheetHeaders.length > 1 ? `  (+${r.sheetHeaders.length - 1})` : "");
                return (
                  <tr key={r.dbCol} className="border-t border-n100">
                    <td className="px-3 py-1.5 font-mono text-[12px] text-n800">{r.dbCol}</td>
                    <td className="px-3 py-1.5 text-n700">{sheetText}</td>
                    <td className="px-3 py-1.5">
                      <DirectionBadge direction={r.direction} />
                    </td>
                    <td className="px-3 py-1.5 text-[11.5px]">
                      {r.registryHit ? (
                        <span className="text-emerald-700">declared</span>
                      ) : (
                        <span className="text-amber-700">undeclared</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {registryOnly.map((r) => (
                <tr key={`reg-${r.id}`} className="border-t border-n100 bg-coral-50">
                  <td className="px-3 py-1.5 font-mono text-[12px] text-coral-600">{r.app_field || "—"}</td>
                  <td className="px-3 py-1.5 text-n700">{r.sheet_column}</td>
                  <td className="px-3 py-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-coral-50 text-coral-600 border border-coral-200 px-2 py-0.5 text-[11px] font-medium">
                      <AlertTriangle className="h-3 w-3" /> not wired
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-[11.5px] text-coral-600">registry only</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
