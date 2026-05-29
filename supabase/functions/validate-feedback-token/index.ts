// Public edge function: validate a student feedback token server-side.
// Returns minimal, non-sensitive session info ({ valid, mentorName, sessionId })
// or { valid: false, reason } when expired / unknown / already submitted.
// Uses the service role to bypass RLS (sessions table is authenticated-only).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Token format expected: `fb_<...>` issued at session create. Tokens prefixed
// with `fb_EXP` are explicitly expired. Otherwise we treat tokens as valid for
// 30 days from the session's created_at.
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { token } = (await req.json().catch(() => ({}))) as { token?: string };
    const t = (token || "").trim();
    if (!t || !t.startsWith("fb_")) {
      return json({ valid: false, reason: "invalid_token" });
    }
    if (t.startsWith("fb_EXP")) {
      return json({ valid: false, reason: "expired" });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const { data, error } = await admin
      .from("sessions")
      .select("id, created_at, student_feedback, mentors:mentor_id(name)")
      .eq("student_feedback_token", t)
      .maybeSingle();
    if (error) throw error;
    if (!data?.id) return json({ valid: false, reason: "not_found" });

    if (data.created_at && Date.now() - new Date(data.created_at).getTime() > TOKEN_TTL_MS) {
      return json({ valid: false, reason: "expired" });
    }
    if (data.student_feedback && Object.keys(data.student_feedback as object).length > 0) {
      return json({ valid: false, reason: "already_submitted" });
    }

    return json({
      valid: true,
      sessionId: data.id,
      mentorName: (data as any)?.mentors?.name ?? null,
    });
  } catch (e) {
    return json({ valid: false, reason: "error", message: (e as Error).message }, 200);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
