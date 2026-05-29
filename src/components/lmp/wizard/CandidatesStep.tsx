import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudUpload, Check, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type CV = { id: string; name: string; size: number; status: "queued" | "parsing" | "done" | "error"; parsedName?: string };

const NAMES = ["Arjun Mehta", "Sara Iyer", "Liam O'Connor", "Zara Khan", "Hiro Tanaka", "Maya Patel"];

export function CandidatesStep({ onFinish, onBack }: { onFinish: () => void; onBack: () => void }) {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dedupOpen, setDedupOpen] = useState(false);

  const addFiles = (files: FileList) => {
    const next: CV[] = Array.from(files).slice(0, 20 - cvs.length).map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      size: f.size,
      status: "queued",
    }));
    setCvs((prev) => [...prev, ...next]);
    next.forEach((cv, i) => {
      setTimeout(() => setCvs((p) => p.map((x) => x.id === cv.id ? { ...x, status: "parsing" } : x)), 400 + i * 200);
      setTimeout(() => setCvs((p) => p.map((x) => x.id === cv.id ? { ...x, status: "done", parsedName: NAMES[i % NAMES.length] } : x)), 1400 + i * 200);
    });
    if (next.length > 1) setTimeout(() => setDedupOpen(true), 1600);
  };

  return (
    <div>
      <h3 className="text-[20px] font-semibold text-n900 tracking-[-0.3px]">Upload Candidate CVs</h3>
      <p className="text-[13px] text-n500 mt-1">Optional · up to 20 files, 5 MB each.</p>

      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); }}
        className={cn(
          "mt-5 block h-[160px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all",
          drag ? "border-orange-500 bg-orange-50" : "border-n300 hover:border-orange-500 hover:bg-orange-50/50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          className="sr-only"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <CloudUpload className="h-8 w-8 text-n400" strokeWidth={1.5} />
        <div className="mt-2 text-[13px] text-n600">Drop CVs here or click to browse</div>
        <div className="text-[11px] text-n400 mt-0.5">PDF, DOCX, TXT</div>
      </label>

      <AnimatePresence>
        {dedupOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" strokeWidth={2} />
              <div className="flex-1">
                <p className="text-[13px] text-n800 font-medium">Duplicate detected: Arjun Mehta</p>
                <div className="mt-2 flex items-center gap-2">
                  <button className="text-[12px] rounded-md bg-white border border-n300 px-3 py-1 hover:bg-n100">Merge</button>
                  <button className="text-[12px] rounded-md bg-white border border-n300 px-3 py-1 hover:bg-n100">Keep Both</button>
                  <button className="text-[12px] rounded-md bg-white border border-n300 px-3 py-1 hover:bg-n100">Replace</button>
                </div>
              </div>
              <button onClick={() => setDedupOpen(false)} className="text-n500 hover:text-n800"><X className="h-4 w-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {cvs.length > 0 && (
        <div className="mt-5 rounded-xl border border-n200 bg-white overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-n100 text-n600">
              <tr>
                <th className="text-left px-3 py-2 w-10">#</th>
                <th className="text-left px-3 py-2">Filename</th>
                <th className="text-left px-3 py-2 w-32">Status</th>
                <th className="text-left px-3 py-2">Parsed Name</th>
              </tr>
            </thead>
            <tbody>
              {cvs.map((cv, i) => (
                <tr key={cv.id} className="border-t border-n100">
                  <td className="px-3 py-2 text-n500 tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2 text-n800 truncate max-w-[200px]">{cv.name}</td>
                  <td className="px-3 py-2">
                    {cv.status === "queued" && <span className="text-n400 text-[12px]">Queued</span>}
                    {cv.status === "parsing" && (
                      <span className="inline-flex items-center gap-1.5 text-plum-400 text-[12px]">
                        <motion.span className="h-1.5 w-1.5 rounded-full bg-plum-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.9, repeat: Infinity }} />
                        Parsing
                      </span>
                    )}
                    {cv.status === "done" && (
                      <span className="inline-flex items-center gap-1 text-sage-600 text-[12px]">
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Done
                      </span>
                    )}
                    {cv.status === "error" && (
                      <span className="inline-flex items-center gap-1 text-coral-600 text-[12px]">
                        <X className="h-3.5 w-3.5" /> Error
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-n700">{cv.parsedName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button onClick={onBack} className="text-[13px] text-n500 hover:text-n800">← Back</button>
        <div className="flex items-center gap-3">
          <button onClick={onFinish} className="text-[13px] text-n500 hover:text-n800">Skip for now</button>
          <button
            onClick={onFinish}
            className="rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[14px] font-medium px-5 py-2.5 shadow-sm"
          >
            Add {cvs.length || ""} Candidates to Req →
          </button>
        </div>
      </div>
    </div>
  );
}