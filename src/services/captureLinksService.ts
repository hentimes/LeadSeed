import {
  createFormTypeRow,
  createMyCaptureLinkRow,
  deactivateMyCaptureLinkRow,
  fetchFormTypeRows,
  fetchMyCaptureLinkRows,
  fetchMyCaptureLinksLimit,
  fetchMyCaptureLinkStatsRows,
  resetMyCaptureLinkProgressRow,
  updateFormTypeRow,
  updateMyCaptureLinkRow,
  type CaptureLinkRow,
  type CaptureLinkStatsRow,
  type FormTypeRow,
} from '../repositories/captureLinksRepository';
import type { CaptureLink, CaptureLinkInput, CaptureLinkStats, CaptureLinkType, FormType } from '../types';

const SHORT_REF_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

function generateLocalShortRefCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => SHORT_REF_ALPHABET[byte % SHORT_REF_ALPHABET.length]).join('');
}

function toNumber(value: number | null | undefined): number {
  return Number(value ?? 0);
}

function mapFormTypeRow(row: FormTypeRow): FormType {
  return {
    slug: row.slug,
    displayName: row.display_name,
    urlTemplate: row.url_template,
    linksAdminOnly: Boolean(row.links_admin_only),
    isActive: Boolean(row.is_active),
  };
}

function mapCaptureLinkRow(row: CaptureLinkRow): CaptureLink {
  return {
    id: row.id,
    refCode: row.ref_code,
    label: row.label || 'Link principal',
    campaignName: row.campaign_name || '',
    linkType: row.link_type || 'pb',
    isDefault: Boolean(row.is_default),
    isActive: Boolean(row.is_active),
    statsConfig: row.stats_config || {},
    totalLeads: toNumber(row.total_leads),
    closedLeads: toNumber(row.closed_leads),
    closeRatePct: toNumber(row.close_rate_pct),
    visits: toNumber(row.visits),
    step1Completions: toNumber(row.step1_completions),
    step2Completions: toNumber(row.step2_completions),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCaptureLinkStatsRow(row: CaptureLinkStatsRow): CaptureLinkStats {
  return {
    captureLinkId: row.capture_link_id,
    refCode: row.ref_code,
    linkName: row.link_name || 'Link principal',
    campaignName: row.campaign_name || '',
    totalLeads: toNumber(row.total_leads),
    closedLeads: toNumber(row.closed_leads),
    closeRatePct: toNumber(row.close_rate_pct),
    ageRange: row.age_range || 'Sin dato',
    incomeRange: row.income_range || 'Sin dato',
    region: row.region || 'Sin dato',
    healthSystem: row.health_system || 'Sin dato',
    healthProvider: row.health_provider || 'Sin dato',
    leadsCount: toNumber(row.leads_count),
  };
}

/**
 * URL publica de un link de captura, construida desde el url_template del
 * FormType (ej. 'https://planespro.cl/pb/{ref}'). El segmento de URL no
 * siempre coincide con el slug interno (retiro -> /retiro-tecnico-extranjero/)
 * ni el trailing slash es uniforme entre tipos, por eso el patron completo
 * vive en form_types en vez de derivarse del slug.
 */
export function buildLinkUrl(formType: FormType, refCode: string): string {
  return formType.urlTemplate.replace('{ref}', encodeURIComponent(refCode));
}

export async function listMyCaptureLinks(linkType?: CaptureLinkType): Promise<CaptureLink[]> {
  const rows = await fetchMyCaptureLinkRows(linkType);
  return rows.map(mapCaptureLinkRow);
}

/** Tipos de formulario activos (pb/retiro/etc); el admin ve tambien los inactivos. */
export async function listFormTypes(): Promise<FormType[]> {
  const rows = await fetchFormTypeRows();
  return rows.map(mapFormTypeRow);
}

/** Registra un tipo de formulario nuevo. El RPC exige rol admin. */
export async function createFormType(input: {
  slug: string;
  displayName: string;
  urlTemplate: string;
  linksAdminOnly?: boolean;
}): Promise<FormType> {
  const row = await createFormTypeRow({
    p_slug: input.slug,
    p_display_name: input.displayName,
    p_url_template: input.urlTemplate,
    p_links_admin_only: input.linksAdminOnly ?? true,
  });
  return mapFormTypeRow(row);
}

/** Actualiza un tipo de formulario existente. El RPC exige rol admin. */
export async function updateFormType(
  slug: string,
  input: Partial<{ displayName: string; urlTemplate: string; linksAdminOnly: boolean; isActive: boolean }>
): Promise<FormType> {
  const row = await updateFormTypeRow({
    p_slug: slug,
    p_display_name: input.displayName ?? null,
    p_url_template: input.urlTemplate ?? null,
    p_links_admin_only: input.linksAdminOnly ?? null,
    p_is_active: input.isActive ?? null,
  });
  return mapFormTypeRow(row);
}

/** null significa sin limite (admin). */
export async function getMyCaptureLinksLimit(): Promise<number | null> {
  return fetchMyCaptureLinksLimit();
}

export async function createMyCaptureLink(input: CaptureLinkInput): Promise<CaptureLink> {
  const row = await createMyCaptureLinkRow({
    p_label: input.label,
    p_campaign_name: input.campaignName || null,
    p_ref_code: generateLocalShortRefCode(),
    p_stats_config: input.statsConfig || {},
    p_metadata: {},
    p_is_default: input.isDefault || false,
    p_link_type: input.linkType || 'pb',
  });
  return mapCaptureLinkRow(row);
}

/** Resetea a cero Visitas/Paso1/Paso2 de un link propio. No borra leads ya capturados. */
export async function resetMyCaptureLinkProgress(id: number): Promise<number> {
  return resetMyCaptureLinkProgressRow(id);
}

export async function updateMyCaptureLink(id: number, input: CaptureLinkInput): Promise<CaptureLink> {
  const row = await updateMyCaptureLinkRow({
    p_link_id: id,
    p_label: input.label,
    p_campaign_name: input.campaignName ?? null,
    p_is_active: input.isActive ?? null,
    p_stats_config: input.statsConfig ?? null,
    p_metadata: null,
    p_is_default: input.isDefault ?? null,
  });
  return mapCaptureLinkRow(row);
}

export async function deactivateMyCaptureLink(id: number): Promise<CaptureLink> {
  const row = await deactivateMyCaptureLinkRow(id);
  return mapCaptureLinkRow(row);
}

export async function getMyCaptureLinkStats(linkId?: number): Promise<CaptureLinkStats[]> {
  const rows = await fetchMyCaptureLinkStatsRows(linkId);
  return rows.map(mapCaptureLinkStatsRow);
}
