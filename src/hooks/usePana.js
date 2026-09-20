// src/hooks/usePana.js
// Uso: const pana = usePana(supabase);  ← pasa el cliente que ya tienes en App.jsx
import { useState, useCallback } from "react";

async function invokePana(supabase, body, retry = true) {
  const { data, error } = await supabase.functions.invoke("pana", { body });
  if (error) {
    const status = error.context?.status;
    // JWT vencido → refrescar sesión y reintentar una vez
    if (status === 401 && retry) {
      await supabase.auth.refreshSession();
      return invokePana(supabase, body, false);
    }
    let msg = "No pude hablar con Pana";
    try { msg = (await error.context.json()).error ?? msg; } catch {}
    throw new Error(msg);
  }
  return data;
}

export function usePana(supabase) {
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState([]); // [{ id, type, payload, resumen }]
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const send = useCallback(async (text) => {
    if (!text?.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    setError(null);
    try {
      const data = await invokePana(supabase, {
        action: "chat",
        message: text,
        conversation_id: conversationId,
      });
      setConversationId(data.conversation_id);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      if (data.pending_actions?.length) {
        setPending((p) => [...p, ...data.pending_actions]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, conversationId, loading]);

  const resolve = useCallback(async (id, ok) => {
    try {
      const data = await invokePana(supabase, { action: ok ? "confirm" : "cancel", pending_id: id });
      setPending((p) => p.filter((a) => a.id !== id));
      return data;
    } catch (e) {
      setError(e.message);
    }
  }, [supabase]);

  const loadConversations = useCallback(async () => {
    const data = await invokePana(supabase, { action: "conversations" });
    setConversations(data.conversations ?? []);
  }, [supabase]);

  const openConversation = useCallback(async (id) => {
    const data = await invokePana(supabase, { action: "messages", conversation_id: id });
    setConversationId(id);
    setMessages(data.messages ?? []);
    setPending([]);
  }, [supabase]);

  const newConversation = () => {
    setConversationId(null);
    setMessages([]);
    setPending([]);
  };

  return {
    messages, pending, loading, error, conversationId, conversations,
    send,
    confirm: (id) => resolve(id, true),
    cancel: (id) => resolve(id, false),
    loadConversations, openConversation, newConversation,
  };
}
