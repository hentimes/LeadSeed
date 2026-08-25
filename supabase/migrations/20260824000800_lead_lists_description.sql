-- 117 - Descripcion corta en las listas de leads
--
-- Una linea para saber de que va cada lista, visible solo en la pagina de
-- Listas. No es un campo de notas: el limite de 25 caracteres esta puesto en la
-- base y no solo en el formulario, porque un texto largo aqui rompe la
-- maquetacion de la lista y ademas invita a usar el campo para otra cosa.
--
-- Se aprovecha para arreglar un fallo latente. `saveLeadList` mandaba
-- `updated_at` al actualizar, pero la tabla nunca tuvo esa columna: el update
-- habria fallado con "column does not exist". No se habia notado porque en la
-- interfaz solo se crean listas, nunca se editan, asi que esa rama era codigo
-- muerto. Al hacer editable la descripcion deja de serlo, y entonces si
-- reventaria. Las otras tres tablas de listas -lists, template_lists,
-- user_lists- ya la tienen, asi que se añade en vez de quitarla del payload.

alter table public.lead_lists
add column if not exists description text,
add column if not exists updated_at timestamptz not null default now();

-- El limite vive aqui y en el formulario. Duplicarlo es deliberado: el
-- formulario evita el viaje y da un contador, y la restriccion impide que
-- cualquier otro camino -importaciones, la API, un script- meta un texto que
-- despues no cabe en pantalla.
alter table public.lead_lists
drop constraint if exists lead_lists_description_length;

alter table public.lead_lists
add constraint lead_lists_description_length
check (description is null or char_length(description) <= 25);

comment on column public.lead_lists.description is
  'Descripcion corta de la lista, maximo 25 caracteres. Solo se muestra en la pagina de Listas.';

notify pgrst, 'reload schema';
