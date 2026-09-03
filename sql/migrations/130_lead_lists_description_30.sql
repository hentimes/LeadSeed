-- 130 - La descripcion de las listas baja de 50 a 30 caracteres
--
-- La 129 la habia subido de 25 a 50. Con el cambio a una sola linea -punto,
-- nombre, descripcion y contador comparten fila- 50 caracteres ya no caben: se
-- recortan con puntos suspensivos y la mitad del texto no se lee nunca. 30 es
-- lo que entra al lado de un nombre de largo normal.
--
-- ## Esto va en la direccion peligrosa
--
-- Relajar un limite es seguro: toda fila que cumplia el viejo cumple el nuevo.
-- APRETARLO no: cualquier descripcion de 31 a 50 caracteres incumple el limite
-- nuevo, y con una restriccion normal el ALTER TABLE fallaria y no se aplicaria
-- nada.
--
-- Esas filas pueden existir de verdad: el limite de 50 estuvo vigente, aunque
-- fuera poco tiempo.
--
-- Por eso va `NOT VALID`, igual que el limite de nombre de la 129: vale desde
-- ahora -toda alta y toda modificacion la respetan- y deja en paz lo ya
-- guardado. Nadie pierde texto que ya habia escrito.
--
-- El servicio recorta a 30 antes de enviar (`normalizarDescripcion`), asi que
-- una fila larga que se vuelva a guardar queda dentro del limite sola. La
-- interfaz ya las muestra recortadas.
--
-- Para cerrarla del todo mas adelante, primero se miran y despues se valida:
--
--   SELECT id, name, description, char_length(description) AS largo
--   FROM public.lead_lists
--   WHERE char_length(description) > 30 ORDER BY largo DESC;
--
--   ALTER TABLE public.lead_lists VALIDATE CONSTRAINT lead_lists_description_length;

alter table public.lead_lists
drop constraint if exists lead_lists_description_length;

alter table public.lead_lists
add constraint lead_lists_description_length
check (description is null or char_length(description) <= 30) not valid;

comment on column public.lead_lists.description is
  'Descripcion corta de la lista, maximo 30 caracteres: comparte una sola linea con el nombre y el contador de leads.';

notify pgrst, 'reload schema';
