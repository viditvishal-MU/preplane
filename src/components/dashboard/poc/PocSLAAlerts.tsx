import { AlertTriangle } from "lucide-react";

const ALERTS = [
  { id: "REQ-1018", role: "Principal PM", company: "Zomato",  days: 22 },
  { id: "REQ-1036", role: "Growth PM",    company: "Meesho",  days: 35 },
  { id: "REQ-1024", role: "PM, Payments", company: "Razorpay",days: 9  },
];

export function PocSLAAlerts() {
  return (
    <section className="rounded-2xl bg-white border border-n200 shadow-sm p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-4 w-4 text-coral-600" strokeWidth={1.75} />
        <h3 className="text-[18px] font-semibold text-n900">SLA Alerts</h3>
        <span className="ml-auto inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-coral-50 text-coral-600 border border-coral-200 text-[11px] font-medium tabular-nums">
          {ALERTS.length}
        </span>
      </div>
      <ul className="divide-y divide-n100 flex-1">
        {ALERTS.map((a) => (
          <li key={a.id} className="py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-n800 truncate">
                {a.role} <span className="text-n400 font-normal">@</span> {a.company}
              </div>
              <div className="mt-1 inline-flex items-center text-[11px] uppercase tracking-[0.5px] font-medium bg-coral-50 text-coral-600 border border-coral-200 rounded-full px-2 py-[2px]">
                {a.days} days stale
              </div>
            </div>
            <button className="text-[12px] text-orange-600 hover:text-orange-500 hover:bg-orange-50 rounded-md px-2.5 py-1.5 font-medium transition-colors">
              Update Pipeline
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}