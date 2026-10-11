// Pantalla de Pana conectada a Pana v3 (Edge Function "pana").
// Conversaciones guardadas, herramientas (buscar avisos, guía por país, alertas)
// y acciones que el usuario confirma con un botón (publicar, comentar, seguir).
import React, { useEffect, useRef, useState } from "react";
import { usePana } from "./hooks/usePana.js";

const SUGERENCIAS = [
  "Busca cuartos en alquiler en mi país",
  "Ayúdame a escribir un aviso de trabajo",
  "¿Qué tengo que hacer al llegar a Chile?",
  "Avísame cuando salga trabajo de cocinero",
];

const ACCION = { publicar_post: "Publicar", comentar: "Comentar", seguir: "Seguir" };
const HECHO = { publicar_post: "Publicado ✓", comentar: "Comentado ✓", seguir: "Siguiendo ✓" };

export default function PanaChat({ supabase, theme, onClose }) {
  const C = theme;
  const pana = usePana(supabase);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState(() => { try { return localStorage.getItem("pana_voz") === "1"; } catch { return false; } });
  const [history, setHistory] = useState(false);
  const [done, setDone] = useState([]); // [{ id, text }]
  const bottomRef = useRef(null);
  const lastSpoken = useRef(0);

  // La conversación vieja (chat anterior) ya no se usa.
  useEffect(() => { try { localStorage.removeItem("pana_conversation"); } catch { /* nada */ } }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [pana.messages, pana.pending, pana.loading, done]);

  // Leer en voz alta la última respuesta, si la voz está activada.
  useEffect(() => {
    const last = pana.messages[pana.messages.length - 1];
    if (!voice || !last || last.role !== "assistant" || pana.messages.length === lastSpoken.current) return;
    lastSpoken.current = pana.messages.length;
    speak(supabase, last.content);
  }, [pana.messages, voice, supabase]);

  function toggleVoice() {
    const v = !voice;
    setVoice(v);
    try { localStorage.setItem("pana_voz", v ? "1" : "0"); } catch { /* nada */ }
    if (!v) { window.speechSynthesis?.cancel(); window.__panaAudio?.pause(); }
  }

  function send(text) {
    const t = (text ?? input).trim();
    if (!t || pana.loading) return;
    setInput("");
    pana.send(t);
  }

  async function resolve(a, ok) {
    const res = ok ? await pana.confirm(a.id) : await pana.cancel(a.id);
    const label = ok ? (res?.ok === false ? `No se pudo: ${res.error ?? "error"}` : HECHO[a.type] ?? "Hecho ✓") : "Cancelado";
    setDone((d) => [...d, { id: a.id, text: `${label} — ${a.resumen}` }]);
  }

  function listen() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Tu navegador no soporta reconocimiento de voz"); return; }
    const r = new SR();
    r.lang = "es-ES"; r.continuous = false; r.interimResults = false;
    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onresult = (e) => setInput((p) => p + e.results[0][0].transcript);
    r.onerror = (e) => {
      setListening(false);
      if (e.error === "network") alert("El reconocimiento de voz no está disponible en tu red. Escribe tu mensaje.");
      else if (e.error === "not-allowed") alert("Permite el acceso al micrófono para usar la voz.");
    };
    r.start();
  }

  async function openHistory() {
    setHistory(true);
    try { await pana.loadConversations(); } catch { /* el error lo muestra el hook */ }
  }

  const empty = pana.messages.length === 0;
  const avatar = (
    <div style={{ width: 32, height: 32, borderRadius: 9999, background: "linear-gradient(135deg,#ffcc00,#0033A0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginRight: 8, flexShrink: 0, alignSelf: "flex-end" }}>🤖</div>
  );
  const btn = { background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.muted, padding: "6px 8px", borderRadius: 8, fontFamily: "'Inter',sans-serif" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: C.bg, maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", height: 4 }}><div style={{ flex: 1, background: "#CF9A00" }} /><div style={{ flex: 1, background: "#0033A0" }} /><div style={{ flex: 1, background: "#CF0A0A" }} /></div>

      {/* Encabezado */}
      <div style={{ padding: "12px 12px", background: C.card, borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onClose} aria-label="Volver" style={{ background: C.bg, border: "none", borderRadius: 9999, width: 36, height: 36, cursor: "pointer", color: C.blue, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
        <div style={{ width: 40, height: 40, borderRadius: 9999, background: "linear-gradient(135deg,#ffcc00,#0033A0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🤖</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontFamily: "'Syne',sans-serif", fontWeight: 700, color: C.text }}>Pana</div>
          <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif" }}>Tu asistente venezolano 🇻🇪</div>
        </div>
        <button onClick={toggleVoice} aria-pressed={voice} title={voice ? "Silenciar a Pana" : "Escuchar a Pana"} style={{ ...btn, fontSize: 18 }}>{voice ? "🔊" : "🔇"}</button>
        <button onClick={openHistory} style={btn}>Historial</button>
        <button onClick={() => { pana.newConversation(); setDone([]); }} style={btn}>Nueva</button>
      </div>

      {/* Mensajes */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, WebkitOverflowScrolling: "touch" }}>
        {empty && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex" }}>
              {avatar}
              <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: C.card, color: C.text, border: "1px solid " + C.border, fontFamily: "'Inter',sans-serif", fontSize: 14, lineHeight: 1.5 }}>
                ¡Épale, pana! Puedo buscarte cuartos, trabajos y servicios en Épale, escribir tu aviso, orientarte si acabas de llegar a un país y avisarte cuando salga algo que te sirva. ¿En qué te ayudo?
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingLeft: 40 }}>
              {SUGERENCIAS.map((s) => (
                <button key={s} onClick={() => send(s)} style={{ padding: "8px 12px", borderRadius: 9999, border: "1.5px solid " + C.border, background: C.card, color: C.text, cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 13 }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {pana.messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
              {!isUser && avatar}
              <div style={{ maxWidth: "78%", padding: "10px 14px", borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: isUser ? "#ffcc00" : C.card, color: isUser ? "#1a1a1a" : C.text, fontFamily: "'Inter',sans-serif", fontSize: 14, lineHeight: 1.5, border: isUser ? "none" : "1px solid " + C.border, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {m.content}
              </div>
            </div>
          );
        })}

        {/* Acciones preparadas por Pana: el usuario decide */}
        {pana.pending.map((a) => (
          <div key={a.id} style={{ margin: "0 0 12px 40px", padding: 14, borderRadius: 16, background: C.card, border: "2px solid #ffcc00" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, fontFamily: "'Inter',sans-serif", marginBottom: 4 }}>PANA PREPARÓ ESTO</div>
            <div style={{ fontSize: 14, color: C.text, fontFamily: "'Inter',sans-serif", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
              {a.payload?.contenido ?? a.resumen}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => resolve(a, false)} style={{ flex: 1, padding: "10px", borderRadius: 9999, border: "1.5px solid " + C.border, background: "transparent", color: C.text, cursor: "pointer", fontWeight: 600, fontFamily: "'Inter',sans-serif" }}>Cancelar</button>
              <button onClick={() => resolve(a, true)} style={{ flex: 1, padding: "10px", borderRadius: 9999, border: "none", background: "#ffcc00", color: "#1a1a1a", cursor: "pointer", fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>{ACCION[a.type] ?? "Confirmar"}</button>
            </div>
          </div>
        ))}

        {done.map((d) => (
          <div key={d.id} style={{ margin: "0 0 12px 40px", fontSize: 12, color: C.muted, fontFamily: "'Inter',sans-serif" }}>{d.text}</div>
        ))}

        {pana.loading && (
          <div style={{ display: "flex", marginBottom: 12 }}>
            {avatar}
            <div style={{ padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: C.card, border: "1px solid " + C.border, color: C.muted, fontFamily: "'Inter',sans-serif", fontSize: 14 }}>Pensando…</div>
          </div>
        )}

        {pana.error && (
          <div style={{ margin: "4px 0 12px 40px", fontSize: 13, color: C.red, fontFamily: "'Inter',sans-serif" }}>{pana.error}</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Escribir */}
      <div style={{ padding: "12px 16px", background: C.card, borderTop: "1px solid " + C.border, display: "flex", gap: 10, alignItems: "flex-end", paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}>
        <button onClick={listen} aria-label="Hablar" style={{ width: 44, height: 44, borderRadius: 9999, background: listening ? "#ff4444" : "#333", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🎤</button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={listening ? "Escuchando…" : "Pregúntale algo a Pana…"}
          rows={1}
          style={{ flex: 1, padding: "10px 14px", background: C.bg, border: "1.5px solid " + (listening ? "#ff4444" : C.border), borderRadius: 20, color: C.text, fontFamily: "'Inter',sans-serif", fontSize: 14, outline: "none", resize: "none", maxHeight: 120, lineHeight: 1.5 }}
        />
        <button onClick={() => send()} disabled={pana.loading || !input.trim()} aria-label="Enviar" style={{ width: 44, height: 44, borderRadius: 9999, background: input.trim() ? "#ffcc00" : "#333", border: "none", cursor: input.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>↑</button>
      </div>

      {/* Historial de conversaciones */}
      {history && (
        <div onClick={() => setHistory(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxHeight: "70vh", overflowY: "auto", background: C.card, borderRadius: "20px 20px 0 0", padding: "16px 16px calc(16px + env(safe-area-inset-bottom))" }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 12 }}>Tus conversaciones con Pana</div>
            {pana.conversations.length === 0 && <div style={{ fontSize: 13, color: C.muted, fontFamily: "'Inter',sans-serif" }}>Todavía no hay conversaciones guardadas.</div>}
            {pana.conversations.map((c) => (
              <button key={c.id} onClick={() => { pana.openConversation(c.id); setDone([]); setHistory(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px", marginBottom: 6, borderRadius: 12, border: "1px solid " + C.border, background: C.bg, color: C.text, cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 14 }}>
                {c.title || "Conversación"}
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{new Date(c.updated_at).toLocaleString("es")}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Voz: primero ElevenLabs a través de la función segura "pana-voz";
// si no está disponible, la voz del navegador.
async function speak(supabase, text) {
  const plain = String(text ?? "").replace(/[*_#>`]/g, "").slice(0, 600);
  if (!plain) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("sin sesión");
    const res = await fetch("https://zkydbsymcnnbepvmbchr.supabase.co/functions/v1/pana-voz", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
      body: JSON.stringify({ text: plain }),
    });
    if (!res.ok) throw new Error("voz " + res.status);
    const url = URL.createObjectURL(await res.blob());
    window.__panaAudio?.pause();
    const audio = new Audio(url);
    window.__panaAudio = audio;
    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
  } catch {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(plain);
    u.lang = "es";
    window.speechSynthesis.speak(u);
  }
}
