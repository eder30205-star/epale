-- =====================================================================
-- ÉPALE — Pana IA publica 5 veces al día
-- Pégalo en Supabase → SQL Editor → pestaña nueva → Run. Se puede correr más de una vez.
--
-- Horario (hora de Venezuela → hora de China):
--   09:00 → 21:00  💵 Dólar del día (+ alertas de estafa si hay)        [ya existía: pana-diario]
--   11:00 → 23:00  ❓ Pregunta del día
--   14:00 → 02:00  📝 Consejo del día
--   17:00 → 05:00  🇻🇪 Cultura venezolana
--   20:00 → 08:00  🤝 Comunidad (cierre del día)
--   + Lunes: resumen y bienvenidas · Jueves: tip por país
-- =====================================================================

-- Tipos nuevos de post
alter table public.pana_autoposts drop constraint if exists pana_autoposts_kind_check;
alter table public.pana_autoposts add constraint pana_autoposts_kind_check
  check (kind in ('dolar', 'resumen', 'bienvenida', 'estafa', 'tip',
                  'pregunta', 'consejo', 'cultura', 'comunidad'));

-- 11:00 hora de Venezuela
select cron.schedule('pana-pregunta', '0 15 * * *', $$
  select net.http_post(
    url := 'https://zkydbsymcnnbepvmbchr.supabase.co/functions/v1/pana-autopost',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreWRic3ltY25uYmVwdm1iY2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjExNjksImV4cCI6MjA5NTgzNzE2OX0.bIiUt752AROIfQkQTHqN7r9OrjRTzxmwNQLDw0WVVS4"}'::jsonb,
    body := '{"job": "pregunta"}'::jsonb,
    timeout_milliseconds := 40000)
$$);

-- 14:00 hora de Venezuela
select cron.schedule('pana-consejo', '0 18 * * *', $$
  select net.http_post(
    url := 'https://zkydbsymcnnbepvmbchr.supabase.co/functions/v1/pana-autopost',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreWRic3ltY25uYmVwdm1iY2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjExNjksImV4cCI6MjA5NTgzNzE2OX0.bIiUt752AROIfQkQTHqN7r9OrjRTzxmwNQLDw0WVVS4"}'::jsonb,
    body := '{"job": "consejo"}'::jsonb,
    timeout_milliseconds := 40000)
$$);

-- 17:00 hora de Venezuela
select cron.schedule('pana-cultura', '0 21 * * *', $$
  select net.http_post(
    url := 'https://zkydbsymcnnbepvmbchr.supabase.co/functions/v1/pana-autopost',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreWRic3ltY25uYmVwdm1iY2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjExNjksImV4cCI6MjA5NTgzNzE2OX0.bIiUt752AROIfQkQTHqN7r9OrjRTzxmwNQLDw0WVVS4"}'::jsonb,
    body := '{"job": "cultura"}'::jsonb,
    timeout_milliseconds := 40000)
$$);

-- 20:00 hora de Venezuela
select cron.schedule('pana-comunidad', '0 0 * * *', $$
  select net.http_post(
    url := 'https://zkydbsymcnnbepvmbchr.supabase.co/functions/v1/pana-autopost',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreWRic3ltY25uYmVwdm1iY2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjExNjksImV4cCI6MjA5NTgzNzE2OX0.bIiUt752AROIfQkQTHqN7r9OrjRTzxmwNQLDw0WVVS4"}'::jsonb,
    body := '{"job": "comunidad"}'::jsonb,
    timeout_milliseconds := 40000)
$$);

-- Para ver todos los horarios:  select jobname, schedule, active from cron.job order by jobid;
-- Para frenar a Pana IA:        update public.pana_bot set modo = 'pausa' where id = 1;
