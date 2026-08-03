-- 071 - Corregir el trigger de limite: NULL no es 1, es sin limite
--
-- La migracion 070 asumio, incorrectamente, que create_my_capture_link()
-- era el unico lugar que aplicaba el limite de links (ahi lo agregue) y
-- que el resto era solo una restriccion de UI. Al probarlo de punta a
-- punta -crear un link real como admin- salto un error que no esperaba,
-- viniendo de una funcion que nunca habia visto: enforce_capture_links_limit(),
-- un trigger BEFORE INSERT/UPDATE en capture_links de la migracion 021,
-- que S1 aplicaba el limite en el servidor todo este tiempo.
--
-- Su bug para este caso: v_limit := coalesce(get_profile_capture_links_limit(...), 1).
-- El coalesce convertia el NULL de "sin limite" (admin, desde la 070) de
-- vuelta a 1, dejando al admin exactamente en el mismo limite que un
-- vendedor. Se quita el coalesce y se corta temprano cuando el limite es
-- NULL, sin tocar el resto de la logica -que ya era correcta para todos
-- los roles con limite numerico-.

CREATE OR REPLACE FUNCTION public.enforce_capture_links_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_limit := public.get_profile_capture_links_limit(NEW.owner_user_id);

  -- NULL es "sin limite" (admin, migracion 070): no hay nada que comparar.
  IF v_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*)
  INTO v_count
  FROM public.capture_links cl
  WHERE cl.owner_user_id = NEW.owner_user_id
    AND cl.deleted_at IS NULL
    AND (TG_OP = 'INSERT' OR cl.id <> NEW.id);

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'capture link limit reached for user %', NEW.owner_user_id;
  END IF;

  RETURN NEW;
END;
$function$;
