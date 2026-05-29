import { Search, SlidersHorizontal, X, ArrowUpDown } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { COMPANIES, DOMAINS, POCS, STATUS_OPTIONS, type ReqStatus } from "@/lib/mockLmpData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export type AllocationFilter = "" | "domain" | "cross";
export type ProcessFilter = "" | "open" | "closed" | "none";
export type SortKey = "newest" | "oldest" | "candidates" | "duration";

export type Filters = {
  q: string;
  company: string;
  domain: string;
  poc: string;
  status: ReqStatus | "";
  allocation: AllocationFilter;
  process: ProcessFilter;
  sort: SortKey;
};

export const EMPTY_FILTERS: Filters = {
  q: "",
  company: "",
  domain: "",
  poc: "",
  status: "",
  allocation: "",
  process: "",
  sort: "newest",
};

export function activeFilterCount(f: Filters) {
  return (
    (["company", "domain", "poc", "status", "allocation", "process"] as const).filter((k) => f[k]).length +
    (f.q ? 1 : 0)
  );
}

export function LmpProcessFilters({
  value,
  onChange,
  trailing,
}: {
  value: Filters;
  onChange: (f: Filters) => void;
  trailing?: ReactNode;
}) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...value, [k]: v });
  const count = activeFilterCount(value);
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl bg-white border border-n200 shadow-sm p-3 flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-n400" strokeWidth={1.75} />
        <input
          value={value.q}
          onChange={(e) => set("q", e.target.value)}
          placeholder="Search role, company, POC..."
          className="w-full h-9 rounded-[10px] border border-n300 bg-white pl-9 pr-3 text-[13px] text-n800 placeholder:text-n400 focus:outline-none focus:border-orange-400"
        />
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-2 h-9 px-3 rounded-md border text-[13px] font-medium transition-colors",
          count > 0
            ? "border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100"
            : "border-n300 bg-white text-n700 hover:border-n400",
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filters
        {count > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-semibold">
            {count}
          </span>
        )}
      </button>

      {count > 0 && (
        <button
          onClick={() => onChange({ ...EMPTY_FILTERS, sort: value.sort })}
          className="inline-flex items-center gap-1 text-[12px] text-n500 hover:text-n800 px-2 py-1"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      )}

      {trailing && <div className="ml-auto flex items-center gap-2">{trailing}</div>}

      <FiltersModal open={open} onOpenChange={setOpen} value={value} onChange={onChange} />
    </div>
  );
}

function FiltersModal({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: Filters;
  onChange: (f: Filters) => void;
}) {
  const [draft, setDraft] = useState<Filters>(value);
  useEffect(() => { if (open) setDraft(value); }, [open, value]);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const apply = () => { onChange(draft); onOpenChange(false); };
  const reset = () => setDraft({ ...EMPTY_FILTERS, q: draft.q });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Filters</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Company">
              <ModalSelect value={draft.company} onChange={(v) => set("company", v)} placeholder="All companies" options={COMPANIES} />
            </Field>
            <Field label="Domain">
              <ModalSelect value={draft.domain} onChange={(v) => set("domain", v)} placeholder="All domains" options={DOMAINS} />
            </Field>
            <Field label="POC">
              <ModalSelect value={draft.poc} onChange={(v) => set("poc", v)} placeholder="All POCs" options={POCS} />
            </Field>
            <Field label="Process status">
              <ModalSelect
                value={draft.status}
                onChange={(v) => set("status", v as ReqStatus | "")}
                placeholder="Any status"
                options={STATUS_OPTIONS.map((s) => s.label)}
                valueMap={Object.fromEntries(STATUS_OPTIONS.map((s) => [s.label, s.value]))}
                reverseMap={Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s.label]))}
              />
            </Field>
            <Field label="Process status">
              <ModalSelect
                value={draft.process}
                onChange={(v) => set("process", v as ProcessFilter)}
                placeholder="Any process"
                options={["Open", "Closed", "None"]}
                valueMap={{ Open: "open", Closed: "closed", None: "none" }}
                reverseMap={{ open: "Open", closed: "Closed", none: "None" }}
              />
            </Field>
            <Field label="Sort by">
              <div className="relative">
                <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-n500 pointer-events-none" />
                <select
                  value={draft.sort}
                  onChange={(e) => set("sort", e.target.value as SortKey)}
                  className="w-full h-9 pl-7 pr-2 rounded-md border border-n300 bg-white text-[13px] text-n700 hover:border-n400 focus:outline-none focus:border-orange-400 transition-colors"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="candidates">Most candidates</option>
                  <option value="duration">Longest open</option>
                </select>
              </div>
            </Field>
          </div>

          <div className="rounded-lg border border-n200 bg-n50/50 p-3">
            <div className="text-[12px] font-semibold text-n800 mb-1">POC allocation</div>
            <p className="text-[11px] text-n500 mb-3">Separate in-domain vs cross-domain assignments.</p>
            <SegmentedToggle
              value={draft.allocation}
              onChange={(v) => set("allocation", v)}
              options={[
                { v: "", label: "All" },
                { v: "domain", label: "In-domain" },
                { v: "cross", label: "Cross-domain" },
              ]}
            />
          </div>
        </div>

        <DialogFooter className="flex !justify-between sm:!justify-between gap-2">
          <button
            type="button"
            onClick={reset}
            className="text-[13px] text-n500 hover:text-n800 px-2 py-1"
          >
            Reset
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 px-3 rounded-md border border-n300 bg-white text-[13px] text-n700 hover:border-n400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={apply}
              className="h-9 px-4 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-medium"
            >
              Apply
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-n500 mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-n300 bg-white p-0.5">
      {options.map(({ v, label }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "h-7 px-3 rounded-[6px] text-[12px] font-medium transition-colors",
              active ? "bg-n900 text-white" : "text-n600 hover:text-n900 hover:bg-n100",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ModalSelect({
  value, onChange, placeholder, options, valueMap, reverseMap,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
  valueMap?: Record<string, string>;
  reverseMap?: Record<string, string>;
}) {
  const display = reverseMap?.[value] ?? value;
  return (
    <select
      value={display}
      onChange={(e) => {
        const label = e.target.value;
        onChange(valueMap ? (valueMap[label] ?? "") : label);
      }}
      className={cn(
        "w-full h-9 rounded-md border px-3 text-[13px] focus:outline-none transition-colors",
        value
          ? "border-orange-400 bg-orange-50 text-orange-700"
          : "border-n300 bg-white text-n700 hover:border-n400",
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function Select({
  value, onChange, placeholder, options, valueMap, reverseMap,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
  valueMap?: Record<string, string>;
  reverseMap?: Record<string, string>;
}) {
  const display = reverseMap?.[value] ?? value;
  return (
    <select
      value={display}
      onChange={(e) => {
        const label = e.target.value;
        onChange(valueMap ? (valueMap[label] ?? "") : label);
      }}
      className={cn(
        "h-9 rounded-[10px] border px-3 text-[13px] focus:outline-none transition-colors min-w-[120px]",
        value
          ? "border-orange-400 bg-orange-50 text-orange-700"
          : "border-n300 bg-white text-n700 hover:border-n400",
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}