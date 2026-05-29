import { useEffect, useMemo, useRef, useState } from "react";
import { Send, X, AtSign, Copy, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLmpRows } from "@/lib/sheets/hooks";
import {
  SECTION_MENTIONS,
  deleteMessage,
  formatChatTime,
  getParticipants,
  sendMessage,
  useChat,
  useLmpChatDrawer,
  type ChatMention,
  type ChatMessage,
  type ChatParticipant,
} from "@/lib/lmpChat";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

/**
 * Global LMP-level comments drawer. Notion/WhatsApp-style chat slid in from
 * the right. Triggered via `useLmpChatDrawer()`.
 */
export function LmpCommentsDrawer() {
  const { openLmpId, close } = useLmpChatDrawer();
  const open = !!openLmpId;

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={close}
        className={cn(
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        aria-hidden
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-label="LMP comments"
        className={cn(
          "fixed right-0 top-0 z-50 h-screen w-full sm:w-[440px] bg-white border-l border-n200 shadow-2xl flex flex-col",
          "transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {open && openLmpId && <DrawerInner lmpId={openLmpId} onClose={close} />}
      </aside>
    </>
  );
}

function DrawerInner({ lmpId, onClose }: { lmpId: string; onClose: () => void }) {
  const { data: lmpRecords = [] } = useLmpRows();
  const rec = lmpRecords.find((r) => r.id === lmpId);
  const messages = useChat(lmpId);
  const participants = useMemo(() => getParticipants(lmpId), [lmpId]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Group messages by date
  const grouped = useMemo(() => groupByDay(messages), [messages]);

  return (
    <>
      {/* Header */}
      <header className="shrink-0 px-4 py-3.5 border-b border-n200 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.6px] text-n400 font-medium">Discussion</div>
          <h3 className="text-[15px] font-semibold text-n900 truncate leading-snug">
            {rec ? <>{rec.role || <span className="text-n400 italic font-normal">No role</span>}{rec.company && <><span className="text-n400 font-normal"> @ </span>{rec.company}</>}</> : lmpId}
          </h3>
          <ParticipantStrip people={participants} />
        </div>
        <button
          onClick={onClose}
          className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-n500 hover:text-n900 hover:bg-n100 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* Body */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5 bg-n50/40">
        {grouped.length === 0 ? (
          <EmptyState />
        ) : (
          grouped.map((g) => (
            <div key={g.label} className="space-y-2.5">
              <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.6px] text-n400 font-medium">
                <div className="h-px bg-n200 flex-1" />
                {g.label}
                <div className="h-px bg-n200 flex-1" />
              </div>
              {g.items.map((m) => (
                <MessageRow key={m.id} m={m} lmpId={lmpId} />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <Composer lmpId={lmpId} participants={participants} />
    </>
  );
}

function ParticipantStrip({ people }: { people: ChatParticipant[] }) {
  const visible = people.slice(0, 4);
  const overflow = people.length - visible.length;
  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex items-center gap-1.5 mt-2">
        <div className="flex -space-x-1.5">
          {visible.map((p) => (
            <Tooltip key={p.id}>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "h-6 w-6 rounded-full ring-2 ring-white inline-flex items-center justify-center text-[9.5px] font-semibold",
                    p.color,
                  )}
                >
                  {p.initials}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                <div className="font-semibold">{p.name}</div>
                <div className="text-n500">{p.role}</div>
              </TooltipContent>
            </Tooltip>
          ))}
          {overflow > 0 && (
            <span className="h-6 w-6 rounded-full ring-2 ring-white bg-n100 text-n600 text-[9.5px] font-semibold inline-flex items-center justify-center">
              +{overflow}
            </span>
          )}
        </div>
        <span className="text-[11px] text-n500">{people.length} participants</span>
      </div>
    </TooltipProvider>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="mx-auto h-12 w-12 rounded-full bg-n100 inline-flex items-center justify-center text-n400 mb-3">
        <AtSign className="h-5 w-5" />
      </div>
      <div className="text-[13px] font-semibold text-n800">Start the conversation</div>
      <div className="text-[12px] text-n500 mt-1">
        Use <span className="font-mono text-n700">@</span> to tag people or sections.
      </div>
    </div>
  );
}

function MessageRow({ m, lmpId }: { m: ChatMessage; lmpId: string }) {
  if (m.type === "system") {
    return (
      <div className="flex justify-center">
        <span className="inline-flex items-center rounded-full bg-n100 border border-n200 text-n500 px-2.5 py-0.5 text-[11px] font-medium">
          {m.text} · {formatChatTime(m.ts)}
        </span>
      </div>
    );
  }
  return (
    <div className="group flex gap-2.5 items-start">
      <span
        className={cn(
          "h-8 w-8 rounded-full inline-flex items-center justify-center text-[10.5px] font-semibold shrink-0",
          m.authorColor,
        )}
      >
        {m.authorInitials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[12.5px] font-semibold text-n900 truncate">{m.author}</span>
          <span className="text-[10.5px] text-n400 tabular-nums">{formatChatTime(m.ts)}</span>
          <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(m.text);
                toast("Copied");
              }}
              className="h-6 w-6 inline-flex items-center justify-center rounded-md text-n400 hover:text-n800 hover:bg-n100"
              aria-label="Copy"
            >
              <Copy className="h-3 w-3" />
            </button>
            {m.author === "You" && (
              <button
                onClick={() => deleteMessage(lmpId, m.id)}
                className="h-6 w-6 inline-flex items-center justify-center rounded-md text-n400 hover:text-coral-600 hover:bg-coral-50"
                aria-label="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <div className="mt-0.5 inline-block max-w-full rounded-2xl rounded-tl-sm bg-white border border-n200 px-3 py-2 text-[13px] text-n800 leading-relaxed whitespace-pre-wrap break-words">
          <RenderMessageText text={m.text} mentions={m.mentions} />
        </div>
      </div>
    </div>
  );
}

function RenderMessageText({ text, mentions }: { text: string; mentions: ChatMention[] }) {
  // Highlight any @token whose label matches a known mention.
  const labels = new Set(mentions.map((m) => m.label.toLowerCase()));
  const parts = text.split(/(@[\w-]+(?:\s[\w-]+){0,2})/g);
  return (
    <>
      {parts.map((p, i) => {
        if (!p.startsWith("@")) return <span key={i}>{p}</span>;
        const candidate = p.slice(1).toLowerCase();
        const isMention = [...labels].some((l) => candidate.startsWith(l));
        if (!isMention) return <span key={i}>{p}</span>;
        return (
          <span
            key={i}
            className="inline-flex items-baseline rounded px-1 py-px bg-orange-50 text-orange-700 font-medium"
          >
            {p}
          </span>
        );
      })}
    </>
  );
}

/* ───────────────────────────── Composer ───────────────────────────── */

function Composer({
  lmpId,
  participants,
}: {
  lmpId: string;
  participants: ChatParticipant[];
}) {
  const [value, setValue] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);
  const mentionAnchorRef = useRef<number | null>(null);
  const [mentions, setMentions] = useState<ChatMention[]>([]);

  const options = useMemo(() => {
    const q = query.toLowerCase();
    const peopleOpts = participants
      .filter((p) => p.name.toLowerCase().includes(q))
      .map((p) => ({ kind: "user" as const, id: p.id, label: p.name, sub: p.role, color: p.color, initials: p.initials }));
    const sectionOpts = SECTION_MENTIONS
      .filter((s) => s.label.includes(q))
      .map((s) => ({ kind: "section" as const, id: s.id, label: s.label, sub: "Section", color: "bg-n100 text-n600", initials: "#" }));
    return [...peopleOpts, ...sectionOpts].slice(0, 8);
  }, [query, participants]);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setValue(v);
    autosize(e.target);
    const caret = e.target.selectionStart;
    const before = v.slice(0, caret);
    const at = before.lastIndexOf("@");
    if (at >= 0) {
      const after = before.slice(at + 1);
      // Trigger if @ is start-of-word and contains no newline
      const prevChar = at === 0 ? " " : before[at - 1];
      if (/\s/.test(prevChar) && !/\n/.test(after)) {
        mentionAnchorRef.current = at;
        setQuery(after.toLowerCase());
        setPickerOpen(true);
        setActiveIdx(0);
        return;
      }
    }
    setPickerOpen(false);
    mentionAnchorRef.current = null;
  };

  const insertMention = (opt: typeof options[number]) => {
    const anchor = mentionAnchorRef.current;
    if (anchor == null) return;
    const caret = ref.current?.selectionStart ?? value.length;
    const before = value.slice(0, anchor);
    const after = value.slice(caret);
    const insertion = `@${opt.label} `;
    const next = before + insertion + after;
    setValue(next);
    setMentions((m) => [...m, { kind: opt.kind, id: opt.id, label: opt.label } as ChatMention]);
    setPickerOpen(false);
    mentionAnchorRef.current = null;
    requestAnimationFrame(() => {
      const pos = (before + insertion).length;
      ref.current?.focus();
      ref.current?.setSelectionRange(pos, pos);
      if (ref.current) autosize(ref.current);
    });
  };

  const submit = () => {
    const text = value.trim();
    if (!text) return;
    sendMessage(lmpId, text, mentions);
    setValue("");
    setMentions([]);
    setPickerOpen(false);
    if (ref.current) ref.current.style.height = "auto";
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (pickerOpen && options.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => (i + 1) % options.length); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => (i - 1 + options.length) % options.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(options[activeIdx]); return; }
      if (e.key === "Escape") { setPickerOpen(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="shrink-0 border-t border-n200 bg-white p-3 relative">
      {pickerOpen && options.length > 0 && (
        <div className="absolute bottom-[calc(100%-4px)] left-3 right-3 mb-2 max-h-64 overflow-y-auto rounded-xl border border-n200 bg-white shadow-lg p-1 z-10">
          {options.map((opt, i) => (
            <button
              key={`${opt.kind}-${opt.id}`}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(opt); }}
              onMouseEnter={() => setActiveIdx(i)}
              className={cn(
                "w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                i === activeIdx ? "bg-orange-50" : "hover:bg-n50",
              )}
            >
              <span className={cn("h-6 w-6 rounded-full inline-flex items-center justify-center text-[10px] font-semibold", opt.color)}>
                {opt.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium text-n900 truncate">{opt.label}</div>
                <div className="text-[10.5px] text-n500">{opt.sub}</div>
              </div>
              <span className="text-[10px] uppercase tracking-[0.5px] text-n400">{opt.kind === "user" ? "Person" : "Section"}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 rounded-xl border border-n200 focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100 bg-white px-2.5 py-1.5 transition-colors">
        <textarea
          ref={ref}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Write a message…  Use @ to mention"
          rows={1}
          className="flex-1 resize-none bg-transparent text-[13px] leading-relaxed text-n900 placeholder:text-n400 focus:outline-none py-1 max-h-40"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim()}
          className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:bg-n200 disabled:text-n400 transition-colors"
          aria-label="Send"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-1.5 px-1 text-[10.5px] text-n400">
        <span className="font-mono text-n500">Enter</span> to send · <span className="font-mono text-n500">Shift + Enter</span> for new line
      </div>
    </div>
  );
}

/* ───────────────────────────── Helpers ───────────────────────────── */

function autosize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
}

function groupByDay(messages: ChatMessage[]): { label: string; items: ChatMessage[] }[] {
  const groups: { label: string; items: ChatMessage[] }[] = [];
  const today = startOfDay(new Date());
  const yesterday = startOfDay(new Date(Date.now() - 86_400_000));
  for (const m of messages) {
    const d = startOfDay(new Date(m.ts));
    let label: string;
    if (d.getTime() === today.getTime()) label = "Today";
    else if (d.getTime() === yesterday.getTime()) label = "Yesterday";
    else label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(m);
    else groups.push({ label, items: [m] });
  }
  return groups;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}