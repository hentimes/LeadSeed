WITH candidate_leads AS (
  SELECT
    l.id AS lead_id,
    l.user_id AS current_user_id,
    l.metadata,
    public.resolve_planespro_capture_ref_from_payload(
      coalesce(l.metadata->'raw_payload', '{}'::jsonb)
        || jsonb_build_object(
          'source_url', coalesce(l.metadata->>'source_url', ''),
          'capture_ref', coalesce(l.metadata->>'capture_ref', ''),
          'first_touch_ref', coalesce(l.metadata->>'first_touch_ref', '')
        ),
      l.metadata->>'capture_ref'
    ) AS resolved_capture_ref
  FROM public.leads l
  WHERE coalesce(l.metadata->>'source_channel', '') = 'pb'
    AND coalesce(l.metadata->>'source_url', '') LIKE '%/pb/%'
), lead_context AS (
  SELECT
    c.lead_id,
    c.current_user_id,
    c.metadata,
    ctx.owner_user_id,
    ctx.capture_link_id,
    ctx.capture_ref,
    ctx.link_name,
    ctx.campaign_name
  FROM candidate_leads c
  CROSS JOIN LATERAL public.resolve_planespro_booking_context(c.resolved_capture_ref, 'pb') AS ctx
  WHERE c.resolved_capture_ref IS NOT NULL
    AND (
      c.current_user_id IS DISTINCT FROM ctx.owner_user_id
      OR coalesce(c.metadata->>'capture_ref', '') IS DISTINCT FROM coalesce(ctx.capture_ref, '')
      OR coalesce(c.metadata->>'capture_link_id', '') IS DISTINCT FROM coalesce(ctx.capture_link_id::text, '')
      OR coalesce(c.metadata->>'capture_link_name', '') IS DISTINCT FROM coalesce(ctx.link_name, '')
      OR coalesce(c.metadata->>'capture_campaign', '') IS DISTINCT FROM coalesce(ctx.campaign_name, '')
    )
), repaired_leads AS (
  UPDATE public.leads AS l
  SET
    user_id = ctx.owner_user_id,
    metadata = coalesce(l.metadata, '{}'::jsonb)
      || jsonb_build_object(
        'capture_ref', ctx.capture_ref,
        'first_touch_ref', coalesce(nullif(l.metadata->>'first_touch_ref', ''), ctx.capture_ref),
        'capture_link_id', ctx.capture_link_id,
        'capture_link_name', ctx.link_name,
        'capture_campaign', ctx.campaign_name,
        'source_channel', 'pb',
        'raw_payload',
          jsonb_set(
            jsonb_set(
              coalesce(l.metadata->'raw_payload', '{}'::jsonb),
              '{capture_ref}',
              to_jsonb(ctx.capture_ref),
              true
            ),
            '{first_touch_ref}',
            to_jsonb(coalesce(nullif(l.metadata->>'first_touch_ref', ''), ctx.capture_ref)),
            true
          )
      ),
    updated_at = timezone('utc'::text, now())
  FROM lead_context AS ctx
  WHERE l.id = ctx.lead_id
  RETURNING
    l.id AS lead_id,
    ctx.owner_user_id,
    ctx.capture_link_id,
    ctx.capture_ref,
    ctx.link_name,
    ctx.campaign_name
), repaired_appointments AS (
  UPDATE public.appointments AS a
  SET
    user_id = rl.owner_user_id,
    source_channel = 'pb',
    capture_link_id = rl.capture_link_id,
    capture_ref = rl.capture_ref,
    metadata = coalesce(a.metadata, '{}'::jsonb)
      || jsonb_build_object(
        'capture_link_name', rl.link_name,
        'capture_campaign', rl.campaign_name,
        'source_payload',
          jsonb_set(
            jsonb_set(
              coalesce(a.metadata->'source_payload', '{}'::jsonb),
              '{capture_ref}',
              to_jsonb(rl.capture_ref),
              true
            ),
            '{first_touch_ref}',
            to_jsonb(
              coalesce(
                nullif((SELECT metadata->>'first_touch_ref' FROM public.leads WHERE id = a.lead_id), ''),
                rl.capture_ref
              )
            ),
            true
          )
      ),
    google_event_id = CASE WHEN a.status = 'cancelada' THEN NULL ELSE a.google_event_id END,
    meet_link = CASE WHEN a.status = 'cancelada' THEN NULL ELSE a.meet_link END,
    google_sync_status = CASE WHEN a.status = 'cancelada' THEN 'skipped' ELSE a.google_sync_status END,
    google_sync_error = CASE WHEN a.status = 'cancelada' THEN 'historical_pb_owner_repair' ELSE a.google_sync_error END,
    google_synced_at = CASE WHEN a.status = 'cancelada' THEN NULL ELSE a.google_synced_at END,
    updated_at = timezone('utc'::text, now())
  FROM repaired_leads AS rl
  WHERE a.lead_id = rl.lead_id
  RETURNING a.id
)
SELECT
  (SELECT count(*) FROM repaired_leads) AS repaired_leads,
  (SELECT count(*) FROM repaired_appointments) AS repaired_appointments;
