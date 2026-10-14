// supabase/functions/pana-autopost/index.ts
// Pana publica solo con su cuenta "Pana IA". Lo llama pg_cron (ver supabase/sql/pana-autopost.sql).
//   job "diario"  → dólar del día + revisión de estafas
//   job "semanal" → resumen de la semana + bienvenida por país
//   job "tip"     → tip de la semana (sale de pana_knowledge)
//   job "pregunta" | "consejo" | "cultura" | "comunidad" → un post del día escrito con IA (DeepSeek),
//       con reglas estrictas: nada de cifras, leyes, noticias ni datos que se puedan inventar.
//       Si la IA falla, usa una frase de respaldo. Sale en las 12 pestañas de país.
// El dólar, los resúmenes, los tips y las alertas usan solo datos reales (sin IA). Cada post es único por (tipo, país, día/semana): llamarlo dos veces no duplica.
// Modo 'borrador' (por defecto): deja los posts para que un admin los apruebe. 'auto': publica. 'pausa': nada.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BOT_EMAIL = "pana@epaleapp.online";
const BOT_BIO = "🤖 Asistente IA de Épale. Publico el dólar del día, el resumen de tu país, tips y alertas de estafa. ¿Necesitas algo? Toca «Preguntar a Pana».";

const PAISES: Record<string, { nombre: string; flag: string }> = {
  madrid: { nombre: "España", flag: "🇪🇸" }, miami: { nombre: "USA", flag: "🇺🇸" },
  bogota: { nombre: "Colombia", flag: "🇨🇴" }, santiago: { nombre: "Chile", flag: "🇨🇱" },
  lima: { nombre: "Perú", flag: "🇵🇪" }, buenos: { nombre: "Argentina", flag: "🇦🇷" },
  quito: { nombre: "Ecuador", flag: "🇪🇨" }, panama: { nombre: "Panamá", flag: "🇵🇦" },
  caracas: { nombre: "Venezuela", flag: "🇻🇪" }, portugal: { nombre: "Portugal", flag: "🇵🇹" },
  italia: { nombre: "Italia", flag: "🇮🇹" }, canada: { nombre: "Canadá", flag: "🇨🇦" },
};

const TIPO_TXT: Record<string, [string, string]> = {
  job: ["trabajo", "trabajos"], housing: ["aviso de vivienda", "avisos de vivienda"],
  service: ["servicio", "servicios"], evento: ["evento", "eventos"],
  help: ["pedido de ayuda", "pedidos de ayuda"], post: ["publicación", "publicaciones"],
};

// Señales fuertes de estafa (mismas reglas que usa Pana en el chat, sin las débiles como "urgente")
const SCAM_RULES: { re: RegExp; senal: string; consejo: string }[] = [
  { re: /(adelant|anticip|reserv)[a-z]*\s+(el\s+)?(pago|dep[oó]sito|dinero|abono)|pag(a|ar|o)\s+(antes|primero|por adelantado)/i,
    senal: "piden pagar antes de ver el lugar o de empezar el trabajo",
    consejo: "No pagues nada antes de ver el cuarto en persona o firmar algo." },
  { re: /western\s*union|moneygram|bitcoin|usdt|binance|cripto/i,
    senal: "piden pagos por cripto, Western Union o similares",
    consejo: "Desconfía de quien solo acepta pagos difíciles de rastrear." },
  { re: /(cuenta|datos)\s+bancari|n[uú]mero de tarjeta|clave|foto de tu (documento|carnet)/i,
    senal: "piden datos bancarios o fotos de documentos",
    consejo: "Nunca mandes tu clave, tu tarjeta ni fotos de tus documentos por chat." },
  { re: /(gana|ganar|sueldo|pago)\D{0,20}(\$|usd|d[oó]lares)?\s?\d{3,}.*(diari|semanal|al d[ií]a|sin experiencia)/i,
    senal: "prometen mucho dinero rápido y sin experiencia",
    consejo: "Si el sueldo parece demasiado bueno para ser verdad, probablemente lo es." },
  { re: /estoy (fuera|en el extranjero).*(llaves|env[ií]o)|te env[ií]o las llaves/i,
    senal: "el \"dueño\" está fuera del país y te manda las llaves",
    consejo: "Es una estafa clásica de alquiler: nunca pagues sin ver el lugar." },
];

type Draft = { kind: string; city: string; period: string; type?: string; content: string; meta?: Record<string, unknown> };

// ---------- utilidades ----------
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

function hoyVE(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(d); // YYYY-MM-DD
}
function semanaVE(d = new Date()) {
  const [y, m, day] = hoyVE(d).split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, day));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((t.getTime() - y0.getTime()) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(w).padStart(2, "0")}`;
}
const haceDias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const bs = (n: number) => new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const plural = (n: number, [uno, varios]: [string, string]) => `${n} ${n === 1 ? uno : varios}`;

// ---------- cuenta de Pana ----------
async function ensureBot(cfg: { bot_user_id: string | null; bot_name: string }) {
  if (cfg.bot_user_id) return cfg.bot_user_id;

  let id: string | null = null;
  const created = await sb.auth.admin.createUser({
    email: BOT_EMAIL,
    email_confirm: true,
    password: crypto.randomUUID() + crypto.randomUUID(),
    user_metadata: { name: cfg.bot_name, bot: true },
  });
  if (created.data?.user) id = created.data.user.id;
  else {
    for (let page = 1; page <= 20 && !id; page++) {
      const { data } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
      id = data?.users?.find((u) => u.email?.toLowerCase() === BOT_EMAIL)?.id ?? null;
      if (!data?.users?.length) break;
    }
  }
  if (!id) throw new Error("No pude crear la cuenta de Pana: " + (created.error?.message ?? "desconocido"));

  await sb.from("pana_bot").update({ bot_user_id: id, updated_at: new Date().toISOString() }).eq("id", 1);
  const perfil = { id, name: cfg.bot_name, username: "pana_ia", city: "caracas", bio: BOT_BIO };
  const r = await sb.from("profiles").upsert(perfil, { onConflict: "id" });
  if (r.error) await sb.from("profiles").upsert({ ...perfil, username: "pana_ia_bot" }, { onConflict: "id" });
  return id;
}

// ---------- trabajos ----------
async function jobDolar(): Promise<Draft[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  let rows: any[] = [];
  try {
    const res = await fetch("https://ve.dolarapi.com/v1/dolares", { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (res.ok) rows = await res.json();
  } catch { /* sin datos: hoy no hay post */ } finally { clearTimeout(timer); }

  const valor = (r: any) => Number(r?.promedio ?? r?.venta ?? r?.compra) || null;
  const oficial = valor(rows.find((r) => /oficial|bcv/i.test(`${r.fuente} ${r.nombre}`)));
  const paralelo = valor(rows.find((r) => /paralelo/i.test(`${r.fuente} ${r.nombre}`)));
  if (!oficial && !paralelo) return [];

  const { data: prev } = await sb.from("pana_autoposts").select("meta")
    .eq("kind", "dolar").neq("period", hoyVE()).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const cambio = (hoy: number | null, ayer: unknown) => {
    const a = Number(ayer);
    if (!hoy || !a) return "";
    const pct = ((hoy - a) / a) * 100;
    if (Math.abs(pct) < 0.05) return " (igual que ayer)";
    return ` (${pct > 0 ? "▲" : "▼"} ${Math.abs(pct).toFixed(1).replace(".", ",")}% vs ayer)`;
  };
  const [, m, d] = hoyVE().split("-");
  const lineas = [`💵 Dólar hoy en Venezuela (${d}/${m})`, ""];
  if (oficial) lineas.push(`• Oficial (BCV): Bs. ${bs(oficial)}${cambio(oficial, prev?.meta?.oficial)}`);
  if (paralelo) lineas.push(`• Paralelo: Bs. ${bs(paralelo)}${cambio(paralelo, prev?.meta?.paralelo)}`);
  lineas.push("", "Fuente: DolarApi. Son valores de referencia y pueden variar durante el día.",
    "¿Dudas? Pregúntale a Pana 🤖");

  // Sale en las 12 pestañas: a toda la diáspora le sirve (remesas, familia en Venezuela)
  const content = lineas.join("\n");
  return Object.keys(PAISES).map((city) => ({ kind: "dolar", city, period: hoyVE(), content, meta: { oficial, paralelo } }));
}

async function jobEstafas(bot: string): Promise<Draft[]> {
  const { data } = await sb.from("posts").select("city, content, user_id")
    .gte("created_at", haceDias(7)).neq("user_id", bot).limit(2000);
  const conteo = new Map<string, number>(); // "city|regla" → nº de posts
  for (const p of data ?? []) {
    SCAM_RULES.forEach((r, i) => {
      if (r.re.test(p.content ?? "")) conteo.set(`${p.city}|${i}`, (conteo.get(`${p.city}|${i}`) ?? 0) + 1);
    });
  }
  const porPais = new Map<string, number[]>();
  for (const [k, n] of conteo) {
    if (n < 2) continue;
    const [city, i] = k.split("|");
    if (!PAISES[city]) continue;
    porPais.set(city, [...(porPais.get(city) ?? []), Number(i)]);
  }
  const drafts: Draft[] = [];
  for (const [city, reglas] of porPais) {
    const rs = reglas.slice(0, 2).map((i) => SCAM_RULES[i]);
    const { nombre, flag } = PAISES[city];
    drafts.push({
      kind: "estafa", city, period: semanaVE(),
      content: [
        `🛡️ Ojo, panas de ${nombre} ${flag}`,
        "",
        `Esta semana vimos varios avisos en los que ${rs.map((r) => r.senal).join(" o ")}. Eso es una señal típica de estafa.`,
        "",
        ...rs.map((r) => `• ${r.consejo}`),
        "• Mantén la conversación dentro de Épale y desconfía de las prisas.",
        "",
        "¿Tienes dudas con un aviso? Pégaselo a Pana y te digo qué señales veo 🤖",
      ].join("\n"),
      meta: { reglas },
    });
  }
  return drafts;
}

async function jobSemanal(bot: string): Promise<Draft[]> {
  const desde = haceDias(7);
  const [{ data: posts }, { data: perfiles }] = await Promise.all([
    sb.from("posts").select("city, type, user_id").gte("created_at", desde).neq("user_id", bot).limit(5000),
    sb.from("profiles").select("city").gte("created_at", desde).neq("id", bot).limit(5000),
  ]);
  const semana = semanaVE();
  const drafts: Draft[] = [];

  for (const [city, { nombre, flag }] of Object.entries(PAISES)) {
    const delPais = (posts ?? []).filter((p) => p.city === city);
    if (delPais.length) {
      const porTipo = new Map<string, number>();
      delPais.forEach((p) => porTipo.set(p.type ?? "post", (porTipo.get(p.type ?? "post") ?? 0) + 1));
      const orden = ["job", "housing", "service", "evento", "help", "post"];
      const lineas = orden.filter((t) => porTipo.get(t)).map((t) => `• ${plural(porTipo.get(t)!, TIPO_TXT[t])}`);
      drafts.push({
        kind: "resumen", city, period: semana,
        content: [
          `📋 Esta semana en ${nombre} ${flag}`,
          "",
          ...lineas,
          "",
          `Encuéntralos aquí, en la pestaña de ${nombre}, con los filtros de arriba.`,
          `O pídeselo a Pana: «busca trabajos en ${nombre} de esta semana» 🤖`,
        ].join("\n"),
        meta: Object.fromEntries(porTipo),
      });
    }
    const nuevos = (perfiles ?? []).filter((p) => p.city === city).length;
    if (nuevos) {
      drafts.push({
        kind: "bienvenida", city, period: semana,
        content: nuevos === 1
          ? `👋 Esta semana llegó 1 pana nuevo a Épale en ${nombre} ${flag}. ¡Denle la bienvenida!\n\nSi acabas de llegar al país, cuéntanos qué necesitas: aquí siempre hay alguien que ya pasó por lo mismo.`
          : `👋 Esta semana llegaron ${nuevos} panas nuevos a Épale en ${nombre} ${flag}. ¡Denles la bienvenida!\n\nSi acabas de llegar al país, cuéntanos qué necesitas: aquí siempre hay alguien que ya pasó por lo mismo.`,
        meta: { nuevos },
      });
    }
  }
  return drafts;
}

async function jobTip(): Promise<Draft[]> {
  const [{ data: guia }, { data: usados }] = await Promise.all([
    sb.from("pana_knowledge").select("id, city, titulo, contenido, fuente_url").order("id"),
    sb.from("pana_autoposts").select("city, meta, created_at").eq("kind", "tip")
      .order("created_at", { ascending: false }).limit(500),
  ]);
  const drafts: Draft[] = [];
  const ciudades = [...new Set((guia ?? []).map((g) => g.city))].filter((c) => PAISES[c]);
  for (const city of ciudades) {
    const opciones = (guia ?? []).filter((g) => g.city === city);
    const ya = (usados ?? []).filter((u) => u.city === city).map((u) => Number(u.meta?.knowledge_id));
    // El que nunca salió; si ya salieron todos, el que salió hace más tiempo
    const elegido = opciones.find((o) => !ya.includes(o.id))
      ?? opciones.slice().sort((a, b) => ya.indexOf(b.id) - ya.indexOf(a.id))[0];
    if (!elegido) continue;
    const { nombre, flag } = PAISES[city];
    drafts.push({
      kind: "tip", city, period: semanaVE(),
      content: [
        `📌 Tip de la semana para ${nombre} ${flag}: ${elegido.titulo}`,
        "",
        elegido.contenido,
        ...(elegido.fuente_url ? ["", `Fuente oficial: ${elegido.fuente_url}`] : []),
        "",
        "Los requisitos cambian: revisa siempre la web oficial antes de hacer un trámite.",
      ].join("\n"),
      meta: { knowledge_id: elegido.id },
    });
  }
  return drafts;
}

// ---------- posts del día escritos con IA ----------
const CIUDADES = Object.keys(PAISES);
const TEMAS: Record<string, { offset: number; brief: string; respaldo: string[] }> = {
  pregunta: {
    offset: 0,
    brief: "Una PREGUNTA divertida o nostálgica para que la comunidad comente: comida, palabras venezolanas, costumbres, música, recuerdos de Venezuela, vida en el nuevo país. Termina invitando a responder en los comentarios.",
    respaldo: [
      "🫓 Pregunta seria: ¿arepa con qué? Dime tu relleno favorito 👇",
      "🗣️ ¿Qué palabra venezolana tuviste que explicarle a alguien en tu nuevo país? 👇",
      "🎄 Hallacas: ¿con pasas o sin pasas? Que empiece el debate 👇",
      "✈️ ¿Desde qué ciudad nos lees y cuánto tiempo llevas ahí? 👇",
      "🍫 ¿Qué es lo primero que comerías si llegaras hoy a Venezuela? 👇",
    ],
  },
  consejo: {
    offset: 3,
    brief: "Un CONSEJO PRÁCTICO y general para venezolanos que viven fuera: organizarse con el dinero, cuidarse de estafas, guardar copias de documentos, buscar trabajo, adaptarse, cuidar la salud mental, mantener contacto con la familia. Nada de requisitos legales, trámites concretos, cifras ni nombres de instituciones.",
    respaldo: [
      "📁 Consejo del día: guarda una copia digital de tus documentos en la nube y otra en papel. Si pierdes algo, te ahorras un dolor de cabeza.",
      "🛡️ Consejo del día: si alguien te pide pagar por adelantado para \"asegurarte\" un trabajo o un cuarto, desconfía. Primero ves, después pagas.",
      "📝 Consejo del día: cuando empieces un trabajo, pide siempre las condiciones por escrito: horario, pago y fecha de pago.",
      "💬 Consejo del día: llama a tu familia aunque sea 5 minutos. Estar lejos se lleva mejor cuando uno no se aísla.",
    ],
  },
  cultura: {
    offset: 6,
    brief: "Un post sobre CULTURA VENEZOLANA cotidiana y muy conocida: comida, dichos y expresiones, juegos de infancia, música en general, Navidad venezolana, costumbres por región. Tono cálido y orgulloso. NO menciones fechas, cifras, récords, ni personas reales.",
    respaldo: [
      "🇻🇪 \"Échale bolas\": la frase que más de un venezolano se ha repetido en el extranjero. ¿Cuál es tu frase para seguir adelante? 👇",
      "🥟 Un tequeño a tiempo arregla cualquier reunión. ¿Quién los hace mejor en tu casa? 👇",
      "🎶 Hay canciones que suenan a casa apenas empiezan. ¿Cuál es la tuya? 👇",
    ],
  },
  comunidad: {
    offset: 9,
    brief: "Un mensaje de COMUNIDAD para cerrar el día: ánimo, humor sano de la vida del migrante, celebrar logros pequeños, invitar a presentarse o a ayudar a otros en Épale. Cercano y positivo, sin cursilería.",
    respaldo: [
      "🌙 ¿Qué lograste hoy, aunque sea pequeño? Cuéntalo aquí, que en Épale se celebra todo 👇",
      "🤝 Si llegaste hace poco a tu país, preséntate en los comentarios: siempre hay un pana que ya pasó por lo mismo.",
      "😅 Migrante nivel experto: ya no conviertes precios a bolívares… ¿o sí? 👇",
    ],
  },
};

const REGLAS_IA = `Eres Pana, el asistente de Épale, la red social de la diáspora venezolana. Escribe UN post corto para el feed.
Reglas obligatorias:
- Español venezolano natural, cercano, sin exagerar la jerga. 1 a 3 frases, máximo 280 caracteres. 1 o 2 emojis.
- No inventes datos: nada de cifras, precios, fechas, estadísticas, leyes, requisitos de trámites, noticias ni nombres de personas reales o instituciones.
- Nada de política, religión, temas médicos, dinero/inversiones, contenido sexual ni nada que pueda ofender a un grupo.
- Sin links, sin hashtags, sin @menciones, sin comillas alrededor del post.
- No repitas ideas de los posts recientes que te paso.
Devuelve SOLO el texto del post.`;

function diaNum() {
  const [y, m, d] = hoyVE().split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

async function escribirConIA(kind: string, pais: string, recientes: string[]): Promise<string | null> {
  const key = Deno.env.get("DEEPSEEK_API_KEY");
  if (!key) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "deepseek-chat", temperature: 0.95, max_tokens: 220,
        messages: [
          { role: "system", content: REGLAS_IA },
          { role: "user", content: `Tipo de post: ${TEMAS[kind].brief}\nSe publicará en ${pais}: lo lee toda la diáspora, en cualquier país.\nPosts recientes (no repetir):\n${recientes.map((r) => "- " + r).join("\n") || "- (ninguno)"}` },
        ],
      }),
    });
    if (!res.ok) return null;
    let t: string = (await res.json()).choices?.[0]?.message?.content ?? "";
    t = t.trim().replace(/^["“«]|["”»]$/g, "").trim();
    // Filtros de seguridad: largo razonable, sin links, teléfonos, menciones ni hashtags
    if (t.length < 30 || t.length > 400) return null;
    if (/https?:|www\.|\.com\b|@\w|#\w|\+?\d[\d\s-]{7,}/i.test(t)) return null;
    return t;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function jobTema(kind: string): Promise<Draft[]> {
  const tema = TEMAS[kind];
  const dia = diaNum();
  const { data: prev } = await sb.from("pana_autoposts").select("content")
    .in("kind", Object.keys(TEMAS)).order("created_at", { ascending: false }).limit(200);
  const recientes = [...new Set((prev ?? []).map((r) => String(r.content).slice(0, 90)))].slice(0, 15);
  let content = await escribirConIA(kind, "todos los países", recientes);
  let fuente = "ia";
  if (!content) {
    const libres = tema.respaldo.filter((r) => !recientes.some((x) => r.startsWith(x.slice(0, 40))));
    content = (libres.length ? libres : tema.respaldo)[dia % (libres.length || tema.respaldo.length)];
    fuente = "respaldo";
  }
  // El mismo post en las 12 pestañas de país (la pestaña Global lo muestra una sola vez)
  return CIUDADES.map((city) => ({ kind, city, period: hoyVE(), content: content!, meta: { fuente } }));
}

async function avisarAdmins(n: number) {
  const { data: admins } = await sb.from("pana_admins").select("user_id");
  const texto = `Pana: dejé ${n} post${n === 1 ? "" : "s"} en borrador. Ábreme y dime «muéstrame los borradores» 🤖`;
  for (const a of admins ?? []) {
    const r = await sb.from("notifications").insert({ user_id: a.user_id, from_name: texto, type: "pana_alerta", post_id: null });
    if (r.error) await sb.from("notifications").insert({ user_id: a.user_id, from_name: texto, type: "pana_alerta", post_id: "" });
  }
}

// ---------- servidor ----------
Deno.serve(async (req) => {
  try {
    const { job = "diario" } = await req.json().catch(() => ({}));
    const { data: cfg, error } = await sb.from("pana_bot").select("modo, bot_user_id, bot_name").eq("id", 1).single();
    if (error) throw error;
    if (cfg.modo === "pausa") return json({ job, pausa: true });

    const bot = await ensureBot(cfg);
    let drafts: Draft[] = [];
    if (job === "diario") drafts = [...await jobDolar(), ...await jobEstafas(bot)];
    else if (job === "semanal") drafts = await jobSemanal(bot);
    else if (job === "tip") drafts = await jobTip();
    else if (TEMAS[job]) drafts = await jobTema(job);
    else return json({ error: "job desconocido" }, 400);

    if (!drafts.length) return json({ job, creados: 0 });

    // Solo entran los que no existían (mismo tipo + país + periodo = se ignora)
    const { data: nuevos, error: e2 } = await sb.from("pana_autoposts")
      .upsert(drafts.map((d) => ({ type: "post", meta: {}, ...d })), { onConflict: "kind,city,period", ignoreDuplicates: true })
      .select("id");
    if (e2) throw e2;
    const ids = (nuevos ?? []).map((r) => r.id);

    if (ids.length && cfg.modo === "auto") {
      await sb.from("pana_autoposts").update({ status: "aprobado" }).in("id", ids).eq("status", "borrador");
    } else if (ids.length) {
      await avisarAdmins(ids.length);
    }
    return json({ job, modo: cfg.modo, creados: ids.length });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
