-- 064 - Cortar la lectura anonima de analitica y telemetria
--
-- Auditoria de seguridad: capture_link_lead_facts, capture_link_performance y
-- user_telemetry eran legibles con la anon key, que viaja publica en el
-- bundle de la extension. Verificado por HTTP contra produccion antes de
-- este fix: 41 filas de 3 owners distintos en capture_link_lead_facts (con
-- income_range, region e isapre) y 34 filas de user_telemetry con user_id de
-- todos los usuarios.
--
-- Causa en las vistas: se crearon sin security_invoker, asi que corren con
-- los permisos de quien las creo y no aplican RLS de las tablas base. El
-- unico consumidor real es get_my_capture_link_stats/list_my_capture_links,
-- que son SECURITY DEFINER y las consultan desde dentro: no necesitan que la
-- vista tenga grants propios para funcionar, esos permisos se resuelven
-- dentro de la funcion. Revocar el SELECT directo sobre las vistas no rompe
-- nada del lado del cliente.
--
-- Causa en user_telemetry: convivian dos policies SELECT. La legitima
-- ("Admins and helpers can view telemetry") ya cubre el caso de negocio; la
-- otra ("Admins can view all telemetry", USING (true)) es un duplicado sin
-- ninguna condicion, aplicado a "public" (que en Postgres incluye a anon), y
-- no existe en ninguna migracion local: es drift introducido directo en el
-- proyecto remoto.

-- ---------------------------------------------------------------------------
-- Vistas de analitica de capture links
-- ---------------------------------------------------------------------------
revoke all on public.capture_link_lead_facts from anon, authenticated;
revoke all on public.capture_link_performance from anon, authenticated;

-- Ademas de revocar el grant, se marcan como security_invoker: si en el
-- futuro alguien las vuelve a exponer sin pensarlo, la vista aplicara la RLS
-- de capture_links y leads en vez de heredar los permisos amplios de quien
-- las creo. Es la misma proteccion en dos capas.
alter view public.capture_link_lead_facts set (security_invoker = on);
alter view public.capture_link_performance set (security_invoker = on);

-- ---------------------------------------------------------------------------
-- Telemetria
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can view all telemetry" on public.user_telemetry;

revoke select on public.user_telemetry from anon;
