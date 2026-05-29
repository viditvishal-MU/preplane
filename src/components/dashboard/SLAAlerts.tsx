import { CheckCircle2, AlertTriangle } from "lucide-react";

type Alert = { role: string; company: string; days: number; pocInitials: string; pocName: string };

const ALERTS: Alert[] = [
  { role: "PM",          company: "Zomato",  days: 21, pocInitials: "PS", pocName: "Priya" },
  { role: "Sr Designer", company: "Razorpay",days: 18, pocInitials: "MT", pocName: "Mei" },
  { role: "Eng Manager", company: "Swiggy",  days: 15, pocInitials: "DN", pocName: "Devon" },
];

export function SLAAlerts({ empty = false }: { empty?: boolean }) {
  if (empty) {
    return (
      <section className="rounded-lg bg-white border border-n200 shadow-sm p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="h-12 w-12 rounded-full bg-sage-50 text-sage-600 grid place-items-center mb-3">
          <CheckCircle2 className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <h3 className="text-[18px] font-medium text-n900">Requires Attention</h3>
        <p className="font-display text-orange-500 text-[20px] mt-1">All processes on track</p>
        <p className="text-[12px] text-n500 mt-1">No processes have been inactive for 14+ days.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg bg-white border border-n200 shadow-sm p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-4 w-4 text-coral-600" strokeWidth={1.75} />
        <h3 className="text-[20px] font-medium text-n900">Requires Attention</h3>
        <span className="ml-auto inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-coral-50 text-coral-600 border border-coral-200 text-[11px] font-medium tabular-nums">
          {ALERTS.length}
        </span>
      </div>
      <ul className="divide-y divide-n100 -mx-2 flex-1">
        {ALERTS.map(a => (
          <li key={`${a.role}-${a.company}`} className="px-2 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-n800 truncate">
                {a.role} <span className="text-n500 font-medium">@</span> {a.company}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center text-[11px] uppercase tracking-[0.5px] font-medium bg-coral-50 text-coral-600 border border-coral-200 rounded-full px-2 py-[2px]">
                  {a.days} days
                </span>
                <span className="text-[11px] text-n500">POC {a.pocName}</span>
              </div>
            </div>
            <div className="h-7 w-7 rounded-full bg-n900 text-white grid place-items-center text-[10px] font-medium shrink-0" title={a.pocName}>
              {a.pocInitials}
            </div>
            <button className="text-[12px] text-n600 hover:text-n900 hover:bg-n100 rounded-md px-2 py-1 transition-colors duration-150 shrink-0">
              Log Process
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
