import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { DynamicFeedbackForm } from "@/components/feedback/DynamicFeedbackForm";
import { useFeedbackTemplate } from "@/lib/hooks/useFeedbackTemplates";
import { initialValues, validateValues } from "@/lib/feedbackForm";

type TokenValidation = {
  valid: boolean;
  reason?: "invalid_token" | "expired" | "not_found" | "already_submitted" | "error";
  sessionId?: string;
  mentorName?: string | null;
};

export default function StudentFeedbackPage() {
  const { token = "" } = useParams();
  // BUG-R4: server-side token validation. The sessions table is RLS-protected to
  // authenticated users only, so anon students must validate via an edge function
  // that checks token authenticity, expiry (TTL), and prior submission server-side.
  const { data: validation, isLoading: validating } = useQuery<TokenValidation>({
    queryKey: ["feedback-token-validation", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("validate-feedback-token", {
        body: { token },
      });
      if (error) throw error;
      return (data as TokenValidation) ?? { valid: false, reason: "error" };
    },
    staleTime: 60_000,
    retry: false,
  });

  const { data: tpl, isLoading } = useFeedbackTemplate("student");
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (tpl) setValues(initialValues(tpl.fields));
  }, [tpl]);

  if (validating) {
    return <Shell><div className="text-white/60 text-[13px] py-8 text-center">Validating link…</div></Shell>;
  }
  if (!validation?.valid) {
    return <Shell><ExpiredState reason={validation?.reason} /></Shell>;
  }
  if (submitted) return <Shell><SuccessState /></Shell>;
  if (isLoading || !tpl) {
    return <Shell><div className="text-white/60 text-[13px] py-8 text-center">Loading…</div></Shell>;
  }

  const ready = validateValues(tpl.fields, values);
  const mentorName = validation.mentorName ?? undefined;

  return (
    <Shell surface={tpl.theme.surface} mode={tpl.theme.mode}>
      <h1 className="text-[22px] font-semibold leading-tight" style={{ color: tpl.theme.text }}>{tpl.title}</h1>
      <p className="text-[13px] mt-1 opacity-60" style={{ color: tpl.theme.text }}>
        {tpl.subtitle}
        {mentorName && <> · with {mentorName}</>}
      </p>

      <div className="mt-6">
        <DynamicFeedbackForm
          fields={tpl.fields}
          values={values}
          onChange={(id, v) => setValues((s) => ({ ...s, [id]: v }))}
          theme={tpl.theme.mode}
          themeOverrides={tpl.theme}
        />
      </div>

      <button
        disabled={!ready}
        onClick={() => setSubmitted(true)}
        className={cn(
          "mt-5 w-full h-11 rounded-xl text-[14px] font-semibold transition-colors text-white",
          !ready && "opacity-50 cursor-not-allowed",
        )}
        style={ready ? { backgroundColor: tpl.theme.accent } : undefined}
      >
        {tpl.submit_label}
      </button>
    </Shell>
  );
}

function Shell({ children, surface, mode = "dark" }: { children: React.ReactNode; surface?: string; mode?: "dark" | "light" }) {
  const isDark = mode === "dark";
  return (
    <div className={cn("min-h-screen px-4 py-8", isDark ? "bg-[#0a0a0a]" : "bg-n50")}>
      <div
        className="mx-auto max-w-[520px] rounded-2xl border shadow-xl p-6 md:p-7"
        style={{
          backgroundColor: surface ?? (isDark ? "#141414" : "#ffffff"),
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SuccessState() {
  return (
    <div className="text-center py-6">
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="mx-auto h-20 w-20 rounded-full bg-sage-500/15 border-2 border-sage-400 flex items-center justify-center"
      >
        <Check className="h-10 w-10 text-sage-400" strokeWidth={3} />
      </motion.div>
      <h2 className="text-[24px] font-semibold text-white mt-5">Thank you!</h2>
      <p className="text-[14px] text-white/50 mt-2">Your feedback has been submitted.</p>
      <button
        onClick={() => window.close()}
        className="mt-6 h-10 px-6 rounded-md bg-white/10 hover:bg-white/15 text-white text-[13px] font-medium transition-colors"
      >
        Close
      </button>
    </div>
  );
}

function ExpiredState({ reason }: { reason?: string }) {
  const copy: Record<string, { title: string; body: string }> = {
    already_submitted: { title: "Feedback already submitted", body: "We've already received your response for this session — thank you!" },
    not_found: { title: "Link not recognised", body: "This feedback link is invalid. Please contact your career services team." },
    invalid_token: { title: "Invalid link", body: "This feedback link is malformed. Please contact your career services team." },
    error: { title: "Something went wrong", body: "We couldn't validate this link. Please try again in a moment." },
  };
  const c = copy[reason ?? ""] ?? { title: "This link has expired", body: "Please contact your career services team to request a new feedback link." };
  return (
    <div className="text-center py-6">
      <div className="mx-auto h-16 w-16 rounded-full bg-coral-500/15 border-2 border-coral-400 flex items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-coral-400" />
      </div>
      <h2 className="text-[20px] font-semibold text-white mt-5">{c.title}</h2>
      <p className="text-[14px] text-white/50 mt-2">{c.body}</p>
    </div>
  );
}
