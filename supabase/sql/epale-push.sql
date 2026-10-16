-- =====================================================================
-- ÉPALE — Notificaciones push al celular
-- Pégalo en Supabase → SQL Editor → pestaña nueva → Run. Se puede correr más de una vez.
-- Requiere la función "epale-push" y los secrets VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY.
-- Cada vez que se crea una notificación en Épale, se envía también al celular.
-- =====================================================================

-- 1. Tabla de suscripciones (si ya existe, no se toca)
do $$
begin
  if to_regclass('public.push_subscriptions') is null then
    create table public.push_subscriptions (
      id            bigserial primary key,
      user_id       uuid not null references auth.users(id) on delete cascade,
      subscription  jsonb not null,
      created_at    timestamptz not null default now()
    );
    alter table public.push_subscriptions enable row level security;
  end if;
end $$;

alter table public.notifications add column if not exists push_enviado_at timestamptz;


-- 2. Guardar / borrar la suscripción del celular (la app llama guardar_push al aceptar notificaciones)
create or replace function public.guardar_push(p_sub jsonb)
returns void language plpgsql security definer
set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  if coalesce(p_sub ->> 'endpoint', '') = '' then raise exception 'Suscripción inválida'; end if;
  execute 'delete from public.push_subscriptions where subscription::jsonb ->> ''endpoint'' = $1'
    using p_sub ->> 'endpoint';
  execute format('insert into public.push_subscriptions (user_id, subscription) values (%L, %L)',
                 auth.uid(), p_sub::text);
end $$;
revoke execute on function public.guardar_push(jsonb) from anon;
grant execute on function public.guardar_push(jsonb) to authenticated;

create or replace function public.borrar_push(p_endpoint text)
returns void language plpgsql security definer
set search_path = public as $$
begin
  execute 'delete from public.push_subscriptions where subscription::jsonb ->> ''endpoint'' = $1'
    using p_endpoint;
end $$;
revoke execute on function public.borrar_push(text) from anon, authenticated;
-- (solo la usa la función epale-push, que entra con la clave de servicio)


-- 3. Cada notificación nueva → llamar a la función que envía el push
create extension if not exists pg_net with schema extensions;

create or replace function public.notificacion_a_push()
returns trigger language plpgsql security definer
set search_path = public, extensions as $$
begin
  if new.type = 'welcome' then return null; end if;
  begin
    perform net.http_post(
      url := 'https://zkydbsymcnnbepvmbchr.supabase.co/functions/v1/epale-push',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreWRic3ltY25uYmVwdm1iY2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjExNjksImV4cCI6MjA5NTgzNzE2OX0.bIiUt752AROIfQkQTHqN7r9OrjRTzxmwNQLDw0WVVS4"}'::jsonb,
      body := jsonb_build_object('id', new.id),
      timeout_milliseconds := 10000);
  exception when others then null;  -- el push nunca debe impedir crear la notificación
  end;
  return null;
end $$;

drop trigger if exists notificaciones_push on public.notifications;
create trigger notificaciones_push
  after insert on public.notifications
  for each row execute function public.notificacion_a_push();

-- Para ver cuánta gente tiene notificaciones activadas:
-- select count(distinct user_id) from public.push_subscriptions;
