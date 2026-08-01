import { supabase } from '../lib/supabaseClient';
import type { LeadAlertEvent } from '../types';

interface LeadAlertEventRow {
  id: string;
  target_user_id: string;
  lead_id: string;
  event_kind: string;
  lead_name: string | null;
  lead_phone: string | null;
  source_channel: string | null;
  capture_ref: string | null;
  created_at: string;
}

export function mapLeadAlertEvent(row: LeadAlertEventRow): LeadAlertEvent {
  return {
    id: row.id,
    targetUserId: row.target_user_id,
    leadId: row.lead_id,
    eventKind: 'lead_created',
    leadName: row.lead_name || 'Lead sin nombre',
    leadPhone: row.lead_phone || '',
    sourceChannel: row.source_channel || '',
    captureRef: row.capture_ref || '',
    createdAt: row.created_at,
  };
}

/**
 * Trae eventos posteriores a una marca de tiempo. Se usa para reconciliar
 * lo que Realtime no entrego mientras el service worker estuvo dormido.
 */
export async function fetchLeadAlertEventsSince(sinceIso: string, limit = 50): Promise<LeadAlertEvent[]> {
  const { data, error } = await supabase
    .from('user_lead_alert_events')
    .select('*')
    .gt('created_at', sinceIso)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data || []).map((row) => mapLeadAlertEvent(row as LeadAlertEventRow));
}

export async function fetchLatestLeadAlertEvent(): Promise<LeadAlertEvent | null> {
  const { data, error } = await supabase
    .from('user_lead_alert_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapLeadAlertEvent(data as LeadAlertEventRow) : null;
}

export function subscribeToLeadAlertEvents(
  targetUserId: string,
  onEvent: (event: LeadAlertEvent) => void,
): () => void {
  const channel = supabase
    .channel(`lead_alerts_${targetUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_lead_alert_events',
        filter: `target_user_id=eq.${targetUserId}`,
      },
      (payload) => {
        onEvent(mapLeadAlertEvent(payload.new as LeadAlertEventRow));
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
