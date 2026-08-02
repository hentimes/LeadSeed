-- 068 - Cerrar el grant residual a PUBLIC en las funciones de la 067
--
-- La migracion 067 revoco EXECUTE de anon (y de authenticated en los 4
-- casos 100 por ciento internos), pero has_function_privilege() siguio
-- devolviendo true para varias: 38 de las 53 seguian "ejecutables" por
-- anon despues de aplicarla. Causa real: ademas del grant especifico a
-- anon/authenticated, estas funciones tenian un GRANT EXECUTE ... TO
-- PUBLIC directo -el comportamiento por defecto de Postgres al crear una
-- funcion, que nadie habia revocado nunca-. PUBLIC es un pseudo-rol que
-- todo rol hereda implicitamente, asi que revocar de anon puntualmente
-- no alcanza mientras ese grant siga ahi: es la fuga que el asesor de
-- Supabase reportaba como "EXECUTE heredado".
--
-- Se confirmo antes de tocar nada que authenticated y service_role
-- tienen su PROPIO grant explicito, separado del de PUBLIC (visible en
-- information_schema.routine_privileges como filas independientes), asi
-- que revocar PUBLIC no les quita nada: solo cierra el acceso que anon
-- -sin ningun grant propio- obtenia por herencia.

revoke execute on function public.add_my_appointment_participant(p_appointment_id uuid, p_email text, p_name text, p_participant_role text) from public;
revoke execute on function public.admin_transfer_leads(target_user_id uuid, lead_ids uuid[]) from public;
revoke execute on function public.admin_transfer_templates(target_user_id uuid, template_ids uuid[]) from public;
revoke execute on function public.cancel_active_appointments_for_deleted_lead() from public;
revoke execute on function public.cancel_my_appointment(p_appointment_id uuid, p_reason text) from public;
revoke execute on function public.clean_old_chat_messages() from public;
revoke execute on function public.create_my_appointment_from_lead(p_lead_id uuid, p_starts_at timestamp with time zone, p_note text) from public;
revoke execute on function public.create_my_availability_block(p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_block_type text, p_note text) from public;
revoke execute on function public.delete_my_appointment_participant(p_participant_id uuid) from public;
revoke execute on function public.delete_my_availability_block(p_block_id uuid) from public;
revoke execute on function public.emit_admin_lead_created_events() from public;
revoke execute on function public.emit_user_lead_alert_event() from public;
revoke execute on function public.generate_capture_ref(p_label text) from public;
revoke execute on function public.generate_capture_short_code(p_length integer) from public;
revoke execute on function public.generate_unique_capture_ref(p_length integer) from public;
revoke execute on function public.get_available_slots(p_user_id uuid, p_start_date date, p_days integer) from public;
revoke execute on function public.get_my_calendar_connection_status() from public;
revoke execute on function public.get_my_calendar_settings() from public;
revoke execute on function public.get_my_features() from public;
revoke execute on function public.handle_lead_cross_exec_sync() from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.increment_telemetry(p_user_id uuid, p_section text, p_seconds integer) from public;
revoke execute on function public.list_admin_user_appointments(p_observed_user_id uuid, p_from date, p_to date) from public;
revoke execute on function public.list_admin_user_lead_alerts() from public;
revoke execute on function public.list_admin_user_leads(p_observed_user_id uuid, p_limit integer) from public;
revoke execute on function public.list_admin_user_templates(p_observed_user_id uuid) from public;
revoke execute on function public.list_my_appointment_audit_events(p_from date, p_to date) from public;
revoke execute on function public.list_my_appointment_participants(p_from date, p_to date) from public;
revoke execute on function public.list_my_appointments(p_from date, p_to date) from public;
revoke execute on function public.list_my_availability_blocks(p_from date, p_to date) from public;
revoke execute on function public.list_my_availability_rules() from public;
revoke execute on function public.mark_admin_user_leads_seen(p_observed_user_id uuid) from public;
revoke execute on function public.promote_lead_to_contacted() from public;
revoke execute on function public.rebuild_lead_cross_exec_events(p_lead_id uuid) from public;
revoke execute on function public.reschedule_my_appointment(p_appointment_id uuid, p_starts_at timestamp with time zone) from public;
revoke execute on function public.save_my_availability_rules(p_rules jsonb) from public;
revoke execute on function public.submit_planespro_public_lead(p_payload jsonb) from public;
revoke execute on function public.update_my_calendar_settings(p_timezone text, p_slot_duration_minutes integer, p_slot_buffer_minutes integer, p_allow_public_booking boolean) from public;
