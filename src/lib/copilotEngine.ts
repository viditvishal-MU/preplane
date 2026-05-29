/**
 * LMP Copilot configuration.
 *
 * The actual AI logic runs server-side in the copilot-ai edge function
 * with full tool-calling capabilities. This file provides client-side
 * constants (modes, quick prompts) and a small batching layer so multiple
 * dashboard panels can ask the copilot at once without spawning N requests.
 */
import { supabase } from "@/integrations/supabase/client";

export type CopilotMode =
  | "auto" | "ask" | "summarize" | "update" | "assign" | "analyze" | "search";

export type PreviewKind =
  | "poc-dashboard" | "my-tasks" | "process" | "student" | "mentor"
  | "timeline" | "sla" | "poc-workload" | "lmp-board" | "risk";

export type PreviewPayload = {
  kind: PreviewKind;
  href: string;
  refId?: string;
  name?: string;
};

export const QUICK_PROMPTS: { title: string; sub: string; prompt: string }[] = [
  { title: "My today's tasks",   sub: "Active processes needing attention",        prompt: "What LMP processes need my attention today? Show ongoing ones with the oldest activity." },
  { title: "POC workload",       sub: "Load distribution across POCs",             prompt: "Show me the workload breakdown for all POCs — how many processes each one is handling and their conversion rates." },
  { title: "Process health",     sub: "Pipeline status & conversion",              prompt: "Give me a pipeline summary — total processes, status distribution, conversion rate, and domain breakdown." },
  { title: "Student risk list",  sub: "At-risk or stuck students",                 prompt: "Which students have an interview risk flag, low composite_primary, or low mock_score? Query the students table." },
  { title: "Mentor finder",      sub: "Find mentors by domain",                    prompt: "Find available mentors in the Finance functional_domain from the mentors table — return name, company, role, seniority, and overall_score." },
  { title: "SLA breaches",       sub: "Old processes past threshold",              prompt: "Show age tracking — which processes have been running the longest? Sort by age." },
  { title: "Recent updates",     sub: "Latest changes across processes",           prompt: "Search for all LMP processes updated in the last 7 days." },
  { title: "Bulk update",        sub: "Change multiple records at once",           prompt: "Show me all Dormant processes so I can decide which ones to mark as Closed." },
];

// ─── Batched, deduplicated copilot queries ────────────────────────────
// When several panels mount together (e.g. dashboard load) they can each call
// `askCopilot()` and we'll collapse them into one model call with a numbered
// multi-question prompt, splitting the answer back to each caller.
//
// Calls with different `lmpId` or `mode` are sent in parallel rather than
// merged (they can't legitimately share a system prompt or tool scope).

const BATCH_WINDOW_MS = 500;

type CopilotRequest = {
  prompt: string;
  mode: CopilotMode;
  lmpId?: string;
  snapshot?: string;
  resolve: (text: string) => void;
  reject: (err: unknown) => void;
};

let queue: CopilotRequest[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

export interface AskCopilotInput {
  prompt: string;
  mode?: CopilotMode;
  lmpId?: string;
  /** Stable snapshot fingerprint (e.g. `${rowCount}-${lastSyncedAt}`) — used for cache keying server-side. */
  snapshot?: string;
}

/** Queue a copilot question. Resolves with the assembled assistant text. */
export function askCopilot(input: AskCopilotInput): Promise<string> {
  return new Promise((resolve, reject) => {
    queue.push({
      prompt: input.prompt,
      mode: input.mode ?? "auto",
      lmpId: input.lmpId,
      snapshot: input.snapshot,
      resolve,
      reject,
    });
    if (!timer) {
      timer = setTimeout(() => {
        const batch = queue;
        queue = [];
        timer = null;
        void flushBatch(batch);
      }, BATCH_WINDOW_MS);
    }
  });
}

async function flushBatch(batch: CopilotRequest[]): Promise<void> {
  if (batch.length === 0) return;

  // Group by (mode, lmpId) — only requests sharing both can be merged.
  const groups = new Map<string, CopilotRequest[]>();
  for (const r of batch) {
    const key = `${r.mode}::${r.lmpId ?? ""}`;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }

  await Promise.all(
    Array.from(groups.values()).map((group) =>
      group.length === 1 ? sendSingle(group[0]) : sendMerged(group),
    ),
  );
}

async function sendSingle(req: CopilotRequest): Promise<void> {
  try {
    const text = await invokeCopilot([{ role: "user", content: req.prompt }], {
      mode: req.mode,
      lmpId: req.lmpId,
      snapshot: req.snapshot,
    });
    req.resolve(text);
  } catch (err) {
    req.reject(err);
  }
}

async function sendMerged(group: CopilotRequest[]): Promise<void> {
  const numbered = group
    .map((r, i) => `Q${i + 1}: ${r.prompt}`)
    .join("\n\n");
  const wrapped =
    `Answer each of the following questions independently. ` +
    `Prefix each answer with the matching tag on its own line: [A1], [A2], ... ` +
    `in the same order as the questions.\n\n${numbered}`;

  try {
    const text = await invokeCopilot([{ role: "user", content: wrapped }], {
      mode: group[0].mode,
      lmpId: group[0].lmpId,
      snapshot: group[0].snapshot,
    });

    const parts = splitNumberedAnswers(text, group.length);
    if (!parts) {
      // Parsing failed — give every caller the full text as a safe fallback.
      for (const r of group) r.resolve(text);
      return;
    }
    group.forEach((r, i) => r.resolve(parts[i] ?? text));
  } catch (err) {
    for (const r of group) r.reject(err);
  }
}

/** Split `[A1] ... [A2] ... [A3] ...` into ordered chunks. */
function splitNumberedAnswers(text: string, expected: number): string[] | null {
  const re = /\[A(\d+)\]/g;
  const matches: { idx: number; pos: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    matches.push({ idx: parseInt(m[1], 10) - 1, pos: m.index + m[0].length });
  }
  if (matches.length < expected) return null;
  const out: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].pos;
    const end = i + 1 < matches.length ? matches[i + 1].pos - `[A${matches[i + 1].idx + 1}]`.length : text.length;
    out[matches[i].idx] = text.slice(start, end).trim();
  }
  return out;
}

async function invokeCopilot(
  messages: { role: string; content: string }[],
  opts: { mode: CopilotMode; lmpId?: string; snapshot?: string },
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("copilot-ai", {
    body: {
      messages,
      mode: opts.mode,
      lmpId: opts.lmpId,
      snapshot: opts.snapshot,
    },
  });
  if (error) throw new Error(error.message);

  // The edge function returns SSE. supabase-js will hand us back the raw body
  // as a string when the content-type is text/event-stream.
  if (typeof data === "string") return assembleFromSse(data);
  if (data && typeof (data as { text?: string }).text === "string") return (data as { text: string }).text;
  return JSON.stringify(data ?? "");
}

function assembleFromSse(raw: string): string {
  let out = "";
  for (const block of raw.split("\n\n")) {
    const line = block.split("\n").find((l) => l.startsWith("data:"));
    if (!line) continue;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      const json = JSON.parse(data);
      const delta = json?.choices?.[0]?.delta?.content;
      if (typeof delta === "string") out += delta;
    } catch {
      /* skip non-JSON chunks */
    }
  }
  return out;
}
