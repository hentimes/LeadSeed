-- Reconciliacion de historial de migraciones. CONTROL 2026-08-12.
--
-- Tipo: Query permanente (reconciliacion idempotente, sin efecto en produccion).
-- Objeto: public.leads (indice), public.submit_planespro_idempotent_public_lead,
--         public.update_planespro_public_lead_action.
-- Clase: indice unico parcial + dos funciones SECURITY DEFINER.
-- Proposito: cerrar un drift real detectado en AUDITORIA_CONTROL_2026-08-11.md.
--   El contrato de dos fases de /form y /retiro-tecnico-extranjero vive en produccion,
--   pero su migracion solo existia en el repo landing-gerow. Este repo tenia el mismo
--   timestamp 20260803000100 con contenido distinto e incompleto: le faltaban el indice
--   leads_form_submission_id_uidx y la funcion update_planespro_public_lead_action.
--   Como ambos repos comparten supabase_migrations.schema_migrations, el CLI consideraba
--   esa version ya aplicada y el drift quedaba invisible.
-- Dependencias: public.leads, public.capture_links, public.submit_planespro_public_lead.
-- Impacto: nulo en produccion. Todo el bloque es idempotente (create index if not exists,
--   create or replace function), por lo que re-aplicarlo no altera el estado actual.
--   El valor es que un supabase db reset desde este repo reconstruya el esquema completo.
-- Persistencia: permanente.
-- Reversibilidad: no aplica; no elimina ni modifica datos.
--
-- No reutilizar el timestamp 20260803000100: ya esta registrado como aplicado.

-- Preserve /form leads before the optional contact-time choice without creating duplicates.

create unique index if not exists leads_form_submission_id_uidx
  on public.leads ((metadata ->> 'form_submission_id'))
  where metadata ->> 'form_submission_id' is not null;

create or replace function public.submit_planespro_idempotent_public_lead(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
$function$;

create or replace function public.update_planespro_public_lead_action(
  p_lead_id uuid,
  p_submission_id text,
  p_update_token text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_safe_payload jsonb;
  v_lead public.leads%rowtype;
  v_action text := lower(nullif(trim(coalesce(
    p_payload ->> 'post_submit_action',
    p_payload ->> 'contacto_preferencia',
    ''
  )), ''));
  v_contact_preference text;
  v_slot text := nullif(trim(coalesce(
    p_payload ->> 'cita_fecha_hora',
    p_payload ->> 'scheduled_at',
    ''
  )), '');
  v_notes text := nullif(trim(coalesce(
    p_payload ->> 'notes',
    p_payload ->> 'comentarios',
    p_payload ->> 'comentario',
    p_payload ->> 'message',
    p_payload ->> 'mensaje',
    ''
  )), '');
  v_appointment_id uuid;
  v_existing_appointment_id uuid;
begin
  if p_lead_id is null or p_submission_id is null or p_update_token is null then
    raise exception 'missing lead update credentials';
  end if;

  if v_action not in ('whatsapp_inmediato', 'agendar_reunion') then
    raise exception 'invalid contact action';
  end if;

  if v_action = 'agendar_reunion' and v_slot is null then
    raise exception 'appointment slot is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_submission_id, 0));

  select *
  into v_lead
  from public.leads
  where id = p_lead_id
    and metadata ->> 'form_submission_id' = p_submission_id
    and metadata ->> 'form_update_token' = p_update_token
  limit 1;

  if not found then
    raise exception 'lead update credentials are invalid';
  end if;

  if v_lead.metadata ->> 'form_contact_state' = 'completed' then
    if v_lead.metadata ->> 'form_contact_action' <> v_action
      or coalesce(v_lead.metadata ->> 'form_contact_slot', '') <> coalesce(v_slot, '') then
      raise exception 'lead contact action is already completed';
    end if;

    v_existing_appointment_id := nullif(v_lead.metadata ->> 'appointment_id', '')::uuid;
    return jsonb_build_object(
      'lead_id', v_lead.id,
      'appointment_id', v_existing_appointment_id,
      'status', 'already_updated',
      'post_submit_action', v_action
    );
  end if;

  v_contact_preference := case
    when v_action = 'agendar_reunion' then 'agendar_reunion'
    else 'lo_antes_posible'
  end;
  v_safe_payload := v_payload - 'update_token' - 'action_only' - 'lead_id' - 'existing_lead_id';

  update public.leads
  set
    notes = coalesce(v_notes, notes),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'contact_preference', v_contact_preference,
      'appointment_status', nullif(trim(coalesce(v_payload ->> 'cita_estado', '')), ''),
      'source_cta', nullif(trim(coalesce(v_payload ->> 'source_cta', v_payload ->> 'fuente_cta', '')), ''),
      'raw_payload', coalesce(metadata -> 'raw_payload', '{}'::jsonb) || v_safe_payload,
      'form_contact_state', 'updating',
      'form_contact_action', v_action,
      'form_contact_slot', coalesce(v_slot, '')
    ),
    updated_at = timezone('utc'::text, now())
  where id = p_lead_id;

  if v_action = 'agendar_reunion' then
    v_appointment_id := public.create_planespro_appointment_for_lead(p_lead_id, v_safe_payload);
  end if;

  update public.leads
  set
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'form_contact_state', 'completed',
      'form_contact_completed_at', timezone('utc'::text, now()),
      'appointment_id', v_appointment_id
    ),
    updated_at = timezone('utc'::text, now())
  where id = p_lead_id;

  return jsonb_build_object(
    'lead_id', p_lead_id,
    'appointment_id', v_appointment_id,
    'status', 'updated',
    'post_submit_action', v_action
  );
end;
$function$;

revoke all on function public.submit_planespro_idempotent_public_lead(jsonb) from public, anon, authenticated;
revoke all on function public.update_planespro_public_lead_action(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.submit_planespro_idempotent_public_lead(jsonb) to service_role;
grant execute on function public.update_planespro_public_lead_action(uuid, text, text, jsonb) to service_role;
