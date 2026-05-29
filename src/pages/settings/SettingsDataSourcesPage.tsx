import { useEffect, useState } from "react";
import { Database } from "lucide-react";
import { toast } from "sonner";
// Inlined from former useSheetsPoll module (now deleted).
const STORAGE_KEY_INTERVAL = "sheet_sync_interval_ms";
const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000;

const OPTIONS: { label: string; value: number; helper: string }[] = [
  { label: "Every 5 minutes", value: 5 * 60 * 1000, helper: "Default — closest to real-time" },
  { label: "Every 15 minutes", value: 15 * 60 * 1000, helper: "Lower load, slight delay" },
  { label: "Every 30 minutes", value: 30 * 60 * 1000, helper: "Minimal background activity" },
  { label: "Manual only", value: 0, helper: "Sync only when you click the button" },
];

function readStored(): number {
  const raw = localStorage.getItem(STORAGE_KEY_INTERVAL);
  if (raw == null) return DEFAULT_POLL_INTERVAL_MS;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_POLL_INTERVAL_MS;
}

const MIRROR_FLAG_KEY = "sheets_mirror_enabled";

export default function SettingsDataSourcesPage() {
  const [value, setValue] = useState<number>(() => readStored());
  const [mirror, setMirror] = useState<boolean>(() =>
    typeof window === "undefined" ? true : (localStorage.getItem(MIRROR_FLAG_KEY) ?? "true") === "true"
  );

  const toggleMirror = () => {
    const next = !mirror;
    setMirror(next);
    localStorage.setItem(MIRROR_FLAG_KEY, String(next));
    toast.success(next ? "Sheet mirror enabled" : "Sheet mirror disabled — DB only");
  };

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key !== STORAGE_KEY_INTERVAL) return;
      setValue(readStored());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = (next: number) => {
    setValue(next);
    localStorage.setItem(STORAGE_KEY_INTERVAL, String(next));
    // Notify the running poll in this tab (storage event only fires cross-tab).
    window.dispatchEvent(
      new StorageEvent("storage", { key: STORAGE_KEY_INTERVAL, newValue: String(next) })
    );
    toast.success("Sync frequency updated");
  };

  return (
    <div className="space-y-6">
      <header>
        <h3 className="text-[24px] font-semibold tracking-[-0.5px] text-n900">
          Data Sources (settings)
        </h3>
        <p className="text-[13px] text-n500 mt-1">
          Connection-level toggles. Full hub lives at /data-sources.
        </p>
      </header>

      <section className="rounded-xl border border-n200 bg-white p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-9 w-9 rounded-md bg-orange-50 text-orange-500 grid place-items-center">
            <Database className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div>
            <h4 className="text-[15px] font-semibold text-n900">Sync frequency</h4>
            <p className="text-[12.5px] text-n500 mt-0.5">
              How often the app polls Google Sheets for incremental changes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {OPTIONS.map((opt) => {
            const active = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => update(opt.value)}
                className={[
                  "text-left rounded-lg border px-3.5 py-3 transition",
                  active
                    ? "border-orange-400 bg-orange-50/60 ring-1 ring-orange-200"
                    : "border-n200 bg-white hover:border-n300 hover:bg-n50",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13.5px] font-medium text-n900">{opt.label}</span>
                  {active && (
                    <span className="text-[11px] font-medium text-orange-600">Active</span>
                  )}
                </div>
                <p className="text-[12px] text-n500 mt-0.5">{opt.helper}</p>
              </button>
            );
          })}
        </div>

        <p className="text-[11.5px] text-n500 mt-4">
          Changes apply immediately. Manual syncs from the topbar button always work
          regardless of this setting.
        </p>
      </section>

      <section className="rounded-xl border border-n200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-[15px] font-semibold text-n900">DB → Sheet mirror</h4>
            <p className="text-[12.5px] text-n500 mt-0.5 max-w-md">
              When enabled, every LMP edit also pushes back to Google Sheets (best-effort).
              Disable to make the database the single source of truth — Smart Sync still works.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleMirror}
            className={[
              "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition",
              mirror ? "bg-orange-500" : "bg-n300",
            ].join(" ")}
            aria-pressed={mirror}
          >
            <span
              className={[
                "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
                mirror ? "translate-x-5" : "translate-x-0.5",
              ].join(" ")}
            />
          </button>
        </div>
      </section>
    </div>
  );
}
