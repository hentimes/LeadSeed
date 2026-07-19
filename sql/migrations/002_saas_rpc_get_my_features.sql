-- Query permanente
-- Dominio: saas
-- Objetivo: exponer RPC para calcular funcionalidades activas del usuario

CREATE OR REPLACE FUNCTION public.get_my_features()
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_plan_id uuid;
  v_features text[];
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;

  SELECT plan_id INTO v_plan_id
  FROM public.profiles
  WHERE id = v_user_id;

  SELECT array_agg(DISTINCT f.name) INTO v_features
  FROM public.features f
  WHERE f.is_active = true
    AND f.id IN (
      SELECT pf.feature_id
      FROM public.plan_features pf
      WHERE pf.plan_id = v_plan_id

      UNION

      SELECT ufo.feature_id
      FROM public.user_feature_overrides ufo
      WHERE ufo.user_id = v_user_id
        AND (ufo.expires_at IS NULL OR ufo.expires_at > now())
    );

  RETURN COALESCE(v_features, ARRAY[]::text[]);
END;
$$;

COMMENT ON FUNCTION public.get_my_features() IS
'Retorna los nombres de las funcionalidades activas del usuario actual, combinando plan y overrides.';

GRANT EXECUTE ON FUNCTION public.get_my_features() TO authenticated;

NOTIFY pgrst, 'reload schema';
