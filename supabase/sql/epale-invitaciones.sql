-- =====================================================================
-- ÉPALE — "Invita a un pana": invitaciones, contador e insignia Embajador
-- Pégalo en Supabase → SQL Editor → pestaña nueva → Run. Se puede correr más de una vez.
--
-- Cómo funciona:
--   · Cada usuario comparte su link: epaleapp.online/i/<su usuario>
--   · Quien entra con ese link y crea su cuenta queda registrado como invitado.
--   · Solo cuenta si la cuenta es nueva (menos de 7 días) y no es uno mismo.
--   · Con 3 invitados → insignia "🤝 Embajador" junto a su nombre en el feed.
-- =====================================================================

create table if not exists public.invitaciones (
  invitado_id   uuid primary key references auth.users(id) on delete cascade,
  invitador_id  uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  check (invitado_id <> invitador_id)
);
create index if not exists invitaciones_invitador_idx on public.invitaciones (invitador_id);

alter table public.invitaciones enable row level security;
drop policy if exists invitaciones_propias on public.invitaciones;
create policy invitaciones_propias on public.invitaciones
  for select to authenticated
  using (auth.uid() in (invitador_id, invitado_id));
grant select on public.invitaciones to authenticated;
-- Sin políticas de escritura: solo se registra con la función de abajo.


-- Registrar que llegué invitado por <p_code> (el usuario de quien me invitó)
create or replace function public.registrar_invitacion(p_code text)
returns text language plpgsql security definer
set search_path = public as $$
declare
  v_me      uuid := auth.uid();
  v_creado  timestamptz;
  v_inv     uuid;
  v_nombre  text;
begin
  if v_me is null then return 'sin sesión'; end if;
  if exists (select 1 from public.invitaciones where invitado_id = v_me) then return 'ya registrada'; end if;

  v_creado := (select u.created_at from auth.users u where u.id = v_me);
  if v_creado is null or v_creado < now() - interval '7 days' then return 'cuenta antigua'; end if;

  v_inv := (select p.id from public.profiles p
            where lower(p.username) = lower(btrim(p_code)) limit 1);
  if v_inv is null or v_inv = v_me then return 'código inválido'; end if;

  insert into public.invitaciones (invitado_id, invitador_id) values (v_me, v_inv)
  on conflict (invitado_id) do nothing;

  -- Aviso a quien invitó (si falla, la invitación igual queda registrada)
  begin
    v_nombre := (select coalesce(nullif(btrim(p.name), ''), 'Un pana') from public.profiles p where p.id = v_me);
    begin
      insert into public.notifications (user_id, from_name, type, post_id)
      values (v_inv, '🤝 ' || coalesce(v_nombre, 'Un pana') || ' se unió a Épale con tu invitación', 'pana_alerta', null);
    exception when others then
      insert into public.notifications (user_id, from_name, type, post_id)
      values (v_inv, '🤝 ' || coalesce(v_nombre, 'Un pana') || ' se unió a Épale con tu invitación', 'pana_alerta', '');
    end;
  exception when others then null;
  end;

  return 'ok';
end $$;
revoke execute on function public.registrar_invitacion(text) from anon;
grant execute on function public.registrar_invitacion(text) to authenticated;


-- Cuántos panas invité yo
create or replace function public.mis_invitaciones()
returns int language sql stable security definer
set search_path = public as $$
  select count(*)::int from public.invitaciones where invitador_id = auth.uid();
$$;
revoke execute on function public.mis_invitaciones() from anon;
grant execute on function public.mis_invitaciones() to authenticated;


-- Nombres con insignia de Embajador (3 o más invitados). Público: se muestra en el feed.
create or replace function public.embajadores()
returns table (name text, invitados int) language sql stable security definer
set search_path = public as $$
  select p.name, count(*)::int
  from public.invitaciones i
  join public.profiles p on p.id = i.invitador_id
  where coalesce(btrim(p.name), '') <> ''
  group by p.name
  having count(*) >= 3;
$$;
grant execute on function public.embajadores() to anon, authenticated;

-- Para ver el ranking:
-- select p.name, count(*) as invitados from public.invitaciones i
-- join public.profiles p on p.id = i.invitador_id group by p.name order by 2 desc;
