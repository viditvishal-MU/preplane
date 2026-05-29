import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const DATA = [
  { round: "R1 — HR",        count: 9 },
  { round: "R2 — Technical", count: 7 },
  { round: "R3 — Manager",   count: 5 },
  { round: "R4 — Converted ", count: 2 },
  { round: "Offer",          count: 1 },
];

export function RoundActivityChart() {
  return (
    <section className="rounded-2xl bg-white border border-n200 shadow-sm p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h4 className="text-[18px] font-semibold text-n900">Candidates by Round Stage</h4>
        <span className="text-[12px] text-n500">across all my processes</span>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={DATA} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis dataKey="round" type="category" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} width={110} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
              formatter={(v: number) => [`${v} candidates`, ""]}
            />
            <Bar dataKey="count" fill="hsl(var(--orange-500))" radius={[0, 6, 6, 0]} background={{ fill: "hsl(var(--n200))", radius: 6 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}