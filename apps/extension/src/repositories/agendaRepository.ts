import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export interface CalendarSettingsRow {
  user_id: string;
  timezone: string;
  slot_duration_minutes: number | null;
  slot_buffer_minutes: number | null;
  allow_public_booking: boolean | null;
  google_calendar_id: string | null;
  updated_at: string;
}

export interface CalendarConnectionStatusRow {
  provider: string | null;
  google_email: string | null;
  calendar_id: string | null;
  connected_at: string | null;
  token_scope: string | null;
  token_expires_at: string | null;
  last_sync_started_at: string | null;
  last_sync_finished_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  is_connected: boolean | null;
}

export interface AvailabilityRuleRow {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean | null;
  updated_at: string;
}

export interface AvailabilityBlockRow {
  id: string;
  starts_at: string;
  ends_at: string;
  block_type: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgendaAppointmentRow {
  id: string;
  lead_id: string | null;
  lead_name: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  source_channel: string | null;
  capture_ref: string | null;
  notes: string | null;
  outcome_notes: string | null;
  outcome_recorded_at: string | null;
  meet_link: string | null;
  google_event_id: string | null;
  google_sync_status: string | null;
  google_sync_error: string | null;
  google_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleCalendarSyncRow {
  ok: boolean;
  source: string;
  calendar_id: string;
  from: string;
  to: string;
  busy_count: number;
}

export interface AppointmentParticipantRow {
  id: string;
  appointment_id: string;
  email: string;
  name: string | null;
  participant_role: string;
  invitation_status: string;
  google_sync_error: string | null;
  google_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleCalendarAttendeesSyncRow {
  ok: boolean;
  status: 'synced' | 'skipped';
  reason?: string;
  attendees_count: number;
}

export interface GoogleCalendarEventSyncRow {
  ok: boolean;
  status: 'synced' | 'skipped';
  action?: 'reschedule' | 'cancel';
  reason?: string;
}

export interface GoogleCalendarCreateEventRow {
  ok: boolean;
  status: 'synced' | 'skipped' | 'error' | 'already_synced';
  google_event_id?: string;
  meet_link?: string;
  reason?: string;
}

export interface AppointmentAuditEventRow {
  id: string;
  appointment_id: string;
  event_type: string;
  previous_status: string | null;
  next_status: string | null;
  previous_start_time: string | null;
  next_start_time: string | null;
  previous_end_time: string | null;
  next_end_time: string | null;
  note: string | null;
  created_at: string;
}

interface UpdateCalendarSettingsArgs {
  p_timezone: string;
  p_slot_duration_minutes: number;
  p_slot_buffer_minutes: number;
  p_allow_public_booking: boolean;
}

export interface AvailabilityRuleArgs {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface DateRangeArgs {
  p_from: string;
  p_to: string;
}

interface CreateAvailabilityBlockArgs {
  p_starts_at: string;
  p_ends_at: string;
  p_block_type: 'manual' | 'full_day';
  p_note?: string | null;
}

interface AddAppointmentParticipantArgs {
  p_appointment_id: string;
  p_email: string;
  p_name?: string | null;
  p_participant_role?: 'guest' | 'lead' | 'internal';
}

interface CreateAppointmentFromLeadArgs {
  p_lead_id: string;
  p_starts_at: string;
  p_note?: string | null;
}

export async function fetchMyCalendarSettingsRow(): Promise<CalendarSettingsRow> {
  const { data, error } = await supabase.rpc('get_my_calendar_settings');
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as CalendarSettingsRow;
}

export async function updateMyCalendarSettingsRow(args: UpdateCalendarSettingsArgs): Promise<CalendarSettingsRow> {
  const { data, error } = await supabase.rpc('update_my_calendar_settings', args);
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as CalendarSettingsRow;
}

export async function fetchMyCalendarConnectionStatusRow(): Promise<CalendarConnectionStatusRow | null> {
  const { data, error } = await supabase.rpc('get_my_calendar_connection_status');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? null) as CalendarConnectionStatusRow | null;
}

export async function fetchMyAvailabilityRuleRows(): Promise<AvailabilityRuleRow[]> {
  const { data, error } = await supabase.rpc('list_my_availability_rules');
  if (error) throw error;
  return (data ?? []) as AvailabilityRuleRow[];
}

export async function saveMyAvailabilityRuleRows(rules: AvailabilityRuleArgs[]): Promise<AvailabilityRuleRow[]> {
  const { data, error } = await supabase.rpc('save_my_availability_rules', {
    p_rules: rules,
  });
  if (error) throw error;
  return (data ?? []) as AvailabilityRuleRow[];
}

export async function fetchMyAvailabilityBlockRows(args: DateRangeArgs): Promise<AvailabilityBlockRow[]> {
  const { data, error } = await supabase.rpc('list_my_availability_blocks', args);
  if (error) throw error;
  return (data ?? []) as AvailabilityBlockRow[];
}

export async function createMyAvailabilityBlockRow(args: CreateAvailabilityBlockArgs): Promise<AvailabilityBlockRow> {
  const { data, error } = await supabase.rpc('create_my_availability_block', args);
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as AvailabilityBlockRow;
}

export async function deleteMyAvailabilityBlockRow(blockId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_my_availability_block', {
    p_block_id: blockId,
  });
  if (error) throw error;
}

export async function fetchMyAppointmentRows(args: DateRangeArgs): Promise<AgendaAppointmentRow[]> {
  const { data, error } = await supabase.rpc('list_my_appointments', args);
  if (error) throw error;
  return (data ?? []) as AgendaAppointmentRow[];
}

/** Lo que devuelve el cierre atomico de una cita. */
export interface CloseAppointmentRow {
  appointment_id: string;
  status: string;
  outcome_recorded_at: string | null;
  note_created: boolean;
  tasks_created: number;
}

/**
 * Cierra una cita y crea su nota y sus tareas en UNA transaccion.
 *
 * Sustituye a la cadena de tres llamadas: si fallaba una de las de despues, la
 * cita quedaba cerrada -y por tanto fuera de "Por registrar"- con el
 * seguimiento sin crear y sin forma de reintentarlo.
 */
export async function closeMyAppointmentRow(args: {
  appointmentId: string;
  attended: boolean;
  outcomeNotes?: string;
  alsoLeadNote: boolean;
  tasks: { title: string; dueDate: string | null }[];
}): Promise<CloseAppointmentRow> {
  const { data, error } = await supabase.rpc('close_my_appointment', {
    p_appointment_id: args.appointmentId,
    p_attended: args.attended,
    p_outcome_notes: args.outcomeNotes || null,
    p_also_lead_note: args.alsoLeadNote,
    p_tasks: args.tasks,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as CloseAppointmentRow;
}

export async function recordMyAppointmentOutcomeRow(
  appointmentId: string,
  attended: boolean,
  outcomeNotes?: string,
): Promise<AgendaAppointmentRow> {
  const { data, error } = await supabase.rpc('record_my_appointment_outcome', {
    p_appointment_id: appointmentId,
    p_attended: attended,
    p_outcome_notes: outcomeNotes || null,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as AgendaAppointmentRow;
}

export async function createMyAppointmentFromLeadRow(args: CreateAppointmentFromLeadArgs): Promise<AgendaAppointmentRow> {
  const { data, error } = await supabase.rpc('create_my_appointment_from_lead', args);
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as AgendaAppointmentRow;
}

export async function rescheduleMyAppointmentRow(appointmentId: string, startsAt: string): Promise<AgendaAppointmentRow> {
  const { data, error } = await supabase.rpc('reschedule_my_appointment', {
    p_appointment_id: appointmentId,
    p_starts_at: startsAt,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as AgendaAppointmentRow;
}

export async function cancelMyAppointmentRow(appointmentId: string, reason?: string): Promise<AgendaAppointmentRow> {
  const { data, error } = await supabase.rpc('cancel_my_appointment', {
    p_appointment_id: appointmentId,
    p_reason: reason || null,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as AgendaAppointmentRow;
}

export async function fetchMyAppointmentParticipantRows(args: DateRangeArgs): Promise<AppointmentParticipantRow[]> {
  const { data, error } = await supabase.rpc('list_my_appointment_participants', args);
  if (error) throw error;
  return (data ?? []) as AppointmentParticipantRow[];
}

export async function fetchMyAppointmentAuditEventRows(args: DateRangeArgs): Promise<AppointmentAuditEventRow[]> {
  const { data, error } = await supabase.rpc('list_my_appointment_audit_events', args);
  if (error) throw error;
  return (data ?? []) as AppointmentAuditEventRow[];
}

export async function addMyAppointmentParticipantRow(args: AddAppointmentParticipantArgs): Promise<AppointmentParticipantRow> {
  const { data, error } = await supabase.rpc('add_my_appointment_participant', args);
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as AppointmentParticipantRow;
}

export async function deleteMyAppointmentParticipantRow(participantId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_my_appointment_participant', {
    p_participant_id: participantId,
  });
  if (error) throw error;
}

export async function syncMyGoogleCalendarRows(days = 30): Promise<GoogleCalendarSyncRow> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error('Sesion requerida para sincronizar Google Calendar');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ days }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : 'No se pudo sincronizar Google Calendar';
    throw new Error(message);
  }

  return payload as GoogleCalendarSyncRow;
}

export async function createMyGoogleCalendarEventRow(appointmentId: string): Promise<GoogleCalendarCreateEventRow> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error('Sesion requerida para crear evento Google Calendar');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-create-event`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ appointment_id: appointmentId }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : 'No se pudo crear el evento Google Calendar';
    throw new Error(message);
  }

  return payload as GoogleCalendarCreateEventRow;
}

export async function syncMyGoogleCalendarAttendeesRow(appointmentId: string): Promise<GoogleCalendarAttendeesSyncRow> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error('Sesion requerida para sincronizar participantes');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-sync-attendees`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ appointment_id: appointmentId }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : 'No se pudieron sincronizar los participantes con Google Calendar';
    throw new Error(message);
  }

  return payload as GoogleCalendarAttendeesSyncRow;
}

export async function syncMyGoogleCalendarEventRow(appointmentId: string, action: 'reschedule' | 'cancel'): Promise<GoogleCalendarEventSyncRow> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error('Sesion requerida para sincronizar Google Calendar');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-update-event`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ appointment_id: appointmentId, action }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : 'No se pudo sincronizar la cita con Google Calendar';
    throw new Error(message);
  }

  return payload as GoogleCalendarEventSyncRow;
}

export async function subscribeMyAgendaRows(onChange: () => void): Promise<RealtimeChannel | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const userId = data.user.id;
  const channel = supabase
    .channel(`agenda_user_${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `user_id=eq.${userId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_participants', filter: `user_id=eq.${userId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_availability', filter: `user_id=eq.${userId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_availability_blocks', filter: `user_id=eq.${userId}` }, onChange)
    .subscribe();

  return channel;
}

export async function unsubscribeAgendaRows(channel: RealtimeChannel): Promise<void> {
  await supabase.removeChannel(channel);
}
