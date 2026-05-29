import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  role: string;
  company: string;
  stage: string;
  slaDays: number;
};

const ROWS: Row[] = [
  { id: "REQ-1042", role: "Product Manager",  company: "Swiggy",   stage: "R2 — Technical",     slaDays: 6 },
  { id: "REQ-1036", role: "Growth PM",        company: "Meesho",   stage: "Awaiting CVs",       slaDays: 35 },
  { id: "REQ-1029", role: "Sr Product Lead",  company: "PhonePe",  stage: "R1 — HR",            slaDays: 4 },
  { id: "REQ-1024", role: "PM, Payments",     company: "Razorpay", stage: "Mentor Match Pending", slaDays: 9 },
  { id: "REQ-1018", role: "Principal PM",     company: "Zomato",   stage: "Dormant",            slaDays: 22 },
];

function slaTone(days: number) {
  if (days < 14) return "bg-sage-50 text-sage-600 border-sage-200";
  if (days <= 30) return "bg-yellow-50 text-yellow-600 border-yellow-200";
  return "bg-coral-50 text-coral-600 border-coral-200";
}

export function MyReqsList() {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h4 className="text-[18px] font-semibold text-n900">My Processes</h4>
        <Link to="/processes" className="inline-flex items-center gap-1 text-[13px] text-orange-600 hover:text-orange-500 font-medium">
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <ul className="space-y-2">
        {ROWS.map((r, i) => (
          <motion.li
            key={r.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
            className="rounded-xl bg-white border border-n200 shadow-sm hover:shadow-md hover:border-n300 transition-all duration-220 px-4 py-3 flex items-center gap-3"
          >
            <div className="min-w-0 flex-1">
              <Link to={`/processes/${r.id}`} className="text-[14px] font-semibold text-n900 hover:text-orange-600 truncate block">
                {r.role} <span className="text-n400 font-normal">@</span> {r.company}
              </Link>
            </div>
            <span className="hidden md:inline-flex rounded-full bg-n100 text-n700 text-[11px] font-medium px-2.5 py-0.5 whitespace-nowrap">
              {r.stage}
            </span>
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums whitespace-nowrap", slaTone(r.slaDays))}>
              {r.slaDays}d
            </span>
            <div className="flex items-center gap-1">
              <Link to={`/processes/${r.id}`} className="h-8 px-2.5 rounded-md text-[12px] text-n700 hover:bg-n100 font-medium transition-colors">Pipeline</Link>
              <Link to={`/processes/${r.id}`} className="h-8 px-2.5 rounded-md text-[12px] text-n700 hover:bg-n100 font-medium transition-colors">Match</Link>
              <Link to={`/processes/${r.id}`} className="h-8 px-2.5 rounded-md text-[12px] text-n700 hover:bg-n100 font-medium transition-colors">Sessions</Link>
            </div>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}