-- fix_capture_link_funnel_duplicate_rows
--
-- Tipo:           query permanente (reemplazo de funcion)
-- Objeto:         public.list_my_capture_links
-- Clase:          correccion de defecto con impacto visible en pantalla
-- Persistencia:   permanente
-- Reversibilidad: total (volver a aplicar 092)
--
-- SINTOMA
--
-- Reportado por el usuario el `2026-08-16`: en Configuracion, cada link de
-- "Retiro tecnico extranjero" aparece **dos veces**, con visitas distintas en
-- cada fila y el mismo numero de leads.
--
--   planespro.cl/retiro-tecnico-extranjero/vwzrm2/    5 visitas   3 leads
--   planespro.cl/retiro-tecnico-extranjero/vwzrm2/    1 visita    3 leads
--   .../3fn2er/                                      54 visitas   3 leads
--   .../3fn2er/                                     164 visitas   3 leads
--
-- No hay links duplicados: `capture_links` tiene 7 filas y solo 2 son de
-- retiro. La duplicacion la fabrica esta funcion.
--
-- CAUSA
--
-- El CTE `progress` agrupa por `(capture_ref, form_slug)`, y el JOIN aceptaba
-- **dos** slugs para un mismo link de retiro:
--
--   AND ( progress.form_slug = cl.link_type
--         OR (cl.link_type = 'retiro' AND progress.form_slug = 'retiro-v2') )
--
-- Mientras el formulario emitio un solo slug, el JOIN encontraba una fila y
-- todo se veia bien. Desde que existen eventos con los dos slugs para el mismo
-- `capture_ref`, encuentra dos, y un LEFT JOIN que casa dos veces **duplica la
-- fila del link**. Los leads se repiten identicos porque esos vienen de otro
-- JOIN que si es uno a uno.
--
-- Verificado contra los datos:
--
--   3fn2er  retiro     54 visitas   |  3fn2er  retiro-v2  164 visitas
--   vwzrm2  retiro      1 visita    |  vwzrm2  retiro-v2    5 visitas
--
-- que son exactamente los cuatro numeros de la pantalla.
--
-- POR QUE APARECIO AHORA
--
-- El formulario desplegado en `planespro.cl/retiro-tecnico-extranjero/` cambio
-- el slug que emite: hasta el `2026-08-15` mandaba `retiro-v2`, y desde ese dia
-- manda `retiro`. Comprobado en produccion: el `app.js` que se sirve hoy declara
-- `form_slug: "retiro"` y su token de version es `retiro-v5-progress-tracking`.
--
-- El cambio viene del otro repositorio y no es objeto de esta migracion. Lo que
-- si es nuestro es que la funcion no aguantara un formulario que cambie de
-- nombre, cosa perfectamente normal a lo largo de la vida de un link.
--
-- ARREGLO
--
-- Agrupar por **familia** de formulario en vez de por el slug crudo, quitandole
-- el sufijo de version con `regexp_replace(form_slug, '-v[0-9]+$', '')`.
--
-- Dos consecuencias, y la segunda es la que importa a futuro:
--
-- 1. Las visitas de `retiro` y `retiro-v2` se **suman** en una sola fila, que es
--    lo que el usuario espera: es el mismo formulario, no dos.
-- 2. Tras el GROUP BY, el par `(capture_ref, form_family)` es unico, asi que el
--    JOIN **no puede** devolver dos filas. La duplicacion deja de ser posible
--    por construccion, no por una lista de casos especiales. Si manana aparece
--    un `retiro-v3`, entra solo.
--
-- Se descarto la alternativa evidente -anadir `retiro-v3` a la condicion cuando
-- toque- porque es la misma solucion que ya fallo: enumerar versiones a mano
-- deja el defecto latente esperando a la siguiente.
--
-- SOBRE LA VERSION QUE HABIA EN PRODUCCION
--
-- La clausula del `OR ... 'retiro-v2'` **no existe en ninguna migracion de este
-- repositorio**. Se aplico directamente contra la base. Esta migracion la
-- reemplaza y devuelve la funcion al historial versionado.
--
-- METODO
--
-- Derivada del texto de la 092 con dos sustituciones verificadas. Antes se
-- comparo la funcion desplegada contra el cuerpo de la 092 y se confirmo que la
-- unica diferencia era esa clausula, asi que derivar de ahi no pierde nada.

CREATE OR REPLACE FUNCTION public.list_my_capture_links(p_link_type text DEFAULT NULL)
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
    -- Esto conserva lo que buscaba la 092 (no mezclar /form con /pb) y ademas
    -- **hace imposible la duplicacion de filas**: tras el GROUP BY, el par
    -- (capture_ref, form_family) es unico, asi que el LEFT JOIN de mas abajo
    -- devuelve como mucho una fila por link.
    SELECT
      fpe.capture_ref,
      regexp_replace(fpe.form_slug, '-v[0-9]+$', '') AS form_family,
      count(*) FILTER (WHERE fpe.event_type = 'visit') AS visits,
      count(*) FILTER (WHERE fpe.event_type = 'step_1') AS step1_completions,
      count(*) FILTER (WHERE fpe.event_type = 'step_2') AS step2_completions
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
'Lista links de publicacion del usuario autenticado con contadores comerciales y de funnel (visitas/paso1/paso2) agregados, exigiendo que la familia de formulario del evento (el slug sin sufijo -vN) coincida con el link_type del link. p_link_type filtra por pb/retiro; NULL trae todos.';

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   Volver a aplicar sql/migrations/092_fix_capture_link_funnel_form_slug_leak.sql.
--   Ojo: eso reintroduce la duplicacion mientras existan eventos con los dos
--   slugs para un mismo capture_ref.
