-- 116 - Recordar el filtro de "sin nombre"
--
-- El interruptor vivia en useState local, y en tres sitios distintos: la tabla
-- de leads, el pipeline y el panel de flujos. Consecuencia: se apagaba al
-- cambiar de seccion, dentro de la misma sesion, y desde luego no sobrevivia a
-- cerrar el panel.
--
-- Es una preferencia de trabajo, no un estado de pantalla: quien oculta los
-- leads sin nombre lo hace porque no quiere verlos, no porque no quiera verlos
-- en esa pestaña concreta durante los proximos diez minutos. Va a profiles con
-- el resto de preferencias -modo compacto, columnas visibles, metas diarias-,
-- que es donde ya se guardan las que sobreviven al dispositivo.
--
-- Por defecto false, y se mantiene: esconder filas sin que nadie lo haya pedido
-- es como se pierden contactos de vista.

alter table public.profiles
add column if not exists hide_unnamed_leads boolean not null default false;

comment on column public.profiles.hide_unnamed_leads is
  'Si el usuario prefiere ocultar los leads sin nombre. Se aplica en la tabla de leads, el pipeline y el panel de flujos.';

notify pgrst, 'reload schema';
