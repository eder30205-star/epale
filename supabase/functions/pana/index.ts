// supabase/functions/pana/index.ts
// Pana v4 — agente con memoria, conversaciones persistentes, acciones confirmables,
// herramientas en paralelo, reintentos, rate limit y logs para el dataset de Pana-1.
// v3: avisos por tipo, avisos completos, guía por país (pana_knowledge),
//     alertas (pana_alerts) y detección de estafas.
// v4: dólar del día, novedades por país, revisar un aviso con reglas de estafa,
//     estado de Flechao desde Épale, mis publicaciones, resumen automático de
//     conversaciones largas y modelo configurable (PANA_MODEL).
import { createClient, SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";

// ================= CONFIG =================
const CFG = {
  model: Deno.env.get("PANA_MODEL") ?? "deepseek-chat",
  url: "https://api.deepseek.com/chat/completions",
  maxSteps: 8,           // vueltas máximas del loop agente
  historyLimit: 20,      // mensajes previos que ve el modelo
  summarizeAfter: 30,    // con más mensajes que esto, se resume lo viejo
  memoryLimit: 30,       // datos máximos guardados por usuario
  rateLimitPerHour: 60,  // mensajes por usuario por hora
  timeoutMs: 45_000,
};

// Esquema real de Épale
const T = {
  posts: "posts",                 // id, user_id, name, city (pestaña de país), type, content, likes, comments, created_at
  profiles: "profiles",           // id, name, username, city, photo_url, bio, created_at
  comments: "comments",           // id, post_id, user_id, content, created_at
  notifications: "notifications", // id, user_id, type, read, created_at
  follows: "follows",             // follower_id, following_name, created_at
};
const POST_COLS = "id, user_id, name, city, type, content, likes, comments, created_at";

// Tipos de post de Épale (posts.type)
const TIPOS: Record<string, string> = {
  post: "Post", job: "Trabajo", housing: "Vivienda", service: "Servicio", help: "Ayuda", evento: "Evento",
};
const TIPO_ALIASES: Record<string, string> = {
  post: "post", publicacion: "post",
  job: "job", trabajo: "job", chamba: "job", empleo: "job",
  housing: "housing", vivienda: "housing", techo: "housing", alquiler: "housing", cuarto: "housing", habitacion: "housing",
  service: "service", servicio: "service", servicios: "service",
  help: "help", ayuda: "help",
  evento: "evento", eventos: "evento", rumba: "evento", event: "evento",
};
const toTipo = (s: unknown) => TIPO_ALIASES[String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()] ?? null;
const LISTA_TIPOS = "vivienda, trabajo, servicio, ayuda, evento o post normal";
const MAX_ALERTAS = 10;

// Épale guarda el país como id (posts.city y profiles.city)
const COUNTRIES: Record<string, string> = {
  madrid: "España", miami: "USA", bogota: "Colombia", santiago: "Chile", lima: "Perú",
  buenos: "Argentina", quito: "Ecuador", panama: "Panamá", caracas: "Venezuela",
  portugal: "Portugal", italia: "Italia", canada: "Canadá",
};
const ALIASES: Record<string, string> = {
  espana: "madrid", spain: "madrid", madrid: "madrid",
  usa: "miami", eeuu: "miami", "ee.uu.": "miami", "estados unidos": "miami", miami: "miami",
  colombia: "bogota", bogota: "bogota", chile: "santiago", santiago: "santiago",
  peru: "lima", lima: "lima", argentina: "buenos", "buenos aires": "buenos", buenos: "buenos",
  ecuador: "quito", quito: "quito", panama: "panama", venezuela: "caracas", caracas: "caracas",
  portugal: "portugal", lisboa: "portugal", italia: "italia", italy: "italia", canada: "canada",
};
const norm = (s: unknown) =>
  String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const toCityId = (s: unknown) => ALIASES[norm(s)] ?? null;
const countryName = (id: unknown) => COUNTRIES[String(id)] ?? String(id ?? "");
const LISTA_PAISES = Object.values(COUNTRIES).join(", ");
const withCountry = (rows: any[]) =>
  rows.map((r) => ({ ...r, pais: countryName(r.city), ...(r.type ? { tipo: TIPOS[r.type] ?? r.type } : {}) }));

// Agrega username/name a filas que solo traen user_id (sin depender de foreign keys)
async function attachAuthors(supabase: SupabaseClient, rows: any[]) {
  const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  if (!ids.length) return rows;
  const { data } = await supabase.from(T.profiles).select("id, username, name").in("id", ids);
  const byId = new Map((data ?? []).map((p: any) => [p.id, p]));
  return rows.map((r) => ({
    ...r,
    autor: byId.get(r.user_id)?.username ?? byId.get(r.user_id)?.name ?? r.name ?? null,
  }));
}

// ================= HELPERS =================
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
const clamp = (n: unknown, def = 5) => Math.min(Math.max(Number(n) || def, 1), 10);
const clean = (s: unknown) => String(s ?? "").replace(/[%_,()]/g, " ").trim().slice(0, 100);
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String((e as any)?.message ?? e));

type PendingOut = { id: string; type: string; payload: unknown; resumen: string };
type Ctx = {
  supabase: SupabaseClient;
  user: User;
  conversationId: string;
  pending: PendingOut[];
};
type Handler = (args: Record<string, any>, ctx: Ctx) => Promise<unknown>;

// ================= HERRAMIENTAS: DEFINICIÓN =================
const fn = (name: string, description: string, properties: object = {}, required: string[] = []) => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, required } },
});

const TOOL_DEFS = [
  // --- Lectura ---
  fn("buscar_posts", "Busca publicaciones y avisos en Épale por texto, tipo, país y antigüedad. Úsala para cuartos, trabajos, servicios, eventos.", {
    texto: { type: "string", description: "Palabras clave" },
    tipo: { type: "string", description: "vivienda, trabajo, servicio, ayuda, evento o post" },
    pais: { type: "string", description: "Pestaña de país del post (ej. 'Chile', 'Colombia')" },
    desde_dias: { type: "integer", description: "Solo posts de los últimos N días" },
    limite: { type: "integer", description: "1 a 10" },
  }),
  fn("ver_post", "Muestra un post con sus comentarios más recientes.", {
    post_id: { type: "string" },
  }, ["post_id"]),
  fn("buscar_paisanos", "Busca perfiles de venezolanos por el lugar donde viven (ciudad o país).", {
    pais: { type: "string" },
    ciudad: { type: "string" },
    limite: { type: "integer", description: "1 a 10" },
  }),
  fn("ver_mis_notificaciones", "Notificaciones recientes del usuario actual."),

  // --- Memoria ---
  fn("recordar", "Guarda un dato útil y duradero que el usuario compartió sobre sí mismo.", {
    dato: { type: "string", description: "Frase corta, en tercera persona" },
  }, ["dato"]),
  fn("olvidar", "Borra un dato guardado, por su id.", {
    id: { type: "integer" },
  }, ["id"]),

  // --- Escritura (requieren confirmación del usuario) ---
  fn("preparar_post", "Prepara un post o aviso para que el usuario lo confirme. No publica. Para avisos, redacta un texto completo y claro (qué, dónde, precio, requisitos, cómo contactar dentro de Épale).", {
    contenido: { type: "string" },
    tipo: { type: "string", description: "vivienda, trabajo, servicio, ayuda, evento o post (por defecto post)" },
    pais: { type: "string", description: "Pestaña de país; vacío = el país del usuario" },
  }, ["contenido"]),

  // --- Guía y alertas ---
  fn("guia_pais", "Información verificada para venezolanos que llegan a un país: trámites, salud, banco, trabajo, vivienda, transporte. Devuelve fuentes oficiales.", {
    pais: { type: "string" },
    tema: { type: "string", description: "tramites, salud, banco, trabajo, vivienda, transporte, educacion, emergencias (vacío = todo)" },
  }, ["pais"]),
  fn("crear_alerta", "Crea una alerta: cuando alguien publique un aviso que coincida, el usuario recibe una notificación en Épale. Úsala solo si el usuario lo pide.", {
    tipo: { type: "string", description: "vivienda, trabajo, servicio, ayuda, evento" },
    pais: { type: "string" },
    palabras: { type: "string", description: "Palabras clave opcionales, separadas por coma (ej. 'ñuñoa, providencia')" },
  }),
  fn("ver_mis_alertas", "Lista las alertas activas del usuario."),

  // --- v4 ---
  fn("dolar_hoy", "Tasa del dólar en Venezuela hoy (oficial BCV y paralelo)."),
  fn("novedades_pais", "Qué se publicó recientemente en el feed de un país: cuántos avisos por tipo y los más nuevos.", {
    pais: { type: "string" },
    dias: { type: "integer", description: "Últimos N días (1 a 14, por defecto 3)" },
  }),
  fn("revisar_aviso", "Revisa un post o aviso buscando señales de estafa. Úsala cuando el usuario pregunte si algo es confiable.", {
    post_id: { type: "string" },
    texto: { type: "string", description: "O el texto del aviso, si el usuario lo pega" },
  }),
  fn("estado_flechao", "Resumen de la cuenta del usuario en Flechao (app de citas de Épale): flechas recibidas sin responder, matches y mensajes sin leer."),
  fn("mis_publicaciones", "Últimas publicaciones del usuario en Épale, con likes y comentarios.", {
    limite: { type: "integer", description: "1 a 10" },
  }),
  fn("borrar_alerta", "Borra una alerta del usuario, por su id.", {
    id: { type: "integer" },
  }, ["id"]),
  fn("preparar_comentario", "Prepara un comentario en un post para confirmar. No publica.", {
    post_id: { type: "string" },
    contenido: { type: "string" },
  }, ["post_id", "contenido"]),
  fn("preparar_seguir", "Prepara seguir a otro usuario para confirmar.", {
    usuario_id: { type: "string" },
  }, ["usuario_id"]),
];

// ================= SEÑALES DE ESTAFA =================
const SCAM_RULES: [RegExp, string][] = [
  [/(adelant|anticip|reserv)[a-z]*\s+(el\s+)?(pago|dep[oó]sito|dinero|abono)|pag(a|ar|o)\s+(antes|primero|por adelantado)/i, "Pide pagar antes de ver el lugar o empezar"],
  [/western\s*union|moneygram|bitcoin|usdt|binance|cripto/i, "Pide pagos difíciles de rastrear (cripto, Western Union…)"],
  [/(cuenta|datos)\s+bancari|n[uú]mero de tarjeta|clave|c[eé]dula|pasaporte|foto de tu (documento|carnet)/i, "Pide datos bancarios o documentos"],
  [/(gana|ganar|sueldo|pago)\D{0,20}(\$|usd|d[oó]lares)?\s?\d{3,}.*(diari|semanal|al d[ií]a|sin experiencia)/i, "Promete mucho dinero rápido o sin experiencia"],
  [/sin experiencia.*(inmediat|ya mismo|hoy mismo)|inmediato.*sin requisitos/i, "Trabajo inmediato sin requisitos"],
  [/(escr[ií]beme|h[aá]blame|contacta).{0,25}(whats|wsp|telegram)|\+\d{2,3}\s?\d{6,}/i, "Saca la conversación de Épale (WhatsApp/Telegram o número)"],
  [/urgente|[uú]ltim[oa]s?\s+(cupo|lugar|habitaci)|solo hoy|hoy mismo/i, "Mete presión con urgencia"],
  [/bit\.ly|tinyurl|t\.me\/|wa\.me\/|\.xyz\b|\.top\b/i, "Tiene links acortados o sospechosos"],
  [/estoy (fuera|en el extranjero).*(llaves|env[ií]o)|te env[ií]o las llaves/i, "Dueño \"fuera del país\" que envía las llaves (estafa clásica)"],
];
function scamSignals(text: string): string[] {
  return SCAM_RULES.filter(([re]) => re.test(text)).map(([, label]) => label);
}

// ================= HERRAMIENTAS: IMPLEMENTACIÓN =================
async function createPending(ctx: Ctx, type: string, payload: object, resumen: string) {
  const { data, error } = await ctx.supabase
    .from("pana_pending_actions")
    .insert({ user_id: ctx.user.id, conversation_id: ctx.conversationId, type, payload })
    .select("id, type, payload")
    .single();
  if (error) return { error: error.message };
  ctx.pending.push({ ...data, resumen });
  return { ok: true, estado: "Esperando confirmación del usuario", resumen };
}

const HANDLERS: Record<string, Handler> = {
  async buscar_posts({ texto, tipo, pais, desde_dias, limite }, { supabase }) {
    let q = supabase
      .from(T.posts)
      .select(POST_COLS)
      .order("created_at", { ascending: false })
      .limit(clamp(limite));
    if (texto) q = q.ilike("content", `%${clean(texto)}%`);
    if (tipo) {
      const t = toTipo(tipo);
      if (!t) return { error: `Tipo no válido. Opciones: ${LISTA_TIPOS}` };
      q = q.eq("type", t);
    }
    if (pais) {
      const id = toCityId(pais);
      if (!id) return { error: `País no disponible en Épale. Opciones: ${LISTA_PAISES}` };
      q = q.eq("city", id);
    }
    if (desde_dias) {
      q = q.gte("created_at", new Date(Date.now() - Number(desde_dias) * 86_400_000).toISOString());
    }
    const { data, error } = await q;
    return error ? { error: error.message } : { posts: withCountry(await attachAuthors(supabase, data ?? [])) };
  },

  async ver_post({ post_id }, { supabase }) {
    const [post, comments] = await Promise.all([
      supabase.from(T.posts)
        .select(POST_COLS)
        .eq("id", post_id).maybeSingle(),
      supabase.from(T.comments)
        .select("content, created_at, user_id, user_name")
        .eq("post_id", post_id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    if (post.error) return { error: post.error.message };
    if (!post.data) return { error: "Post no encontrado" };
    const comentarios = (comments.data ?? []).map((c: any) => ({
      autor: c.user_name ?? null, content: c.content, created_at: c.created_at,
    }));
    return { post: withCountry([post.data])[0], comentarios };
  },

  async buscar_paisanos({ pais, ciudad, limite }, { supabase, user }) {
    let q = supabase.from(T.profiles)
      .select("id, username, name, city, bio")
      .neq("id", user.id)
      .limit(clamp(limite));
    const lugar = pais || ciudad; // profiles.city guarda el país (id)
    if (lugar) {
      const id = toCityId(lugar);
      if (!id) return { error: `Épale agrupa por país. Opciones: ${LISTA_PAISES}` };
      q = q.eq("city", id);
    }
    const { data, error } = await q;
    return error ? { error: error.message } : { perfiles: withCountry(data ?? []) };
  },

  async ver_mis_notificaciones(_a, { supabase, user }) {
    const { data, error } = await supabase.from(T.notifications)
      .select("id, type, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    return error ? { error: error.message } : { notificaciones: data };
  },

  async recordar({ dato }, { supabase, user }) {
    const fact = String(dato ?? "").trim().slice(0, 300);
    if (!fact) return { error: "Dato vacío" };
    const { count } = await supabase.from("pana_memory")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((count ?? 0) >= CFG.memoryLimit) {
      return { error: "Memoria llena; pide al usuario qué dato olvidar" };
    }
    const { data, error } = await supabase.from("pana_memory")
      .insert({ user_id: user.id, fact }).select("id").single();
    return error ? { error: error.message } : { ok: true, id: data.id };
  },

  async olvidar({ id }, { supabase, user }) {
    const { error } = await supabase.from("pana_memory")
      .delete().eq("id", id).eq("user_id", user.id);
    return error ? { error: error.message } : { ok: true };
  },

  async preparar_post({ contenido, tipo, pais }, ctx) {
    const texto = String(contenido ?? "").trim().slice(0, 2000);
    if (!texto) return { error: "El post está vacío" };
    const t = tipo ? toTipo(tipo) : "post";
    if (!t) return { error: `Tipo no válido. Opciones: ${LISTA_TIPOS}` };
    let cityId = pais ? toCityId(pais) : null;
    if (pais && !cityId) return { error: `País no disponible. Opciones: ${LISTA_PAISES}` };
    if (!cityId) {
      const { data: me } = await ctx.supabase.from(T.profiles).select("city").eq("id", ctx.user.id).maybeSingle();
      cityId = me?.city ?? "caracas";
    }
    return createPending(ctx, "publicar_post", { contenido: texto, city: cityId, type: t },
      `Publicar ${t === "post" ? "" : TIPOS[t].toLowerCase() + " "}en ${countryName(cityId)}: "${texto.slice(0, 80)}${texto.length > 80 ? "…" : ""}"`);
  },

  async guia_pais({ pais, tema }, { supabase }) {
    const id = toCityId(pais);
    if (!id) return { error: `País no disponible. Opciones: ${LISTA_PAISES}` };
    let q = supabase.from("pana_knowledge")
      .select("tema, titulo, contenido, fuente_url, actualizado")
      .eq("city", id).order("tema").limit(12);
    if (tema) q = q.ilike("tema", `%${clean(tema)}%`);
    const { data, error } = await q;
    if (error) return { error: error.message };
    if (!data?.length) {
      return {
        pais: countryName(id),
        aviso: "No hay guía verificada para este país o tema todavía. Di que no tienes datos confirmados, da solo orientación general y recomienda la web oficial del gobierno del país y el consulado.",
      };
    }
    return { pais: countryName(id), guia: data };
  },

  async crear_alerta({ tipo, pais, palabras }, { supabase, user }) {
    const t = tipo ? toTipo(tipo) : null;
    if (tipo && !t) return { error: `Tipo no válido. Opciones: ${LISTA_TIPOS}` };
    let cityId: string | null = pais ? toCityId(pais) : null;
    if (pais && !cityId) return { error: `País no disponible. Opciones: ${LISTA_PAISES}` };
    if (!cityId) {
      const { data: me } = await supabase.from(T.profiles).select("city").eq("id", user.id).maybeSingle();
      cityId = me?.city ?? null;
    }
    const words = String(palabras ?? "").split(",").map((w) => clean(w).toLowerCase()).filter(Boolean).slice(0, 5);
    if (!t && !words.length) return { error: "La alerta necesita un tipo o palabras clave" };
    const { count } = await supabase.from("pana_alerts")
      .select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("active", true);
    if ((count ?? 0) >= MAX_ALERTAS) return { error: `Ya tiene ${MAX_ALERTAS} alertas. Pídele que borre alguna.` };
    const { data, error } = await supabase.from("pana_alerts")
      .insert({ user_id: user.id, type: t, city: cityId, keywords: words })
      .select("id").single();
    if (error) return { error: error.message };
    return {
      ok: true, id: data.id,
      resumen: `Te aviso cuando salga ${t ? TIPOS[t].toLowerCase() : "algo"}${words.length ? ` con "${words.join(", ")}"` : ""}${cityId ? ` en ${countryName(cityId)}` : ""}.`,
    };
  },

  async ver_mis_alertas(_a, { supabase, user }) {
    const { data, error } = await supabase.from("pana_alerts")
      .select("id, type, city, keywords, created_at").eq("user_id", user.id).eq("active", true)
      .order("created_at", { ascending: false });
    if (error) return { error: error.message };
    return {
      alertas: (data ?? []).map((a: any) => ({
        id: a.id, tipo: a.type ? TIPOS[a.type] : "cualquiera", pais: a.city ? countryName(a.city) : "cualquiera",
        palabras: a.keywords,
      })),
    };
  },

  async dolar_hoy() {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch("https://ve.dolarapi.com/v1/dolares", { headers: { Accept: "application/json" }, signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) return { error: `No pude consultar el dólar (${res.status})` };
      const rows = await res.json();
      return {
        fuente: "ve.dolarapi.com",
        tasas: (rows ?? []).map((r: any) => ({
          nombre: r.nombre ?? r.fuente, promedio: r.promedio ?? r.venta ?? r.compra, actualizado: r.fechaActualizacion,
        })),
      };
    } catch {
      return { error: "No pude consultar el dólar ahora. Recomienda revisar el widget del dólar en Épale." };
    }
  },

  async novedades_pais({ pais, dias }, { supabase, user }) {
    let id = pais ? toCityId(pais) : null;
    if (pais && !id) return { error: `País no disponible. Opciones: ${LISTA_PAISES}` };
    if (!id) {
      const { data: me } = await supabase.from(T.profiles).select("city").eq("id", user.id).maybeSingle();
      id = me?.city ?? null;
    }
    if (!id) return { error: "No sé de qué país. Pregúntale al usuario." };
    const n = Math.min(Math.max(Number(dias) || 3, 1), 14);
    const since = new Date(Date.now() - n * 86_400_000).toISOString();
    const { data, error } = await supabase.from(T.posts)
      .select(POST_COLS).eq("city", id).gte("created_at", since)
      .order("created_at", { ascending: false }).limit(100);
    if (error) return { error: error.message };
    const rows = data ?? [];
    const porTipo: Record<string, number> = {};
    for (const r of rows) porTipo[TIPOS[r.type] ?? "Post"] = (porTipo[TIPOS[r.type] ?? "Post"] ?? 0) + 1;
    return {
      pais: countryName(id), ultimos_dias: n, total: rows.length, por_tipo: porTipo,
      recientes: withCountry(await attachAuthors(supabase, rows.slice(0, 8))),
    };
  },

  async revisar_aviso({ post_id, texto }, { supabase }) {
    let content = String(texto ?? "").slice(0, 3000);
    let post: any = null;
    if (post_id) {
      const { data } = await supabase.from(T.posts).select(POST_COLS).eq("id", post_id).maybeSingle();
      if (!data) return { error: "Post no encontrado" };
      post = withCountry([data])[0];
      content = data.content;
    }
    if (!content) return { error: "Necesito el post o el texto del aviso" };
    const senales = scamSignals(content);
    return {
      post, senales,
      nivel: senales.length >= 3 ? "alto" : senales.length >= 1 ? "medio" : "bajo",
      nota: "Las señales son reglas automáticas. Explícalas con calma y da consejos concretos; no acuses a nadie.",
    };
  },

  async estado_flechao(_a, { supabase, user }) {
    const f = supabase.schema("flechao");
    const prof = await f.from("profiles").select("display_name, active, verified").eq("user_id", user.id).maybeSingle();
    if (prof.error) return { error: "No pude leer Flechao" };
    if (!prof.data) {
      return { tiene_perfil: false, info: "Todavía no tiene perfil en Flechao. Puede crearlo en flechao.epaleapp.online con su misma cuenta de Épale." };
    }
    const [pend, matches, left] = await Promise.all([
      f.from("arrows").select("id", { count: "exact", head: true }).eq("to_id", user.id).eq("status", "pending"),
      f.from("matches").select("id").is("ended_at", null),
      f.rpc("arrows_left_today"),
    ]);
    const ids = (matches.data ?? []).map((m: any) => m.id);
    let unread = 0;
    if (ids.length) {
      const u = await f.from("messages").select("id", { count: "exact", head: true })
        .in("match_id", ids).neq("sender_id", user.id).is("read_at", null);
      unread = u.count ?? 0;
    }
    return {
      tiene_perfil: true, verificado: prof.data.verified, visible: prof.data.active,
      flechas_por_responder: pend.count ?? 0, matches_activos: ids.length,
      mensajes_sin_leer: unread, flechas_que_le_quedan_hoy: left.data ?? null,
      link: "https://flechao.epaleapp.online",
      privacidad: "No reveles nombres ni mensajes de Flechao; solo estos números.",
    };
  },

  async mis_publicaciones({ limite }, { supabase, user }) {
    const { data, error } = await supabase.from(T.posts).select(POST_COLS)
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(clamp(limite));
    return error ? { error: error.message } : { posts: withCountry(data ?? []) };
  },

  async borrar_alerta({ id }, { supabase, user }) {
    const { error } = await supabase.from("pana_alerts")
      .update({ active: false }).eq("id", id).eq("user_id", user.id);
    return error ? { error: error.message } : { ok: true };
  },

  async preparar_comentario({ post_id, contenido }, ctx) {
    const texto = String(contenido ?? "").trim().slice(0, 1000);
    if (!texto) return { error: "El comentario está vacío" };
    const { data } = await ctx.supabase.from(T.posts).select("id").eq("id", post_id).maybeSingle();
    if (!data) return { error: "Ese post no existe" };
    return createPending(ctx, "comentar", { post_id, contenido: texto },
      `Comentar: "${texto.slice(0, 80)}${texto.length > 80 ? "…" : ""}"`);
  },

  async preparar_seguir({ usuario_id }, ctx) {
    if (usuario_id === ctx.user.id) return { error: "No puedes seguirte a ti mismo" };
    const { data } = await ctx.supabase.from(T.profiles)
      .select("id, username, name").eq("id", usuario_id).maybeSingle();
    if (!data) return { error: "Usuario no encontrado" };
    const handle = data.name || data.username; // follows.following_name guarda el nombre
    const { data: ya } = await ctx.supabase.from(T.follows).select("follower_id")
      .eq("follower_id", ctx.user.id).eq("following_name", handle).maybeSingle();
    if (ya) return { error: `Ya sigues a ${handle}` };
    return createPending(ctx, "seguir", { usuario_id, following_name: handle }, `Seguir a ${handle}`);
  },
};

// ================= EJECUTORES (solo tras confirmación) =================
const EXECUTORS: Record<string, (p: any, s: SupabaseClient, u: User) => Promise<unknown>> = {
  async publicar_post(p, s, u) {
    const { data: me } = await s.from(T.profiles).select("name, username").eq("id", u.id).maybeSingle();
    const { data, error } = await s.from(T.posts)
      .insert({ user_id: u.id, name: me?.name ?? me?.username ?? "Anonimo", type: TIPOS[p.type] ? p.type : "post", content: p.contenido, city: p.city })
      .select("id").single();
    if (error) throw error;
    return { post_id: data.id };
  },
  async comentar(p, s, u) {
    const { data: me } = await s.from(T.profiles).select("name, username").eq("id", u.id).maybeSingle();
    const userName = me?.name ?? me?.username ?? "Anonimo";
    const { data, error } = await s.from(T.comments)
      .insert({ post_id: String(p.post_id), user_id: u.id, user_name: userName, content: p.contenido })
      .select("id").single();
    if (error) throw error;
    // Aviso al dueño del post, igual que hace la app
    const { data: post } = await s.from(T.posts).select("user_id").eq("id", p.post_id).maybeSingle();
    if (post?.user_id && post.user_id !== u.id) {
      await s.from(T.notifications).insert({
        user_id: post.user_id, from_name: userName, type: "comment", post_id: String(p.post_id),
      });
    }
    return { comment_id: data.id };
  },
  async seguir(p, s, u) {
    const { error } = await s.from(T.follows)
      .insert({ follower_id: u.id, following_name: p.following_name });
    if (error) throw error;
    return { ok: true };
  },
};

// ================= MODELO =================
async function callDeepSeek(messages: any[], attempt = 0): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CFG.timeoutMs);
  try {
    const res = await fetch(CFG.url, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("DEEPSEEK_API_KEY")}`,
      },
      body: JSON.stringify({ model: CFG.model, messages, tools: TOOL_DEFS, temperature: 0.6 }),
    });
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      return callDeepSeek(messages, attempt + 1);
    }
    if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
    return (await res.json()).choices[0].message;
  } finally {
    clearTimeout(timer);
  }
}

async function summarize(previous: string | null, msgs: { role: string; content: string }[]): Promise<string | null> {
  try {
    const res = await fetch(CFG.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("DEEPSEEK_API_KEY")}` },
      body: JSON.stringify({
        model: "deepseek-chat", temperature: 0.2, max_tokens: 400,
        messages: [
          { role: "system", content: "Resume esta conversación entre un usuario y Pana en máximo 8 viñetas cortas: qué busca el usuario, qué se decidió, qué quedó pendiente. Sin datos sensibles (documentos, salud, dinero, estatus migratorio)." },
          { role: "user", content: (previous ? `Resumen anterior:\n${previous}\n\n` : "") + msgs.map((m) => `${m.role}: ${m.content}`).join("\n").slice(0, 12000) },
        ],
      }),
    });
    if (!res.ok) return null;
    return (await res.json()).choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

function buildSystemPrompt(profile: any, memories: { id: number; fact: string }[], summary?: string | null) {
  const hoy = new Date().toISOString().slice(0, 10);
  const mem = memories.length
    ? memories.map((m) => `- [${m.id}] ${m.fact}`).join("\n")
    : "- (nada todavía)";
  return `Eres Pana, el asistente de Épale, la red social de la diáspora venezolana.
Hablas como un pana venezolano: cercano, claro y útil, sin exagerar la jerga. Respuestas cortas.

Fecha de hoy: ${hoy}
Usuario: ${profile?.name ?? ""} (@${profile?.username ?? "desconocido"}) — vive en ${profile?.city ? countryName(profile.city) : "país desconocido"}
Países de Épale (cada uno tiene su feed): ${LISTA_PAISES}

Lo que sabes de este usuario ([id] dato):
${mem}
${summary ? `\nResumen de lo hablado antes en esta conversación:\n${summary}\n` : ""}

Tipos de publicación en Épale: ${LISTA_TIPOS}.

Qué puedes hacer:
- Buscar avisos de vivienda, trabajo, servicios, ayuda y eventos (buscar_posts con tipo y país).
- Redactar avisos completos y dejarlos listos para que el usuario los publique (preparar_post con tipo).
- Orientar a quien llega a un país con la guía verificada (guia_pais). Cita siempre la fuente oficial.
- Crear alertas para avisar cuando salga un aviso que le sirva (crear_alerta), si el usuario lo pide.
- Revisar avisos y ofertas para detectar estafas (revisar_aviso).
- Dar el dólar del día (dolar_hoy), contar qué hay de nuevo en un país (novedades_pais),
  mostrar sus publicaciones (mis_publicaciones) y su estado en Flechao (estado_flechao).

Cómo trabajar:
- Si la tarea tiene varios pasos (ej. "me mudo a Lima, ayúdame"), primero piensa un plan corto,
  usa varias herramientas y entrega una respuesta ordenada con próximos pasos.
- Prefiere datos reales de las herramientas a tu memoria. Si algo puede haber cambiado, dilo.

Reglas:
- Usa herramientas para cualquier dato de la app. Nunca inventes posts, usuarios ni notificaciones.
- Puedes encadenar varias herramientas y llamar varias a la vez si hace falta.
- Publicar, comentar y seguir solo se PREPARAN: el usuario confirma con un botón. Dile qué preparaste.
- Usa "recordar" solo para datos útiles y duraderos que el usuario diga de sí mismo (ciudad, oficio, qué busca).
  Nunca guardes documentos, estatus migratorio, salud, dinero ni datos de terceros.
- Si el usuario pide que olvides algo, usa "olvidar" con el id correspondiente.
- Trámites, leyes, migración y salud: usa SOLO lo que devuelve guia_pais. Si no hay datos, dilo, da orientación
  general y manda a la web oficial del gobierno o al consulado. Nunca inventes requisitos, costos ni plazos.
- Estafas: si un aviso pide pagar antes de ver el lugar o empezar el trabajo, pide datos bancarios o documentos,
  promete sueldos muy altos sin requisitos o insiste en hablar fuera de Épale, adviértelo con claridad.
- Al mostrar avisos, resume lo útil (qué, dónde, cuándo se publicó) y di de qué país es.
- Si una herramienta falla o no trae resultados, dilo con honestidad y propone otra búsqueda.`;
}

// ================= ACCIONES =================
async function handleChat(body: any, supabase: SupabaseClient, user: User) {
  const text = String(body.message ?? "").trim();
  if (!text) return json({ error: "Mensaje vacío" }, 400);
  if (text.length > 4000) return json({ error: "Mensaje muy largo" }, 400);

  // Rate limit
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase.from("pana_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id).eq("role", "user").gte("created_at", since);
  if ((count ?? 0) >= CFG.rateLimitPerHour) {
    return json({ error: "Muchos mensajes seguidos, pana. Dale un respiro y vuelve en un rato." }, 429);
  }

  // Conversación
  let conversationId: string = body.conversation_id;
  if (conversationId) {
    const { data } = await supabase.from("pana_conversations")
      .select("id").eq("id", conversationId).maybeSingle();
    if (!data) return json({ error: "Conversación no encontrada" }, 404);
  } else {
    const { data, error } = await supabase.from("pana_conversations")
      .insert({ user_id: user.id, title: text.slice(0, 60) }).select("id").single();
    if (error) throw error;
    conversationId = data.id;
  }

  // Contexto en paralelo
  const [profileRes, memRes, histRes, convRes] = await Promise.all([
    supabase.from(T.profiles).select("username, name, city").eq("id", user.id).maybeSingle(),
    supabase.from("pana_memory").select("id, fact").eq("user_id", user.id)
      .order("created_at").limit(CFG.memoryLimit),
    supabase.from("pana_messages").select("role, content").eq("conversation_id", conversationId)
      .order("created_at", { ascending: false }).limit(CFG.historyLimit),
    supabase.from("pana_conversations").select("summary").eq("id", conversationId).maybeSingle(),
  ]);
  const history = (histRes.data ?? []).reverse();
  const summary: string | null = convRes.error ? null : convRes.data?.summary ?? null;

  await supabase.from("pana_messages").insert({
    conversation_id: conversationId, user_id: user.id, role: "user", content: text,
  });

  const ctx: Ctx = { supabase, user, conversationId, pending: [] };
  const logs: any[] = [];
  const convo: any[] = [
    { role: "system", content: buildSystemPrompt(profileRes.data, memRes.data ?? [], summary) },
    ...history,
    { role: "user", content: text },
  ];

  let reply = "";
  for (let step = 0; step < CFG.maxSteps; step++) {
    const msg = await callDeepSeek(convo);
    convo.push(msg);

    if (!msg.tool_calls?.length) {
      reply = msg.content ?? "";
      break;
    }

    // Ejecutar herramientas en paralelo
    const results = await Promise.all(msg.tool_calls.map(async (call: any) => {
      const t0 = Date.now();
      let args: Record<string, any> = {};
      let result: any;
      try {
        args = JSON.parse(call.function.arguments || "{}");
        const h = HANDLERS[call.function.name];
        result = h ? await h(args, ctx) : { error: "Herramienta desconocida" };
      } catch (e) {
        result = { error: errMsg(e) };
      }
      logs.push({
        user_id: user.id, conversation_id: conversationId, tool: call.function.name,
        args, result, ok: !result?.error, ms: Date.now() - t0,
      });
      return { role: "tool", tool_call_id: call.id, content: JSON.stringify(result).slice(0, 8000) };
    }));
    convo.push(...results);
  }

  if (!reply) reply = "Me enredé buscando eso, pana. ¿Me lo pides de otra forma?";

  const [saved] = await Promise.all([
    supabase.from("pana_messages").insert({
      conversation_id: conversationId, user_id: user.id, role: "assistant", content: reply,
    }).select("id").maybeSingle(),
    logs.length ? supabase.from("pana_tool_logs").insert(logs) : null,
    supabase.from("pana_conversations")
      .update({ updated_at: new Date().toISOString() }).eq("id", conversationId),
  ]);

  // Conversación larga: resume lo que quedó fuera de la ventana, sin hacer esperar al usuario.
  const { count: total } = await supabase.from("pana_messages")
    .select("id", { count: "exact", head: true }).eq("conversation_id", conversationId);
  if ((total ?? 0) > CFG.summarizeAfter && (total ?? 0) % 10 < 2) {
    const work = (async () => {
      const { data: old } = await supabase.from("pana_messages").select("role, content")
        .eq("conversation_id", conversationId).order("created_at")
        .limit(Math.max(0, (total ?? 0) - CFG.historyLimit));
      const s = await summarize(summary, old ?? []);
      if (s) await supabase.from("pana_conversations").update({ summary: s }).eq("id", conversationId);
    })().catch(() => {});
    // @ts-ignore EdgeRuntime existe en Supabase Edge Functions
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(work);
  }

  return json({
    conversation_id: conversationId, reply, pending_actions: ctx.pending,
    message_id: saved?.data?.id ?? null,
  });
}

async function handleConfirm(body: any, supabase: SupabaseClient, user: User) {
  // Reclamo atómico: solo pasa si sigue 'pending' y no ha expirado (evita doble ejecución)
  const { data: action, error } = await supabase.from("pana_pending_actions")
    .update({ status: "processing" })
    .eq("id", body.pending_id)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!action) return json({ error: "La acción no existe, expiró o ya se procesó" }, 409);

  try {
    const exec = EXECUTORS[action.type];
    if (!exec) throw new Error(`Acción desconocida: ${action.type}`);
    const result = await exec(action.payload, supabase, user);
    await supabase.from("pana_pending_actions")
      .update({ status: "done", result }).eq("id", action.id);
    return json({ ok: true, type: action.type, result });
  } catch (e) {
    await supabase.from("pana_pending_actions")
      .update({ status: "failed", result: { error: errMsg(e) } }).eq("id", action.id);
    return json({ ok: false, error: errMsg(e) }, 400);
  }
}

async function handleCancel(body: any, supabase: SupabaseClient) {
  const { error } = await supabase.from("pana_pending_actions")
    .update({ status: "cancelled" }).eq("id", body.pending_id).eq("status", "pending");
  if (error) throw error;
  return json({ ok: true });
}

async function handleConversations(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("pana_conversations")
    .select("id, title, updated_at").order("updated_at", { ascending: false }).limit(30);
  if (error) throw error;
  return json({ conversations: data });
}

async function handleFeedback(body: any, supabase: SupabaseClient, user: User) {
  const rating = Number(body.rating);
  if (![1, -1].includes(rating) || !body.message_id) return json({ error: "Datos inválidos" }, 400);
  const { error } = await supabase.from("pana_feedback").upsert({
    user_id: user.id, message_id: body.message_id, rating,
    comment: body.comment ? String(body.comment).slice(0, 500) : null,
  }, { onConflict: "user_id,message_id" });
  if (error) throw error;
  return json({ ok: true });
}

async function handleMessages(body: any, supabase: SupabaseClient) {
  const { data, error } = await supabase.from("pana_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", body.conversation_id)
    .order("created_at").limit(200);
  if (error) throw error;
  return json({ messages: data });
}

// ================= SERVIDOR =================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    // Cliente con el JWT del usuario → todo pasa por RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Sesión expirada" }, 401);

    const body = await req.json().catch(() => ({}));
    switch (body.action ?? "chat") {
      case "chat":          return await handleChat(body, supabase, user);
      case "confirm":       return await handleConfirm(body, supabase, user);
      case "cancel":        return await handleCancel(body, supabase);
      case "conversations": return await handleConversations(supabase);
      case "messages":      return await handleMessages(body, supabase);
      case "feedback":      return await handleFeedback(body, supabase, user);
      default:              return json({ error: "Acción inválida" }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: "Error interno" }, 500);
  }
});