-- Query permanente
-- Dominio: seguridad / superficie RPC expuesta a anon
-- Objeto: get_my_dashboard_snapshot(text, text), list_my_appointments(date, date),
--         record_my_appointment_outcome(uuid, boolean, text)
-- Clase: permisos
-- Impacto: ninguno para la app; cierra la invocacion desde la clave anonima
-- Persistencia: permanente
--
-- POR QUE
--
-- La 140 cambio la firma de `get_my_dashboard_snapshot` de `(text)` a
-- `(text, text)`. Una firma nueva es un OBJETO nuevo: no hereda los permisos
-- de la anterior, y el `revoke ... from anon` que la 067 le habia puesto se
-- quedo apuntando a la firma vieja, que la 140 elimino.
--
-- Verificado contra produccion despues de aplicar la 140: una llamada con la
-- clave anonima devolvia 200 y el snapshot entero en ceros. No hay fuga de
-- datos -la funcion filtra por `auth.uid()`, que sin sesion es null, asi que
-- no devuelve nada de nadie-, pero el proyecto decidio en las migraciones 067
-- y 068 que `anon` no pueda ni invocar estas funciones, y esa decision hay que
-- sostenerla: una superficie que no se usa no deberia estar abierta.
--
-- Se incluyen tambien las dos de la 139 por el mismo motivo: son firmas
-- nuevas. Las dos tienen guarda propia y responden `authentication required`,
-- asi que esto es defensa en profundidad, no un agujero.
--
-- REVERSION
--
--   grant execute on function public.get_my_dashboard_snapshot(text, text) to anon;
--   grant execute on function public.list_my_appointments(date, date) to anon;
--   grant execute on function public.record_my_appointment_outcome(uuid, boolean, text) to anon;

revoke execute on function public.get_my_dashboard_snapshot(text, text) from anon;
revoke execute on function public.list_my_appointments(date, date) from anon;
revoke execute on function public.record_my_appointment_outcome(uuid, boolean, text) from anon;

-- `authenticated` es quien las usa desde la extension; se reafirma para que
-- este archivo describa el estado final completo y no solo la resta.
grant execute on function public.get_my_dashboard_snapshot(text, text) to authenticated;
grant execute on function public.list_my_appointments(date, date) to authenticated;
grant execute on function public.record_my_appointment_outcome(uuid, boolean, text) to authenticated;
