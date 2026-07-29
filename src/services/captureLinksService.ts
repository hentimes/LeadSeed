import {
  createMyCaptureLinkRow,
  deactivateMyCaptureLinkRow,
  fetchMyCaptureLinkRows,
  fetchMyCaptureLinkStatsRows,
  updateMyCaptureLinkRow,
  type CaptureLinkRow,
  type CaptureLinkStatsRow,
} from '../repositories/captureLinksRepository';
import type { CaptureLink, CaptureLinkInput, CaptureLinkStats } from '../types';

const PUBLIC_LINK_BASE = 'https://planespro.cl/pb/';
const SHORT_REF_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

function generateLocalShortRefCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => SHORT_REF_ALPHABET[byte % SHORT_REF_ALPHABET.length]).join('');
}

function toNumber(value: number | null | undefined): number {
  return Number(value ?? 0);
}

function mapCaptureLinkRow(row: CaptureLinkRow): CaptureLink {
  return {
    id: row.id,
    refCode: row.ref_code,
    label: row.label || 'Link principal',
    campaignName: row.campaign_name || '',
    isDefault: Boolean(row.is_default),
    isActive: Boolean(row.is_active),
    statsConfig: row.stats_config || {},
    totalLeads: toNumber(row.total_leads),
    closedLeads: toNumber(row.closed_leads),
    closeRatePct: toNumber(row.close_rate_pct),
    captureLinksLimit: Math.max(1, Math.min(toNumber(row.capture_links_limit) || 1, 6)),
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

export function buildCaptureLinkUrl(refCode: string): string {
  return `${PUBLIC_LINK_BASE}${encodeURIComponent(refCode)}`;
}

export async function listMyCaptureLinks(): Promise<CaptureLink[]> {
  const rows = await fetchMyCaptureLinkRows();
  return rows.map(mapCaptureLinkRow);
}

export async function createMyCaptureLink(input: CaptureLinkInput): Promise<CaptureLink> {
  const row = await createMyCaptureLinkRow({
    p_label: input.label,
    p_campaign_name: input.campaignName || null,
    p_ref_code: generateLocalShortRefCode(),
    p_stats_config: input.statsConfig || {},
    p_metadata: {},
    p_is_default: input.isDefault || false,
  });
  return mapCaptureLinkRow(row);
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
