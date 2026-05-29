import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Sparkles, RefreshCw, AlertCircle, Clock, Database, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useCopilotInsights, type InsightsRange } from "@/hooks/useCopilotInsights";
import { useRole } from "@/lib/roles";

const RANGES: { value: InsightsRange; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent-foreground))",
  "hsl(24 95% 53%)",
  "hsl(262 83% 58%)",
  "hsl(173 58% 39%)",
  "hsl(43 96% 56%)",
  "hsl(199 89% 48%)",
];

function fmtMs(ms: number) {
  if (!ms) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function statusVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (!status) return "outline";
  if (status.startsWith("ok")) return "secondary";
  if (status === "rate_limited" || status === "max_rounds") return "outline";
  return "destructive";
}

export default function CopilotInsightsPage() {
  const { role } = useRole();
  const isAdmin = role === "admin" || role === "allocator";
  const [range, setRange] = useState<InsightsRange>("7d");
  const { rows, aggregates: a, loading, error, refresh } = useCopilotInsights(range);

  const recent = useMemo(() => rows.slice(0, 50), [rows]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Copilot Insights</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? "Org-wide observability for every Copilot turn — latency, tool usage, errors and cache effectiveness."
              : "Your personal Copilot activity over the selected window."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border p-0.5 bg-card">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={cn(
                  "px-3 h-8 text-xs rounded-sm transition-colors",
                  range === r.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => refresh()} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-4 flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            Failed to load insights: {error}
          </CardContent>
        </Card>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total turns" value={a.total.toLocaleString()} hint={`${a.uniqueUsers} users · ${a.uniqueThreads} threads`} loading={loading} icon={<Sparkles className="h-4 w-4" />} />
        <KpiCard label="P95 latency" value={fmtMs(a.latency.p95)} hint={`p50 ${fmtMs(a.latency.p50)} · avg ${fmtMs(a.latency.avg)}`} loading={loading} icon={<Clock className="h-4 w-4" />} />
        <KpiCard label="Error rate" value={`${a.errorRate.toFixed(1)}%`} hint={`${a.errorCount} of ${a.total}`} loading={loading} icon={<AlertCircle className="h-4 w-4" />} tone={a.errorRate > 5 ? "danger" : "ok"} />
        <KpiCard label="Cache hit rate" value={`${a.cacheRate.toFixed(1)}%`} hint={`saves ~${fmtMs(Math.max(0, a.missAvgMs - a.cachedAvgMs))} / hit`} loading={loading} icon={<Database className="h-4 w-4" />} />
      </div>

      {loading && rows.length === 0 ? (
        <SkeletonGrid />
      ) : a.total === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Turns per day</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={a.perDay}>
                    <defs>
                      <linearGradient id="okFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Area type="monotone" dataKey="ok" stackId="1" stroke="hsl(var(--primary))" fill="url(#okFill)" name="OK" />
                    <Area type="monotone" dataKey="error" stackId="1" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.3} name="Error" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Latency p50 vs p95</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={a.perDay}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(1)}s`} />
                    <Tooltip formatter={(v: number) => fmtMs(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Bar dataKey="p50" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="p50" />
                    <Bar dataKey="p95" fill="hsl(24 95% 53%)" radius={[4, 4, 0, 0]} name="p95" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Mid row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <DonutCard title="Mode mix" data={a.modeMix} />
            <DonutCard title="Intent mix" data={a.intentMix} />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5" /> Top tools used
                </CardTitle>
              </CardHeader>
              <CardContent>
                {a.topTools.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">No tools called in this window.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={a.topTools} layout="vertical" margin={{ left: 8 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={130} />
                      <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent turns */}
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Recent turns</CardTitle>
              <span className="text-xs text-muted-foreground">Last {recent.length} of {a.total}</span>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">When</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Intent</TableHead>
                      <TableHead className="text-right">Latency</TableHead>
                      <TableHead className="text-right">Tools</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Thread</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="font-normal">{r.mode || "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{r.intent || "—"}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {r.cache_hit ? <span className="text-primary">cached · </span> : null}
                          {fmtMs(r.latency_ms || 0)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {r.tool_calls_count || 0}
                          {r.used_write_tool && <span className="ml-1 text-orange-500" title="Write tool used">✎</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(r.status)} className="text-[10px]">
                            {r.status || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {r.thread_id ? (
                            <Link to={`/copilot?thread=${r.thread_id}`} className="text-primary hover:underline">
                              open
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({
  label, value, hint, icon, loading, tone = "default",
}: {
  label: string; value: string; hint?: string; icon?: React.ReactNode; loading?: boolean;
  tone?: "default" | "ok" | "danger";
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
          {icon && <span className={cn(
            "text-muted-foreground",
            tone === "danger" && "text-destructive",
            tone === "ok" && "text-primary",
          )}>{icon}</span>}
        </div>
        {loading ? (
          <Skeleton className="h-7 w-24 mt-2" />
        ) : (
          <div className={cn(
            "text-2xl font-semibold mt-1 tabular-nums",
            tone === "danger" && "text-destructive",
          )}>{value}</div>
        )}
        {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function DonutCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">No data.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i}><CardContent className="py-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="py-16 text-center space-y-3">
        <Sparkles className="h-8 w-8 mx-auto text-muted-foreground" />
        <h3 className="font-medium">No Copilot activity in this window</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Once people start chatting with the LMP Copilot, every turn will show up here with latency, tool usage and error breakdowns.
        </p>
        <Button asChild size="sm" className="mt-2">
          <Link to="/copilot">Open Copilot</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
