-- fix_capture_link_funnel_form_slug_leak
--
-- Hallazgo del usuario tras la auditoria cruzada CONTROL 14.4: list_my_capture_links
-- agrupaba form_progress_events solo por capture_ref, sin filtrar por form_slug.
-- Si alguien visita /form/?ref=<ref-de-un-link-pb> (a mano o por error), esos
-- eventos (form_slug='form') se sumaban igual al funnel del link 'pb' con ese
-- ref_code, contaminando visitas/paso1/paso2 con trafico de un formulario
-- distinto. Bajo impacto -solo analitica, no toca ownership ni leads reales-
-- pero se corrige para que el conteo sea exacto por tipo de formulario.
--
-- Fix: el CTE progress ahora agrupa tambien por form_slug, y el JOIN exige
-- que form_slug coincida con el link_type del capture_link (pb <-> pb,
-- retiro <-> retiro). Los eventos con form_slug='form' (el formulario
-- generico, sin tipo de link propio) dejan de sumarse a cualquier link -es
-- lo correcto: /form no es la misma conversion que /pb ni que /retiro, asi
-- que no deberia inflar el funnel de ninguno de los dos.
--
-- Cuerpo identico al de 20260805000600 salvo el CTE progress y su JOIN,
-- marcados con comentario "-- FIX" abajo. No se toca ninguna otra parte de
-- la funcion.

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
    -- FIX: agrupar tambien por form_slug para no mezclar eventos de
    -- formularios distintos que comparten el mismo capture_ref.
    SELECT
      fpe.capture_ref,
      fpe.form_slug,
      count(*) FILTER (WHERE fpe.event_type = 'visit') AS visits,
      count(*) FILTER (WHERE fpe.event_type = 'step_1') AS step1_completions,
      count(*) FILTER (WHERE fpe.event_type = 'step_2') AS step2_completions
    FROM public.form_progress_events fpe
    GROUP BY fpe.capture_ref, fpe.form_slug
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
    -- FIX: exigir que el formulario de origen coincida con el tipo del link.
    -- Antes: ON progress.capture_ref = cl.ref_code (sin chequear form_slug).
    ON progress.capture_ref = cl.ref_code
    AND progress.form_slug = cl.link_type
  WHERE cl.owner_user_id = auth.uid()
    AND cl.deleted_at IS NULL
    AND (p_link_type IS NULL OR cl.link_type = p_link_type)
  ORDER BY cl.is_default DESC, cl.created_at ASC, cl.id ASC;
$$;

REVOKE ALL ON FUNCTION public.list_my_capture_links(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_capture_links(text) TO authenticated;

COMMENT ON FUNCTION public.list_my_capture_links(text) IS
'Lista links de publicacion del usuario autenticado con contadores comerciales y de funnel (visitas/paso1/paso2) agregados, exigiendo que el form_slug del evento coincida con el link_type del link. p_link_type filtra por pb/retiro; NULL trae todos.';

NOTIFY pgrst, 'reload schema';
