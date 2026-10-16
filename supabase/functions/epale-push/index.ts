// supabase/functions/epale-push/index.ts
// Envía la notificación push al celular cuando se crea una fila en public.notifications.
// La llama un trigger de la base (ver supabase/sql/epale-push.sql) con { id } de la notificación.
// El texto se arma aquí, a partir de la notificación guardada: nadie puede mandar textos inventados.
// Secrets necesarios: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (Edge Functions → Secrets).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

function armar(n: any): { title: string; body: string; url: string } | null {
  const quien = String(n.from_name ?? "Alguien").slice(0, 80);
  const ref = n.post_id ? String(n.post_id) : "";
  switch (n.type) {
    case "mensaje": return { title: "Épale 💬", body: `${quien} te envió un mensaje`, url: ref ? `/?chat=${ref}` : "/" };
    case "comment": return { title: "Épale", body: `${quien} comentó en tu post`, url: ref ? `/?post=${ref}` : "/" };
    case "like": return { title: "Épale", body: `A ${quien} le gustó tu post ❤️`, url: ref ? `/?post=${ref}` : "/" };
    case "follow": return { title: "Épale", body: `${quien} empezó a seguirte`, url: "/" };
    case "pana_alerta": return { title: "Pana 🤖", body: quien, url: /^\d+$/.test(ref) ? `/?post=${ref}` : "/" };
    case "welcome": return null;
    default: return { title: "Épale", body: quien, url: "/" };
  }
}

Deno.serve(async (req) => {
  try {
    const pub = Deno.env.get("VAPID_PUBLIC_KEY"), priv = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!pub || !priv) return json({ error: "Faltan las claves VAPID" }, 503);
    webpush.setVapidDetails("mailto:hola@epaleapp.online", pub, priv);

    const { id } = await req.json().catch(() => ({}));
    if (!id) return json({ error: "Falta id" }, 400);

    // Se marca como enviada en el mismo paso: si llaman dos veces, la segunda no hace nada
    const { data: n } = await sb.from("notifications").update({ push_enviado_at: new Date().toISOString() })
      .eq("id", id).is("push_enviado_at", null).select("id, user_id, from_name, type, post_id").maybeSingle();
    if (!n) return json({ ok: true, nada: true });

    const msg = armar(n);
    if (!msg) return json({ ok: true, omitida: n.type });

    const { data: subs } = await sb.from("push_subscriptions").select("subscription").eq("user_id", n.user_id).limit(10);
    let enviadas = 0;
    for (const s of subs ?? []) {
      const sub = typeof s.subscription === "string" ? JSON.parse(s.subscription) : s.subscription;
      if (!sub?.endpoint) continue;
      try {
        await webpush.sendNotification(sub, JSON.stringify(msg), { TTL: 60 * 60 * 24 });
        enviadas++;
      } catch (e: any) {
        // Suscripción vencida o de otra clave: se borra
        if ([401, 403, 404, 410].includes(e?.statusCode)) {
          await sb.rpc("borrar_push", { p_endpoint: sub.endpoint });
        } else {
          console.error("push", e?.statusCode, e?.body ?? e);
        }
      }
    }
    return json({ ok: true, enviadas });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
