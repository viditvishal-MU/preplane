import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";

const DATA = [
  { week: "W14", Ongoing: 6,  Dormant: 2, Hold: 1, Converted: 1, NotConverted: 0 },
  { week: "W15", Ongoing: 7,  Dormant: 2, Hold: 1, Converted: 2, NotConverted: 1 },
  { week: "W16", Ongoing: 9,  Dormant: 3, Hold: 0, Converted: 2, NotConverted: 1 },
  { week: "W17", Ongoing: 8,  Dormant: 4, Hold: 2, Converted: 3, NotConverted: 1 },
  { week: "W18", Ongoing: 10, Dormant: 3, Hold: 1, Converted: 2, NotConverted: 2 },
  { week: "W19", Ongoing: 11, Dormant: 4, Hold: 1, Converted: 4, NotConverted: 1 },
];

const COLORS = {
  Ongoing:      "hsl(var(--teal-400))",
  Dormant:      "hsl(var(--yellow-400))",
  Hold:         "hsl(var(--n400))",
  Converted:    "hsl(var(--orange-500))",
  NotConverted: "hsl(var(--coral-400))",
} as const;

export function PipelineByStatus() {
  return (
    <section className="rounded-lg bg-white border border-n200 shadow-sm p-6 h-full">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-[20px] font-medium text-n900">Pipeline by Status</h3>
        <span className="text-[12px] text-n500">Last 6 weeks</span>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer>
          <BarChart data={DATA} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid stroke="hsl(var(--n200))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="week" tick={{ fill: "hsl(var(--n500))", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(var(--n500))", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: "hsl(var(--n100))" }}
              contentStyle={{
                background: "white",
                border: "1px solid hsl(var(--n200))",
                borderRadius: 10,
                fontSize: 12,
                boxShadow: "var(--shadow-md)",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              iconSize={8}
              iconType="circle"
            />
            {Object.entries(COLORS).map(([k, c]) => (
              <Bar key={k} dataKey={k} stackId="a" fill={c} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
