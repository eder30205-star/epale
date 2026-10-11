// supabase/functions/pana-voz/index.ts
// Voz de Pana con ElevenLabs, sin exponer la clave en el navegador.
// Secret necesario: ELEVENLABS_API_KEY (Edge Functions → Secrets).
// Solo usuarios con sesión; máximo 600 caracteres por pedido.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VOICE_ID = "Aoh8oiCIlPke1wFxeNuK";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response("No autorizado", { status: 401, headers: cors });
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response("Sesión expirada", { status: 401, headers: cors });

    const { text } = await req.json().catch(() => ({ text: "" }));
    const clean = String(text ?? "").trim().slice(0, 600);
    if (!clean) return new Response("Texto vacío", { status: 400, headers: cors });

    const key = Deno.env.get("ELEVENLABS_API_KEY");
    if (!key) return new Response("Voz no configurada", { status: 503, headers: cors });

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": key },
      body: JSON.stringify({
        text: clean,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
      }),
    });
    if (!res.ok) return new Response(`ElevenLabs ${res.status}`, { status: 502, headers: cors });
    return new Response(res.body, { headers: { ...cors, "Content-Type": "audio/mpeg" } });
  } catch (e) {
    console.error(e);
    return new Response("Error interno", { status: 500, headers: cors });
  }
});
