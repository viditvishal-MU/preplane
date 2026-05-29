import { supabase } from "@/integrations/supabase/client";

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-tts`;

let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

export function stopElevenSpeaking() {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
    }
  } catch { /* noop */ }
  if (currentUrl) {
    try { URL.revokeObjectURL(currentUrl); } catch { /* noop */ }
    currentUrl = null;
  }
  currentAudio = null;
}

function speakBrowser(text: string, opts?: { onStart?: () => void; onEnd?: () => void }): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      opts?.onStart?.(); opts?.onEnd?.(); resolve(); return;
    }
    try { window.speechSynthesis.cancel(); } catch { /* noop */ }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05; u.lang = "en-US";
    u.onstart = () => opts?.onStart?.();
    u.onend = () => { opts?.onEnd?.(); resolve(); };
    u.onerror = () => { opts?.onEnd?.(); resolve(); };
    try { window.speechSynthesis.speak(u); } catch { opts?.onEnd?.(); resolve(); }
  });
}

/**
 * Speaks text using ElevenLabs TTS via the voice-tts edge function.
 * Falls back to the browser's speechSynthesis if ElevenLabs is unavailable
 * (e.g. free-tier blocked, network error). New calls cancel previous playback.
 */
export async function speakWithEleven(
  text: string,
  opts?: { voiceId?: string; onStart?: () => void; onEnd?: () => void },
): Promise<void> {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return;
  stopElevenSpeaking();

  let resp: Response;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    resp = await fetch(TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ text: clean, voiceId: opts?.voiceId }),
    });
  } catch {
    return speakBrowser(clean, opts);
  }
  if (!resp.ok) {
    try { await resp.text(); } catch { /* noop */ }
    return speakBrowser(clean, opts);
  }

  // Edge function returns JSON (not audio) when ElevenLabs is unavailable
  const contentType = resp.headers.get("Content-Type") || "";
  if (!contentType.includes("audio")) {
    try { await resp.text(); } catch { /* noop */ }
    return speakBrowser(clean, opts);
  }

  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  currentUrl = url;

  return new Promise<void>((resolve) => {
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onplay = () => opts?.onStart?.();
    audio.onended = () => {
      opts?.onEnd?.();
      if (currentUrl === url) { URL.revokeObjectURL(url); currentUrl = null; }
      if (currentAudio === audio) currentAudio = null;
      resolve();
    };
    audio.onerror = () => {
      if (currentUrl === url) { URL.revokeObjectURL(url); currentUrl = null; }
      if (currentAudio === audio) currentAudio = null;
      // Fall back to browser TTS instead of failing
      speakBrowser(clean, opts).then(resolve);
    };
    audio.play().catch(() => speakBrowser(clean, opts).then(resolve));
  });
}

