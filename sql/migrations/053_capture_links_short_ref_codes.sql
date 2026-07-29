-- Query permanente
-- Dominio: planespro / capture links / short public refs
-- Objetivo: usar codigos cortos reales en /pb/<codigo> sin depender de UUID visibles.

CREATE OR REPLACE FUNCTION public.generate_capture_short_code(p_length integer DEFAULT 6)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alphabet constant text := '23456789abcdefghjkmnpqrstuvwxyz';
  v_code text := '';
  v_length integer := greatest(4, least(coalesce(p_length, 6), 12));
  v_index integer;
BEGIN
  FOR v_index IN 1..v_length LOOP
    v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
  END LOOP;

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_unique_capture_ref(p_length integer DEFAULT 6)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate text;
  v_attempts integer := 0;
BEGIN
  LOOP
    v_attempts := v_attempts + 1;
    v_candidate := public.generate_capture_short_code(
      CASE WHEN v_attempts > 20 THEN 8 ELSE p_length END
    );

    IF NOT EXISTS (
      SELECT 1
      FROM public.capture_links cl
      WHERE cl.ref_code = v_candidate
    ) THEN
      RETURN v_candidate;
    END IF;

    IF v_attempts >= 80 THEN
      RAISE EXCEPTION 'could not generate unique capture ref';
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_capture_ref(p_label text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.generate_unique_capture_ref(6);
END;
$$;

DO $$
DECLARE
  v_link record;
  v_new_ref text;
BEGIN
  FOR v_link IN
    SELECT id, ref_code
    FROM public.capture_links
    WHERE deleted_at IS NULL
      AND (
        ref_code ~ '^pp-[0-9a-f]{32}$'
        OR char_length(ref_code) > 12
      )
  LOOP
    v_new_ref := public.generate_unique_capture_ref(6);

    UPDATE public.capture_links
    SET ref_code = v_new_ref,
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('legacy_ref_code', v_link.ref_code),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_link.id;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.generate_capture_ref(text) IS
  'Genera codigos publicos cortos para links /pb/<codigo>. No expone UUID ni ids internos.';
