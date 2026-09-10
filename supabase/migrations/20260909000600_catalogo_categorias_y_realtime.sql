-- catalogo_categorias_y_realtime
--
-- Tipo:           columnas nuevas + publicacion realtime + altas de catalogo
-- Objeto:         public.features, publicacion supabase_realtime, catalogo
-- Clase:          correccion de un fallo + funcionalidad nueva
-- Persistencia:   permanente
-- Reversibilidad: parcial (ver al final)
--
-- Esta migracion cierra el bloque A y abre el B de docs/auditoria-catalogo-saas.md.
--
-- ---------------------------------------------------------------------------
-- 1. CATEGORIAS
--
-- `features` tenia id, name, description, is_active y trial_days. Sin columna
-- de categoria, agrupar las funcionalidades -que es como hay que verlas para
-- componer un plan- no era posible ni siquiera en el modelo.
--
-- `sort_order` existe porque el orden dentro de una categoria no es
-- alfabetico: "la base de contactos" va antes que "exportar", aunque la e
-- venga antes que la b.

ALTER TABLE public.features
  ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE public.features
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 100;

COMMENT ON COLUMN public.features.category IS
  'Categoria a la que pertenece: contactos, listas, mensajes, captacion, seguimiento, analisis, comunidad, correo, plataforma. Nula significa sin clasificar, y el panel las agrupa aparte.';

COMMENT ON COLUMN public.features.sort_order IS
  'Orden dentro de la categoria. El alfabetico no sirve: "base" va antes que "exportar" por sentido, no por letra.';

CREATE INDEX IF NOT EXISTS features_category_idx
  ON public.features (category, sort_order);

-- ---------------------------------------------------------------------------
-- 2. REALTIME EN LAS TABLAS DEL CATALOGO
--
-- EL FALLO: los cambios de plan no llegaban al usuario.
--
-- `AuthContext` mantiene tres suscripciones para enterarse de los cambios de
-- permisos, sobre `profiles`, `user_feature_overrides` y `plan_features`.
-- Ninguna de esas tablas estaba publicada: se publicaron 29 tablas a lo largo
-- de las migraciones -leads, tasks, chat, comunidad, agenda- y ninguna del
-- catalogo. Las tres suscripciones no disparaban jamas.
--
-- Consecuencia: añadir una funcionalidad a un plan, cambiarle el plan a
-- alguien o concederle un permiso puntual no producia ningun efecto visible
-- hasta que esa persona recargaba la extension.
--
-- No se publican `features` ni `plans`: cambiarles el nombre o la descripcion
-- no altera los permisos de nadie, y publicarlas mandaria un evento a todas
-- las sesiones abiertas por editar un texto.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'plan_features'
  ) then
    execute 'alter publication supabase_realtime add table public.plan_features';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_feature_overrides'
  ) then
    execute 'alter publication supabase_realtime add table public.user_feature_overrides';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    execute 'alter publication supabase_realtime add table public.profiles';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. LAS TRES CLAVES QUE EL CODIGO EXIGE Y EL CATALOGO NO TENIA
--
-- `hasFeature` falla cerrado, asi que una clave ausente CIERRA la seccion.
--
--   module:community    -> Comunidad estaba cerrada para todo no-administrador
--   premium_aesthetics  -> el marco premium del perfil no lo obtenia nadie
--   module:admin        -> el panel, cerrado (correcto, pero por accidente)
--
-- Es la misma trampa que el comentario de `config/routes.ts` describe para
-- Flujos y Playbooks, y que alli se evito a proposito.

INSERT INTO public.features (id, name, description, is_active, trial_days, category, sort_order)
VALUES
  ('module:community', 'Comunidad', 'Foro entre usuarios de LeadSeed.', true, 0, 'comunidad', 10),
  ('premium_aesthetics', 'Marco premium', 'Marco distintivo en la foto de perfil.', true, 0, 'comunidad', 40),
  ('module:admin', 'Panel de administracion', 'Gestion de usuarios, planes y catalogo.', true, 0, 'plataforma', 30)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;

-- Comunidad se abre a los tres planes: estaba abierta de hecho hasta que
-- alguien le puso la puerta, y cerrarla ahora seria quitar algo que la gente
-- ya usa. El marco premium queda solo en Pro, que es para lo que se penso.
--
-- `module:admin` NO se asigna a ningun plan a proposito: el panel se abre por
-- el rol de administrador, no por el plan. Existe en el catalogo para que la
-- clave este declarada y no vuelva a cerrar nada por ausencia.
INSERT INTO public.plan_features (plan_id, feature_id)
VALUES
  ('plan_free', 'module:community'),
  ('plan_standard', 'module:community'),
  ('plan_pro', 'module:community'),
  ('plan_pro', 'premium_aesthetics')
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. CATEGORIA PARA LAS QUE YA ESTABAN

UPDATE public.features SET category = 'contactos',   sort_order = 10  WHERE id = 'module:leads';
UPDATE public.features SET category = 'contactos',   sort_order = 60  WHERE id = 'pro:unlimited_leads';
UPDATE public.features SET category = 'listas',      sort_order = 10  WHERE id = 'module:lists';
UPDATE public.features SET category = 'listas',      sort_order = 40  WHERE id = 'pro:unlimited_lists';
UPDATE public.features SET category = 'mensajes',    sort_order = 10  WHERE id = 'module:templates';
UPDATE public.features SET category = 'mensajes',    sort_order = 20  WHERE id = 'module:send';
UPDATE public.features SET category = 'mensajes',    sort_order = 80  WHERE id = 'pro:unlimited_templates';
UPDATE public.features SET category = 'mensajes',    sort_order = 90  WHERE id = 'pro:unlimited_emails';
UPDATE public.features SET category = 'seguimiento', sort_order = 10  WHERE id = 'module:pipeline';
UPDATE public.features SET category = 'seguimiento', sort_order = 20  WHERE id = 'module:tasks';
UPDATE public.features SET category = 'analisis',    sort_order = 10  WHERE id = 'module:dashboard';
UPDATE public.features SET category = 'analisis',    sort_order = 40  WHERE id = 'module:history';

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   alter table public.features drop column if exists category;
--   alter table public.features drop column if exists sort_order;
--   alter publication supabase_realtime drop table public.plan_features;
--   alter publication supabase_realtime drop table public.user_feature_overrides;
--   alter publication supabase_realtime drop table public.profiles;
--
--   Las tres altas de funcionalidad NO conviene revertirlas: borrar
--   `module:community` vuelve a cerrar Comunidad para todo el mundo.
