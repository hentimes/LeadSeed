-- 067 - Reducir la superficie de RPC expuesta a anon
--
-- Auditoria de seguridad: 53 funciones SECURITY DEFINER tenian EXECUTE
-- heredado para anon (el asesor de Supabase lo reporta en bloque). La
-- mayoria son *_my_* o admin_* -solo tienen sentido desde una sesion
-- logueada- y ya validan auth.uid() o el rol internamente (confirmado
-- antes: admin_transfer_leads y list_admin_user_leads devuelven
-- 'authentication required' al llamarlas como anon), asi que no eran
-- explotables, pero si superficie innecesaria: cada funcion accesible
-- de mas es una que un cambio futuro puede exponer por accidente.
--
-- Se verifico el consumidor real de cada RPC antes de tocar nada:
-- form-leads, form-public-availability y form-lead-abandoned -las tres
-- edge functions que atienden el formulario publico- se conectan con
-- SUPABASE_SERVICE_ROLE_KEY, no con la anon key. service_role ya tiene
-- EXECUTE independiente de cualquier grant a anon (verificado:
-- has_function_privilege('service_role', ..., 'EXECUTE') = true), asi
-- que el grant a anon en estas funciones nunca fue necesario para que
-- el formulario publico funcionara: solo abria una puerta de entrada
-- redundante via PostgREST directo (POST /rest/v1/rpc/<funcion>).
--
-- Dos grupos:
--
--   1) 100 por ciento internas a las edge functions (cero uso desde
--      src/ o desde cualquier sesion autenticada): se revoca EXECUTE
--      tanto de anon como de authenticated. El camino real -edge
--      function con service_role- no se ve afectado.
--
--   2) *_my_*, admin_* y utilitarios internos que SI usa la extension
--      desde sesiones logueadas: se revoca solo de anon. authenticated
--      no se toca.
--
-- Se dejan sin tocar is_current_profile_admin() e is_current_profile_staff():
-- se evaluan dentro de USING de policies RLS, y ahi el chequeo de EXECUTE
-- corre con el rol que hace la consulta original, no con el dueño de la
-- funcion. Revocarlas sin poder probar cada policy que las referencia
-- arriesga romper evaluaciones legitimas; no son alcanzables como fuga
-- de datos por si solas (devuelven un booleano).

-- ---------------------------------------------------------------------------
-- Grupo 1: 100 por ciento internas a las edge functions
-- ---------------------------------------------------------------------------
revoke execute on function public.get_planespro_public_available_slots(p_capture_ref text, p_source_channel text, p_start_date date, p_days integer) from anon, authenticated;
revoke execute on function public.record_planespro_public_abandonment(p_payload jsonb) from anon, authenticated;
revoke execute on function public.resolve_planespro_booking_context(p_capture_ref text, p_source_channel text) from anon, authenticated;
revoke execute on function public.submit_planespro_public_lead(p_payload jsonb) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Grupo 2: uso real desde sesiones autenticadas, sin motivo para anon
-- ---------------------------------------------------------------------------
revoke execute on function public.add_my_appointment_participant(p_appointment_id uuid, p_email text, p_name text, p_participant_role text) from anon;
revoke execute on function public.admin_transfer_leads(target_user_id uuid, lead_ids uuid[]) from anon;
revoke execute on function public.admin_transfer_templates(target_user_id uuid, template_ids uuid[]) from anon;
revoke execute on function public.cancel_active_appointments_for_deleted_lead() from anon;
revoke execute on function public.cancel_my_appointment(p_appointment_id uuid, p_reason text) from anon;
revoke execute on function public.clean_old_chat_messages() from anon;
revoke execute on function public.count_my_forgotten_leads(p_search text, p_list_id bigint, p_status text, p_date_filter text) from anon;
revoke execute on function public.create_my_appointment_from_lead(p_lead_id uuid, p_starts_at timestamp with time zone, p_note text) from anon;
revoke execute on function public.create_my_availability_block(p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_block_type text, p_note text) from anon;
revoke execute on function public.create_my_capture_link(p_label text, p_campaign_name text, p_ref_code text, p_stats_config jsonb, p_metadata jsonb, p_is_default boolean) from anon;
revoke execute on function public.deactivate_my_capture_link(p_link_id bigint) from anon;
revoke execute on function public.delete_my_appointment_participant(p_participant_id uuid) from anon;
revoke execute on function public.delete_my_availability_block(p_block_id uuid) from anon;
revoke execute on function public.emit_admin_lead_created_events() from anon;
revoke execute on function public.emit_user_lead_alert_event() from anon;
revoke execute on function public.ensure_lead_appointment_participant(p_appointment_id uuid, p_user_id uuid, p_lead_id uuid) from anon;
revoke execute on function public.ensure_user_calendar_defaults(p_user_id uuid) from anon;
revoke execute on function public.generate_capture_ref(p_label text) from anon;
revoke execute on function public.generate_capture_short_code(p_length integer) from anon;
revoke execute on function public.generate_unique_capture_ref(p_length integer) from anon;
revoke execute on function public.get_available_slots(p_user_id uuid, p_start_date date, p_days integer) from anon;
revoke execute on function public.get_my_calendar_connection_status() from anon;
revoke execute on function public.get_my_calendar_settings() from anon;
revoke execute on function public.get_my_capture_link_stats(p_link_id bigint) from anon;
revoke execute on function public.get_my_dashboard_snapshot(p_compare_period text) from anon;
revoke execute on function public.get_my_features() from anon;
revoke execute on function public.handle_lead_cross_exec_sync() from anon;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.increment_telemetry(p_user_id uuid, p_section text, p_seconds integer) from anon;
revoke execute on function public.list_admin_user_appointments(p_observed_user_id uuid, p_from date, p_to date) from anon;
revoke execute on function public.list_admin_user_lead_alerts() from anon;
revoke execute on function public.list_admin_user_leads(p_observed_user_id uuid, p_limit integer) from anon;
revoke execute on function public.list_admin_user_templates(p_observed_user_id uuid) from anon;
revoke execute on function public.list_my_appointment_audit_events(p_from date, p_to date) from anon;
revoke execute on function public.list_my_appointment_participants(p_from date, p_to date) from anon;
revoke execute on function public.list_my_appointments(p_from date, p_to date) from anon;
revoke execute on function public.list_my_availability_blocks(p_from date, p_to date) from anon;
revoke execute on function public.list_my_availability_rules() from anon;
revoke execute on function public.list_my_capture_links() from anon;
revoke execute on function public.list_my_forgotten_leads(p_search text, p_list_id bigint, p_status text, p_date_filter text, p_sort_field text, p_sort_direction text, p_page integer, p_page_size integer) from anon;
revoke execute on function public.mark_admin_user_leads_seen(p_observed_user_id uuid) from anon;
revoke execute on function public.promote_lead_to_contacted() from anon;
revoke execute on function public.rebuild_lead_cross_exec_events(p_lead_id uuid) from anon;
revoke execute on function public.reschedule_my_appointment(p_appointment_id uuid, p_starts_at timestamp with time zone) from anon;
revoke execute on function public.save_my_availability_rules(p_rules jsonb) from anon;
revoke execute on function public.update_my_calendar_settings(p_timezone text, p_slot_duration_minutes integer, p_slot_buffer_minutes integer, p_allow_public_booking boolean) from anon;
revoke execute on function public.update_my_capture_link(p_link_id bigint, p_label text, p_campaign_name text, p_is_active boolean, p_stats_config jsonb, p_metadata jsonb, p_is_default boolean) from anon;
