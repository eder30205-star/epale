-- =====================================================================
-- ÉPALE — Pana v3: alertas de avisos y guía por país
-- Pégalo en Supabase → SQL Editor → pestaña nueva → Run.
-- Se puede correr más de una vez. (No toca posts ni perfiles existentes.)
-- =====================================================================


-- =====================================================================
-- 1. Alertas: "avísame cuando salga un cuarto en Chile"
-- =====================================================================
create table if not exists public.pana_alerts (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text check (type in ('post', 'job', 'housing', 'service', 'help', 'evento')),
  city        text,                       -- id de país de Épale (santiago, lima, bogota…)
  keywords    text[] not null default '{}',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  check (type is not null or cardinality(keywords) > 0)
);
create index if not exists pana_alerts_match_idx on public.pana_alerts (active, type, city);

alter table public.pana_alerts enable row level security;
drop policy if exists pana_alerts_owner on public.pana_alerts;
create policy pana_alerts_owner on public.pana_alerts
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.pana_alerts to authenticated;
grant usage on sequence public.pana_alerts_id_seq to authenticated;

-- Cuando alguien publica, avisa a quien tenga una alerta que coincida.
-- Máximo 1 aviso por alerta cada 30 minutos para no llenar de notificaciones.
alter table public.pana_alerts add column if not exists last_sent_at timestamptz;

create or replace function public.pana_alerts_on_post()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_label text;
begin
  v_label := case new.type
    when 'job' then 'trabajo' when 'housing' then 'vivienda' when 'service' then 'servicio'
    when 'help' then 'ayuda' when 'evento' then 'evento' else 'publicación' end;

  with hits as (
    select a.id, a.user_id
    from public.pana_alerts a
    where a.active
      and a.user_id <> new.user_id
      and (a.type is null or a.type = new.type)
      and (a.city is null or a.city = new.city)
      and (cardinality(a.keywords) = 0 or exists (
            select 1 from unnest(a.keywords) k where new.content ilike '%' || k || '%'))
      and (a.last_sent_at is null or a.last_sent_at < now() - interval '30 minutes')
    limit 200
  ), sent as (
    update public.pana_alerts a set last_sent_at = now()
    from hits where a.id = hits.id
    returning a.user_id
  )
  insert into public.notifications (user_id, from_name, type, post_id)
  select distinct s.user_id,
         'Pana: salió un aviso de ' || v_label || ' que te puede servir 🔔',
         'pana_alerta', new.id::text
  from sent s;

  return null;
exception when others then
  return null;   -- una alerta nunca debe impedir publicar
end $$;

drop trigger if exists posts_pana_alerts on public.posts;
create trigger posts_pana_alerts
  after insert on public.posts
  for each row execute function public.pana_alerts_on_post();


-- =====================================================================
-- 2. Guía por país (la llenas tú; Pana solo usa lo que está aquí)
-- =====================================================================
create table if not exists public.pana_knowledge (
  id           bigserial primary key,
  city         text not null,      -- id de país de Épale: santiago, lima, bogota, buenos, quito, madrid, miami…
  tema         text not null,      -- tramites, salud, banco, trabajo, vivienda, transporte, educacion, emergencias
  titulo       text not null,
  contenido    text not null,
  fuente_url   text,
  actualizado  date not null default current_date,
  unique (city, tema, titulo)
);
alter table public.pana_knowledge enable row level security;
drop policy if exists pana_knowledge_read on public.pana_knowledge;
create policy pana_knowledge_read on public.pana_knowledge
  for select to authenticated using (true);
grant select on public.pana_knowledge to authenticated;
-- Sin políticas de escritura: se edita desde el dashboard (Table Editor) o el SQL Editor.

-- Punto de partida: solo las webs oficiales de cada país. Revisa y amplía antes de lanzar.
insert into public.pana_knowledge (city, tema, titulo, contenido, fuente_url) values
  ('santiago', 'tramites', 'Migración en Chile',
   'Los trámites de residencia y visas se hacen con el Servicio Nacional de Migraciones. Revisa siempre los requisitos vigentes en su web oficial.',
   'https://serviciomigraciones.cl'),
  ('santiago', 'tramites', 'Registro Civil (RUN y cédula)',
   'La cédula de identidad para extranjeros y el RUN se gestionan en el Registro Civil, con la residencia ya otorgada.',
   'https://www.registrocivil.cl'),
  ('santiago', 'salud', 'Salud pública en Chile',
   'FONASA es el seguro público de salud. Consulta en su web cómo afiliarte y qué necesitas.',
   'https://www.fonasa.cl'),
  ('lima', 'tramites', 'Migración en Perú',
   'Los trámites migratorios se hacen con la Superintendencia Nacional de Migraciones. Revisa requisitos y citas en su web oficial.',
   'https://www.gob.pe/migraciones'),
  ('bogota', 'tramites', 'Migración en Colombia',
   'Los trámites migratorios se hacen con Migración Colombia. Revisa los requisitos vigentes en su web oficial.',
   'https://www.migracioncolombia.gov.co'),
  ('buenos', 'tramites', 'Migración en Argentina',
   'Los trámites de residencia se hacen con la Dirección Nacional de Migraciones.',
   'https://www.argentina.gob.ar/interior/migraciones'),
  ('quito', 'tramites', 'Migración en Ecuador',
   'Las visas y la residencia se gestionan con el Ministerio de Relaciones Exteriores y Movilidad Humana.',
   'https://www.cancilleria.gob.ec'),
  ('madrid', 'tramites', 'Extranjería en España',
   'La información oficial sobre residencia y trámites de extranjería está en el portal de Inclusión, Seguridad Social y Migraciones.',
   'https://www.inclusion.gob.es'),
  ('miami', 'tramites', 'Inmigración en Estados Unidos',
   'Los trámites migratorios se hacen con USCIS. Desconfía de quien cobre por "acelerar" trámites.',
   'https://www.uscis.gov/es')
on conflict (city, tema, titulo) do nothing;
