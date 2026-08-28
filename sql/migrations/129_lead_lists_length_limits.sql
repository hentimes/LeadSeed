-- 129 - Largos de nombre y descripcion de las listas
--
-- ## La descripcion pasa de 25 a 50
--
-- La 117 puso el limite en 25 y lo dejo escrito en dos sitios a proposito: el
-- formulario, para evitar el viaje y poder mostrar un contador, y esta
-- restriccion, para que ningun otro camino -una importacion, la API, un
-- script- meta un texto que despues no cabe en pantalla.
--
-- Ese razonamiento sigue valiendo; lo que cambia es el numero. 25 caracteres
-- eran menos de lo que hace falta para una frase util ("Los guardados en
-- conecta" ya son 25 exactos, sin margen).
--
-- **Relajar un CHECK es seguro**: toda fila que cumplia el limite viejo cumple
-- el nuevo. No hace falta backfill ni verificacion previa. Lo que NO seria
-- seguro es lo contrario -bajarlo-, porque las filas que ya se pasan harian
-- fallar la creacion de la restriccion.
--
-- ## El nombre gana un limite que no tenia
--
-- No habia ninguno en la base: solo el `maxLength` del formulario, que se
-- salta cualquier cliente que no sea ese formulario. Un nombre largo no rompe
-- nada, pero en una fila de 246px se recorta y la lista deja de distinguirse
-- de otra con el mismo prefijo.
--
-- Va como `NOT VALID`, y esa es la parte importante.
--
-- Una restriccion normal se comprueba contra TODA la tabla al crearse: si hay
-- una sola lista con un nombre mas largo, la migracion falla entera y no se
-- aplica nada. `NOT VALID` la hace valer desde ahora -cualquier alta o
-- modificacion la respeta- y deja en paz a las filas que ya existen.
--
-- Es lo correcto aca porque el limite es una decision de presentacion tomada
-- hoy, no una regla que los datos viejos hayan incumplido: recortarles el
-- nombre a las listas de alguien sin avisarle seria peor que dejarlas largas.
--
-- Cuando se quiera cerrar del todo, primero se acortan a mano las que
-- sobrepasen y despues:
--
--   SELECT id, name, char_length(name) AS largo
--   FROM public.lead_lists WHERE char_length(name) > 25 ORDER BY largo DESC;
--
--   ALTER TABLE public.lead_lists VALIDATE CONSTRAINT lead_lists_name_length;

alter table public.lead_lists
drop constraint if exists lead_lists_description_length;

alter table public.lead_lists
add constraint lead_lists_description_length
check (description is null or char_length(description) <= 50);

comment on column public.lead_lists.description is
  'Descripcion corta de la lista, maximo 50 caracteres. Solo se muestra en la pagina de Listas.';

alter table public.lead_lists
drop constraint if exists lead_lists_name_length;

alter table public.lead_lists
add constraint lead_lists_name_length
check (char_length(name) <= 25) not valid;

comment on column public.lead_lists.name is
  'Nombre de la lista, maximo 25 caracteres: es lo que tiene que entrar en una fila del panel lateral.';

notify pgrst, 'reload schema';
