-- cuotas_por_plan
--
-- Tipo:           tabla nueva + funcion nueva
-- Objeto:         public.plan_feature_limits, public.get_my_limits()
-- Clase:          funcionalidad nueva
-- Persistencia:   permanente
-- Reversibilidad: total
--
-- Bloque D de docs/auditoria-catalogo-saas.md.
--
-- EL PROBLEMA: EL CATALOGO SOLO SABE DECIR SI O NO
--
-- Los topes reales del producto vivian en tres sitios, y ninguno era el plan:
--
--   100 leads          escrito a mano en useLeadsPageController.ts
--   2 listas           escrito a mano en ListsPage.tsx
--   5 enlaces          profiles.capture_links_limit, columna POR USUARIO
--   50 WhatsApp/dia    profiles.whatsapp_daily_limit, columna POR USUARIO
--
-- Con funcionalidades booleanas (`pro:unlimited_leads`) solo se puede decir
-- "sin tope" o "con el tope de siempre". No se puede ofrecer "300 leads" en un
-- plan intermedio, ni "5 enlaces en Pro y 1 en gratuito": hay que ir usuario
-- por usuario, que es justo lo que hace ingestionable el SaaS.
--
-- LA TABLA
--
-- Un numero por plan y funcionalidad. La funcionalidad tiene que existir en el
-- catalogo, asi que la cuota siempre cuelga de algo que se ve en el panel.
--
-- NULO NO ES CERO
--
-- La ausencia de fila significa "sin limite", no "cero". Es la unica lectura
-- segura: si la ausencia significara cero, olvidar una fila al crear un plan
-- dejaria a esa gente sin poder crear ni un solo contacto, y el sintoma seria
-- indistinguible de un fallo.

CREATE TABLE IF NOT EXISTS public.plan_feature_limits (
  plan_id text NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_id text NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  /* El tope. Sin fila = sin limite; ver la cabecera. */
  limite integer NOT NULL CHECK (limite >= 0),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (plan_id, feature_id)
);

COMMENT ON TABLE public.plan_feature_limits IS
  'Cuanto de cada funcionalidad da cada plan. La ausencia de fila significa SIN LIMITE, no cero.';

ALTER TABLE public.plan_feature_limits ENABLE ROW LEVEL SECURITY;

-- Lectura para cualquiera con sesion: son las condiciones del plan, lo mismo
-- que ya se puede leer de `plans` y `features`. Escritura solo administradores.
DROP POLICY IF EXISTS "Leer cuotas de plan" ON public.plan_feature_limits;
CREATE POLICY "Leer cuotas de plan"
ON public.plan_feature_limits
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Administradores editan cuotas" ON public.plan_feature_limits;
CREATE POLICY "Administradores editan cuotas"
ON public.plan_feature_limits
FOR ALL
USING (public.is_current_profile_admin())
WITH CHECK (public.is_current_profile_admin());

-- ---------------------------------------------------------------------------
-- LAS CUOTAS DEL USUARIO ACTUAL
--
-- Devuelve un objeto {feature_id: limite}. El cliente lo lee una vez y lo
-- consulta como consulta las funcionalidades.
--
-- Solo salen las funcionalidades que el usuario TIENE: una cuota sobre algo a
-- lo que no tiene acceso no significa nada, y mandarla invitaria a mostrar "0
-- de 5 enlaces" en una pantalla que ni siquiera deberia verse.

CREATE OR REPLACE FUNCTION public.get_my_limits()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_plan_id text;
  v_limites jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT plan_id INTO v_plan_id FROM public.profiles WHERE id = v_user_id;

  SELECT coalesce(jsonb_object_agg(pfl.feature_id, pfl.limite), '{}'::jsonb)
  INTO v_limites
  FROM public.plan_feature_limits pfl
  WHERE pfl.plan_id = v_plan_id
    -- La cuota solo cuenta si la funcionalidad esta activa y el usuario la
    -- tiene: por plan o por un permiso puntual no vencido, igual que en
    -- `get_my_features()`.
    AND pfl.feature_id IN (
      SELECT f.id
      FROM public.features f
      WHERE f.is_active = true
        AND f.id IN (
          SELECT pf.feature_id FROM public.plan_features pf WHERE pf.plan_id = v_plan_id
          UNION
          SELECT ufo.feature_id
          FROM public.user_feature_overrides ufo
          WHERE ufo.user_id = v_user_id
            AND (ufo.expires_at IS NULL OR ufo.expires_at > now())
        )
    );

  RETURN v_limites;
END;
$$;

COMMENT ON FUNCTION public.get_my_limits() IS
  'Cuotas numericas del plan del usuario, como {feature_id: limite}. Solo las de funcionalidades que tiene. La ausencia de una clave significa sin limite.';

REVOKE ALL ON FUNCTION public.get_my_limits() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_limits() TO authenticated;

-- ---------------------------------------------------------------------------
-- LOS TOPES DE HOY, TAL CUAL
--
-- Se siembran los numeros que el cliente ya aplicaba escritos a mano, para que
-- mover el codigo a leerlos de aqui no cambie el comportamiento de nadie.
--
-- Pro no lleva fila en ninguno: sin fila es sin limite, que es lo que
-- `pro:unlimited_leads` y `pro:unlimited_lists` decian de forma booleana.

-- Los enlaces de captura los tiene HOY cualquiera: `profiles.capture_links_limit`
-- vale 1 por defecto para todo el mundo y el trigger de la 021 lo aplica sin
-- mirar el plan. La 180 los sembro como Standard y Pro, que es lo que se
-- querria cobrar pero no lo que pasa. Se corrige aqui: el catalogo describe lo
-- que hay, y cobrarlo es despues un clic en el panel.
INSERT INTO public.plan_features (plan_id, feature_id)
VALUES ('plan_free', 'captacion.enlaces')
ON CONFLICT (plan_id, feature_id) DO NOTHING;

INSERT INTO public.plan_feature_limits (plan_id, feature_id, limite)
VALUES
  ('plan_free', 'module:leads', 100),
  ('plan_standard', 'module:leads', 1000),
  ('plan_free', 'module:lists', 2),
  ('plan_standard', 'module:lists', 20),
  ('plan_free', 'captacion.enlaces', 1),
  ('plan_standard', 'captacion.enlaces', 3),
  ('plan_pro', 'captacion.enlaces', 5)
ON CONFLICT (plan_id, feature_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   drop function if exists public.get_my_limits();
--   drop table if exists public.plan_feature_limits;
--
--   El cliente vuelve a sus numeros escritos a mano, que es de donde salen los
--   sembrados aqui.
