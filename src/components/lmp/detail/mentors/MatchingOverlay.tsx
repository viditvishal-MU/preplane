import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchingError } from "@/lib/mentorMatching";
import type { ExternalPlatform } from "@/lib/externalMentors";

export type MatchStepId = "MU" | "ALU" | "EXT" | "RANK";
export type MatchStep = { id: MatchStepId; label: string };

export const STEP_LABELS: Record<MatchStepId, string> = {
  MU: "Searching Mentor Union (MU)...",
  ALU: "Searching Alumni Database (ALU)...",
  EXT: "Searching External Sources (EXT)...",
  RANK: "Ranking & deduplicating results...",
};

const STEP_HINTS: Record<MatchStepId, string> = {
  MU: "Usually instant",
  ALU: "Usually instant",
  EXT: "AI discovery — usually 20–60 s",
  RANK: "Scoring and ranking…",
};

export type OverlayExternalStatus = {
  phase: "idle" | "loading" | "done" | "failed";
  platforms: ExternalPlatform[];
  counts: Partial<Record<ExternalPlatform, number>>;
};

type Props = {
  steps: MatchStep[];
  currentStep: number;
  errors?: MatchingError[];
  onDone: () => void;
  externalStatus?: OverlayExternalStatus;
};

function fmtElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function MatchingOverlay({ steps, currentStep, errors, onDone, externalStatus }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (steps.length > 0 && currentStep >= steps.length) {
      const t = setTimeout(onDone, 250);
      return () => clearTimeout(t);
    }
  }, [currentStep, steps.length, onDone]);

  const pct = steps.length === 0 ? 0 : Math.round((Math.min(currentStep, steps.length) / steps.length) * 100);
  const activeStep = steps[currentStep];
  const showExtChips =
    activeStep?.id === "EXT" &&
    externalStatus &&
    externalStatus.phase === "loading" &&
    externalStatus.platforms.length > 0;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 backdrop-blur-md rounded-2xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-[480px] max-w-full rounded-2xl bg-white border border-n200 shadow-xl p-6"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-plum-400/10 text-plum-400 border border-plum-400/30 px-3 py-1 text-[11px] uppercase tracking-[0.5px] font-medium">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-plum-400"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.9, repeat: Infinity }}
            />
            AI Matching
          </div>
          <span className="text-[11px] text-n500 tabular-nums">{fmtElapsed(elapsed)}</span>
        </div>
        <h4 className="mt-3 text-[18px] font-semibold text-n900">Finding the best mentors...</h4>
        <p className="text-[12px] text-n500 mt-0.5">
          This can take up to a minute when external AI discovery is enabled.
        </p>

        {errors && errors.length > 0 && (() => {
          const ALL: ("MU" | "ALU" | "EXT")[] = ["MU", "ALU", "EXT"];
          const failed = Array.from(new Set(errors.map((e) => e.source)));
          const available = ALL.filter((s) => !failed.includes(s));
          const summary = available.length === 0
            ? "All mentor sources unavailable — try again shortly"
            : `${failed.join(", ")} results unavailable — showing ${available.join(" + ")} only`;
          return (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 px-3 py-2 text-[12px] flex items-start gap-2">
              <span aria-hidden>⚠</span>
              <span>{summary}</span>
            </div>
          );
        })()}

        <ul className="mt-4 space-y-2">
          {steps.map((step, i) => {
            const done = i < currentStep;
            const current = i === currentStep;
            return (
              <motion.li
                key={step.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, delay: i * 0.06 }}
                className="flex items-start gap-2.5 text-[13px]"
              >
                <span
                  className={cn(
                    "h-4 w-4 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    done && "bg-sage-400 text-white",
                    current && "bg-orange-500/15 text-orange-500",
                    !done && !current && "bg-n100 text-n300",
                  )}
                >
                  {done ? (
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  ) : current ? (
                    <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} />
                  ) : null}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={cn(done ? "text-n700" : current ? "text-n900 font-medium" : "text-n400")}>
                    {step.label}
                  </div>
                  {current && (
                    <div className="text-[11px] text-n500 mt-0.5">{STEP_HINTS[step.id]}</div>
                  )}
                  {current && showExtChips && step.id === "EXT" && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {externalStatus!.platforms.map((p) => {
                        const c = externalStatus!.counts[p];
                        return (
                          <span
                            key={p}
                            className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700"
                          >
                            <motion.span
                              className="h-1.5 w-1.5 rounded-full bg-orange-500"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 0.9, repeat: Infinity }}
                            />
                            {p}
                            {typeof c === "number" && (
                              <span className="tabular-nums text-orange-600/80">· {c}</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.li>
            );
          })}
        </ul>

        <div className="mt-5 h-1.5 rounded-full bg-n100 overflow-hidden">
          <motion.div
            className="h-full bg-orange-500"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.35, ease: "linear" }}
          />
        </div>
        <div className="mt-1 text-right text-[11px] text-n500 tabular-nums">{pct}%</div>
      </motion.div>
    </div>
  );
}
