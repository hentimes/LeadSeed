-- Query permanente
-- Dominio: seguridad / superficie RPC expuesta a anon
-- Objeto: reschedule_my_appointment(uuid, timestamptz), cancel_my_appointment(uuid, text)
-- Clase: permisos
-- Impacto: ninguno para la app; restaura el candado que borro el DROP de la 143
-- Persistencia: permanente
--
-- POR QUE
--
-- La 143 tuvo que hacer DROP y CREATE para cambiar el tipo de retorno, y un
-- DROP se lleva por delante los permisos del objeto: los `revoke` que las
-- migraciones 067 y 068 le habian puesto a estas dos desaparecieron con la
-- funcion vieja.
--
-- Comprobado contra produccion antes y despues: antes de la 143 una llamada
-- anonima devolvia `42501 permission denied`; despues pasaba a ejecutarse y a
-- responder la guarda interna. La guarda protege los datos igual, pero el
-- estado correcto es el de antes.
--
-- Se revoca de `public` Y de `anon`. Las dos cosas: la 141 fallo por revocar
-- solo de `anon` cuando el permiso venia por `public`, y aqui no se quiere
-- depender de por cual de los dos caminos llega.
--
-- REVERSION
--
--   grant execute on function public.reschedule_my_appointment(uuid, timestamptz) to public;
--   grant execute on function public.cancel_my_appointment(uuid, text) to public;

revoke all on function public.reschedule_my_appointment(uuid, timestamptz) from public;
revoke all on function public.cancel_my_appointment(uuid, text) from public;

revoke all on function public.reschedule_my_appointment(uuid, timestamptz) from anon;
revoke all on function public.cancel_my_appointment(uuid, text) from anon;

grant execute on function public.reschedule_my_appointment(uuid, timestamptz) to authenticated;
grant execute on function public.cancel_my_appointment(uuid, text) to authenticated;
