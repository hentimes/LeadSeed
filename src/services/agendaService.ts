import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  addMyAppointmentParticipantRow,
  fetchMyAppointmentAuditEventRows,
  createMyAppointmentFromLeadRow,
  createMyAvailabilityBlockRow,
  createMyGoogleCalendarEventRow,
  deleteMyAvailabilityBlockRow,
  deleteMyAppointmentParticipantRow,
  cancelMyAppointmentRow,
  fetchMyAppointmentRows,
  fetchMyAppointmentParticipantRows,
  fetchMyAvailabilityBlockRows,
  fetchMyAvailabilityRuleRows,
  fetchMyCalendarConnectionStatusRow,
  fetchMyCalendarSettingsRow,
  rescheduleMyAppointmentRow,
  saveMyAvailabilityRuleRows,
  syncMyGoogleCalendarAttendeesRow,
  syncMyGoogleCalendarEventRow,
  subscribeMyAgendaRows,
  syncMyGoogleCalendarRows,
  unsubscribeAgendaRows,
  updateMyCalendarSettingsRow,
  type AgendaAppointmentRow,
  type AppointmentAuditEventRow,
  type AppointmentParticipantRow,
  type AvailabilityBlockRow,
  type AvailabilityRuleRow,
  type CalendarConnectionStatusRow,
  type CalendarSettingsRow,
  type GoogleCalendarAttendeesSyncRow,
  type GoogleCalendarCreateEventRow,
  type GoogleCalendarSyncRow,
} from '../repositories/agendaRepository';
import type {
  AgendaAppointment,
  AppointmentAuditEvent,
  AppointmentMutationResult,
  AppointmentParticipant,
  AppointmentParticipantInput,
  AvailabilityBlock,
  AvailabilityBlockInput,
  AvailabilityRule,
  AvailabilityRuleInput,
  CalendarConnectionStatus,
  CalendarSettings,
  GoogleCalendarAttendeesSyncResult,
  GoogleCalendarCreateEventResult,
  GoogleCalendarSyncResult,
  LeadAppointmentInput,
} from '../types';
import { getErrorMessage } from '../utils/errorMessage';

const DEFAULT_TIMEZONE = 'America/Santiago';

function toNumber(value: number | null | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeTime(value: string): string {
  return value.slice(0, 5);
}

function mapSettingsRow(row: CalendarSettingsRow): CalendarSettings {
  return {
    userId: row.user_id,
    timezone: row.timezone || DEFAULT_TIMEZONE,
    slotDurationMinutes: toNumber(row.slot_duration_minutes, 45),
    slotBufferMinutes: toNumber(row.slot_buffer_minutes, 15),
    allowPublicBooking: row.allow_public_booking !== false,
    googleCalendarId: row.google_calendar_id || 'primary',
    updatedAt: row.updated_at,
  };
}

function mapConnectionStatusRow(row: CalendarConnectionStatusRow | null): CalendarConnectionStatus {
  return {
    provider: row?.provider || 'google',
    googleEmail: row?.google_email || '',
    calendarId: row?.calendar_id || 'primary',
    connectedAt: row?.connected_at || undefined,
    tokenScope: row?.token_scope || '',
    tokenExpiresAt: row?.token_expires_at || undefined,
    lastSyncStartedAt: row?.last_sync_started_at || undefined,
    lastSyncFinishedAt: row?.last_sync_finished_at || undefined,
    lastSyncStatus: row?.last_sync_status === 'running' || row?.last_sync_status === 'ok' || row?.last_sync_status === 'error' ? row.last_sync_status : 'idle',
    lastSyncError: row?.last_sync_error || '',
    isConnected: row?.is_connected === true,
  };
}

function mapRuleRow(row: AvailabilityRuleRow): AvailabilityRule {
  return {
    id: row.id,
    dayOfWeek: row.day_of_week,
    startTime: normalizeTime(row.start_time),
    endTime: normalizeTime(row.end_time),
    isActive: row.is_active !== false,
    updatedAt: row.updated_at,
  };
}

function mapBlockRow(row: AvailabilityBlockRow): AvailabilityBlock {
  return {
    id: row.id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    blockType: row.block_type === 'full_day' || row.block_type === 'google' || row.block_type === 'system' ? row.block_type : 'manual',
    note: row.note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAppointmentRow(row: AgendaAppointmentRow): AgendaAppointment {
  return {
    id: row.id,
    leadId: row.lead_id || undefined,
    leadName: row.lead_name || 'Lead sin nombre',
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    sourceChannel: row.source_channel || 'general',
    captureRef: row.capture_ref || undefined,
    notes: row.notes || '',
    meetLink: row.meet_link || undefined,
    googleEventId: row.google_event_id || undefined,
    googleSyncStatus: row.google_sync_status || undefined,
    googleSyncError: row.google_sync_error || undefined,
    googleSyncedAt: row.google_synced_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAuditEventType(value: string): AppointmentAuditEvent['eventType'] {
  if (
    value === 'created_from_lead' ||
    value === 'rescheduled' ||
    value === 'cancelled' ||
    value === 'google_sync_error' ||
    value === 'participant_added' ||
    value === 'participant_removed'
  ) {
    return value;
  }

  return 'rescheduled';
}

function mapAppointmentAuditEventRow(row: AppointmentAuditEventRow): AppointmentAuditEvent {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    eventType: mapAuditEventType(row.event_type),
    previousStatus: row.previous_status || undefined,
    nextStatus: row.next_status || undefined,
    previousStartTime: row.previous_start_time || undefined,
    nextStartTime: row.next_start_time || undefined,
    previousEndTime: row.previous_end_time || undefined,
    nextEndTime: row.next_end_time || undefined,
    note: row.note || '',
    createdAt: row.created_at,
  };
}

function mapParticipantRole(value: string): AppointmentParticipant['participantRole'] {
  return value === 'lead' || value === 'internal' ? value : 'guest';
}

function mapInvitationStatus(value: string): AppointmentParticipant['invitationStatus'] {
  return value === 'synced' || value === 'error' || value === 'skipped' ? value : 'pending';
}

function mapParticipantRow(row: AppointmentParticipantRow): AppointmentParticipant {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    email: row.email,
    name: row.name || '',
    participantRole: mapParticipantRole(row.participant_role),
    invitationStatus: mapInvitationStatus(row.invitation_status),
    googleSyncError: row.google_sync_error || '',
    googleSyncedAt: row.google_synced_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSyncRow(row: GoogleCalendarSyncRow): GoogleCalendarSyncResult {
  return {
    ok: row.ok,
    source: row.source,
    calendarId: row.calendar_id,
    from: row.from,
    to: row.to,
    busyCount: toNumber(row.busy_count, 0),
  };
}

function mapAttendeesSyncRow(row: GoogleCalendarAttendeesSyncRow): GoogleCalendarAttendeesSyncResult {
  return {
    ok: row.ok,
    status: row.status,
    reason: row.reason,
    attendeesCount: toNumber(row.attendees_count, 0),
  };
}

function mapCreateEventRow(row: GoogleCalendarCreateEventRow): GoogleCalendarCreateEventResult {
  return {
    ok: row.ok,
    status: row.status,
    googleEventId: row.google_event_id,
    meetLink: row.meet_link,
    reason: row.reason,
  };
}

export function getDefaultAgendaRange(days = 14): { from: string; to: string } {
  const from = new Date();
  const to = new Date();
  to.setDate(from.getDate() + days);
  return { from: toDateOnly(from), to: toDateOnly(to) };
}

export async function getMyCalendarSettings(): Promise<CalendarSettings> {
  const row = await fetchMyCalendarSettingsRow();
  return mapSettingsRow(row);
}

export async function getMyCalendarConnectionStatus(): Promise<CalendarConnectionStatus> {
  const row = await fetchMyCalendarConnectionStatusRow();
  return mapConnectionStatusRow(row);
}

export async function updateMyCalendarSettings(input: Pick<CalendarSettings, 'timezone' | 'slotDurationMinutes' | 'slotBufferMinutes' | 'allowPublicBooking'>): Promise<CalendarSettings> {
  const row = await updateMyCalendarSettingsRow({
    p_timezone: input.timezone || DEFAULT_TIMEZONE,
    p_slot_duration_minutes: input.slotDurationMinutes,
    p_slot_buffer_minutes: input.slotBufferMinutes,
    p_allow_public_booking: input.allowPublicBooking,
  });
  return mapSettingsRow(row);
}

export async function listMyAvailabilityRules(): Promise<AvailabilityRule[]> {
  const rows = await fetchMyAvailabilityRuleRows();
  return rows.map(mapRuleRow);
}

export async function saveMyAvailabilityRules(rules: AvailabilityRuleInput[]): Promise<AvailabilityRule[]> {
  const rows = await saveMyAvailabilityRuleRows(
    rules.map((rule) => ({
      day_of_week: rule.dayOfWeek,
      start_time: rule.startTime,
      end_time: rule.endTime,
      is_active: rule.isActive,
    }))
  );
  return rows.map(mapRuleRow);
}

export async function listMyAvailabilityBlocks(from: string, to: string): Promise<AvailabilityBlock[]> {
  const rows = await fetchMyAvailabilityBlockRows({ p_from: from, p_to: to });
  return rows.map(mapBlockRow);
}

export async function createMyAvailabilityBlock(input: AvailabilityBlockInput): Promise<AvailabilityBlock> {
  const row = await createMyAvailabilityBlockRow({
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_block_type: input.blockType || 'manual',
    p_note: input.note || null,
  });
  return mapBlockRow(row);
}

export async function deleteMyAvailabilityBlock(id: string): Promise<void> {
  await deleteMyAvailabilityBlockRow(id);
}

export async function listMyAppointments(from: string, to: string): Promise<AgendaAppointment[]> {
  const rows = await fetchMyAppointmentRows({ p_from: from, p_to: to });
  return rows.map(mapAppointmentRow);
}

export async function createAppointmentFromLead(input: LeadAppointmentInput): Promise<AppointmentMutationResult> {
  const row = await createMyAppointmentFromLeadRow({
    p_lead_id: input.leadId,
    p_starts_at: input.startsAt,
    p_note: input.note || null,
  });
  const appointment = mapAppointmentRow(row);

  try {
    const result = mapCreateEventRow(await createMyGoogleCalendarEventRow(appointment.id));
    return {
      appointment: {
        ...appointment,
        googleEventId: result.googleEventId || appointment.googleEventId,
        meetLink: result.meetLink || appointment.meetLink,
      },
      googleSyncStatus: result.status === 'already_synced' ? 'synced' : result.status,
    };
  } catch (err) {
    return {
      appointment,
      googleSyncStatus: 'error',
      googleSyncError: getErrorMessage(err, 'No se pudo crear el evento Google Calendar'),
    };
  }
}

async function syncAppointmentAfterMutation(
  appointment: AgendaAppointment,
  action: 'reschedule' | 'cancel'
): Promise<AppointmentMutationResult> {
  try {
    const result = await syncMyGoogleCalendarEventRow(appointment.id, action);
    return {
      appointment,
      googleSyncStatus: result.status,
    };
  } catch (err) {
    return {
      appointment,
      googleSyncStatus: 'error',
      googleSyncError: getErrorMessage(err, 'No se pudo sincronizar Google Calendar'),
    };
  }
}

export async function rescheduleMyAppointment(appointmentId: string, startsAt: string): Promise<AppointmentMutationResult> {
  const row = await rescheduleMyAppointmentRow(appointmentId, startsAt);
  return syncAppointmentAfterMutation(mapAppointmentRow(row), 'reschedule');
}

export async function cancelMyAppointment(appointmentId: string, reason?: string): Promise<AppointmentMutationResult> {
  const row = await cancelMyAppointmentRow(appointmentId, reason);
  return syncAppointmentAfterMutation(mapAppointmentRow(row), 'cancel');
}

export async function listMyAppointmentParticipants(from: string, to: string): Promise<AppointmentParticipant[]> {
  const rows = await fetchMyAppointmentParticipantRows({ p_from: from, p_to: to });
  return rows.map(mapParticipantRow);
}

export async function listMyAppointmentAuditEvents(from: string, to: string): Promise<AppointmentAuditEvent[]> {
  const rows = await fetchMyAppointmentAuditEventRows({ p_from: from, p_to: to });
  return rows.map(mapAppointmentAuditEventRow);
}

export async function addMyAppointmentParticipant(input: AppointmentParticipantInput): Promise<AppointmentParticipant> {
  const row = await addMyAppointmentParticipantRow({
    p_appointment_id: input.appointmentId,
    p_email: input.email,
    p_name: input.name || null,
    p_participant_role: input.participantRole || 'guest',
  });
  return mapParticipantRow(row);
}

export async function deleteMyAppointmentParticipant(id: string): Promise<void> {
  await deleteMyAppointmentParticipantRow(id);
}

export async function syncMyGoogleCalendar(days = 30): Promise<GoogleCalendarSyncResult> {
  const row = await syncMyGoogleCalendarRows(days);
  return mapSyncRow(row);
}

export async function syncMyGoogleCalendarAttendees(appointmentId: string): Promise<GoogleCalendarAttendeesSyncResult> {
  const row = await syncMyGoogleCalendarAttendeesRow(appointmentId);
  return mapAttendeesSyncRow(row);
}

export async function subscribeToMyAgendaChanges(onChange: () => void): Promise<RealtimeChannel | null> {
  return subscribeMyAgendaRows(onChange);
}

export async function unsubscribeFromMyAgendaChanges(channel: RealtimeChannel): Promise<void> {
  await unsubscribeAgendaRows(channel);
}
