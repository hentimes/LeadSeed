-- form_lead_two_phase_submit
--
-- Reconstruida por auditoria de drift: esta migracion ya estaba aplicada en
-- Supabase (registrada en supabase_migrations.schema_migrations con este
-- mismo timestamp) pero no existia como archivo en ningun lugar de este
-- checkout. Se reconstruye aca con el contenido EXACTO extraido de la base
-- via pg_get_functiondef, no reescrito de memoria, para no arriesgar
-- introducir una diferencia entre lo que dice el archivo y lo que corre en
-- produccion.
--
-- Que hace: agrega submit_planespro_idempotent_public_lead, un wrapper
-- sobre submit_planespro_public_lead (sin modificarla) que evita crear
-- leads duplicados si el formulario publico reintenta el envio -por ejemplo
-- por un corte de red-. El cliente genera un submission_id (UUID v4) y un
-- update_token; si ya existe un lead con ese submission_id en su metadata,
-- devuelve el lead existente en vez de crear uno nuevo. No crea tablas
-- nuevas: guarda form_submission_id y form_update_token dentro del
-- metadata jsonb ya existente de leads.
--
-- No requiere aplicarse de nuevo: el objetivo de este archivo es que el
-- historial local coincida con lo que ya esta en produccion, no cambiar
-- nada ahi.

CREATE OR REPLACE FUNCTION public.submit_planespro_idempotent_public_lead(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_submission_id text := nullif(trim(coalesce(p_payload ->> 'submission_id', '')), '');
  v_update_token text := nullif(trim(coalesce(p_payload ->> 'update_token', '')), '');
  v_lead public.leads%rowtype;
  v_result jsonb;
  v_lead_id uuid;
begin
  if v_submission_id is null or v_submission_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'invalid submission_id';
  end if;

  if v_update_token is null or length(v_update_token) < 32 or length(v_update_token) > 128 then
    raise exception 'invalid update_token';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_submission_id, 0));

  select *
  into v_lead
  from public.leads
  where metadata ->> 'form_submission_id' = v_submission_id
  limit 1;

  if found then
    if coalesce(v_lead.metadata ->> 'form_update_token', '') <> v_update_token then
      raise exception 'invalid update token';
    end if;

    return jsonb_build_object(
      'lead_id', v_lead.id,
      'assigned_user_id', v_lead.user_id,
      'appointment_id', v_lead.metadata ->> 'appointment_id',
      'source_channel', v_lead.metadata ->> 'source_channel',
      'status', 'existing',
      'submission_id', v_submission_id
    );
  end if;

  -- Never persist the bearer update token inside the historical raw payload.
  v_payload := v_payload - 'update_token' - 'action_only' - 'lead_id' - 'existing_lead_id';
  v_result := public.submit_planespro_public_lead(v_payload);
  v_lead_id := nullif(v_result ->> 'lead_id', '')::uuid;

  if v_lead_id is null then
    raise exception 'lead creation did not return an id';
  end if;

  update public.leads
  set
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'form_submission_id', v_submission_id,
      'form_update_token', v_update_token,
      'form_contact_state', 'pending'
    ),
    updated_at = timezone('utc'::text, now())
  where id = v_lead_id;

  return v_result || jsonb_build_object(
    'submission_id', v_submission_id,
    'status', 'created_pending'
  );
end;
$function$
