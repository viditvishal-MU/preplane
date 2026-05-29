import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "Ongoing" | "Dormant" | "Hold" | "Converted" | "Not Converted" | "Closed";

type Req = {
  id: string;
  role: string;
  company: string;
  domain: string;
  poc: string;
  pocInitials: string;
  candidates: number;
  status: Status;
};

const PILL: Record<Status, string> = {
  "Ongoing":       "pill pill-ongoing",
  "Dormant":       "pill pill-dormant",
  "Hold":          "pill pill-hold",
  "Converted":     "pill pill-converted",
  "Not Converted": "pill pill-not-converted",
  "Closed":        "pill pill-closed",
};

const ROWS: Req[] = [
  { id: "r1",  role: "Product Manager",   company: "Stripe",    domain: "Product",     poc: "Priya",  pocInitials: "PS", candidates: 6, status: "Ongoing" },
  { id: "r2",  role: "Sr. Designer",       company: "Figma",     domain: "Design",      poc: "Mei",    pocInitials: "MT", candidates: 3, status: "Dormant" },
  { id: "r3",  role: "Eng Manager",        company: "Datadog",   domain: "Engineering", poc: "Devon",  pocInitials: "DN", candidates: 8, status: "Ongoing" },
  { id: "r4",  role: "Data Scientist",     company: "Spotify",   domain: "Data",        poc: "Carlos", pocInitials: "CR", candidates: 4, status: "Converted" },
  { id: "r5",  role: "Growth Marketer",    company: "Notion",    domain: "Growth",      poc: "Aisha",  pocInitials: "AB", candidates: 2, status: "Hold" },
  { id: "r6",  role: "Backend Engineer",   company: "Linear",    domain: "Engineering", poc: "Devon",  pocInitials: "DN", candidates: 5, status: "Ongoing" },
  { id: "r7",  role: "Brand Lead",         company: "Vercel",    domain: "Design",      poc: "Mei",    pocInitials: "MT", candidates: 1, status: "Not Converted" },
  { id: "r8",  role: "PMM",                company: "Airtable",  domain: "Product",     poc: "Priya",  pocInitials: "PS", candidates: 4, status: "Ongoing" },
  { id: "r9",  role: "ML Engineer",        company: "Anthropic", domain: "ML",          poc: "Carlos", pocInitials: "CR", candidates: 7, status: "Ongoing" },
  { id: "r10", role: "Lifecycle Manager",  company: "Headspace", domain: "Growth",      poc: "Aisha",  pocInitials: "AB", candidates: 3, status: "Dormant" },
];

type SortKey = keyof Pick<Req, "role" | "company" | "domain" | "poc" | "candidates" | "status">;

export function RecentReqsTable() {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "candidates", dir: "desc" });

  const sorted = useMemo(() => {
    const arr = [...ROWS];
    arr.sort((a, b) => {
      const av = a[sort.key]; const bv = b[sort.key];
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [sort]);

  const toggle = (k: SortKey) =>
    setSort(s => s.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "asc" });

  const Th = ({ k, label, align = "left" }: { k: SortKey; label: string; align?: "left" | "right" }) => (
    <th className={cn("font-medium px-3 py-2.5", align === "right" && "text-right")}>
      <button
        onClick={() => toggle(k)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-n900 transition-colors duration-150",
          sort.key === k ? "text-n900" : "text-n500",
        )}
      >
        {label}
        <ArrowUpDown className="h-3 w-3" strokeWidth={1.5} />
      </button>
    </th>
  );

  return (
    <section className="rounded-lg bg-white border border-n200 shadow-sm p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-[20px] font-medium text-n900">Recent Processes</h3>
        <button className="inline-flex items-center gap-1 text-[13px] font-medium text-orange-500 hover:text-orange-600 transition-colors duration-150">
          View All <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
      <div className="overflow-x-auto -mx-6">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.5px] border-y border-n200 bg-n50">
              <th className="px-6"><Th k="role"       label="Role" /></th>
              <Th k="company"    label="Company" />
              <Th k="domain"     label="Domain" />
              <Th k="poc"        label="POC" />
              <Th k="candidates" label="Candidates" align="right" />
              <Th k="status"     label="Status" />
              <th className="font-medium px-6 py-2.5 text-right text-n500">View</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.id} className="border-b border-n100 hover:bg-n50 transition-colors duration-150">
                <td className="px-6 py-2.5 text-n900 font-medium">{r.role}</td>
                <td className="px-3 py-2.5 text-n700">{r.company}</td>
                <td className="px-3 py-2.5">
                  <span className="text-[10px] uppercase tracking-[0.5px] font-medium bg-n100 text-n600 border border-n200 rounded-full px-2 py-[2px]">
                    {r.domain}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-n900 text-white grid place-items-center text-[10px] font-medium">{r.pocInitials}</div>
                    <span className="text-n700">{r.poc}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right text-n900 tabular-nums">{r.candidates}</td>
                <td className="px-3 py-2.5">
                  <span className={PILL[r.status]}>{r.status}</span>
                </td>
                <td className="px-6 py-2.5 text-right">
                  <button className="inline-flex items-center gap-1 text-[12px] text-n600 hover:text-n900 hover:bg-n100 rounded-md px-2 py-1 transition-colors duration-150">
                    Open <ArrowRight className="h-3 w-3" strokeWidth={2} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
