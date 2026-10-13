-- =====================================================================
-- ÉPALE — Pana publica solo (cuenta "Pana IA")
-- Pégalo en Supabase → SQL Editor → pestaña nueva → Run.
-- Se puede correr más de una vez. Empieza en modo BORRADOR: nada sale
-- al feed hasta que tú lo apruebes.
-- =====================================================================


-- 1. Configuración del bot (una sola fila)
create table if not exists public.pana_bot (
  id           int primary key default 1 check (id = 1),
  modo         text not null default 'borrador' check (modo in ('borrador', 'auto', 'pausa')),
  bot_user_id  uuid references auth.users(id) on delete set null,
  bot_name     text not null default 'Pana IA',
  updated_at   timestamptz not null default now()
);
insert into public.pana_bot (id) values (1) on conflict (id) do nothing;

alter table public.pana_bot enable row level security;
drop policy if exists pana_bot_read on public.pana_bot;
create policy pana_bot_read on public.pana_bot for select to authenticated using (true);
grant select on public.pana_bot to authenticated;


-- 2. Administradores de Épale (pueden aprobar lo que publica Pana)
create table if not exists public.pana_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
insert into public.pana_admins (user_id)
  select id from auth.users where lower(email) in ('eder30205@gmail.com', 'raul@epaleapp.online')
on conflict (user_id) do nothing;

alter table public.pana_admins enable row level security;
drop policy if exists pana_admins_self on public.pana_admins;
create policy pana_admins_self on public.pana_admins for select to authenticated using (user_id = auth.uid());
grant select on public.pana_admins to authenticated;

create or replace function public.pana_es_admin()
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from public.pana_admins where user_id = auth.uid());
$$;
revoke execute on function public.pana_es_admin() from anon;
grant execute on function public.pana_es_admin() to authenticated;


-- 3. Posts que prepara Pana (borradores y publicados)
create table if not exists public.pana_autoposts (
  id          bigserial primary key,
  kind        text not null check (kind in ('dolar', 'resumen', 'bienvenida', 'estafa', 'tip')),
  city        text not null,
  period      text not null,                 -- día o semana: evita repetir el mismo post
  type        text not null default 'post',
  content     text not null check (char_length(content) between 1 and 2000),
  meta        jsonb not null default '{}'::jsonb,
  status      text not null default 'borrador'
              check (status in ('borrador', 'aprobado', 'publicado', 'descartado', 'fallido')),
  post_id     text,
  error       text,
  created_at  timestamptz not null default now(),
  decided_at  timestamptz,
  unique (kind, city, period)
);
create index if not exists pana_autoposts_status_idx on public.pana_autoposts (status, created_at desc);

alter table public.pana_autoposts enable row level security;
drop policy if exists pana_autoposts_admin_read on public.pana_autoposts;
create policy pana_autoposts_admin_read on public.pana_autoposts
  for select to authenticated using (public.pana_es_admin());
grant select on public.pana_autoposts to authenticated;


-- 4. Al pasar a 'aprobado' (desde Pana, el Table Editor o el modo auto) se publica en el feed
create or replace function public.pana_autoposts_publicar()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_bot   uuid;
  v_name  text;
begin
  if new.status <> 'aprobado' then return new; end if;
  if tg_op = 'UPDATE' and old.status in ('aprobado', 'publicado') then return new; end if;

  v_bot  := (select bot_user_id from public.pana_bot where id = 1);
  v_name := (select bot_name from public.pana_bot where id = 1);
  if v_bot is null then
    new.status := 'fallido';
    new.error := 'Todavía no existe la cuenta de Pana';
    return new;
  end if;

  begin
    insert into public.posts (user_id, name, city, type, content)
    values (v_bot, v_name, new.city, new.type, new.content);
    new.post_id := (select p.id::text from public.posts p
                    where p.user_id = v_bot order by p.created_at desc limit 1);
    new.status := 'publicado';
    new.decided_at := now();
  exception when others then
    new.status := 'fallido';
    new.error := sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists pana_autoposts_publicar on public.pana_autoposts;
create trigger pana_autoposts_publicar
  before insert or update of status on public.pana_autoposts
  for each row execute function public.pana_autoposts_publicar();


-- 5. Nadie más puede llamarse "Pana IA" (ni en posts ni en perfiles)
create or replace function public.pana_nombre_reservado()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_bot   uuid;
  v_owner text;
begin
  if lower(btrim(coalesce(new.name, ''))) not like 'pana ia%' then return new; end if;
  if coalesce(auth.role(), '') = 'service_role' then return new; end if;
  v_bot := (select bot_user_id from public.pana_bot where id = 1);
  v_owner := coalesce(to_jsonb(new) ->> 'user_id', to_jsonb(new) ->> 'id');
  if v_bot is not null and v_owner = v_bot::text then return new; end if;
  raise exception 'El nombre "Pana IA" está reservado para el asistente de Épale';
end $$;

drop trigger if exists posts_pana_nombre on public.posts;
create trigger posts_pana_nombre
  before insert or update of name on public.posts
  for each row execute function public.pana_nombre_reservado();

drop trigger if exists profiles_pana_nombre on public.profiles;
create trigger profiles_pana_nombre
  before insert or update of name on public.profiles
  for each row execute function public.pana_nombre_reservado();


-- 6. Acciones del admin (las usa Pana en el chat)
create or replace function public.pana_autopost_decidir(p_id bigint, p_aprobar boolean)
returns text language plpgsql security definer
set search_path = public as $$
begin
  if not public.pana_es_admin() then raise exception 'Solo administradores'; end if;
  update public.pana_autoposts
     set status = case when p_aprobar then 'aprobado' else 'descartado' end,
         decided_at = now()
   where id = p_id and status = 'borrador';
  return coalesce((select status from public.pana_autoposts where id = p_id), 'no existe');
end $$;

create or replace function public.pana_bot_modo(p_modo text)
returns text language plpgsql security definer
set search_path = public as $$
begin
  if not public.pana_es_admin() then raise exception 'Solo administradores'; end if;
  if p_modo not in ('borrador', 'auto', 'pausa') then raise exception 'Modo no válido'; end if;
  update public.pana_bot set modo = p_modo, updated_at = now() where id = 1;
  return p_modo;
end $$;

revoke execute on function public.pana_autopost_decidir(bigint, boolean) from anon;
revoke execute on function public.pana_bot_modo(text) from anon;
grant execute on function public.pana_autopost_decidir(bigint, boolean) to authenticated;
grant execute on function public.pana_bot_modo(text) to authenticated;


-- 7. Pana puede preparar acciones nuevas (aprobar borradores, cambiar modo)
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.pana_pending_actions'::regclass
      and contype = 'c' and pg_get_constraintdef(oid) ilike '%type%'
  loop
    execute format('alter table public.pana_pending_actions drop constraint %I', c.conname);
  end loop;
end $$;


-- 8. Las alertas de "avísame cuando salga…" ignoran los posts de Pana
create or replace function public.pana_alerts_on_post()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_label text;
begin
  if lower(coalesce(new.name, '')) like 'pana ia%' then return null; end if;

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
  return null;
end $$;


-- 9. Horarios (hora de Venezuela)
--    Todos los días 9:00 → dólar + revisión de estafas
--    Lunes 10:00       → resumen de la semana + bienvenida por país
--    Jueves 11:00      → tip de la semana por país
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule('pana-diario', '0 13 * * *', $$
  select net.http_post(
    url := 'https://zkydbsymcnnbepvmbchr.supabase.co/functions/v1/pana-autopost',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreWRic3ltY25uYmVwdm1iY2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjExNjksImV4cCI6MjA5NTgzNzE2OX0.bIiUt752AROIfQkQTHqN7r9OrjRTzxmwNQLDw0WVVS4"}'::jsonb,
    body := '{"job": "diario"}'::jsonb,
    timeout_milliseconds := 30000)
$$);

select cron.schedule('pana-semanal', '0 14 * * 1', $$
  select net.http_post(
    url := 'https://zkydbsymcnnbepvmbchr.supabase.co/functions/v1/pana-autopost',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreWRic3ltY25uYmVwdm1iY2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjExNjksImV4cCI6MjA5NTgzNzE2OX0.bIiUt752AROIfQkQTHqN7r9OrjRTzxmwNQLDw0WVVS4"}'::jsonb,
    body := '{"job": "semanal"}'::jsonb,
    timeout_milliseconds := 30000)
$$);

select cron.schedule('pana-tip', '0 15 * * 4', $$
  select net.http_post(
    url := 'https://zkydbsymcnnbepvmbchr.supabase.co/functions/v1/pana-autopost',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreWRic3ltY25uYmVwdm1iY2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjExNjksImV4cCI6MjA5NTgzNzE2OX0.bIiUt752AROIfQkQTHqN7r9OrjRTzxmwNQLDw0WVVS4"}'::jsonb,
    body := '{"job": "tip"}'::jsonb,
    timeout_milliseconds := 30000)
$$);

-- Para ver los horarios:   select jobname, schedule, active from cron.job;
-- Para ver los borradores: select id, kind, city, status, content from public.pana_autoposts order by id desc;
