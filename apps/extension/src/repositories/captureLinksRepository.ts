import { supabase } from '../lib/supabaseClient';

export interface CaptureLinkRow {
  id: number;
  ref_code: string;
  label: string | null;
  campaign_name: string | null;
  link_type: string | null;
  is_default: boolean | null;
  is_active: boolean | null;
  stats_config: Record<string, unknown> | null;
  total_leads: number | null;
  closed_leads: number | null;
  close_rate_pct: number | null;
  visits: number | null;
  step1_completions: number | null;
  step2_completions: number | null;
  /** Opcional: no existe hasta que se aplica la migracion que lo anade. */
  last_visit_at?: string | null;
  capture_links_limit: number | null;
  created_at: string;
  updated_at: string;
}

export interface CaptureLinkStatsRow {
  capture_link_id: number;
  ref_code: string;
  link_name: string | null;
  campaign_name: string | null;
  total_leads: number | null;
  closed_leads: number | null;
  close_rate_pct: number | null;
  age_range: string | null;
  income_range: string | null;
  region: string | null;
  health_system: string | null;
  health_provider: string | null;
  leads_count: number | null;
}

export interface FormTypeRow {
  slug: string;
  display_name: string;
  url_template: string;
  links_admin_only: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateFormTypeArgs {
  p_slug: string;
  p_display_name: string;
  p_url_template: string;
  p_links_admin_only?: boolean;
}

interface UpdateFormTypeArgs {
  p_slug: string;
  p_display_name?: string | null;
  p_url_template?: string | null;
  p_links_admin_only?: boolean | null;
  p_is_active?: boolean | null;
}

interface CreateCaptureLinkArgs {
  p_label: string;
  p_campaign_name?: string | null;
  p_ref_code?: string | null;
  p_stats_config?: Record<string, unknown>;
  p_metadata?: Record<string, unknown>;
  p_is_default?: boolean;
  p_link_type?: string;
}

interface UpdateCaptureLinkArgs {
  p_link_id: number;
  p_label?: string | null;
  p_campaign_name?: string | null;
  p_is_active?: boolean | null;
  p_stats_config?: Record<string, unknown> | null;
  p_metadata?: Record<string, unknown> | null;
  p_is_default?: boolean | null;
}

export async function fetchMyCaptureLinkRows(linkType?: string): Promise<CaptureLinkRow[]> {
  const { data, error } = await supabase.rpc('list_my_capture_links', { p_link_type: linkType ?? null });
  if (error) throw error;
  return (data ?? []) as CaptureLinkRow[];
}

/**
 * Limite de links del usuario actual. null significa sin limite (admin).
 *
 * list_my_capture_links() repite el limite en cada fila, asi que con cero
 * links todavia no hay de donde leerlo -exactamente el caso de un admin
 * recien creado-. Este RPC devuelve algo siempre, tenga o no links.
 */
export async function fetchMyCaptureLinksLimit(): Promise<number | null> {
  const { data, error } = await supabase.rpc('get_my_capture_links_limit');
  if (error) throw error;
  return data as number | null;
}

export async function createMyCaptureLinkRow(args: CreateCaptureLinkArgs): Promise<CaptureLinkRow> {
  const { data, error } = await supabase.rpc('create_my_capture_link', args);
  if (error) throw error;
  return data as CaptureLinkRow;
}

export async function updateMyCaptureLinkRow(args: UpdateCaptureLinkArgs): Promise<CaptureLinkRow> {
  const { data, error } = await supabase.rpc('update_my_capture_link', args);
  if (error) throw error;
  return data as CaptureLinkRow;
}

export async function deactivateMyCaptureLinkRow(linkId: number): Promise<CaptureLinkRow> {
  const { data, error } = await supabase.rpc('deactivate_my_capture_link', {
    p_link_id: linkId,
  });
  if (error) throw error;
  return data as CaptureLinkRow;
}

/** Borra visitas/paso1/paso2 de un link propio (no toca leads ya capturados). Devuelve cuantos eventos borro. */
export async function resetMyCaptureLinkProgressRow(linkId: number): Promise<number> {
  const { data, error } = await supabase.rpc('reset_my_capture_link_progress', { p_link_id: linkId });
  if (error) throw error;
  return (data ?? 0) as number;
}

export async function fetchMyCaptureLinkStatsRows(linkId?: number): Promise<CaptureLinkStatsRow[]> {
  const { data, error } = await supabase.rpc('get_my_capture_link_stats', {
    p_link_id: linkId ?? null,
  });
  if (error) throw error;
  return (data ?? []) as CaptureLinkStatsRow[];
}

/** Tipos de formulario activos; el admin ve tambien los inactivos. */
export async function fetchFormTypeRows(): Promise<FormTypeRow[]> {
  const { data, error } = await supabase.rpc('list_form_types');
  if (error) throw error;
  return (data ?? []) as FormTypeRow[];
}

/** Registra un tipo de formulario nuevo. Admin-only (lo valida el RPC). */
export async function createFormTypeRow(args: CreateFormTypeArgs): Promise<FormTypeRow> {
  const { data, error } = await supabase.rpc('create_form_type', args);
  if (error) throw error;
  return data as FormTypeRow;
}

/** Actualiza un tipo de formulario existente. Admin-only (lo valida el RPC). */
export async function updateFormTypeRow(args: UpdateFormTypeArgs): Promise<FormTypeRow> {
  const { data, error } = await supabase.rpc('update_form_type', args);
  if (error) throw error;
  return data as FormTypeRow;
}
