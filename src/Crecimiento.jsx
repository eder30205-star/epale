// src/Crecimiento.jsx
// Todo lo que ayuda a que Épale llegue a más gente:
//   · Links propios por post (epaleapp.online/p/123) y la vista pública del post
//   · "Invita a un pana" (epaleapp.online/i/<usuario>) con contador e insignia Embajador
//   · Completar perfil cuando alguien entra con Google por primera vez
import { useEffect, useState } from "react";

export const SITE = "https://epaleapp.online";
const REF_KEY = "epale_ref";

const PAISES = [
  ["madrid", "España"], ["miami", "USA"], ["bogota", "Colombia"], ["santiago", "Chile"],
  ["lima", "Perú"], ["buenos", "Argentina"], ["quito", "Ecuador"], ["panama", "Panamá"],
  ["caracas", "Venezuela"], ["portugal", "Portugal"], ["italia", "Italia"], ["canada", "Canadá"],
];
const NOMBRE_PAIS = Object.fromEntries(PAISES);
const TIPOS = { job: "Trabajo", housing: "Vivienda", service: "Servicio", help: "Ayuda", evento: "Evento" };

// ---------- links ----------
export const linkPost = (id) => `${SITE}/p/${id}`;
export const linkInvitacion = (username) => `${SITE}/i/${encodeURIComponent(username)}`;

export function compartirPostWhatsApp(post) {
  const tipo = TIPOS[post.type];
  const intro = tipo ? `${tipo} en Épale` : `Mira esto en Épale`;
  const texto = `${intro}: "${String(post.content ?? "").slice(0, 120)}${String(post.content ?? "").length > 120 ? "…" : ""}"\n${linkPost(post.id)}`;
  return "https://wa.me/?text=" + encodeURIComponent(texto);
}

// ---------- parámetros de la URL ----------
// ?chat=<id> llega al tocar una notificación de mensaje
export const CHAT_INICIAL = { id: null };
// Se llama una vez al cargar: guarda ?ref= y devuelve ?post= (si hay)
export function leerParametros() {
  let post = null;
  try {
    const q = new URLSearchParams(window.location.search);
    const ref = q.get("ref");
    if (ref && /^[0-9a-zA-Z_.-]{1,40}$/.test(ref)) localStorage.setItem(REF_KEY, ref);
    const p = q.get("post");
    if (p && /^[0-9a-zA-Z-]{1,64}$/.test(p)) post = p;
    const chat = q.get("chat");
    if (chat && /^[0-9a-f-]{36}$/i.test(chat)) CHAT_INICIAL.id = chat;
    if (ref || p || chat) {
      q.delete("ref"); q.delete("post"); q.delete("chat");
      const rest = q.toString();
      window.history.replaceState(null, "", window.location.pathname + (rest ? "?" + rest : "") + window.location.hash);
    }
  } catch { /* sin storage: no pasa nada */ }
  return post;
}

// Después de iniciar sesión: si llegó por una invitación, la registra (solo cuenta en cuentas nuevas)
export async function registrarInvitacionPendiente(supabase) {
  let code = null;
  try { code = localStorage.getItem(REF_KEY); } catch { return; }
  if (!code) return;
  const { data, error } = await supabase.rpc("registrar_invitacion", { p_code: code });
  if (!error && data !== "sin sesión") {
    try { localStorage.removeItem(REF_KEY); } catch { /* nada */ }
  }
}

// ---------- insignia Embajador ----------
let _embajadores = new Set();
let _cargado = false;
export function cargarEmbajadores(supabase) {
  if (_cargado) return Promise.resolve();
  _cargado = true;
  return supabase.rpc("embajadores").then(({ data }) => {
    _embajadores = new Set((data ?? []).map((r) => String(r.name || "").toLowerCase()));
  }).catch(() => {});
}
export const esEmbajador = (name) => _embajadores.has(String(name || "").toLowerCase());

// ---------- vista pública de un post (al abrir un link /p/123) ----------
export function PostPublico({ supabase, postId, C, logueado, onCerrar, onUnirme }) {
  const [post, setPost] = useState(undefined);
  const [comentarios, setComentarios] = useState([]);

  useEffect(() => {
    let vivo = true;
    supabase.from("posts").select("id, name, city, type, content, likes, comments, created_at")
      .eq("id", postId).maybeSingle()
      .then(({ data }) => { if (vivo) setPost(data ?? null); });
    supabase.from("comments").select("user_name, content, created_at").eq("post_id", String(postId))
      .order("created_at", { ascending: false }).limit(5)
      .then(({ data }) => { if (vivo) setComentarios(data ?? []); });
    return () => { vivo = false; };
  }, [supabase, postId]);

  const fondo = { position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" };
  const hoja = { width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto", background: C.card, color: C.text, borderRadius: "22px 22px 0 0", padding: "18px 20px calc(22px + env(safe-area-inset-bottom))", fontFamily: "'Inter',sans-serif" };
  const boton = (primario) => ({ flex: 1, padding: "13px", borderRadius: 100, border: primario ? "none" : "1.5px solid " + C.border, background: primario ? "#ffcc00" : "transparent", color: primario ? "#1a1a1a" : C.text, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Inter',sans-serif" });

  return (
    <div style={fondo} onClick={onCerrar}>
      <div style={hoja} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Post de Épale">
        <div style={{ width: 40, height: 4, borderRadius: 4, background: C.border, margin: "0 auto 14px" }} />
        {post === undefined && <p style={{ color: C.muted, textAlign: "center", padding: 24 }}>Cargando…</p>}
        {post === null && <p style={{ color: C.muted, textAlign: "center", padding: 24 }}>Este post ya no está disponible.</p>}
        {post && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 999, background: "#ffcc00", color: "#1a1a1a", display: "grid", placeItems: "center", fontWeight: 800 }}>
                {String(post.name || "?").slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{post.name || "Anónimo"}</div>
                <div style={{ fontSize: 12, color: C.muted }}>
                  {[TIPOS[post.type], NOMBRE_PAIS[post.city]].filter(Boolean).join(" · ")}
                  {post.created_at ? " · " + new Date(post.created_at).toLocaleDateString("es") : ""}
                </div>
              </div>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: "0 0 12px" }}>{post.content}</p>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
              ❤️ {post.likes ?? 0} · 💬 {post.comments ?? comentarios.length}
            </div>
            {comentarios.length > 0 && (
              <div style={{ background: C.bg, borderRadius: 12, padding: "10px 12px", marginBottom: 14 }}>
                {comentarios.map((c, i) => (
                  <p key={i} style={{ fontSize: 13, margin: "4px 0", lineHeight: 1.4 }}>
                    <strong>{c.user_name || "Pana"}:</strong> {c.content}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
        {logueado ? (
          <div style={{ display: "flex", gap: 10 }}>
            {post && <a href={compartirPostWhatsApp(post)} target="_blank" rel="noreferrer" style={{ ...boton(false), textAlign: "center", textDecoration: "none" }}>Compartir</a>}
            <button type="button" style={boton(true)} onClick={onCerrar}>Ir a mi feed</button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: C.muted, textAlign: "center", margin: "0 0 10px" }}>
              Únete gratis para comentar, escribirle y ver más avisos de venezolanos en tu país 🇻🇪
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" style={boton(false)} onClick={onCerrar}>Ahora no</button>
              <button type="button" style={boton(true)} onClick={onUnirme}>Unirme a Épale</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- tarjeta "Invita a un pana" (en el perfil) ----------
export function InvitaCard({ supabase, userId, C }) {
  const [username, setUsername] = useState(null);
  const [total, setTotal] = useState(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles").select("username").eq("id", userId).maybeSingle()
      .then(({ data }) => setUsername(data?.username ?? null));
    supabase.rpc("mis_invitaciones").then(({ data, error }) => setTotal(error ? 0 : data ?? 0));
  }, [supabase, userId]);

  if (!username) return null;
  const link = linkInvitacion(username);
  const meta = 3;
  const n = total ?? 0;
  const embajador = n >= meta;
  const texto = `¡Épale pana! Únete a Épale, la red de los venezolanos en el mundo: trabajo, vivienda, el dólar del día y tu gente en tu país 🇻🇪\n${link}`;

  async function compartir() {
    try {
      if (navigator.share) { await navigator.share({ title: "Épale", text: texto }); return; }
    } catch { /* cancelado */ }
    window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank", "noopener");
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* nada */ }
  }

  return (
    <div style={{ margin: "0 14px 10px", background: C.card, border: "1.5px solid " + C.border, borderRadius: 16, padding: 16, fontFamily: "'Inter',sans-serif", color: C.text }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16 }}>🤝 Invita a tus panas</div>
        <div style={{ fontSize: 13, color: C.muted }}>{total === null ? "…" : `${n} invitado${n === 1 ? "" : "s"}`}</div>
      </div>
      <p style={{ fontSize: 13, color: C.muted, margin: "6px 0 10px", lineHeight: 1.45 }}>
        {embajador
          ? "¡Eres Embajador de Épale! Tu insignia 🤝 ya sale junto a tu nombre en el feed."
          : `Invita a ${meta - n} pana${meta - n === 1 ? "" : "s"} más y ganas la insignia 🤝 Embajador junto a tu nombre.`}
      </p>
      <div style={{ height: 8, borderRadius: 8, background: C.bg, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ height: "100%", width: `${Math.min(100, (n / meta) * 100)}%`, background: "#ffcc00", transition: "width .4s" }} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={compartir} style={{ flex: 2, padding: "12px", borderRadius: 100, border: "none", background: "#25D366", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Invitar por WhatsApp</button>
        <button type="button" onClick={copiar} style={{ flex: 1, padding: "12px", borderRadius: 100, border: "1.5px solid " + C.border, background: "transparent", color: C.text, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{copiado ? "¡Copiado!" : "Copiar link"}</button>
      </div>
    </div>
  );
}

// ---------- completar perfil (primera vez con Google) ----------
export function CompletarPerfil({ supabase, userId, nombreSugerido, C, onListo }) {
  const [nombre, setNombre] = useState(nombreSugerido || "");
  const [pais, setPais] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar() {
    const n = nombre.trim();
    if (n.length < 2) return setError("Escribe tu nombre");
    if (!pais) return setError("Elige el país donde vives");
    setGuardando(true); setError("");
    const base = n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "").slice(0, 16) || "pana";
    for (let i = 0; i < 4; i++) {
      const username = i === 0 ? base : base + Math.floor(100 + Math.random() * 900);
      const { error: e } = await supabase.from("profiles").upsert({ id: userId, name: n, city: pais, username }, { onConflict: "id" });
      if (!e) { setGuardando(false); onListo({ name: n, city: pais }); return; }
      if (!/duplicate|unique/i.test(e.message)) { setError("No se pudo guardar: " + e.message); break; }
    }
    setGuardando(false);
  }

  const campo = { width: "100%", padding: "13px 14px", borderRadius: 12, border: "1.5px solid " + C.border, background: C.bg, color: C.text, fontSize: 15, fontFamily: "'Inter',sans-serif", boxSizing: "border-box" };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Inter',sans-serif", color: C.text }}>
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 40, textAlign: "center" }}>🇻🇪</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 22, textAlign: "center" }}>¡Bienvenido a Épale!</div>
        <p style={{ color: C.muted, fontSize: 14, textAlign: "center", margin: 0 }}>Solo dos datos para mostrarte a tu gente.</p>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Tu nombre
          <input style={{ ...campo, marginTop: 6 }} value={nombre} maxLength={40} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. María" />
        </label>
        <label style={{ fontSize: 13, fontWeight: 600 }}>¿Dónde vives?
          <select style={{ ...campo, marginTop: 6 }} value={pais} onChange={(e) => setPais(e.target.value)}>
            <option value="">Elige tu país</option>
            {PAISES.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
          </select>
        </label>
        {error && <p style={{ color: "#CF0A0A", fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="button" disabled={guardando} onClick={guardar} style={{ padding: "14px", borderRadius: 100, border: "none", background: "#ffcc00", color: "#1a1a1a", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: guardando ? 0.6 : 1 }}>
          {guardando ? "Guardando…" : "Entrar a Épale"}
        </button>
      </div>
    </div>
  );
}

