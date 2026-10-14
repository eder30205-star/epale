-- =====================================================================
-- ÉPALE — Rescatar usuarios que se registraron por correo y quedaron sin perfil
-- (su nombre y país quedaron guardados en la cuenta, pero el perfil nunca se creó)
-- Pégalo en Supabase → SQL Editor → Run. Se puede correr más de una vez.
-- =====================================================================

-- 1. Crea o completa el perfil con lo que la persona escribió al registrarse
do $$
declare
  r        record;
  v_user   text;
  v_final  text;
  n        int;
begin
  for r in
    select u.id,
           nullif(btrim(u.raw_user_meta_data ->> 'name'), '')     as nombre,
           nullif(btrim(u.raw_user_meta_data ->> 'city'), '')     as pais,
           nullif(btrim(u.raw_user_meta_data ->> 'username'), '') as usuario
    from auth.users u
    left join public.profiles p on p.id = u.id
    where (p.id is null or coalesce(btrim(p.name), '') = '' or coalesce(btrim(p.city), '') = '')
      and nullif(btrim(u.raw_user_meta_data ->> 'name'), '') is not null
      and nullif(btrim(u.raw_user_meta_data ->> 'city'), '') is not null
  loop
    -- usuario libre: el que eligió, y si ya existe, con un número al final
    v_user := lower(regexp_replace(coalesce(r.usuario, r.nombre), '[^a-zA-Z0-9_]', '', 'g'));
    if v_user = '' then v_user := 'pana'; end if;
    v_final := v_user;
    n := 0;
    while exists (select 1 from public.profiles x where lower(x.username) = v_final and x.id <> r.id) loop
      n := n + 1;
      v_final := v_user || n::text;
    end loop;

    insert into public.profiles (id, name, city, username)
    values (r.id, r.nombre, r.pais, v_final)
    on conflict (id) do update
      set name     = coalesce(nullif(btrim(public.profiles.name), ''), excluded.name),
          city     = coalesce(nullif(btrim(public.profiles.city), ''), excluded.city),
          username = coalesce(nullif(btrim(public.profiles.username), ''), excluded.username);
  end loop;
end $$;

-- 2. Resultado: quién quedó con perfil y quién sigue sin datos
select u.email,
       p.name as nombre, p.city as pais, p.username as usuario,
       case when p.name is null or p.city is null then 'le pediremos los datos al entrar' else 'listo' end as estado
from auth.users u
left join public.profiles p on p.id = u.id
where u.created_at > now() - interval '30 days'
order by u.created_at desc;
