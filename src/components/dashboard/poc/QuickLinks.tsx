import { Link } from "react-router-dom";
import { Briefcase, Calendar, MessageSquare, Sparkles } from "lucide-react";

const LINKS = [
  { to: "/processes",       icon: Briefcase,    label: "Go to my processes" },
  { to: "/processes/REQ-1042", icon: Calendar,  label: "Pending sessions" },
  { to: "/processes/REQ-1042", icon: MessageSquare, label: "Submit feedback" },
  { to: "/processes/REQ-1042", icon: Sparkles,  label: "Run mentor match" },
];

export function QuickLinks() {
  return (
    <section className="rounded-2xl bg-white border border-n200 shadow-sm p-6 h-full">
      <h3 className="text-[18px] font-semibold text-n900 mb-3">Quick Links</h3>
      <ul className="space-y-1">
        {LINKS.map((l) => (
          <li key={l.label}>
            <Link
              to={l.to}
              className="group flex items-center gap-3 h-12 px-3 rounded-md text-[13px] font-medium text-n700 border-l-[3px] border-transparent hover:bg-n50 hover:border-orange-500 hover:text-n900 transition-all duration-150"
            >
              <l.icon className="h-4 w-4 text-n400 group-hover:text-orange-500 transition-colors" strokeWidth={1.75} />
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}