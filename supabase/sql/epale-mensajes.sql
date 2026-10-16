-- =====================================================================
-- ÉPALE — Chat privado entre usuarios
-- Pégalo en Supabase → SQL Editor → pestaña nueva → Run. Se puede correr más de una vez.
--
--   · Cada quien solo ve los mensajes donde es remitente o destinatario.
--   · Al recibir un mensaje llega una notificación (máx. 1 cada 10 min por conversación).
--   · Anti-spam: máximo 20 mensajes por minuto y 15 personas nuevas por día.
--   · Bloquear: si alguien te bloquea, ya no le puedes escribir.
-- =====================================================================

create table if not exists public.mensajes (
  id          bigserial primary key,
  de          uuid not null references auth.users(id) on delete cascade,
  para        uuid not null references auth.users(id) on delete cascade,
  texto       text not null check (char_length(btrim(texto)) between 1 and 2000),
  created_at  timestamptz not null default now(),
  leido_at    timestamptz,
  check (de <> para)
);
create index if not exists mensajes_par_idx  on public.mensajes (least(de, para), greatest(de, para), created_at desc);
create index if not exists mensajes_para_idx on public.mensajes (para, leido_at);

create table if not exists public.bloqueos (
  quien      uuid not null references auth.users(id) on delete cascade,
  bloqueado  uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (quien, bloqueado),
  check (quien <> bloqueado)
);

alter table public.mensajes enable row level security;
alter table public.bloqueos enable row level security;

drop policy if exists mensajes_ver on public.mensajes;
create policy mensajes_ver on public.mensajes
  for select to authenticated using (auth.uid() in (de, para));

drop policy if exists mensajes_enviar on public.mensajes;
create policy mensajes_enviar on public.mensajes
  for insert to authenticated with check (de = auth.uid());

drop policy if exists bloqueos_mios on public.bloqueos;
create policy bloqueos_mios on public.bloqueos
  for all to authenticated using (quien = auth.uid()) with check (quien = auth.uid());

grant select, insert on public.mensajes to authenticated;
grant usage on sequence public.mensajes_id_seq to authenticated;
grant select, insert, delete on public.bloqueos to authenticated;
-- leido_at solo se cambia con marcar_leidos(); nadie edita ni borra mensajes desde la app.


-- Reglas al enviar: bloqueos y anti-spam
create or replace function public.mensajes_antes_de_enviar()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  n int;
begin
  new.texto := btrim(new.texto);
  new.leido_at := null;
  new.created_at := now();

  if exists (select 1 from public.bloqueos b
             where (b.quien = new.para and b.bloqueado = new.de)
                or (b.quien = new.de and b.bloqueado = new.para)) then
    raise exception 'No puedes escribirle a esta persona';
  end if;

  n := (select count(*) from public.mensajes m
        where m.de = new.de and m.created_at > now() - interval '1 minute');
  if n >= 20 then raise exception 'Vas muy rápido. Espera un momento.'; end if;

  -- Conversaciones nuevas (gente a la que nunca le habías escrito): máximo 15 por día
  if not exists (select 1 from public.mensajes m
                 where (m.de = new.de and m.para = new.para) or (m.de = new.para and m.para = new.de)) then
    n := (select count(distinct m.para) from public.mensajes m
          where m.de = new.de and m.created_at > now() - interval '1 day'
            and not exists (select 1 from public.mensajes x
                            where x.de = m.para and x.para = new.de and x.created_at < m.created_at));
    if n >= 15 then raise exception 'Llegaste al límite de conversaciones nuevas por hoy.'; end if;
  end if;

  return new;
end $$;

drop trigger if exists mensajes_antes on public.mensajes;
create trigger mensajes_antes before insert on public.mensajes
  for each row execute function public.mensajes_antes_de_enviar();


-- Notificación al que recibe (sin mostrar el texto del mensaje)
create or replace function public.mensajes_notificar()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_nombre text;
begin
  if exists (select 1 from public.mensajes m
             where m.de = new.de and m.para = new.para and m.id <> new.id
               and m.created_at > now() - interval '10 minutes') then
    return null;  -- ya se avisó hace poco por esta conversación
  end if;
  v_nombre := coalesce((select nullif(btrim(p.name), '') from public.profiles p where p.id = new.de), 'Alguien');
  begin
    insert into public.notifications (user_id, from_name, type, post_id)
    values (new.para, v_nombre, 'mensaje', new.de::text);
  exception when others then null;
  end;
  return null;
end $$;

drop trigger if exists mensajes_aviso on public.mensajes;
create trigger mensajes_aviso after insert on public.mensajes
  for each row execute function public.mensajes_notificar();


-- Mis conversaciones: la otra persona, el último mensaje y cuántos sin leer
create or replace function public.mis_chats()
returns table (otro uuid, nombre text, usuario text, foto text,
               ultimo text, ultimo_de_mi boolean, fecha timestamptz, sin_leer int)
language sql stable security definer
set search_path = public as $$
  with mios as (
    select m.*, case when m.de = auth.uid() then m.para else m.de end as otro
    from public.mensajes m
    where auth.uid() in (m.de, m.para)
  ), ult as (
    select distinct on (otro) otro, texto, de = auth.uid() as de_mi, created_at
    from mios order by otro, created_at desc
  )
  select u.otro, p.name, p.username, p.photo_url,
         u.texto, u.de_mi, u.created_at,
         (select count(*)::int from mios x where x.otro = u.otro and x.para = auth.uid() and x.leido_at is null)
  from ult u
  left join public.profiles p on p.id = u.otro
  order by u.created_at desc
  limit 100;
$$;

create or replace function public.marcar_leidos(p_otro uuid)
returns int language plpgsql security definer
set search_path = public as $$
declare
  n int;
begin
  update public.mensajes set leido_at = now()
   where para = auth.uid() and de = p_otro and leido_at is null;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.mensajes_sin_leer()
returns int language sql stable security definer
set search_path = public as $$
  select count(*)::int from public.mensajes where para = auth.uid() and leido_at is null;
$$;

-- Perfil público por @usuario (para abrir un chat o un perfil desde un handle)
create or replace function public.perfil_por_usuario(p_usuario text)
returns table (id uuid, name text, username text, city text, photo_url text, bio text)
language sql stable security definer
set search_path = public as $$
  select p.id, p.name, p.username, p.city, p.photo_url, p.bio
  from public.profiles p
  where lower(p.username) = lower(btrim(replace(p_usuario, '@', '')))
  limit 1;
$$;

revoke execute on function public.mis_chats() from anon;
revoke execute on function public.marcar_leidos(uuid) from anon;
revoke execute on function public.mensajes_sin_leer() from anon;
grant execute on function public.mis_chats() to authenticated;
grant execute on function public.marcar_leidos(uuid) to authenticated;
grant execute on function public.mensajes_sin_leer() to authenticated;
grant execute on function public.perfil_por_usuario(text) to anon, authenticated;


-- Mensajes en tiempo real
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mensajes') then
    execute 'alter publication supabase_realtime add table public.mensajes';
  end if;
end $$;


-- @usuario único (sin importar mayúsculas). Si hay repetidos, este índice no se crea y te avisa.
do $$
begin
  if not exists (select 1 from public.profiles where username is not null
                 group by lower(username) having count(*) > 1) then
    execute 'create unique index if not exists profiles_username_unico on public.profiles (lower(username))';
  else
    raise notice 'Hay @usuarios repetidos; corrígelos y vuelve a correr este archivo para activar el índice único.';
  end if;
end $$;
