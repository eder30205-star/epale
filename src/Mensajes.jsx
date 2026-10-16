// src/Mensajes.jsx — chat privado de Épale (bandeja + conversación en tiempo real)
// Usa las tablas y funciones de supabase/sql/epale-mensajes.sql
import { useCallback, useEffect, useRef, useState } from "react";

const PAIS = {
  madrid: "España", miami: "USA", bogota: "Colombia", santiago: "Chile", lima: "Perú",
  buenos: "Argentina", quito: "Ecuador", panama: "Panamá", caracas: "Venezuela",
  portugal: "Portugal", italia: "Italia", canada: "Canadá",
};

function hace(fecha) {
  if (!fecha) return "";
  const s = (Date.now() - new Date(fecha).getTime()) / 1000;
  if (s < 60) return "ahora";
  if (s < 3600) return Math.floor(s / 60) + " min";
  if (s < 86400) return Math.floor(s / 3600) + " h";
  if (s < 604800) return Math.floor(s / 86400) + " d";
  return new Date(fecha).toLocaleDateString("es");
}

function Avatar({ nombre, foto, size = 44 }) {
  const ini = String(nombre || "?").trim().slice(0, 1).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: 999, flexShrink: 0, overflow: "hidden", background: "linear-gradient(135deg,#ffcc00,#0066ff)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: size * 0.42 }}>
      {foto && String(foto).length > 5 ? <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ini}
    </div>
  );
}

function Pantalla({ C, titulo, onBack, derecha, children, pie }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 450, background: C.bg, maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", fontFamily: "'Inter',sans-serif", color: C.text }}>
      <div style={{ display: "flex", height: 4, flexShrink: 0 }}><div style={{ flex: 1, background: "#ffcc00" }} /><div style={{ flex: 1, background: "#0033A0" }} /><div style={{ flex: 1, background: "#CF0A0A" }} /></div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.card, borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
        <button type="button" onClick={onBack} aria-label="Volver" style={{ width: 40, height: 40, borderRadius: 999, border: "none", background: C.bg, color: C.text, fontSize: 18, cursor: "pointer" }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>{titulo}</div>
        {derecha}
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
      {pie}
    </div>
  );
}

// ---------- contador de no leídos (para el ícono del chat) ----------
export function useMensajesSinLeer(supabase, userId) {
  const [n, setN] = useState(0);
  const refrescar = useCallback(() => {
    if (!userId) return;
    supabase.rpc("mensajes_sin_leer").then(({ data, error }) => { if (!error) setN(data ?? 0); });
  }, [supabase, userId]);
  useEffect(() => {
    if (!userId) return;
    refrescar();
    const ch = supabase.channel("mensajes-sin-leer-" + userId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes", filter: "para=eq." + userId }, refrescar)
      .subscribe();
    const t = setInterval(refrescar, 60000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [supabase, userId, refrescar]);
  return [n, refrescar];
}

// ---------- bandeja ----------
export function Bandeja({ supabase, userId, C, onClose, onAbrir }) {
  const [chats, setChats] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState([]);

  const cargar = useCallback(() => {
    supabase.rpc("mis_chats").then(({ data, error }) => {
      if (error) setError("No se pudieron cargar tus mensajes. ¿Ya se activó el chat en Supabase?");
      setChats(data ?? []);
    });
  }, [supabase]);

  useEffect(() => {
    cargar();
    const ch = supabase.channel("bandeja-" + userId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes", filter: "para=eq." + userId }, cargar)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, userId, cargar]);

  useEffect(() => {
    const t = q.replace(/^@/, "").trim();
    if (t.length < 2) { setResultados([]); return; }
    const id = setTimeout(() => {
      const limpio = t.replace(/[%_,()]/g, " ");
      supabase.from("profiles").select("id, name, username, city, photo_url")
        .or(`name.ilike.%${limpio}%,username.ilike.%${limpio}%`).neq("id", userId).limit(8)
        .then(({ data }) => setResultados((data ?? []).filter((p) => p.name)));
    }, 300);
    return () => clearTimeout(id);
  }, [q, supabase, userId]);

  return (
    <Pantalla C={C} onBack={onClose} titulo={<div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18 }}>Mensajes</div>}>
      <div style={{ padding: "12px 14px 4px" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escribirle a alguien: nombre o @usuario"
          style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, border: "1.5px solid " + C.border, background: C.card, color: C.text, fontSize: 14 }} />
      </div>
      {resultados.length > 0 && (
        <div style={{ margin: "6px 14px 10px", background: C.card, borderRadius: 12, border: "1px solid " + C.border }}>
          {resultados.map((p) => (
            <button key={p.id} type="button" onClick={() => onAbrir(p)} style={{ display: "flex", gap: 10, alignItems: "center", width: "100%", padding: "10px 12px", background: "none", border: "none", borderBottom: "1px solid " + C.border, cursor: "pointer", color: C.text, textAlign: "left" }}>
              <Avatar nombre={p.name} foto={p.photo_url} size={36} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{p.username ? "@" + p.username : ""}{p.city && PAIS[p.city] ? " · " + PAIS[p.city] : ""}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {error && <p style={{ color: "#CF0A0A", fontSize: 13, padding: "0 16px" }}>{error}</p>}
      {chats === null && <p style={{ color: C.muted, textAlign: "center", padding: 30 }}>Cargando…</p>}
      {chats && chats.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "40px 24px", color: C.muted }}>
          <div style={{ fontSize: 40 }}>💬</div>
          <p style={{ fontSize: 14, lineHeight: 1.5 }}>Todavía no tienes conversaciones.<br />Busca a alguien arriba, o toca <strong>Mensaje</strong> en el perfil de un pana.</p>
        </div>
      )}
      {(chats ?? []).map((c) => (
        <button key={c.otro} type="button" onClick={() => onAbrir({ id: c.otro, name: c.nombre, username: c.usuario, photo_url: c.foto })}
          style={{ display: "flex", gap: 12, alignItems: "center", width: "100%", padding: "12px 16px", background: C.card, border: "none", borderBottom: "1px solid " + C.border, cursor: "pointer", color: C.text, textAlign: "left" }}>
          <Avatar nombre={c.nombre} foto={c.foto} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontWeight: c.sin_leer ? 800 : 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nombre || "Usuario de Épale"}</span>
              <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{hace(c.fecha)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 2 }}>
              <span style={{ fontSize: 13, color: c.sin_leer ? C.text : C.muted, fontWeight: c.sin_leer ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.ultimo_de_mi ? "Tú: " : ""}{c.ultimo}
              </span>
              {c.sin_leer > 0 && <span style={{ flexShrink: 0, minWidth: 20, height: 20, borderRadius: 999, background: "#0066ff", color: "#fff", fontSize: 11, fontWeight: 800, display: "grid", placeItems: "center", padding: "0 6px" }}>{c.sin_leer}</span>}
            </div>
          </div>
        </button>
      ))}
    </Pantalla>
  );
}

// ---------- conversación ----------
export function Chat({ supabase, userId, otro, C, onBack, onLeido }) {
  const [msgs, setMsgs] = useState(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [perfil, setPerfil] = useState(otro);
  const [bloqueado, setBloqueado] = useState(false);
  const [menu, setMenu] = useState(false);
  const abajo = useRef(null);

  const marcar = useCallback(() => {
    supabase.rpc("marcar_leidos", { p_otro: otro.id }).then(() => onLeido && onLeido());
  }, [supabase, otro.id, onLeido]);

  useEffect(() => {
    if (!otro.name || otro.username === undefined) {
      supabase.from("profiles").select("id, name, username, city, photo_url").eq("id", otro.id).maybeSingle()
        .then(({ data }) => { if (data) setPerfil(data); });
    }
    supabase.from("bloqueos").select("bloqueado").eq("quien", userId).eq("bloqueado", otro.id).maybeSingle()
      .then(({ data }) => setBloqueado(!!data));
    supabase.from("mensajes").select("id, de, para, texto, created_at")
      .or(`and(de.eq.${userId},para.eq.${otro.id}),and(de.eq.${otro.id},para.eq.${userId})`)
      .order("created_at", { ascending: false }).limit(200)
      .then(({ data, error }) => {
        if (error) setError("No se pudo abrir el chat. ¿Ya se activó el chat en Supabase?");
        setMsgs((data ?? []).reverse());
        marcar();
      });
    const ch = supabase.channel("chat-" + userId + "-" + otro.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes", filter: "para=eq." + userId }, (payload) => {
        const m = payload.new;
        if (m.de !== otro.id) return;
        setMsgs((cur) => (cur && !cur.find((x) => x.id === m.id) ? [...cur, m] : cur));
        marcar();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, userId, otro.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { abajo.current?.scrollIntoView({ block: "end" }); }, [msgs]);

  async function enviar() {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true); setError(null);
    const { data, error } = await supabase.from("mensajes").insert({ de: userId, para: otro.id, texto: t })
      .select("id, de, para, texto, created_at").single();
    setEnviando(false);
    if (error) { setError(error.message || "No se pudo enviar"); return; }
    setTexto("");
    setMsgs((cur) => [...(cur ?? []), data]);
  }

  async function alternarBloqueo() {
    setMenu(false);
    if (bloqueado) {
      await supabase.from("bloqueos").delete().eq("quien", userId).eq("bloqueado", otro.id);
      setBloqueado(false);
    } else {
      if (!confirm("¿Bloquear a esta persona? No podrá escribirte y tú tampoco a ella.")) return;
      const { error } = await supabase.from("bloqueos").insert({ quien: userId, bloqueado: otro.id });
      if (!error) setBloqueado(true);
    }
  }

  const titulo = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <Avatar nombre={perfil.name} foto={perfil.photo_url} size={36} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{perfil.name || "Usuario de Épale"}</div>
        {perfil.username && <div style={{ fontSize: 12, color: C.muted }}>@{perfil.username}</div>}
      </div>
    </div>
  );

  const derecha = (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setMenu((v) => !v)} aria-label="Opciones" style={{ width: 40, height: 40, borderRadius: 999, border: "none", background: C.bg, color: C.text, fontSize: 18, cursor: "pointer" }}>⋯</button>
      {menu && (
        <div style={{ position: "absolute", right: 0, top: 44, background: C.card, border: "1px solid " + C.border, borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.15)", zIndex: 5, minWidth: 180 }}>
          <button type="button" onClick={alternarBloqueo} style={{ display: "block", width: "100%", padding: "12px 14px", background: "none", border: "none", textAlign: "left", cursor: "pointer", color: bloqueado ? C.text : "#CF0A0A", fontWeight: 600 }}>
            {bloqueado ? "Desbloquear" : "Bloquear"}
          </button>
        </div>
      )}
    </div>
  );

  const pie = bloqueado ? (
    <div style={{ padding: "14px 16px calc(14px + env(safe-area-inset-bottom))", background: C.card, borderTop: "1px solid " + C.border, textAlign: "center", fontSize: 13, color: C.muted }}>
      Bloqueaste a esta persona. <button type="button" onClick={alternarBloqueo} style={{ background: "none", border: "none", color: "#0066ff", fontWeight: 700, cursor: "pointer" }}>Desbloquear</button>
    </div>
  ) : (
    <div style={{ padding: "10px 12px calc(10px + env(safe-area-inset-bottom))", background: C.card, borderTop: "1px solid " + C.border }}>
      {error && <p style={{ color: "#CF0A0A", fontSize: 12, margin: "0 4px 8px" }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={1} maxLength={2000} placeholder="Escribe un mensaje…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          style={{ flex: 1, resize: "none", maxHeight: 120, padding: "11px 14px", borderRadius: 20, border: "1.5px solid " + C.border, background: C.bg, color: C.text, fontSize: 14, fontFamily: "'Inter',sans-serif", lineHeight: 1.4 }} />
        <button type="button" onClick={enviar} disabled={enviando || !texto.trim()} aria-label="Enviar"
          style={{ width: 44, height: 44, borderRadius: 999, border: "none", background: texto.trim() ? "#ffcc00" : C.border, color: "#1a1a1a", fontSize: 18, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>➤</button>
      </div>
    </div>
  );

  return (
    <Pantalla C={C} onBack={onBack} titulo={titulo} derecha={derecha} pie={pie}>
      <div style={{ padding: "12px 12px 4px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ alignSelf: "center", maxWidth: 360, textAlign: "center", fontSize: 12, color: C.muted, background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "8px 12px", marginBottom: 6, lineHeight: 1.45 }}>
          🛡️ Nunca envíes dinero, datos bancarios ni fotos de tus documentos por chat. Si algo huele raro, pregúntale a Pana.
        </div>
        {msgs === null && <p style={{ color: C.muted, textAlign: "center" }}>Cargando…</p>}
        {msgs && msgs.length === 0 && <p style={{ color: C.muted, textAlign: "center", fontSize: 14 }}>Escribe el primer mensaje 👋</p>}
        {(msgs ?? []).map((m) => {
          const mio = m.de === userId;
          return (
            <div key={m.id} style={{ alignSelf: mio ? "flex-end" : "flex-start", maxWidth: "80%" }}>
              <div style={{ padding: "9px 13px", borderRadius: mio ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: mio ? "#ffcc00" : C.card, color: mio ? "#1a1a1a" : C.text, border: mio ? "none" : "1px solid " + C.border, fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {m.texto}
              </div>
              <div style={{ fontSize: 10, color: C.muted, margin: "2px 6px", textAlign: mio ? "right" : "left" }}>{hace(m.created_at)}</div>
            </div>
          );
        })}
        <div ref={abajo} />
      </div>
    </Pantalla>
  );
}
