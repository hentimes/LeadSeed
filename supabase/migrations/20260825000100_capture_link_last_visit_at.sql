-- capture_link_last_visit_at
--
-- Tipo:           query permanente (reemplazo de funcion)
-- Objeto:         public.list_my_capture_links
-- Clase:          dato nuevo pedido desde la interfaz
-- Persistencia:   permanente
-- Reversibilidad: total (volver a aplicar 20260816000100)
--
-- QUE AGREGA
--
-- Una columna mas: `last_visit_at`, el momento de la ultima visita registrada
-- para el link. Pedido el 2026-08-25 para la pantalla de links de captura de
-- Configuracion: los seis contadores dicen cuanto, y ninguno decia cuando.
--
-- El dato ya existia, solo que sin exponer: `form_progress_events` guarda un
-- `created_at` por evento, asi que es un `max(...) FILTER (event_type =
-- 'visit')` dentro del CTE `progress` que ya se estaba calculando. No hay
-- tabla nueva, ni indice nuevo, ni una segunda pasada sobre los eventos.
--
-- POR QUE `DROP` Y NO `CREATE OR REPLACE`
--
-- Postgres no deja cambiar la firma de retorno de una funcion con `CREATE OR
-- REPLACE`: agregar una columna a `RETURNS TABLE` es cambiarla. Hay que borrar
-- y recrear, y con el `DROP` se pierden los permisos, asi que el `REVOKE` y el
-- `GRANT` de abajo no son decorativos: sin ellos la funcion queda inalcanzable
-- para `authenticated` y la pantalla de links deja de cargar.
--
-- ORDEN DE DESPLIEGUE (importa)
--
-- Primero el frontend, despues esta migracion. El codigo que lee este campo
-- lo declara opcional y no pinta nada cuando falta, asi que aguanta sin el;
-- al reves no: entre el `DROP` y el `CREATE` la funcion no existe, y un
-- frontend viejo tampoco sabria que hacer con la columna nueva.
--
-- SIN `coalesce`, A PROPOSITO
--
-- Un link sin visitas devuelve NULL, y eso es informacion: la interfaz
-- distingue "no ha recibido visitas" de "el rpc todavia no trae el campo"
-- cruzandolo con `visits`. Rellenarlo con una fecha falsa (epoch, now())
-- borraria esa diferencia.
--
-- DERIVACION
--
-- El cuerpo sale literal de 20260816000100_fix_capture_link_funnel_duplicate_rows.sql
-- con dos anadidos (la columna en el CTE y en el SELECT). Se deriva de ahi y no
-- de una version anterior para no perder el arreglo del `form_family`, que es
-- lo que impide que un link salga duplicado cuando el formulario cambia de
-- version.

DROP FUNCTION IF EXISTS public.list_my_capture_links(text);

CREATE FUNCTION public.list_my_capture_links(p_link_type text DEFAULT NULL)
RETURNS TABLE (
  id bigint,
  ref_code text,
  label text,
  campaign_name text,
  link_type text,
  is_default boolean,
  is_active boolean,
  stats_config jsonb,
  total_leads bigint,
  closed_leads bigint,
  close_rate_pct numeric,
  visits bigint,
  step1_completions bigint,
  step2_completions bigint,
  last_visit_at timestamptz,
  capture_links_limit integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH progress AS (
    -- Se agrupa por capture_ref y por FAMILIA de formulario, no por el slug
    -- crudo. La familia ignora el sufijo de version: 'retiro-v2' y 'retiro'
    -- son el mismo formulario en dos momentos, no dos formularios.
    --
    -- Tras el GROUP BY, el par (capture_ref, form_family) es unico, asi que el
    -- LEFT JOIN de mas abajo devuelve como mucho una fila por link.
    SELECT
      fpe.capture_ref,
      regexp_replace(fpe.form_slug, '-v[0-9]+$', '') AS form_family,
      count(*) FILTER (WHERE fpe.event_type = 'visit') AS visits,
      count(*) FILTER (WHERE fpe.event_type = 'step_1') AS step1_completions,
      count(*) FILTER (WHERE fpe.event_type = 'step_2') AS step2_completions,
      max(fpe.created_at) FILTER (WHERE fpe.event_type = 'visit') AS last_visit_at
    FROM public.form_progress_events fpe
    GROUP BY 1, 2
  )
  SELECT
    cl.id,
    cl.ref_code,
    cl.label,
    cl.campaign_name,
    cl.link_type,
    cl.is_default,
    cl.is_active,
    cl.stats_config,
    coalesce(perf.total_leads, 0) AS total_leads,
    coalesce(perf.closed_leads, 0) AS closed_leads,
    coalesce(perf.close_rate_pct, 0) AS close_rate_pct,
    coalesce(progress.visits, 0) AS visits,
    coalesce(progress.step1_completions, 0) AS step1_completions,
    coalesce(progress.step2_completions, 0) AS step2_completions,
    progress.last_visit_at,
    public.get_profile_capture_links_limit(auth.uid()) AS capture_links_limit,
    cl.created_at,
    cl.updated_at
  FROM public.capture_links cl
  LEFT JOIN public.capture_link_performance perf
    ON perf.capture_link_id = cl.id
  LEFT JOIN progress
    -- La familia del formulario debe coincidir con el tipo del link.
    ON progress.capture_ref = cl.ref_code
    AND progress.form_family = cl.link_type
  WHERE cl.owner_user_id = auth.uid()
    AND cl.deleted_at IS NULL
    AND (p_link_type IS NULL OR cl.link_type = p_link_type)
  ORDER BY cl.is_default DESC, cl.created_at ASC, cl.id ASC;
$$;

REVOKE ALL ON FUNCTION public.list_my_capture_links(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_capture_links(text) TO authenticated;

COMMENT ON FUNCTION public.list_my_capture_links(text) IS
'Lista links de publicacion del usuario autenticado con contadores comerciales y de funnel (visitas/paso1/paso2/ultima visita) agregados, exigiendo que la familia de formulario del evento (el slug sin sufijo -vN) coincida con el link_type del link. p_link_type filtra por pb/retiro; NULL trae todos.';

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   Volver a aplicar supabase/migrations/20260816000100_fix_capture_link_funnel_duplicate_rows.sql,
--   precedido de su propio DROP. La interfaz aguanta la vuelta atras sin
--   cambios: al desaparecer la columna, `last_visit_at` llega undefined y la
--   metrica simplemente deja de pintarse.
