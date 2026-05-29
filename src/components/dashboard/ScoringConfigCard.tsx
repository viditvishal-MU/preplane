import { ArrowRight } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

const DATA = [
  { name: "Role",      value: 35, color: "hsl(var(--orange-500))" },
  { name: "Skills",    value: 25, color: "hsl(var(--teal-400))" },
  { name: "Company",   value: 15, color: "hsl(var(--plum-400))" },
  { name: "Industry",  value: 15, color: "hsl(var(--sky-400))" },
  { name: "Seniority", value: 10, color: "hsl(var(--sage-400))" },
];

export function ScoringConfigCard() {
  return (
    <section className="rounded-lg bg-white border border-n200 shadow-sm p-6 flex flex-col">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[20px] font-medium text-n900">Scoring Config</h3>
        <span className="text-[12px] text-n500">5 signals</span>
      </div>

      <div className="grid grid-cols-2 gap-4 items-center">
        <div className="relative h-[180px]">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={DATA}
                dataKey="value"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={2}
                stroke="none"
                isAnimationActive
              >
                {DATA.map(d => <Cell key={d.name} fill={d.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="text-center">
              <div className="text-[20px] font-bold text-n900 tabular-nums">100%</div>
              <div className="text-[10px] uppercase tracking-[0.5px] text-n500">Weighted</div>
            </div>
          </div>
        </div>

        <ul className="space-y-2">
          {DATA.map(d => (
            <li key={d.name} className="flex items-center gap-2 text-[12px] text-n700">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="flex-1 truncate">{d.name}</span>
              <span className="font-medium text-n900 tabular-nums">{d.value}%</span>
            </li>
          ))}
        </ul>
      </div>

      <button className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-orange-500 hover:text-orange-600 self-start transition-colors duration-150">
        Edit Weights <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </section>
  );
}
