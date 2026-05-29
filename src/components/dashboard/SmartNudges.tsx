import { motion } from "framer-motion";
import { Zap, ArrowRight, X } from "lucide-react";
import { useState } from "react";

const NUDGES = [
  { id: "n1", title: "3 processes have no mentor match yet", body: "Run matching now to surface candidates from MU + Alumni.",   cta: "Run matching" },
  { id: "n2", title: "PM @ Zomato has been Dormant for 18 days", body: "Reach out to Priya to log the next process step.", cta: "Open req" },
  { id: "n3", title: "2 sessions awaiting your confirmation", body: "Approve so the mentor can claim their slot.",         cta: "Review sessions" },
  { id: "n4", title: "Priya Sharma is at 91% of her threshold", body: "Consider routing the next req to a different POC.",  cta: "Reroute" },
];

export function SmartNudges() {
  const [items, setItems] = useState(NUDGES);
  const dismiss = (id: string) => setItems(xs => xs.filter(x => x.id !== id));

  if (items.length === 0) {
    return (
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h4 className="text-[20px] font-medium text-n900">Smart Nudges</h4>
        </div>
        <div className="rounded-lg border border-dashed border-n300 bg-white p-6 text-center text-[13px] text-n500">
          You're all caught up.
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h4 className="text-[20px] font-medium text-n900">Smart Nudges</h4>
        <button onClick={() => setItems([])} className="text-[12px] text-n500 hover:text-n900 hover:bg-n100 rounded-md px-2 py-1 transition-colors duration-150">
          Dismiss All
        </button>
      </div>
      <div className="-mx-1 overflow-x-auto">
        <ul className="flex gap-3 px-1 pb-1 snap-x">
          {items.map((n, i) => (
            <motion.li
              key={n.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22, delay: i * 0.08, ease: [0, 0, 0.2, 1] }}
              className="snap-start shrink-0 w-[280px] rounded-xl bg-orange-50 border border-orange-200 p-4 relative"
            >
              <button
                onClick={() => dismiss(n.id)}
                className="absolute top-2 right-2 h-6 w-6 grid place-items-center rounded-md text-orange-500/70 hover:text-orange-600 hover:bg-orange-100 transition-colors duration-150"
                aria-label="Dismiss"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
              <div className="h-7 w-7 rounded-md bg-white text-orange-500 grid place-items-center mb-2 shadow-sm">
                <Zap className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <div className="text-[14px] font-medium text-n800 leading-snug pr-4">{n.title}</div>
              <div className="text-[13px] text-n600 mt-1 leading-snug">{n.body}</div>
              <button className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-orange-600 hover:text-orange-500 transition-colors duration-150">
                {n.cta} <ArrowRight className="h-3 w-3" strokeWidth={2} />
              </button>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
