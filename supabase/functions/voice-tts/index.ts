import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb"; // George

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const text = (body?.text ?? "").toString().trim();
    const voiceId = (body?.voiceId ?? DEFAULT_VOICE).toString();

    if (!text) {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const truncated = text.slice(0, 1500);

    const resp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_22050_32&optimize_streaming_latency=3`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: truncated,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.75,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!resp.ok || !resp.body) {
      const errText = await resp.text().catch(() => "");
      console.warn(`[voice-tts] ElevenLabs ${resp.status}: ${errText.slice(0, 200)}`);
      return new Response(
        JSON.stringify({
          error: `ElevenLabs error ${resp.status}`,
          fallback: true,
          status: resp.status,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(resp.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
