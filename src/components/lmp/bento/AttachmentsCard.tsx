import { File, Plus } from "lucide-react";

const MOCK_FILES = [
  { name: "JD_v2.pdf", size: "240 KB" },
  { name: "R2_brief.pdf", size: "112 KB" },
];

export function AttachmentsCard({ mode = "action" }: { mode?: "action" | "summary" }) {
  const summary = mode === "summary";
  return (
    <div className={summary ? "rounded-2xl bg-n50/40 border border-n200 p-4" : "rounded-2xl bg-white border border-n200 shadow-sm p-4"}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[13px] font-semibold text-n800">Attachments</h4>
        {summary ? (
          <span className="text-[10.5px] text-n400">View only</span>
        ) : (
          <button className="inline-flex items-center gap-1 text-[11.5px] text-n500 hover:text-n800">
            <Plus className="h-3 w-3" /> Add
          </button>
        )}
      </div>
      <ul className="space-y-1.5">
        {MOCK_FILES.map((f) => (
          <li
            key={f.name}
            className="flex items-center gap-2 rounded-md border border-n200 bg-n50/40 px-2.5 py-1.5"
          >
            <File className="h-3.5 w-3.5 text-n400" />
            <span className="text-[12px] text-n800 truncate flex-1">{f.name}</span>
            <span className="text-[11px] text-n400 tabular-nums">{f.size}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}