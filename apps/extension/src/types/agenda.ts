export interface CalendarSettings {
  userId: string;
  timezone: string;
  slotDurationMinutes: number;
  slotBufferMinutes: number;
  allowPublicBooking: boolean;
  googleCalendarId: string;
  updatedAt: string;
}

export interface CalendarConnectionStatus {
  provider: string;
  googleEmail: string;
  calendarId: string;
  connectedAt?: string;
  tokenScope: string;
  tokenExpiresAt?: string;
  lastSyncStartedAt?: string;
  lastSyncFinishedAt?: string;
  lastSyncStatus: 'idle' | 'running' | 'ok' | 'error';
  lastSyncError: string;
  isConnected: boolean;
}

export interface GoogleCalendarSyncResult {
  ok: boolean;
  source: string;
  calendarId: string;
  from: string;
  to: string;
  busyCount: number;
}

export interface AvailabilityRule {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  updatedAt: string;
}

export interface AvailabilityBlock {
  id: string;
  startsAt: string;
  endsAt: string;
  blockType: 'manual' | 'full_day' | 'google' | 'system';
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgendaAppointment {
  id: string;
  leadId?: string;
  leadName: string;
  startsAt: string;
  endsAt: string;
  status: string;
  sourceChannel: string;
  captureRef?: string;
  notes: string;
  meetLink?: string;
  googleEventId?: string;
  googleSyncStatus?: string;
  googleSyncError?: string;
  googleSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentAuditEvent {
  id: string;
  appointmentId: string;
  eventType: 'created_from_lead' | 'rescheduled' | 'cancelled' | 'google_sync_error' | 'participant_added' | 'participant_removed';
  previousStatus?: string;
  nextStatus?: string;
  previousStartTime?: string;
  nextStartTime?: string;
  previousEndTime?: string;
  nextEndTime?: string;
  note: string;
  createdAt: string;
}

export interface AppointmentParticipant {
  id: string;
  appointmentId: string;
  email: string;
  name: string;
  participantRole: 'guest' | 'lead' | 'internal';
  invitationStatus: 'pending' | 'synced' | 'error' | 'skipped';
  googleSyncError: string;
  googleSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentParticipantInput {
  appointmentId: string;
  email: string;
  name?: string;
  participantRole?: 'guest' | 'lead' | 'internal';
}

export interface LeadAppointmentInput {
  leadId: string;
  startsAt: string;
  note?: string;
}

export interface GoogleCalendarCreateEventResult {
  ok: boolean;
  status: 'synced' | 'skipped' | 'error' | 'already_synced';
  googleEventId?: string;
  meetLink?: string;
  reason?: string;
}

export interface GoogleCalendarAttendeesSyncResult {
  ok: boolean;
  status: 'synced' | 'skipped';
  reason?: string;
  attendeesCount: number;
}

export interface AppointmentMutationResult {
  appointment: AgendaAppointment;
  googleSyncStatus: 'synced' | 'skipped' | 'error';
  googleSyncError?: string;
}

export interface AvailabilityRuleInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface AvailabilityBlockInput {
  startsAt: string;
  endsAt: string;
  blockType?: 'manual' | 'full_day';
  note?: string;
}
