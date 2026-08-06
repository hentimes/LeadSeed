-- reset_my_capture_link_progress
--
-- El admin necesita poder resetear el funnel de visitas/paso1/paso2 de un
-- link (por ejemplo para arrancar limpio una nueva campana), sin tocar los
-- leads reales ya capturados por ese link -- eso es dato real de CRM, no
-- telemetria, y no se borra con este RPC.
--
-- Owner-scoped igual que el resto de la familia *_my_capture_link*: no hace
-- falta un chequeo de rol admin explicito porque en la practica solo un
-- admin puede llegar a poseer un capture_link de tipo 'retiro' (ver
-- create_my_capture_link). Sirve igual para links 'pb' a futuro si hiciera
-- falta.

CREATE OR REPLACE FUNCTION public.reset_my_capture_link_progress(p_link_id bigint)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_user_id uuid := auth.uid();
  v_ref_code text;
  v_deleted integer;
BEGIN
  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'authenticated user required';
  END IF;

  SELECT cl.ref_code
  INTO v_ref_code
  FROM public.capture_links cl
  WHERE cl.id = p_link_id
    AND cl.owner_user_id = v_owner_user_id
    AND cl.deleted_at IS NULL;

  IF v_ref_code IS NULL THEN
    RAISE EXCEPTION 'capture link not found';
  END IF;

  DELETE FROM public.form_progress_events
  WHERE capture_ref = v_ref_code;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_my_capture_link_progress(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_my_capture_link_progress(bigint) TO authenticated;

COMMENT ON FUNCTION public.reset_my_capture_link_progress(bigint) IS
'Borra los eventos de progreso (visitas/paso1/paso2) de un link propio. No afecta los leads ya capturados por ese link.';

NOTIFY pgrst, 'reload schema';
