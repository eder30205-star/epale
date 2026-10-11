-- =====================================================================
-- ÉPALE — Pana v4: memoria de conversaciones largas + 👍/👎
-- Pégalo en Supabase → SQL Editor → pestaña nueva → Run.
-- Se puede correr más de una vez.
-- =====================================================================

-- 1. Resumen de conversaciones largas (Pana lo escribe solo)
alter table public.pana_conversations add column if not exists summary text;

-- 2. Calificación de respuestas (datos para mejorar a Pana)
create table if not exists public.pana_feedback (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  message_id  text not null,
  rating      smallint not null check (rating in (-1, 1)),
  comment     text check (char_length(comment) <= 500),
  created_at  timestamptz not null default now(),
  unique (user_id, message_id)
);

alter table public.pana_feedback enable row level security;
drop policy if exists pana_feedback_owner on public.pana_feedback;
create policy pana_feedback_owner on public.pana_feedback
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.pana_feedback to authenticated;
grant usage on sequence public.pana_feedback_id_seq to authenticated;

-- Para revisar después (solo desde el dashboard):
-- select f.rating, f.comment, m.content, f.created_at
-- from public.pana_feedback f
-- left join public.pana_messages m on m.id::text = f.message_id
-- order by f.created_at desc;
