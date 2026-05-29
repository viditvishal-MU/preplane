import { useState, useMemo } from "react";
import { useStudents } from "@/lib/hooks/useDbData";
import { useRealtimeInvalidate } from "@/lib/hooks/useRealtimeInvalidate";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { PillSelect } from "@/components/ui/pill-select";

type SortKey = "roll_no" | "name" | "primary_domain" | "secondary_domain" | "cohort";

function deriveProgram(rollNo: string): "TBM" | "YLC" | "" {
  if (rollNo?.startsWith("YLC")) return "YLC";
  if (rollNo?.startsWith("PGP")) return "TBM";
  return "";
}

export default function StudentsPage() {
  const { data: students = [], isLoading } = useStudents();
  useRealtimeInvalidate("students", [["db-students"], ["db-students-with-load"]]);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("All");
  const [programFilter, setProgramFilter] = useState<"All" | "TBM" | "YLC">("All");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const domains = useMemo(() => {
    const set = new Set((students as any[]).map((s) => s.primary_domain).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [students]);

  // KPIs
  const kpis = useMemo(() => {
    const all = students as any[];
    const tbm = all.filter(s => deriveProgram(s.roll_no) === "TBM").length;
    const ylc = all.filter(s => deriveProgram(s.roll_no) === "YLC").length;
    return { total: all.length, tbm, ylc, domains: new Set(all.map(s => s.primary_domain).filter(Boolean)).size };
  }, [students]);

  // Domain breakdown
  const domainBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of students as any[]) {
      const d = s.primary_domain || "Unknown";
      map.set(d, (map.get(d) || 0) + 1);
    }
    return [...map.entries()]
      .map(([domain, total]) => ({ domain, total }))
      .sort((a, b) => b.total - a.total);
  }, [students]);

  const filtered = useMemo(() => {
    let rows = students as any[];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.roll_no?.toLowerCase().includes(q) ||
          s.primary_domain?.toLowerCase().includes(q)
      );
    }
    if (domainFilter !== "All") rows = rows.filter((s) => s.primary_domain === domainFilter);
    if (programFilter !== "All") rows = rows.filter((s) => deriveProgram(s.roll_no) === programFilter);
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      return sortAsc ? String(av ?? "").localeCompare(String(bv ?? "")) : String(bv ?? "").localeCompare(String(av ?? ""));
    });
    return rows;
  }, [students, search, domainFilter, programFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (sortAsc ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />) : null;

  const programBadge = (rollNo: string) => {
    const p = deriveProgram(rollNo);
    if (p === "TBM") return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-200 text-orange-700 bg-orange-50">TBM</Badge>;
    if (p === "YLC") return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-teal-200 text-teal-700 bg-teal-50">YLC</Badge>;
    return <span className="text-[11px] text-muted-foreground">—</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Student Data · Live"
        title="Student Directory"
        subtitle={`${kpis.total} students synced from Student Data sheet`}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Students", value: kpis.total, accent: "text-blue-600 bg-blue-50" },
          { label: "TBM", value: kpis.tbm, accent: "text-orange-600 bg-orange-50" },
          { label: "YLC", value: kpis.ylc, accent: "text-teal-600 bg-teal-50" },
          { label: "Domains", value: kpis.domains, accent: "text-indigo-600 bg-indigo-50" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-n200 bg-card p-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={`h-6 w-6 rounded-md flex items-center justify-center ${k.accent}`}>
                <Users className="h-3.5 w-3.5" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.5px] font-medium text-muted-foreground">{k.label}</span>
            </div>
            <div className="text-[20px] font-bold text-foreground tabular-nums">{k.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Domain breakdown chips */}
      <div>
        <h3 className="text-[11px] uppercase tracking-[0.5px] font-semibold text-muted-foreground mb-2">By Domain</h3>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {domainBreakdown.map((d) => (
            <button
              key={d.domain}
              onClick={() => setDomainFilter(domainFilter === d.domain ? "All" : d.domain)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-left transition-colors ${
                domainFilter === d.domain ? "border-orange-300 bg-orange-50" : "bg-card hover:border-orange-200"
              }`}
            >
              <div className="text-[11px] font-medium text-foreground truncate max-w-[140px]">{d.domain}</div>
              <div className="text-[13px] font-bold tabular-nums text-foreground mt-0.5">{d.total}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-n200 bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, roll no, domain…"
          />
          <PillSelect
            value={domainFilter}
            onChange={setDomainFilter}
            options={domains.map((d) => ({ value: d, label: d === "All" ? "All domains" : d }))}
          />
          <PillSelect
            value={programFilter}
            onChange={(v) => setProgramFilter(v as "All" | "TBM" | "YLC")}
            options={[
              { value: "All", label: "All programs" },
              { value: "TBM", label: "TBM" },
              { value: "YLC", label: "YLC" },
            ]}
          />
          <span className="text-[12px] text-muted-foreground ml-auto tabular-nums">{filtered.length} of {kpis.total} shown</span>
        </div>
      </div>


      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
        <ScrollArea className="rounded-xl border bg-card shadow-sm" style={{ maxHeight: "60vh" }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {([
                  ["roll_no", "Roll No"],
                  ["name", "Name"],
                  ["primary_domain", "Primary Domain"],
                  ["secondary_domain", "Secondary Domain"],
                  ["cohort", "Program"],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <TableHead key={key} className="cursor-pointer select-none whitespace-nowrap text-[11px] uppercase tracking-[0.5px]" onClick={() => toggleSort(key)}>
                    {label}<SortIcon col={key} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s: any) => (
                <TableRow key={s.id} className="text-[13px] hover:bg-muted/30">
                  <TableCell className="font-mono text-muted-foreground tabular-nums text-[11px]">{s.roll_no}</TableCell>
                  <TableCell className="font-medium text-foreground whitespace-nowrap">
                    <Link to={`/students/${encodeURIComponent(s.roll_no)}`} className="hover:text-orange-600 transition-colors">{s.name}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[12px]">{s.primary_domain || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-[12px]">{s.secondary_domain || "—"}</TableCell>
                  <TableCell>{programBadge(s.roll_no)}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No students match your filters.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </div>
  );
}
