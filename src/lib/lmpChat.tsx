import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { LMP_RECORDS, type LmpRecord } from "./mockLMP";

/**
 * Global LMP-level chat (Notion/Slack-style comments). Lightweight in-memory
 * store, keyed by lmpId. Supports user + system messages and lightweight
 * mention tagging (people + canonical LMP sections).
 */

export type ChatMessageType = "user" | "system";

export type ChatMention =
  | { kind: "user"; id: string; label: string }
  | { kind: "section"; id: string; label: string };

export type ChatMessage = {
  id: string;
  lmpId: string;
  ts: number;
  type: ChatMessageType;
  author: string;
  authorInitials: string;
  authorColor: string;
  text: string;
  mentions: ChatMention[];
};

export type ChatParticipant = {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: "Admin" | "Allocator" | "POC" | "Mentor";
};

export const SECTION_MENTIONS: { id: string; label: string }[] = [
  { id: "daily-progress", label: "daily progress" },
  { id: "assignment-review", label: "assignment review" },
  { id: "mentor-alignment", label: "mentor alignment" },
  { id: "pipeline", label: "pipeline" },
  { id: "checklist", label: "checklist" },
  { id: "outreach", label: "outreach" },
];

const ADMIN_PARTICIPANT: ChatParticipant = {
  id: "u-vidit", name: "Vidit", initials: "V",
  color: "bg-n900 text-white", role: "Admin",
};

const EXTRA_MENTORS: ChatParticipant[] = [
  { id: "m-arjun",  name: "Arjun Kapoor",   initials: "AK", color: "bg-sky-400/20 text-sky-400",      role: "Mentor" },
  { id: "m-leena",  name: "Leena Bhat",     initials: "LB", color: "bg-plum-400/30 text-plum-400",    role: "Mentor" },
];

/* ───── store ───── */

const messages: Record<string, ChatMessage[]> = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

const EMPTY: ChatMessage[] = [];

const seed = (lmpId: string, rec?: LmpRecord) => {
  if (messages[lmpId]) return;
  const arr: ChatMessage[] = [];
  const now = Date.now();
  const dPoc = rec?.prepPoc || rec?.domainPrepPoc;
  if (dPoc) {
    arr.push({
      id: `m-${lmpId}-1`, lmpId, ts: now - 1000 * 60 * 60 * 26,
      type: "user", author: dPoc.name, authorInitials: dPoc.initials, authorColor: dPoc.color,
      text: "Kicked off prep with the candidate. Will share notes after the first mock.",
      mentions: [],
    });
  }
  arr.push({
    id: `m-${lmpId}-2`, lmpId, ts: now - 1000 * 60 * 60 * 12,
    type: "system", author: "System", authorInitials: "S", authorColor: "bg-n200 text-n600",
    text: `Status changed to ${rec?.status ?? "ongoing"}`,
    mentions: [],
  });
  const sPoc = rec?.supportPoc || rec?.behavioralPrepPoc;
  if (sPoc) {
    const b = sPoc;
    arr.push({
      id: `m-${lmpId}-3`, lmpId, ts: now - 1000 * 60 * 45,
      type: "user", author: b.name, authorInitials: b.initials, authorColor: b.color,
      text: "@assignment review pending from the mentor — can we nudge today?",
      mentions: [{ kind: "section", id: "assignment-review", label: "assignment review" }],
    });
  }
  messages[lmpId] = arr;
};

export function useChat(lmpId: string): ChatMessage[] {
  const rec = LMP_RECORDS.find((r) => r.id === lmpId);
  seed(lmpId, rec);
  return useSyncExternalStore(
    subscribe,
    () => messages[lmpId] ?? EMPTY,
    () => messages[lmpId] ?? EMPTY,
  );
}

export function getParticipants(lmpId: string): ChatParticipant[] {
  const rec = LMP_RECORDS.find((r) => r.id === lmpId);
  const list: ChatParticipant[] = [ADMIN_PARTICIPANT];
  rec?.pocs.forEach((p) => {
    list.push({ id: `p-${p.initials}`, name: p.name, initials: p.initials, color: p.color, role: "POC" });
  });
  EXTRA_MENTORS.forEach((m) => list.push(m));
  // dedupe by name
  const seen = new Set<string>();
  return list.filter((p) => (seen.has(p.name) ? false : (seen.add(p.name), true)));
}

const ME = {
  name: "You", initials: "ME", color: "bg-orange-200 text-orange-600",
};

export function sendMessage(lmpId: string, text: string, mentions: ChatMention[]): void {
  const arr = messages[lmpId] ?? (messages[lmpId] = []);
  arr.push({
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    lmpId, ts: Date.now(), type: "user",
    author: ME.name, authorInitials: ME.initials, authorColor: ME.color,
    text, mentions,
  });
  emit();
}

export function deleteMessage(lmpId: string, id: string): void {
  const arr = messages[lmpId];
  if (!arr) return;
  const idx = arr.findIndex((m) => m.id === id);
  if (idx >= 0) {
    arr.splice(idx, 1);
    emit();
  }
}

/* ───── context for opening drawer ───── */

type Ctx = {
  openLmpId: string | null;
  open: (lmpId: string) => void;
  close: () => void;
};

const ChatCtx = createContext<Ctx | null>(null);

export function LmpChatProvider({ children }: { children: ReactNode }) {
  const [openLmpId, setOpen] = useState<string | null>(null);
  const open = useCallback((id: string) => setOpen(id), []);
  const close = useCallback(() => setOpen(null), []);
  const value = useMemo(() => ({ openLmpId, open, close }), [openLmpId, open, close]);
  return <ChatCtx.Provider value={value}>{children}</ChatCtx.Provider>;
}

const FALLBACK_CTX: Ctx = { openLmpId: null, open: () => {}, close: () => {} };

export function useLmpChatDrawer() {
  const ctx = useContext(ChatCtx);
  return ctx ?? FALLBACK_CTX;
}

export function formatChatTime(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return time;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${time}`;
}