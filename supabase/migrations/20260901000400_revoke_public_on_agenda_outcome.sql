-- Query permanente
-- Dominio: seguridad / superficie RPC expuesta a anon
-- Objeto: list_my_appointments(date, date), record_my_appointment_outcome(uuid, boolean, text)
-- Clase: permisos
-- Impacto: ninguno para la app; cierra la invocacion desde la clave anonima
-- Persistencia: permanente
--
-- POR QUE
--
-- La 141 revoco `anon` sobre estas dos y no basto: verificado contra
-- produccion, seguian respondiendo a la clave anonima. El permiso no le venia
-- por un grant directo sino por herencia de `PUBLIC`, que es a quien Postgres
-- concede EXECUTE al crear una funcion. Revocar de `anon` no quita lo que se
-- tiene via `PUBLIC`.
--
-- La 139, que las creo, hizo el `grant ... to authenticated` pero no el
-- `revoke ... from public` que si arrastraba el snapshot desde la 104. Esa es
-- la diferencia entre las tres, y por eso solo el snapshot quedo cerrado con
-- la 141.
--
-- Las dos tienen guarda propia y responden `authentication required` sin
-- sesion, asi que esto no cierra ninguna fuga: sostiene la decision de las
-- migraciones 067 y 068 de que `anon` no pueda ni invocarlas.
--
-- REVERSION
--
--   grant execute on function public.list_my_appointments(date, date) to public;
--   grant execute on function public.record_my_appointment_outcome(uuid, boolean, text) to public;

revoke all on function public.list_my_appointments(date, date) from public;
revoke all on function public.record_my_appointment_outcome(uuid, boolean, text) from public;

grant execute on function public.list_my_appointments(date, date) to authenticated;
grant execute on function public.record_my_appointment_outcome(uuid, boolean, text) to authenticated;
