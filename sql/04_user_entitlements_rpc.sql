-- 04_user_entitlements_rpc.sql
-- Crea una función súper eficiente para obtener todas las funcionalidades activas de un usuario.
-- Cruza las funcionalidades base del plan con los overrides (Trials o Adiciones manuales).

CREATE OR REPLACE FUNCTION public.get_my_features()
RETURNS text[] AS $$
DECLARE
    v_user_id uuid;
    v_plan_id uuid;
    v_features text[];
BEGIN
    -- 1. Identificar al usuario ejecutando la consulta
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN ARRAY[]::text[];
    END IF;

    -- 2. Obtener el plan del perfil del usuario
    SELECT plan_id INTO v_plan_id 
    FROM public.profiles 
    WHERE id = v_user_id;

    -- 3. Calcular todas las funcionalidades activas
    SELECT array_agg(DISTINCT f.name) INTO v_features
    FROM public.features f
    WHERE f.is_active = true
      AND f.id IN (
          -- A: Funcionalidades incluidas en el plan del usuario
          SELECT feature_id 
          FROM public.plan_features 
          WHERE plan_id = v_plan_id
          
          UNION
          
          -- B: Sobreescrituras y Trials válidos (manuales del usuario)
          SELECT feature_id 
          FROM public.user_feature_overrides 
          WHERE user_id = v_user_id 
            AND (expires_at IS NULL OR expires_at > now())
      );

    -- Si el array es nulo, devolver array vacío
    RETURN COALESCE(v_features, ARRAY[]::text[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario
COMMENT ON FUNCTION public.get_my_features() IS 'Retorna un array de strings con los nombres de las funcionalidades activas para el usuario actual (respetando Trials y Planes).';

-- Exponer a la API
GRANT EXECUTE ON FUNCTION public.get_my_features() TO authenticated;

-- Notificar recarga de caché a Supabase
NOTIFY pgrst, 'reload schema';
